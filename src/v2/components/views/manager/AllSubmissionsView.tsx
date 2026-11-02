/**
 * All Submissions — enterprise table.
 *
 * Counts, thumbnails, scores and the drawer's history all come from
 * `useApp()`. Sorting, filtering and search operate on that real list; nothing
 * here is a sample row.
 */
import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Clock, Download, FileText, Lock, Search, X,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { Submission, SubmissionStatus } from '../../../types';
import {
  AnimatedCard, AnimatedCounter, AnimatedDrawer, BarSeries, ChartContainer, FilterPills,
  PageTransition, SectionHeader, Stagger, StaggerItem, type Tone,
} from '../../motion';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 8;

const STATUS_CLASS: Record<string, string> = {
  Approved: 'badge-approved',
  'In Review': 'badge-inreview',
  Pending: 'badge-pending',
  'Needs Changes': 'badge-changes',
  Rejected: 'badge-rejected',
};

const STATUS_DOT: Record<string, string> = {
  Approved: 'bg-sage-500',
  'In Review': 'bg-olive-500',
  Pending: 'bg-warn-400',
  'Needs Changes': 'bg-terracotta-500',
  Rejected: 'bg-danger-500',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`${STATUS_CLASS[status] ?? 'badge-draft'} shrink-0`}>
    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-muted-light'}`} />
    {status}
  </span>
);

const scoreTone = (score: number): Tone => (score >= 90 ? 'sage' : score >= 70 ? 'amber' : 'danger');

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const stroke = score >= 90 ? '#7A9064' : score >= 70 ? '#DDA22B' : '#C25446';
  return (
    <div className="relative flex h-9 w-9 items-center justify-center">
      <svg className="absolute -rotate-90" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#F0EBDF" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * circ} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="relative z-10 text-[9px] font-semibold tabular-nums text-ink">{score}%</span>
    </div>
  );
};

const timestampOf = (s: Submission): number => {
  const raw = s.submittedAt ?? s.submittedDate;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const typeOf = (s: Submission): string => (s.type ?? s.assetType ?? '').toString().toLowerCase();

type SortKey = 'newest' | 'oldest' | 'score';
type StatusFilter = 'All' | 'Approved' | 'Pending' | 'Needs Changes' | 'Rejected';
type TypeFilter = 'All' | 'image' | 'video' | 'text' | 'social';

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export const AllSubmissionsView: React.FC = () => {
  const {
    role, submissions, searchQuery, loading, error, showToast, setActivePage, setSelectedSubmission,
    auditEvents,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [query, setQuery] = useState(searchQuery);
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerSub, setDrawerSub] = useState<Submission | null>(null);

  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;
  const pendingCount = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending').length;
  const needsChangesCount = submissions.filter((s) => s.status === 'Needs Changes').length;
  const rejectedCount = submissions.filter((s) => s.status === 'Rejected').length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = submissions.filter((sub) => {
      if (statusFilter === 'Approved' && sub.status !== 'Approved') return false;
      if (statusFilter === 'Pending' && sub.status !== 'In Review' && sub.status !== 'Pending') return false;
      if (statusFilter === 'Needs Changes' && sub.status !== 'Needs Changes') return false;
      if (statusFilter === 'Rejected' && sub.status !== 'Rejected') return false;
      if (typeFilter !== 'All' && typeOf(sub) !== typeFilter) return false;
      if (!q) return true;
      return (
        sub.title.toLowerCase().includes(q) ||
        sub.campaign.toLowerCase().includes(q) ||
        sub.creator.name.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortKey === 'score') return b.complianceScore - a.complianceScore;
      if (sortKey === 'oldest') return timestampOf(a) - timestampOf(b);
      return timestampOf(b) - timestampOf(a);
    });
  }, [submissions, statusFilter, typeFilter, query, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const campaignBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of submissions) map.set(s.campaign, (map.get(s.campaign) ?? 0) + 1);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }));
  }, [submissions]);

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === paginated.length && paginated.length > 0 ? [] : paginated.map((s) => s.id),
    );

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const openDrawer = (sub: Submission) => {
    setSelectedSubmission(sub);
    setDrawerSub(sub);
  };

  const handleExport = async () => {
    try {
      await api.downloadSubmissionsCsv();
      showToast('Submission export downloaded.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed.', 'error');
    }
  };

  const handleReport = async (sub: Submission) => {
    try {
      await api.downloadSubmissionReport(sub.id);
      showToast(`Report downloaded for ${sub.title}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Download failed.', 'error');
    }
  };

  const relatedEvents = useMemo(() => {
    if (!drawerSub) return [];
    const needle = drawerSub.title.toLowerCase();
    return auditEvents
      .filter((e) => `${e.details} ${e.subDetails ?? ''}`.toLowerCase().includes(needle))
      .slice(0, 4);
  }, [auditEvents, drawerSub]);

  /* ---- States ---- */

  if (role !== 'manager') {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-10 text-center shadow-card">
          <Lock className="mx-auto h-8 w-8 text-muted-light" />
          <h1 className="mt-3 text-lg font-semibold text-ink">Manager access only</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            The submission register is restricted to brand managers. Your current role is {role}.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-[1500px] space-y-4">
          <div className="h-14 w-1/3 animate-pulse rounded-2xl bg-cream-100" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[108px] animate-pulse rounded-2xl bg-cream-100" />
            ))}
          </div>
          <div className="h-[420px] animate-pulse rounded-2xl bg-cream-100" />
        </div>
      </div>
    );
  }

  const filterCounts: Record<StatusFilter, number> = {
    All: submissions.length,
    Approved: approvedCount,
    Pending: pendingCount,
    'Needs Changes': needsChangesCount,
    Rejected: rejectedCount,
  };

  const firstShown = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <PageTransition className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-4">

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-xs text-danger-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">
              Submission register
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">All Submissions</h1>
            <p className="mt-1 text-sm text-muted">
              Every content submission across campaigns, with its stored compliance score.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink-700 shadow-card transition-colors hover:bg-cream-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>

        {/* Metrics */}
        <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total submissions', value: submissions.length, icon: <FileText className="h-4 w-4" />, ring: 'bg-brand-50 text-brand-600' },
            { label: 'Approved', value: approvedCount, icon: <CheckCircle2 className="h-4 w-4" />, ring: 'bg-sage-50 text-sage-600' },
            { label: 'Pending review', value: pendingCount, icon: <Clock className="h-4 w-4" />, ring: 'bg-warn-50 text-warn-600' },
            { label: 'Needs changes', value: needsChangesCount, icon: <AlertTriangle className="h-4 w-4" />, ring: 'bg-terracotta-50 text-terracotta-600' },
          ].map((m) => (
            <StaggerItem key={m.label}>
              <AnimatedCard className="p-4">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.ring}`}>{m.icon}</span>
                <p className="mt-3 text-2xl font-semibold leading-none tabular-nums text-ink">
                  <AnimatedCounter value={m.value} />
                </p>
                <p className="mt-1.5 text-xs font-medium text-muted">{m.label}</p>
              </AnimatedCard>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterPills
              options={(['All', 'Approved', 'Pending', 'Needs Changes', 'Rejected'] as const).map((tab) => ({
                id: tab,
                label: `${tab} (${filterCounts[tab]})`,
              }))}
              selected={[statusFilter]}
              onChange={(sel) => {
                const next = sel.filter((id) => id !== statusFilter);
                setStatusFilter((next[next.length - 1] as typeof statusFilter) ?? 'All');
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-light" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search title, campaign, creator…"
                aria-label="Search submissions"
                className="w-full rounded-xl border border-line bg-white py-1.5 pl-8 pr-8 text-xs text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/40 sm:w-64"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-2 rounded p-0.5 text-muted-light hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as TypeFilter);
                  setCurrentPage(1);
                }}
                aria-label="Filter by content type"
                className="appearance-none rounded-xl border border-line bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-300/40"
              >
                <option value="All">All types</option>
                <option value="image">Images</option>
                <option value="video">Video</option>
                <option value="text">Text</option>
                <option value="social">Social</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-light" />
            </div>

            <div className="relative">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                aria-label="Sort submissions"
                className="appearance-none rounded-xl border border-line bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-300/40"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="score">Highest score</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-light" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-line bg-cream-50">
                  <th scope="col" className="w-9 px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all submissions on this page"
                      checked={selectedIds.length === paginated.length && paginated.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-line"
                    />
                  </th>
                  <th scope="col" className="px-3 py-3 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Submission</th>
                  <th scope="col" className="px-3 py-3 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Campaign</th>
                  <th scope="col" className="px-3 py-3 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Creator</th>
                  <th scope="col" className="px-3 py-3 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Status</th>
                  <th scope="col" className="px-3 py-3 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Score</th>
                  <th scope="col" className="px-3 py-3 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Submitted</th>
                  <th scope="col" className="px-3 py-3 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center">
                      <FileText className="mx-auto h-6 w-6 text-muted-light" />
                      <p className="mt-2 text-sm font-medium text-ink-600">No submissions match these filters</p>
                      <p className="mt-0.5 text-2xs text-muted">
                        {submissions.length === 0
                          ? 'Nothing has been submitted to this workspace yet.'
                          : 'Try clearing the search or choosing a different status.'}
                      </p>
                    </td>
                  </tr>
                )}
                {paginated.map((sub) => (
                  <tr
                    key={sub.id}
                    tabIndex={0}
                    onClick={() => openDrawer(sub)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDrawer(sub);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-cream-50 focus-visible:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-300"
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${sub.title}`}
                        checked={selectedIds.includes(sub.id)}
                        onChange={() => toggleSelect(sub.id)}
                        className="rounded border-line"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={sub.thumbnail}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink">{sub.title}</p>
                          <p className="text-2xs text-muted-light">{sub.version ?? 'v1.0'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-brand-700">
                      <span className="line-clamp-2">{sub.campaign}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <img src={sub.creator.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                        <span className="truncate text-xs text-ink-700">{sub.creator.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={sub.status} /></td>
                    <td className="px-3 py-3"><ScoreRing score={sub.complianceScore} /></td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">
                      {sub.submittedDate ?? sub.submittedAt ?? '—'}
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedSubmission(sub);
                          setActivePage('review-queue');
                        }}
                        aria-label={`Review ${sub.title}`}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-brand-50 hover:text-brand-700"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <p className="text-2xs text-muted">
              Showing {firstShown}–{lastShown} of {filtered.length} submissions
              {selectedIds.length > 0 && ` · ${selectedIds.length} selected`}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                aria-label="Previous page"
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-cream-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - safePage) < 3 || p === 1 || p === totalPages)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && p - arr[idx - 1] > 1 && (
                      <span className="px-1 text-2xs text-muted-light">…</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(p)}
                      aria-current={p === safePage ? 'page' : undefined}
                      className={`h-7 w-7 rounded-lg text-xs font-semibold transition-colors ${
                        p === safePage
                          ? 'bg-brand-600 text-white'
                          : 'border border-line text-muted hover:bg-cream-50'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages}
                aria-label="Next page"
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-cream-50 disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Campaign distribution — real counts */}
        <ChartContainer
          title="Submissions by campaign"
          subtitle={
            campaignBars.length > 0
              ? `${submissions.length} submissions across ${campaignBars.length} campaign${campaignBars.length === 1 ? '' : 's'}`
              : 'No campaigns recorded'
          }
        >
          {campaignBars.length > 0 ? (
            <BarSeries data={campaignBars} height={130} tone="brand" formatValue={(v) => `${v}`} />
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-cream-50 px-4 py-8 text-center text-2xs text-muted">
              Campaign distribution appears once submissions exist.
            </p>
          )}
        </ChartContainer>
      </div>

      {/* Detail drawer */}
      <AnimatedDrawer
        open={Boolean(drawerSub)}
        onClose={() => setDrawerSub(null)}
        title={drawerSub?.title ?? 'Submission'}
        subtitle={drawerSub ? `${drawerSub.campaign} · ${drawerSub.creator.name}` : undefined}
        width={440}
        footer={
          drawerSub ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleReport(drawerSub)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
              >
                <Download className="h-3.5 w-3.5" />
                Report
              </button>
              <button
                onClick={() => {
                  setSelectedSubmission(drawerSub);
                  setActivePage('review-queue');
                }}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Open in queue
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null
        }
      >
        {drawerSub && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-line">
              <img src={drawerSub.thumbnail} alt="" className="h-44 w-full object-cover" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={drawerSub.status} />
              <span className="badge-draft">{drawerSub.version ?? 'v1.0'}</span>
              <span className="text-2xs text-muted">{typeOf(drawerSub) || 'content'}</span>
            </div>

            <div className="rounded-xl border border-line bg-cream-50 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-medium text-muted">Compliance score</span>
                <span className="text-sm font-semibold tabular-nums text-ink">{drawerSub.complianceScore}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-soft">
                <div
                  className={`h-full rounded-full ${
                    scoreTone(drawerSub.complianceScore) === 'sage'
                      ? 'bg-sage-500'
                      : scoreTone(drawerSub.complianceScore) === 'amber'
                        ? 'bg-warn-400'
                        : 'bg-danger-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, drawerSub.complianceScore))}%` }}
                />
              </div>
            </div>

            <dl className="divide-y divide-line-soft text-xs">
              {[
                ['Campaign', drawerSub.campaign],
                ['Creator', drawerSub.creator.name],
                ['Submitted', drawerSub.submittedAt ?? drawerSub.submittedDate ?? '—'],
                ['Findings', String(drawerSub.findingsCount ?? drawerSub.findings?.length ?? 0)],
                ['Priority', drawerSub.priority ?? 'Medium'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 py-2">
                  <dt className="shrink-0 text-muted">{label}</dt>
                  <dd className="max-w-[60%] text-right font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div>
              <SectionHeader title="Version history" subtitle="Stored records for this submission" />
              <ol className="mt-3 space-y-3">
                <li className="relative border-l border-line pl-4">
                  <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500" />
                  <p className="text-xs font-semibold text-ink">
                    {drawerSub.version ?? 'v1.0'} · current
                  </p>
                  <p className="mt-0.5 text-2xs text-muted">
                    {drawerSub.submittedAt ?? drawerSub.submittedDate ?? 'Submission date not recorded'}
                  </p>
                  <p className="mt-0.5 text-2xs text-muted">
                    {drawerSub.status} · {drawerSub.complianceScore}% compliance
                  </p>
                </li>
                {relatedEvents.map((e) => (
                  <li key={e.id} className="relative border-l border-line pl-4">
                    <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-olive-400" />
                    <p className="text-xs font-medium text-ink">{e.action}</p>
                    <p className="mt-0.5 text-2xs text-muted">
                      {e.details} · {e.dateTime}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-2xs leading-relaxed text-muted-light">
                The API exposes the latest stored version plus audit entries that reference this
                submission. Earlier file revisions are not returned.
              </p>
            </div>

            {drawerSub.comments && drawerSub.comments.length > 0 && (
              <div>
                <SectionHeader title="Comments" subtitle={`${drawerSub.comments.length} recorded`} />
                <div className="mt-2 space-y-2.5">
                  {drawerSub.comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <img src={c.avatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="text-2xs font-semibold text-ink">
                          {c.author} <span className="font-normal text-muted-light">{c.time}</span>
                        </p>
                        <p className="mt-0.5 text-2xs leading-relaxed text-ink-600">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </AnimatedDrawer>
    </PageTransition>
  );
};
