/**
 * All Submissions — enterprise table.
 *
 * Counts, thumbnails, scores and the drawer's history all come from
 * `useApp()`. Sorting, filtering and search operate on that real list; nothing
 * here is a sample row.
 */
import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Calendar, CheckCircle2, ChevronDown, Clock, Download, FileText,
  History, Lock, Search, Tag, User, X,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { Submission, SubmissionStatus } from '../../../types';
import {
  AnimatedCard, AnimatedCounter, AnimatedDrawer, ChartContainer, FilterPills,
  PageTransition, SectionHeader, Stagger, StaggerItem, type Tone,
} from '../../motion';
import {
  ActionFooter, DetailHeader, FooterButton, InfoCard, MetadataRow, MetaChip, StatusBadge,
  type DetailTone,
} from '../../detail';
import { DataTable, type DataTableColumn } from '../../ui/DataTable';
import { VolumeBars } from '../../ui/charts';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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

const SubmissionStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`${STATUS_CLASS[status] ?? 'badge-draft'} shrink-0`}>
    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-muted-light'}`} />
    {status}
  </span>
);

const scoreTone = (score: number): Tone => (score >= 90 ? 'sage' : score >= 70 ? 'amber' : 'danger');

const SUB_TONE: Record<string, DetailTone> = {
  Approved: 'sage',
  'In Review': 'brand',
  Pending: 'amber',
  'Needs Changes': 'terracotta',
  Rejected: 'danger',
};

/** What the stored status actually means for the asset. */
const SUB_MEANING: Record<string, { title: string; body: string }> = {
  Approved: {
    title: 'Cleared for publishing',
    body: 'This version passed review. Publishing it does not require another approval, but any edit creates a new version that re-enters the queue.',
  },
  'In Review': {
    title: 'Sitting with a reviewer',
    body: 'AI review is complete and a manager has to record a decision. The asset cannot be published from this state.',
  },
  Pending: {
    title: 'Queued, not reviewed',
    body: 'The submission exists in the register but no AI review has been attached, so there is no compliance score to rely on.',
  },
  'Needs Changes': {
    title: 'Returned for changes',
    body: 'A reviewer asked for fixes. The creator resubmits and the new version is scored from scratch.',
  },
  Rejected: {
    title: 'Rejected — do not publish',
    body: 'A reviewer closed this version. The rejection note in the audit history is the reason of record.',
  },
};

/* 40px gives the number room inside a 28px inner diameter, and the track uses
   `line` (#E7E1D3) rather than `line-soft` so the ring reads at a glance. */
const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const size = 40;
  const r = 16;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = clamped >= 90 ? '#7A9064' : clamped >= 70 ? '#DDA22B' : '#C25446';
  return (
    <div
      className="relative flex h-10 w-10 shrink-0 items-center justify-center"
      title={`Compliance score ${clamped}%`}
    >
      <svg
        className="absolute -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E7E1D3" strokeWidth="3.5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="3.5"
          strokeDasharray={`${(clamped / 100) * circ} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="relative z-10 text-[10px] font-semibold leading-none tabular-nums text-ink">
        {clamped}
        <span className="text-[8px] font-medium text-muted">%</span>
      </span>
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerSub, setDrawerSub] = useState<Submission | null>(null);

  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;
  const pendingCount = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending').length;
  const needsChangesCount = submissions.filter((s) => s.status === 'Needs Changes').length;
  const rejectedCount = submissions.filter((s) => s.status === 'Rejected').length;

  /* Status and type are categorical, so they pre-filter the rows we hand to
     TanStack; free-text search and column sorting stay inside the table. */
  const filtered = useMemo(() => {
    return submissions.filter((sub) => {
      if (statusFilter === 'Approved' && sub.status !== 'Approved') return false;
      if (statusFilter === 'Pending' && sub.status !== 'In Review' && sub.status !== 'Pending') return false;
      if (statusFilter === 'Needs Changes' && sub.status !== 'Needs Changes') return false;
      if (statusFilter === 'Rejected' && sub.status !== 'Rejected') return false;
      if (typeFilter !== 'All' && typeOf(sub) !== typeFilter) return false;
      return true;
    });
  }, [submissions, statusFilter, typeFilter]);

  const columns = useMemo<DataTableColumn<Submission>[]>(
    () => [
      {
        id: 'title',
        header: 'Submission',
        accessor: (sub) => sub.title,
        cell: (sub) => (
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
        ),
      },
      {
        id: 'campaign',
        header: 'Campaign',
        accessor: (sub) => sub.campaign,
        cell: (sub) => (
          <span className="line-clamp-2 text-xs font-medium text-brand-700">{sub.campaign}</span>
        ),
      },
      {
        id: 'creator',
        header: 'Creator',
        accessor: (sub) => sub.creator.name,
        cell: (sub) => (
          <div className="flex items-center gap-2">
            <img src={sub.creator.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
            <span className="truncate text-xs text-ink-700">{sub.creator.name}</span>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessor: (sub) => sub.status,
        cell: (sub) => <SubmissionStatusBadge status={sub.status} />,
      },
      {
        id: 'score',
        header: 'Score',
        accessor: (sub) => sub.complianceScore,
        align: 'right',
        width: '90px',
        cell: (sub) => <ScoreRing score={sub.complianceScore} />,
      },
      {
        id: 'submitted',
        header: 'Submitted',
        accessor: (sub) => timestampOf(sub),
        cell: (sub) => (
          <span className="whitespace-nowrap text-xs text-muted">
            {sub.submittedDate ?? sub.submittedAt ?? '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        sortable: false,
        canHide: false,
        align: 'right',
        width: '64px',
        cell: (sub) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSubmission(sub);
              setActivePage('review-queue');
            }}
            aria-label={`Review ${sub.title}`}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-brand-50 hover:text-brand-700"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [setActivePage, setSelectedSubmission],
  );

  const campaignBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of submissions) map.set(s.campaign, (map.get(s.campaign) ?? 0) + 1);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }));
  }, [submissions]);

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
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-light" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
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
          </div>
        </div>

        {/* Table */}
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(sub) => sub.id}
          globalFilter={query}
          onGlobalFilterChange={setQuery}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={openDrawer}
          initialSort={[{ id: 'submitted', desc: true }]}
          pageSize={10}
          minWidth="880px"
          emptyTitle="No submissions match these filters"
          emptyDescription={
            submissions.length === 0
              ? 'Nothing has been submitted to this workspace yet.'
              : 'Try clearing the search or choosing a different status.'
          }
          emptyIcon={<FileText className="h-6 w-6 text-muted-light" />}
          footnote="Sort any column by clicking its header. Status and score are the stored values returned by the API."
        />


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
            <VolumeBars data={campaignBars} height={150} tone="brand" unit=" subs" ariaLabel="Submissions by campaign" />
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
        width={480}
        header={
          drawerSub ? (
            <DetailHeader
              tone={SUB_TONE[drawerSub.status] ?? 'neutral'}
              icon={<FileText className="h-5 w-5" />}
              eyebrow={`${drawerSub.campaign} · ${drawerSub.version ?? 'v1.0'}`}
              title={drawerSub.title}
              description={
                drawerSub.description ??
                `${typeOf(drawerSub) || 'Content'} submitted by ${drawerSub.creator.name}.`
              }
              onClose={() => setDrawerSub(null)}
              badges={
                <>
                  <StatusBadge
                    tone={SUB_TONE[drawerSub.status] ?? 'neutral'}
                    label={drawerSub.status}
                  />
                  <MetaChip>{drawerSub.complianceScore}% compliance</MetaChip>
                  <MetaChip>{drawerSub.priority ?? 'Medium'} priority</MetaChip>
                </>
              }
              meta={
                <>
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {drawerSub.creator.name}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {drawerSub.submittedAt ?? drawerSub.submittedDate ?? 'Not recorded'}
                  </span>
                </>
              }
            />
          ) : undefined
        }
        footer={
          drawerSub ? (
            <ActionFooter note="The register is read-only. Decisions are recorded from the review queue.">
              <div className="flex gap-2">
                <div className="flex-1">
                  <FooterButton
                    icon={<Download className="h-3.5 w-3.5" />}
                    onClick={() => handleReport(drawerSub)}
                  >
                    Report
                  </FooterButton>
                </div>
                <div className="flex-1">
                  <FooterButton
                    variant="primary"
                    icon={<ArrowRight className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setSelectedSubmission(drawerSub);
                      setActivePage('review-queue');
                    }}
                  >
                    Open in queue
                  </FooterButton>
                </div>
              </div>
              <FooterButton onClick={() => setDrawerSub(null)}>Close</FooterButton>
            </ActionFooter>
          ) : null
        }
      >
        {drawerSub && (
          <div className="space-y-5">
            {/* What this record is */}
            <InfoCard
              tone={SUB_TONE[drawerSub.status] ?? 'neutral'}
              icon={<FileText className="h-3.5 w-3.5" />}
              eyebrow="At a glance"
              title={(SUB_MEANING[drawerSub.status] ?? SUB_MEANING.Pending).title}
            >
              {(SUB_MEANING[drawerSub.status] ?? SUB_MEANING.Pending).body}
            </InfoCard>

            {/* The asset itself */}
            <div>
              <SectionHeader
                title="Submitted asset"
                subtitle="The file this record was scored against."
              />
              <div className="mt-2 overflow-hidden rounded-xl border border-line bg-cream-50">
                {drawerSub.thumbnail ? (
                  <img
                    src={drawerSub.thumbnail}
                    alt={`Preview of ${drawerSub.title}`}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <p className="px-4 py-8 text-center text-2xs text-muted">
                    No preview image is stored for this submission.
                  </p>
                )}
              </div>

              <div className="mt-2 rounded-xl border border-line bg-white px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-medium text-muted">Compliance score</span>
                  <span className="text-sm font-semibold tabular-nums text-ink">
                    {drawerSub.complianceScore}%
                  </span>
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
                <p className="mt-1.5 text-2xs text-muted">
                  {(drawerSub.findingsCount ?? drawerSub.findings?.length ?? 0) > 0
                    ? `${drawerSub.findingsCount ?? drawerSub.findings?.length} finding(s) recorded against this version.`
                    : 'No findings are stored against this version.'}
                </p>
              </div>
            </div>

            {/* Stored record */}
            <div>
              <SectionHeader
                title="Stored record"
                subtitle="Values returned by the submissions service"
              />
              <dl className="mt-2 rounded-xl border border-line bg-white px-3 py-1.5">
                <MetadataRow
                  label="Submission"
                  value={drawerSub.id}
                  icon={<Tag className="h-3 w-3" />}
                />
                <MetadataRow label="Campaign" value={drawerSub.campaign} />
                <MetadataRow label="Version" value={drawerSub.version ?? 'v1.0'} />
                <MetadataRow
                  label="Status"
                  value={drawerSub.status}
                  tone={SUB_TONE[drawerSub.status] ?? 'neutral'}
                />
                <MetadataRow label="Priority" value={drawerSub.priority ?? 'Medium'} />
                <MetadataRow label="Creator" value={drawerSub.creator.name} />
                <MetadataRow
                  label="Submitted"
                  value={drawerSub.submittedAt ?? drawerSub.submittedDate ?? 'Not recorded'}
                  icon={<Calendar className="h-3 w-3" />}
                />
              </dl>
            </div>

            {/* Version history + related audit entries */}
            <div>
              <SectionHeader
                title="Version history"
                subtitle="Stored records for this submission"
              />
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
              {relatedEvents.length === 0 && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-line bg-cream-50 px-3 py-2.5">
                  <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                  <p className="text-2xs leading-relaxed text-muted">
                    No audit entries reference this submission yet. The API exposes the latest
                    stored version plus audit entries that name it; earlier file revisions are not
                    returned.
                  </p>
                </div>
              )}
            </div>

            {drawerSub.comments && drawerSub.comments.length > 0 && (
              <div>
                <SectionHeader
                  title="Comments"
                  subtitle={`${drawerSub.comments.length} recorded`}
                />
                <div className="mt-2 space-y-2.5">
                  {drawerSub.comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <img
                        src={c.avatar}
                        alt=""
                        className="h-6 w-6 shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-2xs font-semibold text-ink">
                          {c.author}{' '}
                          <span className="font-normal text-muted-light">{c.time}</span>
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
