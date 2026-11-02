import React from 'react';
import {
  ArrowRight, BellRing, CheckCircle2, Clock, FileText, Plus, RotateCw, ShieldCheck, Sparkles,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import {
  AgentStatusCard, AnimatedCard, AnimatedCounter, AnimatedProgress, EmptyState,
  HoverLiftCard, ImageHoverEffect, PageTransition, Reveal, RingProgress, SectionHeader,
  Sparkline, Stagger, StaggerItem, type AgentState,
} from '../../motion';

type MetricTone = 'brand' | 'sage' | 'warn' | 'terracotta';

const METRIC_TONE: Record<MetricTone, { chip: string; icon: string }> = {
  brand: { chip: 'bg-brand-50', icon: 'text-brand-600' },
  sage: { chip: 'bg-sage-50', icon: 'text-sage-600' },
  warn: { chip: 'bg-warn-50', icon: 'text-warn-600' },
  terracotta: { chip: 'bg-terracotta-50', icon: 'text-terracotta-600' },
};

const Metric: React.FC<{
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  tone: MetricTone;
  delay?: number;
  duration?: number;
}> = ({ label, value, hint, icon, tone, delay = 0, duration = 1.1 }) => (
  <HoverLiftCard elevation="medium" className="p-4" delay={delay}>
    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${METRIC_TONE[tone].chip} ${METRIC_TONE[tone].icon}`}>
      {icon}
    </span>
    <p className="mt-3 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
    <p className="mt-1 text-3xl font-semibold leading-none tabular-nums text-ink">
      <AnimatedCounter value={value} duration={duration} />
    </p>
    <p className="mt-1.5 text-2xs text-muted-light">{hint}</p>
  </HoverLiftCard>
);

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const cls =
    status === 'Approved'
      ? 'badge-approved'
      : status === 'In Review'
        ? 'badge-inreview'
        : status === 'Needs Changes'
          ? 'badge-changes'
          : status === 'Rejected'
            ? 'badge-rejected'
            : 'badge-pending';
  return <span className={cls}>{status}</span>;
};

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-5 p-4 sm:p-6" aria-busy="true" aria-label="Loading dashboard">
    <div className="h-8 w-64 animate-pulse rounded-xl bg-cream-100" />
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[118px] animate-pulse rounded-2xl border border-line bg-white" />
      ))}
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="h-[320px] animate-pulse rounded-2xl border border-line bg-white" />
      <div className="h-[320px] animate-pulse rounded-2xl border border-line bg-white" />
    </div>
  </div>
);

export const CreatorDashboardView: React.FC = () => {
  const {
    currentUser, submissions, sentinelAlerts, creatorSummary, loading, error, refresh,
    setCurrentPage, setSelectedSubmission,
  } = useApp();

  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;
  const pendingCount = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending').length;
  const needsChangesCount = submissions.filter((s) => s.status === 'Needs Changes').length;
  const rejectedCount = submissions.filter((s) => s.status === 'Rejected').length;

  const openAlerts = sentinelAlerts.filter((a) => a.status !== 'Resolved');
  const totalFindings = submissions.reduce((n, s) => n + (s.findingsCount ?? 0), 0);
  const resolvedFindings = submissions.reduce(
    (n, s) => n + (s.findings ?? []).filter((f) => f.type === 'success').length,
    0,
  );
  const derivedAvg =
    submissions.length > 0
      ? Math.round(submissions.reduce((n, s) => n + (s.complianceScore || 0), 0) / submissions.length)
      : null;
  const avgScore = creatorSummary?.complianceScore ?? derivedAvg;

  const scorePoints = submissions
    .slice(0, 8)
    .map((s) => s.complianceScore)
    .reverse();

  const recent = submissions.slice(0, 4);
  const firstName = currentUser.name.split(/\s+/)[0] || currentUser.name;

  const crew: { name: string; role: string; state: AgentState; detail: string; icon: React.ReactNode }[] = [
    {
      name: 'Intake',
      role: 'Submission parsing',
      state: submissions.length > 0 ? 'done' : 'idle',
      detail: submissions.length > 0 ? `${submissions.length} submission(s)` : 'Nothing submitted yet',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      name: 'Retrieval',
      role: 'Guideline passages',
      state: totalFindings > 0 ? 'done' : 'idle',
      detail: totalFindings > 0 ? `${totalFindings} finding(s) raised` : 'No findings stored',
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      name: 'Verifier',
      role: 'Finding resolution',
      state: resolvedFindings > 0 ? 'done' : 'idle',
      detail: resolvedFindings > 0 ? `${resolvedFindings} resolved` : 'None resolved yet',
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      name: 'Synthesis',
      role: 'Compliance score',
      state: avgScore !== null ? 'done' : 'idle',
      detail: avgScore !== null ? `${avgScore}% average` : 'No score yet',
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
  ];

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
          <p className="text-sm font-semibold text-danger-700">The dashboard could not load.</p>
          <p className="mt-1 text-xs text-danger-600">{error}</p>
          <button
            onClick={() => void refresh()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <RotateCw className="h-3.5 w-3.5" />Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">

        {/* Greeting */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">
              {currentUser.workspace}
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-2xs font-semibold text-brand-700">
                <ShieldCheck className="h-3 w-3" />{currentUser.role}
              </span>
              {submissions.length === 0
                ? 'Submit your first piece of content to start tracking compliance.'
                : `${submissions.length} submission${submissions.length === 1 ? '' : 's'} tracked in this workspace.`}
            </p>
          </div>
          <button
            onClick={() => setCurrentPage('new-content')}
            className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />Create content
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            { label: 'My submissions', value: submissions.length, hint: 'All statuses', icon: <FileText className="h-5 w-5" />, tone: 'brand' as MetricTone, duration: 1.0 },
            { label: 'Approved', value: approvedCount, hint: 'Cleared for publication', icon: <CheckCircle2 className="h-5 w-5" />, tone: 'sage' as MetricTone, duration: 1.2 },
            { label: 'In review', value: pendingCount, hint: 'Awaiting a decision', icon: <Clock className="h-5 w-5" />, tone: 'warn' as MetricTone, duration: 1.35 },
            { label: 'Needs changes', value: needsChangesCount + rejectedCount, hint: rejectedCount > 0 ? `${rejectedCount} declined` : 'Open findings', icon: <BellRing className="h-5 w-5" />, tone: 'terracotta' as MetricTone, duration: 1.5 },
          ].map((m, i) => (
            <Metric key={m.label} {...m} delay={i * 0.08} />
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">

          {/* Left column */}
          <div className="space-y-5">
            {/* Compliance */}
            <Reveal className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <SectionHeader
                title="Compliance at a glance"
                subtitle="Averages are computed from the scores stored against your submissions."
                eyebrow="Your record"
              />
              <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  {avgScore !== null ? (
                    <div
                      className="shrink-0 rounded-full"
                      style={{
                        boxShadow: avgScore >= 80
                          ? '0 0 26px -8px rgba(78,122,61,.50)'
                          : avgScore >= 50
                            ? '0 0 26px -8px rgba(196,137,28,.50)'
                            : '0 0 26px -8px rgba(194,84,70,.50)',
                      }}
                    >
                      <RingProgress
                        value={avgScore}
                        max={100}
                        size={124}
                        stroke={10}
                        tone={avgScore >= 80 ? 'brand' : avgScore >= 50 ? 'amber' : 'danger'}
                        centerLabel={<AnimatedCounter value={avgScore} suffix="%" />}
                        centerSublabel="Average"
                      />
                    </div>
                  ) : (
                    <div className="flex h-[124px] w-[124px] items-center justify-center rounded-full border border-dashed border-line-strong">
                      <span className="text-xs text-muted">No score yet</span>
                    </div>
                  )}
                  {scorePoints.length >= 2 && (
                    <div className="hidden sm:block">
                      <p className="text-2xs font-medium uppercase tracking-[0.06em] text-muted">Recent scores</p>
                      <Sparkline points={scorePoints} width={150} height={44} tone="brand" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2.5">
                  <AnimatedProgress
                    value={approvedCount}
                    max={Math.max(submissions.length, 1)}
                    tone="sage"
                    label={`Approved · ${approvedCount}`}
                  />
                  <AnimatedProgress
                    value={pendingCount}
                    max={Math.max(submissions.length, 1)}
                    tone="amber"
                    label={`In review · ${pendingCount}`}
                  />
                  <AnimatedProgress
                    value={needsChangesCount + rejectedCount}
                    max={Math.max(submissions.length, 1)}
                    tone="terracotta"
                    label={`Needs changes · ${needsChangesCount + rejectedCount}`}
                  />
                </div>
              </div>
            </Reveal>

            {/* Recent submissions */}
            <div>
              <SectionHeader
                title="Recent submissions"
                subtitle="Every value below comes from your stored submissions."
                actions={
                  <button
                    onClick={() => setCurrentPage('my-submissions')}
                    className="link-underline inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
                  >
                    See all<ArrowRight className="h-3.5 w-3.5" />
                  </button>
                }
              />
              {recent.length === 0 ? (
                <EmptyState
                  className="mt-3"
                  icon={<FileText className="h-6 w-6" />}
                  title="No submissions yet"
                  description="Create your first piece of content and it will appear here with its live review status."
                  action={{ label: 'New content', onClick: () => setCurrentPage('new-content') }}
                />
              ) : (
                <Stagger className="mt-3 grid gap-4 sm:grid-cols-2">
                  {recent.map((sub) => (
                    <StaggerItem key={sub.id}>
                      <AnimatedCard
                        interactive
                        onClick={() => {
                          setSelectedSubmission(sub);
                          setCurrentPage('ai-review');
                        }}
                        className="flex h-full flex-col overflow-hidden"
                      >
                        <div className="relative bg-cream-100">
                          <ImageHoverEffect className="h-32">
                            <img
                              src={sub.thumbnail}
                              alt=""
                              className="h-32 w-full object-cover"
                              loading="lazy"
                            />
                          </ImageHoverEffect>
                          <span className="absolute right-2 top-2 z-10">
                            <StatusChip status={sub.status} />
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col p-3.5">
                          <p className="truncate text-sm font-semibold text-ink">{sub.title}</p>
                          <p className="mt-0.5 truncate text-2xs text-muted">
                            {sub.campaign || 'No campaign'} · {sub.version || 'v1.0'}
                          </p>
                          <div className="mt-2.5 flex items-center justify-between text-2xs text-muted">
                            <span>{sub.submittedDate || sub.submittedAt || 'Not dated'}</span>
                            <span className="font-semibold tabular-nums text-ink">{sub.complianceScore}%</span>
                          </div>
                          <div className="mt-1.5">
                            <AnimatedProgress
                              value={sub.complianceScore}
                              max={100}
                              tone={sub.complianceScore >= 80 ? 'sage' : sub.complianceScore >= 50 ? 'amber' : 'danger'}
                              height={5}
                            />
                          </div>
                          <button
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setCurrentPage('ai-review');
                            }}
                            className="mt-3 inline-flex items-center gap-1 self-start text-2xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
                          >
                            Open review<ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </AnimatedCard>
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </div>
          </div>

          {/* Right rail */}
          <aside className="space-y-5">
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader
                title="Upcoming tasks"
                subtitle={openAlerts.length > 0 ? 'Raised by Sentinel monitoring' : 'Nothing outstanding'}
                actions={
                  <button
                    onClick={() => setCurrentPage('sentinel-tasks')}
                    className="text-2xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
                  >
                    Open
                  </button>
                }
              />
              {openAlerts.length === 0 ? (
                <div className="mt-3 rounded-xl border border-line bg-cream-50 px-4 py-6 text-center">
                  <CheckCircle2 className="mx-auto h-5 w-5 text-sage-500" />
                  <p className="mt-2 text-xs font-medium text-ink-600">No open reassessment tasks</p>
                  <p className="mt-0.5 text-2xs text-muted">Sentinel has not flagged anything for your content.</p>
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {openAlerts.slice(0, 4).map((alert) => (
                    <li key={alert.id}>
                      <button
                        onClick={() => setCurrentPage('sentinel-tasks')}
                        className="flex w-full items-start gap-2.5 rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:border-brand-200 hover:bg-cream-50"
                      >
                        <span
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            alert.severity === 'High'
                              ? 'bg-danger-50 text-danger-600'
                              : 'bg-warn-50 text-warn-600'
                          }`}
                        >
                          <BellRing className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-ink">{alert.title}</span>
                          <span className="mt-0.5 block truncate text-2xs text-muted">
                            {alert.category} · {alert.detectedOn}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-semibold ${
                            alert.severity === 'High'
                              ? 'bg-danger-50 text-danger-700'
                              : 'bg-warn-50 text-warn-700'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader
                title="Review Crew"
                subtitle="States reflect stored artefacts — not simulated progress."
              />
              <div className="mt-3 grid gap-2">
                {crew.map((agent, i) => (
                  <AgentStatusCard
                    key={agent.name}
                    name={agent.name}
                    role={agent.role}
                    state={agent.state}
                    detail={agent.detail}
                    icon={agent.icon}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PageTransition>
  );
};
