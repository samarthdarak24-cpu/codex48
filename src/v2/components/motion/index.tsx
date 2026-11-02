/**
 * Precedent motion system.
 *
 * Every animation in the product comes from this file so that timing, easing
 * and reduced-motion behaviour stay consistent across all 21 screens. Nothing
 * here invents data: counters, bars and rings only ever render values that are
 * passed in from a real API response.
 *
 * Accessibility: `prefers-reduced-motion` is honoured in two layers — the
 * global CSS rule in `index.css` neutralises CSS animation, and every
 * component below checks `useReducedMotion()` and renders its final state
 * immediately instead of animating into it.
 */
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
  type Variants,
} from 'motion/react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

/** Shared easing — a soft decelerate that reads as "premium", not bouncy. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const DURATION = {
  fast: 0.22,
  base: 0.4,
  slow: 0.7,
} as const

/* ------------------------------------------------------------------ */
/* Page + section entrances                                            */
/* ------------------------------------------------------------------ */

/** Fades and lifts a whole page on mount. Used by the layout shell. */
export function PageTransition({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** Reveals content when it scrolls into view. Fires once. */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  className = '',
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: DURATION.slow, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

const staggerChild: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
}

/** Container that makes its direct `<StaggerItem>` children arrive in sequence. */
export function Stagger({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      variants={staggerParent}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} variants={staggerChild}>
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

/**
 * Card that lifts on hover and presses slightly on click. `interactive` should
 * only be true when the card actually navigates or opens something, so the
 * affordance never lies.
 */
export function AnimatedCard({
  children,
  className = '',
  interactive = false,
  onClick,
  delay = 0,
  style,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
  onClick?: () => void
  delay?: number
  style?: CSSProperties
}) {
  const reduce = useReducedMotion()
  const base =
    'rounded-2xl border border-line bg-white shadow-card transition-colors duration-200'

  if (reduce) {
    return (
      <div
        className={`${base} ${interactive ? 'cursor-pointer hover:border-brand-200' : ''} ${className}`}
        onClick={onClick}
        style={style}
      >
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={`${base} ${interactive ? 'cursor-pointer hover:border-brand-200 hover:shadow-lift' : 'hover:shadow-lift'} ${className}`}
      onClick={onClick}
      style={style}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
      whileHover={interactive ? { y: -3 } : undefined}
      whileTap={interactive ? { scale: 0.995 } : undefined}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Numbers, bars, rings                                                */
/* ------------------------------------------------------------------ */

/**
 * Counts up to `value`. The final frame always equals the real value passed
 * in, and reduced-motion users see that value immediately with no tween.
 */
export function AnimatedCounter({
  value,
  duration = 1.1,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const reduce = useReducedMotion()
  const safe = Number.isFinite(value) ? value : 0
  const [display, setDisplay] = useState(reduce ? safe : 0)
  const from = useRef(0)

  useEffect(() => {
    if (reduce) {
      setDisplay(safe)
      from.current = safe
      return
    }
    const controls = animate(from.current, safe, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(v),
    })
    from.current = safe
    return () => controls.stop()
  }, [safe, duration, reduce])

  const text = display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span className={className}>
      {prefix}
      {text}
      {suffix}
    </span>
  )
}

export type Tone = 'brand' | 'sage' | 'olive' | 'terracotta' | 'amber' | 'danger'

const TONE_FILL: Record<Tone, string> = {
  brand: 'bg-brand-500',
  sage: 'bg-sage-500',
  olive: 'bg-olive-500',
  terracotta: 'bg-terracotta-500',
  amber: 'bg-warn-400',
  danger: 'bg-danger-500',
}

const TONE_TRACK: Record<Tone, string> = {
  brand: 'bg-brand-100',
  sage: 'bg-sage-100',
  olive: 'bg-olive-100',
  terracotta: 'bg-terracotta-100',
  amber: 'bg-warn-100',
  danger: 'bg-danger-100',
}

const TONE_STROKE: Record<Tone, string> = {
  brand: '#4E7A3D',
  sage: '#7A9064',
  olive: '#6B7350',
  terracotta: '#C2664A',
  amber: '#DDA22B',
  danger: '#C25446',
}

/** Horizontal progress bar that fills from zero to the real value. */
export function AnimatedProgress({
  value,
  max = 100,
  tone = 'brand',
  height = 8,
  label,
  showValue = false,
  className = '',
}: {
  value: number
  max?: number
  tone?: Tone
  height?: number
  label?: string
  showValue?: boolean
  className?: string
}) {
  const reduce = useReducedMotion()
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && <span className="text-xs font-medium text-ink-700">{label}</span>}
          {showValue && (
            <span className="text-xs font-semibold tabular-nums text-ink">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full overflow-hidden rounded-full ${TONE_TRACK[tone]}`}
        style={{ height }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'progress'}
      >
        <motion.div
          className={`h-full rounded-full ${TONE_FILL[tone]}`}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      </div>
    </div>
  )
}

/**
 * Donut progress. `value`/`max` drive the arc; the centre label shows the real
 * number, never a decorative placeholder.
 */
export function RingProgress({
  value,
  max = 100,
  size = 132,
  stroke = 10,
  tone = 'brand',
  centerLabel,
  centerSublabel,
  className = '',
}: {
  value: number
  max?: number
  size?: number
  stroke?: number
  tone?: Tone
  centerLabel?: ReactNode
  centerSublabel?: string
  className?: string
}) {
  const reduce = useReducedMotion()
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#EFEADD"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-2xl font-semibold tabular-nums leading-none text-ink">
          {centerLabel}
        </div>
        {centerSublabel && (
          <div className="mt-1 text-2xs font-medium uppercase tracking-[0.06em] text-muted">
            {centerSublabel}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

/** Shimmering placeholder block. */
export function Skeleton({
  className = '',
  rounded = 'rounded-lg',
}: {
  className?: string
  rounded?: string
}) {
  return (
    <div
      className={`relative overflow-hidden bg-line-soft shimmer ${rounded} ${className}`}
      aria-hidden="true"
    />
  )
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          rounded="rounded-full"
        />
      ))}
    </div>
  )
}

/** Card-shaped skeleton used while a view's data is still loading. */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-card ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10" rounded="rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" rounded="rounded-full" />
          <Skeleton className="h-3 w-1/5" rounded="rounded-full" />
        </div>
      </div>
      <SkeletonText lines={3} className="mt-4" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal + drawer                                                      */
/* ------------------------------------------------------------------ */

/** Centered modal with a fading scrim. Closes on Escape and scrim click. */
export function AnimatedModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 560,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  maxWidth?: number
}) {
  const reduce = useReducedMotion()
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-ink-900/35 backdrop-blur-[2px]"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: DURATION.fast }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full overflow-hidden rounded-3xl border border-line bg-white shadow-pop"
            style={{ maxWidth }}
            initial={reduce ? false : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.26, ease: EASE }}
          >
            <div className="border-b border-line px-6 py-4">
              <h2 id={titleId} className="text-lg font-semibold text-ink">
                {title}
              </h2>
              {description && <p className="mt-1 text-xs text-muted">{description}</p>}
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-line bg-cream-50 px-6 py-3.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/** Right-hand drawer for detail views. */
export function AnimatedDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 460,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children?: ReactNode
  footer?: ReactNode
  width?: number
}) {
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-ink-900/30"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: DURATION.fast }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="absolute right-0 top-0 flex h-full w-full flex-col border-l border-line bg-white shadow-pop"
            style={{ maxWidth: width }}
            initial={reduce ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: '100%' }}
            transition={{ duration: 0.34, ease: EASE }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-md font-semibold text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-cream-100 hover:text-ink"
                aria-label="Close panel"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <div className="border-t border-line bg-cream-50 px-5 py-3.5">{footer}</div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ */
/* Structure                                                           */
/* ------------------------------------------------------------------ */

/** Section title with optional eyebrow and action slot. */
export function SectionHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className = '',
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export type TimelineItem = {
  id: string
  title: string
  description?: string
  time?: string
  tone?: Tone
  icon?: ReactNode
}

/** Vertical timeline with an animated connector and tone-coded nodes. */
export function Timeline({
  items,
  className = '',
}: {
  items: TimelineItem[]
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <ol className={`relative ${className}`}>
      <span
        className="absolute left-[13px] top-2 bottom-2 w-px bg-line"
        aria-hidden="true"
      />
      {items.map((item, i) => (
        <motion.li
          key={item.id}
          className="relative flex gap-3 pb-4 last:pb-0"
          initial={reduce ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={reduce ? undefined : { x: 3 }}
          transition={{ duration: 0.35, ease: EASE, delay: reduce ? 0 : i * 0.05 }}
        >
          <span
            className={`relative z-10 mt-0.5 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border bg-white ${
              item.tone === 'danger'
                ? 'border-danger-200 text-danger-600'
                : item.tone === 'terracotta'
                  ? 'border-terracotta-200 text-terracotta-600'
                  : item.tone === 'amber'
                    ? 'border-warn-200 text-warn-600'
                    : item.tone === 'sage'
                      ? 'border-sage-200 text-sage-600'
                      : 'border-brand-200 text-brand-600'
            }`}
          >
            {item.icon ?? <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              {item.time && (
                <span className="text-2xs tabular-nums text-muted">{item.time}</span>
              )}
            </div>
            {item.description && (
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.description}</p>
            )}
          </div>
        </motion.li>
      ))}
    </ol>
  )
}

/* ------------------------------------------------------------------ */
/* AI Review Crew                                                      */
/* ------------------------------------------------------------------ */

export type AgentState = 'idle' | 'running' | 'done' | 'error'

/**
 * One Review Crew agent tile. `state` must reflect real processing state from
 * the caller — an agent is only ever shown as `running` while work is actually
 * in flight.
 */
export function AgentStatusCard({
  name,
  role,
  state,
  detail,
  icon,
  index = 0,
}: {
  name: string
  role: string
  state: AgentState
  detail?: string
  icon?: ReactNode
  index?: number
}) {
  const reduce = useReducedMotion()

  const ring =
    state === 'running'
      ? 'border-brand-300 shadow-glow-brand'
      : state === 'done'
        ? 'border-sage-300'
        : state === 'error'
          ? 'border-danger-300'
          : 'border-line'

  const dot =
    state === 'running'
      ? 'bg-brand-500'
      : state === 'done'
        ? 'bg-sage-500'
        : state === 'error'
          ? 'bg-danger-500'
          : 'bg-line-strong'

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl border bg-white p-3.5 transition-shadow ${ring}`}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: reduce ? 0 : index * 0.07 }}
    >
      {state === 'running' && !reduce && (
        <motion.span
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-brand-100/70 to-transparent"
          animate={{ x: ['0%', '400%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        />
      )}
      <div className="relative flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            state === 'running'
              ? 'bg-brand-50 text-brand-600'
              : state === 'done'
                ? 'bg-sage-50 text-sage-600'
                : state === 'error'
                  ? 'bg-danger-50 text-danger-600'
                  : 'bg-cream-100 text-muted'
          }`}
        >
          {icon ?? <span className="h-2 w-2 rounded-full bg-current" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs font-semibold text-ink">{name}</p>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot} ${state === 'running' ? 'animate-pulse' : ''}`} />
          </div>
          <p className="truncate text-2xs text-muted">{detail || role}</p>
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

/** Frame for any chart: title, legend slot and a consistent plot area. */
export function ChartContainer({
  title,
  subtitle,
  legend,
  actions,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  legend?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-card ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {legend}
          {actions}
        </div>
      </div>
      {children}
    </div>
  )
}

/**
 * Simple animated bar series. Values are drawn exactly as supplied; an empty
 * array renders nothing so the caller can show its own empty state.
 */
export function BarSeries({
  data,
  height = 120,
  tone = 'brand',
  formatValue,
}: {
  data: { label: string; value: number }[]
  height?: number
  tone?: Tone
  formatValue?: (v: number) => string
}) {
  const reduce = useReducedMotion()
  if (!data.length) return null
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100
        return (
          <div key={`${d.label}-${i}`} className="group flex h-full flex-1 flex-col justify-end">
            <span className="mb-1 text-center text-2xs font-semibold tabular-nums text-ink opacity-0 transition-opacity group-hover:opacity-100">
              {formatValue ? formatValue(d.value) : d.value}
            </span>
            <motion.div
              className={`w-full rounded-t-md ${TONE_FILL[tone]} transition-opacity group-hover:opacity-80`}
              initial={reduce ? false : { height: 0 }}
              animate={{ height: `${Math.max(pct, 2)}%` }}
              transition={{ duration: 0.7, ease: EASE, delay: reduce ? 0 : i * 0.04 }}
              title={`${d.label}: ${formatValue ? formatValue(d.value) : d.value}`}
            />
            <span className="mt-1.5 truncate text-center text-2xs text-muted">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Animated sparkline for trend cards. */
export function Sparkline({
  points,
  width = 220,
  height = 48,
  tone = 'brand',
}: {
  points: number[]
  width?: number
  height?: number
  tone?: Tone
}) {
  const reduce = useReducedMotion()
  const gradId = useId()
  if (points.length < 2) return null

  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const step = width / (points.length - 1)
  const coords = points.map((p, i) => {
    const x = i * step
    const y = height - ((p - min) / span) * (height - 6) - 3
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const path = `M${coords.join(' L')}`
  const area = `${path} L${width},${height} L0,${height} Z`

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TONE_STROKE[tone]} stopOpacity="0.22" />
          <stop offset="100%" stopColor={TONE_STROKE[tone]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <motion.path
        d={path}
        fill="none"
        stroke={TONE_STROKE[tone]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: EASE }}
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Feedback details                                                    */
/* ------------------------------------------------------------------ */

/** Small pulsing dot used for live/active indicators. */
export function PulseDot({ tone = 'brand' }: { tone?: Tone }) {
  const reduce = useReducedMotion()
  const color = TONE_STROKE[tone]
  return (
    <span className="relative inline-flex h-2 w-2" aria-hidden="true">
      {!reduce && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ backgroundColor: color }}
        />
      )}
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  )
}

/** Checkmark that draws itself once an operation succeeds. */
export function SuccessCheck({ size = 18 }: { size?: number }) {
  const reduce = useReducedMotion()
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <motion.path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Extended motion primitives                                          */
/* ------------------------------------------------------------------ */

/** Card with stronger lift elevation for high-emphasis interactions. */
export function HoverLiftCard({
  children,
  className = '',
  onClick,
  elevation = 'medium',
  delay = 0,
  style,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  elevation?: 'medium' | 'high'
  delay?: number
  style?: CSSProperties
}) {
  const reduce = useReducedMotion()
  const liftY = elevation === 'high' ? -10 : -6
  const base =
    'rounded-2xl border border-line bg-white shadow-card transition-colors duration-200 cursor-pointer hover:border-brand-200 hover:shadow-pop'

  if (reduce) {
    return (
      <div className={`${base} ${className}`} onClick={onClick} style={style}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={`${base} ${className}`}
      onClick={onClick}
      style={style}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
      whileHover={{ y: liftY, boxShadow: '0 10px 30px -8px rgba(35,40,42,0.18)' }}
      whileTap={{ scale: 0.995 }}
    >
      {children}
    </motion.div>
  )
}

/** Tabs with animated sliding indicator. */
export function AnimatedTabs({
  tabs,
  active,
  onChange,
  className = '',
}: {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
  className?: string
}) {
  const reduce = useReducedMotion()
  // Per-instance id: two tab bars on one screen must not share an indicator.
  const groupId = useId()
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border border-line bg-cream-50 p-1 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative z-10 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isActive ? 'text-brand-700' : 'text-muted hover:text-ink'
            }`}
          >
            {isActive && !reduce && (
              <motion.span
                layoutId={`${groupId}-indicator`}
                className="absolute inset-0 -z-10 rounded-lg bg-white shadow-card border border-brand-200"
                transition={{ duration: 0.3, ease: EASE }}
              />
            )}
            {isActive && reduce && (
              <span className="absolute inset-0 -z-10 rounded-lg bg-white shadow-card border border-brand-200" />
            )}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

const TONE_SOLID_BG: Record<Tone, string> = {
  brand: 'bg-brand-500 text-white',
  sage: 'bg-sage-500 text-white',
  olive: 'bg-olive-500 text-white',
  terracotta: 'bg-terracotta-500 text-white',
  amber: 'bg-warn-400 text-ink-900',
  danger: 'bg-danger-500 text-white',
}

const TONE_SOFT_BG: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  sage: 'bg-sage-50 text-sage-700 border-sage-200',
  olive: 'bg-olive-50 text-olive-700 border-olive-200',
  terracotta: 'bg-terracotta-50 text-terracotta-700 border-terracotta-200',
  amber: 'bg-warn-50 text-warn-700 border-warn-200',
  danger: 'bg-danger-50 text-danger-700 border-danger-200',
}

/** Animated badge with entrance animation. */
export function AnimatedBadge({
  children,
  tone = 'brand',
  variant = 'soft',
  className = '',
}: {
  children: ReactNode
  tone?: Tone
  variant?: 'solid' | 'soft'
  className?: string
}) {
  const reduce = useReducedMotion()
  const colorClass = variant === 'solid' ? TONE_SOLID_BG[tone] : TONE_SOFT_BG[tone]
  const borderClass = variant === 'soft' ? 'border' : ''

  if (reduce) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass} ${borderClass} ${className}`}
      >
        {children}
      </span>
    )
  }

  return (
    <motion.span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass} ${borderClass} ${className}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      {children}
    </motion.span>
  )
}

/** Button with hover and active micro-interactions. */
export function AnimatedButton({
  children,
  variant = 'primary',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit' | 'reset'
}) {
  const reduce = useReducedMotion()
  const baseClass =
    variant === 'primary'
      ? 'bg-brand-500 text-white hover:bg-brand-600 hover:shadow-lift disabled:bg-line-strong disabled:text-muted'
      : 'bg-white text-ink border border-line hover:border-brand-200 hover:shadow-lift disabled:bg-cream-50 disabled:text-muted'

  if (reduce) {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed ${baseClass} ${className}`}
      >
        {children}
      </button>
    )
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed ${baseClass} ${className}`}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
    >
      {children}
    </motion.button>
  )
}

/** Floating tooltip with entrance animation. */
export function AnimatedTooltip({
  content,
  children,
  placement = 'top',
}: {
  content: string
  children: ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
}) {
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(false)

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-pop ${positions[placement]}`}
            initial={reduce ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.15, ease: EASE }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Animated layout transition between grid and list modes. */
export function LayoutTransition({
  mode,
  children,
  className = '',
}: {
  mode: 'grid' | 'list'
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  const layoutClass =
    mode === 'grid' ? 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-3'

  if (reduce) {
    return <div className={`${layoutClass} ${className}`}>{children}</div>
  }

  return (
    <motion.div
      className={`${layoutClass} ${className}`}
      layout
      transition={{ duration: 0.35, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** Enhanced scroll-triggered reveal with directional control. */
export function ScrollReveal({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: ReactNode
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  className?: string
}) {
  const reduce = useReducedMotion()

  const initialVals = {
    up: { opacity: 0, y: 20 },
    down: { opacity: 0, y: -20 },
    left: { opacity: 0, x: 20 },
    right: { opacity: 0, x: -20 },
  }

  const animateVals = {
    up: { opacity: 1, y: 0 },
    down: { opacity: 1, y: 0 },
    left: { opacity: 1, x: 0 },
    right: { opacity: 1, x: 0 },
  }

  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial={initialVals[direction]}
      whileInView={animateVals[direction]}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: DURATION.slow, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Sweeping gradient overlay for AI processing visualization. */
export function ScanningEffect({
  active,
  children,
  className = '',
}: {
  active: boolean
  children?: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {children}
      {active && !reduce && (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-brand-200/40 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  )
}

/** Drag-drop upload zone with scale feedback. */
export function UploadAnimation({
  isDragging,
  children,
  onDrop,
  className = '',
}: {
  isDragging: boolean
  children: ReactNode
  onDrop?: (e: React.DragEvent) => void
  className?: string
}) {
  const reduce = useReducedMotion()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  if (reduce) {
    return (
      <div
        onDrop={onDrop}
        onDragOver={handleDragOver}
        className={`rounded-2xl border-2 border-dashed transition-colors ${isDragging ? 'border-brand-400 bg-brand-50/30' : 'border-line-strong bg-cream-50'} ${className}`}
      >
        {children}
      </div>
    )
  }

  return (
    <motion.div
      onDrop={onDrop}
      onDragOver={handleDragOver}
      className={`rounded-2xl border-2 border-dashed transition-colors ${isDragging ? 'border-brand-400 bg-brand-50/30 shadow-glow-brand' : 'border-line-strong bg-cream-50'} ${className}`}
      animate={{ scale: isDragging ? 1.02 : 1 }}
      transition={{ duration: 0.2, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** Premium multi-ring loading spinner. */
export function ProcessingSpinner({
  size = 40,
  tone = 'brand',
  className = '',
}: {
  size?: number
  tone?: Tone
  className?: string
}) {
  const reduce = useReducedMotion()
  const stroke = TONE_STROKE[tone]

  if (reduce) {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        aria-label="Loading"
      >
        <div
          className="h-full w-full rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${stroke}40`, borderTopColor: stroke }}
        />
      </div>
    )
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label="Loading"
    >
      <motion.div
        className="absolute h-full w-full rounded-full border-2 border-t-transparent"
        style={{ borderColor: `${stroke}30`, borderTopColor: stroke }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute rounded-full border-2 border-t-transparent"
        style={{
          width: size * 0.7,
          height: size * 0.7,
          borderColor: `${stroke}20`,
          borderTopColor: stroke,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', delay: 0.1 }}
      />
    </div>
  )
}

/** Rapid digit flip animation for dramatic number reveals. */
export function NumberTicker({
  value,
  duration = 1.5,
  className = '',
}: {
  value: number
  duration?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  const safe = Number.isFinite(value) ? value : 0
  const [display, setDisplay] = useState(reduce ? safe : 0)
  const from = useRef(0)

  useEffect(() => {
    if (reduce) {
      setDisplay(safe)
      from.current = safe
      return
    }
    // Rapid acceleration then deceleration for dramatic effect
    const controls = animate(from.current, safe, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.floor(v)),
    })
    from.current = safe
    return () => controls.stop()
  }, [safe, duration, reduce])

  return (
    <span className={`tabular-nums ${className}`}>
      {display.toLocaleString()}
    </span>
  )
}

/** Image wrapper with zoom on hover. */
export function ImageHoverEffect({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <div className={`overflow-hidden ${className}`}>{children}</div>
  }

  return (
    <motion.div
      className={`overflow-hidden ${className}`}
      initial="rest"
      animate="rest"
      whileHover="hover"
    >
      <motion.div
        variants={{ rest: { scale: 1 }, hover: { scale: 1.05 } }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

/** Consistent empty state component. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon: ReactNode
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  className?: string
}) {
  const reduce = useReducedMotion()

  if (reduce) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-line bg-white p-10 text-center shadow-card ${className}`}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-100 text-muted">
          {icon}
        </div>
        <h3 className="text-md font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            {action.label}
          </button>
        )}
      </div>
    )
  }

  return (
    <motion.div
      className={`flex flex-col items-center justify-center rounded-2xl border border-line bg-white p-10 text-center shadow-card ${className}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <motion.div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-100 text-muted"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: EASE, delay: 0.1 }}
      >
        {icon}
      </motion.div>
      <h3 className="text-md font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      {action && (
        <motion.button
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  )
}

/** Animated filter chip selector. */
export function FilterPills({
  options,
  selected,
  onChange,
  className = '',
}: {
  options: { id: string; label: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  className?: string
}) {
  const reduce = useReducedMotion()
  // One fill element per group so the animation travels between pills.
  const groupId = useId()

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  if (reduce) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {options.map((option) => {
          const isSelected = selected.includes(option.id)
          return (
            <button
              key={option.id}
              onClick={() => toggle(option.id)}
              aria-pressed={isSelected}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? 'border-brand-300 bg-brand-500 text-white shadow-card'
                  : 'border-line bg-white text-muted hover:border-brand-200 hover:text-ink'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {options.map((option) => {
        const isSelected = selected.includes(option.id)
        return (
          <motion.button
            key={option.id}
            onClick={() => toggle(option.id)}
            aria-pressed={isSelected}
            className={`relative isolate overflow-hidden rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? 'border-brand-300 text-white'
                : 'border-line bg-white text-muted hover:border-brand-200 hover:text-ink'
            }`}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            {isSelected && (
              <motion.span
                className="absolute inset-0 z-0 bg-brand-500"
                layoutId={`${groupId}-fill`}
                transition={{ duration: 0.25, ease: EASE }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

/** Animated status pill with color mapping. */
export function StatusPill({
  status,
  className = '',
}: {
  status: 'approved' | 'pending' | 'rejected' | 'draft'
  className?: string
}) {
  const reduce = useReducedMotion()

  const styles = {
    approved: 'bg-success-50 text-success-700 border-success-200',
    pending: 'bg-warn-50 text-warn-700 border-warn-200',
    rejected: 'bg-danger-50 text-danger-700 border-danger-200',
    draft: 'bg-line-soft text-muted border-line-strong',
  }

  const labels = {
    approved: 'Approved',
    pending: 'Pending',
    rejected: 'Rejected',
    draft: 'Draft',
  }

  if (reduce) {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]} ${className}`}
      >
        {labels[status]}
      </span>
    )
  }

  return (
    <motion.span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]} ${className}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      {labels[status]}
    </motion.span>
  )
}
