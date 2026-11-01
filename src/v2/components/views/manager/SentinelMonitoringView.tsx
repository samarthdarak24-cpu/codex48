import React, { useState } from 'react';
import {
  Radar, AlertTriangle, CheckCircle, Eye, ChevronDown, X, Check, ShieldAlert,
  Loader2, ArrowUpRight, ArrowDownRight, BarChart2, PieChart, MoreVertical,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { SentinelAlert } from '../../../types';
import { api } from '@/services/api';
import { StatCardGrid } from '../../ui/StatCard';

const SeverityBadge = ({ severity }: { severity: string }) => {
  const map: Record<string, string> = {
    High: 'badge-rejected',
    Medium: 'badge-pending',
    Low: 'badge-approved',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[severity] ?? 'badge-draft'}`}><AlertTriangle className="w-2.5 h-2.5" />{severity}</span>;
};

const CategoryBadge = ({ category }: { category: string }) => {
  const map: Record<string, string> = {
    'Claims Risk': 'badge-rejected',
    'Brand Consistency': 'badge-pending',
    'Policy Violation': 'badge-approved',
    'Legal & Compliance': 'badge-archived',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[category] ?? 'badge-draft'}`}>{category}</span>;
};

const CATEGORY_COLORS: Record<string, string> = {
  'Claims Risk': '#f43f5e', 'Brand Consistency': '#f59e0b', 'Policy Violation': '#10b981', 'Legal & Compliance': '#8b5cf6',
};

export const SentinelMonitoringView: React.FC = () => {
  const { sentinelAlerts, selectedAlert, setSelectedAlert, resolveSentinelAlert, searchQuery, showToast } = useApp();

  const [riskFilter, setRiskFilter] = useState<'All' | 'High Risk' | 'Medium Risk' | 'Low Risk'>('All');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const activeAlert = selectedAlert || sentinelAlerts[0];
  const totalAlerts = sentinelAlerts.length;
  const openAlerts = sentinelAlerts.filter((a) => a.status === 'Open').length;
  const resolvedAlerts = sentinelAlerts.filter((a) => a.status === 'Resolved').length;
  const highRisk = sentinelAlerts.filter((a) => a.severity === 'High').length;
  const mediumRisk = sentinelAlerts.filter((a) => a.severity === 'Medium').length;
  const lowRisk = sentinelAlerts.filter((a) => a.severity === 'Low').length;

  const filtered = sentinelAlerts.filter((a) => {
    if (riskFilter === 'High Risk' && a.severity !== 'High') return false;
    if (riskFilter === 'Medium Risk' && a.severity !== 'Medium') return false;
    if (riskFilter === 'Low Risk' && a.severity !== 'Low') return false;
    if (searchQuery) { const q = searchQuery.toLowerCase(); return a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q); }
    return true;
  });

  const categoryCounts = sentinelAlerts.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1; return acc;
  }, {});
  const categoryEntries = Object.entries(categoryCounts);

  const handleResolve = async () => {
    if (!activeAlert) return;
    setIsScanning(true);
    try { await api.resolveTask(activeAlert.id, 're_approve', 'Resolved from Sentinel Monitoring'); await resolveSentinelAlert(activeAlert.id); showToast('Alert resolved.'); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Resolution failed.', 'error'); }
    finally { setIsScanning(false); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Sentinel Monitoring</h1>
          <p className="text-xs text-muted mt-0.5">AI-powered monitoring for brand risks across all content and channels.</p>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Total Monitored Content', value: totalAlerts > 10 ? `${(totalAlerts / 10).toFixed(1)}K` : String(totalAlerts), icon: <ShieldAlert className="w-5 h-5" />, variant: 'blue', trend: 12, sparkPathIndex: 0 },
    { label: 'Active Alerts', value: openAlerts, icon: <AlertTriangle className="w-5 h-5" />, variant: 'red', trend: 3, sparkPathIndex: 1 },
    { label: 'Resolved Today', value: resolvedAlerts, icon: <CheckCircle className="w-5 h-5" />, variant: 'green', trend: 20, sparkPathIndex: 2 },
    { label: 'Monitoring Coverage', value: '98%', icon: <Eye className="w-5 h-5" />, variant: 'purple', trend: 1, sparkPathIndex: 3 },
  ]} />

        {/* Filter + channel toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All Alerts', 'High Risk', 'Medium Risk', 'Low Risk'] as const).map((tab) => {
              const key = tab === 'All Alerts' ? 'All' : tab as any;
              const cnt = tab === 'All Alerts' ? totalAlerts : tab === 'High Risk' ? highRisk : tab === 'Medium Risk' ? mediumRisk : lowRisk;
              return (
                <button key={tab} onClick={() => setRiskFilter(key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${riskFilter === key ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm font-bold' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                  {tab} ({cnt})
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            {['Last 30 Days', 'All Channels'].map((f) => (
              <button key={f} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-line rounded-xl text-xs text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
                {f} <ChevronDown className="w-3 h-3 text-muted-light" />
              </button>
            ))}
          </div>
        </div>

        {/* Analytics widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Trend chart */}
          <div className="bg-blue-100 border-blue-200 border rounded-2xl p-4 animate-view-fade-in stagger-1 hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-brand-600" />
              <h4 className="text-xs font-bold text-ink-900">Alerts Trend</h4>
            </div>
            <div className="h-24 flex items-end gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                const h = 20 + Math.round(Math.random() * 60);
                return <div key={i} className="flex-1 bg-brand-200 hover:bg-brand-400 rounded-t transition-colors cursor-pointer" style={{ height: `${h}px` }} />;
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px]">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-500" />Total Alerts</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Resolved</div>
            </div>
          </div>

          {/* Category donut */}
          <div className="bg-red-100 border-red-200 border rounded-2xl p-4 animate-view-fade-in stagger-2 hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="w-4 h-4 text-brand-600" />
              <h4 className="text-xs font-bold text-ink-900">Alert by Category</h4>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="-rotate-90" width="80" height="80" viewBox="0 0 80 80">
                  {(() => {
                    let acc = 0; const total = Math.max(totalAlerts, 1);
                    return categoryEntries.map(([cat, cnt]) => {
                      const r = 32; const circ = 2 * Math.PI * r;
                      const frac = cnt / total; const elem = (
                        <circle key={cat} cx="40" cy="40" r={r} fill="none" stroke={CATEGORY_COLORS[cat] ?? '#94a3b8'} strokeWidth="10"
                          strokeDasharray={`${frac * circ} ${circ}`} strokeDashoffset={-(acc / total * circ)} />
                      ); acc += cnt; return elem;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-bold text-ink-900">{totalAlerts}</span>
                  <span className="text-[9px] text-muted">Total</span>
                </div>
              </div>
              <div className="space-y-1.5 text-[10px]">
                {categoryEntries.map(([cat, cnt]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[cat] ?? '#94a3b8' }} />
                    <span className="text-muted flex-1 truncate max-w-[100px]">{cat}</span>
                    <span className="font-semibold text-ink-900">{Math.round((cnt / Math.max(totalAlerts, 1)) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Channel distribution */}
          <div className="bg-emerald-100 border-emerald-200 border rounded-2xl p-4 animate-view-fade-in stagger-3 hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-brand-600" />
              <h4 className="text-xs font-bold text-ink-900">Channel Distribution</h4>
            </div>
            <div className="h-20 flex items-end justify-around gap-2">
              {[['Web', 6, 'bg-blue-400'], ['Social', 5, 'bg-emerald-400'], ['Print', 4, 'bg-amber-400'], ['Other', 3, 'bg-purple-400']].map(([label, val, color]) => (
                <div key={String(label)} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full ${color} rounded-t`} style={{ height: `${Number(val) * 12}px` }} title={String(label)} />
                  <span className="text-[10px] text-muted-light">{label}</span>
                  <span className="text-[10px] font-semibold text-ink-900">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Alerts table */}
        <div className="bg-white rounded-2xl border border-line shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <h4 className="text-sm font-bold text-ink-900">Recent Alerts</h4>
            <div className="flex items-center gap-2">
              <button className="text-xs font-semibold text-brand-600 hover:underline">✓ Mark All as Read</button>
              <button className="text-xs font-semibold text-brand-600 hover:underline">View All →</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gradient-to-r from-slate-50 via-blue-50/40 to-pink-50/30 border-b border-slate-200">
                <th className="py-3 px-4 w-8"><input type="checkbox" className="rounded" /></th>
                {['Alert', 'Category', 'Severity', 'Detected On', 'Status', 'Actions'].map((h) => <th key={h} className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {filtered.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-xs text-muted">No alerts found.</td></tr>}
                {filtered.map((a) => (
                  <tr key={a.id} onClick={() => { setSelectedAlert(a); setIsDrawerOpen(true); }}
                    className={`cursor-pointer transition-colors ${selectedAlert?.id === a.id ? 'bg-brand-50/30' : 'hover:bg-[#FAF7EF]/60'}`}>
                    <td className="py-3 px-4"><input type="checkbox" className="rounded" onClick={(e) => e.stopPropagation()} /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img src={a.thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover border border-line shrink-0" />
                        <div>
                          <p className="font-semibold text-ink-900 text-xs">{a.title}</p>
                          <p className="text-[10px] text-muted-light line-clamp-1">{a.subtitle || a.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4"><CategoryBadge category={a.category} /></td>
                    <td className="py-3 px-4"><SeverityBadge severity={a.severity} /></td>
                    <td className="py-3 px-4 text-xs text-muted whitespace-nowrap">{a.detectedOn}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${a.status === 'Open' ? 'text-red-600' : 'text-emerald-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'Open' ? 'bg-red-500' : 'bg-emerald-500'}`} />{a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => e.stopPropagation()} className="p-1.5 text-muted hover:text-ink-700 rounded"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => e.stopPropagation()} className="p-1.5 text-muted hover:text-ink-700 rounded"><MoreVertical className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-line">
            <p className="text-xs text-muted">Showing 1–{Math.min(filtered.length, 5)} of {filtered.length} alerts</p>
            <div className="flex items-center gap-1">
              {[1,2,3,4].map((p) => <button key={p} className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${p === 1 ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm font-bold' : 'border border-line text-muted hover:bg-[#FAF7EF]'}`}>{p}</button>)}
            </div>
          </div>
        </div>
      </main>

      {/* Right panel */}
      {isDrawerOpen && activeAlert && (
        <aside className="w-[320px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <h3 className="text-sm font-bold text-ink-900">Alert Details</h3>
            <button onClick={() => setIsDrawerOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-line">
              <img src={activeAlert.thumbnail} alt="" className="w-full h-36 object-cover" />
              <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-red-500 rounded-full text-white text-[10px] font-bold">
                <AlertTriangle className="w-3 h-3" />High Priority
              </div>
            </div>
            <div>
              <p className="font-bold text-ink-900 text-sm">{activeAlert.title}</p>
              <div className="mt-1.5 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-800 leading-relaxed">{activeAlert.description || 'This alert requires immediate attention.'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-ink-900 mb-2">Detection Details</p>
              {[['Detected On', activeAlert.detectedOn], ['Channel', 'Social Media'], ['Campaign', activeAlert.category], ['Content Type', 'Image Post']].map(([label, val]) => (
                <div key={String(label)} className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8] last:border-0 text-xs">
                  <span className="text-muted">{label}</span>
                  <span className="font-medium text-ink">: {val}</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs">
              <span className="text-blue-500 shrink-0 mt-0.5">💡</span>
              <div>
                <p className="font-semibold text-blue-900 mb-0.5">Recommended Action</p>
                <p className="text-blue-800 leading-relaxed">{activeAlert.recommendedAction || 'Review the content and take corrective action.'}</p>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-line space-y-2 shrink-0">
            <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
              <Eye className="w-4 h-4" />View Content
            </button>
            {activeAlert.status !== 'Resolved' && (
              <button onClick={handleResolve} disabled={isScanning} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer transition-colors cursor-pointer disabled:opacity-50">
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Resolve Alert
              </button>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};


