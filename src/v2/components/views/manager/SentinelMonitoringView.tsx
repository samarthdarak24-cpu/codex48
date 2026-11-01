import React, { useState } from 'react';
import {
  Radar,
  AlertTriangle,
  CheckCircle,
  Eye,
  ChevronDown,
  Calendar,
  X,
  Check,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { SentinelAlert } from '../../../types';
import { api } from '@/services/api';

const CATEGORY_COLORS: Record<string, string> = {
  'Claims Risk': '#f43f5e',
  'Brand Consistency': '#f59e0b',
  'Policy Violation': '#10b981',
  'Legal & Compliance': '#8b5cf6',
};

export const SentinelMonitoringView: React.FC = () => {
  const {
    sentinelAlerts,
    selectedAlert,
    setSelectedAlert,
    resolveSentinelAlert,
    searchQuery,
    showToast,
    loading,
  } = useApp();

  const [riskFilter, setRiskFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  const activeAlert = selectedAlert || sentinelAlerts[0];

  // Derived KPI counts.
  const totalAlerts = sentinelAlerts.length;
  const openAlerts = sentinelAlerts.filter((a) => a.status === 'Open').length;
  const resolvedAlerts = sentinelAlerts.filter((a) => a.status === 'Resolved').length;
  const highRisk = sentinelAlerts.filter((a) => a.severity === 'High').length;
  const mediumRisk = sentinelAlerts.filter((a) => a.severity === 'Medium').length;
  const lowRisk = sentinelAlerts.filter((a) => a.severity === 'Low').length;

  // Category distribution for the donut.
  const categoryCounts = sentinelAlerts.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1;
    return acc;
  }, {});
  const categoryEntries = Object.entries(categoryCounts);
  const donutSegments = (() => {
    let acc = 0;
    const total = Math.max(totalAlerts, 1);
    return categoryEntries.map(([cat, count]) => {
      const start = (acc / total) * 360;
      acc += count;
      const end = (acc / total) * 360;
      return { cat, count, start, end };
    });
  })();
  const donutBackground = `conic-gradient(${donutSegments
    .map((s) => `${CATEGORY_COLORS[s.cat] ?? '#cbd5e1'} ${s.start}deg ${s.end}deg`)
    .join(', ')})`;

  const filtered = sentinelAlerts.filter((al) => {
    if (riskFilter === 'High' && al.severity !== 'High') return false;
    if (riskFilter === 'Medium' && al.severity !== 'Medium') return false;
    if (riskFilter === 'Low' && al.severity !== 'Low') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        al.title.toLowerCase().includes(q) ||
        al.subtitle.toLowerCase().includes(q) ||
        al.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleRunSentinel = () => {
    setIsScanning(true);
    api
      .scanExpiring(30)
      .then((res) => {
        showToast(
          res && typeof res === 'object' && 'notified' in res
            ? `Sentinel scan complete: ${res.notified} item(s) notified across the workspace.`
            : 'Sentinel scan complete.',
        );
      })
      .catch((err: unknown) =>
        showToast(err instanceof Error ? err.message : 'Sentinel scan failed.', 'error'),
      )
      .finally(() => setIsScanning(false));
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main Monitoring Stream */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F7F3EA]">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-900">Sentinel Monitoring</h2>
            <p className="text-xs text-muted mt-0.5">
              AI-powered monitoring for brand risks across all content and channels.
            </p>
          </div>
          <button
            onClick={handleRunSentinel}
            disabled={isScanning}
            className="py-2 px-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
          >
            {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radar className="w-3.5 h-3.5" />}
            {isScanning ? 'Scanning…' : 'Run Sentinel Scan'}
          </button>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-line/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Radar className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted">Total Alerts</p>
                <h3 className="text-2xl font-bold text-ink-900 leading-tight">{totalAlerts}</h3>
              </div>
            </div>
            <div className="text-right"><span className="text-[10px] font-medium text-muted-light">live</span></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-line/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted">Open Alerts</p>
                <h3 className="text-2xl font-bold text-ink-900 leading-tight">{openAlerts}</h3>
              </div>
            </div>
            <div className="text-right"><span className="text-[10px] font-medium text-muted-light">live</span></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-line/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted">Resolved</p>
                <h3 className="text-2xl font-bold text-ink-900 leading-tight">{resolvedAlerts}</h3>
              </div>
            </div>
            <div className="text-right"><span className="text-[10px] font-medium text-muted-light">live</span></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-line/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-grape-50 text-grape-600 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5 text-grape-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted">High Risk</p>
                <h3 className="text-2xl font-bold text-ink-900 leading-tight">{highRisk}</h3>
              </div>
            </div>
            <div className="text-right"><span className="text-[10px] font-medium text-muted-light">live</span></div>
          </div>
        </div>

        {/* Filter Pills and Global Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'All', label: `All Alerts (${totalAlerts})` },
              { id: 'High', label: `High Risk (${highRisk})` },
              { id: 'Medium', label: `Medium Risk (${mediumRisk})` },
              { id: 'Low', label: `Low Risk (${lowRisk})` },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRiskFilter(r.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  riskFilter === r.id
                    ? 'bg-brand-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-[#FAF7EF] text-ink-600 border border-line'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled
              title="Date-range filtering is not available for Sentinel alerts."
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink-700 opacity-50 cursor-not-allowed"
            >
              <Calendar className="w-3.5 h-3.5 text-muted-light" />
              <span>Last 30 Days</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
            </button>
            <button
              disabled
              title="Channel filtering is not available for Sentinel alerts."
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink-700 opacity-50 cursor-not-allowed"
            >
              <span>All Channels</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
            </button>
          </div>
        </div>

        {/* Visual Analytics Row */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Alerts by Severity */}
          <div className="md:col-span-5 bg-white p-4 rounded-xl border border-line/80 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-ink-900 text-xs">Alerts by Severity</h4>
            </div>
            <div className="space-y-2.5 pt-1">
              {[
                { label: 'High', count: highRisk, color: 'bg-rose-500' },
                { label: 'Medium', count: mediumRisk, color: 'bg-amber-500' },
                { label: 'Low', count: lowRisk, color: 'bg-emerald-500' },
              ].map((bar) => {
                const max = Math.max(totalAlerts, 1);
                return (
                  <div key={bar.label}>
                    <div className="flex justify-between text-[10px] text-muted-light mb-0.5">
                      <span>{bar.label}</span>
                      <span>{bar.count}</span>
                    </div>
                    <div className="w-full bg-[#F1ECE0] rounded-full h-2 overflow-hidden">
                      <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${(bar.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alert by Category */}
          <div className="md:col-span-4 bg-white p-4 rounded-xl border border-line/80 shadow-2xs">
            <h4 className="font-bold text-ink-900 text-xs mb-2">Alert by Category</h4>
            {totalAlerts === 0 ? (
              <div className="h-24 flex items-center justify-center text-xs text-muted">No alerts to categorise.</div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                  <div className="w-full h-full rounded-full" style={{ background: donutBackground }} />
                  <div className="w-12 h-12 rounded-full bg-white absolute flex flex-col items-center justify-center shadow-inner">
                    <span className="text-sm font-bold text-ink-900">{totalAlerts}</span>
                    <span className="text-[8px] text-muted-light">Total</span>
                  </div>
                </div>
                <div className="space-y-1 text-[11px] flex-1">
                  {categoryEntries.map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-ink-600">
                        <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] ?? '#cbd5e1' }} />
                        {cat}
                      </span>
                      <span className="font-semibold text-ink">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Alerts by Status */}
          <div className="md:col-span-3 bg-white p-4 rounded-xl border border-line/80 shadow-2xs">
            <h4 className="font-bold text-ink-900 text-xs mb-2">Alerts by Status</h4>
            <div className="space-y-2.5 pt-1">
              {[
                { label: 'Open', count: openAlerts, color: 'bg-rose-500' },
                { label: 'Investigating', count: sentinelAlerts.filter((a) => a.status === 'Investigating').length, color: 'bg-brand-500' },
                { label: 'Resolved', count: resolvedAlerts, color: 'bg-emerald-500' },
              ].map((bar) => {
                const max = Math.max(totalAlerts, 1);
                return (
                  <div key={bar.label}>
                    <div className="flex justify-between text-[10px] text-muted-light mb-0.5">
                      <span>{bar.label}</span>
                      <span>{bar.count}</span>
                    </div>
                    <div className="w-full bg-[#F1ECE0] rounded-full h-2 overflow-hidden">
                      <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${(bar.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Recent Alerts Table */}
        <section className="bg-white rounded-xl border border-line shadow-2xs overflow-hidden">
          <div className="p-3.5 border-b border-[#F1ECE0] flex items-center justify-between">
            <h3 className="font-bold text-ink-900 text-xs">Recent Alerts</h3>
            <div className="flex items-center gap-3 text-xs">
              <button
                disabled
                title="Bulk acknowledgement is not available; resolve individual alerts."
                className="font-semibold text-brand-600 opacity-50 cursor-not-allowed"
              >
                ✓ Mark All as Read
              </button>
              <button className="text-muted hover:text-ink font-medium">View All →</button>
            </div>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#F1ECE0] bg-[#FAF7EF]/60 text-[11px] font-semibold text-muted uppercase">
                <th className="py-2.5 px-4 w-10">
                  <input type="checkbox" className="rounded border-line-strong text-brand-600 focus:ring-brand-500 h-4 w-4" />
                </th>
                <th className="py-2.5 px-3">Alert</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Detected On</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE0]">
              {loading && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted">Loading alerts…</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted">No alerts match this filter.</td>
                </tr>
              )}
              {filtered.map((al) => {
                const isSelected = activeAlert?.id === al.id;
                return (
                  <tr
                    key={al.id}
                    onClick={() => {
                      setSelectedAlert(al);
                      setIsDrawerOpen(true);
                    }}
                    className={`hover:bg-[#FAF7EF]/80 transition cursor-pointer ${
                      isSelected ? 'bg-brand-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-line-strong text-brand-600 focus:ring-brand-500 h-4 w-4" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          alt={al.title}
                          className="w-9 h-9 rounded-lg object-cover shrink-0 border border-line"
                          src={al.thumbnail}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink-900 truncate">{al.title}</div>
                          <div className="text-[11px] text-muted-light truncate">{al.subtitle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-700 bg-[#F1ECE0] px-2 py-0.5 rounded">
                        {al.category}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          al.severity === 'High'
                            ? 'bg-rose-100 text-rose-700'
                            : al.severity === 'Medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        ▲ {al.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-muted">{al.detectedOn}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          al.status === 'Resolved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : al.status === 'Investigating'
                            ? 'bg-brand-50 text-brand-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            al.status === 'Resolved'
                              ? 'bg-emerald-500'
                              : al.status === 'Investigating'
                              ? 'bg-brand-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        {al.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button className="text-muted-light hover:text-ink-600 p-1">
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>

      {/* Right Drawer: Alert Details */}
      {isDrawerOpen && activeAlert && (
        <aside className="w-[390px] bg-white border-l border-line flex flex-col justify-between shrink-0 z-20 overflow-y-auto shadow-lg">
          <div className="p-5 flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-ink-900 text-sm">Alert Details</h3>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  ▲ {activeAlert.severity} Priority
                </span>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-muted-light hover:text-ink-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Asset Preview */}
            <div className="rounded-xl overflow-hidden border border-line h-40 bg-[#FAF7EF]">
              <img
                alt={activeAlert.title}
                className="w-full h-full object-cover"
                src={activeAlert.thumbnail}
              />
            </div>

            {/* Title & Quote */}
            <div>
              <h4 className="font-bold text-ink-900 text-sm">{activeAlert.title}</h4>
              <p className="text-xs text-muted mt-0.5 font-medium">{activeAlert.subtitle}</p>
            </div>

            {/* Warning Callout Box */}
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                {activeAlert.description || 'This claim is not approved in our current brand guidelines.'}
              </p>
            </div>

            {/* Detection Details */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-ink">Detection Details</div>
              <div className="p-3 rounded-xl bg-[#FAF7EF] border border-line/70 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-light">Detected On:</span>
                  <span className="font-medium text-ink">{activeAlert.detectedOn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light">Channel:</span>
                  <span className="font-medium text-ink">{activeAlert.channel || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light">Campaign:</span>
                  <span className="font-medium text-ink">{activeAlert.campaign || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light">Content Type:</span>
                  <span className="font-medium text-ink">{activeAlert.contentType || '—'}</span>
                </div>
              </div>
            </div>

            {/* Recommended Action */}
            <div className="p-3 rounded-xl bg-brand-50/70 border border-brand-100 text-xs text-brand-700 space-y-1">
              <div className="font-bold text-[11px] text-brand-700 flex items-center gap-1">
                <span>💡 Recommended Action</span>
              </div>
              <p className="text-[11px] text-ink-700 leading-relaxed">
                {activeAlert.recommendedAction ||
                  'Review and remove or rephrase the claim according to brand guidelines.'}
              </p>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="p-4 border-t border-line bg-[#FAF7EF]/50 flex items-center gap-2">
            <button
              disabled
              title="Open this item from the Review Queue to inspect the content."
              className="flex-1 py-2.5 px-3 bg-white border border-line text-ink font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 opacity-50 cursor-not-allowed"
            >
              <Eye className="w-3.5 h-3.5 text-muted" /> View Content
            </button>
            <button
              onClick={() => resolveSentinelAlert(activeAlert.id)}
              className="flex-1 py-2.5 px-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" /> Resolve Alert
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
