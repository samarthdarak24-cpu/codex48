import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical,
  CheckCircle,
  AlertTriangle,
  Zap,
  Play,
  Download,
  Bookmark,
  ChevronDown,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Check,
  Eye,
  Info,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { Rule, Simulation, SimulationItem } from '@/lib/types';

const PALETTE: Record<string, string> = {
  lime: '#ECFCCB',
  peach: '#FFEDD5',
  mint: '#D1FAE5',
  violet: '#EDE9FE',
  sky: '#E0F2FE',
  rose: '#FFE4E6',
  sand: '#FEF3C7',
  indigo: '#E0E7FF',
};

const impactBadge = (impact: string) => {
  switch (impact) {
    case 'Non-Compliant':
      return 'bg-rose-100 text-rose-700';
    case 'Needs Review':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-emerald-100 text-emerald-700';
  }
};

const impactLabel = (impact: string) => {
  switch (impact) {
    case 'Non-Compliant':
      return '▲ Non-Compliant';
    case 'Needs Review':
      return '▲ Needs Review';
    default:
      return '✓ Compliant';
  }
};

export const RuleImpactSandboxView: React.FC = () => {
  const { runRuleSimulation, activateSimulation, showToast } = useApp();

  const [rules, setRules] = useState<Rule[]>([]);
  const [pastSims, setPastSims] = useState<Simulation[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingSims, setLoadingSims] = useState(true);

  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [changeType, setChangeType] = useState<'Tighten' | 'Relax' | 'Modify'>('Tighten');
  const [newValue, setNewValue] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<Simulation | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingRules(true);
    api
      .rules()
      .then((rows) => {
        if (cancelled) return;
        setRules(rows);
        if (rows[0]) setSelectedRuleId((prev) => prev || rows[0].id);
      })
      .catch(() => {
        if (!cancelled) setRules([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRules(false);
      });

    setLoadingSims(true);
    api
      .simulations()
      .then((rows) => {
        if (!cancelled) setPastSims(rows);
      })
      .catch(() => {
        if (!cancelled) setPastSims([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSims(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Derived stat cards from the real simulations list.
  const simScore = (s: Simulation) =>
    s.totals.checked > 0
      ? Math.round(((s.totals.needsReview + s.totals.nonCompliant) / s.totals.checked) * 100)
      : 0;
  const totalSims = pastSims.length;
  const safeChanges = pastSims.filter((s) => s.totals.needsReview + s.totals.nonCompliant === 0).length;
  const highImpact = pastSims.filter((s) => s.totals.nonCompliant > 0).length;
  const avgImpact = totalSims
    ? Math.round(pastSims.reduce((n, s) => n + simScore(s), 0) / totalSims)
    : 0;

  const affectedPct = useMemo(() => {
    if (!result || result.totals.checked === 0) return 0;
    return Math.round(
      ((result.totals.needsReview + result.totals.nonCompliant) / result.totals.checked) * 100,
    );
  }, [result]);

  const [activeTab, setActiveTab] = useState<'Affected Content' | 'Detailed Breakdown' | 'Recommendations'>('Affected Content');

  const handleRunSimulation = async () => {
    if (!selectedRuleId) {
      showToast('Select a rule to simulate.', 'warning');
      return;
    }
    setIsSimulating(true);
    try {
      const res = (await runRuleSimulation(selectedRuleId, changeType, newValue || changeType)) as Simulation;
      setResult(res);
      setActiveTab('Affected Content');
    } catch {
      /* error toast already shown by context */
    } finally {
      setIsSimulating(false);
    }
  };

  const handleActivate = async () => {
    if (!result) return;
    setIsActivating(true);
    try {
      await activateSimulation(result.id);
    } catch {
      /* error toast already shown by context */
    } finally {
      setIsActivating(false);
    }
  };

  const downloadReport = () => {
    if (!result) return;
    const rows = [
      ['submission_id', 'title', 'campaign', 'current_status', 'impact', 'note'],
      ...result.items.map((i) => [
        i.submissionId,
        i.title,
        i.meta,
        i.currentStatus,
        i.impact,
        i.note,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation-${result.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  return (
    <div className="flex-1 overflow-y-auto p-7 space-y-6 bg-[#F7F3EA]">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink-900">Rule Impact Sandbox</h2>
        <p className="text-sm text-muted mt-0.5">
          Test the impact of rule changes before applying them to live content.
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-line/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted">Total Simulations</p>
              <p className="text-2xl font-bold text-ink-900 mt-0.5">{loadingSims ? '—' : totalSims}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-medium text-muted-light">live</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-line/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted">Safe Changes</p>
              <p className="text-2xl font-bold text-ink-900 mt-0.5">{loadingSims ? '—' : safeChanges}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-medium text-muted-light">live</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-line/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted">High Impact</p>
              <p className="text-2xl font-bold text-ink-900 mt-0.5">{loadingSims ? '—' : highImpact}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-medium text-muted-light">live</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-line/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-grape-50 text-grape-600 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-grape-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted">Avg Impact Score</p>
              <p className="text-2xl font-bold text-ink-900 mt-0.5">{loadingSims ? '—' : `${avgImpact}%`}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-medium text-muted-light">across runs</span>
          </div>
        </div>
      </div>

      {/* Run New Simulation Input Panel */}
      <section className="bg-white rounded-2xl border border-line/80 p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 fill-current" />
          </div>
          <h3 className="font-bold text-ink-900 text-sm">Run New Simulation</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Select Rule to Test */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-xs font-semibold text-ink-600">Select Rule to Test</label>
            <div className="relative">
              <select
                value={selectedRuleId}
                onChange={(e) => setSelectedRuleId(e.target.value)}
                disabled={loadingRules}
                className="w-full pl-3 pr-8 py-2 bg-[#FAF7EF] border border-line rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
              >
                {loadingRules && <option>Loading rules…</option>}
                {!loadingRules && rules.length === 0 && <option>No rules available</option>}
                {rules.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} · {r.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Change Type Buttons */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-xs font-semibold text-ink-600">Change Type</label>
            <div className="flex items-center p-1 bg-[#F1ECE0] rounded-xl">
              {(['Tighten', 'Relax', 'Modify'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setChangeType(type)}
                  className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition ${
                    changeType === type
                      ? 'bg-brand-600 text-white shadow-2xs'
                      : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Describe Change */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-xs font-semibold text-ink-600">New Rule Value (Optional)</label>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="e.g. Restrict use of logo on lifestyle products"
              className="w-full px-3 py-2 bg-[#FAF7EF] border border-line rounded-xl text-xs text-ink placeholder-muted-light focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Run Button */}
          <div className="md:col-span-2">
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating || loadingRules || rules.length === 0}
              className="w-full py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-2xs disabled:opacity-50"
            >
              {isSimulating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              <span>{isSimulating ? 'Analyzing...' : 'Run Impact Analysis'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Simulation Results Section */}
      <section className="grid grid-cols-12 gap-5 items-start">
        {/* Left Side: Score & Breakdown & Affected Content (8 cols) */}
        <div className="col-span-12 xl:col-span-8 space-y-5">
          {!result ? (
            <div className="bg-white rounded-2xl border border-line/80 p-10 shadow-2xs text-center text-muted text-sm">
              {isSimulating
                ? 'Running sandbox impact analysis across live content…'
                : 'Run a simulation above to see the real impact on live content. Nothing is changed — every run is non-mutating.'}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-line/80 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F1ECE0]">
                  <h3 className="font-bold text-ink-900 text-sm">Simulation Results</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-light font-mono">Simulation ID: {result.id}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> {result.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Circular Gauge */}
                  <div className="md:col-span-7 flex items-center gap-4">
                    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" fill="none" r="14" stroke="#f1f5f9" strokeWidth="3" />
                        <circle
                          cx="18"
                          cy="18"
                          fill="none"
                          r="14"
                          stroke={affectedPct >= 30 ? '#f43f5e' : '#10b981'}
                          strokeDasharray={`${affectedPct}, 100`}
                          strokeLinecap="round"
                          strokeWidth="3.2"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-lg font-bold text-ink-900 leading-none">{affectedPct}%</span>
                        <span className="block text-[9px] text-muted-light font-medium">Impact Score</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                        {affectedPct >= 30 ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>High Impact</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Low Impact</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-1 leading-relaxed">
                        This rule change affects {affectedPct}% of checked content
                        {affectedPct >= 30 ? ', concentrated in high-risk campaigns.' : ', mostly low-risk items.'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-ink-600">
                        <div>Total Content <strong className="text-ink-900">{result.totals.checked}</strong></div>
                        <div>Affected <strong className="text-ink-900">{result.totals.needsReview + result.totals.nonCompliant}</strong></div>
                        <div>Requires Review <strong className="text-ink-900">{result.totals.needsReview}</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* Impact Breakdown Bar Chart */}
                  <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-[#F1ECE0] md:pl-5">
                    <div className="text-xs font-bold text-ink mb-2">Impact Breakdown</div>
                    <div className="space-y-2">
                      {[
                        { label: 'Compliant', count: result.totals.compliant, color: 'bg-emerald-400' },
                        { label: 'Needs Review', count: result.totals.needsReview, color: 'bg-amber-400' },
                        { label: 'Non-Compliant', count: result.totals.nonCompliant, color: 'bg-rose-400' },
                      ].map((bar) => {
                        const max = Math.max(result.totals.checked, 1);
                        return (
                          <div key={bar.label}>
                            <div className="flex justify-between text-[10px] text-muted-light mb-0.5">
                              <span>{bar.label}</span>
                              <span>{bar.count}</span>
                            </div>
                            <div className="w-full bg-[#F1ECE0] rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full ${bar.color} rounded-full`}
                                style={{ width: `${(bar.count / max) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Activate control */}
                <div className="pt-3 border-t border-[#F1ECE0] flex items-center justify-between">
                  <p className="text-[11px] text-muted">
                    Simulation is non-mutating. Activating applies the rule change and triggers Sentinel reassessment.
                  </p>
                  <button
                    onClick={handleActivate}
                    disabled={isActivating || result.status === 'Activated'}
                    className="py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-2xs disabled:opacity-50"
                  >
                    {isActivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {result.status === 'Activated' ? 'Activated' : 'Activate Rule Change'}
                  </button>
                </div>
              </div>

              {/* Affected Content Table */}
              <div className="bg-white rounded-2xl border border-line/80 shadow-2xs overflow-hidden">
                <div className="border-b border-[#F1ECE0] px-5 pt-3 flex items-center gap-6 text-xs font-semibold">
                  {(['Affected Content', 'Detailed Breakdown', 'Recommendations'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-2.5 transition ${
                        activeTab === tab
                          ? 'border-b-2 border-brand-600 text-brand-600 font-bold'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {tab === 'Affected Content' ? `Affected Content (${result.items.length})` : tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'Affected Content' && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#F1ECE0] bg-[#FAF7EF]/60 text-[11px] font-semibold text-muted uppercase">
                        <th className="py-2.5 px-4">Content</th>
                        <th className="py-2.5 px-3">Campaign</th>
                        <th className="py-2.5 px-3">Impact</th>
                        <th className="py-2.5 px-3">Issues</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1ECE0]">
                      {result.items.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted">
                            No content is affected by this rule change.
                          </td>
                        </tr>
                      )}
                      {result.items.map((item: SimulationItem) => (
                        <tr key={item.submissionId} className="hover:bg-[#FAF7EF]">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-ink-700 shrink-0"
                                style={{ background: PALETTE[item.thumb.palette] || '#F1ECE0' }}
                              >
                                {item.title.slice(0, 1)}
                              </div>
                              <span className="font-semibold text-ink">{item.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-ink-600">{item.meta}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${impactBadge(item.impact)}`}>
                              {impactLabel(item.impact)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-ink-600 max-w-xs truncate">{item.note}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              disabled
                              title="Open this item from the Review Queue to inspect it."
                              className="text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-0.5 opacity-60 cursor-not-allowed"
                            >
                              <Eye className="w-3 h-3" /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'Detailed Breakdown' && (
                  <div className="p-5 text-xs space-y-3">
                    {result.breakdown ? (
                      <>
                        <div className="flex justify-between"><span className="text-muted">Newly flagged</span><span className="font-bold text-ink-900">{result.breakdown.newlyFlagged.count}</span></div>
                        <div className="flex justify-between"><span className="text-muted">Resolved by change</span><span className="font-bold text-ink-900">{result.breakdown.resolved.count}</span></div>
                        <div className="flex justify-between"><span className="text-muted">Unchanged</span><span className="font-bold text-ink-900">{result.breakdown.unchanged.count}</span></div>
                        <div className="flex justify-between"><span className="text-muted">Potential conflicts</span><span className="font-bold text-ink-900">{result.breakdown.potentialConflicts}</span></div>
                        <div className="flex justify-between"><span className="text-muted">Exceptions needing attention</span><span className="font-bold text-ink-900">{result.breakdown.exceptionsNeedingAttention.count}</span></div>
                      </>
                    ) : (
                      <p className="text-muted">Detailed breakdown is not available for this simulation.</p>
                    )}
                  </div>
                )}

                {activeTab === 'Recommendations' && (
                  <div className="p-5 text-xs space-y-2">
                    {result.insight && result.insight.length > 0 ? (
                      result.insight.map((line, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 text-brand-600 mt-0.5 shrink-0" />
                          <p className="text-ink-700 leading-relaxed">{line}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted">No specific recommendations were returned for this simulation.</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Side: Before / After Preview & Insights (4 cols) */}
        <aside className="col-span-12 xl:col-span-4 space-y-4">
          {/* Rule Change Preview */}
          <div className="bg-white rounded-2xl border border-line/80 p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-ink-900 text-sm">Rule Change Preview</h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-line overflow-hidden bg-amber-50/20 p-2 text-center">
                <span className="text-[10px] font-bold text-muted-light uppercase tracking-wider block mb-1">
                  Current Rule
                </span>
                <div className="h-28 rounded-lg overflow-hidden bg-white border border-[#F1ECE0] flex items-center justify-center p-1">
                  <img
                    alt="Current rule"
                    className="w-full h-full object-contain"
                    src="/images/brand/serum.webp"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-line overflow-hidden bg-rose-50/20 p-2 text-center">
                <span className="text-[10px] font-bold text-muted-light uppercase tracking-wider block mb-1">
                  After Change
                </span>
                <div className="h-28 rounded-lg overflow-hidden bg-white border border-[#F1ECE0] flex items-center justify-center p-1 relative">
                  <img
                    alt="After change"
                    className="w-full h-full object-contain opacity-85"
                    src="/images/brand/serum.webp"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full border-4 border-rose-500 flex items-center justify-center relative">
                      <div className="w-12 h-1 bg-rose-500 transform rotate-45 absolute" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-brand-50/60 border border-brand-100 flex items-start gap-2 text-xs text-brand-700">
              <Info className="w-3.5 h-3.5 text-brand-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-ink-700 leading-normal">
                {selectedRule
                  ? `Editing "${selectedRule.title}" (${changeType}). ${newValue || 'No new value supplied — keeping the current condition.'}`
                  : 'Select a rule to preview the change.'}
              </p>
            </div>
          </div>

          {/* Impact Insights */}
          <div className="bg-white rounded-2xl border border-line/80 p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-ink-900 text-sm">Impact Insights</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">Content at Risk</span>
                <span className="font-bold text-ink-900">
                  {result ? `${result.totals.needsReview + result.totals.nonCompliant} items (${affectedPct}%)` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Currently Compliant</span>
                <span className="font-bold text-ink-900">{result ? result.totals.compliant : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Content Checked</span>
                <span className="font-bold text-ink-900">{result ? result.totals.checked : '—'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={downloadReport}
              disabled={!result}
              className="py-2.5 px-3 bg-white border border-line hover:bg-[#FAF7EF] text-ink font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-muted" /> Download Report
            </button>
            <button
              disabled
              title="Simulations are already recorded on the server when you run them."
              className="py-2.5 px-3 bg-white border border-line text-ink font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs opacity-50 cursor-not-allowed"
            >
              <Bookmark className="w-3.5 h-3.5" /> Save Simulation
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
};
