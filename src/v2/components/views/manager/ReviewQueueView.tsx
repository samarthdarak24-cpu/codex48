/**
 * Review Queue — the decision workspace.
 *
 * Cards, counts, findings summaries and the activity feed are all derived from
 * `useApp()`. There are no sample comments and no placeholder evidence: a tab
 * with nothing stored says so.
 */
import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Calendar, CheckCircle2, ChevronDown, CircleAlert, ClipboardCheck,
  Clock, Download, Eye, FileText, Gavel, GitCompare, Lock, MessageSquare, Search, Send, Sparkles,
  Tag, User, Wand2, X,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { Submission, SubmissionStatus } from '../../../types';
import { motion, useReducedMotion } from 'motion/react';
import {
  AnimatedBadge, AnimatedButton, AnimatedCard, AnimatedCounter, AnimatedDrawer,
  AnimatedProgress, EASE, FilterPills, PageTransition, SectionHeader, Stagger, StaggerItem,
  SuccessCheck, type Tone,
} from '../../motion';
import {
  ActionFooter, DetailHeader, EvidenceCard, FlowStep, FooterButton, InfoCard, MetadataRow,
  MetaChip, StatusBadge, VisualFlow, type DetailTone,
} from '../../detail';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STATUS_TONE: Record<string, Tone> = {
  Approved: 'sage',
  'In Review': 'brand',
  Pending: 'amber',
  'Needs Changes': 'terracotta',
  Rejected: 'danger',
};

const PRIORITY_CLASS: Record<string, string> = {
  Critical: 'badge-critical',
  High: 'badge-high',
  Medium: 'badge-medium',
  Low: 'badge-low',
};

const PRIORITY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/** One sentence per state answering "why is this in front of me?" */
const OVERVIEW: Record<SubmissionStatus, { title: string; body: string }> = {
  'In Review': {
    title: 'Waiting on a reviewer decision',
    body: 'AI review has finished and the findings are stored against this version. Nothing about the submission changes until a manager records a decision.',
  },
  'Needs Changes': {
    title: 'Returned to the creator',
    body: 'The flagged issues have to be fixed and resubmitted. This version stays on the record as the reference point the next version is compared against.',
  },
  Approved: {
    title: 'Approved and publishable',
    body: 'This version passed review and may be published. The approval is written to the audit history against your name and note.',
  },
  Rejected: {
    title: 'Rejected — do not publish',
    body: 'A reviewer rejected this version. It remains in the record with the note that explains the decision.',
  },
  Pending: {
    title: 'Not reviewed yet',
    body: 'The submission is queued but no AI review has been attached to it yet, so there are no findings to weigh.',
  },
};

const PRIORITY_TONE: Record<string, DetailTone> = {
  Critical: 'danger',
  High: 'terracotta',
  Medium: 'amber',
  Low: 'neutral',
};

/** Five-state status enum, so each state keeps its own tone and exact label. */
const StatusPill: React.FC<{ status: string }> = ({ status }) => (
  <AnimatedBadge tone={STATUS_TONE[status] ?? 'amber'} className="shrink-0">
    {status}
  </AnimatedBadge>
);

type Column = {
  key: SubmissionStatus[];
  label: string;
  accent: string;
  bg: string;
  tone: Tone;
};

const COLUMNS: Column[] = [
  { key: ['In Review', 'Pending'], label: 'In review', accent: 'bg-olive-400', bg: 'bg-olive-50/50', tone: 'olive' },
  { key: ['Needs Changes'], label: 'Needs changes', accent: 'bg-terracotta-400', bg: 'bg-terracotta-50/40', tone: 'terracotta' },
  { key: ['Approved'], label: 'Approved', accent: 'bg-sage-500', bg: 'bg-sage-50/50', tone: 'sage' },
  { key: ['Rejected'], label: 'Rejected', accent: 'bg-danger-400', bg: 'bg-danger-50/40', tone: 'danger' },
];

const FILTERS: { id: 'All' | SubmissionStatus; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'In Review', label: 'In review' },
  { id: 'Needs Changes', label: 'Needs changes' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Rejected', label: 'Rejected' },
];

type SortKey = 'newest' | 'priority' | 'score';

const timestampOf = (s: Submission): number => {
  const raw = s.submittedAt ?? s.submittedDate;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export const ReviewQueueView: React.FC = () => {
  const {
    role, submissions, auditEvents, loading, error, searchQuery,
    selectedSubmission, setSelectedSubmission, updateSubmissionStatus,
    setIsAiCompareOpen, addToast,
  } = useApp();

  const [query, setQuery] = useState(searchQuery);
  const [statusFilter, setStatusFilter] = useState<'All' | SubmissionStatus>('All');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'Findings' | 'Evidence' | 'Comments'>('Findings');
  const [feedTab, setFeedTab] = useState<'Comments' | 'Activity'>('Comments');
  const [decisionChoice, setDecisionChoice] = useState('Request Changes');
  const [managerNote, setManagerNote] = useState('');
  const [lastDecision, setLastDecision] = useState<string | null>(null);
  const reduce = useReducedMotion();

  /* Drives the confirmation banner's colour, glow and shake. */
  const decisionTone: Tone = lastDecision?.startsWith('Approve')
    ? 'sage'
    : lastDecision?.startsWith('Reject')
      ? 'danger'
      : 'amber';

  const activeSub = selectedSubmission ?? submissions[0] ?? undefined;

  /* ---- Real filtering ---- */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = submissions.filter((s) => {
      if (statusFilter !== 'All') {
        if (statusFilter === 'In Review') {
          if (s.status !== 'In Review' && s.status !== 'Pending') return false;
        } else if (s.status !== statusFilter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.campaign.toLowerCase().includes(q) ||
        s.creator.name.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortKey === 'priority') {
        return (PRIORITY_RANK[a.priority ?? 'Medium'] ?? 2) - (PRIORITY_RANK[b.priority ?? 'Medium'] ?? 2);
      }
      if (sortKey === 'score') return a.complianceScore - b.complianceScore;
      return timestampOf(b) - timestampOf(a);
    });
  }, [submissions, query, statusFilter, sortKey]);

  /* ---- Findings summary, computed from the visible queue ---- */
  const summary = useMemo(() => {
    let violations = 0;
    let warnings = 0;
    let clean = 0;
    for (const s of visible) {
      const f = s.findings ?? [];
      const errors = f.filter((x) => x.type === 'error').length;
      const warns = f.filter((x) => x.type === 'warning').length;
      violations += errors;
      warnings += warns;
      if (f.length === 0) clean += 1;
    }
    return { violations, warnings, clean };
  }, [visible]);

  const counts = useMemo(() => {
    const inReview = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending').length;
    const needsChanges = submissions.filter((s) => s.status === 'Needs Changes').length;
    const approved = submissions.filter((s) => s.status === 'Approved').length;
    const rejected = submissions.filter((s) => s.status === 'Rejected').length;
    return { All: submissions.length, 'In Review': inReview, 'Needs Changes': needsChanges, Approved: approved, Rejected: rejected } as Record<string, number>;
  }, [submissions]);

  const comments = activeSub?.comments ?? [];
  const activity = auditEvents.slice(0, 6);

  const openInspector = (sub: Submission) => {
    setSelectedSubmission(sub);
    setActiveTab('Findings');
    setLastDecision(null);
    setInspectorOpen(true);
  };

  const handleDecision = (choice: string = decisionChoice) => {
    if (!activeSub) return;
    const statusMap: Record<string, SubmissionStatus> = {
      'Approve Version': 'Approved',
      'Request Changes': 'Needs Changes',
      Reject: 'Rejected',
    };
    const mapped = statusMap[choice] ?? 'Needs Changes';
    updateSubmissionStatus(activeSub.id, mapped, managerNote);
    setManagerNote('');
    setLastDecision(`${choice} · ${activeSub.title}`);
  };

  const evidenceRefs = useMemo(() => {
    if (!activeSub?.findings) return [];
    return Array.from(new Set(activeSub.findings.map((f) => f.guidelineRef).filter(Boolean))) as string[];
  }, [activeSub]);

  /* ---- Detail-panel presentation (all derived from stored fields) ---- */

  const subTone: DetailTone = !activeSub
    ? 'brand'
    : activeSub.status === 'Approved'
      ? 'sage'
      : activeSub.status === 'Rejected'
        ? 'danger'
        : activeSub.status === 'Needs Changes'
          ? 'terracotta'
          : activeSub.status === 'Pending'
            ? 'amber'
            : 'brand';

  const severity = useMemo(() => {
    const list = activeSub?.findings ?? [];
    return {
      errors: list.filter((f) => f.type === 'error').length,
      warnings: list.filter((f) => f.type === 'warning').length,
      passed: list.filter((f) => f.type === 'success' || f.type === 'passed').length,
    };
  }, [activeSub]);

  const findingsTone: DetailTone =
    severity.errors > 0 ? 'danger' : severity.warnings > 0 ? 'amber' : 'sage';

  const overview = OVERVIEW[activeSub?.status ?? 'Pending'];

  /** What the platform does next, stated only from the stored status. */
  const nextStep = !activeSub
    ? ''
    : activeSub.status === 'Approved'
      ? 'The asset is cleared for publishing. Any later edit creates a new version that re-enters the queue.'
      : activeSub.status === 'Rejected'
        ? 'The creator is notified and the version is closed. A new submission is needed to try again.'
        : activeSub.status === 'Needs Changes'
          ? 'The creator fixes the findings and resubmits; the new version is scored from scratch.'
          : 'A manager records one of three decisions: approve the version, request changes, or reject it.';

  /* ---- States ---- */

  if (role !== 'manager') {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-10 text-center shadow-card">
          <Lock className="mx-auto h-8 w-8 text-muted-light" />
          <h1 className="mt-3 text-lg font-semibold text-ink">Manager access only</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            The review queue is where brand managers record decisions. Your current role is {role}.
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
          <div className="h-10 animate-pulse rounded-2xl bg-cream-100" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-cream-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

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
              Decision workspace
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">Review Queue</h1>
            <p className="mt-1 text-sm text-muted">
              Review content, verify evidence, and record brand decisions.
            </p>
          </div>
          <button
            onClick={() => setIsAiCompareOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-olive-200 bg-olive-50 px-3.5 py-2.5 text-xs font-semibold text-olive-700 transition-colors hover:bg-olive-100"
          >
            <Wand2 className="h-3.5 w-3.5" />
            AI Compare
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            <FilterPills
              options={FILTERS.map((f) => ({ id: f.id, label: `${f.label} (${counts[f.id] ?? 0})` }))}
              selected={[statusFilter]}
              onChange={(sel) => {
                const next = sel.filter((id) => id !== statusFilter);
                setStatusFilter((next[next.length - 1] as 'All' | SubmissionStatus) ?? 'All');
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-light" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search submissions…"
                aria-label="Search submissions"
                className="w-full rounded-xl border border-line bg-white py-1.5 pl-8 pr-8 text-xs text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/40 sm:w-56"
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
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                aria-label="Sort submissions"
                className="appearance-none rounded-xl border border-line bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-300/40"
              >
                <option value="newest">Newest first</option>
                <option value="priority">Priority</option>
                <option value="score">Lowest score</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-light" />
            </div>
          </div>
        </div>

        {/* Findings summary — real counts for what is on screen */}
        <Stagger className="grid gap-3 sm:grid-cols-3">
          <StaggerItem>
            <AnimatedCard className="p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-2xs font-medium text-muted">Violations in view</p>
                <CircleAlert className="h-4 w-4 text-danger-500" />
              </div>
              <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
                <AnimatedCounter value={summary.violations} />
              </p>
              <p className="mt-0.5 text-2xs text-muted">Deterministic rule failures</p>
            </AnimatedCard>
          </StaggerItem>
          <StaggerItem>
            <AnimatedCard className="p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-2xs font-medium text-muted">Needs human review</p>
                <AlertTriangle className="h-4 w-4 text-warn-500" />
              </div>
              <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
                <AnimatedCounter value={summary.warnings} />
              </p>
              <p className="mt-0.5 text-2xs text-muted">Warnings the engine could not settle</p>
            </AnimatedCard>
          </StaggerItem>
          <StaggerItem>
            <AnimatedCard className="p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-2xs font-medium text-muted">Clean submissions</p>
                <CheckCircle2 className="h-4 w-4 text-sage-500" />
              </div>
              <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
                <AnimatedCounter value={summary.clean} />
              </p>
              <p className="mt-0.5 text-2xs text-muted">No findings recorded</p>
            </AnimatedCard>
          </StaggerItem>
        </Stagger>

        {/* Kanban */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const cards = visible.filter((s) => col.key.includes(s.status));
            return (
              <section
                key={col.label}
                className={`${col.bg} rounded-2xl border border-line/70 p-2.5`}
                aria-label={`${col.label} column`}
              >
                <div className="mb-2 flex items-center justify-between px-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.accent}`} aria-hidden="true" />
                    <h2 className="text-xs font-semibold text-ink">{col.label}</h2>
                  </div>
                  <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-2xs font-semibold tabular-nums text-ink-600">
                    {cards.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {cards.length === 0 && (
                    <p className="rounded-xl border border-dashed border-line bg-white/60 px-3 py-6 text-center text-2xs text-muted">
                      Nothing here
                    </p>
                  )}
                  {cards.map((card) => {
                    const isSelected = activeSub?.id === card.id;
                    return (
                      <motion.button
                        key={card.id}
                        onClick={() => openInspector(card)}
                        aria-label={`Open review panel for ${card.title}`}
                        className={`w-full rounded-xl border bg-white p-2.5 text-left transition-colors ${
                          isSelected
                            ? 'border-brand-300 ring-1 ring-brand-200'
                            : 'border-line hover:border-line-strong'
                        }`}
                        whileHover={reduce ? undefined : { y: -2 }}
                        whileTap={reduce ? undefined : { scale: 0.995 }}
                        transition={{ duration: 0.2, ease: EASE }}
                      >
                        <div className="flex gap-2.5">
                          <img
                            src={card.thumbnail}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-ink">{card.title}</p>
                            <p className="mt-0.5 truncate text-2xs text-muted">{card.campaign}</p>
                            <p className="mt-1 flex items-center gap-1 truncate text-2xs text-muted-light">
                              <User className="h-3 w-3 shrink-0" />
                              {card.creator.name}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-1 border-t border-line/70 pt-2">
                          {(card.findingsCount ?? card.findings?.length ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-danger-50 px-1.5 py-0.5 text-[10px] font-semibold text-danger-700">
                              <CircleAlert className="h-2.5 w-2.5" />
                              {card.findingsCount ?? card.findings?.length} findings
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sage-600">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Clean
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[10px] text-muted-light">
                            <Clock className="h-3 w-3" />
                            {card.relativeTime ?? '—'}
                          </span>
                        </div>

                        <div className="mt-1.5">
                          <span className={`${PRIORITY_CLASS[card.priority ?? 'Medium'] ?? 'badge-medium'} text-[10px]`}>
                            {card.priority ?? 'Medium'}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Feed */}
        <AnimatedCard className="p-4">
          <SectionHeader
            title="Discussion"
            subtitle={
              activeSub
                ? `Comments and audit activity for ${activeSub.title}`
                : 'Select a submission to read its thread'
            }
          />
          <div className="mt-3 flex gap-4 border-b border-line">
            {(['Comments', 'Activity'] as const).map((tab) => {
              const count = tab === 'Comments' ? comments.length : activity.length;
              const isActive = feedTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setFeedTab(tab)}
                  aria-pressed={isActive}
                  className={`-mb-px border-b-2 pb-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  {tab}
                  <span className="ml-1 text-2xs text-muted-light">({count})</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-2xs text-muted">
            {feedTab === 'Comments'
              ? 'Recorded comments on the selected submission.'
              : 'Latest entries from the audit trail.'}
          </p>

          <div className="mt-3 space-y-3">
            {feedTab === 'Comments' ? (
              comments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line bg-cream-50 px-4 py-6 text-center">
                  <MessageSquare className="mx-auto h-5 w-5 text-muted-light" />
                  <p className="mt-2 text-xs font-medium text-ink-600">No comments on this version</p>
                  <p className="mt-0.5 text-2xs text-muted">Reviewer notes appear here once they are stored.</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <img src={c.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-line" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink">{c.author}</span>
                        <span className="text-2xs text-muted-light">{c.time}</span>
                      </div>
                      <p className="mt-0.5 text-2xs leading-relaxed text-ink-600">{c.text}</p>
                    </div>
                  </div>
                ))
              )
            ) : activity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-cream-50 px-4 py-6 text-center">
                <Clock className="mx-auto h-5 w-5 text-muted-light" />
                <p className="mt-2 text-xs font-medium text-ink-600">No audit activity yet</p>
                <p className="mt-0.5 text-2xs text-muted">Recorded events will appear here.</p>
              </div>
            ) : (
              activity.map((e) => (
                <div key={e.id} className="flex items-start gap-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-olive-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-ink">
                      {e.action} · {e.details || e.module}
                    </p>
                    <p className="mt-0.5 text-2xs text-muted">
                      {e.user.name} · {e.time || e.date}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </AnimatedCard>
      </div>

      {/* Inspector */}
      <AnimatedDrawer
        open={inspectorOpen && Boolean(activeSub)}
        onClose={() => setInspectorOpen(false)}
        title={activeSub?.title ?? 'Submission'}
        width={500}
        header={
          activeSub ? (
            <DetailHeader
              tone={subTone}
              icon={<ClipboardCheck className="h-5 w-5" />}
              eyebrow={`${activeSub.campaign} · ${activeSub.version ?? 'v1.0'}`}
              title={activeSub.title}
              description={
                activeSub.description ??
                `${activeSub.assetType ?? activeSub.type ?? 'Content'} submitted for brand review.`
              }
              onClose={() => setInspectorOpen(false)}
              badges={
                <>
                  <StatusBadge tone={subTone} label={activeSub.status} />
                  <StatusBadge
                    tone={PRIORITY_TONE[activeSub.priority ?? 'Medium'] ?? 'amber'}
                    label={`${activeSub.priority ?? 'Medium'} priority`}
                    dot={false}
                  />
                  <MetaChip>{activeSub.complianceScore}% compliance</MetaChip>
                </>
              }
              meta={
                <>
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {activeSub.creator.name}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {activeSub.submittedAt ?? activeSub.submittedDate ?? 'Not recorded'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {activeSub.assetType ?? activeSub.type ?? 'Content'}
                  </span>
                </>
              }
            />
          ) : undefined
        }
        footer={
          activeSub ? (
            <ActionFooter
              note={
                lastDecision
                  ? `${lastDecision} recorded. The board refreshes from the server.`
                  : 'Your note is stored with the decision in the audit history.'
              }
            >
              <textarea
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
                placeholder="Add a note for this decision…"
                rows={2}
                aria-label="Reviewer note"
                className="w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/40"
              />
              <div className="flex items-center gap-2">
                <select
                  value={decisionChoice}
                  onChange={(e) => setDecisionChoice(e.target.value)}
                  aria-label="Decision"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-white px-2.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand-300/40"
                >
                  <option>Request Changes</option>
                  <option>Approve Version</option>
                  <option>Reject</option>
                </select>
                <FooterButton
                  variant="primary"
                  onClick={() => handleDecision()}
                  icon={<Send className="h-3.5 w-3.5" />}
                  className="w-auto shrink-0 px-4"
                >
                  Record decision
                </FooterButton>
              </div>
            </ActionFooter>
          ) : null
        }
      >
        {activeSub && (
          <div className="space-y-5">
            {/* What this is, and why it is in front of a reviewer */}
            <InfoCard
              tone={subTone}
              icon={<ClipboardCheck className="h-3.5 w-3.5" />}
              eyebrow="At a glance"
              title={overview.title}
            >
              {overview.body}
            </InfoCard>

            {/* The review chain, one node per stored field */}
            <div>
              <SectionHeader
                title="How this review got here"
                subtitle="Each step is a value stored against this submission."
              />
              <VisualFlow className="mt-3">
                <FlowStep
                  index={0}
                  tone="brand"
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label="Step 1 · Submitted"
                  title={activeSub.title}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <MetaChip>{activeSub.campaign}</MetaChip>
                    <MetaChip>{activeSub.version ?? 'v1.0'}</MetaChip>
                    <MetaChip>{activeSub.assetType ?? activeSub.type ?? 'Content'}</MetaChip>
                  </div>
                </FlowStep>

                <FlowStep
                  index={1}
                  tone="sage"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  label="Step 2 · AI review"
                  title={`Scored ${activeSub.complianceScore}% against the guideline set`}
                >
                  {activeSub.findings && activeSub.findings.length > 0
                    ? `${activeSub.findings.length} finding${activeSub.findings.length === 1 ? '' : 's'} stored against this version.`
                    : 'No findings are stored against this version.'}
                </FlowStep>

                <FlowStep
                  index={2}
                  tone={findingsTone}
                  icon={
                    severity.errors > 0 ? (
                      <CircleAlert className="h-3.5 w-3.5" />
                    ) : severity.warnings > 0 ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )
                  }
                  label="Step 3 · Findings"
                  title={
                    severity.errors > 0
                      ? `${severity.errors} violation${severity.errors === 1 ? '' : 's'} to resolve`
                      : severity.warnings > 0
                        ? `${severity.warnings} warning${severity.warnings === 1 ? '' : 's'} to weigh`
                        : 'No violations found'
                  }
                  action={
                    <button
                      type="button"
                      onClick={() => setActiveTab('Findings')}
                      className="inline-flex items-center gap-1 text-2xs font-semibold text-ink-700 underline-offset-2 hover:underline"
                    >
                      Open findings
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  }
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <MetaChip>{severity.errors} errors</MetaChip>
                    <MetaChip>{severity.warnings} warnings</MetaChip>
                    {severity.passed > 0 && <MetaChip>{severity.passed} passed</MetaChip>}
                  </div>
                </FlowStep>

                <FlowStep
                  index={3}
                  tone={lastDecision ? decisionTone : 'amber'}
                  icon={<Gavel className="h-3.5 w-3.5" />}
                  label="Step 4 · Reviewer decision"
                  title={lastDecision ? lastDecision : 'Awaiting a manager decision'}
                >
                  {lastDecision
                    ? managerNote
                      ? `Note recorded: “${managerNote}”`
                      : 'The decision has been written to the submission record.'
                    : 'Approve the version, request changes, or reject it from the actions below.'}
                </FlowStep>

                <FlowStep
                  index={4}
                  isLast
                  tone="olive"
                  icon={<ArrowRight className="h-3.5 w-3.5" />}
                  label="Step 5 · What happens next"
                >
                  {nextStep}
                </FlowStep>
              </VisualFlow>
            </div>

            {/* The actual asset */}
            <div>
              <SectionHeader title="Submitted asset" subtitle="The file this review was run against." />
              <div className="mt-2 overflow-hidden rounded-xl border border-line bg-cream-50">
                {activeSub.thumbnail ? (
                  <img
                    src={activeSub.thumbnail}
                    alt={`Preview of ${activeSub.title}`}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <p className="px-4 py-8 text-center text-2xs text-muted">
                    No preview image is stored for this submission.
                  </p>
                )}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {[
                  {
                    icon: <Download className="h-3.5 w-3.5" />,
                    label: 'Report',
                    fn: async () => {
                      try {
                        await api.downloadSubmissionReport(activeSub.id, 'text');
                        addToast('Report downloaded.');
                      } catch {
                        addToast('Download failed.', 'error');
                      }
                    },
                  },
                  {
                    icon: <Eye className="h-3.5 w-3.5" />,
                    label: 'Preview',
                    fn: () => activeSub.thumbnail && window.open(activeSub.thumbnail, '_blank'),
                  },
                  {
                    icon: <GitCompare className="h-3.5 w-3.5" />,
                    label: 'Compare',
                    fn: () => setIsAiCompareOpen(true),
                  },
                  {
                    icon: <ArrowRight className="h-3.5 w-3.5" />,
                    label: 'Audit',
                    fn: () => addToast(`Submission ${activeSub.id} · ${activeSub.status}`, 'info'),
                  },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.fn}
                    aria-label={btn.label}
                    className="flex flex-col items-center gap-1 rounded-xl border border-line py-2 text-muted transition-colors hover:bg-cream-50 hover:text-ink"
                  >
                    {btn.icon}
                    <span className="text-[10px] font-semibold">{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Detail tabs */}
            <div>
              <div className="flex gap-4 border-b border-line">
                {(['Findings', 'Evidence', 'Comments'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    aria-pressed={activeTab === tab}
                    className={`-mb-px border-b-2 pb-2 text-xs font-semibold transition-colors ${
                      activeTab === tab
                        ? 'border-brand-600 text-brand-600'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                {activeTab === 'Findings' && (
                  <div className="space-y-2.5">
                    {activeSub.findings && activeSub.findings.length > 0 ? (
                      activeSub.findings.map((f) => (
                        <InfoCard
                          key={f.id}
                          tone={f.type === 'error' ? 'danger' : f.type === 'warning' ? 'amber' : 'sage'}
                          icon={
                            f.type === 'error' ? (
                              <CircleAlert className="h-3.5 w-3.5" />
                            ) : f.type === 'warning' ? (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )
                          }
                          eyebrow={f.badge ?? f.type}
                          title={f.title}
                          meta={f.guidelineRef ? <span>{f.guidelineRef}</span> : undefined}
                        >
                          {f.description}
                        </InfoCard>
                      ))
                    ) : (
                      <InfoCard tone="sage" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                        No compliance violations found for this version.
                      </InfoCard>
                    )}

                    <div className="rounded-xl border border-line bg-white px-3 py-2.5">
                      <AnimatedProgress
                        value={activeSub.complianceScore}
                        max={100}
                        tone={
                          activeSub.complianceScore >= 80
                            ? 'sage'
                            : activeSub.complianceScore >= 50
                              ? 'amber'
                              : 'danger'
                        }
                        label="Compliance score"
                        showValue
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'Evidence' && (
                  <div className="space-y-2">
                    {evidenceRefs.length > 0 ? (
                      evidenceRefs.map((ref) => (
                        <EvidenceCard
                          key={ref}
                          docLabel="Cited guideline"
                          passage={ref}
                          title="Guideline evidence"
                        />
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-line bg-cream-50 px-4 py-6 text-center">
                        <p className="text-xs font-medium text-ink-600">No evidence attached</p>
                        <p className="mt-0.5 text-2xs text-muted">
                          This version has no guideline citations stored against its findings.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Comments' && (
                  <div className="space-y-3">
                    {comments.length > 0 ? (
                      comments.map((c) => (
                        <div key={c.id} className="flex items-start gap-2.5">
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
                      ))
                    ) : (
                      <p className="rounded-xl border border-line bg-cream-50 px-3 py-4 text-center text-2xs text-muted">
                        No comments yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Stored record */}
            <div>
              <SectionHeader title="Stored record" subtitle="Values returned by the submissions service" />
              <dl className="mt-2 rounded-xl border border-line bg-white px-3 py-1.5">
                <MetadataRow label="Submission" value={activeSub.id} icon={<Tag className="h-3 w-3" />} />
                <MetadataRow label="Campaign" value={activeSub.campaign} />
                <MetadataRow label="Version" value={activeSub.version ?? 'v1.0'} />
                <MetadataRow label="Status" value={activeSub.status} tone={subTone} />
                <MetadataRow label="Priority" value={activeSub.priority ?? 'Medium'} />
                <MetadataRow label="Compliance" value={`${activeSub.complianceScore}%`} />
                <MetadataRow
                  label="Submitted"
                  value={activeSub.submittedAt ?? activeSub.submittedDate ?? 'Not recorded'}
                  icon={<Calendar className="h-3 w-3" />}
                />
                <MetadataRow label="Creator" value={activeSub.creator.name} icon={<User className="h-3 w-3" />} />
              </dl>
            </div>
          </div>
        )}
      </AnimatedDrawer>
    </PageTransition>
  );
};
