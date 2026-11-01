import React, { useState } from 'react';
import {
  Filter, User, Layers, AlertTriangle, SlidersHorizontal, ChevronDown, Wand2,
  Clock, CircleAlert, Download, Eye, GitCompare, MoreHorizontal, X,
  CheckCircle2, Zap, Activity, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Submission, SubmissionStatus } from '../../../types';
import { api } from '@/services/api';

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    'In Review': 'badge-inreview',
    Pending: 'badge-pending',
    'Needs Changes': 'badge-changes',
    Approved: 'badge-approved',
    Rejected: 'badge-rejected',
  };
  const dot: Record<string, string> = {
    'In Review': 'bg-blue-500', Pending: 'bg-amber-500', 'Needs Changes': 'bg-orange-500',
    Approved: 'bg-emerald-500', Rejected: 'bg-red-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status] ?? 'badge-draft'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? 'bg-slate-400'}`} />{status}
    </span>
  );
};

const COLUMNS: { key: SubmissionStatus[]; label: string; accent: string; bg: string; badgeCls: string }[] = [
  { key: ['In Review', 'Pending'], label: 'In Review', accent: 'bg-blue-500', bg: 'bg-blue-50/30', badgeCls: 'bg-blue-100 text-blue-800' },
  { key: ['Needs Changes'], label: 'Needs Changes', accent: 'bg-orange-400', bg: 'bg-orange-50/20', badgeCls: 'bg-orange-100 text-orange-800' },
  { key: ['Approved'], label: 'Approved', accent: 'bg-emerald-500', bg: 'bg-emerald-50/20', badgeCls: 'badge-approved' },
  { key: ['Rejected'], label: 'Rejected', accent: 'bg-red-400', bg: 'bg-red-50/20', badgeCls: 'bg-red-100 text-red-800' },
];

export const ReviewQueueView: React.FC = () => {
  const { submissions, selectedSubmission, setSelectedSubmission, updateSubmissionStatus, setIsAiCompareOpen, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'Findings' | 'Evidence' | 'Comments'>('Findings');
  const [decisionChoice, setDecisionChoice] = useState<string>('Request Changes');
  const [managerNote, setManagerNote] = useState('');
  const [bottomFeedTab, setBottomFeedTab] = useState<'Comments' | 'Activity'>('Comments');
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  const activeSub = selectedSubmission || submissions[0];

  const handleDecision = () => {
    if (!activeSub) return;
    const statusMap: Record<string, SubmissionStatus> = {
      'Approve Version': 'Approved', 'Request Changes': 'Needs Changes', 'Reject': 'Rejected',
    };
    const mapped = statusMap[decisionChoice] ?? 'Needs Changes';
    updateSubmissionStatus(activeSub.id, mapped, managerNote);
    setManagerNote('');
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Kanban + comments main area */}
      <main className="flex-1 overflow-y-auto p-5 space-y-4 bg-canvas">
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Review Queue</h1>
          <p className="text-xs text-muted mt-0.5">Review content, verify evidence, and manage brand decisions.</p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { icon: <Filter className="w-3 h-3" />, label: 'All campaigns' },
              { icon: <User className="w-3 h-3" />, label: 'All creators' },
              { icon: <Layers className="w-3 h-3" />, label: 'All statuses' },
              { icon: <AlertTriangle className="w-3 h-3" />, label: 'Risk level' },
            ].map((btn) => (
              <button key={btn.label} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-line rounded-xl text-xs font-medium text-ink-700 hover:bg-[#FAF7EF] shadow-2xs transition-colors cursor-pointer">
                <span className="text-muted-light">{btn.icon}</span>{btn.label}<ChevronDown className="w-3 h-3 text-muted-light" />
              </button>
            ))}
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-line rounded-xl text-xs font-medium text-ink-700 hover:bg-[#FAF7EF] shadow-2xs transition-colors cursor-pointer">
              <SlidersHorizontal className="w-3 h-3 text-muted" />Filter
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-line px-2.5 py-1.5 rounded-xl shadow-2xs text-xs">
              <span className="text-muted">Sort by:</span>
              <span className="font-semibold text-ink">Newest first</span>
              <ChevronDown className="w-3 h-3 text-muted-light" />
            </div>
            <button onClick={() => setIsAiCompareOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold hover:bg-emerald-100 shadow-2xs transition-colors cursor-pointer">
              <Wand2 className="w-3.5 h-3.5 text-emerald-600" />AI Compare
            </button>
          </div>
        </div>

        {/* Kanban board */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map((col) => {
            const cards = submissions.filter((s) => (col.key as string[]).includes(s.status));
            return (
              <div key={col.label} className={`${col.bg} rounded-2xl p-3 border border-line/60 space-y-2.5 min-h-[200px]`}>
                {/* Column header */}
                <div className="flex items-center justify-between px-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.accent}`} />
                    <span className="text-xs font-semibold text-ink">{col.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${col.badgeCls}`}>{cards.length}</span>
                </div>

                {/* Cards */}
                {cards.map((card) => {
                  const isSelected = activeSub?.id === card.id;
                  return (
                    <div key={card.id} onClick={() => { setSelectedSubmission(card); setIsInspectorOpen(true); }}
                      className={`bg-white rounded-xl p-2.5 cursor-pointer transition-all ${isSelected ? `border-2 shadow-sm ${col.accent.replace('bg-', 'border-')}` : 'border border-line hover:border-line-strong shadow-2xs hover:shadow-xs'}`}>
                      <div className="flex gap-2.5">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#F1ECE0] shrink-0 border border-line">
                          <img alt={card.title} className="w-full h-full object-cover" src={card.thumbnail} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ink text-xs truncate">{card.title}</p>
                          <p className="text-[10px] text-muted truncate mt-0.5">{card.campaign}</p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-light mt-1">
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">by {card.creator.name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-[#F1ECE0] flex items-center justify-between text-[10px]">
                        {(card.findingsCount ?? 0) > 0 ? (
                          <span className="text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <CircleAlert className="w-2.5 h-2.5" />{card.findingsCount} findings
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />Clean
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-muted-light">
                          <Clock className="w-3 h-3" />{card.relativeTime}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Comments / Activity feed */}
        <div className="bg-white rounded-2xl border border-line shadow-2xs p-4">
          <div className="flex items-center gap-5 border-b border-line pb-2 mb-3">
            {(['Comments', 'Activity'] as const).map((tab) => (
              <button key={tab} onClick={() => setBottomFeedTab(tab)}
                className={`pb-2 -mb-2 text-xs font-semibold transition ${bottomFeedTab === tab ? 'border-b-2 border-brand-600 text-brand-600' : 'text-muted hover:text-ink'}`}>
                {tab} {tab === 'Comments' ? '(3)' : ''}
              </button>
            ))}
          </div>
          {bottomFeedTab === 'Comments' ? (
            <div className="space-y-3">
              {activeSub?.comments && activeSub.comments.length > 0 ? activeSub.comments.map((c) => (
                <div key={c.id} className="flex items-start gap-3">
                  <img alt={c.author} src={c.avatar} className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-line" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink text-xs">{c.author}</span>
                      <span className="text-[10px] text-muted-light">{c.time}</span>
                    </div>
                    <p className="text-ink-600 text-xs mt-0.5 leading-relaxed">{c.text}</p>
                  </div>
                </div>
              )) : (
                <div className="space-y-3">
                  {[
                    { name: 'Diya Sharma', time: '2h ago', text: 'Please adjust the logo placement as per brand guidelines. Also ensure the text is not absolute.', initials: 'DS' },
                    { name: 'Rohan Mehta', time: '3h ago', text: 'Got it, will update the creative and resubmit.', initials: 'RM' },
                  ].map((c) => (
                    <div key={c.name} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 text-[10px] font-bold">{c.initials}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink text-xs">{c.name}</span>
                          <span className="text-[10px] text-muted-light">{c.time}</span>
                        </div>
                        <p className="text-ink-600 text-xs mt-0.5 leading-relaxed">{c.text}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#F1ECE0] text-brand-600 flex items-center justify-center shrink-0"><Zap className="w-3.5 h-3.5" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink text-xs">System</span>
                        <span className="text-[10px] text-muted-light">4h ago</span>
                      </div>
                      <p className="text-muted text-xs mt-0.5">Version 3 submitted • VisualGuard completed • Evidence retrieved</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-xs text-ink-600">
              <div className="flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-brand-600" /><span>VisualGuard automated checks completed.</span><span className="text-muted-light text-[10px] ml-1">1h ago</span></div>
              <div className="flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-emerald-600" /><span>Riya Sharma assigned as lead creative for Summer Sale.</span><span className="text-muted-light text-[10px] ml-1">3h ago</span></div>
            </div>
          )}
        </div>
      </main>

      {/* Right inspector panel */}
      {isInspectorOpen && activeSub && (
        <aside className="w-[360px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          {/* Inspector header */}
          <div className="p-4 border-b border-line shrink-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-ink-900 text-sm truncate max-w-[200px]">{activeSub.title}</p>
                  <StatusPill status={activeSub.status} />
                </div>
                <p className="text-[10px] text-muted-light mt-0.5">1600 × 1200 · Campaign: {activeSub.campaign}</p>
              </div>
              <button onClick={() => setIsInspectorOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700 hover:bg-[#F1ECE0] shrink-0"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Preview image */}
            <div className="rounded-xl overflow-hidden border border-line">
              <img alt={activeSub.title} src={activeSub.thumbnail} className="w-full h-44 object-cover" />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { icon: <Download className="w-3.5 h-3.5" />, label: 'Download', fn: async () => { try { await api.downloadSubmissionReport(activeSub.id, 'text'); addToast('Downloaded.'); } catch { addToast('Download failed.', 'error'); } } },
                { icon: <Eye className="w-3.5 h-3.5" />, label: 'Preview', fn: () => activeSub.thumbnail && window.open(activeSub.thumbnail, '_blank') },
                { icon: <GitCompare className="w-3.5 h-3.5" />, label: 'Compare', fn: () => setIsAiCompareOpen(true) },
                { icon: <MoreHorizontal className="w-3.5 h-3.5" />, label: 'More', fn: () => {} },
              ].map((btn) => (
                <button key={btn.label} onClick={btn.fn} title={btn.label}
                  className="flex flex-col items-center gap-1 py-2 border border-line rounded-xl text-muted hover:bg-[#FAF7EF] hover:text-ink-900 transition-colors cursor-pointer">
                  {btn.icon}
                  <span className="text-[9px] font-medium">{btn.label}</span>
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-line">
              {(['Findings', 'Evidence', 'Comments'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`pb-2 text-xs font-semibold transition ${activeTab === tab ? 'border-b-2 border-brand-600 text-brand-600' : 'text-muted hover:text-ink'}`}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Findings */}
            {activeTab === 'Findings' && (
              <div className="space-y-2.5">
                {activeSub.findings && activeSub.findings.length > 0 ? activeSub.findings.map((f) => (
                  <div key={f.id} className={`p-3 rounded-xl border text-xs ${f.type === 'error' ? 'bg-red-50 border-red-200' : f.type === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="font-bold text-ink-900 flex items-center gap-1.5">
                        {f.type === 'error' ? <CircleAlert className="w-3.5 h-3.5 text-red-500 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        {f.title}
                      </p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${f.type === 'error' ? 'badge-rejected' : 'bg-amber-100 text-amber-700'}`}>
                        {f.badge || f.type}
                      </span>
                    </div>
                    <p className="text-muted leading-relaxed ml-5">{f.description}</p>
                    {f.guidelineRef && <p className="text-[10px] text-muted-light mt-1 font-mono ml-5">{f.guidelineRef}</p>}
                  </div>
                )) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />No compliance violations found.
                  </div>
                )}
                {/* Confidence score */}
                <div className="pt-2 border-t border-[#F1ECE0]">
                  <div className="flex items-center justify-between text-[10px] font-medium text-ink-600 mb-1">
                    <span>Confidence Score</span>
                    <span className="font-bold text-ink">{(activeSub.complianceScore / 100).toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 bg-[#F1ECE0] rounded-full overflow-hidden">
                    <div className="progress-brand h-full rounded-full" style={{ width: `${activeSub.complianceScore}%` }} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Evidence' && (
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-[#FAF7EF] rounded-xl border border-line">
                  <p className="font-semibold text-ink-900">VisualGuard</p>
                  <ul className="mt-1.5 space-y-1 text-muted list-disc pl-4">
                    <li>Logo mismatch — logo position differs from guideline</li>
                    <li>Colour variation — shade outside approved palette</li>
                    <li>OCR text detected</li>
                  </ul>
                </div>
                <div className="p-3 bg-[#FAF7EF] rounded-xl border border-line">
                  <p className="font-semibold text-ink-900">Evidence Intelligence</p>
                  <p className="text-muted mt-1">Potential claim conflict: "100% natural" — Claims must be substantiated and must not be absolute.</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"><CheckCircle2 className="w-3 h-3" />Citation Verified</span>
                </div>
              </div>
            )}

            {activeTab === 'Comments' && (
              <div className="space-y-2.5 text-xs">
                {activeSub.comments && activeSub.comments.length > 0 ? activeSub.comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <img alt={c.author} src={c.avatar} className="w-6 h-6 rounded-full object-cover shrink-0" />
                    <div>
                      <span className="font-semibold text-ink">{c.author}</span> <span className="text-muted-light">{c.time}</span>
                      <p className="text-muted mt-0.5">{c.text}</p>
                    </div>
                  </div>
                )) : <p className="text-muted">No comments yet.</p>}
              </div>
            )}
          </div>

          {/* Decision footer */}
          <div className="p-4 border-t border-line space-y-3 shrink-0">
            {/* Assigned + Due */}
            <div className="flex items-center justify-between text-[11px] text-muted">
              <div className="flex items-center gap-1.5">
                <img alt="reviewer" src={activeSub.creator.avatar} className="w-5 h-5 rounded-full object-cover" />
                <span>Assigned to <strong className="text-ink-900">{activeSub.creator.name}</strong></span>
              </div>
              <span>Due by <strong className="text-ink-900">Nov 03, 2026</strong></span>
            </div>

            {/* Decision dropdown */}
            <div className="space-y-2">
              <select value={decisionChoice} onChange={(e) => setDecisionChoice(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer">
                <option>Request Changes</option>
                <option>Approve Version</option>
                <option>Reject</option>
              </select>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => { setDecisionChoice('Request Changes'); handleDecision(); }}
                  className="py-2 border border-orange-300 rounded-xl text-xs font-semibold text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer">
                  Request Changes
                </button>
                <button onClick={() => { setDecisionChoice('Reject'); handleDecision(); }}
                  className="py-2 border border-red-300 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                  Reject
                </button>
                <button onClick={() => { setDecisionChoice('Approve Version'); handleDecision(); }}
                  className="py-2 bg-brand-600 hover:bg-brand-700 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer">
                  Approve ✓
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
