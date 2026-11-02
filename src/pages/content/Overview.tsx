import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Cpu,
  ExternalLink,
  Eye,
  FilePlus2,
  Fingerprint,
  Layers,
  Scan,
  Search,
  ShieldCheck,
  Sparkles,
  SquarePen,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Card, CardHeader, MetricCard, ViewAll } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DataTable, EmptyState, type Column } from '@/components/ui/Table'
import { Avatar, Donut, ProgressBar, Skeleton } from '@/components/ui/Misc'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { ContentThumb } from '@/components/content/ContentThumb'
import { RailCard } from '@/components/layout/Shell'
import { complianceSplit, openFindings, submissionStats } from '@/lib/selectors'
import { cn, fmtShort, relative } from '@/lib/utils'
import type { Submission } from '@/lib/types'
import { api } from '@/services/api'

interface CrewAgent {
  id: string
  name: string
  role: string
  status: string
  badge: string
  desc: string
}

interface CrewTrace {
  id: string
  submissionId: string
  versionNum: number
  status: string
  summary: string
  durationMs: number
  createdAt: string
  stepsCount: number
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

interface AnalysisItem {
  id: string
  submissionId?: string
  submissionTitle?: string
  status: string
  ocrText?: string
  width?: number
  height?: number
  dominantColors?: { hex: string; percent: number; name?: string }[]
  logoMatches?: { score: number; template: string; clearSpacePass?: boolean }[]
  contrastFindings?: { wcagAaPass: boolean; contrastRatio: number }[]
  createdAt?: string
}

export default function CreatorOverview() {
  const { user } = useAuth()
  const { submissions, rules, exceptions, loading } = useData()
  const navigate = useNavigate()

  // Round 3 / Innovation live data
  const [crewData, setCrewData] = useState<{
    totalRuns: number
    completedRuns: number
    avgDurationMs: number
    agents: CrewAgent[]
    recentTraces: CrewTrace[]
  } | null>(null)
  const [passports, setPassports] = useState<PassportItem[]>([])
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([])
  const [loadingInnovations, setLoadingInnovations] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.crewSummary().catch(() => null),
      api.listPassports().catch(() => []),
      api.listAnalyses(6).catch(() => []),
    ]).then(([crewRes, passRes, anaRes]) => {
      if (cancelled) return
      if (crewRes) setCrewData(crewRes)
      if (passRes) setPassports(passRes as PassportItem[])
      if (anaRes) setAnalyses(anaRes as AnalysisItem[])
      setLoadingInnovations(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const mine = useMemo(
    () => submissions.filter((s) => s.creatorId === user?.id),
    [submissions, user?.id],
  )
  const stats = submissionStats(mine)
  const compliance = complianceSplit(mine)
  const openIssues = openFindings(mine)

  const recent = useMemo(
    () => [...mine].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 5),
    [mine],
  )

  const checklist = useMemo(() => {
    const codes = ['BR-01', 'CL-03', 'LO-02', 'TV-02']
    return codes
      .map((code) => rules.find((r) => r.code === code))
      .filter(Boolean)
      .map((rule) => {
        const flagged = mine.some((s) => s.findings.some((f) => f.ruleCode === rule!.code && f.status === 'open'))
        return {
          id: rule!.id,
          label: rule!.title,
          hint: rule!.summary,
          done: !flagged,
        }
      })
  }, [rules, mine])

  const upcoming = useMemo(() => {
    const items: { id: string; title: string; when: string; tone: 'blue' | 'grape' | 'green' }[] = []
    mine
      .filter((s) => s.status === 'Changes Requested')
      .slice(0, 2)
      .forEach((s) =>
        items.push({ id: s.id, title: `Revise “${s.title}”`, when: 'Action required', tone: 'grape' }),
      )
    mine
      .filter((s) => s.status === 'Pending' || s.status === 'In Review')
      .slice(0, 2)
      .forEach((s) => items.push({ id: s.id, title: `Review in progress · ${s.title}`, when: 'Awaiting manager', tone: 'blue' }))
    exceptions
      .filter((e) => e.requestedById === user?.id && e.status === 'Approved')
      .slice(0, 1)
      .forEach((e) => items.push({ id: e.id, title: `Exception ${e.code} expires`, when: fmtShort(e.expiresAt), tone: 'green' }))
    return items.slice(0, 4)
  }, [mine, exceptions, user?.id])

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  })()

  const columns: Column<Submission>[] = [
    {
      key: 'content',
      header: 'Content',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <ContentThumb thumb={row.thumb} assetRef={row.assetRef} size={30} />
          <div className="min-w-0">
            <p className="truncate text-base font-medium leading-[17px] text-ink">{row.title}</p>
            <p className="truncate text-2xs leading-[14px] text-muted">{row.channel}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '92px',
      className: 'hidden sm:table-cell', headerClassName: 'hidden sm:table-cell',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-ink-600">
          <FileIcon type={row.type} />
          {row.type}
        </span>
      ),
    },
    { key: 'status', header: 'Status',
      width: '140px', cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'updated',
      header: 'Updated',
      width: '96px',
      className: 'hidden md:table-cell', headerClassName: 'hidden md:table-cell',
      cell: (row) => <span className="whitespace-nowrap text-xs text-muted">{relative(row.updatedAt)}</span>,
    },
  ]

  // Default agent list fallback if loading
  const agentsList = crewData?.agents ?? [
    { id: 'intake', name: 'Intake Agent', role: 'Asset Parser', status: 'active', badge: 'Healthy', desc: 'Validates file headers & metadata' },
    { id: 'visual', name: 'VisualGuard Agent', role: 'OCR & Vision', status: 'active', badge: 'Healthy', desc: 'Extracts Hindi/English text & logo' },
    { id: 'retrieval', name: 'Retrieval Agent', role: 'Hybrid Search', status: 'active', badge: 'Healthy', desc: 'BM25 + Dense vector retrieval' },
    { id: 'verifier', name: 'Evidence Verifier', role: 'Anti-Hallucination', status: 'active', badge: 'Healthy', desc: 'Grounds citations against guidelines' },
    { id: 'summary', name: 'Synthesis Agent', role: 'Advisory Summary', status: 'active', badge: 'Healthy', desc: 'Prepares minimal-edit suggestions' },
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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-ink">
            {greeting}, {user?.name.split(' ')[0]}!
          </h1>
          <p className="mt-1 text-base text-muted">Keep every campaign aligned with your brand guidelines.</p>
        </div>
        <Button size="md" className="w-full sm:w-auto" icon={<FilePlus2 className="h-3.5 w-3.5" />} onClick={() => navigate('/app/new')}>
          New Content
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_268px]">
        <div className="min-w-0 space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {loading ? (
              <>
                <Skeleton className="h-[104px] rounded-xl" />
                <Skeleton className="h-[104px] rounded-xl" />
                <Skeleton className="h-[104px] rounded-xl" />
              </>
            ) : (
              <>
                <MetricCard
                  label="In Review"
                  value={String(stats.pending + stats.inReview + stats.readyForApproval).padStart(2, '0')}
                  sub="Awaiting approval"
                  icon={<Clock3 className="h-4 w-4" />}
                  tone="blue"
                  onClick={() => navigate('/app/submissions?status=In+Review')}
                />
                <MetricCard
                  label="Approved"
                  value={String(stats.approved).padStart(2, '0')}
                  sub="Ready to publish"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  tone="green"
                  onClick={() => navigate('/app/submissions?status=Approved')}
                />
                <MetricCard
                  label="Needs Changes"
                  value={String(stats.changesRequested).padStart(2, '0')}
                  sub="Action required"
                  icon={<SquarePen className="h-4 w-4" />}
                  tone="amber"
                  onClick={() => navigate('/app/submissions?status=Changes+Requested')}
                />
              </>
            )}
          </div>

          {/* Review Crew Multi-Agent System Live Status Card */}
          <Card className="overflow-hidden border-brand-200 bg-gradient-to-br from-white via-[#F9FBFA] to-[#F1F6F2] p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <Cpu className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-md font-semibold text-ink">Review Crew · Multi-Agent Advisory System</h2>
                  <p className="text-2xs text-muted">5 sequential bounded agents check format, OCR, guidelines & citations</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="success" size="sm">
                  All 5 Agents Active
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  icon={<ExternalLink className="h-3 w-3" />}
                  onClick={() => navigate('/app/feedback')}
                >
                  View Crew Traces
                </Button>
              </div>
            </div>

            {/* 5-Agent Cards Row */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {agentsList.map((ag) => (
                <div
                  key={ag.id}
                  className="flex flex-col justify-between rounded-lg border border-line bg-white/90 p-2.5 shadow-2xs transition-shadow hover:shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FAF7EF]">
                        {agentIcons[ag.id] ?? <Bot className="h-3.5 w-3.5 text-brand-600" />}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
                        {ag.badge}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-ink leading-tight">{ag.name}</p>
                    <p className="text-[10.5px] text-muted-light font-medium">{ag.role}</p>
                  </div>
                  <p className="mt-2 text-[10px] text-muted line-clamp-2 leading-tight">{ag.desc}</p>
                </div>
              ))}
            </div>

            {/* Latest Crew Trace Callout */}
            {crewData?.recentTraces && crewData.recentTraces.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#FAF7EF] px-3 py-2 text-2xs text-ink-600 border border-line/60">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                  <span>
                    <strong className="font-semibold text-ink">Latest Review Crew Execution:</strong>{' '}
                    {crewData.recentTraces[0].summary}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/app/feedback/${crewData.recentTraces[0].submissionId}`)}
                  className="font-medium text-brand-700 hover:text-brand-800 underline inline-flex items-center gap-1"
                >
                  Inspect Trace <ArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_268px]">
            <div className="min-w-0 space-y-4">
              {/* Recent content */}
              <Card>
                <CardHeader title="Recent Content" action={<ViewAll onClick={() => navigate('/app/submissions')} />} />
                <DataTable
                  columns={columns}
                  rows={recent}
                  loading={loading}
                  minWidth="480px"
                  getKey={(r) => r.id}
                  onRowClick={(r) => navigate(`/app/feedback/${r.id}`)}
                  empty={
                    <EmptyState
                      title="No submissions yet"
                      description="Submit your first piece of content and its guideline check will appear here."
                      action={
                        <Button size="sm" icon={<FilePlus2 className="h-3.5 w-3.5" />} onClick={() => navigate('/app/new')}>
                          New Content
                        </Button>
                      }
                      compact
                    />
                  }
                />
              </Card>

              {/* VisualGuard OCR & Palette Checks Card */}
              <Card>
                <CardHeader
                  title="VisualGuard · Creative OCR & Vision Checks"
                  subtitle="Tesseract & RapidOCR inspection for posters, typography, logo placement & contrast."
                  icon={<Scan className="h-4 w-4" />}
                  action={
                    <Badge tone="brand" size="sm">
                      {analyses.length} Assets Inspected
                    </Badge>
                  }
                />
                <div className="divide-y divide-line">
                  {analyses.length === 0 ? (
                    <div className="p-4 text-xs text-muted">No visual creative analyses recorded yet.</div>
                  ) : (
                    analyses.slice(0, 3).map((a) => (
                      <div
                        key={a.id}
                        onClick={() => a.submissionId && navigate(`/app/feedback/${a.submissionId}`)}
                        className="flex flex-col gap-2 p-3 transition-colors hover:bg-[#FAF7EF] cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-grape-50 text-grape-600">
                              <Eye className="h-3.5 w-3.5" />
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-ink">{a.submissionTitle ?? 'Campaign Poster Asset'}</p>
                              <p className="text-[10px] text-muted">
                                {a.width && a.height ? `${a.width}×${a.height}px` : 'Raster Creative'} · OCR Status: {a.status}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {a.contrastFindings?.[0]?.wcagAaPass ? (
                              <Badge tone="success" size="sm">WCAG AA Pass</Badge>
                            ) : (
                              <Badge tone="warn" size="sm">Contrast Check</Badge>
                            )}
                            {a.logoMatches?.[0]?.score ? (
                              <Badge tone="brand" size="sm">Logo Clear Space ✓</Badge>
                            ) : null}
                          </div>
                        </div>

                        {a.ocrText && (
                          <div className="rounded-md bg-[#F4EFE3]/50 px-2.5 py-1.5 text-[11px] text-ink-600 line-clamp-2 font-mono">
                            <span className="text-[10px] uppercase font-sans tracking-wide text-muted font-bold mr-1">OCR Text:</span>
                            {a.ocrText.replace(/\n/g, ' · ')}
                          </div>
                        )}

                        {a.dominantColors && a.dominantColors.length > 0 && (
                          <div className="flex items-center gap-2 text-[10px] text-muted">
                            <span>Palette:</span>
                            <div className="flex items-center gap-1">
                              {a.dominantColors.slice(0, 4).map((c, i) => (
                                <span
                                  key={i}
                                  className="h-3.5 w-3.5 rounded-full border border-black/10 inline-block shadow-2xs"
                                  style={{ backgroundColor: c.hex }}
                                  title={`${c.name ?? c.hex} (${c.percent.toFixed(1)}%)`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* ProofPass Approval Passports Card */}
              <Card>
                <CardHeader
                  title="ProofPass™ · Cryptographic Approval Passports"
                  subtitle="Tamper-evident SHA-256 and perceptual pHash verification certificates for approved assets."
                  icon={<Fingerprint className="h-4 w-4" />}
                  action={
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate('/verify')}>
                      Open Public Verifier
                    </Button>
                  }
                />
                <div className="divide-y divide-line">
                  {passports.length === 0 ? (
                    <div className="p-4 text-xs text-muted">No cryptographic passports issued yet. Passports are generated on manager approval.</div>
                  ) : (
                    passports.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 transition-colors hover:bg-[#FAF7EF]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-50 text-success-600 shrink-0">
                            <Award className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink">{p.title}</p>
                            <p className="truncate text-[10.5px] font-mono text-muted-light">
                              Passport: {p.id} · SHA-256: {p.sha256.slice(0, 12)}…
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge tone="success" size="sm">Valid Passport</Badge>
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

              {/* Checklist */}
              <Card>
                <CardHeader
                  title="Your Review Checklist"
                  icon={<ClipboardList className="h-4 w-4" />}
                  action={
                    <Button size="sm" variant="outline" icon={<BookOpen className="h-3 w-3" />} onClick={() => navigate('/app/guidelines')}>
                      View all guidelines
                    </Button>
                  }
                />
                <ul className="divide-line">
                  {checklist.length === 0 && (
                    <li className="px-4 py-5 text-xs text-muted">No active rules are published for your workspace yet.</li>
                  )}
                  {checklist.map((item) => (
                    <li key={item.id} className="flex items-start gap-2.5 px-4 py-2.5">
                      <span
                        className={cn(
                          'mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border',
                          item.done ? 'border-success-500 bg-success-500' : 'border-line-strong bg-white',
                        )}
                      >
                        {item.done && <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-base leading-[18px] text-ink">{item.label}</p>
                        <p className="mt-0.5 text-xs leading-[15px] text-muted">{item.hint}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <div className="space-y-4">
              {/* Compliance */}
              <Card className="p-4">
                <h2 className="mb-3 text-md font-semibold text-ink">Brand Compliance</h2>
                {loading ? (
                  <Skeleton className="mx-auto h-[104px] w-[104px] rounded-full" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Donut
                      size={104}
                      thickness={10}
                      segments={[
                        { value: compliance.compliant, color: '#10B981', label: 'Compliant' },
                        { value: compliance.needsReview, color: '#F0A32A', label: 'Needs review' },
                        { value: compliance.nonCompliant, color: '#EF4444', label: 'Non-compliant' },
                      ]}
                      centerValue={`${compliance.rate}%`}
                      centerLabel="Compliant"
                    />
                    <p className="mt-2.5 text-center text-2xs leading-[14px] text-muted">
                      Based on {compliance.total} reviewed submission{compliance.total === 1 ? '' : 's'}
                    </p>
                  </div>
                )}

                <div className="mt-3 space-y-2 border-t border-line pt-3">
                  <button
                    onClick={() => navigate('/app/feedback')}
                    className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-[#FAF7EF]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-warn-50 text-warn-600">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold leading-[16px] text-ink">{openIssues}</span>
                      <span className="block text-2xs leading-[14px] text-muted">rule checks need attention</span>
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-light" />
                  </button>
                  <button
                    onClick={() => navigate('/app/submissions?status=Pending')}
                    className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-[#FAF7EF]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                      <FilePlus2 className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold leading-[16px] text-ink">{stats.pending}</span>
                      <span className="block text-2xs leading-[14px] text-muted">drafts awaiting first review</span>
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-light" />
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <Card className="p-4 text-center">
            <Avatar initials={user?.initials ?? '—'} tone={user?.avatarTone} size="lg" className="mx-auto h-14 w-14 text-base" />
            <p className="mt-2.5 text-md font-semibold text-ink">{user?.name}</p>
            <p className="text-xs text-muted">{user?.title}</p>
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-line bg-[#FAF7EF] px-2.5 py-1 text-2xs font-medium text-ink-600">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
              Workspace active
            </span>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-left">
              <div>
                <p className="text-2xs text-muted">Submissions</p>
                <p className="text-md font-semibold text-ink">{stats.total}</p>
              </div>
              <div>
                <p className="text-2xs text-muted">Approved</p>
                <p className="text-md font-semibold text-success-600">{stats.approved}</p>
              </div>
            </div>
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-2xs text-muted">
                <span>Approval rate</span>
                <span className="font-semibold text-ink">{compliance.rate}%</span>
              </div>
              <ProgressBar value={compliance.rate} tone="success" height={4} />
            </div>
          </Card>

          <RailCard title="Upcoming" action={<ViewAll onClick={() => navigate('/app/submissions')} />}>
            {upcoming.length === 0 ? (
              <p className="py-2 text-xs text-muted">Nothing scheduled. Submit content to start a review.</p>
            ) : (
              <ul className="space-y-2.5">
                {upcoming.map((u) => (
                  <li key={u.id}>
                    <button
                      onClick={() => navigate(`/app/feedback/${u.id}`)}
                      className="flex w-full items-start gap-2 text-left"
                    >
                      <span
                        className={cn(
                          'mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full',
                          u.tone === 'blue' && 'bg-brand-500',
                          u.tone === 'grape' && 'bg-grape-500',
                          u.tone === 'green' && 'bg-success-500',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium leading-[16px] text-ink">{u.title}</span>
                        <span className="block text-2xs leading-[14px] text-muted">{u.when}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </RailCard>

          <p className="flex items-start gap-1.5 px-1 text-2xs leading-[15px] text-muted">
            <ArrowUpRight className="mt-[1px] h-3 w-3 shrink-0" />
            Every finding links to the exact guideline passage behind it.
          </p>
        </div>
      </div>
    </>
  )
}

export function FileIcon({ type }: { type: Submission['type'] }) {
  const map = {
    Text: <span className="text-[10px] font-bold">T</span>,
    Image: (
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.1">
        <rect x="1.5" y="2" width="9" height="8" rx="1.4" />
        <circle cx="4.4" cy="4.8" r="1" />
        <path d="M2.2 8.6l2.6-2.3 2 1.7 1.4-1.1 1.6 1.7" />
      </svg>
    ),
    Document: (
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.1">
        <path d="M3 1.6h4l2.2 2.2v6.6H3z" />
        <path d="M7 1.6v2.2h2.2" />
      </svg>
    ),
    URL: (
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.1">
        <path d="M4.8 7.2a2.2 2.2 0 003.1 0l1.3-1.3a2.2 2.2 0 00-3.1-3.1l-.6.6" />
        <path d="M7.2 4.8a2.2 2.2 0 00-3.1 0L2.8 6.1a2.2 2.2 0 003.1 3.1l.6-.6" />
      </svg>
    ),
  }
  return <span className="text-muted">{map[type]}</span>
}
