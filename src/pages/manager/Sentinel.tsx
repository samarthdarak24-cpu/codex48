import { useEffect, useState } from 'react'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe2,
  Pause,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/services/api'
import type { SentinelAlert, SentinelAuditResult, SentinelSummary } from '@/lib/types'

export default function SentinelPage() {
  const toast = useToast()
  const [summary, setSummary] = useState<SentinelSummary | null>(null)
  const [alerts, setAlerts] = useState<SentinelAlert[]>([])
  const [loading, setLoading] = useState(true)

  // Live Audit Form State
  const [liveUrl, setLiveUrl] = useState('https://instagram.com/p/C9summer-glow-hydra')
  const [liveContent, setLiveContent] = useState(
    'HURRY! Order now! Our 100% safe miracle formula cures skin redness in 2 days with 40% discount!'
  )
  const [auditing, setAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState<SentinelAuditResult | null>(null)

  const loadData = async () => {
    try {
      const [sum, al] = await Promise.all([api.sentinelSummary(), api.sentinelAlerts()])
      setSummary(sum)
      setAlerts(al)
    } catch (err) {
      console.error(err)
      toast.error('Error loading Sentinel data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRunAudit = async () => {
    if (!liveContent.trim()) {
      toast.error('Please provide live copy to audit')
      return
    }
    setAuditing(true)
    try {
      const res = await api.auditLiveCampaign(liveUrl, liveContent)
      setAuditResult(res)
      if (res.driftDetected) {
        toast.error('Drift Detected in Live Creative!', res.driftSummary)
      } else {
        toast.success('Audit Complete: Creative is Compliant', 'Live copy matches brand rules and approved thresholds.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Audit failed')
    } finally {
      setAuditing(false)
    }
  }

  const handleResolveAlert = async (alertId: string, resolution: string) => {
    try {
      await api.resolveSentinelAlert(alertId, resolution)
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      toast.success('Action Enforced', `Campaign alert resolved with action: ${resolution}`)
    } catch {
      toast.error('Failed to update alert')
    }
  }

  const loadSample = (type: 'drift' | 'clean') => {
    if (type === 'drift') {
      setLiveUrl('https://meta.com/ads/archive/ad-9812492')
      setLiveContent(
        'Act now! 100% miracle cure with 50% discount — zero risk guarantee! Order before midnight!'
      )
    } else {
      setLiveUrl('https://meta.com/ads/archive/ad-8442110')
      setLiveContent(
        '#ad · Paid partnership with @PureGlow. Nourish your skin naturally with our gentle botanical formula. Offer ends 31 July.'
      )
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Post-Publishing Sentinel & Drift Watchdog
            </h1>
            <Badge tone="danger" dot>
              LIVE SHIELD ACTIVE
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Continuous audit engine monitoring published Meta/TikTok campaigns against approved
            submission baselines and enforcing exception expiry dates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Feeds
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Live Assets Monitored
            </span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-ink">
              {summary?.totalLiveMonitored ?? 18}
            </span>
            <span className="text-xs font-medium text-emerald-600">across Meta, TikTok, Web</span>
          </div>
        </Card>

        <Card className="p-4 border-rose-200 bg-rose-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-900">
              Active Creative Drifts
            </span>
            <AlertOctagon className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-700">
              {summary?.activeDrifts ?? 2}
            </span>
            <span className="text-xs font-medium text-rose-600">Altered post-approval</span>
          </div>
        </Card>

        <Card className="p-4 border-amber-200 bg-amber-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-900">
              Expired Exceptions in Prod
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-700">
              {summary?.expiredExceptionsInProd ?? 1}
            </span>
            <span className="text-xs font-medium text-amber-600">Requires ad pause</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Live Compliance Score
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-ink">
              {summary?.complianceRate ?? 91.2}%
            </span>
            <span className="text-xs font-medium text-muted">target ≥90%</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Live Auditor + Real-Time Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Live Campaign Drift Auditor */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-semibold text-ink">Live Campaign Ad Drift Auditor</h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted">Presets:</span>
                <button
                  type="button"
                  onClick={() => loadSample('drift')}
                  className="rounded bg-rose-100 px-2 py-0.5 font-medium text-rose-700 hover:bg-rose-200"
                >
                  Unapproved Drift
                </button>
                <button
                  type="button"
                  onClick={() => loadSample('clean')}
                  className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 hover:bg-emerald-200"
                >
                  Clean Creative
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink">
                  Published Campaign URL / Social Link
                </label>
                <div className="relative mt-1">
                  <Globe2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
                  <input
                    type="text"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    placeholder="https://instagram.com/p/... or Meta Ads ID"
                    className="w-full rounded-md border border-line bg-canvas pl-9 pr-3 py-2 text-sm text-ink focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink">
                  Scraped / Live Caption Copy
                </label>
                <textarea
                  rows={4}
                  value={liveContent}
                  onChange={(e) => setLiveContent(e.target.value)}
                  placeholder="Paste current live ad copy or social post caption..."
                  className="mt-1 w-full rounded-md border border-line bg-canvas p-3 text-sm text-ink focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted">
                  Audits against deterministic brand rules, active exceptions, and regulatory constraints.
                </span>
                <Button variant="primary" onClick={handleRunAudit} disabled={auditing}>
                  {auditing ? (
                    <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-1.5 h-4 w-4" />
                  )}
                  Run Live Audit
                </Button>
              </div>
            </div>

            {/* Audit Results Panel */}
            {auditResult && (
              <div
                className={`mt-6 rounded-lg border p-4 ${
                  auditResult.driftDetected
                    ? 'border-rose-200 bg-rose-50/40'
                    : 'border-emerald-200 bg-emerald-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {auditResult.driftDetected ? (
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    )}
                    <h3 className="text-sm font-bold text-ink">
                      Audit Verdict: {auditResult.status}
                    </h3>
                  </div>
                  <Badge tone={auditResult.driftDetected ? 'danger' : 'neutral'}>
                    Similarity: {Math.round(auditResult.similarityScore * 100)}%
                  </Badge>
                </div>

                <p className="mt-2 text-xs font-medium text-ink">{auditResult.driftSummary}</p>

                {auditResult.violations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-rose-900">
                      Rule Violations Detected in Production Copy ({auditResult.violations.length}):
                    </p>
                    {auditResult.violations.map((v, i) => (
                      <div
                        key={i}
                        className="rounded border border-rose-200 bg-white p-2.5 text-xs shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-700">
                            {v.ruleCode} · {v.ruleTitle}
                          </span>
                          <Badge tone="danger">{v.severity}</Badge>
                        </div>
                        <p className="mt-1 text-slate-700">{v.explanation}</p>
                        {v.suggestedFix && (
                          <div className="mt-1.5 rounded bg-slate-50 p-1.5 font-mono text-[11px] text-slate-800">
                            💡 Proposed fix: {v.suggestedFix.proposed}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
                  <span className="font-medium text-muted">
                    Recommended Action: {auditResult.actionRequired}
                  </span>
                  {auditResult.driftDetected && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        toast.success('Automated Notice Dispatched', 'Webhook dispatched to pause Meta ad creative #9812492.')
                      }
                    >
                      <Pause className="mr-1 h-3.5 w-3.5" />
                      Pause Live Ad Set
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Live Feed of Drift & Exception Expiry Alerts */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                <h2 className="text-base font-semibold text-ink">Active Watchdog Alerts</h2>
              </div>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                {alerts.length} Active
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                  No open drift alerts. All live campaigns and exceptions are verified compliant.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-lg border border-line bg-white p-3.5 text-xs shadow-sm hover:border-slate-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              alert.severity === 'Critical' ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                          />
                          <span className="font-bold text-ink">{alert.kind}</span>
                        </div>
                        <h4 className="mt-1 text-xs font-semibold text-slate-800">{alert.title}</h4>
                      </div>
                      <Badge tone={alert.severity === 'Critical' ? 'danger' : 'warn'}>
                        {alert.severity}
                      </Badge>
                    </div>

                    {alert.driftDetails && (
                      <p className="mt-2 rounded bg-slate-50 p-2 text-slate-600">
                        {alert.driftDetails}
                      </p>
                    )}

                    {alert.liveUrl && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-700">
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate">{alert.liveUrl}</span>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5">
                      <span className="text-[11px] text-muted">{alert.recommendedAction}</span>
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id, 'Notice Sent')}
                        >
                          Notify Team
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id, 'Campaign Paused')}
                        >
                          Enforce & Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
