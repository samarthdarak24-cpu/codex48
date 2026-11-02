import { motion, useReducedMotion } from 'motion/react'
import { ReactNode } from 'react'
import { EASE } from './index'

interface HoverCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}

export function HoverCard({ children, className = '', onClick, disabled = false }: HoverCardProps) {
  const reduce = useReducedMotion()

  const cardClasses = `
    rounded-2xl border border-line bg-white shadow-card transition-all
    ${onClick && !disabled ? 'cursor-pointer hover:border-brand-200' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `

  if (reduce || disabled) {
    return (
      <div className={cardClasses} onClick={disabled ? undefined : onClick}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={cardClasses}
      onClick={onClick}
      whileHover={
        onClick && !disabled
          ? { y: -4, boxShadow: '0 10px 30px -8px rgba(35,40,42,0.18)' }
          : { boxShadow: '0 10px 30px -8px rgba(35,40,42,0.12)' }
      }
      whileTap={onClick && !disabled ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.2, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

interface HoverLiftProps {
  children: ReactNode
  className?: string
  liftAmount?: number
}

export function HoverLift({ children, className = '', liftAmount = -6 }: HoverLiftProps) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      whileHover={{ y: liftAmount }}
      transition={{ duration: 0.2, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
