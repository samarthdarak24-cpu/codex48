import React, { useMemo, useState } from 'react';
import {
  Scale, CheckCircle2, AlertTriangle, Zap, ChevronDown, Calendar, ShieldOff,
  AlertCircle, Lock, FileText, ArrowRight, Check, GitBranch, Flag, FlaskConical,
  Tag, Building2,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../../services/api';
import type { RuleConflict } from '../../../types';
import {
  AnimatedCard, AnimatedCounter, AnimatedDrawer, AnimatedModal, EmptyState, FilterPills, Reveal,
  SectionHeader, SkeletonCard,
} from '../../motion';
import {
  ActionFooter, DetailHeader, EvidenceCard, FlowStep, FooterButton, InfoCard, MetadataRow,
  StatusBadge, VisualFlow, type DetailTone,
} from '../../detail';
import { PdfPreview } from '../../ui/PdfPreview';

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

/**
 * The API returns enforcement as one composed sentence
 * ("Enforcement: X. Scope: Y. Priority: Z."). Splitting it is presentation, not
 * inference — if the shape ever differs we fall back to the raw string rather
 * than guessing.
 */
function parseImpact(impact?: string): {
  enforcement?: string;
  scope?: string;
  priority?: string;
  raw: string;
} | null {
  if (!impact) return null;
  const m = impact.match(/^Enforcement:\s*(.+?)\.\s*Scope:\s*(.+?)\.\s*Priority:\s*(.+?)\.?$/i);
  if (!m) return { raw: impact };
  return { enforcement: m[1], scope: m[2], priority: m[3], raw: impact };
}

/** "Guideline Document (Page 5)" → label + page number. */
function parsePageRef(name?: string): { label?: string; page: number | null } {
  if (!name) return { page: null };
  const m = name.match(/\(Page\s+(\d+)\)/i);
  return { label: name.replace(/\s*\(Page\s+\d+\)/i, '').trim(), page: m ? Number(m[1]) : null };
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
    searchQuery, setSearchQuery, loading, error, role, setActivePage,
  } = useApp();

  const [filterTab, setFilterTab] = useState<Tab>('all');
  const [sortBy, setSortBy] = useState<'title' | 'date'>('date');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);

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

  /* ---- Derived presentation state for the detail panel ---- */
  const entryTone: DetailTone =
    activeEntry?.status === 'Conflict'
      ? 'danger'
      : activeEntry?.status === 'Review Required'
        ? 'amber'
        : activeEntry?.category === 'Exceptions'
          ? 'terracotta'
          : 'sage';

  const entryStatusLabel = !activeEntry
    ? ''
    : activeEntry.category === 'Exceptions'
      ? 'Exception override'
      : STATUS_LABEL[activeEntry.status];

  const overview = !activeEntry
    ? null
    : activeEntry.category === 'Exceptions'
      ? {
          title: 'A documented variance is in force',
          body: 'This override lets a specific campaign depart from a rule. It is scoped and time-bound, and it is reviewed through the Exceptions approval centre.',
        }
      : activeEntry.status === 'Conflict'
        ? {
            title: 'Two stored rules cannot both be satisfied',
            body: 'The engine found contradictory conditions. Reviewing a conflict records a human decision; it never edits either rule.',
          }
        : activeEntry.status === 'Review Required'
          ? {
              title: 'This rule needs a human decision',
              body: 'The condition was extracted from a guideline but has not been confirmed, so the engine will not enforce it until a manager confirms it.',
            }
          : {
              title: 'This rule is in force',
              body: `Every submission evaluated under ${activeEntry.category} is checked against this condition by the rule engine, not by reviewer judgement.`,
            };

  const impact = parseImpact(activeEntry?.impact);
  const evidence = parsePageRef(activeEntry?.source2?.name);
  const conditionText = activeEntry?.source1?.requirement || 'No condition text stored.';

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
        width={520}
        header={
          activeEntry ? (
            <DetailHeader
              tone={entryTone}
              icon={
                activeEntry.category === 'Exceptions' ? (
                  <Scale className="h-5 w-5" />
                ) : (
                  <StatusIcon status={activeEntry.status} className="h-5 w-5" />
                )
              }
              eyebrow={
                activeEntry.category === 'Exceptions' ? 'Exception override' : activeEntry.category
              }
              title={activeEntry.title}
              description={activeEntry.description}
              onClose={() => setIsDrawerOpen(false)}
              badges={
                <>
                  <StatusBadge tone={entryTone} label={entryStatusLabel} />
                  <span className="rounded-full border border-line bg-white px-2 py-0.5 text-2xs font-medium text-ink-700">
                    {activeEntry.ruleVersion}
                  </span>
                  {activeEntry.status === 'Conflict' && activeEntry.reviewed && (
                    <StatusBadge tone="sage" label="Reviewed" />
                  )}
                </>
              }
              meta={
                <>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Effective {activeEntry.date}
                  </span>
                  {activeEntry.reviewedAt && (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Reviewed {activeEntry.reviewedAt}
                    </span>
                  )}
                </>
              }
            />
          ) : undefined
        }
        footer={
          activeEntry ? (
            <ActionFooter
              note={
                activeEntry.category === 'Exceptions'
                  ? 'This override is managed from the Exceptions approval centre.'
                  : activeEntry.status === 'Active'
                    ? 'This rule is active. Change it from the rule editor or test it in the sandbox.'
                    : undefined
              }
            >
              {activeEntry.status === 'Conflict' && !activeEntry.reviewed && (
                <FooterButton
                  variant="primary"
                  icon={<Check className="h-3.5 w-3.5" />}
                  onClick={handleResolve}
                >
                  Mark conflict as reviewed
                </FooterButton>
              )}
              {activeEntry.status === 'Review Required' && activeEntry.category !== 'Exceptions' && (
                <FooterButton
                  variant="primary"
                  icon={<Check className="h-3.5 w-3.5" />}
                  onClick={handleResolve}
                >
                  Confirm rule as active
                </FooterButton>
              )}
              {activeEntry.status === 'Conflict' && activeEntry.reviewed && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-sage-200 bg-sage-50 py-2 text-xs font-semibold text-sage-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Reviewed{activeEntry.reviewedBy ? ` by ${activeEntry.reviewedBy}` : ''}
                </div>
              )}

              <div className="flex gap-2">
                {activeEntry.relatedDoc && (
                  <div className="flex-1">
                    <FooterButton
                      icon={<FileText className="h-3.5 w-3.5" />}
                      onClick={() => setSourceOpen(true)}
                    >
                      View source
                    </FooterButton>
                  </div>
                )}
                {activeEntry.category !== 'Exceptions' && (
                  <div className="flex-1">
                    <FooterButton
                      icon={<FlaskConical className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setIsDrawerOpen(false);
                        setActivePage('sandbox');
                      }}
                    >
                      Test in sandbox
                    </FooterButton>
                  </div>
                )}
              </div>

              <FooterButton onClick={() => setIsDrawerOpen(false)}>Close</FooterButton>
            </ActionFooter>
          ) : undefined
        }
      >
        {activeEntry && (
          <div className="space-y-5">
            {/* Overview — what this is and why it matters */}
            {overview && (
              <InfoCard
                tone={entryTone}
                icon={<StatusIcon status={activeEntry.status} className="h-3.5 w-3.5" />}
                eyebrow="At a glance"
                title={overview.title}
              >
                {overview.body}
              </InfoCard>
            )}

            {activeEntry.status === 'Conflict' ? (
              <>
                <div>
                  <SectionHeader
                    title="Conflicting conditions"
                    subtitle="Both rules are stored as written. The console does not pick a winner."
                  />
                  <div className="mt-3 space-y-2">
                    <EvidenceCard
                      tone="terracotta"
                      title="Rule A"
                      docLabel={activeEntry.source1?.name}
                      passage={activeEntry.source1?.requirement || 'No condition text stored.'}
                    />

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

                    <EvidenceCard
                      tone="olive"
                      title="Rule B"
                      docLabel={activeEntry.source2?.name}
                      passage={activeEntry.source2?.requirement || 'No condition text stored.'}
                    />
                  </div>
                </div>

                {activeEntry.recommendedAction && (
                  <InfoCard
                    tone="amber"
                    icon={<Flag className="h-3.5 w-3.5" />}
                    eyebrow="Recorded next step"
                  >
                    {activeEntry.recommendedAction}
                  </InfoCard>
                )}
              </>
            ) : (
              <div>
                <SectionHeader
                  title="How this rule works"
                  subtitle="Each step below is a field stored on the rule record."
                />
                <VisualFlow className="mt-3">
                  <FlowStep
                    index={0}
                    tone="brand"
                    icon={<Scale className="h-3.5 w-3.5" />}
                    label="Rule definition"
                    title={activeEntry.title}
                  >
                    {activeEntry.description}
                  </FlowStep>

                  <FlowStep
                    index={1}
                    tone="olive"
                    icon={<GitBranch className="h-3.5 w-3.5" />}
                    label="Condition"
                  >
                    {conditionText}
                  </FlowStep>

                  {activeEntry.source2 && (
                    <FlowStep
                      index={2}
                      tone="sage"
                      icon={<FileText className="h-3.5 w-3.5" />}
                      label="Source guideline"
                      action={
                        activeEntry.relatedDoc ? (
                          <button
                            type="button"
                            onClick={() => setSourceOpen(true)}
                            className="inline-flex items-center gap-1 text-2xs font-semibold text-sage-700 underline-offset-2 hover:underline"
                          >
                            Open the document
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        ) : undefined
                      }
                    >
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        {evidence.label && (
                          <span className="rounded-md border border-sage-200/70 bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-sage-700">
                            {evidence.label}
                          </span>
                        )}
                        {evidence.page != null && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-line bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-ink-600">
                            Page {evidence.page}
                          </span>
                        )}
                      </div>
                      <blockquote className="border-l-2 border-sage-300 pl-2.5 text-xs italic leading-relaxed text-ink-700">
                        {activeEntry.source2.requirement || 'No passage stored.'}
                      </blockquote>
                    </FlowStep>
                  )}

                  {impact && (
                    <FlowStep
                      index={3}
                      tone="terracotta"
                      icon={<ShieldOff className="h-3.5 w-3.5" />}
                      label="Enforcement"
                      title={impact.enforcement}
                    >
                      {impact.enforcement ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {impact.scope && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-terracotta-200/70 bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-terracotta-700">
                              <Building2 className="h-2.5 w-2.5" />
                              {impact.scope}
                            </span>
                          )}
                          {impact.priority && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-terracotta-200/70 bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-terracotta-700">
                              <Flag className="h-2.5 w-2.5" />
                              {impact.priority} priority
                            </span>
                          )}
                        </div>
                      ) : (
                        impact.raw
                      )}
                    </FlowStep>
                  )}

                  {activeEntry.recommendedAction && (
                    <FlowStep
                      index={4}
                      isLast
                      tone="amber"
                      icon={<Flag className="h-3.5 w-3.5" />}
                      label="Recorded next step"
                    >
                      {activeEntry.recommendedAction}
                    </FlowStep>
                  )}
                </VisualFlow>
              </div>
            )}

            {/* Stored record */}
            <div>
              <SectionHeader title="Stored record" subtitle="Values returned by the rules service" />
              <dl className="mt-2 rounded-xl border border-line bg-white px-3 py-1.5">
                <MetadataRow label="Category" value={activeEntry.category} icon={<Tag className="h-3 w-3" />} />
                <MetadataRow label="Version" value={activeEntry.ruleVersion} />
                <MetadataRow
                  label="Effective"
                  value={activeEntry.date}
                  icon={<Calendar className="h-3 w-3" />}
                  tone="brand"
                />
                {impact?.scope && <MetadataRow label="Scope" value={impact.scope} />}
                {impact?.priority && <MetadataRow label="Priority" value={impact.priority} />}
                <MetadataRow
                  label="Status"
                  value={entryStatusLabel}
                  tone={entryTone}
                />
              </dl>
            </div>

            {activeEntry.status === 'Conflict' && activeEntry.reviewed && activeEntry.reviewedAt && (
              <p className="text-2xs leading-relaxed text-muted">
                Reviewed {activeEntry.reviewedAt}
                {activeEntry.reviewedBy ? ` by ${activeEntry.reviewedBy}` : ''}. Reviewing a conflict
                records the decision; it does not alter either rule.
              </p>
            )}
          </div>
        )}
      </AnimatedDrawer>

      {/* Source document — the real stored file, not a mock preview */}
      <AnimatedModal
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        title="Source document"
        description={
          activeEntry?.relatedDoc
            ? `Stored guideline referenced by ${activeEntry.title}`
            : 'No source document is linked to this record.'
        }
        maxWidth={760}
      >
        {activeEntry?.relatedDoc ? (
          <PdfPreview
            resetKey={activeEntry.relatedDoc}
            load={() => api.fetchGuidelineBlobUrl(activeEntry.relatedDoc as string)}
            height={520}
            emptyLabel="This rule cites a document that has no stored file, so only the passage above is available."
          />
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-cream-50 px-4 py-12 text-center">
            <FileText className="mx-auto h-6 w-6 text-muted-light" />
            <p className="mt-2 text-xs font-semibold text-ink-600">No document linked</p>
            <p className="mt-0.5 text-2xs text-muted">
              This record does not reference a stored guideline file.
            </p>
          </div>
        )}
      </AnimatedModal>
    </div>
  );
};
