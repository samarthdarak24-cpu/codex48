import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Eye, RefreshCw, ScanEye } from 'lucide-react'
import { api, ApiError } from '@/services/api'
import { PageHeader } from '@/components/layout/Shell'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Table'
import { Skeleton } from '@/components/ui/Misc'
import { AnalysisPanel } from '@/components/visual/AnalysisPanel'
import { cn } from '@/lib/utils'
import type { AssetAnalysis } from '@/lib/types'

type AnalysisRow = AssetAnalysis & { submissionTitle?: string; submissionCode?: string }

const STATUS_TONE: Record<string, 'warn' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warn',
  processing: 'warn',
  complete: 'success',
  failed: 'danger',
}

export default function VisualReviewPage() {
  const [rows, setRows] = useState<AnalysisRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [filter, setFilter] = useState<'all' | 'pending' | 'complete' | 'failed'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setForbidden(false)
    api
      .listAnalyses(100)
      .then((list) => {
        if (cancelled) return
        setRows(list)
        setSelectedId((prev) => prev ?? list.find((r) => r.status === 'complete')?.id ?? list[0]?.id ?? null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 403) setForbidden(true)
        else setError(err instanceof Error ? err.message : 'Visual analyses could not be loaded.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [nonce])

  const visible = useMemo(
    () => (rows ?? []).filter((r) => (filter === 'all' ? true : r.status === filter)),
    [rows, filter],
  )
  const selected = useMemo(() => rows?.find((r) => r.id === selectedId) ?? null, [rows, selectedId])

  return (
    <>
      <PageHeader
        title="Visual Review"
        subtitle="Inspect OCR text, dominant colours, logo matches, layout and contrast findings from the VisualGuard pipeline. Overlays are rendered from real pixel coordinates."
        actions={
          <Button
            variant="outline"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => setNonce((n) => n + 1)}
          >
            Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
          {(['all', 'pending', 'complete', 'failed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
                filter === f ? 'bg-brand-50 text-brand-700' : 'text-muted hover:text-ink',
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-2xs text-muted">
          {rows?.length ?? 0} analysed asset(s) · select one to inspect the poster and findings.
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader title="Analysed assets" icon={<ScanEye className="h-3.5 w-3.5" />} dense />
          {loading && (
            <div className="space-y-2 p-3" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {!loading && forbidden && (
            <div className="px-4 py-10 text-center text-xs text-muted">Not available to your role.</div>
          )}
          {!loading && !forbidden && error && (
            <div className="px-4 py-10 text-center text-xs text-danger-600">{error}</div>
          )}
          {!loading && !forbidden && !error && visible.length === 0 && (
            <EmptyState icon={<Eye className="h-5 w-5" />} title="No visual analyses" description="Upload a poster as a creator to see it analysed here." />
          )}
          {!loading && !forbidden && !error && visible.length > 0 && (
            <ul className="max-h-[70vh] divide-line overflow-y-auto">
              {visible.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelectedId(r.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[#F9FBFF]',
                      r.id === selectedId && 'bg-brand-50/60',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {r.submissionTitle ?? r.submissionCode ?? r.id}
                      </span>
                      <span className="block truncate text-2xs text-muted">
                        {r.width && r.height ? `${r.width}×${r.height}` : 'no dimensions'} ·{' '}
                        {r.ocrText ? `${r.ocrText.length} chars OCR` : 'no OCR'}
                      </span>
                    </span>
                    <Badge tone={STATUS_TONE[r.status] ?? 'neutral'} size="sm">
                      {r.status}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div>
          {selected ? (
            <AnalysisPanel
              analysisId={selected.id}
              submissionId={selected.submissionId ?? undefined}
              imageUrl={null}
            />
          ) : (
            !loading && (
              <Card className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <p className="text-base font-semibold text-ink">Select an asset to inspect</p>
                <p className="mt-1 max-w-sm text-xs leading-[17px] text-muted">
                  Pick an analysed poster from the list to view its OCR blocks, logo matches and contrast findings with pixel-accurate overlays.
                </p>
              </Card>
            )
          )}
        </div>
      </div>
    </>
  )
}
