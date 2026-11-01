import React, { useState, useEffect } from 'react';
import {
  FlaskConical, CheckCircle, AlertTriangle, Zap, Play, Download, Bookmark,
  ChevronDown, ArrowRight, Check, Eye, Info, Loader2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { Rule, Simulation } from '@/lib/types';
import { StatCardGrid } from '../../ui/StatCard';

export const RuleImpactSandboxView: React.FC = () => {
  const { runRuleSimulation, activateSimulation, showToast, submissions } = useApp();

  const [rules, setRules] = useState<Rule[]>([]);
  const [pastSims, setPastSims] = useState<Simulation[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [changeType, setChangeType] = useState<'Tighten' | 'Relax' | 'Modify'>('Tighten');
  const [describeChange, setDescribeChange] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeSim, setActiveSim] = useState<Simulation | null>(null);
  const [activeTab, setActiveTab] = useState<'Affected' | 'Breakdown' | 'Recommendations'>('Affected');

  useEffect(() => {
    api.rules().then(setRules).catch(() => {});
    api.simulations().then(setPastSims).catch(() => {});
  }, []);

  const selectedRule = rules.find((r) => r.id === selectedRuleId) || rules[0];

  const handleRun = async () => {
    if (!selectedRule) { showToast('Select a rule to simulate.', 'error'); return; }
    setIsRunning(true);
    try {
      const sim = await runRuleSimulation(selectedRule.id, changeType, describeChange || 'Proposed change');
      setActiveSim(sim as unknown as Simulation);
      setPastSims((prev) => [sim as unknown as Simulation, ...prev]);
      showToast('Simulation complete. No rules were changed.');
    } catch { /* toast shown by context */ }
    finally { setIsRunning(false); }
  };

  const impactScore = activeSim ? Math.round(((activeSim as any).affectedCount ?? 18) / Math.max(submissions.length, 1) * 100) : 18;
  const affectedItems = submissions.slice(0, 3);

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Rule Impact Sandbox</h1>
          <p className="text-xs text-muted mt-0.5">Test the impact of rule changes before applying them to live content.</p>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Total Simulations', value: pastSims.length || 42, icon: <FlaskConical className="w-5 h-5" />, variant: 'blue', trend: 12, sparkPathIndex: 0 },
    { label: 'Safe Changes', value: pastSims.filter((s: any) => s.impactLevel === 'Low').length || 34, icon: <CheckCircle className="w-5 h-5" />, variant: 'green', trend: 8, sparkPathIndex: 1 },
    { label: 'High Impact', value: pastSims.filter((s: any) => s.impactLevel === 'High').length || 6, icon: <AlertTriangle className="w-5 h-5" />, variant: 'amber', trend: 1, sparkPathIndex: 2 },
    { label: 'Avg Impact Score', value: `${impactScore}%`, icon: <Zap className="w-5 h-5" />, variant: 'purple', trend: -4, sparkPathIndex: 3 },
  ]} />

        {/* Run New Simulation */}
        <div className="bg-white rounded-2xl border border-line shadow-2xs p-5">
          <div className="flex items-center gap-2 mb-4">
            <Play className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-ink-900">Run New Simulation</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
            {/* Select Rule */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Select Rule to Test</label>
              <select value={selectedRuleId} onChange={(e) => setSelectedRuleId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer">
                <option value="">-- Select a rule --</option>
                {rules.map((r) => <option key={r.id} value={r.id}>{r.title} {(r as any).version ?? ''}</option>)}
              </select>
            </div>
            {/* Change Type */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Change Type</label>
              <div className="flex gap-1.5">
                {(['Tighten', 'Relax', 'Modify'] as const).map((t) => (
                  <button key={t} onClick={() => setChangeType(t)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${changeType === t ? 'bg-brand-600 text-white border-brand-600 shadow-2xs' : 'bg-white text-ink-700 border-line hover:bg-[#FAF7EF]'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {/* Describe Change */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Describe Change (Optional)</label>
              <input value={describeChange} onChange={(e) => setDescribeChange(e.target.value)} placeholder="Restrict use of logo on lifestyle products"
                className="w-full px-3 py-2.5 bg-white border border-line rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            {/* Run button */}
            <div>
              <button onClick={handleRun} disabled={isRunning || !selectedRule}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs">
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {isRunning ? 'Running…' : 'Run Impact Analysis →'}
              </button>
            </div>
          </div>
        </div>

        {/* Simulation Results */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Impact score + results */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-line shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900">Simulation Results</h3>
              {activeSim && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted">Simulation ID: {(activeSim as any).id || 'SIM-2026-001'}</span>
                  <span className="px-2 py-0.5 rounded-full badge-approved text-[10px] font-semibold">✓ Completed</span>
                </div>
              )}
            </div>
            <div className="flex items-start gap-6">
              {/* Donut */}
              <div className="relative w-28 h-28 shrink-0">
                <svg className="-rotate-90" width="112" height="112" viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r="42" fill="none" stroke="#F1ECE0" strokeWidth="10" />
                  <circle cx="56" cy="56" r="42" fill="none" stroke="#4E7A3D" strokeWidth="10"
                    strokeDasharray={`${(impactScore / 100) * (2 * Math.PI * 42)} ${2 * Math.PI * 42}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-ink-900">{impactScore}%</span>
                  <span className="text-[9px] text-muted">Impact Score</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-full badge-approved text-xs font-bold">✓ Low Impact</span>
                </div>
                <p className="text-xs text-ink-700 leading-relaxed mb-3">This rule change affects {impactScore}% of your content, primarily in lifestyle and promotional campaigns.</p>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <div className="flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5" /><span>Total Content</span><strong className="text-ink-900 ml-1">{submissions.length}</strong></div>
                  <div className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /><span>Affected</span><strong className="text-ink-900 ml-1">{Math.round(submissions.length * impactScore / 100)}</strong></div>
                  <div className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-blue-500" /><span>Requires Review</span><strong className="text-ink-900 ml-1">{Math.round(submissions.length * impactScore / 200)}</strong></div>
                </div>
              </div>
              {/* Impact by Channel bars */}
              <div className="shrink-0 w-36">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-2">Impact by Channel</p>
                <div className="flex items-end gap-2 h-16">
                  {[['Social', 12], ['Web', 24], ['Video', 8], ['Print', 32]].map(([label, pct]) => (
                    <div key={String(label)} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-brand-400 rounded-t" style={{ height: `${Number(pct) * 2}px` }} title={`${label}: ${pct}%`} />
                      <span className="text-[9px] text-muted-light">{label}</span>
                      <span className="text-[9px] font-bold text-ink-900">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-line pt-1">
              {(['Affected', 'Breakdown', 'Recommendations'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`pb-2 text-xs font-semibold transition ${activeTab === tab ? 'border-b-2 border-brand-600 text-brand-600' : 'text-muted hover:text-ink'}`}>
                  {tab} {tab === 'Affected' ? `(${affectedItems.length})` : ''}
                </button>
              ))}
            </div>

            {activeTab === 'Affected' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-gradient-to-r from-slate-50 via-blue-50/40 to-pink-50/30 border-b border-slate-200">
                    {['Content', 'Campaign', 'Impact', 'Issues', 'Action'].map((h) => <th key={h} className="py-2 px-3 text-[11px] font-semibold text-muted uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-[#F5F0E8]">
                    {affectedItems.map((sub, i) => (
                      <tr key={sub.id} className="hover:bg-[#FAF7EF]/60 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2"><img src={sub.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover border border-line" /><span className="text-xs font-medium text-ink-900">{sub.title}</span></div>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted">{sub.campaign}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${i === 0 ? 'badge-rejected' : i === 1 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {i === 0 ? '▲ High' : i === 1 ? '▲ Medium' : '✓ Low'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted">{i === 0 ? 'Logo usage restriction' : i === 1 ? 'Logo placement' : 'Minor format change'}</td>
                        <td className="py-2.5 px-3"><button className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"><Eye className="w-3.5 h-3.5" />View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {activeTab === 'Breakdown' && (
              <div className="py-6 text-center text-xs text-muted">Detailed breakdown will appear after running a simulation.</div>
            )}
            {activeTab === 'Recommendations' && (
              <div className="space-y-2 text-xs text-ink-700">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p>Consider a phased rollout to minimize disruption to active campaigns. Notify affected creators before activating.</p>
                </div>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="lg:col-span-4 space-y-4">
            {/* Rule Change Preview */}
            <div className="bg-white rounded-2xl border border-line shadow-2xs p-4 space-y-3">
              <h4 className="text-sm font-bold text-ink-900">Rule Change Preview</h4>
              <div className="grid grid-cols-2 gap-2">
                {['Current Rule', 'After Change'].map((label, i) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1.5">{label}</p>
                    <div className="rounded-xl overflow-hidden border border-line h-24 bg-[#F1ECE0] relative">
                      {submissions[i] && <img src={submissions[i].thumbnail} alt="" className="w-full h-full object-cover" />}
                      {i === 1 && <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center"><span className="text-red-600 text-lg">🚫</span></div>}
                    </div>
                  </div>
                ))}
              </div>
              {selectedRule && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800">
                  <Info className="w-3.5 h-3.5 text-blue-500 inline mr-1" />
                  {selectedRule.title} will be {changeType.toLowerCase()}ed under the new rule.
                </div>
              )}
            </div>

            {/* Impact Insights */}
            <div className="bg-white rounded-2xl border border-line shadow-2xs p-4 space-y-3">
              <h4 className="text-sm font-bold text-ink-900">Impact Insights</h4>
              <div className="space-y-2.5 text-xs">
                {[
                  { icon: '📊', label: 'Content at Risk', value: `${Math.round(submissions.length * impactScore / 100)} items (${impactScore}%)` },
                  { icon: '🎯', label: 'Campaigns Affected', value: `${Math.round(impactScore / 10)} campaigns` },
                  { icon: '📈', label: 'Estimated Reach Impact', value: `~${Math.round(impactScore * 12)}K impressions` },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 p-2 bg-[#FAF7EF] rounded-xl border border-line">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-muted flex-1">{item.label}</span>
                    <span className="font-semibold text-ink-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-line shadow-2xs p-4 space-y-2">
              <h4 className="text-sm font-bold text-ink-900">Quick Actions</h4>
              <button onClick={() => api.downloadAudit().catch(() => {})} className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
                <Download className="w-4 h-4" />Download Report
              </button>
              {activeSim && (
                <button onClick={() => activateSimulation(activeSim.id).catch(() => {})} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer transition-colors cursor-pointer">
                  <Bookmark className="w-4 h-4" />Save Simulation
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
