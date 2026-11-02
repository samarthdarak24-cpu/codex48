/**
 * Review Queue — the decision workspace.
 *
 * Cards, counts, findings summaries and the activity feed are all derived from
 * `useApp()`. There are no sample comments and no placeholder evidence: a tab
 * with nothing stored says so.
 */
import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, CircleAlert, Clock,
  Download, Eye, GitCompare, Lock, MessageSquare, Search, User, Wand2, X,
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
        subtitle={
          activeSub
            ? `${activeSub.campaign} · ${activeSub.version ?? 'v1.0'} · ${activeSub.assetType ?? activeSub.type ?? 'content'}`
            : undefined
        }
        width={440}
        footer={
          activeSub ? (
            <div className="space-y-2.5">
              <textarea
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
                placeholder="Add a note for this decision…"
                rows={2}
                className="w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/40"
              />
              <div className="flex items-center gap-2">
                <select
                  value={decisionChoice}
                  onChange={(e) => setDecisionChoice(e.target.value)}
                  aria-label="Decision"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-white px-2.5 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand-300/40"
                >
                  <option>Request Changes</option>
                  <option>Approve Version</option>
                  <option>Reject</option>
                </select>
                <AnimatedButton onClick={() => handleDecision()} className="shrink-0 px-4 py-2 text-xs">
                  Submit
                </AnimatedButton>
              </div>
            </div>
          ) : null
        }
      >
        {activeSub && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-line">
              <img src={activeSub.thumbnail} alt="" className="h-40 w-full object-cover" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={activeSub.status} />
              <span className={`${PRIORITY_CLASS[activeSub.priority ?? 'Medium'] ?? 'badge-medium'}`}>
                {activeSub.priority ?? 'Medium'}
              </span>
              <span className="text-2xs text-muted">
                Submitted {activeSub.submittedAt ?? activeSub.submittedDate ?? '—'}
              </span>
            </div>

            {lastDecision && (
              <motion.div
                key={lastDecision}
                role="status"
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-2xs font-medium ${
                  decisionTone === 'sage'
                    ? 'border-sage-200 bg-sage-50 text-sage-700'
                    : decisionTone === 'danger'
                      ? 'border-danger-200 bg-danger-50 text-danger-700'
                      : 'border-warn-200 bg-warn-50 text-warn-700'
                }`}
                style={{
                  boxShadow: decisionTone === 'sage'
                    ? '0 0 22px -10px rgba(78,122,61,.65)'
                    : decisionTone === 'danger'
                      ? '0 0 22px -10px rgba(194,84,70,.65)'
                      : '0 0 22px -10px rgba(196,137,28,.65)',
                }}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={
                  reduce
                    ? { opacity: 1, y: 0 }
                    : decisionTone === 'danger'
                      ? { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }
                      : { opacity: 1, y: 0, x: 0 }
                }
                transition={{ duration: 0.4, ease: EASE }}
              >
                <SuccessCheck size={14} />
                {lastDecision} recorded. The board refreshes from the server.
              </motion.div>
            )}

            <div className="grid grid-cols-4 gap-1.5">
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

            {activeTab === 'Findings' && (
              <div className="space-y-2.5">
                {activeSub.findings && activeSub.findings.length > 0 ? (
                  activeSub.findings.map((f) => (
                    <div
                      key={f.id}
                      className={`rounded-xl border p-3 ${
                        f.type === 'error'
                          ? 'border-danger-200 bg-danger-50/60'
                          : f.type === 'warning'
                            ? 'border-warn-200 bg-warn-50/60'
                            : 'border-sage-200 bg-sage-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                          {f.type === 'error' ? (
                            <CircleAlert className="h-3.5 w-3.5 shrink-0 text-danger-500" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warn-500" />
                          )}
                          {f.title}
                        </p>
                        <span className={`${f.type === 'error' ? 'badge-rejected' : 'badge-medium'} shrink-0`}>
                          {f.badge ?? f.type}
                        </span>
                      </div>
                      <p className="mt-1 text-2xs leading-relaxed text-ink-600">{f.description}</p>
                      {f.guidelineRef && (
                        <p className="mt-1 text-2xs text-muted-light">{f.guidelineRef}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-sage-200 bg-sage-50 px-3 py-3 text-2xs text-sage-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    No compliance violations found.
                  </div>
                )}

                <div className="border-t border-line pt-3">
                  <AnimatedProgress
                    value={activeSub.complianceScore}
                    max={100}
                    tone={activeSub.complianceScore >= 80 ? 'sage' : activeSub.complianceScore >= 50 ? 'amber' : 'danger'}
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
                    <div key={ref} className="rounded-xl border border-line bg-cream-50 p-3">
                      <p className="text-2xs font-semibold text-ink">Cited guideline passage</p>
                      <p className="mt-0.5 text-2xs leading-relaxed text-muted">{ref}</p>
                    </div>
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
                      <img src={c.avatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="text-2xs font-semibold text-ink">
                          {c.author} <span className="font-normal text-muted-light">{c.time}</span>
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

            {/* Quick decisions */}
            <div className="border-t border-line pt-3">
              <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.05em] text-muted">Quick decision</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleDecision('Request Changes')}
                  className="rounded-xl border border-terracotta-300 py-2 text-2xs font-semibold text-terracotta-700 transition-colors hover:bg-terracotta-50"
                >
                  Request changes
                </button>
                <button
                  onClick={() => handleDecision('Reject')}
                  className="rounded-xl border border-danger-300 py-2 text-2xs font-semibold text-danger-700 transition-colors hover:bg-danger-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleDecision('Approve Version')}
                  className="rounded-xl bg-brand-600 py-2 text-2xs font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatedDrawer>
    </PageTransition>
  );
};
