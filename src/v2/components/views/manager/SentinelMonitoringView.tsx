import React, { useMemo, useState } from 'react';
import {
  Radar, AlertTriangle, CheckCircle2, Lock, AlertCircle, FileText,
  CalendarClock, ShieldCheck, ScanLine, Clock, RotateCw, ArrowRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import type { SentinelAlert } from '../../../types';
import {
  AnimatedCounter, AnimatedDrawer, AnimatedProgress, BarSeries, ChartContainer, EmptyState,
  FilterPills, RingProgress, SectionHeader, SkeletonCard, Timeline, type TimelineItem,
} from '../../motion';
import { DataTable, type DataTableColumn } from '../../ui/DataTable';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type Source = SentinelAlert['category'];

const SOURCE_LABEL: Record<Source, string> = {
  'Policy Violation': 'Rule change',
  'Legal & Compliance': 'Exception lapse',
  'Claims Risk': 'Claim withdrawn',
  'Brand Consistency': 'Brand consistency',
};

const SOURCE_CLASS: Record<Source, string> = {
  'Policy Violation': 'badge-inreview',
  'Legal & Compliance': 'badge-pending',
  'Claims Risk': 'badge-rejected',
  'Brand Consistency': 'badge-archived',
};

function priorityOf(alert: SentinelAlert): { label: string; className: string } {
  return alert.severity === 'High'
    ? { label: 'Overdue', className: 'badge-rejected' }
    : { label: 'Normal', className: 'badge-approved' };
}

function latestDate(rows: SentinelAlert[]): string {
  let best = -Infinity;
  let text = '';
  for (const row of rows) {
    const t = Date.parse(row.detectedOn);
    if (!Number.isNaN(t) && t > best) { best = t; text = row.detectedOn; }
  }
  return text;
}

const Denied: React.FC = () => (
  <div className="mx-auto max-w-lg px-6 py-16 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta-50 text-terracotta-600">
      <Lock className="h-5 w-5" />
    </div>
    <h1 className="mt-4 text-lg font-semibold text-ink">Manager access required</h1>
    <p className="mt-1 text-xs leading-relaxed text-muted">
      Sentinel monitoring is a manager view. Creators see their own reassessment tasks in the
      creator workspace instead.
    </p>
  </div>
);

const Metric: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  chip: string;
  hint: string;
}> = ({ label, value, icon, chip, hint }) => (
  <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
    <div className="flex items-start justify-between gap-2">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${chip}`}>{icon}</span>
      <span className="text-2xs text-muted">{hint}</span>
    </div>
    <p className="mt-3 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
    <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">
      <AnimatedCounter value={value} />
    </p>
  </div>
);

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

type Filter = 'All' | 'Open' | 'Resolved' | 'Overdue';

export const SentinelMonitoringView: React.FC = () => {
  const {
    sentinelAlerts, selectedAlert, setSelectedAlert, resolveSentinelAlert,
    searchQuery, setSearchQuery, loading, error, role,
  } = useApp();

  const [filter, setFilter] = useState<Filter>('All');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const total = sentinelAlerts.length;
  const open = sentinelAlerts.filter((a) => a.status !== 'Resolved').length;
  const resolved = sentinelAlerts.filter((a) => a.status === 'Resolved').length;
  const overdue = sentinelAlerts.filter((a) => a.severity === 'High').length;

  const activeAlert = selectedAlert
    ? sentinelAlerts.find((a) => a.id === selectedAlert.id) ?? selectedAlert
    : sentinelAlerts[0];

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sentinelAlerts.filter((a) => {
      if (filter === 'Open' && a.status === 'Resolved') return false;
      if (filter === 'Resolved' && a.status !== 'Resolved') return false;
      if (filter === 'Overdue' && a.severity !== 'High') return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        (a.subtitle ?? '').toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    });
  }, [sentinelAlerts, filter, searchQuery]);

  const sourceCounts = useMemo(() => {
    const counts = new Map<Source, number>();
    for (const a of sentinelAlerts) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    return [...counts.entries()].map(([source, count]) => ({ source, count }));
  }, [sentinelAlerts]);

  const sourceBars = sourceCounts.map(({ source, count }) => ({
    label: SOURCE_LABEL[source],
    value: count,
  }));

  const timelineItems: TimelineItem[] = useMemo(
    () =>
      [...sentinelAlerts]
        .sort((a, b) => (Date.parse(b.detectedOn) || 0) - (Date.parse(a.detectedOn) || 0))
        .slice(0, 7)
        .map((a) => ({
          id: a.id,
          title: a.title,
          description: a.subtitle,
          time: a.detectedOn,
          tone: a.status === 'Resolved' ? 'sage' : a.severity === 'High' ? 'danger' : 'olive',
          icon: a.status === 'Resolved'
            ? <CheckCircle2 className="h-3 w-3" />
            : <AlertTriangle className="h-3 w-3" />,
        })),
    [sentinelAlerts],
  );

  const openAlert = (alert: SentinelAlert) => {
    setSelectedAlert(alert);
    setIsDrawerOpen(true);
  };

  const taskColumns = useMemo<DataTableColumn<SentinelAlert>[]>(
    () => [
      {
        id: 'title',
        header: 'Task',
        accessor: (a) => a.title,
        cell: (a) => (
          <div className="flex items-center gap-2.5">
            <img
              src={a.thumbnail}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg border border-line object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink">{a.title}</p>
              <p className="mt-0.5 line-clamp-1 text-2xs text-muted">{a.subtitle}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'source',
        header: 'Source',
        accessor: (a) => SOURCE_LABEL[a.category],
        cell: (a) => (
          <span className={SOURCE_CLASS[a.category]} title={`Stored category: ${a.category}`}>
            {SOURCE_LABEL[a.category]}
          </span>
        ),
      },
      {
        id: 'priority',
        header: 'Priority',
        accessor: (a) => a.severity,
        cell: (a) => {
          const priority = priorityOf(a);
          return <span className={priority.className}>{priority.label}</span>;
        },
      },
      {
        id: 'generated',
        header: 'Generated',
        accessor: (a) => Date.parse(a.detectedOn) || 0,
        cell: (a) => <span className="whitespace-nowrap text-2xs text-muted">{a.detectedOn}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        accessor: (a) => a.status,
        cell: (a) => (
          <span
            className={`inline-flex items-center gap-1.5 text-2xs font-semibold ${
              a.status === 'Resolved' ? 'text-sage-700' : 'text-warn-700'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                a.status === 'Resolved' ? 'bg-sage-500' : 'bg-warn-500'
              }`}
            />
            {a.status}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        sortable: false,
        canHide: false,
        align: 'right',
        width: '84px',
        cell: (a) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openAlert(a);
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            aria-label={`Open task ${a.title}`}
          >
            Open<ArrowRight className="h-3 w-3" />
          </button>
        ),
      },
    ],
    [],
  );

  if (role !== 'manager') return <Denied />;

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-[1440px] space-y-5">
          <div className="h-16 animate-pulse rounded-2xl bg-cream-100" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
          <SkeletonCard className="h-64" />
        </div>
      </div>
    );
  }

  const progressPct = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1440px] space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">
              Reassessment monitoring
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">Sentinel</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Tasks raised when a rule changes, a claim is withdrawn or an exception lapses. Each row
              is a stored reassessment task, not a live feed.
            </p>
          </div>
          <label className="relative">
            <span className="sr-only">Search tasks</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks"
              className="w-56 rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </label>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-xs text-danger-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Honest operating mode */}
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white px-4 py-3 shadow-card sm:flex-row sm:items-center sm:gap-5">
          <span className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-olive-700">
            <ScanLine className="h-3.5 w-3.5" />Scheduled + on demand
          </span>
          <p className="flex-1 text-2xs leading-relaxed text-muted">
            Tasks are generated by rule-change events and exception or claim lifecycle events, and
            by scans started from the API. This page reads the task list when it opens — it does not
            poll, and there is no live indicator to watch.
          </p>
          <span className="shrink-0 text-2xs text-muted">
            Latest task generated:{' '}
            <strong className="font-semibold text-ink">
              {latestDate(sentinelAlerts) || 'not recorded'}
            </strong>
          </span>
        </div>

        {/* Metrics */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Reassessment tasks" value={total} icon={<Radar className="h-4 w-4" />} chip="bg-brand-50 text-brand-600" hint="all time" />
          <Metric label="Open" value={open} icon={<Clock className="h-4 w-4" />} chip="bg-warn-50 text-warn-600" hint="awaiting review" />
          <Metric label="Resolved" value={resolved} icon={<ShieldCheck className="h-4 w-4" />} chip="bg-sage-50 text-sage-600" hint="recorded" />
          <Metric label="Overdue" value={overdue} icon={<AlertTriangle className="h-4 w-4" />} chip="bg-danger-50 text-danger-600" hint="past due date" />
        </div>

        {/* Analytics */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <SectionHeader
              title="Reassessment progress"
              subtitle="Resolved tasks over all recorded tasks."
            />
            <div className="mt-3 flex items-center gap-4">
              <RingProgress
                value={resolved}
                max={Math.max(total, 1)}
                size={116}
                stroke={10}
                tone={progressPct >= 70 ? 'sage' : progressPct >= 30 ? 'brand' : 'terracotta'}
                centerLabel={<AnimatedCounter value={progressPct} suffix="%" />}
                centerSublabel="resolved"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <AnimatedProgress value={resolved} max={Math.max(total, 1)} tone="sage" label="Resolved" />
                <AnimatedProgress value={open} max={Math.max(total, 1)} tone="amber" label="Open" />
                <AnimatedProgress value={overdue} max={Math.max(total, 1)} tone="danger" label="Overdue" />
              </div>
            </div>
          </div>

          <ChartContainer
            title="Tasks by source"
            subtitle="Derived from the trigger stored on each task."
          >
            {sourceBars.length === 0 ? (
              <p className="py-8 text-center text-2xs text-muted">No tasks recorded.</p>
            ) : (
              <BarSeries
                data={sourceBars}
                height={112}
                tone="olive"
                formatValue={(v) => `${v} task${v === 1 ? '' : 's'}`}
              />
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sourceCounts.map(({ source, count }) => (
                <span key={source} className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-2 py-0.5 text-2xs text-ink-700">
                  {SOURCE_LABEL[source]}
                  <span className="tabular-nums text-muted">{count}</span>
                </span>
              ))}
            </div>
          </ChartContainer>

          <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <SectionHeader
              title="Priority split"
              subtitle="The server raises a task to overdue when it passes its due date."
            />
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-danger-200 bg-danger-50/60 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-danger-700">Overdue</span>
                  <span className="text-lg font-semibold tabular-nums text-ink">
                    <AnimatedCounter value={overdue} />
                  </span>
                </div>
                <p className="mt-0.5 text-2xs text-muted">
                  {total > 0 ? `${Math.round((overdue / total) * 100)}% of all tasks` : 'No tasks yet'}
                </p>
              </div>
              <div className="rounded-xl border border-sage-200 bg-sage-50/60 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-sage-700">Normal</span>
                  <span className="text-lg font-semibold tabular-nums text-ink">
                    <AnimatedCounter value={total - overdue} />
                  </span>
                </div>
                <p className="mt-0.5 text-2xs text-muted">Within the due date, or no due date set.</p>
              </div>
              <div className="rounded-xl border border-line bg-cream-50 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-2xs font-semibold text-ink-700">
                  <CalendarClock className="h-3.5 w-3.5 text-olive-600" />Exception lapse alerts
                </p>
                <p className="mt-1 text-2xs leading-relaxed text-muted">
                  {sentinelAlerts.filter((a) => a.category === 'Legal & Compliance').length} task
                  {sentinelAlerts.filter((a) => a.category === 'Legal & Compliance').length === 1 ? '' : 's'}{' '}
                  originated from an exception expiring or being revoked.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Table + timeline */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 rounded-2xl border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">Reassessment tasks</h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <FilterPills
                  options={(['All', 'Open', 'Resolved', 'Overdue'] as const).map((tab) => ({
                    id: tab,
                    label: `${tab} (${tab === 'All' ? total : tab === 'Open' ? open : tab === 'Resolved' ? resolved : overdue})`,
                  }))}
                  selected={[filter]}
                  onChange={(sel) => {
                    const next = sel.filter((id) => id !== filter);
                    setFilter((next[next.length - 1] as typeof filter) ?? 'All');
                  }}
                />
              </div>
            </div>

            {total === 0 ? (
              <EmptyState
                className="border-0 shadow-none"
                icon={<Radar className="h-6 w-6" />}
                title="No reassessment tasks"
                description="Sentinel creates a task when a rule is activated or edited, a claim is withdrawn, or an exception lapses. Until one of those happens, this list stays empty."
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                className="border-0 shadow-none"
                icon={<Radar className="h-6 w-6" />}
                title="No tasks match this filter"
                description={
                  searchQuery ? `Nothing matches “${searchQuery}”.` : `There are no ${filter.toLowerCase()} tasks.`
                }
                action={{ label: 'Clear filters', onClick: () => { setFilter('All'); setSearchQuery(''); } }}
              />
            ) : (
              <DataTable
                data={filtered}
                columns={taskColumns}
                getRowId={(a) => a.id}
                onRowClick={openAlert}
                pageSize={10}
                pageSizeOptions={[10, 25, 50]}
                minWidth="700px"
                emptyTitle="No tasks match this filter"
                emptyDescription="Clear the filters to see every generated task."
                footnote="Tasks are generated by Sentinel when a stored rule changes. Sort any column to reorder."
              />
            )}

            {filtered.length > 0 && (
              <div className="border-t border-line px-4 py-2.5">
                <p className="text-2xs text-muted">
                  Showing {filtered.length} of {total} tasks.
                </p>
              </div>
            )}
          </div>

          {/* Affected-content timeline */}
          <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <SectionHeader
              title="Affected content"
              subtitle="Most recent tasks first. Times are the task creation date."
            />
            <div className="mt-3">
              {timelineItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-cream-50 px-3 py-6 text-center text-2xs text-muted">
                  No content has been affected yet.
                </p>
              ) : (
                <Timeline items={timelineItems} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      <AnimatedDrawer
        open={isDrawerOpen && !!activeAlert}
        onClose={() => setIsDrawerOpen(false)}
        title={activeAlert?.title ?? 'Task'}
        subtitle={activeAlert ? `${SOURCE_LABEL[activeAlert.category]} · ${activeAlert.status}` : undefined}
        width={460}
        footer={
          activeAlert ? (
            <div className="space-y-2">
              {activeAlert.status !== 'Resolved' ? (
                <button
                  onClick={() => resolveSentinelAlert(activeAlert.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />Resolve task
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-sage-200 bg-sage-50 py-2 text-xs font-semibold text-sage-700">
                  <CheckCircle2 className="h-4 w-4" />Resolved and recorded
                </div>
              )}
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-full rounded-xl border border-line bg-white py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
              >
                Close
              </button>
            </div>
          ) : undefined
        }
      >
        {activeAlert && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={SOURCE_CLASS[activeAlert.category]}>{SOURCE_LABEL[activeAlert.category]}</span>
              <span className={priorityOf(activeAlert).className}>{priorityOf(activeAlert).label}</span>
              <span className={activeAlert.status === 'Resolved' ? 'badge-approved' : 'badge-pending'}>
                {activeAlert.status}
              </span>
            </div>

            {activeAlert.description && (
              <div className="rounded-xl border border-warn-200 bg-warn-50/60 p-3">
                <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-warn-700">
                  <AlertTriangle className="h-3 w-3" />Why this task exists
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-700">{activeAlert.description}</p>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
                Task record
              </p>
              <dl className="space-y-1.5">
                {[
                  { label: 'Task ID', value: activeAlert.id },
                  { label: 'Generated', value: activeAlert.detectedOn },
                  { label: 'Source', value: activeAlert.category },
                  { label: 'Affected content', value: activeAlert.submissionTitle || 'Not linked' },
                  { label: 'Submission', value: activeAlert.submissionId || 'Not linked' },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-3 border-b border-line py-1.5 text-xs last:border-0"
                  >
                    <dt className="shrink-0 text-muted">{row.label}</dt>
                    <dd className="max-w-[62%] break-all text-right font-medium text-ink">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {activeAlert.recommendedAction && (
              <div className="flex items-start gap-2 rounded-xl border border-olive-200 bg-olive-50/60 p-3">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-olive-600" />
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-olive-700">
                    Recorded next step
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-700">{activeAlert.recommendedAction}</p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-line bg-cream-50 p-3">
              <p className="flex items-center gap-1.5 text-2xs font-semibold text-ink-700">
                <RotateCw className="h-3 w-3 text-muted" />What resolving does
              </p>
              <p className="mt-1 text-2xs leading-relaxed text-muted">
                Resolving records a re-approval against this task and writes the decision to the
                audit trail. It does not change the underlying rule or the content itself.
              </p>
            </div>
          </div>
        )}
      </AnimatedDrawer>
    </div>
  );
};
