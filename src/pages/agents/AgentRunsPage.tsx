import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Filter, History, RefreshCw, RotateCcw } from 'lucide-react'
import { agentApi } from '@/services/api'
import type { AgentRun, AgentSummary } from '@/lib/agentTypes'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Misc'
import { cn } from '@/lib/utils'
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  Panel,
  PanelHeader,
  RunStatusPill,
  formatDateTime,
  formatDuration,
  formatRelative,
} from './shared'
import { RunTimeline } from './RunTimeline'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'waiting_approval', label: 'Waiting for approval' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function AgentRunsPage() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [status, setStatus] = useState('')
  const [agentId, setAgentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AgentRun | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [runData, agentData] = await Promise.all([
        agentApi.allRuns({ status: status || undefined, agent_id: agentId || undefined }),
        agentApi.list(),
      ])
      setRuns(runData)
      setAgents(agentData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load executions')
    } finally {
      setLoading(false)
    }
  }, [status, agentId])

  useEffect(() => {
    void load()
  }, [load])

  const openRun = async (run: AgentRun) => {
    setSelected(run)
    try {
      setSelected(await agentApi.run(run.id))
    } catch {
      /* keep the summary */
    }
  }

  const cancel = async () => {
    if (!selected) return
    setBusy(true)
    try {
      const result = await agentApi.cancelRun(selected.id)
      setSelected(result.run)
      setNotice('Execution cancelled.')
      void load()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not cancel the run')
    } finally {
      setBusy(false)
    }
  }

  const decide = async (decision: 'approve' | 'reject') => {
    if (!selected) return
    setBusy(true)
    try {
      const result = await agentApi.approveRun(selected.id, decision, '')
      setSelected(result.run)
      setNotice(decision === 'approve' ? 'Approved and resumed.' : 'Rejected.')
      void load()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not record the decision')
    } finally {
      setBusy(false)
    }
  }

  const rerun = async () => {
    if (!selected) return
    setBusy(true)
    try {
      const result = await agentApi.test(selected.agentId, selected.input ?? {})
      setSelected(result.run)
      setNotice('Test re-run created.')
      void load()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not re-run the test')
    } finally {
      setBusy(false)
    }
  }

  const stats = useMemo(() => {
    const finished = runs.filter((r) => r.status === 'completed' || r.status === 'failed')
    const completed = finished.filter((r) => r.status === 'completed').length
    return {
      total: runs.length,
      active: runs.filter((r) => r.status === 'running' || r.status === 'queued' || r.status === 'waiting_approval').length,
      failed: runs.filter((r) => r.status === 'failed').length,
      successRate: finished.length ? Math.round((completed / finished.length) * 1000) / 10 : null,
    }
  }, [runs])

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-2xs font-semibold text-muted">
            <Activity className="h-3 w-3" />
            Agent Studio
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-ink">Agent Executions</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            Every run, its trigger, duration, tool calls and approval state.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/manager/agent-studio')}>
            Back to Agent Studio
          </Button>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorBlock message={error} onRetry={load} />
        </div>
      )}

      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Executions" value={stats.total} />
        <MiniStat label="Active" value={stats.active} tone="brand" />
        <MiniStat label="Failed" value={stats.failed} tone="danger" />
        <MiniStat label="Success rate" value={stats.successRate == null ? '—' : `${stats.successRate}%`} tone="success" />
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-[34px] w-auto min-w-[170px]">
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="h-[34px] w-auto min-w-[190px]">
          <option value="">All agents</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </Select>
        {(status || agentId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus('')
              setAgentId('')
            }}
          >
            <Filter className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      <Panel className="mt-3 overflow-hidden">
        <PanelHeader title="Execution history" subtitle={`${runs.length} runs`} icon={<History className="h-4 w-4" />} />
        {loading ? (
          <LoadingBlock label="Loading executions…" />
        ) : runs.length === 0 ? (
          <EmptyState
            title="No executions yet"
            body="Run a test from an agent, or execute a published assistant from the Creator workspace."
            icon={<Activity className="h-5 w-5" />}
            action={
              <Button size="sm" onClick={() => navigate('/manager/agent-studio')}>
                Open Agent Studio
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-cream-50/60 text-[10px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Agent</th>
                  <th className="px-4 py-2.5 font-semibold">Execution</th>
                  <th className="px-4 py-2.5 font-semibold">Triggered by</th>
                  <th className="px-4 py-2.5 font-semibold">Started</th>
                  <th className="px-4 py-2.5 font-semibold">Duration</th>
                  <th className="px-4 py-2.5 font-semibold">Steps</th>
                  <th className="px-4 py-2.5 font-semibold">Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    onClick={() => openRun(run)}
                    className="cursor-pointer transition-colors hover:bg-cream-50/60"
                  >
                    <td className="px-4 py-2.5">
                      <RunStatusPill status={run.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-ink">{run.agentName}</p>
                      <p className="text-[10px] text-muted">{run.triggerType}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-mono text-[10.5px] text-ink-600">{run.id.slice(0, 12)}…</p>
                      {run.error && <p className="max-w-[180px] truncate text-[10px] text-danger-600">{run.error}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-ink-600">{run.triggeredByName}</td>
                    <td className="px-4 py-2.5 text-ink-600">
                      <p>{formatDateTime(run.startedAt)}</p>
                      <p className="text-[10px] text-muted">{formatRelative(run.startedAt)}</p>
                    </td>
                    <td className="px-4 py-2.5 text-ink-600">{formatDuration(run.durationMs)}</td>
                    <td className="px-4 py-2.5 text-ink-600">{run.stepCount}</td>
                    <td className="px-4 py-2.5 text-ink-600">{run.toolCallCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        open={selected !== null}
        onClose={() => {
          setSelected(null)
          setNotice(null)
        }}
        title={selected ? `${selected.agentName} · execution` : 'Execution'}
        description={selected ? `${formatDateTime(selected.startedAt)} · ${selected.triggerType}` : undefined}
        width="max-w-4xl"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="text-2xs text-muted">
              {selected?.triggerType === 'test' ? 'Test run — safe to repeat.' : 'Execution records are immutable.'}
            </div>
            <div className="flex items-center gap-2">
              {selected?.triggerType === 'test' && (
                <Button variant="outline" size="sm" onClick={rerun} disabled={busy}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Re-run test
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelected(null)
                  setNotice(null)
                }}
              >
                Close
              </Button>
            </div>
          </div>
        }
      >
        {notice && (
          <div className="mb-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800">
            {notice}
          </div>
        )}
        {selected && (
          <RunTimeline
            run={selected}
            busy={busy}
            onApprove={() => decide('approve')}
            onReject={() => decide('reject')}
            onCancel={cancel}
          />
        )}
      </Modal>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number | string
  tone?: 'neutral' | 'brand' | 'danger' | 'success'
}) {
  const tones = {
    neutral: 'text-ink',
    brand: 'text-brand-700',
    danger: 'text-danger-600',
    success: 'text-success-600',
  }
  return (
    <div className="rounded-xl border border-line bg-white px-3.5 py-3 shadow-card">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className={cn('mt-0.5 text-xl font-semibold tracking-[-0.02em]', tones[tone])}>{value}</p>
    </div>
  )
}
