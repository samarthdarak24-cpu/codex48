import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Eye,
  Download,
  RotateCw,
  Info,
  Check,
  Send,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { RetrievedPassage } from '@/lib/types';

type FilterTab = 'All' | 'Passed' | 'Needs Attention' | 'Rejected';

interface EvidenceResult {
  query: string;
  results: RetrievedPassage[];
  method: string;
}

export const AIReviewView: React.FC = () => {
  const {
    submissions,
    selectedSubmission,
    setSelectedSubmission,
    addToast,
    runSemanticReview,
    setCurrentPage,
    refresh,
  } = useApp();
  const currentSubmission = selectedSubmission || submissions[0];

  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [activeTab, setActiveTab] = useState<'findings' | 'evidence' | 'comments'>('findings');
  const [isScanning, setIsScanning] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [lastScan, setLastScan] = useState<{ count: number; llmConfigured: boolean } | null>(null);
  /** null = capability check still running / unknown. */
  const [llmConfigured, setLlmConfigured] = useState<boolean | null>(null);
  const [evidence, setEvidence] = useState<EvidenceResult | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  /**
   * The assistant is only offered when the server actually has a language
   * model. Without one we disable it instead of returning canned advice.
   */
  useEffect(() => {
    let cancelled = false;
    api
      .evidenceCapabilities()
      .then((caps) => {
        if (!cancelled) setLlmConfigured(Boolean(caps.llmConfigured));
      })
      .catch(() => {
        if (!cancelled) setLlmConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalScanned = submissions.length;
  const passedCount = submissions.filter(
    (s) => s.status === 'Approved' || (s.findingsCount ?? 0) === 0,
  ).length;
  const attentionCount = submissions.filter(
    (s) => s.status === 'Needs Changes' || (s.findingsCount ?? 0) > 0,
  ).length;
  const rejectedCount = submissions.filter((s) => s.status === 'Rejected').length;

  const shareOfAll = (n: number) =>
    totalScanned === 0 ? '—' : `${Math.round((n / totalScanned) * 100)}% of all`;

  const allFindings = currentSubmission?.findings ?? [];
  const findings = allFindings.filter((f) => {
    if (activeFilter === 'Passed') return f.type === 'success' || f.type === 'passed';
    if (activeFilter === 'Needs Attention') return f.type === 'warning';
    if (activeFilter === 'Rejected') return f.type === 'error';
    return true;
  });
  const highCount = allFindings.filter((f) => f.badge === 'High').length;
  const score = currentSubmission?.complianceScore ?? 100;
  const verdict =
    currentSubmission?.status === 'Rejected'
      ? 'Rejected'
      : (currentSubmission?.findingsCount ?? 0) === 0
        ? 'Passed'
        : 'Needs Attention';
  const verdictPassed = verdict === 'Passed';

  const handleRescan = async () => {
    if (!currentSubmission) return;
    setIsScanning(true);
    try {
      // Context call: POSTs the review, refreshes and reports the real count
      // (including "0 AI suggestions" when no language model is configured).
      const res = await runSemanticReview(currentSubmission.id);
      setLastScan(res);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!currentSubmission) return;
    try {
      await api.downloadSubmissionReport(currentSubmission.id, 'text');
      addToast(`Downloaded compliance report for ${currentSubmission.title}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Report download failed.', 'error');
    }
  };

  const handleAskAi = async (promptText?: string) => {
    const q = (promptText || aiQuestion).trim();
    if (!q) return;
    if (!llmConfigured) {
      addToast(
        'AI assistant unavailable: no language model is configured on this server.',
        'warning',
      );
      return;
    }
    setIsAsking(true);
    try {
      const res = await api.searchEvidence(q, 3);
      const results = res.results ?? [];
      if (results.length > 0) {
        setAiResponse(
          `Retrieved ${results.length} guideline passage(s) for "${q}" (${res.method}):\n\n` +
            results
              .map((p) => `• [${p.ruleCode || 'rule'} · ${p.heading || 'passage'}]: "${p.text}"`)
              .join('\n\n'),
        );
      } else {
        setAiResponse(
          `No guideline passages matched "${q}". The workspace library returned 0 results, so there is nothing to quote.`,
        );
      }
    } catch (err) {
      setAiResponse(
        `Evidence search failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    } finally {
      setIsAsking(false);
      setAiQuestion('');
    }
  };

  /** Retrieve the real guideline passages behind a finding. */
  const handleViewEvidence = async (finding: { title: string; description: string }) => {
    setActiveTab('evidence');
    setEvidenceLoading(true);
    try {
      const res = await api.searchEvidence(`${finding.title} ${finding.description}`, 5);
      setEvidence({ query: res.query, results: res.results ?? [], method: res.method });
    } catch (err) {
      setEvidence(null);
      addToast(err instanceof Error ? err.message : 'Evidence retrieval failed.', 'error');
    } finally {
      setEvidenceLoading(false);
    }
  };

  /**
   * Keep the selected record pointing at the refreshed copy so the comment
   * list updates from the server instead of a local optimistic insert.
   */
  useEffect(() => {
    if (!selectedSubmission) return;
    const fresh = submissions.find((s) => s.id === selectedSubmission.id);
    if (fresh && fresh !== selectedSubmission) setSelectedSubmission(fresh);
  }, [submissions, selectedSubmission, setSelectedSubmission]);

  const handleAddComment = async () => {
    if (!currentSubmission || !newComment.trim()) return;
    try {
      await api.addComment(currentSubmission.id, newComment.trim());
      await refresh();
      setNewComment('');
      addToast('Comment posted.', 'success');
    } catch {
      addToast('Failed to post comment.', 'error');
    }
  };

  const findingIcon = (type: string) => {
    if (type === 'error') return <AlertCircle className="w-4 h-4" />;
    if (type === 'warning') return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle2 className="w-4 h-4" />;
  };

  const findingTone = (type: string) =>
    type === 'error'
      ? { row: 'border-red-200/70 bg-red-50/30', chip: 'bg-red-100 text-red-600' }
      : type === 'warning'
        ? { row: 'border-amber-200/70 bg-amber-50/30', chip: 'bg-amber-100 text-amber-600' }
        : { row: 'border-emerald-200/70 bg-emerald-50/30', chip: 'bg-emerald-100 text-emerald-600' };

  if (!currentSubmission) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">AI Review</h1>
          <p className="text-xs text-muted mt-0.5">
            Detailed analysis and automated compliance check for your content.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-line/90 shadow-2xs p-10 text-center space-y-3">
          <FileText className="w-6 h-6 text-muted-light mx-auto" />
          <div className="text-sm font-bold text-ink-900">Nothing to review yet</div>
          <p className="text-xs text-muted">
            This workspace has no submissions. Create content first — the review runs against real submissions.
          </p>
          <button
            onClick={() => setCurrentPage('new-content')}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Create Content
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">AI Review</h1>
          <p className="text-xs text-muted mt-0.5">
            Detailed analysis and automated compliance check for your content.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRescan}
            disabled={isScanning}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-line text-ink-700 rounded-lg text-xs font-semibold hover:bg-[#FAF7EF] shadow-2xs cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-brand-600' : 'text-muted'}`} />
            <span>{isScanning ? 'Scanning...' : 'Rescan Content'}</span>
          </button>
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scanned Content */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-brand-300 flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Scanned Content</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{totalScanned}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-bold text-muted flex items-center gap-0.5">
              {totalScanned} tracked
            </span>
            <svg className="w-16 h-6 text-brand-500 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 18 Q 16 8, 32 14 T 64 6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Passed Review */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-emerald-300 flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Passed Review</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{passedCount}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
              {shareOfAll(passedCount)}
            </span>
            <svg className="w-16 h-6 text-emerald-500 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 20 Q 16 16, 32 8 T 64 4" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-amber-300 flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Needs Attention</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{attentionCount}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-bold text-amber-600 flex items-center gap-0.5">
              {shareOfAll(attentionCount)}
            </span>
            <svg className="w-16 h-6 text-amber-500 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 12 Q 16 18, 32 10 T 64 14" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-rose-300 flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-grape-50 text-grape-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Rejected</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{rejectedCount}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-bold text-grape-600 flex items-center gap-0.5">
              {shareOfAll(rejectedCount)}
            </span>
            <svg className="w-16 h-6 text-grape-500 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 6 Q 16 12, 32 18 T 64 20" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Content Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(['All', 'Passed', 'Needs Attention', 'Rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                activeFilter === tab
                  ? 'bg-ink-900 text-white shadow-2xs'
                  : 'bg-white text-ink-600 hover:bg-[#FAF7EF] border border-line/80'
              }`}
            >
              {tab} (
              {tab === 'All'
                ? totalScanned
                : tab === 'Passed'
                  ? passedCount
                  : tab === 'Needs Attention'
                    ? attentionCount
                    : rejectedCount}
              )
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-light font-medium">Viewing content:</span>
          <select
            value={currentSubmission.id}
            onChange={(e) => {
              const found = submissions.find((s) => s.id === e.target.value);
              if (found) setSelectedSubmission(found);
            }}
            className="px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink shadow-2xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
          >
            {submissions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.campaign})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Content Preview & Key Insights */}
        <div className="lg:col-span-8 space-y-6">
          {/* Content Card with Image Preview */}
          <div className="bg-white rounded-2xl border border-line/90 shadow-2xs p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink-900 tracking-tight">{currentSubmission.title}</h2>
                <p className="text-xs text-muted mt-0.5">
                  {currentSubmission.campaign} • Submitted: {currentSubmission.submittedDate || '—'} •{' '}
                  {currentSubmission.relativeTime || '—'}
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  verdictPassed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                    : verdict === 'Rejected'
                      ? 'bg-red-50 text-red-700 border-red-200/60'
                      : 'bg-amber-50 text-amber-700 border-amber-200/60'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    verdictPassed ? 'bg-emerald-500' : verdict === 'Rejected' ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                />
                {verdict}
              </span>
            </div>

            {/* Preview Image with rounded corners and clean aspect */}
            <div className="relative rounded-xl overflow-hidden border border-line/80 bg-[#FAF7EF] flex items-center justify-center max-h-[380px]">
              <img
                src={currentSubmission.thumbnail}
                alt={currentSubmission.title}
                className="w-full h-[360px] object-cover"
              />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] font-semibold text-ink-700 shadow-xs flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-muted" />
                <span>{currentSubmission.format || currentSubmission.assetType || 'Preview'}</span>
              </div>
            </div>

            {/* Overall Compliance Score Strip */}
            <div className="p-4 bg-gradient-to-r from-[#FAF7EF] via-emerald-50/20 to-[#FAF7EF] rounded-2xl border border-line/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Donut progress with glow — driven by the derived compliance score */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center relative shadow-md shadow-emerald-500/20 flex-shrink-0 animate-pulse-subtle"
                  style={{
                    background: `conic-gradient(#10b981 0% ${score}%, #e2e8f0 ${score}% 100%)`,
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xs font-extrabold text-ink-900 shadow-xs">
                    {score}%
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink-900">Overall Compliance</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 shadow-2xs ${
                        verdictPassed
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200/60'
                          : 'bg-amber-100 text-amber-800 border-amber-200/60'
                      }`}
                    >
                      <Check
                        className={`w-3 h-3 ${verdictPassed ? 'text-emerald-600' : 'text-amber-600'}`}
                      />
                      {verdict}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {lastScan
                      ? `Last scan returned ${lastScan.count} finding(s)`
                      : 'Showing stored findings — no scan run in this session'}
                    {' • '}
                    {allFindings.length} deterministic finding(s), {highCount} high severity
                    {lastScan && !lastScan.llmConfigured
                      ? ' • AI suggestions: 0 (no language model configured)'
                      : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRescan}
                  disabled={isScanning}
                  className="px-3 py-1.5 bg-white border border-line text-ink-700 rounded-lg text-xs font-semibold hover:bg-[#F1ECE0] shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RotateCw className="w-3.5 h-3.5 text-muted" />
                  <span>Rescan</span>
                </button>
                <button
                  onClick={handleDownloadReport}
                  className="px-3 py-1.5 bg-white border border-line text-ink-700 rounded-lg text-xs font-semibold hover:bg-[#F1ECE0] shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-muted" />
                  <span>Report</span>
                </button>
              </div>
            </div>
          </div>

          {/* Key Insights (2x2 Grid) — built from the submission's real findings */}
          <div className="bg-white rounded-2xl border border-line/90 shadow-2xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-ink-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>Key Insights</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allFindings.length === 0 ? (
                <div className="col-span-full p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted">Deterministic rule engine</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      No findings
                    </span>
                  </div>
                  <div className="text-sm font-bold text-ink-900">Nothing raised for this content</div>
                  <p className="text-xs text-ink-600 leading-relaxed">
                    The stored review produced 0 findings. Run “Rescan Content” to re-check this version against
                    the active rules.
                  </p>
                </div>
              ) : (
                allFindings.slice(0, 4).map((f) => (
                  <div key={f.id} className={`p-4 rounded-xl border space-y-2 ${findingTone(f.type).row}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted">Finding</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                          f.type === 'error'
                            ? 'bg-red-100 text-red-800'
                            : f.type === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {findingIcon(f.type)}
                        {f.badge ?? (f.type === 'error' ? 'High' : 'Review')}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-ink-900">{f.title}</div>
                    <p className="text-xs text-ink-600 leading-relaxed">{f.description}</p>
                    {f.guidelineRef && <p className="text-[11px] text-muted-light">{f.guidelineRef}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Findings & AI Assistant */}
        <div className="lg:col-span-4 space-y-6">
          {/* Detailed Findings Card */}
          <div className="bg-white rounded-2xl border border-line/90 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-[#F1ECE0]">
              <h3 className="text-sm font-bold text-ink-900 tracking-tight">Detailed Findings</h3>
              {/* Tabs */}
              <div className="flex items-center gap-4 mt-3 border-b border-[#F1ECE0] -mb-5 pb-3">
                <button
                  onClick={() => setActiveTab('findings')}
                  className={`text-xs font-semibold transition-colors pb-1 cursor-pointer ${
                    activeTab === 'findings'
                      ? 'text-brand-600 border-b-2 border-brand-600'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  Findings ({findings.length})
                </button>
                <button
                  onClick={() => setActiveTab('evidence')}
                  className={`text-xs font-semibold transition-colors pb-1 cursor-pointer ${
                    activeTab === 'evidence'
                      ? 'text-brand-600 border-b-2 border-brand-600'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  Evidence
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`text-xs font-semibold transition-colors pb-1 cursor-pointer ${
                    activeTab === 'comments'
                      ? 'text-brand-600 border-b-2 border-brand-600'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  Comments
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3.5">
              {activeTab === 'findings' && (
                <>
                  {findings.length === 0 ? (
                    <div className="p-3 rounded-xl border border-line bg-[#FAF7EF] text-[11px] text-muted">
                      {allFindings.length === 0
                        ? 'No findings were raised for this submission.'
                        : `No findings match “${activeFilter}”. ${allFindings.length} finding(s) exist in total.`}
                    </div>
                  ) : (
                    findings.map((f) => {
                      const tone = findingTone(f.type);
                      return (
                        <div
                          key={f.id}
                          className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${tone.row}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${tone.chip}`}
                            >
                              {findingIcon(f.type)}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-ink-900">{f.title}</div>
                              <div className="text-[11px] text-muted mt-0.5 leading-relaxed">
                                {f.description}
                              </div>
                              {f.guidelineRef && (
                                <div className="text-[11px] text-muted-light mt-0.5">{f.guidelineRef}</div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleViewEvidence(f)}
                            className="px-2.5 py-1 bg-white border border-line rounded-md text-[11px] font-semibold text-ink-700 hover:bg-[#FAF7EF] cursor-pointer shadow-2xs"
                            title="Retrieve the guideline passages behind this finding"
                          >
                            View
                          </button>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {activeTab === 'evidence' && (
                <div className="space-y-3 text-xs">
                  {evidenceLoading && (
                    <div className="p-3 rounded-xl bg-[#FAF7EF] border border-line/70 text-muted">
                      Retrieving guideline passages…
                    </div>
                  )}
                  {!evidenceLoading && evidence && evidence.results.length > 0 && (
                    <>
                      <div className="text-[11px] text-muted-light">
                        {evidence.results.length} passage(s) for “{evidence.query}” · {evidence.method}
                      </div>
                      {evidence.results.map((p) => (
                        <div
                          key={p.passageId}
                          className="p-3 rounded-xl bg-[#FAF7EF] border border-line/70 space-y-1.5"
                        >
                          <div className="font-semibold text-ink-700">
                            {p.ruleCode || 'Rule'}
                            {p.heading ? ` · ${p.heading}` : ''}
                          </div>
                          <div className="text-muted leading-relaxed">{p.text}</div>
                          <div className="text-[11px] text-muted-light">
                            relevance {typeof p.score === 'number' ? p.score.toFixed(2) : '—'}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {!evidenceLoading && evidence && evidence.results.length === 0 && (
                    <div className="p-3 rounded-xl bg-[#FAF7EF] border border-line/70 text-muted">
                      No passages matched “{evidence.query}”.
                    </div>
                  )}
                  {!evidenceLoading && !evidence && (
                    <div className="p-3 rounded-xl bg-[#FAF7EF] border border-line/70 text-muted">
                      Select “View” on a finding to retrieve the guideline passages it was raised from.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="space-y-3">
                  {(currentSubmission.comments ?? []).length === 0 ? (
                    <div className="p-3 rounded-xl bg-[#FAF7EF] border border-line/70 text-xs text-muted">
                      No comments on this submission yet.
                    </div>
                  ) : (
                    (currentSubmission.comments ?? []).map((c) => (
                      <div key={c.id} className="p-3 rounded-xl bg-[#FAF7EF] border border-line/70 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-ink">{c.author}</span>
                          <span className="text-muted-light">{c.time}</span>
                        </div>
                        <p className="text-xs text-ink-600 leading-relaxed">{c.text}</p>
                      </div>
                    ))
                  )}

                  <div className="relative">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      placeholder="Add a comment..."
                      className="w-full pl-3 pr-10 py-2 bg-[#FAF7EF] border border-line rounded-xl text-xs text-ink placeholder-muted-light focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      title={newComment.trim() ? 'Post comment' : 'Write a comment before sending'}
                      className="absolute right-1.5 top-1.5 p-1 rounded-lg bg-brand-600 text-white hover:bg-brand-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Brand Assistant Card */}
          <div className="bg-white rounded-2xl border border-line/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink-900">Need help? Ask our AI Assistant</h4>
                <p className="text-[11px] text-muted">Get instant guidance according to Brand Guidelines.</p>
              </div>
            </div>

            {llmConfigured === false && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  No language model is configured on this server, so the assistant cannot answer questions.
                  The deterministic findings above are unaffected.
                </span>
              </div>
            )}

            {/* Quick Prompt Pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleAskAi('How to fix color contrast in the footer?')}
                disabled={!llmConfigured}
                title={
                  llmConfigured
                    ? 'Ask the assistant'
                    : 'Unavailable: no language model is configured on this server'
                }
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F1ECE0] hover:bg-line text-ink-700 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                How to fix color contrast?
              </button>
              <button
                onClick={() => handleAskAi('Explain approved summer logo positions')}
                disabled={!llmConfigured}
                title={
                  llmConfigured
                    ? 'Ask the assistant'
                    : 'Unavailable: no language model is configured on this server'
                }
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F1ECE0] hover:bg-line text-ink-700 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Explain logo guidelines
              </button>
            </div>

            {/* AI Response Box */}
            {aiResponse && (
              <div className="p-3 rounded-xl bg-brand-50/60 border border-brand-200 text-xs text-ink-700 leading-relaxed space-y-1">
                <div className="font-bold text-brand-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                  <span>AI Recommendation</span>
                </div>
                <p className="whitespace-pre-line">{aiResponse}</p>
              </div>
            )}

            {/* Input field */}
            <div className="relative">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                disabled={!llmConfigured}
                placeholder={
                  llmConfigured === false
                    ? 'Assistant unavailable — no language model configured'
                    : 'Ask about brand rules or fixes...'
                }
                title={
                  llmConfigured
                    ? 'Ask about brand rules or fixes'
                    : 'Unavailable: no language model is configured on this server'
                }
                className="w-full pl-3 pr-10 py-2 bg-[#FAF7EF] border border-line rounded-xl text-xs text-ink placeholder-muted-light focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                onClick={() => handleAskAi()}
                disabled={!llmConfigured || !aiQuestion.trim()}
                title={llmConfigured ? 'Send' : 'Unavailable: no language model is configured on this server'}
                className="absolute right-1.5 top-1.5 p-1 rounded-lg bg-brand-600 text-white hover:bg-brand-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            {isAsking && <div className="text-[11px] text-muted-light">Searching the guideline library…</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
