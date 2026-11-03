import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  History,
  Loader2,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  StopCircle,
  XCircle,
} from 'lucide-react'
import { api } from '@/services/api'
import type { AgentApproval, AgentRun, AgentRunStep } from '@/lib/types'

export default function AgentRunDetailPage() {
  const { runId } = useParams<{ runId: string }>()
  const navigate = useNavigate()
  const [run, setRun] = useState<AgentRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvalNote, setApprovalNote] = useState('')
  const [approving, setApproving] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const loadRun = async () => {
    if (!runId) return
    setLoading(true)
    try {
      const data = await api.agentRun(runId)
      setRun(data)
    } catch (err: any) {
      setError(err?.message || 'Execution not found.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRun()
  }, [runId])

  const handleApprove = async (decision: 'approved' | 'rejected') => {
    if (!run) return
    setApproving(true)
    try {
      const updated = await api.approveAgentRun(run.id, decision, approvalNote)
      setRun(updated)
    } catch (err: any) {
      setError(err?.message || 'Failed to record approval decision.')
    } finally {
      setApproving(false)
    }
  }

  const handleCancel = async () => {
    if (!run) return
    setCancelling(true)
    try {
      const updated = await api.cancelAgentRun(run.id)
      setRun(updated)
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel execution.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!run) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center text-xs text-red-600">
        {error || 'Execution not found.'}
        <Link to="/manager/agent-runs" className="mt-4 block font-semibold text-brand-700">
          Back to Executions
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/manager/agent-runs"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-[#F6F4ED] hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-ink font-serif">
                Execution: {run.agent_name || 'Agent Assistant'}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  run.status === 'completed'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : run.status === 'waiting_for_approval'
                    ? 'bg-amber-50 text-amber-800 border border-amber-300'
                    : run.status === 'running'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {run.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-muted font-mono mt-0.5">ID: {run.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {run.status === 'running' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              <StopCircle className="h-3.5 w-3.5" />
              <span>Cancel Run</span>
            </button>
          )}

          {run.agent_id && (
            <Link
              to={`/manager/agents/${run.agent_id}`}
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-[#FAF8F2]"
            >
              Agent Details
            </Link>
          )}
        </div>
      </div>

      {/* Overview Stat Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl border border-line bg-white p-4 shadow-xs text-xs">
        <div>
          <span className="text-muted text-[10px] uppercase font-semibold">Trigger Type</span>
          <p className="font-semibold text-ink capitalize mt-0.5">{run.trigger_type.replace('_', ' ')}</p>
        </div>
        <div>
          <span className="text-muted text-[10px] uppercase font-semibold">Duration</span>
          <p className="font-semibold text-ink font-mono mt-0.5">{run.duration_ms}ms</p>
        </div>
        <div>
          <span className="text-muted text-[10px] uppercase font-semibold">Tools Dispatched</span>
          <p className="font-semibold text-ink font-mono mt-0.5">{run.tool_call_count} calls</p>
        </div>
        <div>
          <span className="text-muted text-[10px] uppercase font-semibold">Started At</span>
          <p className="font-semibold text-ink text-[11px] mt-0.5">
            {new Date(run.started_at).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Human Approval Checkpoint Banner */}
      {run.status === 'waiting_for_approval' && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Brand Manager Approval Required</h3>
              <p className="text-xs text-amber-800">
                This workflow reached a protected write action. As an authorized Brand Manager, review the payload and make a decision to proceed or abort.
              </p>
            </div>
          </div>

          {run.approvals && run.approvals.length > 0 && (
            <div className="rounded-xl bg-white p-3 border border-amber-200 space-y-1.5 text-xs">
              <span className="font-semibold text-ink">Action: {run.approvals[0].action_type}</span>
              <p className="text-muted">{run.approvals[0].description}</p>
              {run.approvals[0].payload && (
                <pre className="rounded-lg bg-[#FAF9F5] p-2 text-[10px] font-mono text-ink overflow-x-auto border border-line/60">
                  {JSON.stringify(run.approvals[0].payload, null, 2)}
                </pre>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Optional approval note or reason..."
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              className="w-full flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-ink focus:outline-none"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={approving}
                onClick={() => handleApprove('approved')}
                className="flex-1 sm:flex-initial rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
              >
                {approving ? 'Resuming...' : 'Approve & Resume'}
              </button>
              <button
                type="button"
                disabled={approving}
                onClick={() => handleApprove('rejected')}
                className="flex-1 sm:flex-initial rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Reject Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Timeline Steps */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider text-muted">
          Execution Timeline Steps ({run.steps?.length || 0})
        </h2>

        <div className="space-y-3">
          {run.steps?.map((step) => (
            <div
              key={step.id}
              className="rounded-2xl border border-line bg-white p-4 shadow-xs space-y-2.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold ${
                      step.status === 'completed'
                        ? 'bg-brand-50 text-brand-700 border-brand-200'
                        : step.status === 'waiting_for_approval'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {step.step_number}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">{step.node_label || step.node_type}</h4>
                    <span className="text-[10px] text-muted capitalize">
                      {step.node_type} {step.tool_id ? `· ${step.tool_id}` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-muted">{step.ms}ms</span>
                  <span
                    className={`rounded-full px-2 py-0.2 text-[9px] font-semibold uppercase tracking-wider ${
                      step.status === 'completed'
                        ? 'bg-brand-50 text-brand-700 border border-brand-200'
                        : step.status === 'waiting_for_approval'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {step.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {step.explanation && (
                <p className="text-xs text-ink/80 bg-[#FAF9F5] p-2.5 rounded-xl border border-line/60 leading-relaxed">
                  {step.explanation}
                </p>
              )}

              {step.outputs && Object.keys(step.outputs).length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted uppercase">Step Output:</span>
                  <pre className="rounded-xl bg-[#FAF9F5] p-2.5 text-[10px] font-mono text-ink overflow-x-auto border border-line/60">
                    {JSON.stringify(step.outputs, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Final Run Output */}
      {run.outputs && Object.keys(run.outputs).length > 0 && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5 shadow-xs space-y-2">
          <span className="text-xs font-bold text-brand-900 uppercase tracking-wider">Final Output Payload</span>
          <pre className="rounded-xl bg-white p-3.5 text-xs font-mono text-ink overflow-x-auto border border-brand-200">
            {JSON.stringify(run.outputs, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

