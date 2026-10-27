import { cn } from '@/lib/utils'
import type { ExceptionStatus, ImpactResult, Priority, RuleStatus, SubmissionStatus } from '@/lib/types'

export type Tone = 'brand' | 'success' | 'warn' | 'danger' | 'grape' | 'neutral'

const toneStyles: Record<Tone, { pill: string; dot: string }> = {
  brand: { pill: 'bg-brand-50 text-brand-700 ring-brand-100', dot: 'bg-brand-500' },
  success: { pill: 'bg-success-50 text-success-700 ring-success-100', dot: 'bg-success-500' },
  warn: { pill: 'bg-warn-50 text-warn-700 ring-warn-100', dot: 'bg-warn-500' },
  danger: { pill: 'bg-danger-50 text-danger-700 ring-danger-100', dot: 'bg-danger-500' },
  grape: { pill: 'bg-grape-50 text-grape-700 ring-grape-100', dot: 'bg-grape-500' },
  neutral: { pill: 'bg-[#F1F5FA] text-ink-600 ring-[#E4EBF4]', dot: 'bg-[#8C8578]' },
}

export function Badge({
  children,
  tone = 'neutral',
  dot = true,
  className,
  size = 'md',
}: {
  children: React.ReactNode
  tone?: Tone
  dot?: boolean
  className?: string
  size?: 'sm' | 'md'
}) {
  const s = toneStyles[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-1.5 py-0 text-2xs' : 'px-2 py-[2px] text-xs',
        s.pill,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', s.dot)} />}
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Domain status maps                                                  */
/* ------------------------------------------------------------------ */

const submissionTone: Record<SubmissionStatus, Tone> = {
  Pending: 'warn',
  'In Review': 'brand',
  'Changes Requested': 'warn',
  Approved: 'success',
  Declined: 'danger',
  'Ready for Approval': 'brand',
}

export function StatusBadge({ status, size }: { status: SubmissionStatus; size?: 'sm' | 'md' }) {
  return (
    <Badge tone={submissionTone[status]} size={size}>
      {status}
    </Badge>
  )
}

const exceptionTone: Record<ExceptionStatus, Tone> = {
  Pending: 'warn',
  'In Review': 'brand',
  Approved: 'success',
  Rejected: 'danger',
  Expired: 'neutral',
  Revoked: 'neutral',
}

export function ExceptionBadge({ status, size }: { status: ExceptionStatus; size?: 'sm' | 'md' }) {
  return (
    <Badge tone={exceptionTone[status]} size={size}>
      {status}
    </Badge>
  )
}

const ruleTone: Record<RuleStatus, { tone: Tone; label: string }> = {
  active: { tone: 'success', label: 'Active' },
  draft: { tone: 'neutral', label: 'Draft' },
  needs_confirmation: { tone: 'grape', label: 'Needs confirmation' },
  archived: { tone: 'neutral', label: 'Archived' },
  rejected: { tone: 'danger', label: 'Rejected' },
}

export function RuleBadge({ status }: { status: RuleStatus }) {
  const { tone, label } = ruleTone[status]
  return <Badge tone={tone}>{label}</Badge>
}

const priorityTone: Record<Priority, Tone> = {
  High: 'danger',
  Medium: 'warn',
  Low: 'success',
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge tone={priorityTone[priority]} dot={false}>
      {priority}
    </Badge>
  )
}

const impactTone: Record<ImpactResult, Tone> = {
  Compliant: 'success',
  'Needs Review': 'warn',
  'Non-Compliant': 'danger',
}

export function ImpactBadge({ impact }: { impact: ImpactResult }) {
  return <Badge tone={impactTone[impact]}>{impact}</Badge>
}

export function CountBubble({ count, tone = 'danger' }: { count: number; tone?: 'danger' | 'warn' }) {
  if (!count) return null
  return (
    <span
      className={cn(
        'ml-auto inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-2xs font-semibold text-white',
        tone === 'danger' ? 'bg-[#F0453F]' : 'bg-warn-500',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
