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
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-200/80 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">Brand Manager Approval Required</h3>
                <p className="text-xs text-amber-800">
                  This workflow reached a protected write action. Review payload and decide to proceed or abort.
                </p>
              </div>
            </div>

            {/* Quick action buttons in header for immediate access without scrolling */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={approving}
                onClick={() => handleApprove('approved')}
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition cursor-pointer"
              >
                {approving ? 'Resuming...' : 'Approve & Resume'}
              </button>
              <button
                type="button"
                disabled={approving}
                onClick={() => handleApprove('rejected')}
                className="rounded-xl border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition cursor-pointer"
              >
                Reject Action
              </button>
            </div>
          </div>

          {run.approvals && run.approvals.length > 0 && (
            <div className="rounded-xl bg-white p-3.5 border border-amber-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">Action: {run.approvals[0].action_type}</span>
                <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                  Pending Decision
                </span>
              </div>
              <p className="text-muted text-[11.5px] leading-relaxed">{run.approvals[0].description}</p>
              {run.approvals[0].payload && (
                <ApprovalPayloadViewer payload={run.approvals[0].payload} />
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
                <TimelineStepOutputViewer outputs={step.outputs} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Final Run Output */}
      {run.outputs && Object.keys(run.outputs).length > 0 && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-900 uppercase tracking-wider">Final Output Summary</span>
            <span className="rounded-full bg-brand-100 text-brand-800 font-semibold px-2 py-0.5 text-[10px]">
              {run.status}
            </span>
          </div>
          <TimelineStepOutputViewer outputs={run.outputs} />
        </div>
      )}
    </div>
  )
}


/* ------------------------------------------------------------------ */
/* Executive Approval Payload Viewer (Formatted & Raw JSON Toggle)    */
/* ------------------------------------------------------------------ */

function ApprovalPayloadViewer({ payload }: { payload: Record<string, any> }) {
  const [showJson, setShowJson] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!payload || Object.keys(payload).length === 0) return null

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const rulesList = Array.isArray(payload.rules) ? payload.rules : null
  const subId = payload.submission_id || payload.target_submission_id || payload.id

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
          Staged Actions & Policy Payload
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowJson(!showJson)}
            className="rounded-lg border border-amber-300 bg-amber-100/70 px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-200 transition cursor-pointer"
          >
            {showJson ? 'Executive View' : '{ } Raw JSON'}
          </button>
          {showJson && (
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-amber-200 bg-white px-2 py-0.5 text-[10px] text-muted hover:text-ink transition cursor-pointer"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {showJson ? (
        <pre className="rounded-xl bg-stone-900 p-3 text-[10px] font-mono text-emerald-300 overflow-x-auto border border-stone-800 whitespace-pre-wrap leading-relaxed shadow-inner">
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-white p-3.5 space-y-3 shadow-xs">
          {/* Target submission header */}
          {subId && (
            <div className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 border border-line/60 text-xs">
              <span className="text-muted font-medium">Target Marketing Submission:</span>
              <span className="font-mono font-bold text-brand-700">{subId}</span>
            </div>
          )}

          {/* Staged rules list */}
          {rulesList && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-ink">
                <span>Affected Rules & Reassessment Policies ({rulesList.length}):</span>
                <span className="text-2xs text-muted">Human checkpoint required</span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {rulesList.map((rule: any, i: number) => (
                  <div
                    key={rule.id || i}
                    className="rounded-lg border border-line/70 bg-[#FAF9F5] p-2.5 text-xs space-y-1 transition hover:border-brand-300"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-ink">
                        <span className="rounded bg-brand-100 text-brand-800 px-1.5 py-0.5 font-mono text-[10px]">
                          {rule.code || `Rule #${i + 1}`}
                        </span>
                        <span className="text-xs">{rule.title}</span>
                      </div>
                      {rule.priority && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase ${
                            rule.priority === 'High'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {rule.priority}
                        </span>
                      )}
                    </div>
                    {rule.summary && (
                      <p className="text-[11px] text-muted leading-relaxed">{rule.summary}</p>
                    )}
                    {rule.source_passage && (
                      <p className="text-[10px] text-ink-600 italic bg-white p-1.5 rounded border border-line/40 line-clamp-2">
                        Citation: "{rule.source_passage}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other payload parameters if any */}
          {!rulesList && (
            <div className="space-y-1.5 text-xs divide-y divide-line/40">
              {Object.entries(payload).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3 pt-1.5 first:pt-0">
                  <span className="text-muted font-medium capitalize">{k.replace(/_/g, ' ')}:</span>
                  <span className="font-semibold text-ink text-right max-w-sm truncate">
                    {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Timeline Step Output Viewer (Clean Formatted & Raw JSON Toggle)    */
/* ------------------------------------------------------------------ */

function TimelineStepOutputViewer({ outputs }: { outputs: Record<string, any> }) {
  const [showJson, setShowJson] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!outputs || Object.keys(outputs).length === 0) return null

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(JSON.stringify(outputs, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const rulesList = Array.isArray(outputs.rules) ? outputs.rules : null
  const subId = outputs.submission_id || outputs.target_submission_id || outputs.id
  const copyText = outputs.copy || outputs.excerpt || outputs.text
  const findingsCount = outputs.findings_count !== undefined ? outputs.findings_count : (Array.isArray(outputs.findings) ? outputs.findings.length : null)

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-bold text-muted uppercase tracking-wider">Step Output Data</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowJson(!showJson)}
            className="rounded border border-brand-200 bg-brand-50 px-2 py-0.5 font-semibold text-brand-700 hover:bg-brand-100 transition cursor-pointer"
          >
            {showJson ? 'Formatted View' : '{ } JSON'}
          </button>
          {showJson && (
            <button
              type="button"
              onClick={handleCopy}
              className="rounded border border-line bg-stone-50 px-1.5 py-0.5 text-muted hover:text-ink transition cursor-pointer"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {showJson ? (
        <pre className="rounded-xl bg-stone-900 p-2.5 text-[9.5px] font-mono text-emerald-300 overflow-x-auto border border-stone-800 whitespace-pre-wrap leading-relaxed shadow-inner">
          {JSON.stringify(outputs, null, 2)}
        </pre>
      ) : (
        <div className="rounded-xl border border-line/70 bg-[#FAF9F5] p-3 text-xs space-y-2">
          {rulesList && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-ink text-2xs">
                <span>Active Rules In Scope:</span>
                <span className="rounded bg-brand-50 px-1.5 py-0.5 text-brand-700 text-[9.5px] font-bold">
                  {rulesList.length} rules
                </span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {rulesList.map((r: any, idx: number) => (
                  <span
                    key={r.id || idx}
                    className="inline-flex items-center gap-1 rounded border border-line bg-white px-1.5 py-0.5 text-[9.5px] text-ink"
                    title={r.title || r.summary || ''}
                  >
                    <span className="font-bold text-brand-700">{r.code || `Rule #${idx + 1}`}</span>
                    <span className="truncate max-w-[150px] text-muted">{r.title || r.summary || ''}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {(subId || copyText) && (
            <div className="rounded-lg bg-white p-2 border border-line/60 space-y-1 text-2xs">
              <div className="flex items-center justify-between text-[10px]">
                {subId && (
                  <span className="font-mono text-muted">
                    Target: <span className="font-bold text-ink">{subId}</span>
                  </span>
                )}
                {findingsCount !== null && (
                  <span className="font-semibold text-amber-700">
                    {findingsCount} findings checked
                  </span>
                )}
              </div>
              {copyText && (
                <p className="text-[10px] text-ink-700 italic border-t border-line/40 pt-1 line-clamp-2">
                  "{copyText}"
                </p>
              )}
            </div>
          )}

          {!rulesList && !subId && !copyText && (
            <div className="space-y-1 divide-y divide-line/40 text-[10.5px]">
              {Object.entries(outputs).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-2 pt-1 first:pt-0">
                  <span className="font-medium text-muted capitalize">{k.replace(/_/g, ' ')}:</span>
                  <span className="font-semibold text-ink text-right max-w-sm truncate">
                    {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
