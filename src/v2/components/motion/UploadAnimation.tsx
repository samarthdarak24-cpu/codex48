import { motion, useReducedMotion } from 'motion/react'
import { UploadCloud, Check, AlertCircle } from 'lucide-react'
import { EASE } from './index'

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

interface UploadAnimationProps {
  state: UploadState
  progress?: number
  fileName?: string
  fileSize?: string
}

export function UploadAnimation({ state, progress = 0, fileName, fileSize }: UploadAnimationProps) {
  const reduce = useReducedMotion()

  const getStateConfig = () => {
    switch (state) {
      case 'uploading':
        return {
          icon: <UploadCloud className="h-8 w-8" />,
          color: 'text-brand-500',
          bg: 'bg-brand-50',
          ring: 'border-brand-300',
          label: 'Uploading...',
        }
      case 'success':
        return {
          icon: <Check className="h-8 w-8" />,
          color: 'text-sage-600',
          bg: 'bg-sage-50',
          ring: 'border-sage-300',
          label: 'Upload complete',
        }
      case 'error':
        return {
          icon: <AlertCircle className="h-8 w-8" />,
          color: 'text-danger-600',
          bg: 'bg-danger-50',
          ring: 'border-danger-300',
          label: 'Upload failed',
        }
      default:
        return {
          icon: <UploadCloud className="h-8 w-8" />,
          color: 'text-muted',
          bg: 'bg-cream-100',
          ring: 'border-line',
          label: 'Ready to upload',
        }
    }
  }

  const config = getStateConfig()

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <motion.div
        className={`relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 ${config.ring} ${config.bg} ${config.color}`}
        initial={reduce ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        {state === 'uploading' && !reduce && (
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-brand-500"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <motion.div
          key={state}
          initial={reduce ? false : { scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {config.icon}
        </motion.div>
      </motion.div>

      <div className="w-full max-w-xs text-center">
        <motion.p
          className="text-sm font-semibold text-ink"
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {config.label}
        </motion.p>
        {fileName && (
          <motion.p
            className="mt-1 truncate text-xs text-muted"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {fileName} {fileSize && `• ${fileSize}`}
          </motion.p>
        )}
      </div>

      {state === 'uploading' && (
        <motion.div
          className="w-full max-w-xs"
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
            <motion.div
              className="h-full rounded-full bg-brand-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.3, ease: EASE }}
            />
          </div>
          <p className="mt-2 text-center text-2xs font-medium tabular-nums text-muted">
            {Math.round(progress)}%
          </p>
        </motion.div>
      )}
    </div>
  )
}
