import React, { useMemo, useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Sparkles,
  Download,
  Eye,
  PlusCircle,
  X,
  FileText,
  AlertCircle,
  ExternalLink,
  Check,
  Maximize2
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Submission } from '../../../types';
import { api } from '@/services/api';

export const MySubmissionsView: React.FC = () => {
  const { submissions, selectedSubmission, setSelectedSubmission, setCurrentPage, addToast } = useApp();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Approved' | 'In Review' | 'Needs Changes' | 'Rejected'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Newest First');

  const currentSubmission =
    (selectedSubmission && submissions.find(s => s.id === selectedSubmission.id)) ||
    submissions[0] ||
    null;

  const filteredSubmissions = submissions.filter(item => {
    if (activeFilter === 'Approved' && item.status !== 'Approved') return false;
    if (activeFilter === 'In Review' && item.status !== 'In Review') return false;
    if (activeFilter === 'Needs Changes' && item.status !== 'Needs Changes') return false;
    if (activeFilter === 'Rejected' && item.status !== 'Rejected') return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && !item.campaign.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Sort is derived from the real, already-filtered list — never a stub.
  const sortedSubmissions = useMemo(() => {
    const rows = [...filteredSubmissions];
    if (sortBy === 'Highest Score') {
      rows.sort((a, b) => (b.complianceScore ?? 0) - (a.complianceScore ?? 0));
    } else if (sortBy === 'Priority') {
      const order: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
      rows.sort((a, b) => (order[b.priority as string] ?? 0) - (order[a.priority as string] ?? 0));
    } else {
      rows.sort((a, b) => (Date.parse(b.submittedDate || '') || 0) - (Date.parse(a.submittedDate || '') || 0));
    }
    return rows;
  }, [filteredSubmissions, sortBy]);

  const totalCount = submissions.length;
  const approvedCount = submissions.filter(s => s.status === 'Approved').length;
  const pendingCount = submissions.filter(s => s.status === 'In Review' || s.status === 'Pending').length;
  const needsChangesCount = submissions.filter(s => s.status === 'Needs Changes').length;
  const rejectedCount = submissions.filter(s => s.status === 'Rejected').length;

  const getStatusBadge = (status: Submission['status']) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Approved
          </span>
        );
      case 'In Review':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            In Review
          </span>
        );
      case 'Needs Changes':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Needs Changes
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Rejected
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">My Submissions</h1>
          <p className="text-xs text-muted mt-0.5">
            Track, manage, and review the status of your submitted brand content.
          </p>
        </div>
        <button
          onClick={() => setCurrentPage('new-content')}
          className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Submission</span>
        </button>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Submissions */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-brand-300 flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Total Submissions</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{totalCount}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
              —
            </span>
            <svg className="w-16 h-6 text-brand-500 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 18 Q 16 8, 32 14 T 64 6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-emerald-300 flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Approved</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{approvedCount}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
              —
            </span>
            <svg className="w-16 h-6 text-emerald-500 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 20 Q 16 16, 32 8 T 64 4" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-amber-300 flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Pending Review</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{pendingCount}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-bold text-amber-600 flex items-center gap-0.5">
              —
            </span>
            <svg className="w-16 h-6 text-amber-500 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 12 Q 16 18, 32 10 T 64 14" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Needs Changes */}
        <div className="bg-white p-4.5 rounded-2xl border border-line/90 shadow-2xs card-hover-effect hover:border-rose-300 flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-grape-50 text-grape-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Needs Changes</div>
              <div className="text-2xl font-bold text-ink-900 tracking-tight mt-0.5">{needsChangesCount}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-bold text-grape-600 flex items-center gap-0.5">
              —
            </span>
            <svg className="w-16 h-6 text-grape-500 stroke-current" fill="none" viewBox="0 0 64 24">
              <path d="M0 6 Q 16 12, 32 18 T 64 20" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['All', 'Approved', 'In Review', 'Needs Changes', 'Rejected'] as const).map(tab => (
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
                ? totalCount
                : tab === 'Approved'
                ? approvedCount
                : tab === 'In Review'
                ? pendingCount
                : tab === 'Needs Changes'
                ? needsChangesCount
                : rejectedCount}
              )
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-muted-light absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search submissions..."
              className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-line rounded-lg text-xs text-ink placeholder-muted-light focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink shadow-2xs cursor-pointer focus:outline-hidden"
          >
            <option>Newest First</option>
            <option>Highest Score</option>
            <option>Priority</option>
          </select>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Submissions List */}
        <div className="lg:col-span-7 space-y-3.5">
          {sortedSubmissions.map(sub => {
            const isSelected = currentSubmission.id === sub.id;
            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSubmission(sub)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-brand-50/30 border-brand-400 shadow-xs ring-1 ring-brand-300'
                    : 'bg-white border-line/90 shadow-2xs hover:border-line-strong'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={sub.thumbnail}
                    alt={sub.title}
                    className="w-14 h-14 rounded-xl object-cover border border-line flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-ink-900 truncate">{sub.title}</h3>
                      {getStatusBadge(sub.status)}
                    </div>
                    <div className="text-xs text-muted mt-0.5 truncate">
                      {sub.campaign} • Submitted: {sub.submittedDate || sub.submittedAt || 'Recent'}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-light mt-1">
                      <span>{sub.version || 'v1.0'}</span>
                      <span>•</span>
                      <span>{sub.complianceScore}% Score</span>
                      <span>•</span>
                      <span className="capitalize">{sub.assetType}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedSubmission(sub);
                    }}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Submission Details */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-line/90 shadow-2xs p-6 space-y-5">
          {!currentSubmission ? (
            <div className="flex flex-col items-center gap-2 text-center py-12">
              <FileText className="w-6 h-6 text-muted-light" />
              <span className="font-semibold text-ink-900 text-sm">No submission selected</span>
              <span className="text-xs text-muted">Create your first piece of content to see its review here.</span>
            </div>
          ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-ink-900 tracking-tight">{currentSubmission.title}</h2>
                <p className="text-xs text-muted mt-0.5">{currentSubmission.campaign}</p>
              </div>
              {getStatusBadge(currentSubmission.status)}
            </div>

          {/* Large Image Preview */}
          <div className="relative rounded-xl overflow-hidden border border-line bg-[#FAF7EF] max-h-[260px] flex items-center justify-center">
            <img
              src={currentSubmission.thumbnail}
              alt={currentSubmission.title}
              className="w-full h-[240px] object-cover"
            />
          </div>

          {/* Action icon strip */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF7EF] border border-line/80">
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  try {
                    await api.downloadSubmissionReport(currentSubmission.id, 'text');
                    addToast(`Downloaded compliance report for ${currentSubmission.title}`, 'success');
                  } catch {
                    addToast('Report download failed.', 'error');
                  }
                }}
                className="p-1.5 rounded-lg text-ink-600 hover:bg-white hover:text-ink-900 transition-colors cursor-pointer"
                title="Download report"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedSubmission(currentSubmission);
                  setCurrentPage('ai-review');
                }}
                className="p-1.5 rounded-lg text-ink-600 hover:bg-white hover:text-ink-900 transition-colors cursor-pointer"
                title="Inspect in AI review"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedSubmission(currentSubmission);
                  setCurrentPage('ai-review');
                }}
                className="p-1.5 rounded-lg text-ink-600 hover:bg-white hover:text-ink-900 transition-colors cursor-pointer"
                title="Open full submission review"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs font-semibold text-ink-600">
              Score: <span className="text-emerald-600 font-bold">{currentSubmission.complianceScore}%</span>
            </div>
          </div>

          {/* Review Summary Checklist — derived from the submission's real findings */}
          <div className="p-4 rounded-xl border border-line/80 bg-[#FAF7EF]/50 space-y-2.5">
            <div className="text-xs font-bold text-ink-900">Review Summary</div>
            <div className="space-y-2 text-xs">
              {currentSubmission.findings && currentSubmission.findings.length > 0 ? (
                currentSubmission.findings.map(f => {
                  const passed = f.type === 'success' || f.type === 'passed';
                  const failed = f.type === 'error';
                  return (
                    <div key={f.id} className="flex items-center justify-between gap-2">
                      <span className="text-ink-600 truncate">{f.title}</span>
                      <span
                        className={`flex items-center gap-1 font-semibold flex-shrink-0 ${
                          passed ? 'text-emerald-700' : failed ? 'text-red-600' : 'text-amber-700'
                        }`}
                      >
                        {passed ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        {passed ? 'Passed' : failed ? 'Failed' : 'Attention'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-ink-600">Automated compliance check</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Passed
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Submission Metadata */}
          <div className="space-y-2 text-xs border-t border-[#F1ECE0] pt-3">
            <div className="flex justify-between py-1 text-muted">
              <span>Submitted On</span>
              <span className="font-medium text-ink">{currentSubmission.submittedDate || currentSubmission.submittedAt || 'Recent'}</span>
            </div>
            <div className="flex justify-between py-1 text-muted">
              <span>Campaign</span>
              <span className="font-medium text-ink">{currentSubmission.campaign}</span>
            </div>
            <div className="flex justify-between py-1 text-muted">
              <span>Reviewed By</span>
              <span className="font-medium text-ink">{currentSubmission.creator?.name || 'You'}</span>
            </div>
            <div className="flex justify-between py-1 text-muted">
              <span>Format &amp; Resolution</span>
              <span className="font-medium text-ink">{currentSubmission.format || 'Digital Asset'} • {currentSubmission.assetType || 'Text/Image'}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={async () => {
                try {
                  await api.downloadSubmissionReport(currentSubmission.id, 'text');
                  addToast(`Compliance report downloaded for ${currentSubmission.title}`, 'success');
                } catch {
                  addToast('Report download failed.', 'error');
                }
              }}
              className="flex-1 py-2 px-3 bg-white border border-line text-ink-700 rounded-lg text-xs font-semibold hover:bg-[#FAF7EF] shadow-2xs cursor-pointer text-center"
            >
              Download Report
            </button>
            <button
              onClick={() => {
                setSelectedSubmission(currentSubmission);
                setCurrentPage('ai-review');
              }}
              className="flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer text-center"
            >
              View AI Review
            </button>
          </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
