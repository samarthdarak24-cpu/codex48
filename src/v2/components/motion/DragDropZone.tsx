import { motion, useReducedMotion } from 'motion/react'
import { Upload, FileImage, X } from 'lucide-react'
import { useState, useCallback, DragEvent } from 'react'
import { EASE } from './index'

interface DragDropZoneProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSizeMB?: number
  disabled?: boolean
  currentFile?: File | null
  onClearFile?: () => void
}

export function DragDropZone({
  onFileSelect,
  accept = 'image/*,video/*',
  maxSizeMB = 10,
  disabled = false,
  currentFile = null,
  onClearFile,
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reduce = useReducedMotion()

  const validateFile = useCallback(
    (file: File): string | null => {
      const maxBytes = maxSizeMB * 1024 * 1024
      if (file.size > maxBytes) {
        return `File too large. Maximum size is ${maxSizeMB}MB.`
      }
      if (accept && !accept.split(',').some(type => {
        const trimmed = type.trim()
        if (trimmed === 'image/*') return file.type.startsWith('image/')
        if (trimmed === 'video/*') return file.type.startsWith('video/')
        return file.type === trimmed
      })) {
        return 'File type not supported.'
      }
      return null
    },
    [accept, maxSizeMB]
  )

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
      setError(null)
      onFileSelect(file)
    },
    [validateFile, onFileSelect]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFile(files[0])
      }
    },
    [disabled, handleFile]
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setIsDragging(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  if (currentFile) {
    return (
      <motion.div
        className="relative overflow-hidden rounded-2xl border-2 border-sage-300 bg-sage-50 p-6"
        initial={reduce ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-sage-600">
            <FileImage className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{currentFile.name}</p>
            <p className="text-xs text-muted">
              {(currentFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          {onClearFile && (
            <button
              onClick={onClearFile}
              className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-sage-100 hover:text-ink"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all ${
        isDragging
          ? 'border-brand-400 bg-brand-50 shadow-glow-brand'
          : error
            ? 'border-danger-300 bg-danger-50'
            : 'border-line bg-white hover:border-brand-300 hover:bg-cream-50'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      whileHover={disabled || reduce ? undefined : { scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <label className="block cursor-pointer p-8">
        <input
          type="file"
          className="sr-only"
          accept={accept}
          onChange={handleFileInput}
          disabled={disabled}
        />
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <motion.div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
              isDragging
                ? 'bg-brand-100 text-brand-600'
                : error
                  ? 'bg-danger-100 text-danger-600'
                  : 'bg-cream-100 text-muted'
            }`}
            animate={
              isDragging && !reduce
                ? { y: [0, -8, 0] }
                : undefined
            }
            transition={
              isDragging
                ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
                : undefined
            }
          >
            <Upload className="h-8 w-8" />
          </motion.div>
          <div>
            <p className="text-sm font-semibold text-ink">
              {isDragging ? 'Drop to upload' : 'Drop file here or click to browse'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {accept.includes('image') && accept.includes('video')
                ? 'Images or videos'
                : accept.includes('image')
                  ? 'Images only'
                  : 'Videos only'}{' '}
              · Max {maxSizeMB}MB
            </p>
          </div>
        </div>
      </label>
      {error && (
        <motion.div
          className="border-t border-danger-200 bg-danger-100/50 px-4 py-2.5"
          initial={reduce ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-xs font-medium text-danger-700">{error}</p>
        </motion.div>
      )}
    </motion.div>
  )
}
