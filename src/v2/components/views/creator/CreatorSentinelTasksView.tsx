import React, { useState } from 'react';
import {
  AlertCircle, AlertTriangle, Check, CheckCircle2, ChevronRight, Clock, Loader2, ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import type { SentinelAlert } from '../../../types';
import {
  AnimatedCounter, AnimatedDrawer, EmptyState, FilterPills, HoverLiftCard, PageTransition,
  SectionHeader, Stagger, StaggerItem, Timeline, type TimelineItem,
} from '../../motion';

type SeverityFilter = 'All' | 'High' | 'Medium' | 'Low';

const FILTERS: SeverityFilter[] = ['All', 'High', 'Medium', 'Low'];

const severityClass: Record<string, string> = {
  High: 'bg-terracotta-50 text-terracotta-700 border-terracotta-200',
  Medium: 'bg-warn-50 text-warn-700 border-warn-200',
  Low: 'bg-sage-50 text-sage-700 border-sage-200',
};

const SeverityChip: React.FC<{ severity: string }> = ({ severity }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-semibold ${
      severityClass[severity] ?? 'border-line bg-cream-100 text-muted'
    }`}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {severity} priority
  </span>
);

const StatusChip: React.FC<{ status: SentinelAlert['status'] }> = ({ status }) => {
  const cls =
    status === 'Resolved'
      ? 'badge-approved'
      : status === 'Investigating'
        ? 'badge-inreview'
        : 'badge-rejected';
  return <span className={cls}>{status === 'Investigating' ? 'In progress' : status}</span>;
};

const Metric: React.FC<{ label: string; value: number; icon: React.ReactNode; tone: string }> = ({
  label, value, icon, tone,
}) => (
  <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
    <p className="mt-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
    <p className="mt-0.5 text-2xl font-semibold leading-none tabular-nums text-ink">
      <AnimatedCounter value={value} />
    </p>
  </div>
);

export const CreatorSentinelTasksView: React.FC = () => {
  const { addToast, sentinelAlerts, resolveSentinelAlert, loading, error, refresh, setCurrentPage, setSelectedSubmission, submissions } = useApp();
  const [activeFilter, setActiveFilter] = useState<SeverityFilter>('All');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const tasks = sentinelAlerts;
  const totalCount = tasks.length;
  const resolvedCount = tasks.filter((t) => t.status === 'Resolved').length;
  const openCount = tasks.filter((t) => t.status === 'Open').length;
  const investigatingCount = tasks.filter((t) => t.status === 'Investigating').length;
  const overdueCount = tasks.filter((t) => t.status === 'Open' && t.severity === 'High').length;

  const filtered = tasks.filter((t) => {
    if (activeFilter === 'All') return true;
    return t.severity === activeFilter;
  });

  const detail = tasks.find((t) => t.id === detailId) ?? null;

  const counts: Record<SeverityFilter, number> = {
    All: totalCount,
    High: tasks.filter((t) => t.severity === 'High').length,
    Medium: tasks.filter((t) => t.severity === 'Medium').length,
    Low: tasks.filter((t) => t.severity === 'Low').length,
  };

  const handleResolve = async () => {
    if (!detail) return;
    setIsResolving(true);
    try {
      await resolveSentinelAlert(detail.id);
      addToast(`Task resolved: "${detail.title}"`, 'success');
    } catch {
      addToast('Resolution failed.', 'error');
    } finally {
      setIsResolving(false);
    }
  };

  const historyFor = (task: SentinelAlert): TimelineItem[] => {
    const items: TimelineItem[] = [
      {
        id: `${task.id}-detected`,
        title: 'Flagged by Sentinel',
        description: task.subtitle || task.description || 'A monitoring rule matched this content.',
        time: task.detectedOn,
        tone: task.severity === 'High' ? 'terracotta' : 'amber',
      },
    ];
    if (task.status === 'Open') {
      items.push({
        id: `${task.id}-open`,
        title: 'Reassessment required',
        description: 'No one has started the re-review yet.',
        tone: 'danger',
      });
    } else if (task.status === 'Investigating') {
      items.push({
        id: `${task.id}-progress`,
        title: 'Re-review in progress',
        description: 'A reviewer is currently looking at the affected version.',
        tone: 'amber',
      });
    } else {
      items.push({
        id: `${task.id}-resolved`,
        title: 'Resolved',
        description: 'The affected version was re-reviewed and the task closed.',
        tone: 'sage',
      });
    }
    return items;
  };

  const openTaskForSubmission = (task: SentinelAlert) => {
    const sub = submissions.find((s) => s.id === (task.submissionId ?? task.contentId));
    if (sub) setSelectedSubmission(sub);
    setCurrentPage('ai-review');
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6" aria-busy="true" aria-label="Loading Sentinel tasks">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-cream-100" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-line bg-white" />
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[100px] animate-pulse rounded-2xl border border-line bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
          <p className="text-sm font-semibold text-danger-700">Sentinel tasks could not load.</p>
          <p className="mt-1 text-xs text-danger-600">{error}</p>
          <button
            onClick={() => void refresh()}
            className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1200px] space-y-5">

        <div className="min-w-0">
          <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">Monitoring</p>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">Sentinel Tasks</h1>
          <p className="mt-1 text-sm text-muted">
            Re-review tasks Sentinel raised against your content when a rule or exception changed.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Metric label="Total tasks" value={totalCount} icon={<ShieldAlert className="h-4 w-4" />} tone="bg-brand-50 text-brand-600" />
          <Metric label="Resolved" value={resolvedCount} icon={<CheckCircle2 className="h-4 w-4" />} tone="bg-sage-50 text-sage-600" />
          <Metric label="Open" value={openCount} icon={<Clock className="h-4 w-4" />} tone="bg-warn-50 text-warn-600" />
          <Metric label="Overdue" value={overdueCount} icon={<AlertCircle className="h-4 w-4" />} tone="bg-terracotta-50 text-terracotta-600" />
        </div>

        {overdueCount > 0 && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-2xl border border-terracotta-200 bg-terracotta-50 px-4 py-3 text-xs text-terracotta-800"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-600" />
            <p>
              <strong>{overdueCount}</strong> task{overdueCount === 1 ? '' : 's'} past the re-review window.
              Resolve them to keep the affected content eligible for publication.
            </p>
          </div>
        )}

        <FilterPills
          options={FILTERS.map((tab) => ({
            id: tab,
            label: `${tab === 'All' ? 'All tasks' : tab} (${counts[tab]})`,
          }))}
          selected={[activeFilter]}
          onChange={(sel) => {
            const next = sel.filter((id) => id !== activeFilter);
            setActiveFilter((next[next.length - 1] as typeof activeFilter) ?? 'All');
          }}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-6 w-6" />}
            title={tasks.length === 0 ? 'No Sentinel tasks' : 'Nothing matches this priority'}
            description={
              tasks.length === 0
                ? 'Sentinel has not raised any reassessment task against your content.'
                : 'Try another priority to see the rest of your tasks.'
            }
            action={tasks.length > 0 ? { label: 'Show all', onClick: () => setActiveFilter('All') } : undefined}
          />
        ) : (
          <Stagger className="space-y-3">
            {filtered.map((task) => {
              const overdue = task.status === 'Open' && task.severity === 'High';
              return (
                <StaggerItem key={task.id}>
                  <HoverLiftCard
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start"
                    elevation={task.severity === 'High' ? 'high' : 'medium'}
                    style={
                      overdue
                        ? { boxShadow: '0 0 0 1px rgba(194,84,70,.20), 0 12px 28px -18px rgba(194,84,70,.55)' }
                        : undefined
                    }
                  >
                    <img
                      src={task.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-xl border border-line object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityChip severity={task.severity} />
                        <p className="truncate text-sm font-semibold text-ink">{task.title}</p>
                        {overdue && (
                          <span className="badge-rejected">
                            <AlertTriangle className="h-3 w-3" />Overdue
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted">
                        {task.description || task.subtitle || 'Requires review.'}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-light">
                        <span>{task.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>Detected {task.detectedOn}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-start">
                      <StatusChip status={task.status} />
                      <button
                        onClick={() => setDetailId(task.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-line px-3 py-1.5 text-2xs font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                      >
                        View details<ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </HoverLiftCard>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}

        {/* Real activity */}
        {tasks.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader title="Task timeline" subtitle="The most recent tasks Sentinel raised." />
              <Timeline
                className="mt-3"
                items={tasks.slice(0, 5).map((t) => ({
                  id: t.id,
                  title: t.title,
                  description: `${t.category} · ${t.status === 'Resolved' ? 'Resolved' : 'Open'}`,
                  time: t.detectedOn,
                  tone: t.status === 'Resolved' ? 'sage' : t.severity === 'High' ? 'terracotta' : 'amber',
                }))}
              />
            </div>

            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader title="Task insights" subtitle="Counts derived from the tasks stored for you." />
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { label: 'Open', value: openCount, cls: 'text-terracotta-600' },
                  { label: 'In progress', value: investigatingCount, cls: 'text-warn-600' },
                  { label: 'Resolved', value: resolvedCount, cls: 'text-sage-600' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-line bg-cream-50 p-3 text-center">
                    <p className={`text-xl font-semibold tabular-nums ${s.cls}`}>
                      <AnimatedCounter value={s.value} />
                    </p>
                    <p className="mt-0.5 text-2xs text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail */}
      <AnimatedDrawer
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail?.title ?? 'Sentinel task'}
        subtitle={detail ? `${detail.category} · detected ${detail.detectedOn}` : undefined}
        footer={
          detail ? (
            <div className="space-y-2">
              {detail.status !== 'Resolved' ? (
                <button
                  onClick={handleResolve}
                  disabled={isResolving}
                  className="btn-primary-glow flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {isResolving ? 'Resolving…' : 'Mark as resolved'}
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-sage-200 bg-sage-50 py-2.5 text-xs font-semibold text-sage-700">
                  <CheckCircle2 className="h-4 w-4" />Task resolved
                </div>
              )}
              {(detail.submissionId || detail.contentId) && (
                <button
                  onClick={() => openTaskForSubmission(detail)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white py-2.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
                >
                  Open affected submission
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl border border-line bg-cream-100">
              <img src={detail.thumbnail} alt="" className="h-36 w-full object-cover" />
              <span className="absolute left-2 top-2"><SeverityChip severity={detail.severity} /></span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={detail.status} />
              {detail.status === 'Open' && detail.severity === 'High' && (
                <span className="badge-rejected">
                  <AlertTriangle className="h-3 w-3" />Overdue
                </span>
              )}
            </div>

            <p className="text-xs leading-relaxed text-ink-600">
              {detail.description || detail.subtitle || 'Sentinel matched a monitoring rule against this content.'}
            </p>

            <div>
              <SectionHeader title="Task information" />
              <dl className="mt-2 space-y-0">
                {[
                  ['Category', detail.category],
                  ['Detected on', detail.detectedOn],
                  ['Priority', detail.severity],
                  ['Status', detail.status === 'Investigating' ? 'In progress' : detail.status],
                  ['Submission', detail.submissionTitle || detail.contentTitle || '—'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-3 border-b border-line-soft py-1.5 text-xs last:border-0"
                  >
                    <dt className="shrink-0 text-muted">{label}</dt>
                    <dd className="max-w-[62%] break-words text-right font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-xl border border-olive-200 bg-olive-50/70 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-olive-800">
                <ShieldAlert className="h-3.5 w-3.5" />Recommended action
              </p>
              <p className="mt-1 text-2xs leading-relaxed text-olive-800/90">
                {detail.recommendedAction || 'Re-review the affected version, then resolve the task.'}
              </p>
            </div>

            <div>
              <SectionHeader title="Status history" subtitle="Reconstructed from the stored task record." />
              <Timeline items={historyFor(detail)} className="mt-3" />
            </div>
          </div>
        )}
      </AnimatedDrawer>
    </PageTransition>
  );
};
