import React, { useMemo, useState } from 'react';
import {
  CheckCircle2, Clock, Calendar, AlertCircle, Lock, MessageSquare,
  ShieldOff, Ban, Check, ChevronRight, RotateCw, User, CalendarClock, Scale,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { ExceptionItem } from '../../../types';
import {
  AnimatedCard, AnimatedCounter, AnimatedDrawer, EmptyState, FilterPills, Reveal,
  SkeletonCard, Timeline, type TimelineItem,
} from '../../motion';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type Status = ExceptionItem['status'];

const STATUS_CLASS: Record<Status, string> = {
  Approved: 'badge-approved',
  Pending: 'badge-pending',
  Rejected: 'badge-rejected',
};

const STATUS_RAIL: Record<Status, string> = {
  Approved: 'bg-sage-400',
  Pending: 'bg-warn-400',
  Rejected: 'bg-danger-400',
};

/** Days until an expiry label. Returns null when no parseable date is stored. */
function daysUntil(dateText?: string): number | null {
  if (!dateText) return null;
  const t = Date.parse(dateText);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

function ExpiryChip({ dateText }: { dateText?: string }) {
  const days = daysUntil(dateText);
  if (days === null) {
    return <span className="text-2xs text-muted">{dateText || 'No expiry set'}</span>;
  }
  if (days < 0) {
    return <span className="badge-rejected">Expired {Math.abs(days)}d ago</span>;
  }
  if (days <= 30) {
    return <span className="badge-pending">Expires in {days}d</span>;
  }
  return <span className="text-2xs text-muted">Expires {dateText}</span>;
}

const Denied: React.FC = () => (
  <div className="mx-auto max-w-lg px-6 py-16 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta-50 text-terracotta-600">
      <Lock className="h-5 w-5" />
    </div>
    <h1 className="mt-4 text-lg font-semibold text-ink">Manager access required</h1>
    <p className="mt-1 text-xs leading-relaxed text-muted">
      Only brand managers can approve, reject or revoke exceptions. Creators can see the status of
      their own requests in the creator workspace.
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

type Tab = 'All' | Status;

export const ExceptionsView: React.FC = () => {
  const {
    exceptions, selectedException, setSelectedException, updateExceptionStatus,
    searchQuery, setSearchQuery, refresh, showToast, loading, error, role,
  } = useApp();

  const [filterTab, setFilterTab] = useState<Tab>('All');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionSent, setDecisionSent] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const countBy = (s: Status) => exceptions.filter((e) => e.status === s).length;
  const pendingCount = countBy('Pending');
  const approvedCount = countBy('Approved');
  const rejectedCount = countBy('Rejected');

  /* Read the freshest record for the drawer so a decision is reflected after refresh. */
  const activeException = selectedException
    ? exceptions.find((e) => e.id === selectedException.id) ?? selectedException
    : exceptions[0];

  const expiringSoon = useMemo(
    () =>
      exceptions.filter((e) => {
        if (e.status !== 'Approved') return false;
        const days = daysUntil(e.expiryDate);
        return days !== null && days >= 0 && days <= 30;
      }),
    [exceptions],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return exceptions.filter((ex) => {
      if (filterTab !== 'All' && ex.status !== filterTab) return false;
      if (!q) return true;
      return (
        ex.campaign?.toLowerCase().includes(q) ||
        ex.requestTitle?.toLowerCase().includes(q) ||
        ex.reason?.toLowerCase().includes(q) ||
        ex.creator?.toLowerCase().includes(q)
      );
    });
  }, [exceptions, filterTab, searchQuery]);

  const openException = (ex: ExceptionItem) => {
    setSelectedException(ex);
    setDecisionNote('');
    setDecisionSent(false);
    setConfirmRevoke(false);
    setIsDrawerOpen(true);
  };

  const handleDecision = (decision: 'Approved' | 'Rejected') => {
    if (!activeException) return;
    updateExceptionStatus(activeException.id, decision, decisionNote.trim());
    setDecisionSent(true);
  };

  const handleRevoke = async () => {
    if (!activeException) return;
    setRevoking(true);
    try {
      await api.revokeException(activeException.id, decisionNote.trim() || 'Revoked from the approval centre');
      await refresh();
      showToast('Exception revoked.');
      setConfirmRevoke(false);
      setDecisionSent(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not revoke the exception.', 'error');
    } finally {
      setRevoking(false);
    }
  };

  const timeline = (ex: ExceptionItem): TimelineItem[] => {
    const decisionTone = ex.status === 'Approved' ? 'sage' : ex.status === 'Rejected' ? 'danger' : 'amber';
    const expiryDays = daysUntil(ex.expiryDate);
    const items: TimelineItem[] = [
      {
        id: 'requested',
        title: 'Exception requested',
        description: `${ex.creator || 'A workspace member'} submitted this request.`,
        time: ex.submittedOn,
        tone: 'brand',
      },
      {
        id: 'decision',
        title:
          ex.status === 'Pending'
            ? 'Awaiting a manager decision'
            : `Decision recorded — ${ex.status.toLowerCase()}`,
        description:
          ex.status === 'Pending'
            ? 'No decision has been persisted for this request.'
            : ex.managerNotes || 'Decision stored without an accompanying note.',
        time: ex.status === 'Pending' ? undefined : 'decision date not exposed in this view',
        tone: decisionTone,
      },
      {
        id: 'expiry',
        title:
          expiryDays !== null && expiryDays < 0
            ? 'Expired'
            : expiryDays !== null && expiryDays <= 30
              ? `Expires in ${expiryDays} days`
              : 'Expiry',
        description: ex.expiryDate || 'No expiry date was set on this exception.',
        time: ex.expiryDate && expiryDays !== null ? ex.expiryDate : undefined,
        tone: expiryDays !== null && expiryDays <= 30 ? 'terracotta' : 'olive',
      },
    ];
    return items;
  };

  if (role !== 'manager') return <Denied />;

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-[1400px] space-y-5">
          <div className="h-16 animate-pulse rounded-2xl bg-cream-100" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const allSections: { status: Status; rows: ExceptionItem[] }[] = [
    { status: 'Pending' as const, rows: filtered.filter((e) => e.status === 'Pending') },
    { status: 'Approved' as const, rows: filtered.filter((e) => e.status === 'Approved') },
    { status: 'Rejected' as const, rows: filtered.filter((e) => e.status === 'Rejected') },
  ];
  const sections = allSections.filter((s) => (filterTab === 'All' ? true : s.status === filterTab));

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">
              Approval centre
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">Exceptions</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              An exception authorises one piece of content to depart from one rule until a stated
              date. Decisions are written to the audit trail.
            </p>
          </div>
          <label className="relative">
            <span className="sr-only">Search exceptions</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requests"
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Requests" value={exceptions.length} icon={<Scale className="h-4 w-4" />} chip="bg-brand-50 text-brand-600" hint="all time" />
          <Metric label="Pending" value={pendingCount} icon={<Clock className="h-4 w-4" />} chip="bg-warn-50 text-warn-600" hint="needs a decision" />
          <Metric label="Approved" value={approvedCount} icon={<CheckCircle2 className="h-4 w-4" />} chip="bg-sage-50 text-sage-600" hint="in force" />
          <Metric label="Expiring ≤30d" value={expiringSoon.length} icon={<CalendarClock className="h-4 w-4" />} chip="bg-terracotta-50 text-terracotta-600" hint="approved" />
        </div>

        {expiringSoon.length > 0 && (
          <div className="rounded-2xl border border-terracotta-200 bg-terracotta-50/60 p-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-terracotta-600" />
              <p className="text-xs font-semibold text-terracotta-700">
                {expiringSoon.length} approved exception{expiringSoon.length === 1 ? '' : 's'} expiring within 30 days
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {expiringSoon.slice(0, 6).map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => openException(ex)}
                  className="rounded-full border border-terracotta-200 bg-white px-2.5 py-1 text-2xs font-medium text-terracotta-700 transition-colors hover:bg-terracotta-50"
                >
                  {ex.requestTitle} · {ex.expiryDate}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <FilterPills
          options={([
            ['All', exceptions.length],
            ['Pending', pendingCount],
            ['Approved', approvedCount],
            ['Rejected', rejectedCount],
          ] as const).map(([tab, count]) => ({
            id: tab,
            label: `${tab === 'All' ? 'All requests' : tab} (${count})`,
          }))}
          selected={[filterTab]}
          onChange={(sel) => {
            const next = sel.filter((id) => id !== filterTab);
            setFilterTab((next[next.length - 1] as typeof filterTab) ?? 'All');
          }}
        />

        {/* Sections */}
        {exceptions.length === 0 ? (
          <EmptyState
            icon={<ShieldOff className="h-6 w-6" />}
            title="No exception requests yet"
            description="Requests appear here when a creator asks to depart from an active rule. Nothing is pre-filled or simulated."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShieldOff className="h-6 w-6" />}
            title="No requests in this view"
            description={
              searchQuery
                ? `Nothing matches “${searchQuery}”.`
                : `There are no ${filterTab.toLowerCase()} requests.`
            }
            action={{ label: 'Clear filters', onClick: () => { setFilterTab('All'); setSearchQuery(''); } }}
          />
        ) : (
          <div className="space-y-5">
            {sections.map((section) => (
              <section key={section.status} aria-labelledby={`section-${section.status}`}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 id={`section-${section.status}`} className="text-sm font-semibold text-ink">
                    {section.status}
                  </h2>
                  <span className="rounded-full bg-cream-100 px-2 py-0.5 text-2xs font-semibold tabular-nums text-muted">
                    {section.rows.length}
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>

                {section.rows.length === 0 ? (
                  <p className="rounded-2xl border border-line bg-white px-4 py-5 text-center text-2xs text-muted">
                    {section.status === 'Pending'
                      ? 'Nothing is waiting for a decision.'
                      : `No ${section.status.toLowerCase()} requests.`}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {section.rows.map((ex, i) => (
                      <Reveal key={ex.id} delay={Math.min(i, 6) * 0.02}>
                        <AnimatedCard className="overflow-hidden">
                          <div className="flex">
                            <span className={`w-1 shrink-0 ${STATUS_RAIL[ex.status]}`} aria-hidden="true" />
                            <button
                              onClick={() => openException(ex)}
                              className="flex min-w-0 flex-1 flex-col gap-3 p-3.5 text-left transition-colors hover:bg-cream-50/60 sm:flex-row sm:items-center"
                            >
                              <img
                                src={ex.thumbnail}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="truncate text-xs font-semibold text-ink">{ex.requestTitle}</span>
                                  <span className={STATUS_CLASS[ex.status]}>{ex.status}</span>
                                </div>
                                <p className="mt-0.5 truncate text-2xs text-muted">
                                  {ex.campaign} · requested by {ex.creator || 'workspace member'}
                                </p>
                                <p className="mt-1 line-clamp-1 text-2xs text-muted">{ex.reason}</p>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-4 text-2xs text-muted">
                                <div>
                                  <p className="uppercase tracking-[0.06em] text-muted-light">Scope</p>
                                  <p className="mt-0.5 max-w-[140px] truncate font-medium text-ink-700">
                                    {ex.scope || 'Not stated'}
                                  </p>
                                </div>
                                <div>
                                  <p className="uppercase tracking-[0.06em] text-muted-light">Effective</p>
                                  <p className="mt-0.5 font-medium text-ink-700">{ex.submittedOn}</p>
                                </div>
                                <div>
                                  <p className="uppercase tracking-[0.06em] text-muted-light">Expiry</p>
                                  <p className="mt-0.5"><ExpiryChip dateText={ex.expiryDate} /></p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-light" />
                              </div>
                            </button>
                          </div>
                        </AnimatedCard>
                      </Reveal>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Decision drawer */}
      <AnimatedDrawer
        open={isDrawerOpen && !!activeException}
        onClose={() => setIsDrawerOpen(false)}
        title={activeException?.requestTitle ?? 'Exception request'}
        subtitle={activeException ? `${activeException.campaign} · ${activeException.status}` : undefined}
        width={480}
      >
        {activeException && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={STATUS_CLASS[activeException.status]}>{activeException.status}</span>
              <ExpiryChip dateText={activeException.expiryDate} />
            </div>

            <div className="rounded-xl border border-line bg-cream-50 p-3">
              <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Reason</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-700">{activeException.reason}</p>
            </div>

            <div>
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
                Request information
              </p>
              <dl className="space-y-1.5">
                {[
                  { label: 'Campaign', value: activeException.campaign, icon: <Scale className="h-3.5 w-3.5" /> },
                  { label: 'Requested by', value: activeException.creator || 'Workspace member', icon: <User className="h-3.5 w-3.5" /> },
                  { label: 'Scope', value: activeException.scope || 'Not stated', icon: <ShieldOff className="h-3.5 w-3.5" /> },
                  { label: 'Effective from', value: activeException.submittedOn, icon: <Calendar className="h-3.5 w-3.5" /> },
                  { label: 'Expires', value: activeException.expiryDate || 'No expiry set', icon: <CalendarClock className="h-3.5 w-3.5" /> },
                  { label: 'Conditions', value: activeException.conditions || 'None recorded', icon: <MessageSquare className="h-3.5 w-3.5" /> },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-3 border-b border-line py-1.5 text-xs last:border-0"
                  >
                    <span className="flex shrink-0 items-center gap-1.5 text-muted">{row.icon}{row.label}</span>
                    <span className="max-w-[60%] break-words text-right font-medium text-ink">{row.value}</span>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
                Lifecycle
              </p>
              <Timeline items={timeline(activeException)} />
            </div>

            {activeException.managerNotes && (
              <div className="flex items-start gap-2 rounded-xl border border-olive-200 bg-olive-50/60 p-3">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-olive-600" />
                <p className="text-2xs leading-relaxed text-ink-700">{activeException.managerNotes}</p>
              </div>
            )}

            {/* Decision panel */}
            {activeException.status === 'Pending' ? (
              <div className="rounded-2xl border border-line bg-white p-3.5">
                <p className="text-xs font-semibold text-ink">Decision</p>
                <p className="mt-0.5 text-2xs text-muted">
                  The note is stored with the decision and shown in the audit trail.
                </p>
                <label htmlFor="decision-note" className="sr-only">Decision note</label>
                <textarea
                  id="decision-note"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  rows={2}
                  placeholder="Conditions or reason for the decision"
                  className="mt-2 w-full resize-none rounded-xl border border-line px-3 py-2 text-xs text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleDecision('Rejected')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-danger-300 bg-white py-2 text-xs font-semibold text-danger-700 transition-colors hover:bg-danger-50"
                  >
                    <Ban className="h-3.5 w-3.5" />Reject
                  </button>
                  <button
                    onClick={() => handleDecision('Approved')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    <Check className="h-3.5 w-3.5" />Approve
                  </button>
                </div>
                {decisionSent && (
                  <p role="status" className="mt-2 rounded-lg bg-cream-50 px-2.5 py-2 text-2xs text-muted">
                    Decision sent. This panel shows the new status once the server refresh completes.
                  </p>
                )}
              </div>
            ) : activeException.status === 'Approved' ? (
              <div className="rounded-2xl border border-line bg-white p-3.5">
                <p className="text-xs font-semibold text-ink">Revoke this exception</p>
                <p className="mt-0.5 text-2xs leading-relaxed text-muted">
                  Revoking ends the authorisation immediately. The content returns to normal rule
                  enforcement and Sentinel may create a reassessment task.
                </p>
                {!confirmRevoke ? (
                  <button
                    onClick={() => setConfirmRevoke(true)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-terracotta-300 bg-white px-3 py-2 text-xs font-semibold text-terracotta-700 transition-colors hover:bg-terracotta-50"
                  >
                    <ShieldOff className="h-3.5 w-3.5" />Revoke exception
                  </button>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setConfirmRevoke(false)}
                      className="flex-1 rounded-xl border border-line bg-white py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
                    >
                      Keep exception
                    </button>
                    <button
                      onClick={handleRevoke}
                      disabled={revoking}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-terracotta-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-terracotta-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {revoking ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                      {revoking ? 'Revoking…' : 'Confirm revoke'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="rounded-xl border border-line bg-cream-50 px-3 py-2.5 text-2xs leading-relaxed text-muted">
                This request was rejected. A rejected request cannot be approved later; the creator
                must submit a new request with updated scope or reasoning.
              </p>
            )}

            <button
              onClick={() => setIsDrawerOpen(false)}
              className="w-full rounded-xl border border-line bg-white py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
            >
              Close
            </button>
          </div>
        )}
      </AnimatedDrawer>
    </div>
  );
};
