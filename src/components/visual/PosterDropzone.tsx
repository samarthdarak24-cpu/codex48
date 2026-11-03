import { useId, useRef, useState } from 'react'
import { AlertCircle, ImagePlus, Upload } from 'lucide-react'
import { api, ApiError } from '@/services/api'
import { cn } from '@/lib/utils'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

export interface PosterUploadResult {
  analysisId: string
  submissionId: string
  status: string
}

function validateFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const typeOk = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(extension)
  if (!typeOk) return 'Use a PNG, JPG or WebP image.'
  if (file.size === 0) return 'That file is empty. Choose another image.'
  if (file.size > MAX_BYTES) {
    return `That file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is 10 MB.`
  }
  return null
}

export function PosterDropzone({
  onUploaded,
  submissionId,
  title,
  channel,
  brand,
  disabled,
}: {
  onUploaded: (result: PosterUploadResult) => void
  submissionId?: string
  title?: string
  channel?: string
  brand?: string
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const errorId = useId()
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  async function upload(file: File) {
    const problem = validateFile(file)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setUploading(true)
    setFileName(file.name)
    try {
      const result = await api.uploadPoster(file, { submissionId, title, channel, brand })
      onUploaded(result)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('You do not have permission to upload posters in this workspace.')
      } else {
        setError(err instanceof Error ? err.message : 'The poster could not be uploaded. Please try again.')
      }
    } finally {
      setUploading(false)
    }
  }

  function pick(list: FileList | null) {
    const file = list?.[0]
    if (file) void upload(file)
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled || uploading}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled && !uploading) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (disabled || uploading) return
          pick(e.dataTransfer.files)
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          dragOver ? 'border-brand-400 bg-brand-50/70' : 'border-line-strong bg-[#FBFDFF] hover:border-brand-200 hover:bg-brand-50/30',
          (disabled || uploading) && 'cursor-not-allowed opacity-70',
          error && 'border-danger-500 bg-danger-50/40',
        )}
      >
        <span
          className={cn(
            'mb-2 flex h-9 w-9 items-center justify-center rounded-lg',
            error ? 'bg-danger-50 text-danger-600' : 'bg-brand-50 text-brand-500',
          )}
        >
          {error ? <AlertCircle className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
        </span>
        <span className="text-xs font-semibold text-ink">
          {uploading ? 'Uploading poster…' : fileName ? `Replace ${fileName}` : 'Drop a poster here, or click to browse'}
        </span>
        <span className="mt-0.5 text-2xs text-muted">PNG, JPG or WebP · up to 10 MB</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          pick(e.target.files)
          e.target.value = ''
        }}
      />

      {uploading && (
        <div className="mt-2" role="status" aria-live="polite">
          <div className="h-1 w-full overflow-hidden rounded-full bg-[#F1ECE0]">
            <div className="shimmer h-full w-full rounded-full bg-brand-500" />
          </div>
          <p className="mt-1 flex items-center gap-1 text-2xs text-muted">
            <Upload className="h-3 w-3" />
            Uploading and queueing the visual analysis. This can take a few seconds.
          </p>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger-600">
          <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
