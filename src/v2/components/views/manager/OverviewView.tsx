/**
 * Overview — governance command centre.
 *
 * Every number on this screen is derived from `useApp()` data. There are no
 * hardcoded trends, no decorative sparklines and no placeholder percentages:
 * when a series has no points we say so instead of drawing a fake line.
 */
import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight, CheckCircle2, Clock, FileText, ShieldAlert, AlertTriangle,
  Download, Eye, FileCheck2, Scale, MessageSquare, Lock,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { Submission } from '../../../types';
import {
  AnimatedBadge, AnimatedCard, AnimatedCounter, AnimatedDrawer, AnimatedProgress,
  ChartContainer, EASE, PageTransition, PulseDot, Reveal, SectionHeader, Stagger,
  StaggerItem, SuccessCheck, Timeline, type TimelineItem, type Tone,
} from '../../motion';

/* ------------------------------------------------------------------ */
/* Small honest helpers                                                */
/* ------------------------------------------------------------------ */

function shortDate(value: string | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const STATUS_TONE: Record<string, Tone> = {
  Approved: 'sage',
  'In Review': 'brand',
  Pending: 'amber',
  'Needs Changes': 'terracotta',
  Rejected: 'danger',
};

const STATUS_DOT: Record<string, string> = {
  Approved: 'bg-sage-500',
  'In Review': 'bg-olive-500',
  Pending: 'bg-warn-400',
  'Needs Changes': 'bg-terracotta-500',
  Rejected: 'bg-danger-500',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <AnimatedBadge tone={STATUS_TONE[status] ?? 'amber'} className="shrink-0">
    <span className={`mr-1 h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-muted-light'}`} />
    {status}
  </AnimatedBadge>
);

const PRIORITY_CLASS: Record<string, string> = {
  Critical: 'badge-critical',
  High: 'badge-high',
  Medium: 'badge-medium',
  Low: 'badge-low',
};

function toneFromAction(color: string): Tone {
  if (color === 'emerald') return 'sage';
  if (color === 'rose') return 'danger';
  if (color === 'amber') return 'amber';
  return 'olive';
}

/* ------------------------------------------------------------------ */
/* Trend plot — draws only the points it is given                      */
/* ------------------------------------------------------------------ */

const TrendPlot: React.FC<{ points: { date: string; score: number }[] }> = ({ points }) => {
  const W = 640;
  const H = 150;
  const PAD = 12;
  const y = (score: number) => {
    const clamped = Math.max(0, Math.min(100, score));
    return H - PAD - (clamped / 100) * (H - PAD * 2);
  };
  const x = (i: number) => (points.length <= 1 ? W / 2 : (i / (points.length - 1)) * W);

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' L');
  const area = `M${line} L${W},${H} L0,${H} Z`;
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[150px] w-full"
        role="img"
        aria-label={`Compliance score from ${shortDate(first.date)} to ${shortDate(last.date)}`}
      >
        {[0, 25, 50, 75, 100].map((v) => (
          <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="#F0EBDF" strokeWidth="1" />
        ))}
        <path d={area} fill="#4E7A3D" fillOpacity="0.07" />
        <path d={`M${line}`} fill="none" stroke="#4E7A3D" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={`${p.date}-${i}`} cx={x(i)} cy={y(p.score)} r="3" fill="#4E7A3D" />
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between text-2xs text-muted">
        <span>{shortDate(first.date)}</span>
        <span className="font-semibold text-ink-600">
          {first.score}% → {last.score}%
        </span>
        <span>{shortDate(last.date)}</span>
      </div>
    </div>
  );
};

const EmptyBlock: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon, title, description,
}) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-cream-50 px-4 py-8 text-center">
    <span className="text-muted-light">{icon}</span>
    <p className="mt-2 text-xs font-semibold text-ink-600">{title}</p>
    <p className="mt-0.5 max-w-sm text-2xs leading-relaxed text-muted">{description}</p>
  </div>
);

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export const OverviewView: React.FC = () => {
  const {
    role, submissions, exceptions, ruleConflicts, sentinelAlerts, auditEvents,
    currentUser, loading, error, analytics, analyticsTrends, analyticsRange,
    setAnalyticsRange, selectedSubmission, setSelectedSubmission,
    updateSubmissionStatus, setActivePage, showToast,
  } = useApp();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'Findings' | 'Evidence' | 'Comments'>('Findings');
  const [decision, setDecision] = useState('Request Changes');
  const [note, setNote] = useState('');
  const [lastDecision, setLastDecision] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const active: Submission | undefined = selectedSubmission ?? undefined;

  const pendingReviews = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending');
  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;
  const activeExceptions = exceptions.filter((e) => e.status === 'Approved').length;
  const rulesAttention = ruleConflicts.filter((c) => c.status !== 'Active').length;
  const openAlerts = sentinelAlerts.filter((a) => a.status === 'Open');
  const violations = submissions.reduce(
    (n, s) => n + (s.findings?.filter((f) => f.type === 'error').length ?? 0),
    0,
  );

  const avgCompliance = submissions.length
    ? Math.round(submissions.reduce((n, s) => n + s.complianceScore, 0) / submissions.length)
    : 0;
  const complianceScore = analytics?.complianceScore ?? avgCompliance;

  const trendPoints = useMemo(
    () => (analyticsTrends?.points ?? []).slice(-8),
    [analyticsTrends],
  );
  const complianceDelta =
    trendPoints.length >= 2
      ? Math.round(trendPoints[trendPoints.length - 1].score - trendPoints[0].score)
      : null;

  const queuePreview = pendingReviews.slice(0, 4);

  const decisions = useMemo<TimelineItem[]>(
    () =>
      auditEvents
        .filter((e) => /approv|reject|declin|decision|changes requested/i.test(e.action))
        .slice(0, 5)
        .map((e) => ({
          id: e.id,
          title: `${e.action} · ${e.details || e.module}`,
          description: `${e.user.name}${e.user.role ? ` · ${e.user.role}` : ''}`,
          time: e.time || e.date,
          tone: toneFromAction(e.actionColor),
        })),
    [auditEvents],
  );

  const rangeTabs = [
    { label: '7D', val: '7d' },
    { label: '30D', val: '30d' },
    { label: '90D', val: '90d' },
    { label: '1Y', val: '1y' },
  ];

  const openDrawer = (sub: Submission) => {
    setSelectedSubmission(sub);
    setDrawerTab('Findings');
    setLastDecision(null);
    setDrawerOpen(true);
  };

  const handleDownload = async (id: string, title: string) => {
    try {
      await api.downloadSubmissionReport(id);
      showToast(`Report downloaded for ${title}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Download failed.', 'error');
    }
  };

  const handleSubmitDecision = () => {
    if (!active) return;
    const statusMap: Record<string, Submission['status']> = {
      Approve: 'Approved',
      'Request Changes': 'Needs Changes',
      Reject: 'Rejected',
    };
    updateSubmissionStatus(active.id, statusMap[decision] ?? 'Needs Changes', note);
    setNote('');
    setLastDecision(active.title);
  };

  const evidenceRefs = useMemo(() => {
    if (!active?.findings) return [];
    return Array.from(new Set(active.findings.map((f) => f.guidelineRef).filter(Boolean))) as string[];
  }, [active]);

  /* ---- States ---- */

  if (role !== 'manager') {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-10 text-center shadow-card">
          <Lock className="mx-auto h-8 w-8 text-muted-light" />
          <h1 className="mt-3 text-lg font-semibold text-ink">Manager access only</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            This command centre is restricted to brand managers. Your current role is {role}.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-[1400px] space-y-5">
          <div className="h-16 animate-pulse rounded-2xl bg-cream-100" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[120px] animate-pulse rounded-2xl bg-cream-100" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-[280px] animate-pulse rounded-2xl bg-cream-100 lg:col-span-2" />
            <div className="h-[280px] animate-pulse rounded-2xl bg-cream-100" />
          </div>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Pending reviews',
      value: pendingReviews.length,
      icon: <Clock className="h-4 w-4" />,
      ring: 'bg-warn-50 text-warn-600',
      sub: `${submissions.length} submissions in scope`,
    },
    {
      label: 'Approved',
      value: approvedCount,
      icon: <CheckCircle2 className="h-4 w-4" />,
      ring: 'bg-sage-50 text-sage-600',
      sub: `${complianceScore}% overall compliance`,
    },
    {
      label: 'Active exceptions',
      value: activeExceptions,
      icon: <Scale className="h-4 w-4" />,
      ring: 'bg-olive-50 text-olive-600',
      sub: `${exceptions.length} requests recorded`,
    },
    {
      label: 'Rules needing attention',
      value: rulesAttention,
      icon: <AlertTriangle className="h-4 w-4" />,
      ring: 'bg-terracotta-50 text-terracotta-600',
      sub: `${violations} open violations`,
    },
  ];

  return (
    <PageTransition className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-xs text-danger-700"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Welcome header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">
              {currentUser.workspace} · Governance
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">
              Welcome back, {currentUser.name.split(' ')[0]}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Monitor brand compliance, review content and manage brand policy.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePage('review-queue')}
              className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
            >
              Open review queue
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setActivePage('analytics')}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink-700 shadow-card transition-colors hover:bg-cream-50"
            >
              Analytics
            </button>
          </div>
        </div>

        {/* Metric cards */}
        <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => (
            <StaggerItem key={m.label}>
              <AnimatedCard className="h-full p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.ring}`}>
                    {m.icon}
                  </span>
                  <span className="max-w-[55%] text-right text-2xs leading-snug text-muted">{m.sub}</span>
                </div>
                <p className="mt-3 text-2xl font-semibold leading-none tabular-nums text-ink">
                  <AnimatedCounter value={m.value} />
                </p>
                <p className="mt-1.5 text-xs font-medium text-muted">{m.label}</p>
              </AnimatedCard>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Trend + score */}
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartContainer
            className="lg:col-span-2"
            title="Compliance trend"
            subtitle={`${trendPoints.length} real review bucket${trendPoints.length === 1 ? '' : 's'} from the analytics service`}
            actions={
              <div className="flex items-center gap-1 rounded-xl bg-cream-100 p-1">
                {rangeTabs.map((r) => (
                  <button
                    key={r.val}
                    onClick={() => setAnalyticsRange(r.val)}
                    aria-pressed={analyticsRange === r.val}
                    className={`rounded-lg px-2 py-0.5 text-2xs font-semibold transition-colors ${
                      analyticsRange === r.val ? 'bg-white text-ink shadow-card' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            }
          >
            {trendPoints.length >= 2 ? (
              <TrendPlot points={trendPoints} />
            ) : (
              <EmptyBlock
                icon={<FileCheck2 className="h-6 w-6" />}
                title="No trend data yet"
                description="Compliance history appears once at least two review buckets exist in the selected range."
              />
            )}
          </ChartContainer>

          <AnimatedCard className="flex flex-col justify-between p-4">
            <SectionHeader title="Overall compliance" subtitle="Derived from stored findings" />
            <div className="mt-4">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-semibold leading-none tabular-nums text-ink">
                  <AnimatedCounter value={complianceScore} suffix="%" />
                </span>
                {complianceDelta !== null && (
                  <span
                    className={`mb-1 inline-flex items-center gap-0.5 text-2xs font-semibold ${
                      complianceDelta >= 0 ? 'text-sage-600' : 'text-danger-600'
                    }`}
                  >
                    {complianceDelta >= 0 ? '+' : ''}
                    {complianceDelta} pts
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xs text-muted">
                {complianceDelta === null
                  ? 'No comparison window available yet.'
                  : 'Change across the visible trend window.'}
              </p>
            </div>
            <div className="mt-5 space-y-3">
              <AnimatedProgress
                value={approvedCount}
                max={Math.max(submissions.length, 1)}
                tone="sage"
                label={`Approved · ${approvedCount}`}
              />
              <AnimatedProgress
                value={pendingReviews.length}
                max={Math.max(submissions.length, 1)}
                tone="amber"
                label={`Awaiting review · ${pendingReviews.length}`}
              />
              <AnimatedProgress
                value={violations}
                max={Math.max(analytics?.totals.totalFindings ?? violations, 1)}
                tone="danger"
                label={`Open violations · ${violations}`}
              />
            </div>
          </AnimatedCard>
        </div>

        {/* Queue preview + Sentinel */}
        <div className="grid gap-4 lg:grid-cols-3">
          <AnimatedCard className="p-4 lg:col-span-2">
            <SectionHeader
              title="Review queue"
              subtitle={
                pendingReviews.length === 0
                  ? 'Nothing is waiting on a decision'
                  : `${pendingReviews.length} submission${pendingReviews.length === 1 ? '' : 's'} awaiting a decision`
              }
              actions={
                <button
                  onClick={() => setActivePage('review-queue')}
                  className="inline-flex items-center gap-1 text-2xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Open queue <ArrowRight className="h-3 w-3" />
                </button>
              }
            />
            <div className="mt-3 space-y-2">
              {queuePreview.length === 0 ? (
                <EmptyBlock
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  title="Queue is clear"
                  description="Every submission has a recorded decision. New content will appear here."
                />
              ) : (
                queuePreview.map((s) => (
                  <motion.button
                    key={s.id}
                    onClick={() => openDrawer(s)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line p-2.5 text-left transition-colors hover:border-brand-200 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    whileHover={reduce ? undefined : { y: -2 }}
                    whileTap={reduce ? undefined : { scale: 0.995 }}
                    transition={{ duration: 0.2, ease: EASE }}
                  >
                    <img
                      src={s.thumbnail}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg border border-line object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-xs font-semibold text-ink">{s.title}</span>
                        <StatusBadge status={s.status} />
                      </span>
                      <span className="mt-0.5 block truncate text-2xs text-muted">
                        {s.campaign} · {s.creator.name} · {s.version ?? 'v1.0'}
                      </span>
                    </span>
                    <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                      <span className={`${PRIORITY_CLASS[s.priority ?? 'Medium'] ?? 'badge-medium'}`}>
                        {s.priority ?? 'Medium'}
                      </span>
                      <span className="text-2xs text-muted">{s.relativeTime ?? '—'}</span>
                    </span>
                  </motion.button>
                ))
              )}
            </div>
          </AnimatedCard>

          <AnimatedCard className="flex flex-col p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Sentinel monitoring</h3>
              <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-muted">
                <PulseDot tone={openAlerts.length > 0 ? 'terracotta' : 'sage'} />
                {openAlerts.length > 0 ? 'Attention' : 'All clear'}
              </span>
            </div>
            <p className="mt-0.5 text-2xs text-muted">
              {openAlerts.length} open alert{openAlerts.length === 1 ? '' : 's'} of{' '}
              {sentinelAlerts.length} reassessment task{sentinelAlerts.length === 1 ? '' : 's'}
            </p>

            <div className="mt-3 flex-1 space-y-2">
              {openAlerts.slice(0, 3).map((a) => (
                <div key={a.id} className="rounded-xl border border-line bg-cream-50 p-2.5">
                  <p className="truncate text-2xs font-semibold text-ink">{a.title}</p>
                  <p className="mt-0.5 truncate text-2xs text-muted">
                    {a.category} · {a.detectedOn}
                  </p>
                </div>
              ))}
              {openAlerts.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-line bg-cream-50 px-3 py-6 text-center">
                  <ShieldAlert className="h-5 w-5 text-sage-500" />
                  <p className="mt-2 text-2xs font-medium text-ink-600">No open alerts</p>
                  <p className="mt-0.5 text-2xs text-muted">Sentinel found nothing needing reassessment.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setActivePage('sentinel')}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-2xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
            >
              View tasks <ArrowRight className="h-3 w-3" />
            </button>
          </AnimatedCard>
        </div>

        {/* Recent decisions */}
        <Reveal>
          <AnimatedCard className="p-4">
            <SectionHeader
              title="Recent decisions"
              subtitle="Recorded in the audit trail"
              actions={
                <button
                  onClick={() => setActivePage('audit-history')}
                  className="inline-flex items-center gap-1 text-2xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Audit history <ArrowRight className="h-3 w-3" />
                </button>
              }
            />
            <div className="mt-4">
              {decisions.length === 0 ? (
                <EmptyBlock
                  icon={<FileText className="h-6 w-6" />}
                  title="No decisions recorded"
                  description="Approvals, rejections and change requests will appear here as soon as they are logged."
                />
              ) : (
                <Timeline items={decisions} />
              )}
            </div>
          </AnimatedCard>
        </Reveal>
      </div>

      {/* Quick-decision drawer */}
      <AnimatedDrawer
        open={drawerOpen && Boolean(active)}
        onClose={() => setDrawerOpen(false)}
        title={active?.title ?? 'Submission'}
        subtitle={
          active
            ? `${active.campaign} · ${active.version ?? 'v1.0'} · ${active.relativeTime ?? '—'}`
            : undefined
        }
        footer={
          active ? (
            <div className="space-y-2.5">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note for this decision…"
                rows={2}
                className="w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/40"
              />
              <div className="flex items-center gap-2">
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  aria-label="Decision"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand-300/40"
                >
                  <option>Request Changes</option>
                  <option>Approve</option>
                  <option>Reject</option>
                </select>
                <button
                  onClick={handleSubmitDecision}
                  className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Submit
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-line">
              <img src={active.thumbnail} alt="" className="h-40 w-full object-cover" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={active.status} />
              <span className={`${PRIORITY_CLASS[active.priority ?? 'Medium'] ?? 'badge-medium'}`}>
                {active.priority ?? 'Medium'} priority
              </span>
              <span className="text-2xs text-muted">
                {active.findingsCount ?? active.findings?.length ?? 0} findings
              </span>
            </div>

            {lastDecision && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-2xs font-medium text-sage-700"
              >
                <SuccessCheck size={14} />
                Decision sent for “{lastDecision}”. The queue refreshes from the server.
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleDownload(active.id, active.title)}
                className="flex flex-col items-center gap-1 rounded-xl border border-line py-2 text-muted transition-colors hover:bg-cream-50 hover:text-ink"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold">Report</span>
              </button>
              <button
                onClick={() => active.thumbnail && window.open(active.thumbnail, '_blank')}
                className="flex flex-col items-center gap-1 rounded-xl border border-line py-2 text-muted transition-colors hover:bg-cream-50 hover:text-ink"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold">Preview</span>
              </button>
              <button
                onClick={() => {
                  setActivePage('review-queue');
                  setDrawerOpen(false);
                }}
                className="flex flex-col items-center gap-1 rounded-xl border border-line py-2 text-muted transition-colors hover:bg-cream-50 hover:text-ink"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold">Full view</span>
              </button>
            </div>

            <div className="flex gap-4 border-b border-line">
              {(['Findings', 'Evidence', 'Comments'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  aria-pressed={drawerTab === tab}
                  className={`-mb-px border-b-2 pb-2 text-xs font-semibold transition-colors ${
                    drawerTab === tab
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {drawerTab === 'Findings' && (
              <div className="space-y-2">
                {active.findings && active.findings.length > 0 ? (
                  active.findings.map((f) => (
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
                        <p className="text-xs font-semibold text-ink">{f.title}</p>
                        {f.badge && <span className="badge-medium shrink-0">{f.badge}</span>}
                      </div>
                      <p className="mt-1 text-2xs leading-relaxed text-ink-600">{f.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-sage-200 bg-sage-50 px-3 py-3 text-2xs text-sage-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    No findings were raised against this version.
                  </div>
                )}
              </div>
            )}

            {drawerTab === 'Evidence' && (
              <div className="space-y-2">
                {evidenceRefs.length > 0 ? (
                  evidenceRefs.map((ref) => (
                    <div key={ref} className="rounded-xl border border-line bg-cream-50 p-3">
                      <p className="text-2xs font-semibold text-ink">Guideline citation</p>
                      <p className="mt-0.5 text-2xs leading-relaxed text-muted">{ref}</p>
                    </div>
                  ))
                ) : (
                  <EmptyBlock
                    icon={<FileText className="h-5 w-5" />}
                    title="No citations stored"
                    description="This version has no guideline passages attached to its findings."
                  />
                )}
              </div>
            )}

            {drawerTab === 'Comments' && (
              <div className="space-y-3">
                {active.comments && active.comments.length > 0 ? (
                  active.comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2.5">
                      <img src={c.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="text-2xs font-semibold text-ink">
                          {c.author} <span className="font-normal text-muted-light">{c.time}</span>
                        </p>
                        <p className="mt-0.5 text-2xs leading-relaxed text-ink-600">{c.text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyBlock
                    icon={<MessageSquare className="h-5 w-5" />}
                    title="No comments yet"
                    description="Discussion on this submission will appear here."
                  />
                )}
              </div>
            )}
          </div>
        )}
      </AnimatedDrawer>
    </PageTransition>
  );
};
