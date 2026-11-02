import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Filter,
  History,
  Loader2,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
} from 'lucide-react'
import { api } from '@/services/api'
import type { Agent, AgentRun } from '@/lib/types'

export default function AgentRunsPage() {
  const { agentId } = useParams<{ agentId?: string }>()
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agentId || '')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [fetchedRuns, fetchedAgents] = await Promise.all([
        api.allAgentRuns({ agent_id: selectedAgentId || undefined, limit: 100 }),
        api.agents(),
      ])
      setRuns(fetchedRuns)
      setAgents(fetchedAgents)
    } catch (err) {
      console.error('Failed to load runs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedAgentId])

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false
      return true
    })
  }, [runs, selectedStatus])

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink font-serif">Agent Executions</h1>
              <p className="text-sm text-muted">Real-time observability, step logs, and human approval checkpoints.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Agent Filter */}
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="waiting_for_approval">Waiting for Approval</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Runs Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted">
          <History className="h-10 w-10 text-muted/40 mb-2" />
          <h3 className="text-sm font-bold text-ink">No Executions Found</h3>
          <p className="mt-1 text-xs text-muted">Runs will appear here once agents are triggered or tested.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
          <table className="min-w-full divide-y divide-line/70 text-left text-xs">
            <thead className="bg-[#FAF9F5] text-muted uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5 font-bold">Execution ID & Agent</th>
                <th className="px-5 py-3.5 font-bold">Trigger</th>
                <th className="px-5 py-3.5 font-bold">Status</th>
                <th className="px-5 py-3.5 font-bold">Tools Called</th>
                <th className="px-5 py-3.5 font-bold">Duration</th>
                <th className="px-5 py-3.5 font-bold">Timestamp</th>
                <th className="px-5 py-3.5 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filteredRuns.map((run) => (
                <tr key={run.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700 border border-brand-200 shrink-0">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-ink truncate">{run.agent_name || 'Agent Assistant'}</p>
                        <span className="font-mono text-[10px] text-muted">{run.id.slice(0, 12)}...</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 text-muted capitalize">
                    {run.trigger_type.replace('_', ' ')}
                  </td>

                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        run.status === 'completed'
                          ? 'bg-brand-50 text-brand-700 border border-brand-200'
                          : run.status === 'waiting_for_approval'
                          ? 'bg-amber-50 text-amber-800 border border-amber-300'
                          : run.status === 'running'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {run.status === 'waiting_for_approval' && <ShieldAlert className="h-3 w-3 text-amber-600" />}
                      {run.status.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 font-mono text-ink">
                    {run.tool_call_count} tools
                  </td>

                  <td className="px-5 py-3.5 font-mono text-muted">
                    {run.duration_ms}ms
                  </td>

                  <td className="px-5 py-3.5 text-muted text-[11px]">
                    {new Date(run.created_at).toLocaleString()}
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/manager/agent-runs/${run.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-[#FAF8F2] shadow-xs"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

