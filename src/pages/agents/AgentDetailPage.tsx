import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  Database,
  GitBranch,
  History,
  Lock,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Square,
  Trash2,
  Workflow,
  X,
} from 'lucide-react'
import { agentApi } from '@/services/api'
import type { AgentDetail, AgentRun, RunStep } from '@/lib/agentTypes'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Misc'
import { cn } from '@/lib/utils'
import { EASE } from '@/v2/components/motion'
import {
  AgentGlyph,
  AgentStatusPill,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  Panel,
  PanelHeader,
  RunStatusPill,
  StepStatusIcon,
  categoryLabel,
  formatDateTime,
  formatDuration,
  formatRelative,
} from './shared'
import { JsonPanel, RunTimeline } from './RunTimeline'

type Tab = 'overview' | 'test' | 'runs' | 'versions' | 'memory'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Bot },
  { id: 'test', label: 'Test playground', icon: Play },
  { id: 'runs', label: 'Executions', icon: History },
  { id: 'versions', label: 'Versions', icon: GitBranch },
  { id: 'memory', label: 'Memory', icon: Brain },
]

export default function AgentDetailPage() {
  const { agentId = '' } = useParams()
  const navigate = useNavigate()

  const [agent, setAgent] = useState<AgentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAgent(await agentApi.get(agentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the agent')
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    void load()
  }, [load])

  const refresh = async () => {
    try {
      setAgent(await agentApi.get(agentId))
    } catch {
      /* keep the previous view */
    }
  }

  const publish = async () => {
    setBusy(true)
    setNotice(null)
    try {
      const result = await agentApi.publish(agentId)
      setAgent(result.agent)
      setNotice('Agent published. Creators can now use it.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Publishing failed')
    } finally {
      setBusy(false)
    }
  }

  const pause = async () => {
    setBusy(true)
    setNotice(null)
    try {
      const result = await agentApi.pause(agentId)
      setAgent(result.agent)
      setNotice('Agent paused.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not pause the agent')
    } finally {
      setBusy(false)
    }
  }

  const resume = async () => {
    setBusy(true)
    setNotice(null)
    try {
      const result = await agentApi.resume(agentId)
      setAgent(result.agent)
      setNotice('Agent resumed.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not resume the agent')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      const result = await agentApi.remove(agentId)
      setDeleteOpen(false)
      navigate('/manager/agent-studio')
      if (!result.deleted) setNotice('Agent archived; execution history was preserved.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not delete the agent')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingBlock label="Loading agent…" />
  if (error || !agent) {
    return (
      <div className="p-6">
        <ErrorBlock message={error ?? 'Agent not found'} onRetry={load} />
      </div>
    )
  }

  const version = agent.version
  const validation = version.validation

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8" data-agent-tab={tab}>
      <button
        onClick={() => navigate('/manager/agent-studio')}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
      >
        <ArrowLeft className="h-3 w-3" />
        Agent Studio
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <AgentGlyph icon={agent.icon} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-[-0.025em] text-ink">{agent.name}</h1>
              <AgentStatusPill status={agent.status} />
              {agent.hasUnpublishedChanges && (
                <Badge tone="warn" size="sm">
                  Unpublished changes
                </Badge>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{agent.description}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-muted">
              <span>{categoryLabel(agent.category)}</span>
              <span>Owner {agent.ownerName}</span>
              <span>Version {version.versionNumber}</span>
              <span>{agent.toolCount} tools</span>
              <span>Last run {formatRelative(agent.lastRunAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/manager/agents/${agent.id}/builder`)}>
            <Workflow className="h-4 w-4" />
            Edit workflow
          </Button>
          <Button variant="outline" onClick={() => setTab('test')}>
            <Play className="h-4 w-4" />
            Test agent
          </Button>
          {agent.status === 'published' ? (
            <Button variant="outline" onClick={pause} disabled={busy}>
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          ) : agent.status === 'paused' ? (
            <Button onClick={resume} disabled={busy}>
              <RefreshCw className="h-4 w-4" />
              Resume
            </Button>
          ) : (
            <Button onClick={publish} disabled={busy || !validation.ok}>
              <CheckCircle2 className="h-4 w-4" />
              Publish
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} aria-label="Delete agent">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {notice && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-xs text-brand-800">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!validation.ok && (
        <div className="mt-4 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2.5 text-xs text-danger-700">
          <p className="font-semibold">This version cannot be published yet</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {validation.errors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((item) => {
          const Icon = item.icon
          const active = tab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors',
                active ? 'text-brand-700' : 'text-muted hover:text-ink',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
              {active && (
                <motion.span
                  layoutId="agent-tab"
                  className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-brand-500"
                  transition={{ duration: 0.22, ease: EASE }}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        {tab === 'overview' && <OverviewTab agent={agent} />}
        {tab === 'test' && <TestTab agent={agent} onChanged={refresh} />}
        {tab === 'runs' && <RunsTab agent={agent} />}
        {tab === 'versions' && <VersionsTab agent={agent} />}
        {tab === 'memory' && <MemoryTab agent={agent} />}
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete “${agent.name}”?`}
        description={
          agent.status === 'draft' && agent.totalRuns === 0
            ? 'This draft has never run, so it will be permanently deleted.'
            : 'This agent has execution history, so it will be archived instead of deleted. The history is preserved.'
        }
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} disabled={busy}>
              {agent.status === 'draft' && agent.totalRuns === 0 ? 'Delete agent' : 'Archive agent'}
            </Button>
          </div>
        }
      >
        <p className="text-xs leading-relaxed text-muted">
          Audit records and execution history are never silently destroyed.
        </p>
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewTab({ agent }: { agent: AgentDetail }) {
  const spec = agent.version.spec
  const validation = agent.version.validation

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <Panel>
          <PanelHeader title="System instructions" icon={<ShieldCheck className="h-4 w-4" />} />
          <div className="px-5 py-4">
            <p className="whitespace-pre-wrap text-xs leading-[19px] text-ink-600">{spec.instructions}</p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Workflow"
            subtitle={`${spec.workflow.nodes.length} nodes · ${spec.workflow.edges.length} connections`}
            icon={<Workflow className="h-4 w-4" />}
          />
          <div className="space-y-1.5 px-5 py-4">
            {spec.workflow.nodes.map((node, index) => (
              <div key={node.id} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cream-100 text-[10px] font-bold text-ink-600">
                    {index + 1}
                  </span>
                  {index < spec.workflow.nodes.length - 1 && <span className="my-0.5 h-4 w-px bg-line-strong" />}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-ink">{node.data.label}</span>
                    <span className="rounded-full bg-cream-100 px-1.5 py-0.5 text-[10px] text-ink-600">
                      {node.type}
                    </span>
                    {node.data.toolId && (
                      <span className="font-mono text-[10px] text-muted">{node.data.toolId}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Available tools"
            subtitle="Only registry tools can be selected by the agent."
            icon={<Database className="h-4 w-4" />}
          />
          <ul className="divide-y divide-line/70">
            {agent.version.tools.map((tool) => (
              <li key={tool.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink">{tool.name}</span>
                    <span className="font-mono text-[10px] text-muted">{tool.id}</span>
                  </div>
                  <p className="mt-0.5 text-2xs leading-relaxed text-muted">{tool.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge tone={tool.permission === 'read' ? 'neutral' : tool.permission === 'draft' ? 'brand' : 'warn'} size="sm">
                    {tool.permission}
                  </Badge>
                  {tool.approvalRequired && (
                    <span title="Requires human approval">
                      <Lock className="h-3 w-3 text-warn-600" />
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel>
          <PanelHeader title="Configuration" icon={<Bot className="h-4 w-4" />} />
          <dl className="space-y-2.5 px-5 py-4 text-xs">
            <Row label="Category" value={categoryLabel(spec.category)} />
            <Row label="Owner" value={agent.ownerName} />
            <Row label="Current version" value={`v${agent.version.versionNumber}`} />
            <Row label="Status" value={agent.status} />
            <Row label="Created" value={formatDateTime(agent.createdAt)} />
            <Row label="Updated" value={formatDateTime(agent.updatedAt)} />
            <Row
              label="Success rate"
              value={agent.successRate == null ? 'No finished runs' : `${agent.successRate}%`}
            />
            <Row label="Total runs" value={String(agent.totalRuns)} />
          </dl>
        </Panel>

        <Panel>
          <PanelHeader title="Permissions" icon={<Lock className="h-4 w-4" />} />
          <div className="space-y-2 px-5 py-4 text-xs text-ink-600">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-500" />
              Read-only by default. The agent cannot approve, reject, publish or alter rules.
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-500" />
              {spec.approval_policy.human_approval_required_for_write_actions
                ? 'Protected write actions pause for a Brand Manager.'
                : 'No write approval configured.'}
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-500" />
              Max {spec.execution_limits.max_steps} steps · {spec.execution_limits.timeout_seconds}s timeout.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Memory" icon={<Brain className="h-4 w-4" />} />
          <div className="px-5 py-4 text-xs text-ink-600">
            {spec.memory.enabled ? (
              <p>
                Enabled · <span className="font-semibold">{spec.memory.scope}</span> scope. Memory is isolated to
                this workspace, agent and user.
              </p>
            ) : (
              <p>Disabled. Nothing is persisted between runs.</p>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Input & output" icon={<ArrowRight className="h-4 w-4" />} />
          <div className="space-y-3 px-5 py-4 text-xs">
            <SchemaBlock label="Expected input" schema={spec.input_schema} />
            <SchemaBlock label="Expected output" schema={spec.output_schema} />
          </div>
        </Panel>

        {validation.warnings.length > 0 && (
          <div className="rounded-2xl border border-warn-200 bg-warn-50 px-4 py-3 text-xs text-warn-800">
            <p className="font-semibold">Warnings</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {validation.warnings.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate font-medium capitalize text-ink">{value}</dd>
    </div>
  )
}

function SchemaBlock({ label, schema }: { label: string; schema: Record<string, unknown> }) {
  const properties = (schema?.properties as Record<string, unknown> | undefined) ?? {}
  const required = (schema?.required as string[] | undefined) ?? []
  return (
    <div>
      <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      {Object.keys(properties).length === 0 ? (
        <p className="text-2xs text-muted">Open — the agent accepts free-form input.</p>
      ) : (
        <div className="space-y-1">
          {Object.entries(properties).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-2 rounded-lg bg-cream-50 px-2 py-1">
              <span className="font-mono text-[10.5px] text-ink-700">{key}</span>
              <span className="text-[10px] text-muted">
                {String((value as Record<string, unknown>)?.type ?? 'any')}
                {required.includes(key) ? ' · required' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Test playground                                                     */
/* ------------------------------------------------------------------ */

function TestTab({ agent, onChanged }: { agent: AgentDetail; onChanged: () => void }) {
  const [submissionId, setSubmissionId] = useState('')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [run, setRun] = useState<AgentRun | null>(null)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approvalNote, setApprovalNote] = useState('')

  const inputSchema = (agent.version.spec.input_schema?.properties as Record<string, unknown> | undefined) ?? {}
  const wantsSubmission = 'submission_id' in inputSchema || agent.version.tools.some((t) => t.id === 'get_submission')
  const wantsQuery = 'query' in inputSchema

  const buildInput = () => {
    const input: Record<string, unknown> = {}
    if (submissionId.trim()) input.submission_id = submissionId.trim()
    if (query.trim()) input.query = query.trim()
    if (message.trim()) input.text = message.trim()
    return input
  }

  const runTest = async () => {
    setTesting(true)
    setError(null)
    try {
      const result = await agentApi.test(agent.id, buildInput(), message.trim() || undefined)
      setRun(result.run)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The test could not run')
    } finally {
      setTesting(false)
    }
  }

  const cancel = async () => {
    if (!run) return
    setTesting(true)
    try {
      const result = await agentApi.cancelRun(run.id)
      setRun(result.run)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the run')
    } finally {
      setTesting(false)
    }
  }

  const decide = async (decision: 'approve' | 'reject') => {
    if (!run) return
    setTesting(true)
    try {
      const result = await agentApi.approveRun(run.id, decision, approvalNote)
      setRun(result.run)
      setApprovalNote('')
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The approval could not be recorded')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      {/* Left: configuration */}
      <div className="space-y-4 xl:col-span-3">
        <Panel>
          <PanelHeader title="Agent" icon={<Bot className="h-4 w-4" />} />
          <div className="space-y-2 px-4 py-3 text-xs">
            <p className="font-semibold text-ink">{agent.name}</p>
            <p className="text-2xs leading-relaxed text-muted">{agent.description}</p>
            <div className="pt-1">
              <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted">Instructions</p>
              <p className="max-h-40 overflow-y-auto text-2xs leading-relaxed text-ink-600">
                {agent.version.spec.instructions}
              </p>
            </div>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Tools" subtitle={`${agent.version.tools.length} available`} icon={<Database className="h-4 w-4" />} />
          <ul className="space-y-1.5 px-4 py-3">
            {agent.version.tools.map((tool) => (
              <li key={tool.id} className="flex items-center justify-between gap-2 text-2xs">
                <span className="truncate text-ink-600">{tool.name}</span>
                <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold', tool.permission === 'read' ? 'bg-cream-100 text-ink-600' : 'bg-warn-50 text-warn-700')}>
                  {tool.permission}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Center: input */}
      <div className="space-y-4 xl:col-span-5">
        <Panel>
          <PanelHeader title="Test input" subtitle="Runs against real workspace data." icon={<Play className="h-4 w-4" />} />
          <div className="space-y-3 px-4 py-4">
            {wantsSubmission && (
              <div>
                <label className="mb-1 block text-2xs font-semibold text-ink-700">Submission ID</label>
                <Input
                  value={submissionId}
                  onChange={(e) => setSubmissionId(e.target.value)}
                  placeholder="e.g. sub_dfac9746ad2c"
                  className="font-mono text-xs"
                />
                <p className="mt-1 text-[10px] text-muted">
                  Use a real submission id. The agent will load the actual copy and stored findings.
                </p>
              </div>
            )}
            {wantsQuery && (
              <div>
                <label className="mb-1 block text-2xs font-semibold text-ink-700">Question / query</label>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. What does the guideline say about health claims?"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-700">Message (optional)</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Add context for the agent…"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-2.5 py-2 text-2xs text-danger-700">
                {error}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={runTest} disabled={testing}>
                {testing ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Running…
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Run test
                  </>
                )}
              </Button>
              {run && (run.status === 'running' || run.status === 'waiting_approval') && (
                <Button variant="outline" onClick={cancel} disabled={testing}>
                  <Square className="h-3.5 w-3.5" />
                  Stop run
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setRun(null)
                  setError(null)
                  setSubmissionId('')
                  setQuery('')
                  setMessage('')
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </Panel>

        {run?.status === 'waiting_approval' && (
          <Panel>
            <PanelHeader title="Approval required" icon={<Lock className="h-4 w-4" />} />
            <div className="space-y-2 px-4 py-3">
              <p className="text-2xs leading-relaxed text-muted">
                This run reached a protected step. A Brand Manager must approve before it continues.
              </p>
              <Input
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Decision note (optional)"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => decide('approve')} disabled={testing}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve &amp; resume
                </Button>
                <Button size="sm" variant="danger" onClick={() => decide('reject')} disabled={testing}>
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            </div>
          </Panel>
        )}

        {run?.output && <JsonPanel title="Final result" value={run.output} defaultOpen />}
      </div>

      {/* Right: execution */}
      <div className="xl:col-span-4">
        {run ? (
          <RunTimeline
            run={run}
            busy={testing}
            onApprove={() => decide('approve')}
            onReject={() => decide('reject')}
            onCancel={cancel}
          />
        ) : (
          <Panel>
            <PanelHeader title="Execution" subtitle="What the agent received, called and returned." icon={<History className="h-4 w-4" />} />
            <div className="px-4 py-8 text-center text-xs text-muted">
              Run a test to inspect each tool call, its input and output, and the final result.
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Runs                                                                */
/* ------------------------------------------------------------------ */

function RunsTab({ agent }: { agent: AgentDetail }) {
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [selected, setSelected] = useState<AgentRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await agentApi.runs(agent.id)
      setRuns(data)
      if (selected) {
        const fresh = data.find((r) => r.id === selected.id)
        if (fresh) setSelected(await agentApi.run(fresh.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load executions')
    } finally {
      setLoading(false)
    }
  }, [agent.id, selected])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id])

  const openRun = async (run: AgentRun) => {
    setSelected(run)
    try {
      setSelected(await agentApi.run(run.id))
    } catch {
      /* keep the summary */
    }
  }

  if (loading) return <LoadingBlock label="Loading executions…" />
  if (error) return <ErrorBlock message={error} onRetry={load} />

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <div className="xl:col-span-4">
        <Panel>
          <PanelHeader title="Executions" subtitle={`${runs.length} total`} icon={<History className="h-4 w-4" />} />
          {runs.length === 0 ? (
            <EmptyState title="No executions yet" body="Test the agent or run it from the Creator workspace." icon={<Play className="h-5 w-5" />} />
          ) : (
            <ul className="divide-y divide-line/70">
              {runs.map((run) => (
                <li key={run.id}>
                  <button
                    onClick={() => openRun(run)}
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors hover:bg-cream-50/60',
                      selected?.id === run.id && 'bg-brand-50/50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <RunStatusPill status={run.status} />
                      <span className="text-[10px] text-muted">{formatRelative(run.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 truncate text-2xs text-ink-600">
                      {run.triggerType === 'test' ? 'Test run' : `Triggered by ${run.triggeredByName}`}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-light">{run.id.slice(0, 12)}…</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <div className="xl:col-span-8">
        {selected ? (
          <RunTimeline run={selected} />
        ) : (
          <Panel>
            <EmptyState title="Select an execution" body="Open a run to inspect its full node-by-node timeline." icon={<History className="h-5 w-5" />} />
          </Panel>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Versions                                                            */
/* ------------------------------------------------------------------ */

function VersionsTab({ agent }: { agent: AgentDetail }) {
  return (
    <Panel>
      <PanelHeader
        title="Version history"
        subtitle="Published versions are immutable. Editing a published agent creates a new draft."
        icon={<GitBranch className="h-4 w-4" />}
      />
      <ul className="divide-y divide-line/70">
        {agent.versions.map((version) => (
          <li key={version.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="text-xs font-semibold text-ink">Version {version.versionNumber}</p>
              <p className="mt-0.5 text-2xs text-muted">
                Created {formatDateTime(version.createdAt)}
                {version.publishedAt ? ` · published ${formatDateTime(version.publishedAt)}` : ''}
              </p>
            </div>
            <Badge tone={version.status === 'published' ? 'success' : 'neutral'} size="sm">
              {version.status}
            </Badge>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Memory                                                              */
/* ------------------------------------------------------------------ */

function MemoryTab({ agent }: { agent: AgentDetail }) {
  const [rows, setRows] = useState<{ id: string; key: string; value: Record<string, unknown>; sessionId: string; updatedAt: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await agentApi.memory(agent.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load memory')
    } finally {
      setLoading(false)
    }
  }, [agent.id])

  useEffect(() => {
    void load()
  }, [load])

  const clear = async () => {
    setClearing(true)
    try {
      await agentApi.clearMemory(agent.id)
      setRows([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear memory')
    } finally {
      setClearing(false)
    }
  }

  if (!agent.version.spec.memory.enabled) {
    return (
      <Panel>
        <EmptyState
          title="Memory is disabled"
          body="This agent does not persist anything between runs. Enable session or persistent memory in the builder to use it."
          icon={<Brain className="h-5 w-5" />}
        />
      </Panel>
    )
  }

  return (
    <Panel>
      <PanelHeader
        title="Saved memory"
        subtitle="Scoped to this workspace, agent and your user account."
        icon={<Brain className="h-4 w-4" />}
        action={
          <Button size="sm" variant="outline" onClick={clear} disabled={clearing || rows.length === 0}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear memory
          </Button>
        }
      />
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <div className="p-4">
          <ErrorBlock message={error} onRetry={load} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No saved memory" body="Memory is written after a successful run when enabled." icon={<Brain className="h-5 w-5" />} />
      ) : (
        <ul className="divide-y divide-line/70">
          {rows.map((row) => (
            <li key={row.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink">{row.key}</p>
                <span className="text-[10px] text-muted">{formatDateTime(row.updatedAt)}</span>
              </div>
              <pre className="mt-1.5 max-h-40 overflow-auto rounded-lg bg-cream-50 p-2 font-mono text-[10.5px] text-ink-600">
                {JSON.stringify(row.value, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
