import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  FileCheck,
  History,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Workflow,
} from 'lucide-react'
import { api } from '@/services/api'
import type { Agent, AgentRun } from '@/lib/types'
import { TestPlaygroundModal } from '@/components/agents/TestPlaygroundModal'

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [loading, setLoading] = useState(true)
  const [isTestOpen, setIsTestOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAgent = async () => {
    if (!agentId) return
    setLoading(true)
    try {
      const [a, r] = await Promise.all([
        api.agent(agentId),
        api.agentRuns(agentId),
      ])
      setAgent(a)
      setRuns(r)
    } catch (err: any) {
      setError(err?.message || 'Agent not found.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgent()
  }, [agentId])

  const handlePublish = async () => {
    if (!agent) return
    setPublishing(true)
    setError(null)
    try {
      const updated = await api.publishAgent(agent.id)
      setAgent(updated)
    } catch (err: any) {
      setError(err?.message || 'Failed to publish agent.')
    } finally {
      setPublishing(false)
    }
  }

  const handlePause = async () => {
    if (!agent) return
    setPausing(true)
    setError(null)
    try {
      const updated = await api.pauseAgent(agent.id)
      setAgent(updated)
    } catch (err: any) {
      setError(err?.message || 'Failed to pause agent.')
    } finally {
      setPausing(false)
    }
  }

  const handleDelete = async () => {
    if (!agent) return
    if (!window.confirm(`Are you sure you want to delete '${agent.name}'?`)) return
    try {
      await api.deleteAgent(agent.id)
      navigate('/manager/agent-studio')
    } catch (err: any) {
      setError(err?.message || 'Failed to delete agent.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center">
        <p className="text-sm text-red-600">{error || 'Agent not found'}</p>
        <Link to="/manager/agent-studio" className="mt-4 inline-block text-xs font-semibold text-brand-700">
          Back to Agent Studio
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button & Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/manager/agent-studio"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-[#F6F4ED] hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-ink font-serif">{agent.name}</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  agent.status === 'published'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : agent.status === 'paused'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-muted/15 text-muted border border-muted/30'
                }`}
              >
                {agent.status} (v{agent.current_version})
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">{agent.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsTestOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-xs hover:bg-[#FAF8F2]"
          >
            <Play className="h-3.5 w-3.5 fill-brand-600 text-brand-600" />
            <span>Test Playground</span>
          </button>

          <Link
            to={`/manager/agents/${agent.id}/builder`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            <Workflow className="h-3.5 w-3.5" />
            <span>Open Visual Builder</span>
          </Link>

          {agent.status === 'published' ? (
            <button
              onClick={handlePause}
              disabled={pausing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-300 bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-800 hover:bg-brand-100"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Publish</span>
            </button>
          )}

          <button
            onClick={handleDelete}
            className="rounded-xl border border-line p-2 text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Delete Agent"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Agent Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details (Left 2 Columns) */}
        <div className="md:col-span-2 space-y-5">
          {/* System Instructions */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">System Instructions</span>
            <div className="rounded-xl bg-[#FAF9F5] p-3.5 font-mono text-xs text-ink/80 leading-relaxed border border-line/60 whitespace-pre-line">
              {agent.instructions}
            </div>
          </div>

          {/* Bound Tools Allowlist */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Bound Enterprise Tools</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {agent.tools.map((t) => (
                <div key={t} className="flex items-center gap-2.5 rounded-xl border border-line/80 bg-[#FCFBF8] p-3 text-xs">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 border border-brand-200">
                    <Cpu className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink font-mono text-[11px] truncate">{t}</p>
                    <span className="text-[10px] text-muted">Allowlisted Safe Tool</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Executions */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Recent Executions</span>
              <Link to={`/manager/agents/${agent.id}/runs`} className="text-xs font-semibold text-brand-700 hover:text-brand-900">
                View All Runs ({runs.length})
              </Link>
            </div>

            {runs.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">No runs executed yet. Test this agent above.</p>
            ) : (
              <div className="divide-y divide-line/60">
                {runs.slice(0, 5).map((run) => (
                  <div key={run.id} className="flex items-center justify-between py-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-ink font-semibold">{run.id.slice(0, 8)}...</span>
                        <span
                          className={`rounded-full px-2 py-0.2 text-[9px] font-semibold uppercase tracking-wider ${
                            run.status === 'completed'
                              ? 'bg-brand-50 text-brand-700 border border-brand-200'
                              : run.status === 'waiting_for_approval'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted">Trigger: {run.trigger_type}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-muted">{run.duration_ms}ms</span>
                      <Link
                        to={`/manager/agent-runs/${run.id}`}
                        className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-[#FAF8F2]"
                      >
                        Inspect
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info (Right Column) */}
        <div className="space-y-5">
          {/* Performance & Metrics */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Execution Metrics</span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-line/60">
                <span className="text-muted">Total Runs:</span>
                <span className="font-semibold text-ink">{agent.total_runs}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-line/60">
                <span className="text-muted">Success Rate:</span>
                <span className="font-semibold text-brand-700">{agent.success_rate}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-line/60">
                <span className="text-muted">Max Steps Limit:</span>
                <span className="font-semibold text-ink">{agent.execution_limits?.max_steps || 10}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Timeout:</span>
                <span className="font-semibold text-ink">{agent.execution_limits?.timeout_seconds || 120}s</span>
              </div>
            </div>
          </div>

          {/* Governance & Human-in-the-Loop */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Governance Policy</span>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                <span>Manager Approval Enforced</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Agent is strictly prevented from autonomously approving/rejecting content or altering brand rules. Write actions halt and wait for Brand Manager review.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Modal */}
      {isTestOpen && (
        <TestPlaygroundModal
          isOpen={isTestOpen}
          agent={agent}
          onClose={() => setIsTestOpen(false)}
          onPublish={loadAgent}
        />
      )}
    </div>
  )
}

