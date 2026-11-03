/**
 * All Submissions — enterprise table.
 *
 * Counts, thumbnails, scores and the drawer's history all come from
 * `useApp()`. Sorting, filtering and search operate on that real list; nothing
 * here is a sample row.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, AlertTriangle, ArrowRight, Calendar, CheckCircle2, ChevronDown, Clock, Download,
  FileText, Gauge, History, Image as ImageIcon, Lock, Search, Share2, Tag, Timer, User, Video, X,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import { cn, parseStoredDateTime } from '@/lib/utils';
import type { Submission, SubmissionStatus } from '../../../types';
import {
  AnimatedCard, AnimatedCounter, AnimatedDrawer, AnimatedModal, ChartContainer, FilterPills,
  PageTransition, SectionHeader, Stagger, StaggerItem, type Tone,
} from '../../motion';
import {
  ActionFooter, DetailHeader, FooterButton, InfoCard, MetadataRow, MetaChip, MetricChip, StatusBadge,
  type DetailTone,
} from '../../detail';
import { DataTable, type DataTableColumn } from '../../ui/DataTable';
import { StatusDonut, VolumeBars, type Slice } from '../../ui/charts';

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

/** Same thresholds as the score buckets, expressed as detail tones. */
const scoreToneDetail = (score: number): DetailTone =>
  score >= 80 ? 'sage' : score >= 60 ? 'olive' : score >= 40 ? 'amber' : 'danger';

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

/* ------------------------------------------------------------------ */
/* Insight metadata                                                    */
/* ------------------------------------------------------------------ */

/** Status → donut slice tone. Kept separate from `SUB_TONE` because the
    chart palette only accepts the six hues Recharts is allowed to use. */
const SUB_CHART_TONE: Record<string, Slice['tone']> = {
  Approved: 'sage',
  'In Review': 'olive',
  Pending: 'amber',
  'Needs Changes': 'terracotta',
  Rejected: 'danger',
};

type ScoreBucketId = 'p80' | 'p60' | 'p40' | 'p20' | 'p0';

/** `complianceScore` is derived from open findings (100 − weighted severity),
    so a five-bucket spread shows the real shape of the register rather than a
    pass/fail split. Buckets are declared high → low for the ladder read. */
const SCORE_BUCKETS: {
  id: ScoreBucketId;
  label: string;
  hint: string;
  hex: string;
  dot: string;
}[] = [
  { id: 'p80', label: '80–100', hint: 'Strong — nothing open', hex: '#7A9064', dot: 'bg-sage-500' },
  { id: 'p60', label: '60–79', hint: 'Minor fixes only', hex: '#6B7350', dot: 'bg-olive-500' },
  { id: 'p40', label: '40–59', hint: 'Several open findings', hex: '#DDA22B', dot: 'bg-warn-400' },
  { id: 'p20', label: '20–39', hint: 'Multiple high-severity findings', hex: '#C2664A', dot: 'bg-terracotta-500' },
  { id: 'p0', label: '0–19', hint: 'Blocked by high-severity findings', hex: '#C25446', dot: 'bg-danger-500' },
];

const bucketOf = (score: number): ScoreBucketId =>
  score >= 80 ? 'p80' : score >= 60 ? 'p60' : score >= 40 ? 'p40' : score >= 20 ? 'p20' : 'p0';

const TYPE_META: { id: 'image' | 'video' | 'text' | 'social'; label: string; icon: React.ReactNode; hex: string }[] = [
  { id: 'image', label: 'Image', icon: <ImageIcon className="h-3 w-3" />, hex: '#4E7A3D' },
  { id: 'video', label: 'Video', icon: <Video className="h-3 w-3" />, hex: '#74975F' },
  { id: 'text', label: 'Text', icon: <FileText className="h-3 w-3" />, hex: '#7A9064' },
  { id: 'social', label: 'Social', icon: <Share2 className="h-3 w-3" />, hex: '#C2664A' },
];

/* 40px gives the number room inside a 28px inner diameter, and the track uses
   `line` (#E7E1D3) rather than `line-soft` so the ring reads at a glance. */
const ScoreRing: React.FC<{ score: number; onClick?: () => void }> = ({ score, onClick }) => {
  const size = 40;
  const r = 16;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = clamped >= 90 ? '#7A9064' : clamped >= 70 ? '#DDA22B' : '#C25446';
  return (
    <div
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        onClick && 'cursor-pointer transition-colors hover:bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
      )}
      title={onClick ? `Compliance score ${clamped}% — click for the breakdown` : `Compliance score ${clamped}%`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Compliance score ${clamped} percent, open breakdown` : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
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

/** `submittedAt` arrives pre-formatted as "Nov 1, 2026 · 6:52 AM"; the shared
    parser strips the separator that used to make every row sort as 1970. */
const timestampOf = (s: Submission): number => {
  const t = parseStoredDateTime(s.submittedAt ?? s.submittedDate);
  return Number.isNaN(t) ? 0 : t;
};

const typeOf = (s: Submission): string => (s.type ?? s.assetType ?? '').toString().toLowerCase();

type StatusFilter = 'All' | 'Approved' | 'Pending' | 'Needs Changes' | 'Rejected';
type TypeFilter = 'All' | 'image' | 'video' | 'text' | 'social';
type ScoreFilter = 'all' | ScoreBucketId;

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
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [query, setQuery] = useState(searchQuery);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerSub, setDrawerSub] = useState<Submission | null>(null);
  const [drawerImage, setDrawerImage] = useState<string | null>(null);

  /* The card thumbnail is a generated placeholder; the submitted file is only
     available through the token-protected asset endpoint. */
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setDrawerImage(null);
    if (!drawerSub?.assetId) return;
    api.fetchAssetBlobUrl(drawerSub.assetId).then((next) => {
      url = next;
      if (!cancelled) setDrawerImage(next);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [drawerSub?.assetId]);
  const [scoreSub, setScoreSub] = useState<Submission | null>(null);

  /* The insight cards sit below the table, so applying a filter from them also
     brings the table back into view — otherwise the click looks like a no-op. */
  const tableRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const focusTable = () => {
    tableRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

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
      if (scoreFilter !== 'all' && bucketOf(sub.complianceScore) !== scoreFilter) return false;
      return true;
    });
  }, [submissions, statusFilter, typeFilter, scoreFilter]);

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
          <div className="min-w-0">
            <span className="line-clamp-2 text-xs font-medium text-brand-700">{sub.campaign}</span>
            {sub.channel && (
              <span className="mt-0.5 block truncate text-2xs text-muted-light">{sub.channel}</span>
            )}
          </div>
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
        cell: (sub) => <ScoreRing score={sub.complianceScore} onClick={() => setScoreSub(sub)} />,
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

  /* ---- Register insights. Every figure below is counted from `submissions`,
     so an empty workspace renders empty states rather than invented numbers. ---- */

  const statusSlices = useMemo<Slice[]>(() => {
    const counts = new Map<string, number>();
    for (const s of submissions) counts.set(s.status, (counts.get(s.status) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value, tone: SUB_CHART_TONE[name] ?? 'olive' }));
  }, [submissions]);

  const scoreBuckets = useMemo(
    () =>
      SCORE_BUCKETS.map((bucket) => {
        const rows = submissions.filter((s) => bucketOf(s.complianceScore) === bucket.id);
        return {
          ...bucket,
          count: rows.length,
          pct: submissions.length > 0 ? Math.round((rows.length / submissions.length) * 100) : 0,
        };
      }),
    [submissions],
  );

  const averageScore = useMemo(
    () =>
      submissions.length > 0
        ? Math.round(submissions.reduce((sum, s) => sum + s.complianceScore, 0) / submissions.length)
        : 0,
    [submissions],
  );

  /** Oldest item still without a recorded decision. Rows whose date could not
      be parsed sort last rather than pretending to be from 1970. */
  const oldestWaiting = useMemo(() => {
    const waiting = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending');
    return [...waiting].sort((a, b) => {
      const ta = timestampOf(a);
      const tb = timestampOf(b);
      if (ta === 0 && tb === 0) return 0;
      if (ta === 0) return 1;
      if (tb === 0) return -1;
      return ta - tb;
    })[0] ?? null;
  }, [submissions]);

  /** Lowest-scoring item that is not already cleared. */
  const weakest = useMemo(
    () =>
      [...submissions]
        .filter((s) => s.status !== 'Approved')
        .sort((a, b) => a.complianceScore - b.complianceScore)[0] ?? null,
    [submissions],
  );

  const daysWaiting = (sub: Submission): string => {
    const t = timestampOf(sub);
    if (!t) return 'no date stored';
    const days = Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
    return days === 0 ? 'submitted today' : `${days} day${days === 1 ? '' : 's'} waiting`;
  };

  const typeMix = useMemo(
    () =>
      TYPE_META.map((meta) => ({
        ...meta,
        count: submissions.filter((s) => typeOf(s) === meta.id).length,
      })).filter((row) => row.count > 0),
    [submissions],
  );

  const untypedCount = useMemo(
    () => submissions.filter((s) => !TYPE_META.some((meta) => meta.id === typeOf(s))).length,
    [submissions],
  );

  const topCreators = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string; total: number; approved: number }>();
    for (const s of submissions) {
      const current = map.get(s.creator.name) ?? {
        name: s.creator.name,
        avatar: s.creator.avatar,
        total: 0,
        approved: 0,
      };
      current.total += 1;
      if (s.status === 'Approved') current.approved += 1;
      map.set(s.creator.name, current);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [submissions]);

  const creatorMax = topCreators[0]?.total ?? 1;
  const creatorCount = useMemo(
    () => new Set(submissions.map((s) => s.creator.name)).size,
    [submissions],
  );

  /** Status pills collapse In Review and Pending into one bucket, so the donut
      legend maps onto the same buckets the pills use. */
  const statusFilterFor = (status: string): StatusFilter =>
    status === 'In Review' || status === 'Pending' ? 'Pending' : (status as StatusFilter);

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

            {scoreFilter !== 'all' && (
              <button
                onClick={() => setScoreFilter('all')}
                aria-label="Clear the score band filter"
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-2xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
              >
                Score {SCORE_BUCKETS.find((b) => b.id === scoreFilter)?.label}
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div ref={tableRef} className="scroll-mt-4">
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
            <VolumeBars data={campaignBars} height={150} tone="brand" unit=" subs" ariaLabel="Submissions by campaign" />
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-cream-50 px-4 py-8 text-center text-2xs text-muted">
              Campaign distribution appears once submissions exist.
            </p>
          )}
        </ChartContainer>

        {/* Register insights — every figure is counted from `submissions` */}
        <div className="pt-2">
          <SectionHeader
            eyebrow="Register insights"
            title="What the queue is made of"
            subtitle="Status mix, score spread and the two items that need a decision first. Selecting a row filters the register above."
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Status mix */}
          <ChartContainer
            title="Status mix"
            subtitle={`${submissions.length} submission${submissions.length === 1 ? '' : 's'} in this workspace`}
          >
            {statusSlices.length > 0 ? (
              <>
                <StatusDonut
                  data={statusSlices}
                  height={168}
                  centerLabel={<AnimatedCounter value={submissions.length} />}
                  centerSublabel="total"
                  ariaLabel="Submissions by status"
                />
                <ul className="mt-2 space-y-0.5">
                  {statusSlices.map((slice) => {
                    const pct = Math.round((slice.value / Math.max(1, submissions.length)) * 100);
                    return (
                      <li key={slice.name}>
                        <button
                          onClick={() => {
                            setStatusFilter(statusFilterFor(slice.name));
                            focusTable();
                          }}
                          aria-label={`Filter the register to ${slice.name}`}
                          className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-cream-50"
                        >
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[slice.name] ?? 'bg-muted-light')} />
                          <span className="min-w-0 flex-1 truncate text-xs text-ink-700">{slice.name}</span>
                          <span className="shrink-0 text-xs font-semibold tabular-nums text-ink">{slice.value}</span>
                          <span className="w-8 shrink-0 text-right text-2xs tabular-nums text-muted-light">{pct}%</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-line bg-cream-50 px-4 py-10 text-center text-2xs text-muted">
                The status mix appears once the register has rows.
              </p>
            )}
          </ChartContainer>

          {/* Compliance score distribution */}
          <ChartContainer
            title="Score distribution"
            subtitle={`Average ${averageScore}% · derived from open findings`}
            actions={
              scoreFilter !== 'all' ? (
                <button
                  onClick={() => setScoreFilter('all')}
                  className="rounded-lg px-2 py-1 text-2xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  Clear
                </button>
              ) : undefined
            }
          >
            <ul className="space-y-1.5">
              {scoreBuckets.map((bucket) => {
                const active = scoreFilter === bucket.id;
                return (
                  <li key={bucket.id}>
                    <button
                      onClick={() => {
                        setScoreFilter(active ? 'all' : bucket.id);
                        if (!active) focusTable();
                      }}
                      aria-pressed={active}
                      title={bucket.hint}
                      className={cn(
                        'w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors',
                        active
                          ? 'border-brand-400 bg-brand-50/70 ring-1 ring-brand-300/50'
                          : 'border-transparent hover:border-line hover:bg-cream-50',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-ink">
                          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', bucket.dot)} />
                          {bucket.label}
                        </span>
                        <span className="shrink-0 text-2xs tabular-nums text-muted">
                          <span className="font-semibold text-ink">{bucket.count}</span> · {bucket.pct}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line-soft">
                        <div
                          className="h-full rounded-full transition-[width] duration-500 ease-premium"
                          style={{ width: `${bucket.pct}%`, backgroundColor: bucket.hex }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            {submissions.length === 0 && (
              <p className="mt-2 rounded-lg border border-dashed border-line bg-cream-50 px-3 py-4 text-center text-2xs text-muted">
                No scores recorded yet.
              </p>
            )}
          </ChartContainer>

          {/* Needs a decision first */}
          <ChartContainer
            title="Needs a decision first"
            subtitle="Sorted by time waiting and stored score"
          >
            <div className="space-y-2">
              {oldestWaiting ? (
                <button
                  onClick={() => openDrawer(oldestWaiting)}
                  aria-label={`Open ${oldestWaiting.title}`}
                  className="w-full rounded-xl border border-warn-200 bg-warn-50/70 p-3 text-left transition-colors hover:bg-warn-50"
                >
                  <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-warn-700">
                    <Timer className="h-3 w-3" />
                    Longest wait
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-ink">{oldestWaiting.title}</p>
                  <p className="mt-0.5 truncate text-2xs text-muted">
                    {oldestWaiting.status} · {daysWaiting(oldestWaiting)}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-2xs font-semibold text-brand-700">
                    Open record <ArrowRight className="h-3 w-3" />
                  </p>
                </button>
              ) : (
                <div className="rounded-xl border border-sage-200 bg-sage-50/70 p-3">
                  <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-sage-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Queue clear
                  </p>
                  <p className="mt-1 text-2xs leading-relaxed text-muted">
                    Nothing is sitting unreviewed, so there is no wait time to report.
                  </p>
                </div>
              )}

              {weakest ? (
                <button
                  onClick={() => openDrawer(weakest)}
                  aria-label={`Open ${weakest.title}`}
                  className="w-full rounded-xl border border-danger-200 bg-danger-50/60 p-3 text-left transition-colors hover:bg-danger-50"
                >
                  <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-danger-700">
                    <AlertCircle className="h-3 w-3" />
                    Lowest score not cleared
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-ink">{weakest.title}</p>
                  <p className="mt-0.5 truncate text-2xs text-muted">
                    {weakest.complianceScore}% · {weakest.status} · {weakest.campaign}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-2xs font-semibold text-brand-700">
                    Open record <ArrowRight className="h-3 w-3" />
                  </p>
                </button>
              ) : (
                <div className="rounded-xl border border-sage-200 bg-sage-50/70 p-3">
                  <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-sage-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Everything cleared
                  </p>
                  <p className="mt-1 text-2xs leading-relaxed text-muted">
                    No unscored or rejected item is waiting on a fix.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-2.5">
              <p className="text-2xs text-muted">
                <span className="font-semibold text-ink">{pendingCount}</span> awaiting a decision ·{' '}
                <span className="font-semibold text-ink">{rejectedCount}</span> rejected
              </p>
              <button
                onClick={() => {
                  setStatusFilter('Pending');
                  focusTable();
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
              >
                Filter to waiting
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </ChartContainer>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Content type mix */}
          <ChartContainer
            title="Content type mix"
            subtitle="Selecting a type applies it to the register"
          >
            {typeMix.length > 0 ? (
              <>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-line-soft">
                  {typeMix.map((row) => (
                    <div
                      key={row.id}
                      className="h-full transition-[width] duration-500 ease-premium"
                      style={{
                        width: `${(row.count / Math.max(1, submissions.length)) * 100}%`,
                        backgroundColor: row.hex,
                      }}
                      title={`${row.label}: ${row.count}`}
                    />
                  ))}
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-1.5">
                  {typeMix.map((row) => {
                    const active = typeFilter === row.id;
                    return (
                      <li key={row.id}>
                        <button
                          onClick={() => {
                            setTypeFilter(active ? 'All' : row.id);
                            if (!active) focusTable();
                          }}
                          aria-pressed={active}
                          className={cn(
                            'flex w-full items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs transition-colors',
                            active
                              ? 'border-brand-400 bg-brand-50/70 text-ink'
                              : 'border-line bg-white text-ink-700 hover:bg-cream-50',
                          )}
                        >
                          <span className="shrink-0 text-muted">{row.icon}</span>
                          <span className="min-w-0 flex-1 truncate text-left">{row.label}</span>
                          <span className="shrink-0 font-semibold tabular-nums text-ink">{row.count}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {untypedCount > 0 && (
                  <p className="mt-2 text-2xs text-muted-light">
                    {untypedCount} submission{untypedCount === 1 ? '' : 's'} stored without a content type.
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-line bg-cream-50 px-4 py-10 text-center text-2xs text-muted">
                Content types appear once submissions are recorded.
              </p>
            )}
          </ChartContainer>

          {/* Most active creators */}
          <ChartContainer
            title="Most active creators"
            subtitle="Selecting a creator searches the register"
          >
            {topCreators.length > 0 ? (
              <ul className="space-y-1">
                {topCreators.map((creator) => (
                  <li key={creator.name}>
                    <button
                      onClick={() => {
                        setQuery(creator.name);
                        focusTable();
                      }}
                      aria-label={`Search the register for ${creator.name}`}
                      className="flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-cream-50"
                    >
                      <img src={creator.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-ink">{creator.name}</span>
                          <span className="shrink-0 text-2xs tabular-nums text-muted-light">
                            {creator.approved}/{creator.total} approved
                          </span>
                        </span>
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-line-soft">
                          <span
                            className="block h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-premium"
                            style={{ width: `${(creator.total / creatorMax) * 100}%` }}
                          />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-line bg-cream-50 px-4 py-10 text-center text-2xs text-muted">
                Creator activity appears once submissions exist.
              </p>
            )}

            <p className="mt-3 border-t border-line-soft pt-2.5 text-2xs text-muted">
              <span className="font-semibold text-ink">{creatorCount}</span>{' '}
              creator{creatorCount === 1 ? '' : 's'} across{' '}
              <span className="font-semibold text-ink">{submissions.length}</span> submission
              {submissions.length === 1 ? '' : 's'}
            </p>
          </ChartContainer>
        </div>
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
              title={
                (drawerSub.findingsCount ?? drawerSub.findings?.length ?? 0) > 0
                  ? 'AI review complete'
                  : (SUB_MEANING[drawerSub.status] ?? SUB_MEANING.Pending).title
              }
            >
              {(drawerSub.findingsCount ?? drawerSub.findings?.length ?? 0) > 0
                ? `${drawerSub.findingsCount ?? drawerSub.findings?.length} finding(s) are stored against ${drawerSub.version} and a manager decision is still required.`
                : (SUB_MEANING[drawerSub.status] ?? SUB_MEANING.Pending).body}
            </InfoCard>

            {/* The asset itself */}
            <div>
              <SectionHeader
                title="Submitted asset"
                subtitle="The file this record was scored against."
              />
              <div className="mt-2 overflow-hidden rounded-xl border border-line bg-cream-50">
                {drawerImage ? (
                  <img
                    src={drawerImage}
                    alt={`Submitted file for ${drawerSub.title}`}
                    className="h-44 w-full object-contain bg-white"
                  />
                ) : drawerSub.assetId ? (
                  <p className="px-4 py-8 text-center text-2xs text-muted">
                    Loading the stored file…
                  </p>
                ) : drawerSub.thumbnail ? (
                  <img
                    src={drawerSub.thumbnail}
                    alt={`Placeholder image for ${drawerSub.title}`}
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

      {/* Score breakdown — the stored number explained (spec M03) */}
      <AnimatedModal
        open={Boolean(scoreSub)}
        onClose={() => setScoreSub(null)}
        title={scoreSub ? `Score breakdown — ${scoreSub.title}` : 'Score breakdown'}
        maxWidth={560}
        header={
          scoreSub ? (
            <DetailHeader
              tone={scoreToneDetail(scoreSub.complianceScore)}
              icon={<Gauge className="h-5 w-5" />}
              eyebrow={`${scoreSub.campaign} · ${scoreSub.version ?? 'v1.0'}`}
              title={`${scoreSub.complianceScore}% compliance`}
              description="Computed on the server from the stored findings and saved with this submission. The register only displays the saved value."
              onClose={() => setScoreSub(null)}
              badges={
                <>
                  <StatusBadge tone={SUB_TONE[scoreSub.status] ?? 'neutral'} label={scoreSub.status} />
                  <MetaChip>{scoreSub.scoreBreakdown?.formulaVersion ?? 'formula not recorded'}</MetaChip>
                </>
              }
            />
          ) : undefined
        }
      >
        {scoreSub?.scoreBreakdown ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricChip label="High" value={scoreSub.scoreBreakdown.high} tone="danger" />
              <MetricChip label="Medium" value={scoreSub.scoreBreakdown.medium} tone="terracotta" />
              <MetricChip label="Low" value={scoreSub.scoreBreakdown.low} tone="amber" />
              <MetricChip label="Unknown" value={scoreSub.scoreBreakdown.unknown} tone="neutral" />
            </div>

            <InfoCard
              tone="neutral"
              icon={<Gauge className="h-4 w-4" />}
              title="How the number was reached"
            >
              <p className="text-xs leading-relaxed text-muted">
                {scoreSub.scoreBreakdown.counted === 0
                  ? 'No findings are stored against this submission, so nothing counted against it. That is not the same as a rule having run and passed.'
                  : `${scoreSub.scoreBreakdown.counted} finding${scoreSub.scoreBreakdown.counted === 1 ? '' : 's'} counted against ${scoreSub.scoreBreakdown.applicable} applicable rule${scoreSub.scoreBreakdown.applicable === 1 ? '' : 's'}, for a penalty of ${scoreSub.scoreBreakdown.penalty} points.`}
              </p>
            </InfoCard>

            <div className="space-y-1.5">
              <MetadataRow label="Applicable rules" value={String(scoreSub.scoreBreakdown.applicable)} />
              <MetadataRow label="Findings counted" value={String(scoreSub.scoreBreakdown.counted)} />
              <MetadataRow label="Penalty" value={String(scoreSub.scoreBreakdown.penalty)} />
              <MetadataRow label="Formula" value={scoreSub.scoreBreakdown.formulaVersion} />
              <MetadataRow
                label="Computed"
                value={scoreSub.scoreBreakdown.computedAt?.replace('T', ' ').slice(0, 19) ?? 'not recorded'}
              />
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line bg-cream-50 px-4 py-6 text-center text-2xs text-muted">
            This submission has no stored score breakdown yet.
          </p>
        )}
      </AnimatedModal>
    </PageTransition>
  );
};
