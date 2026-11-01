import React, { useState } from 'react';
import {
  FileText, CheckCircle, Clock, AlertTriangle, ChevronDown, MoreVertical,
  Download, ArrowRight, ChevronLeft, ChevronRight, Eye, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import { StatCardGrid } from '../../ui/StatCard';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Approved: 'badge-approved',
    'In Review': 'badge-inreview',
    Pending: 'badge-pending',
    'Needs Changes': 'badge-changes',
    Rejected: 'badge-rejected',
  };
  const dot: Record<string, string> = {
    Approved: 'bg-emerald-500', 'In Review': 'bg-blue-500', Pending: 'bg-amber-500',
    'Needs Changes': 'bg-orange-500', Rejected: 'bg-red-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${map[status] ?? 'badge-draft'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? 'bg-slate-400'}`} />
      {status}
    </span>
  );
};

const ScoreCircle = ({ score }: { score: number }) => {
  const color = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
  const r = 14; const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-9 h-9 flex items-center justify-center">
      <svg className="-rotate-90 absolute" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#F1ECE0" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="text-[9px] font-bold text-ink-900 relative z-10">{score}%</span>
    </div>
  );
};

const PAGE_SIZE = 8;

export const AllSubmissionsView: React.FC = () => {
  const { submissions, searchQuery, showToast, setActivePage, setSelectedSubmission } = useApp();
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'Pending' | 'Needs Changes' | 'Rejected'>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const totalCount = submissions.length;
  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;
  const pendingCount = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending').length;
  const needsChangesCount = submissions.filter((s) => s.status === 'Needs Changes').length;
  const rejectedCount = submissions.filter((s) => s.status === 'Rejected').length;

  const filtered = submissions.filter((sub) => {
    if (statusFilter === 'Approved' && sub.status !== 'Approved') return false;
    if (statusFilter === 'Pending' && sub.status !== 'In Review' && sub.status !== 'Pending') return false;
    if (statusFilter === 'Needs Changes' && sub.status !== 'Needs Changes') return false;
    if (statusFilter === 'Rejected' && sub.status !== 'Rejected') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return sub.title.toLowerCase().includes(q) || sub.campaign.toLowerCase().includes(q) || sub.creator.name.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSelectAll = () => setSelectedIds(selectedIds.length === paginated.length ? [] : paginated.map((s) => s.id));
  const toggleSelect = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  // Top campaigns
  const campaignMap: Record<string, number> = {};
  submissions.forEach((s) => { campaignMap[s.campaign] = (campaignMap[s.campaign] ?? 0) + 1; });
  const topCampaigns = Object.entries(campaignMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCampaign = topCampaigns[0]?.[1] ?? 1;

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">All Submissions</h1>
          <p className="text-xs text-muted mt-0.5">View and manage all content submissions across campaigns.</p>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Total Submissions', value: totalCount, icon: <FileText className="w-5 h-5" />, variant: 'blue', trend: 12, sparkPathIndex: 0 },
    { label: 'Approved', value: approvedCount, icon: <CheckCircle className="w-5 h-5" />, variant: 'green', trend: 8, sparkPathIndex: 1 },
    { label: 'Pending Review', value: pendingCount, icon: <Clock className="w-5 h-5" />, variant: 'amber', trend: 5, sparkPathIndex: 2 },
    { label: 'Needs Changes', value: needsChangesCount, icon: <AlertTriangle className="w-5 h-5" />, variant: 'orange', trend: 3, sparkPathIndex: 3 },
  ]} />

        {/* Filters */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Approved', 'Pending', 'Needs Changes', 'Rejected'] as const).map((tab) => (
              <button key={tab} onClick={() => { setStatusFilter(tab); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${statusFilter === tab ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-sm' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                {tab} ({tab === 'All' ? totalCount : tab === 'Approved' ? approvedCount : tab === 'Pending' ? pendingCount : tab === 'Needs Changes' ? needsChangesCount : rejectedCount})
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Sort by:</span>
            <select className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer">
              <option>Newest First</option><option>Oldest First</option><option>Highest Score</option>
            </select>
            <div className="flex items-center gap-1 bg-white border border-line rounded-lg px-2 py-1">
              <span className="text-muted-light">📅</span>
              <span className="text-ink font-medium">Last 30 Days</span>
              <ChevronDown className="w-3 h-3 text-muted-light" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-line shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 via-blue-50/40 to-pink-50/30 border-b border-slate-200">
                  <th className="py-3 px-4 w-8"><input type="checkbox" checked={selectedIds.length === paginated.length && paginated.length > 0} onChange={toggleSelectAll} className="rounded" /></th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">Submission</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">Campaign</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">Creator</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">Status</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">Score</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">Submitted</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {paginated.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-xs text-muted">No submissions found.</td></tr>
                )}
                {paginated.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#FAF7EF]/60 transition-colors">
                    <td className="py-3 px-4"><input type="checkbox" checked={selectedIds.includes(sub.id)} onChange={() => toggleSelect(sub.id)} className="rounded" /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img src={sub.thumbnail} alt={sub.title} className="w-10 h-10 rounded-lg object-cover border border-line shrink-0" />
                        <div>
                          <p className="font-semibold text-ink-900 text-xs">{sub.title}</p>
                          <p className="text-[10px] text-muted-light">{sub.version || 'v1.0'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-brand-600 font-medium">{sub.campaign}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img src={sub.creator.avatar} alt={sub.creator.name} className="w-6 h-6 rounded-full object-cover" />
                        <span className="text-xs text-ink-700">{sub.creator.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={sub.status} /></td>
                    <td className="py-3 px-4"><ScoreCircle score={sub.complianceScore} /></td>
                    <td className="py-3 px-4 text-xs text-muted whitespace-nowrap">{sub.submittedDate || sub.submittedAt || '—'}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => { setSelectedSubmission(sub); setActivePage('review-queue'); }} className="p-1.5 rounded-lg text-muted hover:text-brand-600 hover:bg-brand-50 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-line">
            <p className="text-xs text-muted">Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} submissions</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-line text-muted hover:bg-[#FAF7EF] disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setCurrentPage(p)} className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${p === currentPage ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm font-bold' : 'border border-line text-muted hover:bg-[#FAF7EF]'}`}>{p}</button>
              ))}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-line text-muted hover:bg-[#FAF7EF] disabled:opacity-40 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Right analytics panel */}
      <aside className="w-[280px] bg-white border-l border-line flex flex-col shrink-0 p-4 gap-5 overflow-y-auto">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink-900">Submission Analytics</h3>
            <select className="text-[11px] text-muted bg-[#FAF7EF] border border-line rounded px-1.5 py-0.5 focus:outline-none">
              <option>Last 30 Days</option><option>Last 7 Days</option>
            </select>
          </div>
          {/* Donut */}
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="-rotate-90" width="96" height="96" viewBox="0 0 96 96">
                {[
                  { color: '#10b981', pct: approvedCount / Math.max(totalCount, 1), offset: 0, label: 'Approved' },
                  { color: '#3b82f6', pct: pendingCount / Math.max(totalCount, 1), offset: approvedCount / Math.max(totalCount, 1), label: 'Pending' },
                  { color: '#f97316', pct: needsChangesCount / Math.max(totalCount, 1), offset: (approvedCount + pendingCount) / Math.max(totalCount, 1), label: 'Needs Changes' },
                  { color: '#ef4444', pct: rejectedCount / Math.max(totalCount, 1), offset: (approvedCount + pendingCount + needsChangesCount) / Math.max(totalCount, 1), label: 'Rejected' },
                ].map(({ color, pct, offset }) => {
                  const r = 38; const circ = 2 * Math.PI * r;
                  return <circle key={color} cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${pct * circ} ${circ}`} strokeDashoffset={-(offset * circ)} />;
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-ink-900">{totalCount}</span>
                <span className="text-[9px] text-muted">Total</span>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              {[['#10b981', 'Approved', approvedCount, Math.round(approvedCount / Math.max(totalCount, 1) * 100)],
                ['#3b82f6', 'Pending', pendingCount, Math.round(pendingCount / Math.max(totalCount, 1) * 100)],
                ['#f97316', 'Needs Changes', needsChangesCount, Math.round(needsChangesCount / Math.max(totalCount, 1) * 100)],
                ['#ef4444', 'Rejected', rejectedCount, Math.round(rejectedCount / Math.max(totalCount, 1) * 100)],
              ].map(([color, label, count, pct]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: String(color) }} />
                  <span className="text-muted flex-1">{label}</span>
                  <span className="font-semibold text-ink-900">{count} ({pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Campaigns */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-ink-900">Top Campaigns</h4>
            <button className="text-[11px] text-brand-600 font-semibold hover:underline">View All →</button>
          </div>
          <div className="space-y-2">
            {topCampaigns.map(([name, count]) => (
              <div key={name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-700 truncate max-w-[160px]">{name}</span>
                  <span className="font-semibold text-ink-900">{count}</span>
                </div>
                <div className="h-1.5 bg-[#F1ECE0] rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(count / maxCampaign) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="text-xs font-bold text-ink-900 mb-2">Quick Actions</h4>
          <div className="space-y-1.5">
            {[{ icon: <Download className="w-3.5 h-3.5" />, label: 'Export Report' },
              { icon: <Eye className="w-3.5 h-3.5" />, label: 'View Insights' },
              { icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Bulk Actions' },
            ].map((a) => (
              <button key={a.label} className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-line rounded-xl text-xs font-medium text-ink-700 hover:bg-[#FAF7EF] transition-colors">
                {a.icon}{a.label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};
