import React from 'react';
import {
  TrendingUp,
  Download,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  BookOpen,
  PieChart as PieIcon,
  Layers,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

const CATEGORY_PALETTE = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#14b8a6'];

export const AnalyticsHealthView: React.FC = () => {
  const {
    addToast,
    setCurrentPage,
    analytics,
    analyticsTrends,
    analyticsRange,
    setAnalyticsRange,
    analyticsLoading,
    downloadAnalytics,
  } = useApp();

  if (!analytics) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Analytics &amp; Health</h1>
          <p className="text-sm text-muted mt-0.5">
            Track brand compliance, monitor performance and stay informed across campaigns.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-line shadow-xs p-16 text-center text-muted text-sm">
          {analyticsLoading ? 'Loading analytics…' : 'No analytics data is available for this workspace yet.'}
        </div>
      </div>
    );
  }

  const sampleSize = analytics.sampleSize;
  const totals = analytics.totals;
  const coverage = analytics.ruleCoverage.totalRules
    ? Math.round((analytics.ruleCoverage.activeRules / analytics.ruleCoverage.totalRules) * 100)
    : 0;
  const approvalRate =
    totals.decided > 0 ? Math.round((totals.approved / totals.decided) * 100) : 0;

  const findingsTotal = analytics.findingsByCategory.reduce((n, c) => n + c.count, 0);
  const findingsDonut = (() => {
    let acc = 0;
    const total = Math.max(findingsTotal, 1);
    return analytics.findingsByCategory.map((c, i) => {
      const start = (acc / total) * 360;
      acc += c.count;
      const end = (acc / total) * 360;
      return { ...c, start, end, color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] };
    });
  })();
  const findingsBackground = `conic-gradient(${findingsDonut
    .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
    .join(', ')})`;

  // Trend line from real analyticsTrends points.
  const points = analyticsTrends?.points ?? [];
  const hasTrend = (analyticsTrends?.hasData || false) && points.length > 0;
  const W = 700;
  const X0 = 40;
  const X1 = 680;
  const TOP = 20;
  const BOTTOM = 190;
  const xFor = (i: number) => (points.length <= 1 ? X0 : X0 + ((X1 - X0) * i) / (points.length - 1));
  const yFor = (score: number) => BOTTOM - (Math.max(0, Math.min(100, score)) / 100) * (BOTTOM - TOP);
  const linePath = hasTrend
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.score).toFixed(1)}`).join(' ')
    : '';
  const areaPath = hasTrend
    ? `${linePath} L ${xFor(points.length - 1).toFixed(1)} ${BOTTOM} L ${xFor(0).toFixed(1)} ${BOTTOM} Z`
    : '';
  const trendLabels = hasTrend
    ? [points[0].date, points[Math.floor(points.length / 2)]?.date, points[points.length - 1].date].filter(Boolean)
    : [];

  const handleExport = () => {
    downloadAnalytics().catch(() => {});
    addToast('Analytics export downloaded.', 'success');
  };

  const rangeFor = (r: string): '7d' | '30d' | '90d' | '1y' => {
    if (r === '7D') return '7d';
    if (r === '90D') return '90d';
    if (r === '1Y') return '1y';
    return '30d';
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Analytics &amp; Health</h1>
          <p className="text-sm text-muted mt-0.5">
            Track brand compliance, monitor performance and stay informed across campaigns.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-line text-ink-700 rounded-lg text-xs font-semibold hover:bg-[#FAF7EF] shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-muted" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Compliance Score</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{analytics.complianceScore}%</div>
            <div className="mt-1 text-[10px] font-medium text-muted-light">
              sample of {sampleSize} item{sampleSize === 1 ? '' : 's'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Reviewed Content</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{totals.submissions}</div>
            <div className="mt-1 text-[10px] font-medium text-muted-light">tracked in range</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Open Issues</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{totals.openFindings}</div>
            <div className="mt-1 text-[10px] font-medium text-muted-light">open findings</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Avg Review Time</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">
              {analytics.reviewPerformance.tracked && analytics.reviewPerformance.avgReviewHours != null
                ? `${analytics.reviewPerformance.avgReviewHours}h`
                : '—'}
            </div>
            <div className="mt-1 text-[10px] font-medium text-muted-light">
              {analytics.reviewPerformance.tracked ? 'tracked' : 'not tracked yet'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Row 2: Compliance Trends & Findings by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Compliance Trends Line Chart */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-line shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-ink-900">Compliance Trends</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />
                  <span className="text-ink-600 font-medium">Compliance Score</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-300" />
                  <span className="text-muted-light">Target (90%)</span>
                </div>
              </div>
              <div className="flex bg-[#F1ECE0] p-0.5 rounded-lg text-xs font-medium text-ink-600">
                {(['7D', '30D', '90D', '1Y'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAnalyticsRange(rangeFor(tab))}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      analyticsRange === rangeFor(tab) ? 'bg-white text-ink-900 shadow-xs font-semibold' : 'hover:text-ink-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {hasTrend ? (
            <div className="h-60 w-full relative pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 700 200">
                <line x1="40" y1="20" x2="680" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <text x="30" y="24" fill="#94a3b8" fontSize="10" textAnchor="end">100%</text>
                <line x1="40" y1="65" x2="680" y2="65" stroke="#f1f5f9" strokeWidth="1" />
                <text x="30" y="69" fill="#94a3b8" fontSize="10" textAnchor="end">90%</text>
                <line x1="40" y1="110" x2="680" y2="110" stroke="#f1f5f9" strokeWidth="1" />
                <text x="30" y="114" fill="#94a3b8" fontSize="10" textAnchor="end">80%</text>
                <line x1="40" y1="155" x2="680" y2="155" stroke="#f1f5f9" strokeWidth="1" />
                <text x="30" y="159" fill="#94a3b8" fontSize="10" textAnchor="end">70%</text>
                <line x1="40" y1="65" x2="680" y2="65" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" />

                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#scoreGrad)" />
                <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                {points.map((p, idx) => (
                  <circle key={idx} cx={xFor(idx)} cy={yFor(p.score)} r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                ))}
              </svg>
              <div className="flex justify-between text-[11px] text-muted-light px-8 mt-2">
                {trendLabels.map((l, i) => (
                  <span key={i}>{l}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-sm text-muted">
              No trend data is available for this range.
            </div>
          )}
        </div>

        {/* Findings by Category Donut */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-line shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <PieIcon className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-ink-900">Findings by Category</h2>
          </div>

          {findingsTotal === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted">No findings recorded.</div>
          ) : (
            <>
              <div className="flex items-center justify-center my-3">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <div className="w-36 h-36 rounded-full" style={{ background: findingsBackground }} />
                  <div className="absolute w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center shadow-xs">
                    <span className="text-2xl font-bold text-ink-900">{findingsTotal}</span>
                    <span className="text-[10px] text-muted-light font-medium">Total Findings</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-2">
                {findingsDonut.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-xs py-1 border-b border-[#FAF7EF]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                      <span className="text-ink-600">{c.category}</span>
                    </div>
                    <span className="font-semibold text-ink-900">
                      {c.count} ({findingsTotal ? Math.round((c.count / findingsTotal) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 3: Top Violated Rules, Campaign Health, Guideline Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Violated Rules */}
        <div className="bg-white p-5 rounded-xl border border-line shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Top Violated Rules</span>
            </h2>
            <button
              onClick={() => setCurrentPage('rules-conflicts')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {analytics.topRules.length === 0 && <div className="text-xs text-muted">No rule violations recorded.</div>}
            {analytics.topRules.map((rule, idx) => (
              <div key={`${rule.code}-${idx}`} className="flex items-center justify-between text-xs py-1.5 border-b border-[#F1ECE0] last:border-none">
                <div className="flex items-center gap-2.5 truncate pr-2">
                  <span className="w-5 h-5 rounded-full bg-[#F1ECE0] text-ink-600 flex items-center justify-center font-semibold text-[11px] flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-ink-700 font-medium truncate">
                    {rule.code} · {rule.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-muted font-semibold">{rule.count} times</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign Health */}
        <div className="bg-white p-5 rounded-xl border border-line shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-500" />
              <span>Campaign Health</span>
            </h2>
            <button
              onClick={() => setCurrentPage('all-submissions')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-4">
            {analytics.campaignHealth.length === 0 && <div className="text-xs text-muted">No campaign data.</div>}
            {analytics.campaignHealth.map((c) => (
              <div key={c.campaign} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">{c.campaign}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-ink-900">{c.score}%</span>
                    <span className="text-[11px] text-muted-light">{c.issues} issues</span>
                  </div>
                </div>
                <div className="w-full bg-[#F1ECE0] rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${c.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guideline Health */}
        <div className="bg-white p-5 rounded-xl border border-line shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Guideline Health</span>
            </h2>
            <button
              onClick={() => setCurrentPage('guidelines')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-center my-3">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="50" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                <circle
                  cx="64"
                  cy="64"
                  r="50"
                  stroke="#16a34a"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="314"
                  strokeDashoffset={String(314 - (314 * coverage) / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-bold text-ink-900">{coverage}%</span>
                <span className="text-[10px] text-muted-light">Coverage</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-ink-600">Active Rules</span>
              </div>
              <span className="font-semibold text-ink-900">{analytics.ruleCoverage.activeRules}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-ink-600">Inactive Rules</span>
              </div>
              <span className="font-semibold text-ink-900">
                {analytics.ruleCoverage.totalRules - analytics.ruleCoverage.activeRules}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-line-strong" />
                <span className="text-ink-600">Total Rules</span>
              </div>
              <span className="font-semibold text-ink-900">{analytics.ruleCoverage.totalRules}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Sentinel Impact, Review Performance, Exception Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sentinel Impact */}
        <div className="bg-white p-5 rounded-xl border border-line shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-ink-900">Sentinel Impact</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-[#FAF7EF] rounded-lg">
              <div className="text-xl font-bold text-ink-900">{analytics.sentinel.open}</div>
              <div className="text-xs text-muted mt-0.5">Open Alerts</div>
            </div>
            <div className="p-3 bg-[#FAF7EF] rounded-lg">
              <div className="text-xl font-bold text-ink-900">{analytics.sentinel.resolved}</div>
              <div className="text-xs text-muted mt-0.5">Resolved</div>
            </div>
          </div>
        </div>

        {/* Review Performance */}
        <div className="bg-white p-5 rounded-xl border border-line shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-ink-900">Review Performance</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-[#FAF7EF] rounded-lg">
              <div className="text-xl font-bold text-ink-900">{approvalRate}%</div>
              <div className="text-xs text-muted mt-0.5">Approval Rate</div>
            </div>
            <div className="p-3 bg-[#FAF7EF] rounded-lg">
              <div className="text-xl font-bold text-ink-900">{totals.decided}</div>
              <div className="text-xs text-muted mt-0.5">Decisions</div>
            </div>
          </div>
        </div>

        {/* Exception Analytics */}
        <div className="bg-white p-5 rounded-xl border border-line shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-ink-900">Exception Analytics</h3>
            </div>
            <button
              onClick={() => setCurrentPage('exceptions')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View Details →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-[#FAF7EF] rounded-lg">
              <div className="text-xl font-bold text-ink-900">{analytics.exceptions['Approved'] ?? 0}</div>
              <div className="text-xs text-muted mt-0.5">Approved</div>
            </div>
            <div className="p-3 bg-[#FAF7EF] rounded-lg">
              <div className="text-xl font-bold text-amber-600">{analytics.exceptions['Pending'] ?? 0}</div>
              <div className="text-xs text-muted mt-0.5">Pending</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
