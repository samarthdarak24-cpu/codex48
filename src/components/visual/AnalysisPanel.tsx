import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Eye, EyeOff, RefreshCw, ShieldAlert } from 'lucide-react'
import { api, ApiError } from '@/services/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Misc'
import { PosterCanvas, type PosterBox } from '@/components/visual/PosterCanvas'
import { cn } from '@/lib/utils'
import type { AssetAnalysis } from '@/lib/types'

interface AnalysisPanelProps {
  analysisId: string
  submissionId?: string
  imageUrl?: string | null
  className?: string
}

function SummaryTile({
  label,
  value,
  sub,
  swatch,
}: {
  label: string
  value: string
  sub?: string
  swatch?: string | null
}) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-white px-2.5 py-2">
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.05em] text-muted">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
        {swatch && (
          <span
            className="h-3 w-3 shrink-0 rounded-full border border-line-strong"
            style={{ backgroundColor: swatch }}
            aria-hidden
          />
        )}
        <span className="truncate">{value}</span>
      </p>
      {sub && <p className="mt-0.5 truncate text-[9.5px] leading-[13px] text-muted">{sub}</p>}
    </div>
  )
}

function PanelShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-line bg-white', className)}>{children}</div>
}

/**
 * Polls the visual analysis until it leaves pending/processing, then renders a
 * summary strip plus the poster overlay. Polling is cancelled on unmount and
 * whenever the analysis reaches a terminal state.
 */
export function AnalysisPanel({ analysisId, submissionId, imageUrl, className }: AnalysisPanelProps) {
  const [activeId, setActiveId] = useState(analysisId)
  const [analysis, setAnalysis] = useState<AssetAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const [showTextBlocks, setShowTextBlocks] = useState(false)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [posterState, setPosterState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [activeBox, setActiveBox] = useState<number | null>(null)

  useEffect(() => {
    setActiveId(analysisId)
  }, [analysisId])

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    let inFlight = false

    setAnalysis(null)
    setLoading(true)
    setError(null)
    setForbidden(false)
    setActiveBox(null)

    async function tick() {
      if (inFlight) return
      inFlight = true
      try {
        const data = await api.analysis(activeId)
        if (cancelled) return
        setAnalysis(data)
        setLoading(false)
        setError(null)
        if (data.status === 'complete' || data.status === 'failed') {
          if (timer !== undefined) window.clearInterval(timer)
        }
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true)
          if (timer !== undefined) window.clearInterval(timer)
        } else {
          setError(err instanceof Error ? err.message : 'Could not load the poster analysis.')
          // A 404 will not recover by polling; network errors may, so keep trying.
          if (err instanceof ApiError && err.status === 404 && timer !== undefined) {
            window.clearInterval(timer)
          }
        }
        setLoading(false)
      } finally {
        inFlight = false
      }
    }

    timer = window.setInterval(() => {
      void tick()
    }, 2000)
    void tick()

    return () => {
      cancelled = true
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [activeId, nonce])

  // The stored poster is behind a bearer-protected endpoint, so it is loaded as
  // an object URL. The URL is revoked when the analysis changes or on unmount.
  useEffect(() => {
    if (imageUrl) {
      setPosterUrl(imageUrl)
      setPosterState('ready')
      return
    }
    const sid = analysis?.submissionId ?? submissionId
    if (!analysis || analysis.status !== 'complete' || !sid) {
      setPosterUrl(null)
      setPosterState('idle')
      return
    }
    let cancelled = false
    let created: string | null = null
    setPosterState('loading')
    api
      .fetchPosterBlobUrl(sid)
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        created = url
        setPosterUrl(url)
        setPosterState(url ? 'ready' : 'error')
      })
      .catch(() => {
        if (!cancelled) {
          setPosterUrl(null)
          setPosterState('error')
        }
      })
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [analysis, imageUrl, submissionId])

  const boxes = useMemo<PosterBox[]>(() => {
    if (!analysis || analysis.status !== 'complete') return []
    const out: PosterBox[] = []
    analysis.contrastFindings.forEach((cf) => {
      if (cf.status === 'pass') return
      out.push({
        box: cf.region,
        tone: cf.status === 'fail' ? 'danger' : 'warn',
        label: cf.check || cf.text,
      })
    })
    analysis.logoMatches.forEach((logo) => {
      out.push({ box: logo.box, tone: 'info', label: logo.name })
    })
    if (showTextBlocks) {
      analysis.textBlocks.forEach((block) => {
        out.push({ box: block.box, tone: 'info', label: block.text })
      })
    }
    return out
  }, [analysis, showTextBlocks])

  async function retry() {
    setRetrying(true)
    setError(null)
    try {
      if (analysis && analysis.status === 'failed') {
        const result = await api.rerunAnalysis(analysis.id)
        setActiveId(result.analysisId)
      }
      setNonce((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The analysis could not be restarted.')
    } finally {
      setRetrying(false)
    }
  }

  if (forbidden) {
    return (
      <PanelShell className={className}>
        <div className="flex items-start gap-2 p-4">
          <ShieldAlert className="mt-[1px] h-4 w-4 shrink-0 text-warn-600" />
          <div>
            <p className="text-xs font-semibold text-ink">Poster analysis is not available to you</p>
            <p className="mt-0.5 text-2xs leading-[15px] text-muted">
              Your role does not have permission to read visual analysis for this content. Nothing was checked here.
            </p>
          </div>
        </div>
      </PanelShell>
    )
  }

  if (loading && !analysis) {
    return (
      <PanelShell className={className}>
        <div className="space-y-3 p-3" aria-busy="true" aria-label="Loading poster analysis">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[54px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-44 w-full rounded-lg" />
          <p className="text-2xs text-muted">Reading the poster — text, logos and contrast checks are running.</p>
        </div>
      </PanelShell>
    )
  }

  if (!analysis) {
    return (
      <PanelShell className={className}>
        <div className="p-4">
          <p className="text-xs font-semibold text-ink">Analysis could not be loaded</p>
          <p role="alert" className="mt-0.5 text-2xs leading-[15px] text-danger-600">
            {error ?? 'The analysis record was not returned.'}
          </p>
          <Button
            size="xs"
            variant="outline"
            className="mt-2"
            loading={retrying}
            icon={<RefreshCw className="h-3 w-3" />}
            onClick={() => void retry()}
          >
            Retry
          </Button>
        </div>
      </PanelShell>
    )
  }

  if (analysis.status === 'failed') {
    return (
      <PanelShell className={className}>
        <div className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-danger-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            Visual analysis failed
          </p>
          <p role="alert" className="mt-1 text-2xs leading-[15px] text-muted">
            {error ?? analysis.error ?? 'The analyser did not return a result.'} No checks are reported as passing.
          </p>
          <Button
            size="xs"
            variant="outline"
            className="mt-2"
            loading={retrying}
            icon={<RefreshCw className="h-3 w-3" />}
            onClick={() => void retry()}
          >
            Retry analysis
          </Button>
        </div>
      </PanelShell>
    )
  }

  if (analysis.status === 'pending' || analysis.status === 'processing') {
    return (
      <PanelShell className={className}>
        <div className="space-y-3 p-3" aria-busy="true" aria-label="Poster analysis in progress">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[54px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-44 w-full rounded-lg" />
          <p className="text-2xs text-muted">
            {analysis.status === 'pending' ? 'Queued for analysis…' : 'Reading the poster…'} This panel refreshes
            every 2 seconds.
          </p>
          {error && (
            <p role="alert" className="text-2xs text-danger-600">
              {error} Retrying automatically.
            </p>
          )}
        </div>
      </PanelShell>
    )
  }

  const background = analysis.summary.background ?? analysis.dominantColors[0]?.hex ?? null
  const contrastSub =
    analysis.summary.contrastUnknown > 0
      ? `${analysis.summary.contrastUnknown} need human review`
      : 'No unknown checks'
  const posterSid = analysis.submissionId ?? submissionId
  const posterSkeleton = Boolean(posterSid) && posterState !== 'ready' && posterState !== 'error'

  return (
    <PanelShell className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink">Visual analysis</p>
          <p className="text-[9.5px] leading-[13px] text-muted">
            {analysis.width}×{analysis.height}px
            {analysis.completedAt ? ` · completed ${new Date(analysis.completedAt).toLocaleString()}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {analysis.unreadable ? (
            <Badge tone="warn" size="sm">
              Image could not be read
            </Badge>
          ) : (
            <Badge tone="brand" size="sm">
              Analysis complete
            </Badge>
          )}
          {analysis.textBlocks.length > 0 && (
            <Button
              size="xs"
              variant="ghost"
              aria-pressed={showTextBlocks}
              icon={showTextBlocks ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              onClick={() => setShowTextBlocks((v) => !v)}
            >
              {showTextBlocks ? 'Hide text regions' : 'Show text regions'}
            </Button>
          )}
        </div>
      </div>

      {analysis.unreadable && (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-warn-100 bg-warn-50 px-2.5 py-2">
          <ShieldAlert className="mt-[1px] h-3.5 w-3.5 shrink-0 text-warn-600" />
          <p className="text-2xs leading-[15px] text-warn-700">
            <span className="font-semibold">This image could not be read.</span> Text, logo and contrast checks could
            not be completed, so none of them passed. A human needs to review this poster — treat the result as
            unknown, not as a pass.
          </p>
        </div>
      )}

      {!analysis.unreadable && (
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryTile label="Text regions" value={String(analysis.summary.textRegions)} />
          <SummaryTile label="Logos found" value={String(analysis.summary.logos)} />
          <SummaryTile
            label="Contrast failures"
            value={String(analysis.summary.contrastFailures)}
            sub={contrastSub}
          />
          <SummaryTile
            label="Background"
            value={background ?? 'Not detected'}
            swatch={background}
          />
          <SummaryTile label="Aspect ratio" value={analysis.summary.aspectRatio || '—'} />
        </div>
      )}

      <div className="px-3 pb-3">
        {posterSkeleton ? (
          <Skeleton className="h-44 w-full rounded-lg" />
        ) : (
          <PosterCanvas
            imageUrl={posterUrl ?? ''}
            boxes={(analysis.unreadable ? [] : boxes).map((b, i) => ({ ...b, active: activeBox === i }))}
            onBoxClick={(i) => setActiveBox((prev) => (prev === i ? null : i))}
          />
        )}

        {posterState === 'error' && (
          <p className="mt-1.5 flex items-center gap-1 text-[9.5px] text-muted">
            <AlertTriangle className="h-2.5 w-2.5" />
            The poster file could not be loaded, but the measurements above come from the stored analysis.
          </p>
        )}

        {!analysis.unreadable && boxes.length === 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-[9.5px] text-success-700">
            <CheckCircle2 className="h-2.5 w-2.5" />
            No contrast failures, unknown checks or logo regions were detected.
          </p>
        )}

        {analysis.unreadable && (
          <p className="mt-1.5 text-[9.5px] leading-[13px] text-muted">
            Detected regions are not shown because the image could not be read. This is not a pass.
          </p>
        )}
      </div>
    </PanelShell>
  )
}
