/**
 * Analytics & Health.
 *
 * Every series below is returned by `/analytics` or `/analytics/trends`. When a
 * metric has no stored data we render an explicit empty state — we never draw a
 * placeholder point, a sample donut or an invented delta.
 */
import React, { useMemo, useState } from 'react';
import {
  AlertCircle, AlertTriangle, CheckCircle2, Clock, Download, Lock, ShieldAlert,
  TrendingUp, PieChart, Timer, Percent,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import {
  AnimatedCard, AnimatedCounter, AnimatedProgress, AnimatedTabs, ChartContainer,
  PageTransition, RingProgress, Sparkline, Stagger, StaggerItem,
} from '../../motion';
import { StatusDonut, TrendArea, VolumeBars } from '../../ui/charts';
import {
  ActionFooter, DetailDrawer, DetailHeader, FooterButton, InfoCard, MetadataList,
  MetadataRow, MetricChip, SectionHeader, StatusBadge,
} from '../../detail';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const shortDate = (value: string): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const EmptyPanel: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-cream-50 px-4 py-8 text-center">
    <p className="text-xs font-semibold text-ink-600">{title}</p>
    <p className="mt-1 max-w-sm text-2xs leading-relaxed text-muted">{description}</p>
  </div>
);

/** Status strings come straight from the DB, so unknown keys still get a slot. */
const STATUS_TONE: Record<string, 'sage' | 'brand' | 'amber' | 'danger' | 'olive'> = {
  Approved: 'sage',
  'In Review': 'brand',
  'Ready for Approval': 'brand',
  'Changes Requested': 'amber',
  'Needs Changes': 'amber',
  Declined: 'danger',
  Rejected: 'danger',
  Pending: 'olive',
  Draft: 'olive',
};

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export const AnalyticsHealthView: React.FC = () => {
  const {
    role, analytics, analyticsTrends, analyticsRange, setAnalyticsRange,
    analyticsLoading, downloadAnalytics, addToast, error,
  } = useApp();

  const points = useMemo(() => analyticsTrends?.points ?? [], [analyticsTrends]);

  /* Drill-down target for the findings-by-category chart. Real stored rows only. */
  const [drill, setDrill] = useState<{
    category: string; count: number; high: number; medium: number; low: number;
  } | null>(null);

  /* ---- States ---- */

  if (role !== 'manager') {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-10 text-center shadow-card">
          <Lock className="mx-auto h-8 w-8 text-muted-light" />
          <h1 className="mt-3 text-lg font-semibold text-ink">Manager access only</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Workspace analytics are restricted to brand managers. Your current role is {role}.
          </p>
        </div>
      </div>
    );
  }

  if (analyticsLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-[1500px] space-y-4">
          <div className="h-14 w-1/3 animate-pulse rounded-2xl bg-cream-100" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[108px] animate-pulse rounded-2xl bg-cream-100" />
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

  if (!analytics) {
    return (
      <PageTransition className="p-4 sm:p-6">
        <div className="mx-auto max-w-[1500px] space-y-4">
          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">Health</p>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">Analytics &amp; Health</h1>
            <p className="mt-1 text-sm text-muted">
              Track brand compliance, monitor performance and stay informed.
            </p>
          </div>
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-xs text-danger-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" />
              <span>{error}</span>
            </div>
          )}
          <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-card">
            <TrendingUp className="mx-auto h-7 w-7 text-muted-light" />
            <p className="mt-3 text-sm font-semibold text-ink">No analytics data yet</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Aggregates appear once submissions have been reviewed. Nothing is estimated in the
              meantime.
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  const { totals, reviewPerformance, ruleCoverage, sentinel, exceptions } = analytics;
  const approvalRate = totals.decided > 0 ? Math.round((totals.approved / totals.decided) * 100) : 0;
  const coverage = ruleCoverage.totalRules
    ? Math.round((ruleCoverage.activeRules / ruleCoverage.totalRules) * 100)
    : 0;
  const findingsTotal = analytics.findingsByCategory.reduce((n, c) => n + c.count, 0);
  const exceptionEntries = Object.entries(exceptions).filter(([, v]) => v > 0);
  const exceptionTotal = exceptionEntries.reduce((n, [, v]) => n + v, 0);
  const avgHours = reviewPerformance.avgReviewHours;
  const scoreSeries = points.map((p) => p.score);
  const statusSlices = Object.entries(analytics.statusBreakdown)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, tone: STATUS_TONE[name] ?? 'olive' }));
  const statusTotal = statusSlices.reduce((n, s) => n + s.value, 0);

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
              Health · {analytics.range}
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">Analytics &amp; Health</h1>
            <p className="mt-1 text-sm text-muted">
              Aggregated from {analytics.sampleSize} submission
              {analytics.sampleSize === 1 ? '' : 's'} in the selected range.
            </p>
          </div>
          <button
            onClick={() => downloadAnalytics().catch(() => addToast('Export failed.', 'error'))}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink-700 shadow-card transition-colors hover:bg-cream-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export report
          </button>
        </div>

        {/* KPIs */}
        <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StaggerItem>
            <AnimatedCard className="p-4">
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-50 text-sage-600">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                {scoreSeries.length >= 2 && <Sparkline points={scoreSeries} width={72} height={26} tone="sage" />}
              </div>
              <p className="mt-3 text-2xl font-semibold leading-none tabular-nums text-ink">
                <AnimatedCounter value={analytics.complianceScore} suffix="%" />
              </p>
              <p className="mt-1.5 text-xs font-medium text-muted">Compliance score</p>
              <p className="mt-0.5 text-2xs text-muted-light">
                {totals.totalFindings} findings across {totals.submissions} submissions
              </p>
            </AnimatedCard>
          </StaggerItem>

          <StaggerItem>
            <AnimatedCard className="p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <TrendingUp className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-semibold leading-none tabular-nums text-ink">
                <AnimatedCounter value={totals.decided} />
              </p>
              <p className="mt-1.5 text-xs font-medium text-muted">Reviewed content</p>
              <p className="mt-0.5 text-2xs text-muted-light">
                {totals.inReview} still in review
              </p>
            </AnimatedCard>
          </StaggerItem>

          <StaggerItem>
            <AnimatedCard className="p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warn-50 text-warn-600">
                <AlertCircle className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-semibold leading-none tabular-nums text-ink">
                <AnimatedCounter value={totals.openFindings} />
              </p>
              <p className="mt-1.5 text-xs font-medium text-muted">Open issues</p>
              <p className="mt-0.5 text-2xs text-muted-light">
                {findingsTotal} findings recorded in total
              </p>
            </AnimatedCard>
          </StaggerItem>

          <StaggerItem>
            <AnimatedCard className="p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive-50 text-olive-600">
                <Clock className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-semibold leading-none tabular-nums text-ink">
                {avgHours !== null ? (
                  <>
                    <AnimatedCounter value={avgHours} decimals={1} />
                    <span className="ml-1 text-sm font-medium text-muted">hrs</span>
                  </>
                ) : (
                  <span className="text-base font-medium text-muted">Not tracked</span>
                )}
              </p>
              <p className="mt-1.5 text-xs font-medium text-muted">Avg review time</p>
              <p className="mt-0.5 text-2xs text-muted-light">
                {reviewPerformance.tracked
                  ? `Measured across ${reviewPerformance.decisions} decisions`
                  : 'Timestamps are incomplete, so no average is claimed'}
              </p>
            </AnimatedCard>
          </StaggerItem>
        </Stagger>

        {/* Trend + approval */}
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartContainer
            className="lg:col-span-2"
            title="Compliance trend"
            subtitle={
              points.length > 0
                ? `${points.length} ${analyticsTrends?.bucket ?? 'day'} buckets · ${analytics.range}`
                : 'No buckets in this range'
            }
            actions={
              <AnimatedTabs
                tabs={[
                  { id: '7d', label: '7D' },
                  { id: '30d', label: '30D' },
                  { id: '90d', label: '90D' },
                  { id: '1y', label: '1Y' },
                ]}
                active={analyticsRange}
                onChange={(id) => setAnalyticsRange(id as typeof analyticsRange)}
              />
            }
          >
            {points.length >= 2 ? (
              <TrendArea
                data={points.map((p) => ({ label: shortDate(p.date), score: p.score }))}
                height={196}
                ariaLabel={`Compliance score across ${points.length} ${analyticsTrends?.bucket ?? 'day'} buckets`}
              />
            ) : (
              <EmptyPanel
                title="No trend data yet"
                description="Compliance history appears once at least two review buckets exist in the selected range."
              />
            )}
          </ChartContainer>

          <AnimatedCard className="flex flex-col p-4">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-ink">Approval rate</h3>
            </div>
            <p className="mt-0.5 text-2xs text-muted">Approved ÷ decided submissions</p>
            <div className="mt-4 flex flex-1 flex-col items-center justify-center">
              {totals.decided > 0 ? (
                <RingProgress
                  value={totals.approved}
                  max={totals.decided}
                  size={140}
                  stroke={12}
                  tone={approvalRate >= 70 ? 'sage' : approvalRate >= 40 ? 'amber' : 'danger'}
                  centerLabel={<AnimatedCounter value={approvalRate} suffix="%" />}
                  centerSublabel="Approved"
                />
              ) : (
                <EmptyPanel
                  title="No decisions yet"
                  description="The rate is calculated only from submissions that already have a recorded decision."
                />
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-2xs">
              <div className="rounded-xl border border-line bg-cream-50 px-2.5 py-2">
                <p className="text-muted">Approved</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{totals.approved}</p>
              </div>
              <div className="rounded-xl border border-line bg-cream-50 px-2.5 py-2">
                <p className="text-muted">Declined</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{totals.declined}</p>
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* Volume + categories + status mix */}
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartContainer
            title="Submission volume"
            subtitle={
              points.length > 0
                ? `Real submissions per ${analyticsTrends?.bucket ?? 'day'}`
                : 'No buckets in this range'
            }
          >
            {points.length > 0 ? (
              <VolumeBars
                data={points.map((p) => ({ label: shortDate(p.date), value: p.submissions }))}
                height={158}
                tone="brand"
                unit=" subs"
                ariaLabel={`Submissions per ${analyticsTrends?.bucket ?? 'day'}`}
              />
            ) : (
              <EmptyPanel
                title="No submissions in range"
                description="Volume is counted from stored submissions, so an empty range stays empty."
              />
            )}
          </ChartContainer>

          <ChartContainer
            title="Findings by category"
            subtitle={`${findingsTotal} findings across ${analytics.findingsByCategory.length} categories`}
            legend={
              <span className="inline-flex items-center gap-1.5 text-2xs text-muted">
                <span className="h-2 w-2 rounded-full bg-danger-500" />
                Count
              </span>
            }
          >
            {analytics.findingsByCategory.length > 0 ? (
              <div className="space-y-4">
                <VolumeBars
                  data={analytics.findingsByCategory.map((c) => ({
                    label: c.category,
                    value: c.count,
                  }))}
                  height={146}
                  tone="terracotta"
                  unit=" findings"
                  ariaLabel="Findings by category"
                />
                <ul className="space-y-1.5">
                  {analytics.findingsByCategory.map((c) => (
                    <li key={c.category}>
                      <button
                        type="button"
                        onClick={() => setDrill(c)}
                        aria-label={`Open ${c.category} breakdown`}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left text-2xs transition-colors hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60"
                      >
                        <span className="truncate text-ink-600">{c.category}</span>
                        <span className="shrink-0 tabular-nums text-muted">
                          {c.count} · <span className="text-danger-600">{c.high} high</span> ·{' '}
                          {c.medium} med · {c.low} low
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyPanel
                title="No findings recorded"
                description="Categories appear once the rule engine has raised at least one finding."
              />
            )}
          </ChartContainer>

          <ChartContainer
            title="Status mix"
            subtitle={
              statusTotal > 0
                ? `${statusTotal} submissions by stored status`
                : 'No submissions in range'
            }
          >
            {statusSlices.length > 0 ? (
              <div>
                <StatusDonut
                  data={statusSlices}
                  height={158}
                  centerLabel={statusTotal}
                  centerSublabel="submissions"
                  ariaLabel="Submissions grouped by stored status"
                />
                <ul className="mt-3 space-y-1.5">
                  {statusSlices.map((slice) => (
                    <li key={slice.name} className="flex items-center gap-2 text-2xs">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            slice.tone === 'sage'
                              ? '#7A9064'
                              : slice.tone === 'brand'
                                ? '#4E7A3D'
                                : slice.tone === 'amber'
                                  ? '#DDA22B'
                                  : slice.tone === 'danger'
                                    ? '#C25446'
                                    : '#6B7350',
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-ink-600">{slice.name}</span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {slice.value}
                        <span className="ml-1 text-muted-light">
                          {statusTotal > 0 ? `${Math.round((slice.value / statusTotal) * 100)}%` : ''}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyPanel
                title="No submissions in range"
                description="The mix is counted from stored submission rows, so an empty range stays empty."
              />
            )}
          </ChartContainer>
        </div>

        {/* Turnaround + exceptions + sentinel */}
        <div className="grid gap-4 lg:grid-cols-3">
          <AnimatedCard className="p-4">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-olive-600" />
              <h3 className="text-sm font-semibold text-ink">Review turnaround</h3>
            </div>
            <p className="mt-0.5 text-2xs text-muted">Submission to first decision</p>
            {avgHours !== null ? (
              <div className="mt-4">
                <p className="text-3xl font-semibold leading-none tabular-nums text-ink">
                  <AnimatedCounter value={avgHours} decimals={1} />
                  <span className="ml-1 text-sm font-medium text-muted">hrs</span>
                </p>
                <p className="mt-1.5 text-2xs text-muted">
                  Averaged over {reviewPerformance.decisions} decisions with usable timestamps.
                </p>
                <div className="mt-4">
                  <AnimatedProgress
                    value={Math.min(avgHours, 72)}
                    max={72}
                    tone={avgHours <= 24 ? 'sage' : avgHours <= 48 ? 'amber' : 'danger'}
                    label="Against a 72-hour ceiling"
                    showValue={false}
                  />
                  <p className="mt-1 text-2xs text-muted-light">
                    Scale is capped at 72 hours for readability; the figure above is exact.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <EmptyPanel
                  title="Turnaround not tracked"
                  description="The service reports incomplete timestamps for decided submissions, so no average is shown."
                />
              </div>
            )}
          </AnimatedCard>

          <AnimatedCard className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warn-600" />
                <h3 className="text-sm font-semibold text-ink">Exceptions</h3>
              </div>
              <span className="text-sm font-semibold tabular-nums text-ink">{exceptionTotal}</span>
            </div>
            <p className="mt-0.5 text-2xs text-muted">Counted by stored status</p>
            {exceptionEntries.length > 0 ? (
              <div className="mt-4 space-y-3">
                {exceptionEntries.map(([status, count]) => (
                  <AnimatedProgress
                    key={status}
                    value={count}
                    max={Math.max(exceptionTotal, 1)}
                    tone={status === 'Approved' ? 'sage' : status === 'Rejected' ? 'danger' : 'amber'}
                    label={`${status} · ${count}`}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-3">
                <EmptyPanel
                  title="No exception requests"
                  description="Approved, pending and rejected exceptions are counted from stored requests."
                />
              </div>
            )}
          </AnimatedCard>

          <AnimatedCard className="p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-terracotta-600" />
              <h3 className="text-sm font-semibold text-ink">Sentinel impact</h3>
            </div>
            <p className="mt-0.5 text-2xs text-muted">Reassessment tasks from Sentinel</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-line bg-cream-50 px-3 py-3">
                <p className="text-2xs text-muted">Open</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
                  <AnimatedCounter value={sentinel.open} />
                </p>
              </div>
              <div className="rounded-xl border border-line bg-cream-50 px-3 py-3">
                <p className="text-2xs text-muted">Resolved</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
                  <AnimatedCounter value={sentinel.resolved} />
                </p>
              </div>
            </div>
            <div className="mt-3">
              <AnimatedProgress
                value={sentinel.resolved}
                max={Math.max(sentinel.open + sentinel.resolved, 1)}
                tone="sage"
                label="Share of tasks resolved"
              />
            </div>
          </AnimatedCard>
        </div>

        {/* Coverage + top rules + campaigns */}
        <div className="grid gap-4 lg:grid-cols-3">
          <AnimatedCard className="p-4">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-ink">Rule coverage</h3>
            </div>
            <p className="mt-0.5 text-2xs text-muted">Active rules against the stored rulebook</p>
            <div className="mt-4 flex items-center gap-4">
              <RingProgress
                value={ruleCoverage.activeRules}
                max={Math.max(ruleCoverage.totalRules, 1)}
                size={104}
                stroke={10}
                tone={coverage >= 80 ? 'sage' : coverage >= 50 ? 'amber' : 'danger'}
                centerLabel={<AnimatedCounter value={coverage} suffix="%" />}
              />
              <dl className="flex-1 space-y-1.5 text-2xs">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Active</dt>
                  <dd className="font-semibold tabular-nums text-ink">{ruleCoverage.activeRules}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Total</dt>
                  <dd className="font-semibold tabular-nums text-ink">{ruleCoverage.totalRules}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Triggered</dt>
                  <dd className="font-semibold tabular-nums text-ink">{ruleCoverage.rulesTriggered}</dd>
                </div>
              </dl>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-4">
            <h3 className="text-sm font-semibold text-ink">Top violated rules</h3>
            <p className="mt-0.5 text-2xs text-muted">Ranked by stored finding count</p>
            <ol className="mt-3 space-y-2">
              {analytics.topRules.slice(0, 5).map((rule, i) => (
                <li key={rule.code} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cream-100 text-[10px] font-semibold text-ink-700">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-2xs text-ink-700">{rule.title}</span>
                  <span className="shrink-0 text-2xs font-semibold tabular-nums text-ink">{rule.count}</span>
                </li>
              ))}
              {analytics.topRules.length === 0 && (
                <li className="rounded-xl border border-dashed border-line bg-cream-50 px-3 py-5 text-center text-2xs text-muted">
                  No rule violations recorded.
                </li>
              )}
            </ol>
          </AnimatedCard>

          <AnimatedCard className="p-4">
            <h3 className="text-sm font-semibold text-ink">Campaign health</h3>
            <p className="mt-0.5 text-2xs text-muted">Score and open issues per campaign</p>
            <ul className="mt-3 space-y-2.5">
              {analytics.campaignHealth.slice(0, 5).map((ch) => (
                <li key={ch.campaign}>
                  <div className="flex items-center justify-between gap-2 text-2xs">
                    <span className="truncate text-ink-700">{ch.campaign}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {ch.score}% · {ch.issues} issue{ch.issues === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line-soft">
                    <div
                      className={`h-full rounded-full ${
                        ch.score >= 90 ? 'bg-sage-500' : ch.score >= 70 ? 'bg-warn-400' : 'bg-danger-500'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, ch.score))}%` }}
                    />
                  </div>
                </li>
              ))}
              {analytics.campaignHealth.length === 0 && (
                <li className="rounded-xl border border-dashed border-line bg-cream-50 px-3 py-5 text-center text-2xs text-muted">
                  No campaign data yet.
                </li>
              )}
            </ul>
          </AnimatedCard>
        </div>
      </div>

      {/* Drill-down — opens the stored breakdown for one finding category */}
      <DetailDrawer
        open={!!drill}
        onClose={() => setDrill(null)}
        label={drill?.category ?? 'Finding category'}
        width={460}
        header={
          drill ? (
            <DetailHeader
              tone="terracotta"
              icon={<PieChart className="h-5 w-5" />}
              eyebrow="Findings · category"
              title={drill.category}
              description={`${drill.count} finding${drill.count === 1 ? '' : 's'} recorded in this category for the selected range.`}
              onClose={() => setDrill(null)}
              badges={<StatusBadge tone="terracotta" label={`${drill.count} total`} />}
            />
          ) : undefined
        }
        footer={
          <ActionFooter>
            <FooterButton onClick={() => setDrill(null)}>Close</FooterButton>
          </ActionFooter>
        }
      >
        {drill && (
          <div className="space-y-4">
            <InfoCard
              tone="terracotta"
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              eyebrow="What this means"
              title={`${drill.count} findings in ${drill.category}`}
            >
              Findings here were raised by the deterministic rule engine against stored guideline
              passages. Severity is stored per finding — it is never inferred by this panel.
            </InfoCard>

            <div className="grid grid-cols-3 gap-2">
              <MetricChip label="High" value={drill.high} tone="danger" />
              <MetricChip label="Medium" value={drill.medium} tone="amber" />
              <MetricChip label="Low" value={drill.low} tone="olive" />
            </div>

            <div>
              <SectionHeader
                title="Severity split"
                subtitle="Share of this category's findings by stored severity."
              />
              <div className="mt-2 space-y-2">
                <AnimatedProgress value={drill.high} max={Math.max(drill.count, 1)} tone="danger" label={`High · ${drill.high}`} />
                <AnimatedProgress value={drill.medium} max={Math.max(drill.count, 1)} tone="amber" label={`Medium · ${drill.medium}`} />
                <AnimatedProgress value={drill.low} max={Math.max(drill.count, 1)} tone="olive" label={`Low · ${drill.low}`} />
              </div>
            </div>

            <div>
              <SectionHeader title="Stored record" subtitle="Values returned by the analytics service." />
              <MetadataList className="mt-2">
                <MetadataRow label="Category" value={drill.category} />
                <MetadataRow label="Total findings" value={drill.count} />
                <MetadataRow label="High severity" value={drill.high} tone="danger" />
                <MetadataRow label="Medium severity" value={drill.medium} tone="amber" />
                <MetadataRow label="Low severity" value={drill.low} tone="olive" />
                <MetadataRow label="Range" value={analyticsRange} />
              </MetadataList>
            </div>
          </div>
        )}
      </DetailDrawer>
    </PageTransition>
  );
};
