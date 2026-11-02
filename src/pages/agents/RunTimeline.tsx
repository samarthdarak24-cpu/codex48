import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Play,
  Square,
  X,
} from 'lucide-react'
import type { AgentRun, RunStep } from '@/lib/agentTypes'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  RunStatusPill,
  StepStatusIcon,
  formatDateTime,
  formatDuration,
} from './shared'

export function RunTimeline({
  run,
  onApprove,
  onReject,
  onCancel,
  busy = false,
}: {
  run: AgentRun
  onApprove?: () => void
  onReject?: () => void
  onCancel?: () => void
  busy?: boolean
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const steps = run.steps ?? []

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <RunStatusPill status={run.status} />
              <span className="text-2xs text-muted">
                {run.triggerType === 'test' ? 'Test run' : `Triggered by ${run.triggeredByName}`}
              </span>
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-muted-light">{run.id}</p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-2xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDateTime(run.startedAt)}
              </span>
              <span>Duration {formatDuration(run.durationMs)}</span>
              <span>{run.stepCount} steps</span>
              <span>{run.toolCallCount} tool calls</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {run.status === 'waiting_approval' && onApprove && onReject && (
              <>
                <Button size="sm" variant="danger" onClick={onReject} disabled={busy}>
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
                <Button size="sm" onClick={onApprove} disabled={busy}>
                  <Check className="h-3.5 w-3.5" />
                  Approve &amp; resume
                </Button>
              </>
            )}
            {(run.status === 'running' || run.status === 'queued' || run.status === 'waiting_approval') && onCancel && (
              <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            )}
          </div>
        </div>

        {run.error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{run.error}</span>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="rounded-2xl border border-line bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">Execution timeline</h3>
          <span className="text-2xs text-muted">{steps.length} nodes</span>
        </div>
        {steps.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted">No steps recorded.</p>
        ) : (
          <ol className="divide-y divide-line/70">
            {steps.map((step) => (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === step.id ? null : step.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-cream-50/60"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                    <StepStatusIcon status={step.status} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-ink">{step.label}</span>
                      <span className="rounded-full bg-cream-100 px-1.5 py-0.5 text-[10px] text-ink-600">
                        {step.nodeType}
                      </span>
                      {step.toolId && (
                        <span className="font-mono text-[10px] text-muted">{step.toolId}</span>
                      )}
                    </span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-muted">
                      <span className="capitalize">{step.status.replace(/_/g, ' ')}</span>
                      {step.durationMs > 0 && <span>{formatDuration(step.durationMs)}</span>}
                      {step.error && <span className="text-danger-600">{step.error}</span>}
                    </span>
                  </span>
                  {expanded === step.id ? (
                    <ChevronDown className="mt-1 h-3.5 w-3.5 shrink-0 text-muted" />
                  ) : (
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted" />
                  )}
                </button>
                {expanded === step.id && <StepDetail step={step} />}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Approvals */}
      {run.approvals && run.approvals.length > 0 && (
        <div className="rounded-2xl border border-line bg-white shadow-card">
          <div className="border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">Human approvals</h3>
          </div>
          <ul className="divide-y divide-line/70">
            {run.approvals.map((approval) => (
              <li key={approval.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-ink">{approval.action}</p>
                  <p className="mt-0.5 text-2xs text-muted">
                    Requested {formatDateTime(approval.requestedAt)}
                    {approval.decidedAt ? ` · decided ${formatDateTime(approval.decidedAt)}` : ''}
                  </p>
                  {approval.decisionNote && (
                    <p className="mt-1 text-2xs text-ink-600">“{approval.decisionNote}”</p>
                  )}
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                    approval.status === 'approved' && 'bg-success-50 text-success-700 ring-success-100',
                    approval.status === 'rejected' && 'bg-danger-50 text-danger-700 ring-danger-100',
                    approval.status === 'pending' && 'bg-warn-50 text-warn-700 ring-warn-100',
                    approval.status === 'expired' && 'bg-cream-100 text-ink-600 ring-line',
                  )}
                >
                  {approval.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Final output */}
      {run.output && (
        <JsonPanel title="Final output" value={run.output} defaultOpen />
      )}
    </div>
  )
}

function StepDetail({ step }: { step: RunStep }) {
  return (
    <div className="space-y-2 border-t border-line/60 bg-cream-50/40 px-4 py-3">
      <JsonBlock label="Input" value={step.input} />
      {step.output && <JsonBlock label="Output" value={step.output} />}
      {step.error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-2.5 py-1.5 text-2xs text-danger-700">
          {step.error}
        </div>
      )}
    </div>
  )
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <pre className="max-h-56 overflow-auto rounded-lg border border-line bg-white p-2.5 font-mono text-[10.5px] leading-[16px] text-ink-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

export function JsonPanel({
  title,
  value,
  defaultOpen = false,
}: {
  title: string
  value: unknown
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [copied, setCopied] = useState(false)
  const text = JSON.stringify(value, null, 2)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted" /> : <ChevronRight className="h-3.5 w-3.5 text-muted" />}
          {title}
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            void copy()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation()
              void copy()
            }
          }}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted hover:bg-cream-100 hover:text-ink"
        >
          {copied ? <Check className="h-3 w-3 text-success-600" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </span>
      </button>
      {open && (
        <pre className="max-h-[420px] overflow-auto border-t border-line px-4 py-3 font-mono text-[11px] leading-[17px] text-ink-700">
          {text}
        </pre>
      )}
    </div>
  )
}

export function RunEmpty({ onRun }: { onRun?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-cream-50/50 px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-card">
        <Play className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">No test run yet</p>
        <p className="mt-0.5 text-xs text-muted">Run the agent against real data to see every step and tool call.</p>
      </div>
      {onRun && (
        <Button size="sm" onClick={onRun}>
          <Play className="h-3.5 w-3.5" />
          Run test
        </Button>
      )}
    </div>
  )
}
