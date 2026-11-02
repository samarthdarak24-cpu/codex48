import type { ElementType } from 'react'
import {
  Activity,
  AlertCircle,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  Radar,
  ScanEye,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge, type Tone } from '@/components/ui/Badge'
import type { AgentStatus, RunStatus } from '@/lib/agentTypes'

/* ------------------------------------------------------------------ */
/* Iconography                                                         */
/* ------------------------------------------------------------------ */

const GLYPHS: Record<string, ElementType> = {
  sparkles: Sparkles,
  bot: Bot,
  'shield-check': ShieldCheck,
  'book-open': BookOpen,
  'scan-eye': ScanEye,
  clock: Clock,
  radar: Radar,
  history: History,
  workflow: Workflow,
  activity: Activity,
}

export function AgentGlyph({
  icon,
  size = 'md',
  className,
}: {
  icon?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const Glyph = GLYPHS[icon ?? 'sparkles'] ?? Sparkles
  const box = size === 'lg' ? 'h-12 w-12 rounded-2xl' : size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl'
  const glyph = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-500/25',
        box,
        className,
      )}
    >
      <Glyph className={glyph} strokeWidth={1.9} />
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

const AGENT_STATUS: Record<AgentStatus, { tone: Tone; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' },
  published: { tone: 'success', label: 'Published' },
  paused: { tone: 'warn', label: 'Paused' },
  archived: { tone: 'neutral', label: 'Archived' },
}

export function AgentStatusPill({ status }: { status: AgentStatus }) {
  const meta = AGENT_STATUS[status] ?? AGENT_STATUS.draft
  return (
    <Badge tone={meta.tone} size="sm">
      {meta.label}
    </Badge>
  )
}

const RUN_STATUS: Record<RunStatus, { tone: Tone; label: string }> = {
  queued: { tone: 'neutral', label: 'Queued' },
  running: { tone: 'brand', label: 'Running' },
  waiting_approval: { tone: 'warn', label: 'Waiting for approval' },
  completed: { tone: 'success', label: 'Completed' },
  failed: { tone: 'danger', label: 'Failed' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
}

export function RunStatusPill({ status }: { status: RunStatus }) {
  const meta = RUN_STATUS[status] ?? RUN_STATUS.queued
  return (
    <Badge tone={meta.tone} size="sm">
      {meta.label}
    </Badge>
  )
}

export function StepStatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-success-500" />
  if (status === 'failed') return <AlertCircle className="h-4 w-4 text-danger-500" />
  if (status === 'waiting_approval') return <Clock className="h-4 w-4 text-warn-500" />
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
  if (status === 'skipped') return <span className="h-2 w-2 rounded-full bg-line-strong" />
  return <span className="h-2 w-2 rounded-full bg-line-strong" />
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export const CATEGORY_LABELS: Record<string, string> = {
  brand_compliance: 'Brand compliance',
  guideline_research: 'Guideline research',
  visual_review: 'Visual review',
  exceptions: 'Exceptions',
  sentinel: 'Sentinel',
  audit: 'Audit & reporting',
}

export function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

export function Panel({
  children,
  className,
  as: As = 'section',
}: {
  children: React.ReactNode
  className?: string
  as?: ElementType
}) {
  return (
    <As className={cn('rounded-2xl border border-line bg-white shadow-card', className)}>{children}</As>
  )
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-line px-5 py-4', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 text-brand-500">{icon}</span>}
        <div className="min-w-0">
          <h2 className="truncate text-md font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  body,
  icon,
  action,
}: {
  title: string
  body: string
  icon?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100 text-brand-600">
        {icon ?? <Bot className="h-5 w-5" />}
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">{body}</p>
      </div>
      {action}
    </div>
  )
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-xs font-medium text-muted">
      <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
      {label}
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-xs text-danger-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Something went wrong</p>
        <p className="mt-0.5 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 font-semibold text-danger-700 underline-offset-2 hover:underline">
          Retry
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function formatRelative(value: string | null | undefined): string {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms < 0) return '—'
  if (ms < 1000) return `${ms} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}
