import { useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'
import type { AssetRef } from '@/lib/types'

/** Shows the brand/product image attached to a submission. Protected files are
 * fetched with the bearer token and rendered from an object URL. */
export function AttachedAsset({ assetRef, className }: { assetRef?: AssetRef | null; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!assetRef) {
      setSrc(null)
      return
    }
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

  if (!assetRef) return null

  return (
    <div className={cn('flex items-center gap-2 rounded-lg border border-line bg-canvas/60 p-2', className)}>
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-canvas">
        {src ? (
          <img src={src} alt={assetRef.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <ImageIcon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-ink">{assetRef.name}</p>
        <p className="truncate text-[10px] text-muted">{assetRef.source || 'Attached asset'}</p>
      </div>
    </div>
  )
}
