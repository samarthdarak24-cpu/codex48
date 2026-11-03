import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  FileText,
  Loader2,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  StopCircle,
  X,
} from 'lucide-react'
import { api } from '@/services/api'
import type { Agent, AgentRun, AgentRunStep, Submission } from '@/lib/types'

interface TestPlaygroundModalProps {
  isOpen: boolean
  agent: Agent
  onClose: () => void
  onPublish?: () => void
}

export function TestPlaygroundModal({ isOpen, agent, onClose, onPublish }: TestPlaygroundModalProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedSubId, setSelectedSubId] = useState<string>('')
  const [customText, setCustomText] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [approvalNote, setApprovalNote] = useState<string>('')
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      api.submissions().then((subs) => {
        setSubmissions(subs)
        if (subs.length > 0) setSelectedSubId(subs[0].id)
      }).catch(() => {})
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleRunTest = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload: any = {}
      if (selectedSubId) payload.submission_id = selectedSubId
      if (customText.trim()) {
        payload.prompt = customText
        payload.query = customText
      }

      const run = await api.testAgent(agent.id, payload)
      setCurrentRun(run)
    } catch (err: any) {
      setError(err?.message || 'Execution failed. Check backend configuration.')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveAction = async (decision: 'approved' | 'rejected') => {
    if (!currentRun) return
    setApproving(true)
    try {
      const resumed = await api.approveAgentRun(currentRun.id, decision, approvalNote)
      setCurrentRun(resumed)
    } catch (err: any) {
      setError(err?.message || 'Failed to submit approval decision.')
    } finally {
      setApproving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#23282A]/45 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex h-[88vh] max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-canvas shadow-2xl my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200 shadow-xs">
              <Play className="h-4 w-4 fill-brand-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">Test Playground — {agent.name}</h2>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 border border-brand-200">
                  Sandboxed Run
                </span>
              </div>
              <p className="text-xs text-muted">Test real workflow execution, inspection, and human checkpoints.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-[#F3EFE6] hover:text-ink transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 3-Column Test Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column: Config & Context */}
          <div className="w-72 border-r border-line bg-white p-4 overflow-y-auto space-y-4 shrink-0 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">System Instructions</span>
              <p className="mt-1 text-[11px] text-ink/80 bg-[#FAF9F5] p-2.5 rounded-lg border border-line/60 font-mono max-h-36 overflow-y-auto leading-relaxed">
                {agent.instructions}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Bound Tools Allowlist</span>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {agent.tools.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-[#F4EFE3] px-2 py-0.5 font-mono text-[10px] text-brand-900 border border-[#E3DEC3]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-[#FAF9F5] p-3 space-y-1.5">
              <span className="font-semibold text-ink">Execution Limits:</span>
              <p className="text-[11px] text-muted">Max steps: {agent.execution_limits?.max_steps || 10}</p>
              <p className="text-[11px] text-muted">Timeout: {agent.execution_limits?.timeout_seconds || 120}s</p>
              <p className="text-[11px] text-muted">Approval required: {agent.approval_policy?.human_approval_required_for_write_actions ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Center Column: Inputs & Run Trigger */}
          <div className="flex-1 flex flex-col border-r border-line bg-[#FAF8F5] p-5 overflow-y-auto space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Select Target Marketing Submission</label>
              <select
                value={selectedSubId}
                onChange={(e) => setSelectedSubId(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-brand-500 focus:outline-none"
              >
                <option value="">-- No Submission (Freeform Query) --</option>
                {submissions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.channel}) — {s.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 flex-1 flex flex-col">
              <label className="text-xs font-semibold text-ink">Custom Ad Copy / Guideline Question</label>
              <textarea
                rows={5}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Optionally override with custom text copy or type a brand question..."
                className="w-full flex-1 rounded-xl border border-line bg-white p-3.5 text-xs text-ink placeholder:text-muted/60 focus:border-brand-500 focus:outline-none resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-muted">
                Executes the actual workflow engine against stored brand data.
              </span>
              <button
                type="button"
                onClick={handleRunTest}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Executing Workflow...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    <span>Run Test Execution</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Execution Trace Timeline */}
          <div className="w-96 bg-white p-4 overflow-y-auto shrink-0 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-ink">Live Execution Trace</span>
              {currentRun && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    currentRun.status === 'completed'
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : currentRun.status === 'waiting_for_approval'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {currentRun.status}
                </span>
              )}
            </div>

            {currentRun ? (
              <div className="space-y-4 flex-1">
                {/* Pending Human Approval Card */}
                {currentRun.status === 'waiting_for_approval' && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 space-y-2.5 animate-in fade-in shadow-xs">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                      <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Manager Approval Required</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      The workflow encountered a protected action and paused execution safely.
                    </p>
                    <input
                      type="text"
                      placeholder="Optional manager ruling note..."
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs text-ink focus:outline-none"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={approving}
                        onClick={() => handleApproveAction('approved')}
                        className="flex-1 rounded-lg bg-brand-600 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50"
                      >
                        {approving ? 'Resuming...' : 'Approve & Resume'}
                      </button>
                      <button
                        type="button"
                        disabled={approving}
                        onClick={() => handleApproveAction('rejected')}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Steps List */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Execution Steps ({currentRun.steps.length})
                  </span>
                  {currentRun.steps.map((step) => (
                    <div
                      key={step.id}
                      className="rounded-xl border border-line bg-[#FAF9F5] p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold text-ink">
                          <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />
                          <span>{step.node_label || step.node_type}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted">{step.ms}ms</span>
                      </div>

                      {step.explanation && (
                        <p className="text-[11px] text-ink/80 leading-relaxed">{step.explanation}</p>
                      )}

                      {step.outputs && Object.keys(step.outputs).length > 0 && (
                        <StepOutputViewer outputs={step.outputs} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Final Outputs */}
                {currentRun.status === 'completed' && currentRun.outputs && (
                  <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3 space-y-1.5">
                    <span className="font-semibold text-brand-900 text-xs">Final Result Output:</span>
                    <StepOutputViewer outputs={currentRun.outputs} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center p-6 text-muted">
                <Clock className="h-8 w-8 text-muted/40 mb-2" />
                <p className="text-xs font-semibold text-ink">Ready to Execute</p>
                <p className="text-[11px] text-muted mt-1">
                  Select a marketing submission or enter test ad copy, then click 'Run Test Execution'.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}


/* ------------------------------------------------------------------ */
/* Structured Step Output Viewer (Clean Formatted & Raw JSON Toggle)   */
/* ------------------------------------------------------------------ */

function StepOutputViewer({ outputs }: { outputs: Record<string, any> }) {
  const [showJson, setShowJson] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!outputs || Object.keys(outputs).length === 0) return null

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(JSON.stringify(outputs, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Detect special output patterns
  const rulesList = Array.isArray(outputs.rules) ? outputs.rules : null
  const subId = outputs.submission_id || outputs.target_submission_id || outputs.id
  const copyText = outputs.copy || outputs.excerpt || outputs.text
  const findingsCount = outputs.findings_count !== undefined ? outputs.findings_count : (Array.isArray(outputs.findings) ? outputs.findings.length : null)
  const statusVal = outputs.status || outputs.action || outputs.trigger

  return (
    <div className="mt-2 rounded-lg border border-line/70 bg-white p-2.5 space-y-2">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-bold text-ink-700 uppercase tracking-wider">Step Output Data</span>
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
        <pre className="rounded bg-stone-900 p-2.5 font-mono text-[9.5px] text-emerald-300 max-h-36 overflow-auto whitespace-pre-wrap leading-relaxed shadow-inner">
          {JSON.stringify(outputs, null, 2)}
        </pre>
      ) : (
        <div className="space-y-2 text-2xs">
          {/* 1. Rules list */}
          {rulesList && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-ink">
                <span>Rules Retrieved:</span>
                <span className="rounded bg-brand-50 text-brand-700 font-bold px-1.5 py-0.5 text-[9.5px]">
                  {rulesList.length} active rules
                </span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pt-0.5">
                {rulesList.map((r: any, idx: number) => (
                  <span
                    key={r.id || idx}
                    className="inline-flex items-center gap-1 rounded border border-line bg-[#FAF7EF] px-1.5 py-0.5 text-[9.5px] text-ink"
                    title={r.title || r.summary || ''}
                  >
                    <span className="font-bold text-brand-700">{r.code || `Rule #${idx + 1}`}</span>
                    <span className="truncate max-w-[150px] text-muted">{r.title || r.summary || ''}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 2. Target Submission / Copy Info */}
          {(subId || copyText) && (
            <div className="rounded-lg bg-[#FAF9F5] p-2 border border-line/60 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                {subId && (
                  <span className="font-mono text-muted">
                    ID: <span className="font-semibold text-ink">{subId}</span>
                  </span>
                )}
                {statusVal && (
                  <span className="rounded bg-brand-100 text-brand-800 font-bold px-1.5 py-0.5">
                    {String(statusVal)}
                  </span>
                )}
                {findingsCount !== null && (
                  <span className="text-amber-700 font-semibold">
                    {findingsCount} findings checked
                  </span>
                )}
              </div>
              {copyText && (
                <div className="text-[10px] text-ink-700 bg-white p-1.5 rounded border border-line/40 line-clamp-2 italic">
                  "{copyText}"
                </div>
              )}
            </div>
          )}

          {/* 3. General parameters fallback if not rules/copy */}
          {!rulesList && !subId && !copyText && (
            <div className="space-y-1 divide-y divide-line/40">
              {Object.entries(outputs).map(([key, val]) => (
                <div key={key} className="flex items-start justify-between gap-2 pt-1 first:pt-0 text-[10px]">
                  <span className="text-muted font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="font-semibold text-ink text-right truncate max-w-[220px]">
                    {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}
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
