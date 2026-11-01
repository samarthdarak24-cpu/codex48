import React, { useMemo, useState } from 'react';
import { FileText, CheckCircle2, Clock, AlertCircle, ChevronRight, X, Download, Eye, Maximize2, Check, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Submission } from '../../../types';
import { api } from '@/services/api';
import { StatCardGrid } from '../../ui/StatCard';

const StatusBadge = ({ status }: { status: Submission['status'] }) => {
  const map: Record<string, string> = {
    Approved: 'badge-approved',
    'In Review': 'badge-inreview',
    Pending: 'badge-pending',
    'Needs Changes': 'badge-changes',
    Rejected: 'badge-rejected',
  };
  const dot: Record<string, string> = { Approved: 'bg-emerald-500', 'In Review': 'bg-blue-500', Pending: 'bg-amber-500', 'Needs Changes': 'bg-orange-500', Rejected: 'bg-red-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${map[status] ?? 'badge-draft'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? 'bg-slate-400'}`} />{status}
    </span>
  );
};

export const MySubmissionsView: React.FC = () => {
  const { submissions, selectedSubmission, setSelectedSubmission, setCurrentPage, addToast } = useApp();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Approved' | 'In Review' | 'Needs Changes' | 'Rejected'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Newest First');
  const [isDetailOpen, setIsDetailOpen] = useState(true);

  const currentSubmission = (selectedSubmission && submissions.find((s) => s.id === selectedSubmission.id)) || submissions[0] || null;

  const filtered = submissions.filter((item) => {
    if (activeFilter === 'Approved' && item.status !== 'Approved') return false;
    if (activeFilter === 'In Review' && item.status !== 'In Review') return false;
    if (activeFilter === 'Needs Changes' && item.status !== 'Needs Changes') return false;
    if (activeFilter === 'Rejected' && item.status !== 'Rejected') return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && !item.campaign.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const sorted = useMemo(() => {
    const rows = [...filtered];
    if (sortBy === 'Highest Score') rows.sort((a, b) => (b.complianceScore ?? 0) - (a.complianceScore ?? 0));
    else rows.sort((a, b) => (Date.parse(b.submittedDate || '') || 0) - (Date.parse(a.submittedDate || '') || 0));
    return rows;
  }, [filtered, sortBy]);

  const totalCount = submissions.length;
  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;
  const pendingCount = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending').length;
  const needsChangesCount = submissions.filter((s) => s.status === 'Needs Changes').length;
  const rejectedCount = submissions.filter((s) => s.status === 'Rejected').length;

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">My Submissions</h1>
          <p className="text-xs text-muted mt-0.5">Track the status of your content submissions and view feedback.</p>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Total Submissions', value: totalCount, icon: <FileText className="w-5 h-5" />, variant: 'blue', trend: 12, sparkPathIndex: 0 },
    { label: 'Approved', value: approvedCount, icon: <CheckCircle2 className="w-5 h-5" />, variant: 'green', trend: 8, sparkPathIndex: 1 },
    { label: 'Pending Review', value: pendingCount, icon: <Clock className="w-5 h-5" />, variant: 'amber', trend: -33, sparkPathIndex: 2 },
    { label: 'Needs Changes', value: needsChangesCount, icon: <AlertCircle className="w-5 h-5" />, variant: 'purple', trend: 50, sparkPathIndex: 3 },
  ]} />

        {/* Filters + Sort */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Approved', 'In Review', 'Needs Changes', 'Rejected'] as const).map((tab) => {
              const cnt = tab === 'All' ? totalCount : tab === 'Approved' ? approvedCount : tab === 'In Review' ? pendingCount : tab === 'Needs Changes' ? needsChangesCount : rejectedCount;
              return (
                <button key={tab} onClick={() => setActiveFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${activeFilter === tab ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-sm' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                  {tab} ({cnt})
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Sort by:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer">
              <option>Newest First</option><option>Highest Score</option>
            </select>
            <div className="flex items-center gap-1 bg-white border border-line rounded-lg px-2 py-1.5 cursor-pointer">
              Last 30 Days <svg className="w-3 h-3 text-muted-light ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>
        </div>

        {/* Submissions list */}
        <div className="space-y-3">
          {sorted.length === 0 && <div className="bg-white rounded-2xl border border-line p-10 text-center text-xs text-muted">No submissions found.</div>}
          {sorted.map((sub) => {
            const isSelected = currentSubmission?.id === sub.id;
            return (
              <div key={sub.id} onClick={() => { setSelectedSubmission(sub); setIsDetailOpen(true); }}
                className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${isSelected ? 'selected-brand shadow-sm' : 'border-line hover:border-line-strong shadow-2xs hover:shadow-xs'}`}>
                <img src={sub.thumbnail} alt={sub.title} className="w-14 h-14 rounded-xl object-cover border border-line shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-ink-900 truncate">{sub.title}</p>
                    <StatusBadge status={sub.status} />
                  </div>
                  <p className="text-xs text-muted mt-0.5 truncate">{sub.campaign}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-light mt-1">
                    <span>{sub.submittedDate || sub.submittedAt || 'Recent'}</span>
                    <span>·</span><span>{sub.version || 'v1.0'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {(sub.findingsCount ?? 0) === 0
                      ? <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1"><Check className="w-3 h-3" />Brand compliant</span>
                      : <span className="text-[11px] text-amber-600 font-medium">⚠ {sub.findingsCount} finding{(sub.findingsCount ?? 0) > 1 ? 's' : ''}</span>
                    }
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedSubmission(sub); setIsDetailOpen(true); }} className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer">
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 rounded-lg text-muted hover:text-ink-700 hover:bg-[#FAF7EF] transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Right detail panel */}
      {isDetailOpen && currentSubmission && (
        <aside className="w-[340px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <h3 className="text-sm font-bold text-ink-900">Submission Details</h3>
            <button onClick={() => setIsDetailOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700 hover:bg-[#F1ECE0]"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="rounded-xl overflow-hidden border border-line">
              <img src={currentSubmission.thumbnail} alt={currentSubmission.title} className="w-full h-44 object-cover" />
            </div>
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-bold text-ink-900 text-sm">{currentSubmission.title}</p><p className="text-xs text-muted mt-0.5 leading-relaxed">{currentSubmission.description}</p></div>
              <StatusBadge status={currentSubmission.status} />
            </div>
            {/* Metadata */}
            <div className="space-y-0">
              {[['Campaign', currentSubmission.campaign], ['Content Type', currentSubmission.assetType || currentSubmission.format || '—'], ['Submitted On', currentSubmission.submittedDate || currentSubmission.submittedAt || '—'], ['Version', currentSubmission.version || 'v1.0']].map(([label, val]) => (
                <div key={String(label)} className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8] last:border-0 text-xs">
                  <span className="text-muted">{label}</span>
                  <span className="font-medium text-ink">{val}</span>
                </div>
              ))}
            </div>
            {/* Review Summary */}
            <div className="p-3.5 bg-[#FAF7EF] border border-line rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-ink-900">Review Summary</p>
                <button onClick={() => { setSelectedSubmission(currentSubmission); setCurrentPage('ai-review'); }} className="text-[11px] text-brand-600 font-semibold hover:underline cursor-pointer">View Detailed Report →</button>
              </div>
              <div className="space-y-2 text-xs">
                {['Brand Guidelines', 'Visual Check', 'Content Check'].map((label, i) => {
                  const pass = (currentSubmission.findingsCount ?? 0) === 0 || i === 1;
                  return (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-muted flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${pass ? 'bg-emerald-500' : 'bg-amber-500'}`} />{label}
                      </span>
                      <span className={`font-semibold ${pass ? 'text-emerald-700' : 'text-amber-700'} flex items-center gap-1`}>
                        {pass ? <><Check className="w-3 h-3" /> Matched</> : '⚠ Issues'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-line space-y-2 shrink-0">
            <button onClick={async () => { try { await api.downloadSubmissionReport(currentSubmission.id, 'text'); addToast('Report downloaded.'); } catch { addToast('Download failed.', 'error'); } }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
              <Download className="w-4 h-4" />Download Report
            </button>
            <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
              <Eye className="w-4 h-4" />View All Versions
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
