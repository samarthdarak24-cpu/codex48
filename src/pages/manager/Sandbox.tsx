import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FlaskConical,
  HelpCircle,
  Info,
  Lightbulb,
  Play,
  ShieldCheck,
  Sparkles,
  XCircle,
  GitCompare,
} from 'lucide-react'
import { useData } from '@/context/DataContext'
import { PageHeader, RailCard } from '@/components/layout/Shell'
import { Card, CardHeader, MetricCard, ViewAll } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { DataTable, EmptyState, type Column } from '@/components/ui/Table'
import { ImpactBadge, StatusBadge } from '@/components/ui/Badge'
import { Donut, DonutLegend, Tabs, Thumb } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { FileIcon } from '@/pages/content/Overview'
import { simulationStats } from '@/lib/selectors'
import { cn, relative } from '@/lib/utils'
import type { Simulation, SimulationItem } from '@/lib/types'

const CHANGE_TYPES = [
  'Update allowed colours',
  'Replace approved wording',
  'Add prohibited term',
  'Remove prohibited term',
  'Update clear space',
  'Extend scope',
]

/** Sensible starting point per rule so the first run is immediately meaningful. */
const SUGGESTIONS: Record<string, string> = {
  rule_bg_colour: 'Add Teal #2E7D8F to approved backgrounds',
  rule_claims: 'Replace “fragrance free” with “made without added fragrance”',
  rule_superlatives: 'Add prohibited term: 100% safe',
  rule_health: 'Add prohibited term: immunity',
  rule_discount: 'Add prohibited term: limited time',
  rule_tone: 'Add prohibited term: hurry',
  rule_typo: 'Restrict typefaces to Söhne and Inter only',
  rule_logo: 'Increase clear space to 1.5× shield height',
  rule_disclosure: 'Restrict disclosure to the first line',
  rule_third_party: 'Require written approval for all third-party marks',
  rule_image_style: 'Extend scope to Supplements',
  rule_social_ratio: 'Restrict to 4:5 and 9:16 only',
  rule_seasonal_palette: 'Add Teal to the seasonal accent palette',
}

export default function Sandbox() {
  const { rules, simulations, loading, runSimulation } = useData()
  const navigate = useNavigate()
  const toast = useToast()

  const activeRules = useMemo(() => rules.filter((r) => r.status === 'active'), [rules])
  const [ruleId, setRuleId] = useState('')
  const [changeType, setChangeType] = useState(CHANGE_TYPES[0])
  const [newValue, setNewValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'content' | 'compliance' | 'consistency'>('content')
  const [activeSimId, setActiveSimId] = useState<string | null>(null)

  // Rules arrive asynchronously — pick the first active rule once they land.
  useEffect(() => {
    if (!ruleId && activeRules.length > 0) setRuleId(activeRules[0].id)
  }, [activeRules, ruleId])

  // Seed the proposed value from the selected rule (only when the rule changes).
  useEffect(() => {
    if (ruleId && SUGGESTIONS[ruleId]) setNewValue(SUGGESTIONS[ruleId])
  }, [ruleId])

  const stats = simulationStats(simulations)
  const activeSim: Simulation | undefined = useMemo(
    () => simulations.find((s) => s.id === activeSimId) ?? simulations[0],
    [simulations, activeSimId],
  )
  const selectedRule = activeRules.find((r) => r.id === ruleId)

  const columns: Column<SimulationItem>[] = [
    {
      key: 'item',
      header: 'Content Item',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Thumb spec={row.thumb} size={30} />
          <div className="min-w-0">
            <p className="truncate text-base font-medium leading-[17px] text-ink">{row.title}</p>
            <p className="truncate text-2xs leading-[14px] text-muted">{row.meta}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '74px',
      className: 'hidden sm:table-cell', headerClassName: 'hidden sm:table-cell',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-ink-600">
          <FileIcon type={row.type} />
          {row.type}
        </span>
      ),
    },
    { key: 'current', header: 'Current Status', width: '136px', cell: (row) => <StatusBadge status={row.currentStatus} /> },
    { key: 'impact', header: 'Impact Result', width: '128px', cell: (row) => <ImpactBadge impact={row.impact} /> },
    {
      key: 'action',
      header: 'Action',
      width: '80px',
      align: 'right',
      cell: (row) => (
        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => navigate(`/manager/queue/${row.submissionId}`)}>
          View
        </Button>
      ),
    },
  ]

  async function run() {
    if (!ruleId) {
      toast.error('Select a rule', 'Choose the active rule you want to change.')
      return
    }
    if (!newValue.trim()) {
      toast.error('Proposed value required', 'Describe the change so the comparison is meaningful.')
      return
    }
    setBusy(true)
    try {
      const sim = await runSimulation({ ruleId, changeType, newValue: newValue.trim() })
      setActiveSimId(sim.id)
      setTab('content')
      toast.success(
        'Simulation completed',
        sim.totals.checked === 0
          ? 'No stored content to compare yet — submit content first.'
          : `${sim.totals.checked} assets evaluated. Nothing has been activated.`,
      )
    } catch (err) {
      toast.error('Simulation failed', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const totals = activeSim?.totals ?? { checked: 0, compliant: 0, needsReview: 0, nonCompliant: 0 }
  const rate = totals.checked ? Math.round((totals.compliant / totals.checked) * 100) : 0

  const segments = [
    { value: totals.compliant, color: '#10B981', label: 'Compliant' },
    { value: totals.needsReview, color: '#F0A32B', label: 'Needs Review' },
    { value: totals.nonCompliant, color: '#EF4444', label: 'Non-Compliant' },
  ]

  return (
    <>
      <PageHeader
        title="Rule Impact Sandbox"
        subtitle="Test how proposed rule changes affect your content, compliance and brand performance."
        backTo="/manager/overview"
        backLabel="Back to Dashboard"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-warn-100 bg-warn-50 px-2.5 py-1.5 text-xs font-medium text-warn-700">
            <Info className="h-3 w-3" />
            Simulations never activate a rule
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total Simulations" value={String(stats.total).padStart(2, '0')} sub={`${stats.checked} assets evaluated`} icon={<FlaskConical className="h-4 w-4" />} tone="blue" />
        <MetricCard label="Compliant" value={String(stats.compliant).padStart(2, '0')} sub={`${stats.successRate}% of checked assets`} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
        <MetricCard label="Needs Attention" value={String(stats.needsReview).padStart(2, '0')} sub="Requires a human check" icon={<AlertTriangle className="h-4 w-4" />} tone="amber" />
        <MetricCard label="Non-Compliant" value={String(stats.nonCompliant).padStart(2, '0')} sub="Would newly fail" icon={<XCircle className="h-4 w-4" />} tone="purple" />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0 space-y-4">
          {/* Run */}
          <Card className="card-pad">
            <h2 className="mb-3 flex items-center gap-1.5 text-lg font-semibold tracking-[-0.01em] text-ink">
              <FlaskConical className="h-4 w-4 text-brand-500" />
              Run New Simulation
            </h2>
            <p className="-mt-2 mb-3 text-xs text-muted">Select a rule change or create a custom scenario to see its impact.</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Select Rule / Guideline" htmlFor="sim-rule">
                <Select id="sim-rule" value={ruleId} onChange={(e) => setRuleId(e.target.value)} className="text-xs">
                  {activeRules.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} · {r.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Change Type" htmlFor="sim-type">
                <Select id="sim-type" value={changeType} onChange={(e) => setChangeType(e.target.value)} className="text-xs">
                  {CHANGE_TYPES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="New Value" htmlFor="sim-value">
                <Input
                  id="sim-value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g. Add “Teal #2E7D8F” to allowed colours"
                  className="text-xs"
                />
              </Field>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 bg-brand-50/50 px-3 py-2">
              <p className="flex items-start gap-1.5 text-2xs leading-[15px] text-brand-700/90">
                <Lightbulb className="mt-[1px] h-3 w-3 shrink-0" />
                {selectedRule
                  ? `Current: ${selectedRule.action}. This will test how the proposed change affects stored content, exceptions and brand consistency.`
                  : 'Choose a rule to see what the simulation will compare.'}
              </p>
              <Button size="sm" loading={busy} icon={<Play className="h-3 w-3" />} onClick={run}>
                Run Simulation
              </Button>
            </div>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader
              title="Simulation Results"
              icon={<BarChart3 className="h-4 w-4" />}
              subtitle={activeSim ? `${activeSim.name} · ${relative(activeSim.createdAt)}` : undefined}
              action={
                activeSim && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-[2px] text-2xs font-medium text-success-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                    {activeSim.status}
                  </span>
                )
              }
            />

            <div className="px-4">
              <Tabs
                items={[
                  { key: 'content', label: 'Content Impact' },
                  { key: 'compliance', label: 'Compliance Impact' },
                  { key: 'consistency', label: 'Brand Consistency' },
                ]}
                active={tab}
                onChange={(k) => setTab(k as typeof tab)}
              />
            </div>

            {!activeSim ? (
              <EmptyState
                icon={<FlaskConical className="h-5 w-5" />}
                title="No simulation yet"
                description="Run a simulation above to compare the current rule set against a proposed change."
                compact
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 p-3 lg:grid-cols-4">
                  <ResultTile label="Total Content Checked" value={totals.checked} tone="neutral" />
                  <ResultTile label="Compliant" value={totals.compliant} tone="success" sub={`${rate}%`} />
                  <ResultTile label="Needs Review" value={totals.needsReview} tone="warn" sub={totals.checked ? `${Math.round((totals.needsReview / totals.checked) * 100)}%` : '0%'} />
                  <ResultTile label="Non-Compliant" value={totals.nonCompliant} tone="danger" sub={totals.checked ? `${Math.round((totals.nonCompliant / totals.checked) * 100)}%` : '0%'} />
                </div>

                {tab === 'content' && (
                  <DataTable
                    columns={columns}
                    rows={activeSim.items}
                    getKey={(r) => r.submissionId}
                    dense
                    empty={
                      <EmptyState
                        title="No stored content to evaluate"
                        description="A meaningful comparison needs submitted content. Submit a few assets first, then re-run this scenario."
                        compact
                      />
                    }
                  />
                )}

                {tab === 'compliance' && (
                  <div className="p-4">
                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                      <Donut size={112} thickness={11} segments={segments} centerValue={`${rate}%`} centerLabel="Compliant" />
                      <div className="w-full flex-1">
                        <DonutLegend segments={segments} total={totals.checked} />
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg border border-line bg-[#FBFDFF] p-3">
                      <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Comparison</p>
                      <dl className="space-y-1.5 text-xs">
                        <div className="flex items-start justify-between gap-3">
                          <dt className="text-muted">Current rule</dt>
                          <dd className="max-w-[70%] text-right text-ink-600">{activeSim.currentValue}</dd>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <dt className="text-muted">Proposed rule</dt>
                          <dd className="max-w-[70%] text-right font-medium text-brand-700">{activeSim.newValue}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}

                {tab === 'consistency' && (
                  <div className="space-y-2 p-4">
                    {activeSim.items.filter((i) => i.impact !== 'Compliant').length === 0 ? (
                      <EmptyState
                        icon={<ShieldCheck className="h-5 w-5" />}
                        title="No consistency risks found"
                        description="Every evaluated asset stays compliant under the proposed change."
                        compact
                      />
                    ) : (
                      activeSim.items
                        .filter((i) => i.impact !== 'Compliant')
                        .map((i) => (
                          <div key={i.submissionId} className="flex items-start gap-2.5 rounded-lg border border-line p-2.5">
                            <Thumb spec={i.thumb} size={28} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-ink">{i.title}</p>
                              <p className="text-2xs leading-[15px] text-muted">{i.note}</p>
                            </div>
                            <ImpactBadge impact={i.impact} />
                          </div>
                        ))
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
                  <p className="text-2xs text-muted">
                    {totals.checked} asset{totals.checked === 1 ? '' : 's'} evaluated · results are reproducible for the
                    stored rule set
                  </p>
                  <Button size="sm" variant="ghost" icon={<GitCompare className="h-3 w-3" />} onClick={() => setTab('compliance')}>
                    Compare rules
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Rail */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-md font-semibold text-ink">
                <BarChart3 className="h-3.5 w-3.5 text-brand-500" />
                Impact Summary
              </h2>
              <span className="text-2xs text-muted-light">Latest simulation</span>
            </div>
            <div className="flex items-center gap-3">
              <Donut size={92} thickness={10} segments={segments} centerValue={`${rate}%`} centerLabel="Compliant" />
              <div className="min-w-0 flex-1">
                <DonutLegend segments={segments} total={totals.checked} />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-1.5 flex items-center gap-1.5 text-md font-semibold text-ink">
              <Sparkles className="h-3.5 w-3.5 text-grape-500" />
              Key Insights
            </h2>
            <p className="mb-2 text-[9.5px] leading-[13px] text-muted-light">
              Generated by the deterministic rule engine from the stored rule set and content.
            </p>
            <ul className="space-y-2">
              {(activeSim?.insight ?? ['Run a simulation to generate insights.']).map((line, i) => (
                <li key={i} className="flex items-start gap-1.5 text-2xs leading-[15px] text-ink-600">
                  <span className="mt-[4px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  {line}
                </li>
              ))}
            </ul>
          </Card>

          <RailCard title="Scenario History" icon={<Clock3 className="h-3.5 w-3.5" />} action={<ViewAll onClick={() => setActiveSimId(null)} label="Latest" />}>
            <ul className="space-y-2">
              {simulations.length === 0 && <li className="text-xs text-muted">No scenarios run yet.</li>}
              {simulations.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveSimId(s.id)}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-[#F8FBFF]',
                      activeSim?.id === s.id && 'bg-brand-50/60',
                    )}
                  >
                    <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium leading-[15px] text-ink">{s.name}</span>
                      <span className="block text-2xs leading-[13px] text-muted">
                        {relative(s.createdAt)} · {s.totals.checked} checked
                      </span>
                    </span>
                    <span className="mt-[1px] shrink-0 rounded-full bg-success-50 px-1.5 text-[9px] font-medium text-success-700">
                      {s.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </RailCard>

          <Card className="border-brand-100 bg-brand-50/50 p-4">
            <h2 className="flex items-center gap-1.5 text-md font-semibold text-brand-800">
              <HelpCircle className="h-3.5 w-3.5" />
              Need help?
            </h2>
            <p className="mt-1 text-xs leading-[16px] text-brand-700/80">
              View our documentation or contact your brand manager for complex scenarios.
            </p>
            <Button variant="outline" size="sm" block className="mt-2.5 bg-white" onClick={() => navigate('/manager/guidelines')}>
              Contact Brand Manager
            </Button>
          </Card>
        </div>
      </div>
    </>
  )
}

function ResultTile({
  label,
  value,
  tone,
  sub,
}: {
  label: string
  value: number
  tone: 'neutral' | 'success' | 'warn' | 'danger'
  sub?: string
}) {
  const tones = {
    neutral: 'bg-[#F5F9FE] text-ink border-[#E7EEF8]',
    success: 'bg-success-50/70 text-success-700 border-success-100',
    warn: 'bg-warn-50/70 text-warn-700 border-warn-100',
    danger: 'bg-danger-50/70 text-danger-700 border-danger-100',
  }
  return (
    <div className={cn('rounded-lg border px-2.5 py-2', tones[tone])}>
      <p className="text-[9.5px] font-medium opacity-80">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="text-lg font-semibold leading-[22px]">{value}</span>
        {sub && <span className="text-2xs opacity-70">{sub}</span>}
      </p>
    </div>
  )
}
