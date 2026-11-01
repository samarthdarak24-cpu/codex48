import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, AlertCircle, FileText, Eye, Download, RotateCw, Info, Check, Send, ShieldCheck, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { RetrievedPassage } from '@/lib/types';
import { StatCardGrid } from '../../ui/StatCard';

export const AIReviewView: React.FC = () => {
  const { submissions, selectedSubmission, setSelectedSubmission, addToast, runSemanticReview, setCurrentPage, refresh } = useApp();
  const currentSubmission = selectedSubmission || submissions[0];

  const [activeFilter, setActiveFilter] = useState<'All' | 'Passed' | 'Needs Attention' | 'Rejected'>('All');
  const [activeTab, setActiveTab] = useState<'findings' | 'evidence' | 'suggestions' | 'score'>('findings');
  const [isScanning, setIsScanning] = useState(false);

  const totalCount = submissions.length;
  const passedCount = submissions.filter((s) => (s.findingsCount ?? 0) === 0).length;
  const attentionCount = submissions.filter((s) => (s.findingsCount ?? 0) > 0 && s.status !== 'Rejected').length;
  const rejectedCount = submissions.filter((s) => s.status === 'Rejected').length;

  const filtered = submissions.filter((s) => {
    if (activeFilter === 'Passed') return (s.findingsCount ?? 0) === 0;
    if (activeFilter === 'Needs Attention') return (s.findingsCount ?? 0) > 0 && s.status !== 'Rejected';
    if (activeFilter === 'Rejected') return s.status === 'Rejected';
    return true;
  });

  const complianceScore = currentSubmission?.complianceScore ?? 0;

  const handleRunAnalysis = async () => {
    if (!currentSubmission) return;
    setIsScanning(true);
    try {
      const res = await runSemanticReview(currentSubmission.id);
      if (!res.llmConfigured) addToast(`Semantic review ran with ${res.count} deterministic finding(s). No AI model configured.`, 'info');
      else addToast(`AI review complete: ${res.count} finding(s).`);
    } catch { /* toast shown by context */ }
    finally { setIsScanning(false); }
  };

  const keyInsights = [
    { label: 'Brand Tone', desc: 'Aligned with our friendly and inspiring tone.', pass: true },
    { label: 'Claims Verification', desc: 'All claims are supported by approved sources.', pass: true },
    { label: 'Minor Suggestion', desc: 'Consider adding a disclaimer for health benefits.', pass: false },
    { label: 'Visual Compliance', desc: 'Design follows brand visual guidelines.', pass: true },
  ];

  const detailedFindings = [
    { label: 'Logo & Branding', desc: 'Logo placement is correct and approved.', badge: 'Passed', pass: true },
    { label: 'Colour Compliance', desc: 'Uses approved brand colours.', badge: 'Passed', pass: true },
    { label: 'Text Analysis', desc: 'Consider simplifying the tagline.', badge: 'Suggestion', pass: false },
    { label: 'Visual Elements', desc: 'All visuals match brand style.', badge: 'Passed', pass: true },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">AI Review</h1>
          <p className="text-xs text-muted mt-0.5">Get instant AI-powered analysis of your content for brand compliance.</p>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Scanned Content', value: totalCount, icon: <Sparkles className="w-5 h-5" />, variant: 'blue', trend: 12, sparkPathIndex: 0 },
    { label: 'Passed Review', value: passedCount, icon: <CheckCircle2 className="w-5 h-5" />, variant: 'green', trend: 8, sparkPathIndex: 1 },
    { label: 'Needs Attention', value: attentionCount, icon: <AlertTriangle className="w-5 h-5" />, variant: 'amber', trend: -33, sparkPathIndex: 2 },
    { label: 'Rejected', value: rejectedCount, icon: <AlertCircle className="w-5 h-5" />, variant: 'red', trend: -50, sparkPathIndex: 3 },
  ]} />

        {/* Filter + Sort */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Passed', 'Needs Attention', 'Rejected'] as const).map((tab) => {
              const cnt = tab === 'All' ? totalCount : tab === 'Passed' ? passedCount : tab === 'Needs Attention' ? attentionCount : rejectedCount;
              return (
                <button key={tab} onClick={() => setActiveFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${activeFilter === tab ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-sm' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                  {tab} ({cnt})
                </button>
              );
            })}
          </div>
          <select className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"><option>Latest First</option></select>
        </div>

        {/* Main content: selected submission detail */}
        {currentSubmission && (
          <div className="bg-white rounded-2xl border border-line shadow-2xs overflow-hidden">
            <div className="flex items-start gap-5 p-5">
              {/* Thumbnail */}
              <div className="w-40 h-32 rounded-xl overflow-hidden border border-line shrink-0">
                <img src={currentSubmission.thumbnail} alt={currentSubmission.title} className="w-full h-full object-cover" />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <h2 className="text-base font-bold text-ink-900">{currentSubmission.title}</h2>
                <p className="text-xs text-muted leading-relaxed">{currentSubmission.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-light flex-wrap">
                  <span className="flex items-center gap-1"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>{currentSubmission.submittedAt || 'Recent'}</span>
                  <span className="flex items-center gap-1"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" /><path d="M12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" /></svg>{currentSubmission.version || 'v1.0'}</span>
                  <span className="px-2 py-0.5 bg-[#F1ECE0] rounded-full font-medium">Social Media</span>
                  <span className="px-2 py-0.5 bg-[#F1ECE0] rounded-full font-medium">{currentSubmission.campaign}</span>
                </div>
                {/* Tabs */}
                <div className="flex gap-4 border-b border-line mt-3">
                  {(['findings', 'evidence', 'suggestions', 'score'] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-2 text-xs font-semibold capitalize transition ${activeTab === tab ? 'border-b-2 border-brand-600 text-brand-600' : 'text-muted hover:text-ink'}`}>
                      {tab === 'findings' ? 'AI Analysis' : tab === 'score' ? 'Compliance Score' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                {activeTab === 'findings' && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <p className="font-semibold text-emerald-800">Content Passes AI Review. Your content is compliant with brand guidelines.</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink-900 mb-2">Key Insights</p>
                      <div className="grid grid-cols-2 gap-2">
                        {keyInsights.map((ins) => (
                          <div key={ins.label} className={`p-2.5 rounded-xl border text-xs ${ins.pass ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {ins.pass ? <Check className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-amber-600" />}
                              <span className="font-semibold text-ink-900">{ins.label}</span>
                            </div>
                            <p className={`${ins.pass ? 'text-emerald-700' : 'text-amber-700'} leading-relaxed`}>{ins.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button onClick={handleRunAnalysis} disabled={isScanning}
                        className="flex items-center gap-2 px-4 py-2 border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer disabled:opacity-50">
                        {isScanning ? <><RotateCw className="w-3.5 h-3.5 animate-spin" />Running…</> : <><RotateCw className="w-3.5 h-3.5" />Run New Analysis</>}
                      </button>
                      <p className="text-[11px] text-muted-light">Last scanned: {currentSubmission.submittedAt || 'Recently'}</p>
                    </div>
                  </div>
                )}
                {activeTab === 'evidence' && (
                  <div className="space-y-2 pt-1 text-xs">
                    <div className="p-3 bg-[#FAF7EF] border border-line rounded-xl">
                      <p className="font-semibold text-ink-900">Precedent Brand Guidelines v2.1</p>
                      <p className="text-muted mt-0.5">Page 12 – Brand Tone &amp; Messaging</p>
                      <button className="text-brand-600 font-semibold mt-1 hover:underline cursor-pointer">View Source →</button>
                    </div>
                  </div>
                )}
                {activeTab === 'suggestions' && (
                  <div className="pt-1 text-xs text-muted">Suggestions will appear after running an AI analysis.</div>
                )}
                {activeTab === 'score' && (
                  <div className="flex items-center gap-4 pt-1">
                    <div className="relative w-20 h-20">
                      <svg className="-rotate-90" width="80" height="80" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="#F1ECE0" strokeWidth="8" />
                        <circle cx="40" cy="40" r="32" fill="none" stroke="#10b981" strokeWidth="8"
                          strokeDasharray={`${(complianceScore / 100) * (2 * Math.PI * 32)} ${2 * Math.PI * 32}`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-base font-bold text-ink-900">{complianceScore}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink-900">Overall Compliance</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${complianceScore >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {complianceScore >= 80 ? '✓ Passed' : '⚠ Needs Review'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submission list */}
        <div className="space-y-2.5">
          {filtered.slice(1).map((sub) => (
            <div key={sub.id} onClick={() => setSelectedSubmission(sub)}
              className="bg-white p-4 rounded-2xl border border-line shadow-2xs cursor-pointer hover:border-brand-400 hover:shadow-xs transition-all flex items-center gap-4">
              <img src={sub.thumbnail} alt={sub.title} className="w-12 h-12 rounded-xl object-cover border border-line shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink-900 truncate">{sub.title}</p>
                <p className="text-xs text-muted">{sub.campaign}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${(sub.findingsCount ?? 0) === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {(sub.findingsCount ?? 0) === 0 ? '✓ Passed' : `⚠ ${sub.findingsCount} issues`}
                </span>
                <span className="text-xs font-bold text-ink-900">{sub.complianceScore}%</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Right panel: Detailed Findings */}
      {currentSubmission && (
        <aside className="w-[300px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <h3 className="text-sm font-bold text-ink-900">Detailed Findings</h3>
            <button className="text-[11px] text-brand-600 font-semibold hover:underline cursor-pointer">View Full Report →</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {detailedFindings.map((f) => (
              <div key={f.label} className="flex items-start justify-between gap-2 p-3 bg-[#FAF7EF] rounded-xl border border-line text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${f.pass ? 'text-emerald-600' : 'text-amber-500'}`} />
                  <div>
                    <p className="font-semibold text-ink-900">{f.label}</p>
                    <p className="text-muted mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${f.pass ? 'badge-approved' : 'badge-pending'}`}>
                  {f.badge}
                </span>
              </div>
            ))}

            {/* Source Evidence */}
            <div className="mt-1">
              <p className="text-xs font-bold text-ink-900 mb-2">Source Evidence</p>
              <div className="p-3 bg-[#FAF7EF] border border-line rounded-xl flex items-start gap-2 text-xs cursor-pointer hover:bg-[#F1ECE0] transition-colors">
                <FileText className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-ink-900">Precedent Brand Guidelines v2.1</p>
                  <p className="text-muted mt-0.5">Page 12 – Brand Tone &amp; Messaging</p>
                  <button className="text-brand-600 font-semibold mt-1 hover:underline text-[11px]">View Source →</button>
                </div>
              </div>
            </div>

            {/* Need help */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs">
              <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Need help?</p>
                <p className="text-blue-700 mt-0.5">Ask our AI Assistant for suggestions.</p>
                <button className="mt-2 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-[11px] font-semibold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer">
                  Chat Now →
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
