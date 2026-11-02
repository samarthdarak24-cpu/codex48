import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, Bell, BookOpen, CheckCheck, CheckCircle2, ChevronRight, Info, MessageSquare,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import type { NotificationItem } from '../../../types';
import {
  AnimatedCounter, AnimatedDrawer, EmptyState, FilterPills, PageTransition, PulseDot,
  SectionHeader, Stagger, StaggerItem,
} from '../../motion';

type Filter = 'All' | 'Unread' | 'Action Required' | 'System' | 'Updates';

const FILTERS: Filter[] = ['All', 'Unread', 'Action Required', 'System', 'Updates'];

const isUnread = (n: NotificationItem) => (n.isUnread !== undefined ? n.isUnread : !n.read);

const isUpdate = (n: NotificationItem) =>
  n.type === 'approval' || n.type === 'comment' || n.type === 'guideline' || n.type === 'warning' || n.type === 'update';

/** Buckets a notification from the relative timestamp the API already returns. */
function bucketOf(n: NotificationItem): 'Today' | 'Yesterday' | 'This week' | 'Earlier' {
  const raw = (n.time || n.timestamp || '').toLowerCase();
  if (!raw) return 'Earlier';
  if (raw === 'just now' || raw.includes('min ago') || raw.includes('hour')) return 'Today';
  if (raw === 'yesterday') return 'Yesterday';
  const days = raw.match(/^(\d+)\s+days? ago$/);
  if (days) return Number(days[1]) <= 7 ? 'This week' : 'Earlier';
  return 'Earlier';
}

const BUCKETS = ['Today', 'Yesterday', 'This week', 'Earlier'] as const;

const TypeIcon: React.FC<{ type: string }> = ({ type }) => {
  const base = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl';
  if (type === 'approval') return <span className={`${base} bg-sage-50 text-sage-600`}><CheckCircle2 className="h-4 w-4" /></span>;
  if (type === 'action_required') return <span className={`${base} bg-terracotta-50 text-terracotta-600`}><AlertTriangle className="h-4 w-4" /></span>;
  if (type === 'warning') return <span className={`${base} bg-warn-50 text-warn-600`}><AlertTriangle className="h-4 w-4" /></span>;
  if (type === 'comment') return <span className={`${base} bg-olive-50 text-olive-600`}><MessageSquare className="h-4 w-4" /></span>;
  if (type === 'guideline' || type === 'update' || type === 'info') {
    return <span className={`${base} bg-olive-50 text-olive-600`}><BookOpen className="h-4 w-4" /></span>;
  }
  return <span className={`${base} bg-cream-100 text-muted`}><Info className="h-4 w-4" /></span>;
};

const TypeLabel: React.FC<{ type: string }> = ({ type }) => {
  const map: Record<string, { label: string; cls: string }> = {
    approval: { label: 'Approval', cls: 'badge-approved' },
    action_required: { label: 'Action required', cls: 'badge-rejected' },
    warning: { label: 'Warning', cls: 'badge-pending' },
    comment: { label: 'Comment', cls: 'badge-inreview' },
    guideline: { label: 'Guideline', cls: 'badge-inreview' },
    update: { label: 'Update', cls: 'badge-inreview' },
    system: { label: 'System', cls: 'badge-draft' },
    info: { label: 'Info', cls: 'badge-draft' },
  };
  const entry = map[type] ?? { label: type.replace(/_/g, ' '), cls: 'badge-draft' };
  return <span className={entry.cls}>{entry.label}</span>;
};

export const NotificationsView: React.FC = () => {
  const {
    notifications, markNotificationRead, markAllNotificationsRead, loading, error, refresh,
    setCurrentPage,
  } = useApp();
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter(isUnread).length;
  const actionCount = notifications.filter((n) => n.type === 'action_required').length;
  const systemCount = notifications.filter((n) => n.type === 'system').length;
  const updatesCount = notifications.filter(isUpdate).length;

  const counts: Record<Filter, number> = {
    All: notifications.length,
    Unread: unreadCount,
    'Action Required': actionCount,
    System: systemCount,
    Updates: updatesCount,
  };

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'Unread') return isUnread(n);
    if (activeFilter === 'Action Required') return n.type === 'action_required';
    if (activeFilter === 'System') return n.type === 'system';
    if (activeFilter === 'Updates') return isUpdate(n);
    return true;
  });

  const grouped = useMemo(
    () =>
      BUCKETS.map((bucket) => ({
        bucket,
        items: filtered.filter((n) => bucketOf(n) === bucket),
      })).filter((group) => group.items.length > 0),
    [filtered],
  );

  const detail = notifications.find((n) => n.id === detailId) ?? null;

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6" aria-busy="true" aria-label="Loading notifications">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-cream-100" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-line bg-white" />
          ))}
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[80px] animate-pulse rounded-2xl border border-line bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
          <p className="text-sm font-semibold text-danger-700">Notifications could not load.</p>
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
      <div className="mx-auto max-w-[1000px] space-y-5">

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">Inbox</p>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">Notifications</h1>
            <p className="mt-1 text-sm text-muted">
              Decisions, Sentinel tasks and workspace updates. {unreadCount > 0 ? `${unreadCount} unread.` : 'Everything is read.'}
            </p>
          </div>
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink-700 shadow-card transition-colors hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />{markingAll ? 'Marking…' : 'Mark all read'}
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            { label: 'Total', value: notifications.length, icon: <Bell className="h-4 w-4" />, cls: 'bg-brand-50 text-brand-600' },
            { label: 'Unread', value: unreadCount, icon: <CheckCircle2 className="h-4 w-4" />, cls: 'bg-sage-50 text-sage-600' },
            { label: 'Action required', value: actionCount, icon: <AlertTriangle className="h-4 w-4" />, cls: 'bg-terracotta-50 text-terracotta-600' },
            { label: 'System', value: systemCount, icon: <Info className="h-4 w-4" />, cls: 'bg-cream-100 text-muted' },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${metric.cls}`}>{metric.icon}</span>
              <p className="mt-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">{metric.label}</p>
              <p className="mt-0.5 text-2xl font-semibold leading-none tabular-nums text-ink">
                <AnimatedCounter value={metric.value} />
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <FilterPills
          options={FILTERS.map((tab) => ({ id: tab, label: `${tab} (${counts[tab]})` }))}
          selected={[activeFilter]}
          onChange={(sel) => {
            const next = sel.filter((id) => id !== activeFilter);
            setActiveFilter((next[next.length - 1] as typeof activeFilter) ?? 'All');
          }}
        />

        {/* List */}
        {grouped.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title={notifications.length === 0 ? 'No notifications yet' : 'Nothing in this filter'}
            description={
              notifications.length === 0
                ? 'Decisions on your submissions and Sentinel alerts will arrive here.'
                : 'Try another filter to see the rest of your inbox.'
            }
            action={notifications.length > 0 ? { label: 'Show all', onClick: () => setActiveFilter('All') } : undefined}
          />
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <section key={group.bucket} aria-label={group.bucket}>
                <div className="mb-2 flex items-center gap-3">
                  <h2 className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted">{group.bucket}</h2>
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                  <span className="text-2xs tabular-nums text-muted-light">{group.items.length}</span>
                </div>
                <Stagger className="space-y-2">
                  {group.items.map((n) => {
                    const unread = isUnread(n);
                    return (
                      <StaggerItem key={n.id}>
                        <button
                          onClick={() => {
                            setDetailId(n.id);
                            markNotificationRead(n.id);
                          }}
                          className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors duration-300 ${
                            unread
                              ? 'border-brand-200 bg-brand-50/40 hover:bg-brand-50/70'
                              : 'border-line bg-white hover:border-line-strong hover:bg-cream-50'
                          }`}
                        >
                          <TypeIcon type={n.type} />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className={`truncate text-sm ${unread ? 'font-semibold text-ink' : 'font-medium text-ink-700'}`}>
                                {n.title}
                              </span>
                              {unread && (
                                <span className="shrink-0" aria-label="Unread">
                                  <PulseDot />
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 line-clamp-1 block text-xs text-muted">
                              {n.description || n.message || 'No further detail provided.'}
                            </span>
                            <span className="mt-1 block text-2xs text-muted-light">{n.time || n.timestamp || '—'}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <TypeLabel type={n.type} />
                            <ChevronRight className="h-4 w-4 text-muted-light" />
                          </span>
                        </button>
                      </StaggerItem>
                    );
                  })}
                </Stagger>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Detail */}
      <AnimatedDrawer
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail?.title ?? 'Notification'}
        subtitle={detail ? `${detail.time || detail.timestamp || ''}` : undefined}
        footer={
          <button
            onClick={() => setCurrentPage('my-submissions')}
            className="btn-primary-glow flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold"
          >
            Open my submissions<ChevronRight className="h-4 w-4" />
          </button>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <TypeIcon type={detail.type} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{detail.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <TypeLabel type={detail.type} />
                  <span className="text-2xs text-muted">{detail.time || detail.timestamp || '—'}</span>
                </div>
              </div>
            </div>

            <p className="rounded-xl border border-line bg-cream-50 px-3.5 py-3 text-xs leading-relaxed text-ink-600">
              {detail.description || detail.message || 'This notification carries no additional detail.'}
            </p>

            <div>
              <SectionHeader title="Details" />
              <dl className="mt-2 space-y-0">
                {[
                  ['Received', detail.time || detail.timestamp || '—'],
                  ['Category', detail.type.replace(/_/g, ' ')],
                  ['State', isUnread(detail) ? 'Unread' : 'Read'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 border-b border-line-soft py-1.5 text-xs last:border-0"
                  >
                    <dt className="text-muted">{label}</dt>
                    <dd className="max-w-[60%] truncate text-right font-medium capitalize text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </AnimatedDrawer>
    </PageTransition>
  );
};
