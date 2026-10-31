import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  FileSearch,
  Gauge,
  RefreshCw,
  ScanEye,
  Server,
  ShieldCheck,
  Timer,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/Shell'
import { Card, MetricCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Misc'
import { ProgressBar } from '@/components/ui/Misc'
import { api } from '@/services/api'
import { cn, relative } from '@/lib/utils'
import type { AiTrustSummary, SystemHealth } from '@/lib/types'

const RANGES = [7, 30, 90] as const

export default function AiTrust() {
  const navigate = useNavigate()
  const [days, setDays] = useState<number>(30)
  const [trust, setTrust] = useState<AiTrustSummary | null>(null)
  const [trustError, setTrustError] = useState<string | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setTrustError(null)
    api
      .aiTrust(days)
      .then((result) => {
        if (!cancelled) setTrust(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setTrustError(err instanceof Error ? err.message : 'Trust figures could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [days, nonce])

  useEffect(() => {
    let cancelled = false
    setHealthError(null)
    api
      .health()
      .then((result) => {
        if (!cancelled) setHealth(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setHealthError(err instanceof Error ? err.message : 'System status unavailable.')
      })
    return () => {
      cancelled = true
    }
  }, [nonce])

  const pct = (value: number) => `${Math.round(value * 100)}%`
  const hasCalls = (trust?.totalCalls ?? 0) > 0
  const citationTotal = (trust?.citationsVerified ?? 0) + (trust?.citationsRejected ?? 0)

  return (
    <>
      <PageHeader
        title="AI Trust"
        subtitle="What the AI layer actually did — counted from stored call logs."
        actions={
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-lg border border-line bg-white p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setDays(r)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    days === r ? 'bg-brand-50 text-brand-700' : 'text-muted hover:text-ink',
                  )}
                >
                  {r}d
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setNonce((n) => n + 1)}>
              Refresh
            </Button>
          </div>
        }
      />

      {trustError && (
        <Card className="mb-4 flex items-start gap-2 border-danger-100 bg-danger-50/50 p-4">
          <AlertTriangle className="mt-[2px] h-4 w-4 shrink-0 text-danger-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger-700">{trustError}</p>
            <p className="text-xs text-danger-700/80">AI Trust is manager-only.</p>
          </div>
          <Button size="xs" variant="outline" onClick={() => setNonce((n) => n + 1)}>Retry</Button>
        </Card>
      )}

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="AI calls"
          value={loading ? '—' : String(trust?.totalCalls ?? 0)}
          sub={`Last ${days} days`}
          icon={<Bot className="h-4 w-4" />}
          tone="blue"
        />
        <MetricCard
          label="Succeeded"
          value={loading ? '—' : pct(trust?.successRate ?? 0)}
          sub={`${trust?.byStatus.success ?? 0} of ${trust?.totalCalls ?? 0}`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="green"
        />
        <MetricCard
          label="Citations verified"
          value={loading ? '—' : String(trust?.citationsVerified ?? 0)}
          sub="Exact match to stored passage"
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="purple"
        />
        <MetricCard
          label="Citations rejected"
          value={loading ? '—' : String(trust?.citationsRejected ?? 0)}
          sub={citationTotal ? `${pct(trust?.citationRejectionRate ?? 0)} of citations` : 'No citations yet'}
          icon={<XCircle className="h-4 w-4" />}
          tone="rose"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {/* Outcome + latency */}
          <Card>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-md font-semibold text-ink">
                <Activity className="h-4 w-4 text-brand-500" />
                Call outcomes
              </h2>
              {trust?.lastCallAt && <span className="text-2xs text-muted">Last call {relative(trust.lastCallAt)}</span>}
            </div>

            {loading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : !hasCalls ? (
              <div className="flex items-start gap-2.5 px-4 py-4">
                <span className="mt-[1px] flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                  <Bot className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">No AI calls in this window</p>
                  <p className="mt-0.5 text-xs leading-[17px] text-muted">
                    {trust?.model
                      ? 'Semantic review has not been run yet — deterministic checks do not depend on it.'
                      : 'No LLM is configured on this server. Deterministic review works without it.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {[
                  { key: 'success', label: 'Succeeded', value: trust?.byStatus.success ?? 0, tone: 'success' as const, icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
                  { key: 'timeout', label: 'Timed out', value: trust?.byStatus.timeout ?? 0, tone: 'warn' as const, icon: <Timer className="h-3.5 w-3.5" /> },
                  { key: 'error', label: 'Failed', value: trust?.byStatus.error ?? 0, tone: 'danger' as const, icon: <AlertTriangle className="h-3.5 w-3.5" /> },
                  { key: 'skipped', label: 'Skipped (not configured)', value: trust?.byStatus.skipped ?? 0, tone: 'brand' as const, icon: <Server className="h-3.5 w-3.5" /> },
                ].map((row) => {
                  const share = trust?.totalCalls ? row.value / trust.totalCalls : 0
                  return (
                    <div key={row.key} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-muted">{row.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm text-ink">{row.label}</p>
                          <p className="text-xs tabular-nums text-muted">
                            {row.value} · {pct(share)}
                          </p>
                        </div>
                        <ProgressBar value={share * 100} tone={row.tone} className="mt-1.5" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Purpose breakdown */}
          <Card>
            <div className="border-b border-line px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-md font-semibold text-ink">
                <FileSearch className="h-4 w-4 text-brand-500" />
                Calls by purpose
              </h2>
            </div>
            {loading ? (
              <div className="p-4"><Skeleton className="h-4 w-1/2" /></div>
            ) : !hasCalls ? (
              <p className="px-4 py-4 text-xs text-muted">Nothing recorded in this window.</p>
            ) : (
              <ul className="divide-line">
                {Object.entries(trust?.byPurpose ?? {}).map(([purpose, calls]) => (
                  <li key={purpose} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm capitalize text-ink-700">{purpose.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-medium tabular-nums text-ink">{calls}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Runtime + system status */}
        <div className="space-y-4">
          <Card>
            <div className="border-b border-line px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-md font-semibold text-ink">
                <Gauge className="h-4 w-4 text-brand-500" />
                Runtime
              </h2>
            </div>
            <dl className="divide-line">
              <Row label="Provider model" value={trust?.model || 'Not configured'} />
              <Row label="Prompt version" value={trust?.promptVersion || '—'} />
              <Row
                label="Retrieval"
                value={trust?.retrievalMethod === 'hybrid' ? 'Hybrid BM25 + vector' : 'BM25 only'}
              />
              <Row label="Embedding model" value={trust?.embeddingModel || 'Not available'} />
              <Row label="Avg latency" value={trust?.avgLatencyMs ? `${trust.avgLatencyMs} ms` : '—'} />
              <Row label="Tokens in / out" value={`${trust?.tokensIn ?? 0} / ${trust?.tokensOut ?? 0}`} />
              <Row label="Redactions" value={String(trust?.redactionCount ?? 0)} />
            </dl>
          </Card>

          <Card>
            <div className="border-b border-line px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-md font-semibold text-ink">
                <Database className="h-4 w-4 text-brand-500" />
                System status
              </h2>
            </div>
            {healthError ? (
              <p className="px-4 py-3 text-xs text-danger-700">{healthError}</p>
            ) : !health ? (
              <div className="space-y-2 p-4"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
            ) : (
              <ul className="divide-line">
                <StatusRow label="Database" ok={health.database.ok} detail={health.database.driver} />
                <StatusRow label="File storage" ok={health.storage.ok} detail={health.storage.writable ? 'writable' : undefined} />
                <StatusRow label="OCR" ok={health.ocr.ok} detail={health.ocr.engine} />
                <StatusRow label="Embeddings" ok={health.embeddings.ok} detail={health.embeddings.model || health.embeddings.error || undefined} />
                <StatusRow label="LLM" ok={health.llm.configured} detail={health.llm.configured ? health.llm.model ?? '' : 'not configured'} neutral={!health.llm.configured} />
                <StatusRow label="Daily scan" ok={health.scheduler.running} detail={health.scheduler.cron} neutral={!health.scheduler.running} />
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <p className="flex items-start gap-2 text-2xs leading-[16px] text-muted">
              <Eye className="mt-[1px] h-3.5 w-3.5 shrink-0 text-brand-400" />
              AI output is advisory. It never approves content, activates rules or changes a deterministic verdict.
            </p>
            <Button variant="ghost" size="sm" block className="mt-2" icon={<ScanEye className="h-3.5 w-3.5" />} onClick={() => navigate('/manager/queue')}>
              Go to review queue
            </Button>
          </Card>
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="max-w-[62%] truncate text-right text-xs font-medium text-ink" title={value}>{value}</dd>
    </div>
  )
}

function StatusRow({
  label,
  ok,
  detail,
  neutral,
}: {
  label: string
  ok: boolean
  detail?: string
  neutral?: boolean
}) {
  const tone = neutral ? 'muted' : ok ? 'success' : 'danger'
  return (
    <li className="flex items-center gap-2.5 px-4 py-2.5">
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          tone === 'success' && 'bg-success-500',
          tone === 'danger' && 'bg-danger-500',
          tone === 'muted' && 'bg-[#C9C2B0]',
        )}
      />
      <span className="text-xs text-ink-700">{label}</span>
      <span className="ml-auto max-w-[55%] truncate text-2xs text-muted" title={detail}>{detail}</span>
      {!neutral && (
        <Badge tone={ok ? 'success' : 'danger'} size="sm" dot={false}>
          {ok ? 'OK' : 'Down'}
        </Badge>
      )}
      {neutral && <Badge tone="neutral" size="sm" dot={false}>Off</Badge>}
    </li>
  )
}
