import { motion, useReducedMotion } from 'motion/react'
import { EASE } from './index'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand'

interface StatusBadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  withDot?: boolean
  animate?: boolean
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-sage-50 text-sage-700 border-sage-200',
  warning: 'bg-warn-50 text-warn-700 border-warn-200',
  error: 'bg-danger-50 text-danger-700 border-danger-200',
  info: 'bg-olive-50 text-olive-700 border-olive-200',
  neutral: 'bg-cream-100 text-muted border-line',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
}

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-sage-500',
  warning: 'bg-warn-500',
  error: 'bg-danger-500',
  info: 'bg-olive-500',
  neutral: 'bg-muted',
  brand: 'bg-brand-500',
}

export function StatusBadge({
  variant,
  children,
  withDot = false,
  animate = true,
  className = '',
}: StatusBadgeProps) {
  const reduce = useReducedMotion()
  const shouldAnimate = animate && !reduce

  const badge = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-2xs font-semibold ${variantStyles[variant]} ${className}`}
    >
      {withDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotStyles[variant]} ${
            variant === 'warning' || variant === 'error' ? 'animate-pulse' : ''
          }`}
        />
      )}
      {children}
    </span>
  )

  if (!shouldAnimate) return badge

  return (
    <motion.div
      className="inline-block"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      {badge}
    </motion.div>
  )
}
