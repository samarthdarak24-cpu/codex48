import React, { useState } from 'react';
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  Calendar,
  MoreVertical,
  Download,
  BarChart3,
  CheckSquare,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';

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
      return (
        sub.title.toLowerCase().includes(q) ||
        sub.campaign.toLowerCase().includes(q) ||
        sub.creator.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((s) => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleExportCsv = async () => {
    try {
      showToast('Exporting submissions CSV...', 'info');
      await api.downloadSubmissionsCsv();
      showToast('Submissions CSV downloaded successfully!', 'success');
    } catch {
      showToast('Failed to export CSV.', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#F7F3EA]">
      {/* Title */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-ink-900 tracking-tight">All Submissions</h2>
        <p className="text-xs text-muted mt-0.5">
          View and manage all content submissions across campaigns.
        </p>
      </div>

      {/* Grid: Main Table Area (9 cols) + Right Analytics Rail (3 cols) */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left/Center Main Column */}
        <div className="col-span-12 xl:col-span-9 flex flex-col gap-5">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Submissions */}
            <div className="bg-white p-4 rounded-xl border border-line/80 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-muted">Total Submissions</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-bold text-ink-900 leading-tight">{totalCount}</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Active</span>
                </div>
              </div>
              <svg className="w-12 h-6 text-brand-300 ml-auto shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 48 24">
                <path d="M2 18c6-4 12 2 18-2s12-8 18-4 6 2 8-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Approved */}
            <div className="bg-white p-4 rounded-xl border border-line/80 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-muted">Approved</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-bold text-ink-900 leading-tight">{approvedCount}</span>
                  <span className="text-[11px] font-semibold text-emerald-600">{totalCount > 0 ? `${Math.round((approvedCount / totalCount) * 100)}%` : '0%'}</span>
                </div>
              </div>
              <svg className="w-12 h-6 text-emerald-300 ml-auto shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 48 24">
                <path d="M2 20c8-2 14-8 22-6s12-8 20-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Pending Review */}
            <div className="bg-white p-4 rounded-xl border border-line/80 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-muted">Pending Review</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-bold text-ink-900 leading-tight">{pendingCount}</span>
                  <span className="text-[11px] font-semibold text-amber-600">{totalCount > 0 ? `${Math.round((pendingCount / totalCount) * 100)}%` : '0%'}</span>
                </div>
              </div>
              <svg className="w-12 h-6 text-amber-300 ml-auto shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 48 24">
                <path d="M2 18c8-1 16-6 24-2s12-6 18-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Needs Changes */}
            <div className="bg-white p-4 rounded-xl border border-line/80 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-muted">Needs Changes</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-bold text-ink-900 leading-tight">{needsChangesCount}</span>
                  <span className="text-[11px] font-semibold text-rose-500">{totalCount > 0 ? `${Math.round((needsChangesCount / totalCount) * 100)}%` : '0%'}</span>
                </div>
              </div>
              <svg className="w-12 h-6 text-rose-300 ml-auto shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 48 24">
                <path d="M2 20c8-2 14-4 22-8s12-1 20-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Filtering Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(['All', 'Approved', 'Pending', 'Needs Changes', 'Rejected'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 font-medium rounded-full text-xs transition-colors ${
                    statusFilter === tab
                      ? 'bg-brand-600 text-white shadow-2xs'
                      : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'
                  }`}
                >
                  {tab === 'All'
                    ? `All (${totalCount})`
                    : tab === 'Approved'
                    ? `Approved (${approvedCount})`
                    : tab === 'Pending'
                    ? `Pending (${pendingCount})`
                    : tab === 'Needs Changes'
                    ? `Needs Changes (${needsChangesCount})`
                    : `Rejected (${rejectedCount})`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink-700 hover:bg-[#FAF7EF]">
                <span>Sort by: <strong className="font-semibold text-ink-900">Newest First</strong></span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink-700 hover:bg-[#FAF7EF]">
                <Calendar className="w-3.5 h-3.5 text-muted-light" />
                <span>Last 30 Days</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
              </button>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-xl border border-line shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#F1ECE0] bg-[#FAF7EF]/60 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filtered.length && filtered.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-line-strong text-brand-600 focus:ring-brand-500 h-4 w-4"
                      />
                    </th>
                    <th className="py-3 px-3">Submission</th>
                    <th className="py-3 px-3">Campaign</th>
                    <th className="py-3 px-3">Creator</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Compliance Score</th>
                    <th className="py-3 px-3">Submitted On</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1ECE0]">
                  {filtered.map((sub) => {
                    const isChecked = selectedIds.includes(sub.id);
                    return (
                      <tr key={sub.id} className="hover:bg-[#FAF7EF]/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(sub.id)}
                            className="rounded border-line-strong text-brand-600 focus:ring-brand-500 h-4 w-4"
                          />
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <img
                              alt={sub.title}
                              className="w-10 h-10 rounded-lg object-cover border border-line shrink-0"
                              src={sub.thumbnail}
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-ink-900 truncate">{sub.title}</div>
                              <div className="text-[11px] text-muted-light">{sub.version}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-ink-600">{sub.campaign}</td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <img
                              alt={sub.creator.name}
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                              src={sub.creator.avatar}
                            />
                            <span className="text-ink-700 truncate">{sub.creator.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                              sub.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                : sub.status === 'Needs Changes'
                                ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                                : sub.status === 'Rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                                : 'bg-brand-50 text-brand-700 border-brand-200/60'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                sub.status === 'Approved'
                                  ? 'bg-emerald-500'
                                  : sub.status === 'Needs Changes'
                                  ? 'bg-amber-500'
                                  : sub.status === 'Rejected'
                                  ? 'bg-rose-500'
                                  : 'bg-brand-500'
                              }`}
                            />
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="relative w-7 h-7 flex items-center justify-center">
                              <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" fill="none" r="14" stroke="#e2e8f0" strokeWidth="3" />
                                <circle
                                  cx="18"
                                  cy="18"
                                  fill="none"
                                  r="14"
                                  stroke={
                                    sub.complianceScore >= 90
                                      ? '#10b981'
                                      : sub.complianceScore >= 75
                                      ? '#f59e0b'
                                      : '#ef4444'
                                  }
                                  strokeDasharray={`${sub.complianceScore * 0.88}, 100`}
                                  strokeLinecap="round"
                                  strokeWidth="3"
                                />
                              </svg>
                            </div>
                            <span className="font-semibold text-ink">{sub.complianceScore}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-[11px] text-muted leading-tight">
                          {sub.submittedAt}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setActivePage('review-queue');
                            }}
                            title="Inspect in review queue"
                            className="text-muted-light hover:text-brand-600 p-1.5 rounded hover:bg-brand-50 cursor-pointer transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-[#F1ECE0] flex items-center justify-between text-xs text-muted font-medium">
              <div>
                Showing <span className="font-semibold text-ink-900">1–{filtered.length}</span> of{' '}
                <span className="font-semibold text-ink-900">{totalCount}</span> submissions
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded border border-line text-muted-light hover:bg-[#FAF7EF]"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded bg-brand-600 text-white font-semibold shadow-2xs">
                    1
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-line text-ink-700 hover:bg-[#FAF7EF]">
                    2
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-line text-ink-700 hover:bg-[#FAF7EF]">
                    3
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded border border-line text-muted-light hover:bg-[#FAF7EF]"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Rail Sidebar (3 cols) */}
        <aside className="col-span-12 xl:col-span-3 flex flex-col gap-5">
          {/* Submission Analytics Donut Card */}
          <div className="bg-white p-5 rounded-xl border border-line/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-ink-900 text-sm">Submission Analytics</h3>
              <button className="flex items-center gap-1 text-[11px] font-medium text-muted border border-line px-2 py-0.5 rounded hover:bg-[#FAF7EF]">
                Last 30 Days <ChevronDown className="w-3 h-3 text-muted-light" />
              </button>
            </div>

            <div className="flex items-center gap-5 my-2">
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full conic-gradient-analytics" />
                <div className="w-16 h-16 rounded-full bg-white absolute flex flex-col items-center justify-center shadow-inner">
                  <span className="text-base font-bold text-ink-900 leading-none">{totalCount}</span>
                  <span className="text-[10px] text-muted-light font-medium">Total</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ink-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Approved
                  </span>
                  <span className="font-semibold text-ink">{approvedCount} <span className="text-muted-light font-normal">({totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}%)</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ink-600">
                    <span className="w-2 h-2 rounded-full bg-brand-500" /> Pending
                  </span>
                  <span className="font-semibold text-ink">{pendingCount} <span className="text-muted-light font-normal">({totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0}%)</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ink-600">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Needs Changes
                  </span>
                  <span className="font-semibold text-ink">{needsChangesCount} <span className="text-muted-light font-normal">({totalCount > 0 ? Math.round((needsChangesCount / totalCount) * 100) : 0}%)</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ink-600">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Rejected
                  </span>
                  <span className="font-semibold text-ink">{rejectedCount} <span className="text-muted-light font-normal">({totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0}%)</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Campaigns Card */}
          <div className="bg-white p-5 rounded-xl border border-line/80 shadow-2xs">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="font-bold text-ink-900 text-sm">Top Campaigns</h3>
              <button
                onClick={() => setActivePage('analytics')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3 text-xs">
              {[
                { name: 'Summer Sale 2025', count: 42, pct: 84, color: 'bg-teal-700' },
                { name: 'Product Launch', count: 38, pct: 76, color: 'bg-teal-600' },
                { name: 'Weekend Offer', count: 34, pct: 68, color: 'bg-teal-500' },
                { name: 'Spring Collection', count: 28, pct: 56, color: 'bg-emerald-500' },
                { name: 'Wellness Campaign', count: 24, pct: 48, color: 'bg-emerald-400' },
              ].map((c) => (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-ink-700">{c.name}</span>
                    <span className="font-semibold text-ink">{c.count}</span>
                  </div>
                  <div className="w-full bg-[#F1ECE0] rounded-full h-2">
                    <div className={`${c.color} h-2 rounded-full`} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white p-5 rounded-xl border border-line/80 shadow-2xs">
            <h3 className="font-bold text-ink-900 text-sm mb-3">Quick Actions</h3>
            <div className="space-y-2 text-xs">
              <button
                onClick={handleExportCsv}
                className="w-full py-2.5 px-4 bg-white border border-brand-200 text-brand-600 hover:bg-brand-50/50 rounded-lg font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" /> Export Report (CSV)
              </button>
              <button
                onClick={() => setActivePage('analytics')}
                className="w-full py-2.5 px-4 bg-white border border-brand-200 text-brand-600 hover:bg-brand-50/50 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
              >
                <BarChart3 className="w-4 h-4" /> View Insights
              </button>
              <button
                onClick={() => {
                  if (selectedIds.length === 0) {
                    showToast('Please select one or more submissions from the table first', 'info');
                  } else {
                    showToast(`Bulk applied approval check to ${selectedIds.length} items`);
                  }
                }}
                className="w-full py-2.5 px-4 bg-white border border-brand-200 text-brand-600 hover:bg-brand-50/50 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
              >
                <CheckSquare className="w-4 h-4" /> Bulk Actions ({selectedIds.length})
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
