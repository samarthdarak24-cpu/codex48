import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function Card({
  className,
  children,
  as: As = 'section',
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return (
    <As className={cn('rounded-xl border border-line bg-white shadow-card', className)} {...props}>
      {children}
    </As>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
  dense,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
  dense?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border-b border-line',
        dense ? 'px-4 py-2.5' : 'px-4 py-3',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-[1px] text-brand-500">{icon}</span>}
        <div className="min-w-0">
          <h2 className="truncate text-md font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

export function ViewAll({ onClick, label = 'View all' }: { onClick?: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Metric tile                                                         */
/* ------------------------------------------------------------------ */

export type MetricTone = 'blue' | 'green' | 'amber' | 'purple' | 'rose'

const metricTones: Record<MetricTone, { bg: string; iconBg: string; icon: string; ring: string }> = {
  blue: { bg: 'bg-[#EDF4FF]', iconBg: 'bg-white/85', icon: 'text-brand-500', ring: 'ring-brand-100/70' },
  green: { bg: 'bg-[#EBFBF3]', iconBg: 'bg-white/85', icon: 'text-success-500', ring: 'ring-success-100/70' },
  amber: { bg: 'bg-[#FFF7EA]', iconBg: 'bg-white/85', icon: 'text-warn-500', ring: 'ring-warn-100/70' },
  purple: { bg: 'bg-[#F5F1FF]', iconBg: 'bg-white/85', icon: 'text-grape-500', ring: 'ring-grape-100/70' },
  rose: { bg: 'bg-[#FFF1F3]', iconBg: 'bg-white/85', icon: 'text-danger-500', ring: 'ring-danger-100/70' },
}

export function MetricCard({
  label,
  value,
  sub,
  icon,
  tone = 'blue',
  onClick,
  suffix,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon: React.ReactNode
  tone?: MetricTone
  onClick?: () => void
  suffix?: string
}) {
  const t = metricTones[tone]
  const interactive = Boolean(onClick)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={cn(
        'group relative flex w-full flex-col items-start rounded-xl border border-white/70 p-3.5 text-left ring-1 transition-all',
        t.bg,
        t.ring,
        interactive && 'hover:-translate-y-[1px] hover:shadow-[0_8px_20px_-14px_rgba(15,33,56,.35)] cursor-pointer',
        !interactive && 'cursor-default',
      )}
    >
      <span className={cn('mb-2 flex h-7 w-7 items-center justify-center rounded-lg shadow-[0_1px_2px_rgba(15,33,56,.06)]', t.iconBg, t.icon)}>
        {icon}
      </span>
      <span className="text-xs font-medium text-ink-600">{label}</span>
      <span className="mt-0.5 flex items-baseline gap-1">
        <span className="text-[26px] font-semibold leading-[30px] tracking-[-0.02em] text-ink">
          {value}
          {suffix && <span className="ml-1 text-base font-medium text-muted">{suffix}</span>}
        </span>
      </span>
      {sub && <span className="mt-0.5 text-2xs leading-[15px] text-muted">{sub}</span>}
      {interactive && (
        <span className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink-600 opacity-0 shadow-[0_1px_3px_rgba(15,33,56,.12)] transition-opacity group-hover:opacity-100">
          <ChevronRight className="h-3 w-3" />
        </span>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-2xs font-semibold uppercase tracking-[0.06em] text-muted', className)}>{children}</h3>
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-line', className)} />
}
