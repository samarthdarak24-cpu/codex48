import { useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { api } from '@/services/api'
import { Thumb } from '@/components/ui/Misc'
import { cn } from '@/lib/utils'
import type { AssetRef, ThumbSpec } from '@/lib/types'

/**
 * Thumbnail used in content list rows.
 *
 * When the submission has an image attached (assetRef), this shows that image
 * as the row's reference — fetched with the bearer token and rendered from an
 * object URL — instead of the deterministic generated glyph. When nothing is
 * attached it falls back to <Thumb>, so existing rows look unchanged.
 */
export function ContentThumb({
  thumb,
  assetRef,
  size = 30,
  className,
}: {
  thumb: ThumbSpec
  assetRef?: AssetRef | null
  size?: number
  className?: string
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setSrc(null)
    if (!assetRef) return
    if (assetRef.url && assetRef.url.startsWith('http')) {
      setSrc(assetRef.url)
      return
    }
    api.fetchAssetBlobUrl(assetRef.id).then((u) => {
      if (u && !cancelled) setSrc(u)
    })
    return () => {
      cancelled = true
    }
  }, [assetRef])

  if (!assetRef) return <Thumb spec={thumb} size={size} className={className} />

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-canvas ring-1 ring-black/[0.06]',
        className,
      )}
      style={{ width: size, height: size }}
      title={assetRef.name}
      aria-label={`Attached image: ${assetRef.name}`}
    >
      {src ? (
        <img src={src} alt={assetRef.name} className="h-full w-full object-cover" />
      ) : (
        <ImageIcon className="h-3.5 w-3.5 text-muted" aria-hidden />
      )}
      <span
        className="pointer-events-none absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-brand-500 ring-1 ring-white"
        aria-hidden
      />
    </span>
  )
}
