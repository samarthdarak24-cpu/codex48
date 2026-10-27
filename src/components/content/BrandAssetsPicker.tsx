import { useEffect, useRef, useState } from 'react'
import { Check, Search, Upload, X } from 'lucide-react'
import { api } from '@/services/api'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import type { BrandAsset } from '@/lib/types'

type ResearchResult = {
  id?: string
  name?: string
  title?: string
  url?: string
  thumbnail?: string
  source?: string
  attribution?: string
  user?: string
}

/**
 * Brand & Product Assets — search the configured external source, browse the
 * approved library, upload an image, and attach one to the submission.
 * Protected files are fetched with the bearer token and shown as blob URLs.
 */
export function BrandAssetsPicker({
  brand,
  selectedId,
  onSelect,
}: {
  brand: string
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const toast = useToast()
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [assetBrand, setAssetBrand] = useState(brand)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [research, setResearch] = useState<{ configured: boolean; results: ResearchResult[] } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [blobs, setBlobs] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .assets()
      .then((list) => {
        if (!cancelled) setAssets(list)
      })
      .catch((e: unknown) => {
        if (!cancelled) toast.error('Could not load assets', e instanceof Error ? e.message : 'Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    assets.forEach((a) => {
      if (a.source === 'upload' && !blobs[a.id]) {
        api.fetchAssetBlobUrl(a.id).then((url) => {
          if (url && !cancelled) setBlobs((prev) => ({ ...prev, [a.id]: url }))
        })
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets])

  // Follow the content's brand by default; the user can still pick another
  // brand for the image they upload.
  useEffect(() => {
    setAssetBrand(brand)
  }, [brand])

  const visibleAssets = assets.filter((a) => a.brand === assetBrand || a.brand === 'All brands')

  async function onSearch() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const r = await api.researchAssets(query.trim(), brand)
      setResearch({ configured: r.configured, results: (r.results ?? []) as ResearchResult[] })
    } catch (e) {
      toast.error('Search failed', e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setSearching(false)
    }
  }

  async function onUpload(file: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const created = await api.uploadAsset(
        file,
        file.name.replace(/\.[^.]+$/, ''),
        assetBrand,
        'Product Image',
        `Uploaded from New Content (${assetBrand})`,
      )
      setAssets((prev) => [created, ...prev])
      onSelect(created.id)
      toast.success('Image uploaded', 'Attached to this submission as a draft asset.')
    } catch (e) {
      toast.error('Upload failed', e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const selected = assets.find((a) => a.id === selectedId) || null
  const preview = (a: BrandAsset) => blobs[a.id] || (a.url && a.url.startsWith('http') ? a.url : null)

  return (
    <Card>
      <CardHeader
        title="Brand & Product Assets"
        dense
        action={<span className="text-2xs text-muted">{visibleAssets.length} in library</span>}
      />
      <div className="space-y-3 p-3">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product or brand…"
            className="h-8 text-xs"
            aria-label="Search product or brand images"
          />
          <Button size="sm" variant="outline" loading={searching} onClick={onSearch} icon={<Search className="h-3.5 w-3.5" />}>
            Search
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Brand</span>
          <Select
            value={assetBrand}
            onChange={(e) => setAssetBrand(e.target.value)}
            className="h-8 w-auto min-w-[128px] py-0 text-xs"
            aria-label="Brand for the uploaded image"
          >
            <option value="PureGlow">PureGlow</option>
            <option value="WellnessLife">WellnessLife</option>
          </Select>
          <span className="ml-auto text-right text-2xs leading-[13px] text-muted">
            Images you upload are saved under this brand.
          </span>
        </div>

        {research && !research.configured && (
          <p className="rounded-lg border border-warn-100 bg-warn-50 px-2.5 py-2 text-2xs leading-[15px] text-warn-700">
            External image search isn’t configured on this server. You can still upload an approved image below.
          </p>
        )}
        {research && research.configured && research.results.length === 0 && (
          <p className="text-2xs text-muted">No results for “{query}”.</p>
        )}
        {research && research.results.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {research.results.slice(0, 6).map((r, i) => {
              const src = r.thumbnail || r.url
              return (
                <div key={r.id || i} className="overflow-hidden rounded-lg border border-line">
                  <div className="aspect-square bg-canvas">
                    {src ? <img src={src} alt={r.name || r.title || 'result'} className="h-full w-full object-cover" /> : null}
                  </div>
                  <p className="truncate px-1.5 py-1 text-[10px] text-ink">{r.name || r.title || 'Untitled'}</p>
                  <p className="truncate px-1.5 pb-1 text-[9px] text-muted">{r.source || r.user || ''}</p>
                </div>
              )
            })}
          </div>
        )}

        <div className="border-t border-line pt-3">
          <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Approved library</p>
          {loading && <p className="text-2xs text-muted">Loading…</p>}
          {!loading && visibleAssets.length === 0 && (
            <p className="text-2xs text-muted">No {assetBrand} assets yet. Upload one to get started.</p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {visibleAssets.map((a) => {
              const src = preview(a)
              const active = a.id === selectedId
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelect(active ? null : a.id)}
                  className={cn(
                    'group relative overflow-hidden rounded-lg border text-left',
                    active ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-line hover:border-brand-300',
                  )}
                >
                  <div className="aspect-square bg-canvas">
                    {src ? (
                      <img src={src} alt={a.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted">No preview</div>
                    )}
                  </div>
                  <span className="absolute left-1 top-1 rounded bg-white/85 px-1 text-[8px] font-medium text-ink-700">
                    {a.brand}
                  </span>
                  {active && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                  <p className="truncate px-1.5 py-1 text-[10px] text-ink">{a.name}</p>
                </button>
              )
            })}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
        />
        <Button
          size="sm"
          variant="outline"
          block
          loading={uploading}
          onClick={() => fileRef.current?.click()}
          icon={<Upload className="h-3.5 w-3.5" />}
        >
          Upload image
        </Button>

        {selected && (
          <div className="rounded-lg border border-line bg-canvas/60 p-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 overflow-hidden rounded-md bg-canvas">
                {preview(selected) ? (
                  <img src={preview(selected) as string} alt={selected.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink">{selected.name}</p>
                <p className="truncate text-[10px] text-muted">
                  {selected.source} · {selected.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="text-muted transition-colors hover:text-ink"
                aria-label="Remove selected asset"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-[10px] leading-[14px] text-muted">
              Attached to this submission. A brand manager can approve the asset during review.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
