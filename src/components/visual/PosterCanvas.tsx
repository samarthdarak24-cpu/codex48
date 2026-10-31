import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ImageBox } from '@/lib/types'

export type PosterBoxTone = 'danger' | 'warn' | 'info'

export interface PosterBox {
  box: ImageBox
  tone: PosterBoxTone
  label?: string
  active?: boolean
}

interface PosterCanvasProps {
  imageUrl: string
  boxes: PosterBox[]
  onBoxClick?: (i: number) => void
  className?: string
}

const STROKE: Record<PosterBoxTone, string> = {
  danger: '#EF4444',
  warn: '#F0A32A',
  info: '#2F6FED',
}

const TONE_LABEL: Record<PosterBoxTone, string> = {
  danger: 'Violation',
  warn: 'Needs review',
  info: 'Detected region',
}

/**
 * Poster with an SVG overlay in the image's own pixel coordinate system.
 *
 * The SVG uses `viewBox="0 0 naturalWidth naturalHeight"` and the image is
 * rendered at its natural aspect ratio, so boxes stay aligned at any display
 * size (including mobile and after resize) without percentage maths.
 */
export function PosterCanvas({ imageUrl, boxes, onBoxClick, className }: PosterCanvasProps) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const [focused, setFocused] = useState<number | null>(null)

  useEffect(() => {
    setSize(null)
    setFailed(false)
    setFocused(null)
  }, [imageUrl])

  if (!imageUrl || failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-[#FBFDFF] px-4 py-10 text-center',
          className,
        )}
      >
        <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1F5FA] text-muted">
          <ImageOff className="h-4 w-4" />
        </span>
        <p className="text-xs font-semibold text-ink">
          {failed ? 'Poster could not be displayed' : 'No poster to display'}
        </p>
        <p className="mt-0.5 max-w-[240px] text-2xs leading-[15px] text-muted">
          {failed
            ? 'The stored file could not be loaded. The analysis results are still shown below.'
            : 'Upload a poster to see the detected regions overlaid on the image.'}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('relative w-full overflow-hidden rounded-lg border border-line bg-[#F1F5FA]', className)}>
      <img
        src={imageUrl}
        alt="Poster under review"
        className="block h-auto w-full"
        onLoad={(e) => {
          const img = e.currentTarget
          setSize({ width: img.naturalWidth, height: img.naturalHeight })
        }}
        onError={() => setFailed(true)}
      />

      {!size && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#F1F5FA]">
          <span className="text-2xs font-medium text-muted">Loading poster…</span>
        </div>
      )}

      {size && (
        <svg
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          role="group"
          aria-label="Detected poster regions"
        >
          {boxes.map((item, i) => {
            const { box, tone, label, active } = item
            const isFocused = focused === i
            const strokeWidth = active ? 3.2 : isFocused ? 2.6 : 1.6
            const fontSize = Math.max(12, size.width * 0.021)
            const labelY = Math.max(fontSize + 4, box.y - fontSize * 0.35)

            return (
              <g
                key={`${box.x}:${box.y}:${box.w}:${box.h}:${i}`}
                tabIndex={0}
                role="button"
                aria-label={
                  label
                    ? `${TONE_LABEL[tone]}: ${label}`
                    : `${TONE_LABEL[tone]} region ${i + 1}`
                }
                aria-pressed={Boolean(active)}
                onClick={() => onBoxClick?.(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onBoxClick?.(i)
                  }
                }}
                onFocus={() => setFocused(i)}
                onBlur={() => setFocused((prev) => (prev === i ? null : prev))}
                className="cursor-pointer outline-none"
              >
                <title>{label ?? TONE_LABEL[tone]}</title>
                <rect
                  x={box.x}
                  y={box.y}
                  width={Math.max(box.w, 1)}
                  height={Math.max(box.h, 1)}
                  rx={Math.max(2, size.width * 0.004)}
                  fill={STROKE[tone]}
                  fillOpacity={active ? 0.2 : isFocused ? 0.16 : 0.1}
                  stroke={STROKE[tone]}
                  strokeWidth={strokeWidth}
                  vectorEffect="non-scaling-stroke"
                  className={active ? 'animate-pulse' : undefined}
                />
                {label && (
                  <text
                    x={box.x}
                    y={labelY}
                    fontSize={fontSize}
                    fontWeight={600}
                    fill="#FFFFFF"
                    stroke="rgba(15,33,56,.65)"
                    strokeWidth={Math.max(2, size.width * 0.003)}
                    paintOrder="stroke"
                    style={{ pointerEvents: 'none' }}
                  >
                    {label.length > 46 ? `${label.slice(0, 46)}…` : label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
