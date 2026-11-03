import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlaskConical, Play, Download, ArrowRight, Eye, AlertTriangle, Info,
  AlertCircle, Lock, RotateCw, CheckCircle2, FileText, ArrowUpRight,
  ShieldAlert, X, Zap, Bookmark,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { Rule, Simulation, SimulationItem } from '@/lib/types';
import { motion, useReducedMotion } from 'motion/react';
import {
  AnimatedBadge, AnimatedButton, AnimatedCard, AnimatedCounter, AnimatedModal,
  AnimatedProgress, BarSeries, ChartContainer, EASE, HoverLiftCard, LayoutTransition, NumberTicker,
  ProcessingSpinner, Reveal, RingProgress, SectionHeader, SkeletonCard, SuccessCheck,
  type Tone,
} from '../../motion';
import { StepTrail, type StepTrailItem } from '../../detail';
import { RuleFlowDiagram } from '../../ui/RuleFlowDiagram';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type LoadState = 'loading' | 'ready' | 'error';
type ResultTab = 'affected' | 'breakdown' | 'insights';

function when(iso?: string | null): string {
  if (!iso) return 'not recorded';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function impactTone(impact: SimulationItem['impact']): { chip: string; tone: Tone } {
  if (impact === 'Non-Compliant') return { chip: 'badge-rejected', tone: 'danger' };
  if (impact === 'Needs Review') return { chip: 'badge-pending', tone: 'amber' };
  return { chip: 'badge-approved', tone: 'sage' };
}

const Denied: React.FC = () => (
  <div className="mx-auto max-w-lg px-6 py-16 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta-50 text-terracotta-600">
      <Lock className="h-5 w-5" />
    </div>
    <h1 className="mt-4 text-lg font-semibold text-ink">Manager access required</h1>
    <p className="mt-1 text-xs leading-relaxed text-muted">
      Simulation runs are restricted to brand managers because activating a result changes a live
      rule. Ask a workspace owner for the manager role.
    </p>
  </div>
);

const Metric: React.FC<{
  label: string;
  value: number | null;
  icon: React.ReactNode;
  chip: string;
  hint: string;
  index?: number;
  ticker?: boolean;
}> = ({ label, value, icon, chip, hint, index = 0, ticker = false }) => (
  <AnimatedCard className="p-4" delay={index * 0.06}>
    <div className="flex items-start justify-between gap-2">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${chip}`}>{icon}</span>
      <span className="text-2xs text-muted">{hint}</span>
    </div>
    <p className="mt-3 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
    <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">
      {value === null ? (
        <span className="text-muted-light">—</span>
      ) : ticker ? (
        <NumberTicker value={value} />
      ) : (
        <AnimatedCounter value={value} />
      )}
    </p>
  </AnimatedCard>
);

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export const RuleImpactSandboxView: React.FC = () => {
  const { runRuleSimulation, activateSimulation, showToast, loading, error, role, guidelines } = useApp();

  const [rules, setRules] = useState<Rule[]>([]);
  const [rulesState, setRulesState] = useState<LoadState>('loading');
  const [pastSims, setPastSims] = useState<Simulation[]>([]);
  const [simsState, setSimsState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [changeType, setChangeType] = useState<'Tighten' | 'Relax' | 'Modify'>('Tighten');
  const [describeChange, setDescribeChange] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeSim, setActiveSim] = useState<Simulation | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>('affected');
  const [notice, setNotice] = useState('');
  const [confirmActivate, setConfirmActivate] = useState(false);
  const [activating, setActivating] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    setRulesState('loading');
    setSimsState('loading');
    setLoadError('');

    api.rules()
      .then((rows) => {
        if (cancelled) return;
        setRules(rows);
        setRulesState('ready');
        setSelectedRuleId((prev) => prev || rows[0]?.id || '');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setRulesState('error');
        setLoadError(err instanceof Error ? err.message : 'Could not load rules.');
      });

    api.simulations()
      .then((rows) => {
        if (cancelled) return;
        setPastSims(rows);
        setSimsState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setSimsState('error');
      });

    return () => { cancelled = true; };
  }, [reloadKey]);

  const selectedRule = useMemo(
    () => rules.find((r) => r.id === selectedRuleId) ?? rules[0],
    [rules, selectedRuleId],
  );

  const totals = activeSim?.totals;
  const attention = totals ? totals.needsReview + totals.nonCompliant : 0;
  const attentionPct = totals && totals.checked > 0
    ? Math.round((attention / totals.checked) * 100)
    : 0;

  /* The run panel glows while a proposed change is being written. */
  const isEditing = describeChange.trim().length > 0;

  const outcomeBars = totals
    ? [
        { label: 'Compliant', value: totals.compliant },
        { label: 'Needs review', value: totals.needsReview },
        { label: 'Non-compliant', value: totals.nonCompliant },
      ]
    : [];

  const handleRun = async () => {
    if (!selectedRule) { showToast('Select a rule to simulate.', 'error'); return; }
    setIsRunning(true);
    setNotice('');
    try {
      const sim = await runRuleSimulation(
        selectedRule.id,
        changeType,
        describeChange.trim() || 'Proposed change',
      ) as Simulation;
      setActiveSim(sim);
      setPastSims((prev) => [sim, ...prev.filter((s) => s.id !== sim.id)]);
      setActiveTab('affected');
      setNotice('Simulation complete. Nothing was changed — this run is non-mutating.');
    } catch {
      /* the context raises the error toast */
    } finally {
      setIsRunning(false);
    }
  };

  const handleActivate = async () => {
    if (!activeSim) return;
    setActivating(true);
    try {
      await activateSimulation(activeSim.id);
      setConfirmActivate(false);
      setActiveSim((prev) => (prev ? { ...prev, status: 'Activated' } : prev));
      setNotice('Rule change activated. Sentinel will create reassessment tasks for affected content.');
    } catch {
      /* the context raises the error toast */
    } finally {
      setActivating(false);
    }
  };

  const openPastSim = (sim: Simulation) => {
    setActiveSim(sim);
    setActiveTab('affected');
    setNotice('');
  };

  const downloadExport = useCallback(() => {
    api.downloadAudit().catch((err: unknown) => {
      showToast(err instanceof Error ? err.message : 'Export failed.', 'error');
    });
  }, [showToast]);

  /* ---- The simulation flow — every node reflects the run's real state ---- */
  const simSteps: StepTrailItem[] = [
    {
      label: 'Current rule', tone: 'olive', icon: <FlaskConical className="h-3 w-3" />,
      state: selectedRule ? 'done' : 'active',
      hint: selectedRule ? selectedRule.code : 'pick a rule',
    },
    {
      label: 'Proposed change', tone: 'brand', icon: <Play className="h-3 w-3" />,
      state: describeChange.trim() ? 'done' : selectedRule ? 'active' : 'pending',
      hint: changeType,
    },
    {
      label: 'Impact analysis', tone: 'terracotta', icon: <Eye className="h-3 w-3" />,
      state: isRunning ? 'active' : activeSim ? 'done' : 'pending',
      hint: isRunning ? 'running…' : activeSim ? 'complete' : 'not run',
    },
    {
      label: 'Affected content', tone: 'amber', icon: <FileText className="h-3 w-3" />,
      state: activeSim ? 'done' : 'pending',
      hint: activeSim ? `${activeSim.items.length} item${activeSim.items.length === 1 ? '' : 's'}` : '—',
    },
    {
      label: 'Simulation result', tone: 'sage', icon: <CheckCircle2 className="h-3 w-3" />,
      state: activeSim ? (activeSim.status === 'Failed' ? 'error' : 'done') : 'pending',
      hint: activeSim ? activeSim.status : 'awaiting run',
    },
  ];

  if (role !== 'manager') return <Denied />;

  if (loading || rulesState === 'loading') {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-[1440px] space-y-5">
          <div className="h-16 animate-pulse rounded-2xl bg-cream-100" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1440px] space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">
              Rule impact sandbox
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">Impact Sandbox</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Runs are non-mutating. Every number on this page comes from a simulation the backend
              actually executed — nothing is previewed or estimated.
            </p>
          </div>
          <span className="badge-draft">
            <FlaskConical className="h-3 w-3" />Read-only until you activate
          </span>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-xs text-danger-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {rulesState === 'error' && (
          <div role="alert" className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-xs text-danger-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{loadError || 'Could not load the rule list.'}</span>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger-300 bg-white px-2.5 py-1.5 font-semibold text-danger-700 transition-colors hover:bg-danger-50"
            >
              <RotateCw className="h-3 w-3" />Retry
            </button>
          </div>
        )}

        {notice && (
          <div role="status" className="flex items-center gap-2.5 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-xs font-medium text-sage-700">
            <SuccessCheck size={16} />
            <span className="flex-1">{notice}</span>
            <button
              onClick={() => setNotice('')}
              className="rounded-lg p-1 text-sage-600 transition-colors hover:bg-sage-100"
              aria-label="Dismiss confirmation"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Metrics — counts from stored runs only */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric index={0} label="Runs recorded" value={pastSims.length} icon={<FlaskConical className="h-4 w-4" />} chip="bg-brand-50 text-brand-600" hint="all time" />
          <Metric index={1} label="Checked" value={activeSim ? totals?.checked ?? 0 : null} icon={<Eye className="h-4 w-4" />} chip="bg-olive-50 text-olive-600" hint={activeSim ? 'this run' : 'no run selected'} />
          <Metric index={2} ticker label="Need attention" value={activeSim ? attention : null} icon={<AlertTriangle className="h-4 w-4" />} chip="bg-warn-50 text-warn-600" hint={activeSim ? 'this run' : 'no run selected'} />
          <Metric index={3} label="Activated" value={pastSims.filter((s) => s.status === 'Activated').length} icon={<CheckCircle2 className="h-4 w-4" />} chip="bg-sage-50 text-sage-600" hint="applied to rules" />
        </div>

        {/* Run form — current rule vs proposed change */}
        <HoverLiftCard
          elevation="high"
          className="p-4 sm:p-5"
          style={
            isEditing
              ? { boxShadow: '0 0 0 1px rgba(36,76,58,0.18), 0 16px 36px -18px rgba(36,76,58,0.45)' }
              : undefined
          }
        >
          <SectionHeader
            title="Run a simulation"
            subtitle="Pick a stored rule, then describe the change you want to test."
            actions={<span className="badge-draft">Does not modify rules</span>}
          />

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
            {/* Current rule */}
            <div className="rounded-2xl border border-line bg-cream-50 p-3.5">
              <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
                Current rule
              </p>
              <label htmlFor="sandbox-rule" className="sr-only">Rule to test</label>
              <select
                id="sandbox-rule"
                value={selectedRule?.id ?? ''}
                onChange={(e) => setSelectedRuleId(e.target.value)}
                className="mt-1.5 w-full cursor-pointer rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {rules.length === 0 && <option value="">No rules available</option>}
                {rules.map((r) => (
                  <option key={r.id} value={r.id}>{r.code} · {r.title}</option>
                ))}
              </select>

              {selectedRule ? (
                <dl className="mt-2.5 space-y-1.5 text-2xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Priority</dt>
                    <dd className="font-medium text-ink">{selectedRule.priority}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Scope</dt>
                    <dd className="max-w-[60%] truncate text-right font-medium text-ink">{selectedRule.scope || 'Not set'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Status</dt>
                    <dd className="font-medium text-ink">{selectedRule.status.replace(/_/g, ' ')}</dd>
                  </div>
                  <div className="rounded-lg border border-line bg-white p-2">
                    <dt className="text-muted">Condition</dt>
                    <dd className="mt-0.5 text-2xs leading-relaxed text-ink-700">
                      {selectedRule.condition || 'No condition text stored.'}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-line bg-white p-2">
                    <dt className="text-muted">Current action</dt>
                    <dd className="mt-0.5 text-2xs leading-relaxed text-ink-700">
                      {selectedRule.action || 'No action text stored.'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2.5 rounded-lg border border-dashed border-line bg-white p-3 text-2xs text-muted">
                  No rules are available to simulate.
                </p>
              )}
            </div>

            <div className="flex items-center justify-center lg:flex-col lg:justify-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-brand-600">
                <ArrowRight className="h-4 w-4 lg:rotate-0" />
              </span>
            </div>

            {/* Proposed change */}
            <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-3.5">
              <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-brand-700">
                Proposed change
              </p>

              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {(['Tighten', 'Relax', 'Modify'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setChangeType(t)}
                    aria-pressed={changeType === t}
                    className={`rounded-xl border px-2 py-2 text-2xs font-semibold transition-colors ${
                      changeType === t
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-line bg-white text-ink-700 hover:bg-cream-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <label htmlFor="sandbox-change" className="mt-2.5 block text-2xs font-medium text-muted">
                New value or description
              </label>
              <textarea
                id="sandbox-change"
                value={describeChange}
                onChange={(e) => setDescribeChange(e.target.value)}
                rows={3}
                placeholder="e.g. Minimum logo clear space 24px on all digital formats"
                className="mt-1 w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />

              <AnimatedButton
                onClick={handleRun}
                disabled={isRunning || !selectedRule || rules.length === 0}
                className="mt-2 w-full py-2.5 text-xs"
              >
                {isRunning
                  ? <><ProcessingSpinner size={14} />Simulating…</>
                  : <><Play className="h-3.5 w-3.5" />Run impact analysis</>}
              </AnimatedButton>
              <p className="mt-1.5 text-2xs leading-relaxed text-muted">
                The run evaluates stored content against the proposed value and returns the counts
                below. It does not save the change.
              </p>
            </div>
          </div>
        </HoverLiftCard>

        {/* Simulation flow — one connected line, state mirrored from the run */}
        <div className="rounded-2xl border border-line bg-white px-4 py-3 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
              Simulation flow
            </p>
            <span className="text-2xs text-muted">
              {activeSim ? `Run ${activeSim.status.toLowerCase()}` : 'Nothing run yet'}
            </span>
          </div>
          <StepTrail steps={simSteps} label="Simulation flow" className="mt-2.5" />
        </div>

        {selectedRule && rules.length > 0 && (
          <ChartContainer
            title="Rule logic"
            subtitle={`${selectedRule.code} · the chain the engine evaluates, exactly as stored`}
            actions={<span className="badge-draft">{selectedRule.priority} priority</span>}
          >
            <RuleFlowDiagram
              rule={selectedRule}
              sourceLabel={guidelines.find((g) => g.id === selectedRule.sourceDocId)?.title}
              height={214}
            />
            <p className="mt-2 text-2xs leading-relaxed text-muted-light">
              Drag to pan and use the controls to zoom. The diagram reflects the stored
              condition, action and scope — editing a rule still happens in Brand Guidelines.
            </p>
          </ChartContainer>
        )}

        {rules.length === 0 && rulesState === 'ready' ? (
          <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center">
            <ShieldAlert className="mx-auto h-7 w-7 text-muted-light" />
            <p className="mt-3 text-sm font-semibold text-ink">No rules available to simulate</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
              The sandbox tests an existing rule. Activate a guideline so the engine extracts rules,
              then return here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">

            {/* Results */}
            <LayoutTransition mode="list" className="gap-4">
              <div className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5">
                <SectionHeader
                  title="Simulation result"
                  subtitle={activeSim ? activeSim.name : 'Nothing has been run in this session.'}
                  actions={
                    activeSim ? (
                      <AnimatedBadge
                        tone={
                          activeSim.status === 'Activated'
                            ? 'sage'
                            : activeSim.status === 'Failed'
                              ? 'danger'
                              : 'brand'
                        }
                        variant={activeSim.status === 'Activated' ? 'solid' : 'soft'}
                      >
                        {activeSim.status}
                      </AnimatedBadge>
                    ) : (
                      <AnimatedBadge tone="sage">Not run yet</AnimatedBadge>
                    )
                  }
                />

                {!activeSim ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-line bg-cream-50 px-5 py-12 text-center">
                    <FlaskConical className="mx-auto h-7 w-7 text-muted-light" />
                    <p className="mt-3 text-sm font-semibold text-ink">Run a simulation to see impact</p>
                    <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
                      Impact counts, the before/after comparison and risk indicators stay empty until
                      the backend returns a run. They are never pre-filled with plausible numbers.
                    </p>
                    {pastSims.length > 0 && (
                      <p className="mt-3 text-2xs text-muted">
                        {pastSims.length} earlier run{pastSims.length === 1 ? '' : 's'} available — open
                        one from the list on the right.
                      </p>
                    )}
                  </div>
                ) : (
                  <Reveal className="mt-4 space-y-4">
                    {/* Summary */}
                    <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                      <div
                        className="flex items-center justify-center rounded-2xl border border-line bg-cream-50 p-3"
                        style={{
                          boxShadow: attentionPct >= 50
                            ? '0 0 28px -8px rgba(194,84,70,.50)'
                            : attentionPct > 0
                              ? '0 0 28px -8px rgba(196,137,28,.50)'
                              : '0 0 28px -8px rgba(78,122,61,.50)',
                        }}
                      >
                        <RingProgress
                          value={attentionPct}
                          max={100}
                          size={124}
                          stroke={10}
                          tone={attentionPct >= 50 ? 'danger' : attentionPct > 0 ? 'amber' : 'sage'}
                          centerLabel={<AnimatedCounter value={attentionPct} suffix="%" />}
                          centerSublabel="need attention"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {[
                            { label: 'Checked', value: totals?.checked ?? 0 },
                            { label: 'Compliant', value: totals?.compliant ?? 0 },
                            { label: 'Needs review', value: totals?.needsReview ?? 0 },
                            { label: 'Non-compliant', value: totals?.nonCompliant ?? 0 },
                          ].map((s) => (
                            <div key={s.label} className="rounded-xl border border-line px-2.5 py-2">
                              <p className="text-2xs font-medium uppercase tracking-[0.05em] text-muted">{s.label}</p>
                              <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
                                <AnimatedCounter value={s.value} />
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-2.5 space-y-1.5">
                          <AnimatedProgress
                            value={totals?.compliant ?? 0}
                            max={Math.max(totals?.checked ?? 0, 1)}
                            tone="sage"
                            label="Compliant"
                          />
                          <AnimatedProgress
                            value={totals?.needsReview ?? 0}
                            max={Math.max(totals?.checked ?? 0, 1)}
                            tone="amber"
                            label="Needs review"
                          />
                          <AnimatedProgress
                            value={totals?.nonCompliant ?? 0}
                            max={Math.max(totals?.checked ?? 0, 1)}
                            tone="danger"
                            label="Non-compliant"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Before / after */}
                    <div className="grid gap-2.5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <motion.div
                        className="rounded-xl border border-line bg-cream-50 p-3"
                        initial={reduce ? false : { opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                      >
                        <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                          Current value
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-700">
                          {activeSim.currentValue || 'No current value stored on this run.'}
                        </p>
                      </motion.div>
                      <div className="flex justify-center">
                        <motion.span
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-600"
                          initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, ease: EASE, delay: 0.12 }}
                        >
                          <ArrowRight className="h-3.5 w-3.5 rotate-90 sm:rotate-0" />
                        </motion.span>
                      </div>
                      <motion.div
                        className="rounded-xl border border-brand-200 bg-brand-50/60 p-3"
                        initial={reduce ? false : { opacity: 0, x: 14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                      >
                        <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-700">
                          Proposed value
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-700">
                          {activeSim.newValue || 'No proposed value stored on this run.'}
                        </p>
                      </motion.div>
                    </div>

                    {/* Outcome chart */}
                    <div className="rounded-xl border border-line p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-ink">Outcome across checked content</p>
                        <span className="text-2xs text-muted">bar height = item count</span>
                      </div>
                      {outcomeBars.some((b) => b.value > 0) ? (
                        <BarSeries
                          data={outcomeBars}
                          height={108}
                          tone="brand"
                          formatValue={(v) => `${v} item${v === 1 ? '' : 's'}`}
                        />
                      ) : (
                        <p className="py-6 text-center text-2xs text-muted">
                          This run checked {totals?.checked ?? 0} items, so there is nothing to plot.
                        </p>
                      )}
                    </div>

                    {/* Risk indicators — derived, and labelled as such */}
                    <div className="rounded-xl border border-line bg-white p-3">
                      <p className="text-xs font-semibold text-ink">Risk indicators</p>
                      <p className="mt-0.5 text-2xs text-muted">
                        Derived from this run's totals. The engine does not forecast reach or revenue.
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {totals && totals.nonCompliant > 0 && (
                          <li className="flex items-start gap-2 rounded-lg bg-danger-50 px-2.5 py-2 text-2xs text-danger-700">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            {totals.nonCompliant} item{totals.nonCompliant === 1 ? '' : 's'} would fail
                            the rule under the proposed value.
                          </li>
                        )}
                        {totals && totals.needsReview > 0 && (
                          <li className="flex items-start gap-2 rounded-lg bg-warn-50 px-2.5 py-2 text-2xs text-warn-700">
                            <Info className="mt-0.5 h-3 w-3 shrink-0" />
                            {totals.needsReview} item{totals.needsReview === 1 ? '' : 's'} could not be
                            evaluated from stored evidence and need a human.
                          </li>
                        )}
                        {(activeSim.breakdown?.potentialConflicts ?? 0) > 0 && (
                          <li className="flex items-start gap-2 rounded-lg bg-terracotta-50 px-2.5 py-2 text-2xs text-terracotta-700">
                            <Zap className="mt-0.5 h-3 w-3 shrink-0" />
                            {activeSim.breakdown?.potentialConflicts} potential rule conflict
                            {(activeSim.breakdown?.potentialConflicts ?? 0) === 1 ? '' : 's'} with the
                            proposed value.
                          </li>
                        )}
                        {(activeSim.breakdown?.exceptionsNeedingAttention.count ?? 0) > 0 && (
                          <li className="flex items-start gap-2 rounded-lg bg-olive-50 px-2.5 py-2 text-2xs text-olive-700">
                            <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
                            {activeSim.breakdown?.exceptionsNeedingAttention.count} active exception
                            {(activeSim.breakdown?.exceptionsNeedingAttention.count ?? 0) === 1 ? '' : 's'}{' '}
                            would need review.
                          </li>
                        )}
                        {totals && totals.nonCompliant === 0 && totals.needsReview === 0 && (
                          <li className="flex items-start gap-2 rounded-lg bg-sage-50 px-2.5 py-2 text-2xs text-sage-700">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                            This run flagged no failures and no unevaluated items.
                          </li>
                        )}
                      </ul>
                    </div>
                  </Reveal>
                )}
              </div>

              {/* Tabs */}
              {activeSim && (
                <div className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5">
                  <div className="flex flex-wrap gap-4 border-b border-line">
                    {([
                      ['affected', `Affected items (${activeSim.items.length})`],
                      ['breakdown', 'Breakdown'],
                      ['insights', `Insights (${activeSim.insight.length})`],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        aria-pressed={activeTab === key}
                        className={`-mb-px border-b-2 pb-2 text-xs font-semibold transition-colors ${
                          activeTab === key
                            ? 'border-brand-600 text-brand-700'
                            : 'border-transparent text-muted hover:text-ink'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'affected' && (
                    <div className="mt-3">
                      {activeSim.items.length === 0 ? (
                        <p className="rounded-xl border border-line bg-cream-50 px-4 py-8 text-center text-2xs text-muted">
                          This run returned no per-item rows.
                        </p>
                      ) : (
                        <div className="overflow-x-auto styled-scroll">
                          <table className="w-full min-w-[560px] text-left">
                            <thead>
                              <tr className="border-b border-line">
                                {['Content', 'Meta', 'Impact', 'Note'].map((h) => (
                                  <th key={h} className="py-2 pr-3 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {activeSim.items.map((item) => {
                                const tone = impactTone(item.impact);
                                return (
                                  <tr key={item.submissionId} className="transition-colors hover:bg-cream-50/60">
                                    <td className="py-2.5 pr-3">
                                      <div className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-muted">
                                          <FileText className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="text-xs font-medium text-ink">{item.title}</span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 pr-3 text-2xs text-muted">{item.meta}</td>
                                    <td className="py-2.5 pr-3">
                                      <span className={tone.chip}>{item.impact}</span>
                                    </td>
                                    <td className="py-2.5 pr-3 text-2xs text-muted">{item.note}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'breakdown' && (
                    <div className="mt-3 space-y-2.5">
                      {!activeSim.breakdown ? (
                        <p className="rounded-xl border border-line bg-cream-50 px-4 py-8 text-center text-2xs text-muted">
                          This run did not return a breakdown.
                        </p>
                      ) : (
                        <>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {[
                              { label: 'Newly flagged', data: activeSim.breakdown.newlyFlagged, tone: 'text-danger-700 bg-danger-50 border-danger-200' },
                              { label: 'Resolved', data: activeSim.breakdown.resolved, tone: 'text-sage-700 bg-sage-50 border-sage-200' },
                              { label: 'Unchanged', data: activeSim.breakdown.unchanged, tone: 'text-ink-700 bg-cream-50 border-line' },
                            ].map((group) => (
                              <div key={group.label} className={`rounded-xl border p-3 ${group.tone}`}>
                                <p className="text-2xs font-semibold uppercase tracking-[0.06em]">{group.label}</p>
                                <p className="mt-1 text-xl font-semibold tabular-nums">
                                  <AnimatedCounter value={group.data.count} />
                                </p>
                                {group.data.items.length > 0 && (
                                  <ul className="mt-1.5 space-y-0.5 text-2xs">
                                    {group.data.items.slice(0, 4).map((it) => (
                                      <li key={it.id} className="truncate">· {it.title}</li>
                                    ))}
                                    {group.data.items.length > 4 && (
                                      <li className="text-muted">+{group.data.items.length - 4} more</li>
                                    )}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="rounded-xl border border-line p-3">
                            <p className="text-xs font-semibold text-ink">Potential conflicts</p>
                            <p className="mt-0.5 text-2xs text-muted">
                              {activeSim.breakdown.potentialConflicts} rule pair
                              {activeSim.breakdown.potentialConflicts === 1 ? '' : 's'} would contradict
                              under the proposed value.
                            </p>
                          </div>

                          <div className="rounded-xl border border-line p-3">
                            <p className="text-xs font-semibold text-ink">
                              Exceptions needing attention ({activeSim.breakdown.exceptionsNeedingAttention.count})
                            </p>
                            {activeSim.breakdown.exceptionsNeedingAttention.items.length === 0 ? (
                              <p className="mt-1 text-2xs text-muted">No active exception is affected.</p>
                            ) : (
                              <ul className="mt-1.5 space-y-1">
                                {activeSim.breakdown.exceptionsNeedingAttention.items.map((ex) => (
                                  <li key={ex.id} className="rounded-lg bg-cream-50 px-2.5 py-2 text-2xs">
                                    <span className="font-semibold text-ink">{ex.code}</span>
                                    <span className="text-muted"> · {ex.scope || 'no scope'} · </span>
                                    <span className="text-ink-700">{ex.reason}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'insights' && (
                    <div className="mt-3">
                      {activeSim.insight.length === 0 ? (
                        <p className="rounded-xl border border-line bg-cream-50 px-4 py-8 text-center text-2xs text-muted">
                          This run returned no written insight. The counts above are the complete
                          result.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {activeSim.insight.map((line, i) => (
                            <li key={`${line}-${i}`} className="flex items-start gap-2 rounded-xl border border-line bg-cream-50 px-3 py-2 text-2xs leading-relaxed text-ink-700">
                              <Info className="mt-0.5 h-3 w-3 shrink-0 text-olive-600" />
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </LayoutTransition>

            {/* Right column */}
            <aside className="space-y-4">
              {/* Run detail */}
              <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
                <h3 className="text-sm font-semibold text-ink">Run detail</h3>
                {activeSim ? (
                  <dl className="mt-2.5 space-y-1.5 text-2xs">
                    {[
                      ['Rule', activeSim.ruleCode || 'Not recorded'],
                      ['Change', activeSim.changeType],
                      ['Status', activeSim.status],
                      ['Run at', when(activeSim.createdAt)],
                      ['Run ID', activeSim.id],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-3 border-b border-line py-1.5 last:border-0">
                        <dt className="shrink-0 text-muted">{label}</dt>
                        <dd className="max-w-[62%] break-all text-right font-medium text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-2 rounded-xl border border-dashed border-line bg-cream-50 px-3 py-4 text-center text-2xs text-muted">
                    No run selected.
                  </p>
                )}
              </div>

              {/* Past runs */}
              <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
                <SectionHeader
                  title="Recorded runs"
                  subtitle="Stored simulations. Opening one does not re-run it."
                />
                <div className="mt-2.5 max-h-[280px] space-y-1.5 overflow-y-auto styled-scroll">
                  {simsState === 'loading' ? (
                    <p className="py-4 text-center text-2xs text-muted">Loading runs…</p>
                  ) : simsState === 'error' ? (
                    <p role="alert" className="rounded-lg bg-danger-50 px-3 py-3 text-center text-2xs text-danger-700">
                      Recorded runs could not be loaded.
                    </p>
                  ) : pastSims.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-line bg-cream-50 px-3 py-4 text-center text-2xs text-muted">
                      No simulations have been recorded yet.
                    </p>
                  ) : (
                    [...pastSims]
                      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
                      .map((sim) => (
                        <button
                          key={sim.id}
                          onClick={() => openPastSim(sim)}
                          className={`w-full rounded-xl border px-2.5 py-2 text-left transition-colors ${
                            activeSim?.id === sim.id
                              ? 'border-brand-300 bg-brand-50'
                              : 'border-line hover:bg-cream-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-2xs font-semibold text-ink">{sim.name}</span>
                            <span className="shrink-0 text-2xs tabular-nums text-muted">
                              {sim.totals.checked}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2 text-2xs text-muted">
                            <span className="truncate">{when(sim.createdAt)}</span>
                            <span className="shrink-0">{sim.status}</span>
                          </div>
                        </button>
                      ))
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
                <h3 className="text-sm font-semibold text-ink">Actions</h3>
                <div className="mt-2.5 space-y-2">
                  <button
                    onClick={downloadExport}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white py-2.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
                  >
                    <Download className="h-3.5 w-3.5" />Download audit export
                  </button>

                  {activeSim && activeSim.status === 'Completed' && (
                    <button
                      onClick={() => setConfirmActivate(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                    >
                      <Bookmark className="h-3.5 w-3.5" />Activate rule change
                    </button>
                  )}

                  {activeSim?.status === 'Failed' && (
                    <p role="alert" className="rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-center text-2xs font-semibold text-danger-700">
                      This run failed, so there is no result to activate. Run it again.
                    </p>
                  )}

                  {activeSim?.status === 'Activated' && (
                    <p className="rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-center text-2xs font-semibold text-sage-700">
                      This change was activated and applied to the live rule.
                    </p>
                  )}

                  {!activeSim && (
                    <p className="rounded-xl border border-dashed border-line bg-cream-50 px-3 py-2.5 text-center text-2xs text-muted">
                      Run a simulation before activating anything.
                    </p>
                  )}

                  <p className="text-2xs leading-relaxed text-muted">
                    Activating writes the proposed value to the live rule. There is no undo here;
                    later changes go through a new simulation.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Activation confirmation */}
      <AnimatedModal
        open={confirmActivate}
        onClose={() => setConfirmActivate(false)}
        title="Activate this rule change?"
        description="This is the only action on this page that modifies live policy."
        maxWidth={520}
        footer={
          <>
            <button
              onClick={() => setConfirmActivate(false)}
              className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
            >
              Cancel
            </button>
            <button
              onClick={handleActivate}
              disabled={activating}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activating ? <ProcessingSpinner size={14} /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              {activating ? 'Activating…' : 'Activate change'}
            </button>
          </>
        }
      >
        {activeSim && (
          <div className="space-y-3 text-xs">
            <div
              className="rounded-xl border border-warn-200 bg-warn-50 p-3 text-warn-800"
              style={{ boxShadow: '0 0 0 1px rgba(196,137,28,.18), 0 12px 30px -18px rgba(196,137,28,.55)' }}
            >
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />This changes the live rule
              </p>
              <p className="mt-1 leading-relaxed">
                The proposed value replaces the current value on rule{' '}
                <strong>{activeSim.ruleCode || activeSim.ruleId}</strong>. Sentinel will create
                reassessment tasks for the {attention} item{attention === 1 ? '' : 's'} this run
                flagged.
              </p>
            </div>
            <dl className="space-y-1.5">
              <div className="rounded-lg bg-cream-50 px-3 py-2">
                <dt className="text-2xs uppercase tracking-[0.06em] text-muted">Current</dt>
                <dd className="mt-0.5 text-ink-700">{activeSim.currentValue || 'not stored'}</dd>
              </div>
              <div className="rounded-lg bg-brand-50 px-3 py-2">
                <dt className="text-2xs uppercase tracking-[0.06em] text-brand-700">Proposed</dt>
                <dd className="mt-0.5 text-ink-700">{activeSim.newValue || 'not stored'}</dd>
              </div>
            </dl>
          </div>
        )}
      </AnimatedModal>
    </div>
  );
};
