import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AvatarTone, ThumbSpec } from '@/lib/types'

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

const avatarTones: Record<AvatarTone, string> = {
  blue: 'bg-[#DCE7D5] text-[#3D6330]',
  green: 'bg-[#D6F5E4] text-[#0A7F5A]',
  amber: 'bg-[#FCEBCB] text-[#A96A0C]',
  grape: 'bg-[#E9E0FF] text-[#55653D]',
  rose: 'bg-[#FBDDE3] text-[#B0304A]',
  teal: 'bg-[#D2F0EE] text-[#0E7C76]',
  indigo: 'bg-[#DDE4D2] text-[#4E5E3B]',
}

export function Avatar({
  initials,
  tone = 'blue',
  size = 'md',
  className,
  ring,
}: {
  initials: string
  tone?: AvatarTone
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  ring?: boolean
}) {
  const dims = {
    xs: 'h-5 w-5 text-[8px]',
    sm: 'h-6 w-6 text-[9px]',
    md: 'h-7 w-7 text-[10px]',
    lg: 'h-9 w-9 text-xs',
  }[size]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase tracking-[0.02em]',
        dims,
        avatarTones[tone],
        ring && 'ring-2 ring-white',
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Content thumbnail (deterministic, no external images)               */
/* ------------------------------------------------------------------ */

const palettes: Record<ThumbSpec['palette'], [string, string]> = {
  lime: ['#E6F5B0', '#A8CF4A'],
  peach: ['#FFE0B8', '#F2915B'],
  mint: ['#D6F2DE', '#6FBF8E'],
  violet: ['#E9DCFB', '#A9B892'],
  sky: ['#E4E9D6', '#8FA36E'],
  rose: ['#FCDCE3', '#EC9BAA'],
  sand: ['#F4EAD3', '#D2BB8A'],
  indigo: ['#E3E6D4', '#8B9A6B'],
}

function Glyph({ glyph, color }: { glyph: ThumbSpec['glyph']; color: string }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (glyph) {
    case 'bottle':
      return (
        <g {...common}>
          <path d="M11 6h4v3.2l1.4 1.6V20H9.6V10.8L11 9.2z" />
          <path d="M11 6V4.5h4V6" />
          <path d="M11.4 13.4h3.2" />
        </g>
      )
    case 'bag':
      return (
        <g {...common}>
          <path d="M8 9h10l-1 11H9L8 9z" />
          <path d="M11 9V7.4a2 2 0 014 0V9" />
        </g>
      )
    case 'leaf':
      return (
        <g {...common}>
          <path d="M18.5 6.5c0 6-4 9.5-9.5 9.5 0-6 4-9.5 9.5-9.5z" />
          <path d="M9 19c1.6-3.4 4-6 7-8" />
        </g>
      )
    case 'star':
      return (
        <g {...common}>
          <path d="M13 6.5l1.9 4 4.4.5-3.3 3 .9 4.3-3.9-2.2-3.9 2.2.9-4.3-3.3-3 4.4-.5z" />
        </g>
      )
    case 'wave':
      return (
        <g {...common}>
          <path d="M7 15.5c1.6-2.4 3.2-2.4 4.8 0s3.2 2.4 4.8 0" />
          <path d="M7 10.5c1.6-2.4 3.2-2.4 4.8 0s3.2 2.4 4.8 0" />
        </g>
      )
    case 'text':
      return (
        <g {...common}>
          <path d="M8.5 8h9M8.5 12h9M8.5 16h5.5" />
        </g>
      )
    default:
      return (
        <g fill={color}>
          <circle cx="13" cy="13" r="3.4" />
        </g>
      )
  }
}

export function Thumb({ spec, size = 32, className }: { spec: ThumbSpec; size?: number; className?: string }) {
  const [from, to] = palettes[spec.palette]
  const glyphColor = 'rgba(15,33,56,.62)'
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-black/[0.06]', className)}
      style={{ width: size, height: size, background: `linear-gradient(140deg, ${from} 0%, ${to} 100%)` }}
      aria-hidden
    >
      {spec.kind === 'doc' ? (
        <span className="flex h-full w-full flex-col items-center justify-center bg-white/85">
          <svg viewBox="0 0 26 26" width={size} height={size}>
            <rect x="8" y="6" width="10" height="14" rx="1.6" fill="#fff" stroke="rgba(15,33,56,.22)" strokeWidth="1.1" />
            <path d="M10 10h6M10 13h6M10 16h4" stroke={glyphColor} strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </span>
      ) : (
        <svg viewBox="0 0 26 26" width={size} height={size}>
          <Glyph glyph={spec.glyph} color={glyphColor} />
        </svg>
      )}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.06] to-transparent" />
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Donut                                                               */
/* ------------------------------------------------------------------ */

export interface DonutSegment {
  value: number
  color: string
  label: string
}

export function Donut({
  segments,
  size = 108,
  thickness = 11,
  centerValue,
  centerLabel,
  className,
}: {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  centerValue?: React.ReactNode
  centerLabel?: React.ReactNode
  className?: string
}) {
  const total = segments.reduce((n, s) => n + s.value, 0)
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1ECE0" strokeWidth={thickness} />
        {total > 0 &&
          segments.map((s, i) => {
            const len = (s.value / total) * c
            const dash = Math.max(len - 1.5, 0)
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            )
            offset += len
            return el
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold leading-none tracking-[-0.02em] text-ink">{centerValue}</span>
        {centerLabel && <span className="mt-1 text-2xs font-medium text-muted">{centerLabel}</span>}
      </div>
    </div>
  )
}

export function DonutLegend({ segments, total }: { segments: DonutSegment[]; total: number }) {
  return (
    <ul className="min-w-0 flex-1 space-y-1.5">
      {segments.map((s) => (
        <li key={s.label} className="flex items-center gap-1.5 text-xs">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
          <span className="min-w-0 flex-1 truncate text-ink-600">{s.label}</span>
          <span className="font-semibold text-ink">{s.value}</span>
          <span className="w-7 text-right text-muted">{total ? Math.round((s.value / total) * 100) : 0}%</span>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  value,
  tone = 'brand',
  className,
  height = 5,
}: {
  value: number
  tone?: 'brand' | 'success' | 'warn' | 'danger' | 'grape'
  className?: string
  height?: number
}) {
  const colors = {
    brand: 'bg-brand-500',
    success: 'bg-success-500',
    warn: 'bg-warn-500',
    danger: 'bg-danger-500',
    grape: 'bg-grape-500',
  }
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-[#F1ECE0]', className)} style={{ height }}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export interface TabItem {
  key: string
  label: string
  count?: number
}

export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[]
  active: string
  onChange: (key: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3 sm:gap-5 border-b border-line overflow-x-auto no-scrollbar', className)} role="tablist">
      {items.map((t) => {
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={cn(
              'relative -mb-px flex shrink-0 items-center gap-1.5 pb-2.5 pt-1 text-sm sm:text-base transition-colors whitespace-nowrap',
              isActive ? 'font-semibold text-brand-600' : 'font-medium text-muted hover:text-ink',
            )}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-px text-2xs font-semibold',
                  isActive ? 'bg-brand-50 text-brand-700' : 'bg-[#F1F5FA] text-muted',
                )}
              >
                {t.count}
              </span>
            )}
            {isActive && <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-brand-500" />}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-md bg-[#EFF4FB]', className)} />
}

export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[104px] rounded-xl" />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-[#23282A]/35 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        className={cn(
          'relative my-auto w-full animate-pop-in rounded-2xl border border-line bg-white shadow-pop outline-none max-h-[calc(100vh-2rem)] flex flex-col',
          width,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-4 py-3 sm:px-5 sm:py-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-[#F1F6FD] hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4">{children}</div>
        {footer && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-2.5 sm:px-5 sm:py-3">{footer}</div>}
      </div>
    </div>
  )
}
