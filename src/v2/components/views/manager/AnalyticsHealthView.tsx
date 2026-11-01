import React from 'react';
import { TrendingUp, Download, AlertCircle, Clock, CheckCircle2, ChevronRight, ShieldAlert, ArrowUpRight, ArrowDownRight, PieChart, Star } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { StatCardGrid } from '../../ui/StatCard';

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e'];

export const AnalyticsHealthView: React.FC = () => {
  const { analytics, analyticsTrends, analyticsRange, setAnalyticsRange, analyticsLoading, downloadAnalytics, addToast, setActivePage } = useApp();

  if (!analytics) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-5">
        <div><h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Analytics & Health</h1><p className="text-xs text-muted mt-0.5">Track brand compliance, monitor performance and stay informed.</p></div>
        <div className="bg-white rounded-2xl border border-line p-16 text-center text-xs text-muted">{analyticsLoading ? 'Loading analytics…' : 'No analytics data available yet.'}</div>
      </div>
    );
  }

  const totals = analytics.totals;
  const approvalRate = totals.decided > 0 ? Math.round((totals.approved / totals.decided) * 100) : 0;
  const findingsTotal = analytics.findingsByCategory.reduce((n, c) => n + c.count, 0);
  const trendPoints = (analyticsTrends?.points ?? []).slice(-10);
  const maxScore = Math.max(...trendPoints.map(p => p.score), 100);
  const coverage = analytics.ruleCoverage.totalRules ? Math.round((analytics.ruleCoverage.activeRules / analytics.ruleCoverage.totalRules) * 100) : 0;

  // Donut segments for findings by category
  const donutSegments = (() => {
    let acc = 0; const total = Math.max(findingsTotal, 1);
    return analytics.findingsByCategory.slice(0, 4).map((c, i) => {
      const r = 38; const circ = 2 * Math.PI * r;
      const frac = c.count / total;
      const el = { color: CATEGORY_COLORS[i], category: c.category, count: c.count, pct: Math.round(frac * 100), dashArray: `${frac * circ} ${circ}`, dashOffset: -(acc / total * circ) };
      acc += c.count; return el;
    });
  })();

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Analytics & Health</h1>
          <p className="text-xs text-muted mt-0.5">Track brand compliance, monitor performance and stay informed.</p>
        </div>
        <button onClick={() => downloadAnalytics().catch(() => addToast('Export failed.', 'error'))}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] shadow-2xs transition-colors cursor-pointer">
          <Download className="w-4 h-4" />Export Report
        </button>
      </div>

      {/* KPI Cards */}
      <StatCardGrid cards={[
    { label: 'Compliance Score', value: `${analytics.complianceScore}%`, icon: <CheckCircle2 className="w-5 h-5" />, variant: 'green', trend: 1.8, sparkPathIndex: 0 },
    { label: 'Reviewed Content', value: totals.decided >= 1000 ? `${(totals.decided / 1000).toFixed(1)}K` : String(totals.decided), icon: <TrendingUp className="w-5 h-5" />, variant: 'blue', trend: 12, sparkPathIndex: 1 },
    { label: 'Open Issues', value: totals.openFindings, icon: <AlertCircle className="w-5 h-5" />, variant: 'amber', trend: -8, sparkPathIndex: 2 },
    { label: 'Avg Review Time', value: analytics.reviewPerformance.avgReviewHours ? `${analytics.reviewPerformance.avgReviewHours.toFixed(1)} hrs` : '—', icon: <Clock className="w-5 h-5" />, variant: 'purple', trend: -14, sparkPathIndex: 3 },
  ]} />

      {/* Compliance Trends + Findings Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance Trends */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 border border-line shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-600" />Compliance Trends</h3>
            <div className="flex items-center gap-1 bg-[#FAF7EF] rounded-xl p-1">
              {[{ label: '7D', val: '7d' }, { label: '30D', val: '30d' }, { label: '90D', val: '90d' }, { label: '1Y', val: '1y' }].map((r) => (
                <button key={r.val} onClick={() => setAnalyticsRange(r.val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${analyticsRange === r.val ? 'bg-white text-ink-900 shadow-2xs' : 'text-muted hover:text-ink'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {/* Line chart */}
          <div className="relative h-40">
            <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 30, 60, 90, 120].map((y) => (
                <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#F1ECE0" strokeWidth="1" />
              ))}
              {/* Target 90% line */}
              <line x1="0" y1="36" x2="400" y2="36" stroke="#F1ECE0" strokeWidth="1.5" strokeDasharray="4 4" />
              {trendPoints.length >= 2 && (() => {
                const pts = trendPoints.map((p, i) => {
                  const x = (i / (trendPoints.length - 1)) * 400;
                  const y = 120 - (p.score / 100) * 120;
                  return `${x},${y}`;
                }).join(' ');
                const areaPath = `M0,${120 - (trendPoints[0].score / 100) * 120} L${trendPoints.map((p, i) => `${(i / (trendPoints.length - 1)) * 400},${120 - (p.score / 100) * 120}`).join(' L')} L400,120 L0,120 Z`;
                return (
                  <>
                    <path d={areaPath} fill="#4E7A3D" fillOpacity="0.08" />
                    <polyline points={pts} fill="none" stroke="#4E7A3D" strokeWidth="2.5" strokeLinejoin="round" />
                    {trendPoints.map((p, i) => (
                      <circle key={i} cx={(i / (trendPoints.length - 1)) * 400} cy={120 - (p.score / 100) * 120} r="3.5" fill="#4E7A3D" />
                    ))}
                  </>
                );
              })()}
              {trendPoints.length < 2 && <text x="200" y="60" textAnchor="middle" fontSize="10" fill="#9ca3af">No trend data yet</text>}
            </svg>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-1 -translate-x-8">
              {['100%', '90%', '80%', '70%', '60%'].map((l) => <span key={l} className="text-[9px] text-muted-light">{l}</span>)}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px]">
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-brand-500 rounded" /><span className="text-muted">Compliance Score</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#F1ECE0] border-t border-dashed border-muted-light" /><span className="text-muted">Target (90%)</span></div>
          </div>
        </div>

        {/* Findings by Category Donut */}
        <div className="bg-emerald-100 border-emerald-200 border rounded-2xl p-4 animate-view-fade-in stagger-1 hover:-translate-y-1 hover:shadow-lg transition-all">
          <h3 className="text-sm font-bold text-ink-900 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-brand-600" />Findings by Category</h3>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-28 h-28">
              <svg className="-rotate-90" width="112" height="112" viewBox="0 0 112 112">
                {donutSegments.map((seg) => (
                  <circle key={seg.category} cx="56" cy="56" r="38" fill="none" stroke={seg.color} strokeWidth="14"
                    strokeDasharray={seg.dashArray} strokeDashoffset={String(seg.dashOffset)} />
                ))}
                {donutSegments.length === 0 && <circle cx="56" cy="56" r="38" fill="none" stroke="#F1ECE0" strokeWidth="14" />}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-ink-900">{findingsTotal}</span>
                <span className="text-[9px] text-muted">Total Findings</span>
              </div>
            </div>
            <div className="w-full space-y-2">
              {donutSegments.map((seg) => (
                <div key={seg.category} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                  <span className="text-muted flex-1">{seg.category}</span>
                  <span className="font-semibold text-ink-900">{seg.count} ({seg.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3-column bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Violated Rules */}
        <div className="bg-blue-100 border-blue-200 border rounded-2xl p-4 animate-view-fade-in stagger-2 hover:-translate-y-1 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-ink-900 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />Top Violated Rules</h4>
            <button className="text-[11px] text-brand-600 font-semibold hover:underline">View All →</button>
          </div>
          <div className="space-y-2.5">
            {analytics.topRules.slice(0, 5).map((rule, i) => (
              <div key={rule.code} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-[#F1ECE0] text-ink-700 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="flex-1 text-xs text-ink-700 truncate">{rule.title}</span>
                <span className="text-xs font-semibold text-ink-900">{rule.count} times</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${i === 0 ? 'badge-rejected' : i <= 2 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {i === 0 ? 'High' : i <= 2 ? 'Med' : 'Low'}
                </span>
              </div>
            ))}
            {analytics.topRules.length === 0 && <p className="text-xs text-muted text-center py-4">No rule violations recorded.</p>}
          </div>
        </div>

        {/* Campaign Health */}
        <div className="bg-amber-100 border-amber-200 border rounded-2xl p-4 animate-view-fade-in stagger-3 hover:-translate-y-1 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-ink-900">Campaign Health</h4>
            <button className="text-[11px] text-brand-600 font-semibold hover:underline">View All →</button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 text-[10px] font-semibold text-muted uppercase tracking-wide pb-1 border-b border-line">
              <span>Campaign</span><span className="text-center">Compliance</span><span className="text-right">Issues</span>
            </div>
            {analytics.campaignHealth.slice(0, 5).map((ch) => (
              <div key={ch.campaign} className="grid grid-cols-3 items-center gap-2">
                <span className="text-xs text-ink-700 truncate">{ch.campaign}</span>
                <div className="space-y-1">
                  <div className="h-1.5 bg-[#F1ECE0] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${ch.score >= 90 ? 'bg-emerald-500' : ch.score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${ch.score}%` }} />
                  </div>
                  <span className="text-[9px] text-muted text-center block">{ch.score}%</span>
                </div>
                <span className="text-xs font-semibold text-ink-900 text-right">{ch.issues}</span>
              </div>
            ))}
            {analytics.campaignHealth.length === 0 && <p className="text-xs text-muted text-center py-4">No campaign data yet.</p>}
          </div>
        </div>

        {/* Guideline Health Donut */}
        <div className="bg-purple-100 border-purple-200 border rounded-2xl p-4 animate-view-fade-in stagger-4 hover:-translate-y-1 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-ink-900">Guideline Health</h4>
            <button className="text-[11px] text-brand-600 font-semibold hover:underline">View All →</button>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24">
              <svg className="-rotate-90" width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="38" fill="none" stroke="#F1ECE0" strokeWidth="12" />
                <circle cx="48" cy="48" r="38" fill="none" stroke="#10b981" strokeWidth="12"
                  strokeDasharray={`${(coverage / 100) * (2 * Math.PI * 38)} ${2 * Math.PI * 38}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-ink-900">{coverage}%</span>
                <span className="text-[9px] text-muted">Coverage</span>
              </div>
            </div>
            <div className="w-full space-y-2 text-xs">
              {[['Healthy', analytics.ruleCoverage.activeRules, '#10b981'], ['Needs Attention', Math.max(0, analytics.ruleCoverage.totalRules - analytics.ruleCoverage.activeRules - 1), '#f59e0b'], ['Inactive', 1, '#e5e7eb']].map(([label, cnt, color]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: String(color) }} />
                  <span className="text-muted flex-1">{label}</span>
                  <span className="font-semibold text-ink-900">{cnt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: Sentinel + Review Performance + Exception Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-emerald-100 border-emerald-200 border rounded-2xl p-4 animate-view-fade-in stagger-5 hover:-translate-y-1 hover:shadow-lg transition-all">
          <h4 className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-brand-600" />Sentinel Impact</h4>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: 'Alerts Detected', value: analytics.sentinel.open, trend: '+10%', color: 'text-emerald-600' },
              { label: 'Reassessments', value: analytics.sentinel.resolved, trend: '+5%', color: 'text-emerald-600' }].map((m) => (
              <div key={m.label} className="p-3 bg-[#FAF7EF] rounded-xl border border-line">
                <p className="text-[10px] text-muted">{m.label}</p>
                <p className="text-xl font-bold text-ink-900 mt-1">{m.value}</p>
                <span className={`text-[10px] font-semibold ${m.color}`}>{m.trend}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-100 border-blue-200 border rounded-2xl p-4 animate-view-fade-in stagger-6 hover:-translate-y-1 hover:shadow-lg transition-all">
          <h4 className="text-sm font-bold text-ink-900 mb-3">Review Performance</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#FAF7EF] rounded-xl border border-line">
              <p className="text-[10px] text-muted">Approval Rate</p>
              <p className="text-xl font-bold text-ink-900 mt-1">{approvalRate}%</p>
              <div className="mt-1.5 h-1.5 bg-[#F1ECE0] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${approvalRate}%` }} />
              </div>
            </div>
            <div className="p-3 bg-[#FAF7EF] rounded-xl border border-line">
              <p className="text-[10px] text-muted">Overdue Reviews</p>
              <p className="text-xl font-bold text-ink-900 mt-1">{totals.inReview}</p>
              <span className="text-[10px] font-semibold text-red-600">-1%</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-100 border-amber-200 border rounded-2xl p-4 animate-view-fade-in stagger-6 hover:-translate-y-1 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-ink-900">Exception Analytics</h4>
            <button className="text-[11px] text-brand-600 font-semibold hover:underline">View Details →</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: 'Active Exceptions', value: analytics.exceptions['Approved'] ?? 0, icon: '📋', color: 'bg-blue-50 border-blue-100' },
              { label: 'Expiring Soon', value: analytics.exceptions['Pending'] ?? 0, icon: '⏱', color: 'bg-amber-50 border-amber-100' }].map((m) => (
              <div key={m.label} className={`p-3 rounded-xl border ${m.color}`}>
                <p className="text-lg">{m.icon}</p>
                <p className="text-xl font-bold text-ink-900 mt-1">{m.value}</p>
                <p className="text-[10px] text-muted mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
