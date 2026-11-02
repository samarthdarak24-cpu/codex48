import React, { useMemo, useState } from 'react';
import {
  Scale, CheckCircle2, AlertTriangle, Zap, ChevronDown, Calendar, ShieldOff,
  AlertCircle, Lock, FileText, ArrowRight, Check,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import type { RuleConflict } from '../../../types';
import {
  AnimatedCard, AnimatedCounter, AnimatedDrawer, EmptyState, FilterPills, Reveal,
  SectionHeader, SkeletonCard,
} from '../../motion';

/* ------------------------------------------------------------------ */
/* Presentation helpers                                                */
/* ------------------------------------------------------------------ */

type EntryStatus = RuleConflict['status'];

const STATUS_CLASS: Record<EntryStatus, string> = {
  Active: 'badge-approved',
  Conflict: 'badge-rejected',
  'Review Required': 'badge-pending',
};

const RAIL: Record<EntryStatus, string> = {
  Active: 'bg-sage-400',
  Conflict: 'bg-danger-400',
  'Review Required': 'bg-warn-400',
};

const STATUS_LABEL: Record<EntryStatus, string> = {
  Active: 'Active',
  Conflict: 'Conflict',
  'Review Required': 'Needs confirmation',
};

function StatusIcon({ status, className = '' }: { status: EntryStatus; className?: string }) {
  if (status === 'Conflict') return <AlertTriangle className={className} />;
  if (status === 'Review Required') return <Zap className={className} />;
  return <CheckCircle2 className={className} />;
}

const Denied: React.FC = () => (
  <div className="mx-auto max-w-lg px-6 py-16 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta-50 text-terracotta-600">
      <Lock className="h-5 w-5" />
    </div>
    <h1 className="mt-4 text-lg font-semibold text-ink">Manager access required</h1>
    <p className="mt-1 text-xs leading-relaxed text-muted">
      Rules and conflict review are restricted to brand managers. Creators can read the guidelines
      that these rules cite, but cannot confirm or resolve them.
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

type Tab = 'all' | 'active' | 'conflict' | 'review' | 'exception';

export const RulesConflictsView: React.FC = () => {
  const {
    ruleConflicts, selectedConflict, setSelectedConflict, resolveRuleConflict,
    searchQuery, setSearchQuery, loading, error, role,
  } = useApp();

  const [filterTab, setFilterTab] = useState<Tab>('all');
  const [sortBy, setSortBy] = useState<'title' | 'date'>('date');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const ruleRows = ruleConflicts.filter((rc) => rc.category !== 'Exceptions');
  const exceptionRows = ruleConflicts.filter((rc) => rc.category === 'Exceptions');

  const activeCount = ruleRows.filter((rc) => rc.status === 'Active').length;
  const conflictCount = ruleConflicts.filter((rc) => rc.status === 'Conflict').length;
  const reviewCount = ruleRows.filter((rc) => rc.status === 'Review Required').length;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = ruleConflicts.filter((rc) => {
      if (filterTab === 'active' && (rc.status !== 'Active' || rc.category === 'Exceptions')) return false;
      if (filterTab === 'conflict' && rc.status !== 'Conflict') return false;
      if (filterTab === 'review' && (rc.status !== 'Review Required' || rc.category === 'Exceptions')) return false;
      if (filterTab === 'exception' && rc.category !== 'Exceptions') return false;
      if (!q) return true;
      return (
        rc.title.toLowerCase().includes(q) ||
        rc.description.toLowerCase().includes(q) ||
        rc.category.toLowerCase().includes(q)
      );
    });

    return [...rows].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      const at = Date.parse(a.date);
      const bt = Date.parse(b.date);
      if (Number.isNaN(at) || Number.isNaN(bt)) return a.title.localeCompare(b.title);
      return bt - at;
    });
  }, [ruleConflicts, filterTab, searchQuery, sortBy]);

  const activeEntry = selectedConflict;

  const openEntry = (rc: RuleConflict) => {
    setSelectedConflict(rc);
    setIsDrawerOpen(true);
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleResolve = () => {
    if (!activeEntry) return;
    /* The context handler performs the write, refreshes, and raises its own
       success/error toast once the server responds. */
    resolveRuleConflict(activeEntry.id);
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
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All entries', count: ruleConflicts.length },
    { key: 'active', label: 'Active rules', count: activeCount },
    { key: 'conflict', label: 'Conflicts', count: conflictCount },
    { key: 'review', label: 'Needs confirmation', count: reviewCount },
    { key: 'exception', label: 'Exception overrides', count: exceptionRows.length },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">
              Rule console
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">Rules &amp; Conflicts</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Every entry below is a stored rule, a detected contradiction, or an approved exception
              override. Nothing here is scored or ranked by the interface.
            </p>
          </div>
          <label className="relative">
            <span className="sr-only">Search rules</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules and conflicts"
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
          <Metric label="Rules in scope" value={ruleRows.length} icon={<Scale className="h-4 w-4" />} chip="bg-brand-50 text-brand-600" hint="stored" />
          <Metric label="Active" value={activeCount} icon={<CheckCircle2 className="h-4 w-4" />} chip="bg-sage-50 text-sage-600" hint="enforced" />
          <Metric label="Conflicts" value={conflictCount} icon={<AlertTriangle className="h-4 w-4" />} chip="bg-danger-50 text-danger-600" hint="detected" />
          <Metric label="Needs confirmation" value={reviewCount} icon={<Zap className="h-4 w-4" />} chip="bg-warn-50 text-warn-600" hint="awaiting you" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterPills
              options={tabs.map((tab) => ({ id: tab.key, label: `${tab.label} (${tab.count})` }))}
              selected={[filterTab]}
              onChange={(sel) => {
                const next = sel.filter((id) => id !== filterTab);
                setFilterTab((next[next.length - 1] ?? 'all') as typeof filterTab);
              }}
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <span>Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value === 'title' ? 'title' : 'date')}
              className="cursor-pointer rounded-xl border border-line bg-white px-2 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="date">Effective date</option>
              <option value="title">Title A–Z</option>
            </select>
          </label>
        </div>

        {/* List */}
        <div className="space-y-2.5">
          {ruleConflicts.length === 0 ? (
            <EmptyState
              icon={<Scale className="h-6 w-6" />}
              title="No rules in this workspace"
              description="Rules are extracted from guideline documents. Upload and activate a document first; this console stays empty until then."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Scale className="h-6 w-6" />}
              title="Nothing matches this filter"
              description={
                searchQuery
                  ? `No entry contains “${searchQuery}”.`
                  : 'This category has no entries right now.'
              }
              action={{ label: 'Clear filters', onClick: () => { setFilterTab('all'); setSearchQuery(''); } }}
            />
          ) : (
            filtered.map((rc, i) => {
              const isException = rc.category === 'Exceptions';
              const isOpen = expanded.includes(rc.id);
              const detailId = `rule-detail-${rc.id}`;
              return (
                <Reveal key={rc.id} delay={Math.min(i, 8) * 0.02}>
                  <AnimatedCard className="overflow-hidden">
                    <div className="flex">
                      <span className={`w-1 shrink-0 ${RAIL[rc.status]}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              rc.status === 'Conflict'
                                ? 'bg-danger-50 text-danger-600 animate-soft-pulse'
                                : rc.status === 'Review Required'
                                  ? 'bg-warn-50 text-warn-600'
                                  : isException
                                    ? 'bg-olive-50 text-olive-600'
                                    : 'bg-sage-50 text-sage-600'
                            }`}
                          >
                            {isException
                              ? <ShieldOff className="h-4 w-4" />
                              : <StatusIcon status={rc.status} className="h-4 w-4" />}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                onClick={() => openEntry(rc)}
                                className="text-left text-sm font-semibold text-ink transition-colors hover:text-brand-700"
                              >
                                {rc.title}
                              </button>
                              <span className={`${STATUS_CLASS[rc.status]} shrink-0`}>
                                {isException ? 'Exception override' : STATUS_LABEL[rc.status]}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                              {rc.description}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-2xs">
                              <span className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-2 py-0.5 font-medium text-ink-700">
                                <FileText className="h-3 w-3" />{rc.category}
                              </span>
                              <span className="rounded-full bg-cream-100 px-2 py-0.5 font-medium text-ink-700">
                                {isException ? rc.ruleVersion : `Source ${rc.ruleVersion}`}
                              </span>
                              <span className="inline-flex items-center gap-1 text-muted">
                                <Calendar className="h-3 w-3" />
                                {isException ? 'Effective' : 'Effective from'} {rc.date}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5 sm:flex-col sm:items-end">
                            <button
                              onClick={() => toggleExpanded(rc.id)}
                              aria-expanded={isOpen}
                              aria-controls={detailId}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-2xs font-semibold text-ink-700 transition-colors hover:bg-cream-100"
                            >
                              {isOpen ? 'Hide' : 'Inspect'}
                              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <button
                              onClick={() => openEntry(rc)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-2xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                            >
                              Open<ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {isOpen && (
                          <Reveal className="border-t border-line bg-cream-50/70 px-4 py-3">
                            <div id={detailId} className="grid gap-2.5 sm:grid-cols-2">
                              <div className="rounded-xl border border-line bg-white p-3">
                                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                                  {rc.status === 'Conflict' ? 'Rule A condition' : 'Condition'}
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-ink-700">
                                  {rc.source1?.requirement || 'No condition text stored.'}
                                </p>
                                <p className="mt-1.5 truncate text-2xs text-muted">{rc.source1?.name}</p>
                              </div>
                              {rc.source2 && (
                                <div className="rounded-xl border border-line bg-white p-3">
                                  <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                                    {rc.status === 'Conflict' ? 'Rule B condition' : 'Source passage'}
                                  </p>
                                  <p className="mt-1 text-xs leading-relaxed text-ink-700">
                                    {rc.source2.requirement || 'No text stored.'}
                                  </p>
                                  <p className="mt-1.5 truncate text-2xs text-muted">{rc.source2.name}</p>
                                </div>
                              )}
                            </div>
                            {rc.impact && (
                              <p className="mt-2.5 text-2xs leading-relaxed text-muted">{rc.impact}</p>
                            )}
                          </Reveal>
                        )}
                      </div>
                    </div>
                  </AnimatedCard>
                </Reveal>
              );
            })
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-2xs text-muted">
            Showing {filtered.length} of {ruleConflicts.length} entries.
          </p>
        )}
      </div>

      {/* Detail drawer */}
      <AnimatedDrawer
        open={isDrawerOpen && !!activeEntry}
        onClose={() => setIsDrawerOpen(false)}
        title={activeEntry?.title ?? 'Rule'}
        subtitle={activeEntry ? `${activeEntry.category} · ${activeEntry.ruleVersion}` : undefined}
        width={480}
        footer={
          activeEntry ? (
            <div className="space-y-2">
              {activeEntry.status === 'Conflict' && !activeEntry.reviewed && (
                <button
                  onClick={handleResolve}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  <Check className="h-3.5 w-3.5" />
                  Mark conflict as reviewed
                </button>
              )}
              {activeEntry.status === 'Review Required' && activeEntry.category !== 'Exceptions' && (
                <button
                  onClick={handleResolve}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  <Check className="h-3.5 w-3.5" />
                  Confirm rule as active
                </button>
              )}
              {activeEntry.status === 'Conflict' && activeEntry.reviewed && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-sage-200 bg-sage-50 py-2 text-xs font-semibold text-sage-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Reviewed{activeEntry.reviewedBy ? ` by ${activeEntry.reviewedBy}` : ''}
                </div>
              )}
              {(activeEntry.status === 'Active' || activeEntry.category === 'Exceptions') && (
                <p className="rounded-xl border border-line bg-cream-50 px-3 py-2 text-center text-2xs text-muted">
                  {activeEntry.category === 'Exceptions'
                    ? 'This override is managed from the Exceptions approval centre.'
                    : 'This rule is active. Change it from the rule editor or test it in the sandbox.'}
                </p>
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
        {activeEntry && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={STATUS_CLASS[activeEntry.status]}>
                {activeEntry.category === 'Exceptions' ? 'Exception override' : STATUS_LABEL[activeEntry.status]}
              </span>
              <span className="rounded-full bg-cream-100 px-2 py-0.5 text-2xs font-medium text-ink-700">
                {activeEntry.ruleVersion}
              </span>
              <span className="text-2xs text-muted">Effective {activeEntry.date}</span>
            </div>

            <p className="text-xs leading-relaxed text-muted">{activeEntry.description}</p>

            {activeEntry.status === 'Conflict' ? (
              <div>
                <SectionHeader
                  title="Conflicting conditions"
                  subtitle="Both rules are stored as written. The console does not pick a winner."
                />
                <div className="mt-3 space-y-2">
                  <div className="rounded-xl border border-terracotta-200 bg-terracotta-50/60 p-3">
                    <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-terracotta-700">
                      Rule A
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-700">
                      {activeEntry.source1?.requirement || 'No condition text stored.'}
                    </p>
                    <p className="mt-1.5 text-2xs text-muted">{activeEntry.source1?.name}</p>
                  </div>

                  <div className="flex items-center justify-center gap-2 py-0.5">
                    <span className="h-px flex-1 bg-line" />
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warn-50 text-warn-600">
                      <Zap className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
                      contradicts
                    </span>
                    <span className="h-px flex-1 bg-line" />
                  </div>

                  <div className="rounded-xl border border-olive-200 bg-olive-50/60 p-3">
                    <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-olive-700">
                      Rule B
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-700">
                      {activeEntry.source2?.requirement || 'No condition text stored.'}
                    </p>
                    <p className="mt-1.5 text-2xs text-muted">{activeEntry.source2?.name}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <SectionHeader
                  title={activeEntry.category === 'Exceptions' ? 'Override' : 'Rule condition'}
                  subtitle={activeEntry.source1?.name}
                />
                <div className="mt-2 rounded-xl border border-line bg-cream-50 p-3 text-xs leading-relaxed text-ink-700">
                  {activeEntry.source1?.requirement || 'No condition text stored.'}
                </div>
                {activeEntry.source2 && (
                  <div className="mt-2 rounded-xl border border-line p-3">
                    <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                      {activeEntry.source2.name}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-700">
                      {activeEntry.source2.requirement}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeEntry.impact && (
              <div className="rounded-xl border border-line bg-white p-3">
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Impact</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-700">{activeEntry.impact}</p>
              </div>
            )}

            {activeEntry.recommendedAction && (
              <div className="flex items-start gap-2 rounded-xl border border-warn-200 bg-warn-50/70 p-3">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn-600" />
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-warn-700">
                    Recorded next step
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-700">
                    {activeEntry.recommendedAction}
                  </p>
                </div>
              </div>
            )}

            {activeEntry.status === 'Conflict' && activeEntry.reviewed && activeEntry.reviewedAt && (
              <p className="text-2xs text-muted">
                Reviewed {activeEntry.reviewedAt}
                {activeEntry.reviewedBy ? ` by ${activeEntry.reviewedBy}` : ''}. Reviewing a conflict
                records the decision; it does not alter either rule.
              </p>
            )}
          </div>
        )}
      </AnimatedDrawer>
    </div>
  );
};
