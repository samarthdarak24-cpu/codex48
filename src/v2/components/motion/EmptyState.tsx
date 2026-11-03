import { motion, useReducedMotion } from 'motion/react'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'
import { EASE } from './index'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  illustration?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action, illustration }: EmptyStateProps) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {illustration ? (
        <motion.div
          initial={reduce ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
        >
          {illustration}
        </motion.div>
      ) : (
        <motion.div
          className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-cream-100 text-muted"
          initial={reduce ? false : { scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          whileHover={reduce ? undefined : { scale: 1.05 }}
        >
          <Icon className="h-10 w-10" strokeWidth={1.5} />
        </motion.div>
      )}

      <motion.div
        className="max-w-md space-y-2"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: reduce ? 0 : 0.15, ease: EASE }}
      >
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      </motion.div>

      {action && (
        <motion.div
          className="mt-6"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: reduce ? 0 : 0.25, ease: EASE }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  )
}
