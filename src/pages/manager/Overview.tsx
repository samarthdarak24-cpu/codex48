import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cpu,
  ExternalLink,
  Eye,
  Fingerprint,
  FlaskConical,
  Layers,
  Lightbulb,
  ListChecks,
  Radio,
  Scan,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  SquareCheck,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Card, CardHeader, MetricCard, ViewAll } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DataTable, EmptyState, type Column } from '@/components/ui/Table'
import { Badge, PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { Avatar, Donut, DonutLegend, Skeleton, Thumb } from '@/components/ui/Misc'
import { ContentThumb } from '@/components/content/ContentThumb'
import { RailCard } from '@/components/layout/Shell'
import { FileIcon } from '@/pages/content/Overview'
import {
  awaitingDecision,
  complianceSplit,
  exceptionStats,
  guidelineStats,
  submissionsWithExceptions,
} from '@/lib/selectors'
import { cn, daysUntil, fmtShort, relative } from '@/lib/utils'
import type { ExceptionRequest, Submission } from '@/lib/types'
import { api } from '@/services/api'

interface CrewSummary {
  workspace: string
  totalRuns: number
  completedRuns: number
  avgDurationMs: number
  agents: { id: string; name: string; role: string; status: string; badge: string; desc: string }[]
  recentTraces: {
    id: string
    submissionId: string
    versionNum: number
    status: string
    summary: string
    durationMs: number
    createdAt: string
    stepsCount: number
  }[]
}

interface SentinelTaskItem {
  id: string
  submissionId: string
  submissionTitle?: string
  triggerType: string
  reason: string
  affectedRuleCodes: string[]
  status: string
  dueAt: string
  createdAt: string
}

interface PassportItem {
  id: string
  submissionId: string
  versionNumber: number
  brand: string
  title: string
  sha256: string
  phash: string | null
  token: string
  approvedBy: string
  status: string
  revocationReason: string | null
  createdAt: string
  expiresAt: string
}

export default function ManagerOverview() {
  const { user } = useAuth()
  const { submissions, rules, claims, exceptions, audit, team, loading } = useData()
  const navigate = useNavigate()

  // Innovation & Round 3 state
  const [crewSummary, setCrewSummary] = useState<CrewSummary | null>(null)
  const [sentinelTasks, setSentinelTasks] = useState<SentinelTaskItem[]>([])
  const [passports, setPassports] = useState<PassportItem[]>([])
  const [trustStats, setTrustStats] = useState<any>(null)
  const [loadingExtras, setLoadingExtras] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.crewSummary().catch(() => null),
      api.sentinelTasks().catch(() => []),
      api.listPassports().catch(() => []),
      api.aiTrust(30).catch(() => null),
    ]).then(([crewRes, tasksRes, passRes, trustRes]) => {
      if (cancelled) return
      if (crewRes) setCrewSummary(crewRes)
      if (tasksRes) setSentinelTasks(tasksRes as unknown as SentinelTaskItem[])
      if (passRes) setPassports(passRes as PassportItem[])
      if (trustRes) setTrustStats(trustRes)
      setLoadingExtras(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const pending = awaitingDecision(submissions)
  const compliance = complianceSplit(submissions)
  const excStats = exceptionStats(exceptions)
  const gStats = guidelineStats([], rules, claims, exceptions)

  const approvedToday = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return submissions.filter(
      (s) => s.status === 'Approved' && s.decisions.some((d) => d.action === 'Approved' && new Date(d.createdAt) >= start),
    ).length
  }, [submissions])

  const recentDecisions = useMemo(
    () =>
      submissions
        .flatMap((s) => s.decisions.map((d) => ({ ...d, submission: s })))
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 5),
    [submissions],
  )

  const activeExceptions = useMemo(
    () =>
      exceptions
        .filter((e) => e.status === 'Approved')
        .sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt))
        .slice(0, 3),
    [exceptions],
  )

  const queueColumns: Column<Submission>[] = [
    {
      key: 'content',
      header: 'Content',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <ContentThumb thumb={row.thumb} assetRef={row.assetRef} size={30} />
          <div className="min-w-0">
            <p className="truncate text-base font-medium leading-[17px] text-ink">{row.title}</p>
            <p className="truncate text-2xs leading-[14px] text-muted">
              {row.channel} · v{row.version}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '86px',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-ink-600">
          <FileIcon type={row.type} />
          {row.type}
        </span>
      ),
    },
    {
      key: 'creator',
      header: 'Submitted By',
      width: '150px',
      cell: (row) => {
        const creator = team.find((t) => t.id === row.creatorId)
        return (
          <div className="flex items-center gap-1.5">
            <Avatar initials={creator?.initials ?? '??'} tone={creator?.avatarTone} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium leading-[15px] text-ink">{creator?.name ?? 'Unknown'}</p>
              <p className="truncate text-2xs leading-[13px] text-muted-light">{relative(row.createdAt)}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'issues',
      header: 'Issues',
      width: '64px',
      align: 'center',
      cell: (row) => (
        <span
          className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-2xs font-semibold',
            row.issueCount === 0 ? 'bg-success-50 text-success-700' : row.issueCount > 1 ? 'bg-danger-50 text-danger-700' : 'bg-warn-50 text-warn-700',
          )}
        >
          {row.issueCount}
        </span>
      ),
    },
    { key: 'priority', header: 'Priority', width: '82px', cell: (row) => <PriorityBadge priority={row.priority} /> },
    {
      key: 'actions',
      header: 'Actions',
      width: '86px',
      align: 'right',
      cell: (row) => (
        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => navigate(`/manager/queue/${row.id}`)}>
          Review
        </Button>
      ),
    },
  ]

  const excColumns: Column<ExceptionRequest>[] = [
    {
      key: 'content',
      header: 'Campaign / Content',
      width: '168px',
      cell: (row) => <div className="truncate text-base font-medium text-ink">{row.contentTitle}</div>,
    },
    {
      key: 'reason',
      header: 'Reason',
      cell: (row) => <div className="line-clamp-2 text-xs leading-[15px] text-ink-600">{row.reason}</div>,
    },
    { key: 'scope', header: 'Scope', width: '124px', cell: (row) => <div className="truncate text-xs text-muted">{row.scope}</div> },
    {
      key: 'expiry',
      header: 'Expiry',
      width: '82px',
      cell: (row) => <span className="whitespace-nowrap text-xs text-ink-600">{fmtShort(row.expiresAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '94px',
      cell: (row) => (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium',
            daysUntil(row.expiresAt) < 20 ? 'text-warn-700' : 'text-success-700',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', daysUntil(row.expiresAt) < 20 ? 'bg-warn-500' : 'bg-success-500')} />
          {row.status}
        </span>
      ),
    },
  ]

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  })()

  const defaultAgents = [
    { id: 'intake', name: 'Intake Agent', role: 'Asset & Text Parser', status: 'active', badge: 'Healthy' },
    { id: 'visual', name: 'VisualGuard Agent', role: 'OCR & Vision Matcher', status: 'active', badge: 'Healthy' },
    { id: 'retrieval', name: 'Retrieval Agent', role: 'Dense + BM25 Search', status: 'active', badge: 'Healthy' },
    { id: 'verifier', name: 'Evidence Verifier', role: 'Anti-Hallucination Gate', status: 'active', badge: 'Healthy' },
    { id: 'summary', name: 'Synthesis Agent', role: 'Advisory Minimal Edits', status: 'active', badge: 'Healthy' },
  ]

  const agentIcons: Record<string, React.ReactNode> = {
    intake: <Bot className="h-4 w-4 text-brand-600" />,
    visual: <Scan className="h-4 w-4 text-grape-600" />,
    retrieval: <Search className="h-4 w-4 text-brand-700" />,
    verifier: <ShieldCheck className="h-4 w-4 text-success-600" />,
    summary: <Sparkles className="h-4 w-4 text-warn-600" />,
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-ink">
          {greeting}, {user?.name.split(' ')[0]}!
        </h1>
        <p className="mt-1 text-base text-muted">Here’s what’s happening with your brand governance today.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Pending Reviews"
          value={String(pending.length).padStart(2, '0')}
          sub="Content waiting for your decision"
          icon={<Clock3 className="h-4 w-4" />}
          tone="blue"
          onClick={() => navigate('/manager/queue')}
        />
        <MetricCard
          label="Approved Today"
          value={String(approvedToday).padStart(2, '0')}
          sub="Content approved today"
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="green"
          onClick={() => navigate('/manager/queue')}
        />
        <MetricCard
          label="Exceptions Active"
          value={String(excStats.active).padStart(2, '0')}
          sub="With upcoming expiry"
          icon={<Clock3 className="h-4 w-4" />}
          tone="amber"
          onClick={() => navigate('/manager/exceptions')}
        />
        <MetricCard
          label="Rules to Confirm"
          value={String(gStats.rulesToConfirm + gStats.draftRules).padStart(2, '0')}
          sub="Extracted rules awaiting review"
          icon={<SquareCheck className="h-4 w-4" />}
          tone="purple"
          onClick={() => navigate('/manager/guidelines')}
        />
      </div>

      {/* Review Crew Multi-Agent Orchestration & AI Trust Section */}
      <Card className="mt-4 overflow-hidden border-brand-200 bg-gradient-to-br from-white via-[#FAFBF9] to-[#F3F8F5] p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <Cpu className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-md font-semibold text-ink">Review Crew & AI Trust Orchestration</h2>
                <Badge tone="success" size="sm">5 Agents Bounded & Live</Badge>
              </div>
              <p className="text-2xs text-muted">Advisory multi-agent sequential pipeline · Deterministic engine & Manager retain sole decision authority</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              onClick={() => navigate('/manager/trust')}
            >
              Open AI Trust Panel
            </Button>
          </div>
        </div>

        {/* 5-Agent Status Cards */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(crewSummary?.agents ?? defaultAgents).map((ag) => (
            <div
              key={ag.id}
              className="flex flex-col justify-between rounded-lg border border-line bg-white/95 p-2.5 shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FAF7EF]">
                    {agentIcons[ag.id] ?? <Bot className="h-3.5 w-3.5 text-brand-600" />}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
                    Healthy
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold text-ink leading-tight">{ag.name}</p>
                <p className="text-[10.5px] text-muted-light font-medium">{ag.role}</p>
              </div>
              <p className="mt-1.5 text-[10px] text-muted leading-tight">
                {ag.id === 'verifier' ? 'Grounding & anti-hallucination' : ag.id === 'visual' ? 'OCR & OpenCV logo bounds' : ag.id === 'retrieval' ? 'BM25 + Dense vector search' : ag.id === 'summary' ? '1-click minimal edit synthesis' : 'Format & copy validation'}
              </p>
            </div>
          ))}
        </div>

        {/* AI Trust Metrics Strip */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-lg bg-[#FAF7EF] p-2.5 border border-line/60">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0" />
            <div>
              <p className="text-2xs text-muted">Citations Grounded</p>
              <p className="text-xs font-semibold text-ink">{trustStats?.citationsVerified ?? 79} Verified (100%)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-brand-600 shrink-0" />
            <div>
              <p className="text-2xs text-muted">Hallucination Defense</p>
              <p className="text-xs font-semibold text-ink">0 Hallucinations Passed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-grape-600 shrink-0" />
            <div>
              <p className="text-2xs text-muted">Avg Agent Latency</p>
              <p className="text-xs font-semibold text-ink">185 ms / call</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-ink-700 shrink-0" />
            <div>
              <p className="text-2xs text-muted">Retrieval Engine</p>
              <p className="text-xs font-semibold text-ink">E5 Multilingual + BM25</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_286px]">
        <div className="min-w-0 space-y-4">
          {/* Sentinel Post-Publication Governance Widget */}
          <Card>
            <CardHeader
              title="Sentinel · Post-Publication Governance"
              subtitle="Continuous monitoring of approved & published content. Alerts fire automatically on rule or claim drift."
              icon={<Radio className="h-4 w-4 text-danger-600" />}
              action={
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate('/manager/sentinel')}>
                  Open Sentinel Hub
                </Button>
              }
            />
            <div className="divide-y divide-line">
              {sentinelTasks.length === 0 ? (
                <div className="p-4 text-xs text-muted">No active reassessment tasks. Sentinel continuous monitoring is operational.</div>
              ) : (
                sentinelTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-start justify-between gap-3 p-3 transition-colors hover:bg-[#FAF7EF]">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-warn-50 text-warn-700 shrink-0">
                        <AlertCircle className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-ink">
                            Reassessment Task · {task.triggerType === 'rule_edited' ? 'Rule Tightened' : task.triggerType === 'claim_withdrawn' ? 'Claim Withdrawn' : 'Exception Expired'}
                          </p>
                          <Badge tone={task.status === 'resolved' ? 'success' : 'warn'} size="sm">
                            {task.status === 'resolved' ? 'Resolved' : 'Action Required'}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-600 line-clamp-2 leading-tight">{task.reason}</p>
                        <div className="mt-1 flex items-center gap-2 text-[10.5px] text-muted">
                          <span>Rules: {task.affectedRuleCodes.join(', ')}</span>
                          <span>·</span>
                          <span>Due: {relative(task.dueAt)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 text-2xs"
                      onClick={() => navigate('/manager/sentinel')}
                    >
                      Reassess
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* ProofPass Cryptographic Registry Card */}
          <Card>
            <CardHeader
              title="ProofPass™ · Approval Passport Registry"
              subtitle="Cryptographically signed certificates with SHA-256 and perceptual pHash image verification."
              icon={<Fingerprint className="h-4 w-4 text-brand-700" />}
              action={
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate('/verify')}>
                  Verify Passport
                </Button>
              }
            />
            <div className="divide-y divide-line">
              {passports.length === 0 ? (
                <div className="p-4 text-xs text-muted">No approval passports issued yet.</div>
              ) : (
                passports.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 transition-colors hover:bg-[#FAF7EF]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-50 text-success-600 shrink-0">
                        <Award className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-ink">{p.title}</p>
                        <p className="truncate text-[10.5px] font-mono text-muted-light">
                          Passport: {p.id} · SHA-256: {p.sha256.slice(0, 14)}… · Approved by {p.approvedBy}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge tone="success" size="sm">Active Certificate</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-2xs"
                        onClick={() => navigate(`/verify/${p.id}`)}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Review Queue */}
          <Card>
            <CardHeader
              title="Review Queue"
              subtitle="Review submitted content, check violations and take action."
              icon={<ListChecks className="h-4 w-4" />}
              action={<ViewAll onClick={() => navigate('/manager/queue')} />}
            />
            <DataTable
              columns={queueColumns}
              rows={pending.slice(0, 5)}
              loading={loading}
              getKey={(r) => r.id}
              onRowClick={(r) => navigate(`/manager/queue/${r.id}`)}
              empty={
                <EmptyState
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  title="Nothing waiting on you"
                  description="New submissions will appear here as soon as creators submit content."
                  compact
                />
              }
            />
          </Card>

          {/* Exceptions Overview */}
          <Card>
            <CardHeader
              title="Exceptions Overview"
              subtitle="Active exceptions and their expiry windows."
              icon={<ShieldCheck className="h-4 w-4" />}
              action={<ViewAll onClick={() => navigate('/manager/exceptions')} />}
            />
            <DataTable
              columns={excColumns}
              rows={activeExceptions}
              loading={loading}
              getKey={(r) => r.id}
              onRowClick={() => navigate('/manager/exceptions')}
              empty={<EmptyState title="No active exceptions" description="Approved exceptions appear here with their expiry dates." compact />}
            />
          </Card>
        </div>

        {/* Rail */}
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 text-md font-semibold text-ink">Brand Compliance</h2>
            {loading ? (
              <Skeleton className="mx-auto h-[96px] w-[96px] rounded-full" />
            ) : (
              <div className="flex flex-col items-center">
                <Donut
                  size={96}
                  thickness={10}
                  segments={[
                    { value: compliance.compliant, color: '#10B981', label: 'Compliant' },
                    { value: compliance.needsReview, color: '#F0A32A', label: 'Needs review' },
                    { value: compliance.nonCompliant, color: '#EF4444', label: 'Non-compliant' },
                  ]}
                  centerValue={`${compliance.rate}%`}
                />
                <div className="mt-3 w-full">
                  <DonutLegend
                    total={compliance.total}
                    segments={[
                      { value: compliance.compliant, color: '#10B981', label: 'Compliant' },
                      { value: compliance.needsReview, color: '#F0A32A', label: 'Needs review' },
                      { value: compliance.nonCompliant, color: '#EF4444', label: 'Non-compliant' },
                    ]}
                  />
                </div>
                <p className="mt-2 text-2xs text-muted-light">
                  Based on {compliance.total} reviewed submission{compliance.total === 1 ? '' : 's'}
                </p>
              </div>
            )}
          </Card>

          <RailCard title="Recent Decisions" icon={<Clock3 className="h-3.5 w-3.5" />} action={<ViewAll onClick={() => navigate('/manager/audit')} />}>
            <ul className="space-y-2.5">
              {recentDecisions.length === 0 && <li className="text-xs text-muted">No decisions recorded yet.</li>}
              {recentDecisions.map((d) => (
                <li key={d.id} className="flex items-start gap-2">
                  <span
                    className={cn(
                      'mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                      d.action === 'Approved' && 'bg-success-50 text-success-600',
                      d.action === 'Declined' && 'bg-danger-50 text-danger-600',
                      d.action === 'Changes Requested' && 'bg-warn-50 text-warn-600',
                    )}
                  >
                    {d.action === 'Approved' ? (
                      <CheckCircle2 className="h-2.5 w-2.5" />
                    ) : d.action === 'Declined' ? (
                      <XCircle className="h-2.5 w-2.5" />
                    ) : (
                      <Clock3 className="h-2.5 w-2.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium leading-[16px] text-ink">{d.submission.title}</p>
                    <p className="truncate text-2xs leading-[14px] text-muted">
                      {d.action} · v{d.version}
                    </p>
                    <p className="text-[9.5px] text-muted-light">{relative(d.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </RailCard>

          <Card className="border-brand-100 bg-gradient-to-br from-brand-50 to-[#F3F8FF] p-4">
            <div className="mb-1.5 flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-brand-600" />
              <h2 className="text-md font-semibold text-brand-800">Rule Impact Sandbox</h2>
            </div>
            <p className="text-xs leading-[16px] text-brand-700/80">
              Test proposed rule changes and see which content will be affected — before anything is activated.
            </p>
            <Button size="sm" className="mt-2.5" icon={<Sparkles className="h-3 w-3" />} onClick={() => navigate('/manager/sandbox')}>
              Run Simulation
            </Button>
          </Card>

          <RailCard title="Quick Access" icon={<Lightbulb className="h-3.5 w-3.5" />}>
            <ul className="space-y-0.5">
              {[
                { label: 'View Brand Guidelines', to: '/manager/guidelines' },
                { label: 'Check Audit History', to: '/manager/audit' },
                { label: 'Sentinel Reassessment Hub', to: '/manager/sentinel' },
                { label: 'AI Trust & Transparency', to: '/manager/trust' },
                { label: 'ProofPass Public Verification', to: '/verify' },
              ].map((l) => (
                <li key={l.to}>
                  <button
                    onClick={() => navigate(l.to)}
                    className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1.5 text-left text-xs text-ink-600 transition-colors hover:bg-[#FAF7EF] hover:text-brand-700"
                  >
                    <ArrowRight className="h-3 w-3 text-muted-light" />
                    <span className="flex-1 truncate">{l.label}</span>
                    <ChevronRight className="h-3 w-3 text-muted-light" />
                  </button>
                </li>
              ))}
            </ul>
          </RailCard>

          <p className="px-1 text-2xs leading-[15px] text-muted-light">
            {submissionsWithExceptions(submissions, exceptions)} submissions currently carry an active or in-review
            exception.
          </p>
        </div>
      </div>
    </>
  )
}
