import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Filter,
  History,
  MapPin,
  MessageSquare,
  RefreshCw,
  ScanSearch,
  Send,
  ShieldAlert,
  ShieldCheck,
  Fingerprint,
  ExternalLink,
  Sparkles,
  SquarePen,
  XCircle,
  Wand2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { api, ApiError } from '@/services/api'
import { AttachedAsset } from '@/components/content/AttachedAsset'
import { AiFindingCard } from '@/components/evidence/AiFindingCard'
import { PosterCanvas, type PosterBox } from '@/components/visual/PosterCanvas'
import { PageHeader } from '@/components/layout/Shell'
import { Card, MetricCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, SearchInput, Select, Textarea } from '@/components/ui/Field'
import { DataTable, EmptyState, Pagination, ViewButton, type Column } from '@/components/ui/Table'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { Avatar, Modal, Skeleton, Tabs, Thumb } from '@/components/ui/Misc'
import { ContentThumb } from '@/components/content/ContentThumb'
import { useToast } from '@/components/ui/Toast'
import { FileIcon } from '@/pages/content/Overview'
import { submissionStats } from '@/lib/selectors'
import { cn, fmtDate, fmtDateTime, fmtTime, relative } from '@/lib/utils'
import type {
  AiFinding,
  AssetAnalysis,
  EvidenceCapabilities,
  Finding,
  ImageBox,
  Submission,
} from '@/lib/types'

const PAGE_SIZE = 8

/* ------------------------------------------------------------------ */
/* Entry — list and detail are separate screens on purpose: the detail  */
/* page used to live in a 382px rail, which is what made it feel like   */
/* a wall of small text.                                                */
/* ------------------------------------------------------------------ */

export default function ReviewFeedback() {
  const { id } = useParams()
  return id ? <FeedbackDetail id={id} /> : <FeedbackList />
}

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

function FeedbackList() {
  const { user } = useAuth()
  const { submissions, loading } = useData()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Statuses')
  const [type, setType] = useState('All Types')
  const [page, setPage] = useState(1)

  const mine = useMemo(() => submissions.filter((s) => s.creatorId === user?.id), [submissions, user?.id])
  const stats = submissionStats(mine)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return mine.filter((s) => {
      const matchesQuery = !q || s.title.toLowerCase().includes(q) || s.excerpt.toLowerCase().includes(q)
      const matchesStatus = status === 'All Statuses' || s.status === status
      const matchesType = type === 'All Types' || s.type === type
      return matchesQuery && matchesStatus && matchesType
    })
  }, [mine, query, status, type])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<Submission>[] = [
    {
      key: 'content',
      header: 'Content',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <ContentThumb thumb={row.thumb} assetRef={row.assetRef} size={34} />
          <div className="min-w-0">
            <p className="truncate text-base font-medium leading-[18px] text-ink">{row.title}</p>
            <p className="truncate text-xs leading-[16px] text-muted">{row.excerpt}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '96px',
      className: 'hidden sm:table-cell',
      headerClassName: 'hidden sm:table-cell',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-600">
          <FileIcon type={row.type} />
          {row.type}
        </span>
      ),
    },
    {
      key: 'issues',
      header: 'Issues',
      width: '84px',
      cell: (row) =>
        row.issueCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600">
            <span className="h-1.5 w-1.5 rounded-full bg-danger-500" />
            {row.issueCount}
          </span>
        ) : (
          <span className="text-xs text-muted-light">—</span>
        ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      width: '120px',
      className: 'hidden md:table-cell',
      headerClassName: 'hidden md:table-cell',
      cell: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-xs text-ink-600">{fmtDate(row.createdAt)}</p>
          <p className="text-2xs text-muted-light">{fmtTime(row.createdAt)}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', width: '150px', cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      width: '64px',
      align: 'right',
      cell: (row) => <ViewButton onClick={() => navigate(`/app/feedback/${row.id}`)} label="Open" />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Review & Feedback"
        subtitle="Findings, evidence and reviewer comments for your content."
        actions={
          <Button variant="outline" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => navigate('/app/new')}>
            New content
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total" value={String(stats.total).padStart(2, '0')} sub="All submissions" icon={<MessageSquare className="h-4 w-4" />} tone="blue" />
        <MetricCard label="Approved" value={String(stats.approved).padStart(2, '0')} sub="No action needed" icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
        <MetricCard label="Changes requested" value={String(stats.changesRequested).padStart(2, '0')} sub="Needs your attention" icon={<Clock3 className="h-4 w-4" />} tone="amber" />
        <MetricCard label="Declined" value={String(stats.declined).padStart(2, '0')} sub="Review completed" icon={<XCircle className="h-4 w-4" />} tone="rose" />
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Search content…" className="min-w-[180px] flex-1 sm:max-w-[320px]" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="h-9 w-auto min-w-[132px] py-0 text-xs">
            {['All Statuses', 'Pending', 'In Review', 'Ready for Approval', 'Changes Requested', 'Approved', 'Declined'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }} className="h-9 w-auto min-w-[110px] py-0 text-xs">
            {['All Types', 'Text', 'Image', 'Document', 'URL'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>

        <DataTable
          columns={columns}
          rows={paged}
          loading={loading}
          getKey={(r) => r.id}
          onRowClick={(r) => navigate(`/app/feedback/${r.id}`)}
          empty={
            <EmptyState
              icon={<Filter className="h-5 w-5" />}
              title="Nothing to review yet"
              description="Submit content and reviewer feedback will appear here."
            />
          }
        />

        {filtered.length > 0 && (
          <div className="border-t border-line">
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} label="submissions" />
          </div>
        )}
      </Card>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

function FeedbackDetail({ id }: { id: string }) {
  const { user } = useAuth()
  const { submissions, rules, team, addComment, addVersion, requestException, loading } = useData()
  const navigate = useNavigate()
  const toast = useToast()

  const [tab, setTab] = useState<'findings' | 'comments' | 'history' | 'crew'>('findings')
  const [crewTrace, setCrewTrace] = useState<any>(null)
  const [crewLoading, setCrewLoading] = useState(false)
  const [crewError, setCrewError] = useState<string | null>(null)
  const [passportData, setPassportData] = useState<any>(null)
  const [passportLoading, setPassportLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [excOpen, setExcOpen] = useState(false)
  const [editText, setEditText] = useState('')
  const [editNote, setEditNote] = useState('')
  const [excRule, setExcRule] = useState('')
  const [excReason, setExcReason] = useState('')
  const [excScope, setExcScope] = useState('')
  const [excExpiry, setExcExpiry] = useState('')
  const [busy, setBusy] = useState(false)
  const [openEvidence, setOpenEvidence] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const posterRef = useRef<HTMLDivElement>(null)

  /* A2 Evidence Intelligence */
  const [aiFindings, setAiFindings] = useState<AiFinding[] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiForbidden, setAiForbidden] = useState(false)
  const [aiNonce, setAiNonce] = useState(0)
  const [capabilities, setCapabilities] = useState<EvidenceCapabilities | null>(null)
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null)
  const [semanticBusy, setSemanticBusy] = useState(false)
  const [semanticError, setSemanticError] = useState<string | null>(null)

  /* A1 poster overlay */
  const [analysis, setAnalysis] = useState<AssetAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analysisForbidden, setAnalysisForbidden] = useState(false)
  const [analysisNonce, setAnalysisNonce] = useState(0)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [posterLoading, setPosterLoading] = useState(false)
  const [posterError, setPosterError] = useState(false)
  const [activeRegion, setActiveRegion] = useState<ImageBox | null>(null)

  const selected = useMemo(() => submissions.find((s) => s.id === id), [submissions, id])

  useEffect(() => {
    setTab('findings')
    setOpenEvidence([])
    setExpanded([])
    setActiveRegion(null)
  }, [id])

  useEffect(() => {
    if (!selected) return
    api.fetchCrewTrace(selected.id).then((t) => setCrewTrace(t)).catch(() => setCrewTrace(null))
    if (selected.status === 'Approved') {
      api.getPassport(selected.id).then((p) => setPassportData(p)).catch(() => setPassportData(null))
    }
  }, [selected?.id, selected?.status])

  const handleRunCrew = async () => {
    if (!selected) return
    setCrewLoading(true)
    setCrewError(null)
    try {
      const trace = await api.triggerCrewReview(selected.id)
      setCrewTrace(trace)
      toast.success('Review Crew workflow completed with audit trace.')
    } catch (e: any) {
      setCrewError(e?.message || 'Review crew execution failed')
      toast.error(e?.message || 'Failed to execute Review Crew')
    } finally {
      setCrewLoading(false)
    }
  }

  const handleGeneratePassport = async () => {
    if (!selected) return
    setPassportLoading(true)
    try {
      const p = await api.generatePassport(selected.id)
      setPassportData(p)
      toast.success('ProofPass Approval Passport issued!')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to issue passport')
    } finally {
      setPassportLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setCapabilitiesError(null)
    api
      .evidenceCapabilities()
      .then((result) => {
        if (!cancelled) setCapabilities(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setCapabilitiesError(err instanceof Error ? err.message : 'Semantic review status unavailable.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setAiLoading(true)
    setAiError(null)
    setAiForbidden(false)
    api
      .aiFindings(id)
      .then((list) => {
        if (cancelled) return
        setAiFindings(list)
        setAiLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 403) setAiForbidden(true)
        else setAiError(err instanceof Error ? err.message : 'AI findings could not be loaded.')
        setAiLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, aiNonce])

  useEffect(() => {
    setActiveRegion(null)
    let cancelled = false
    setAnalysisLoading(true)
    setAnalysisError(null)
    setAnalysisForbidden(false)
    api
      .analysisForSubmission(id)
      .then((result) => {
        if (cancelled) return
        setAnalysis(result)
        setAnalysisLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) setAnalysis(null)
        else if (err instanceof ApiError && err.status === 403) {
          setAnalysis(null)
          setAnalysisForbidden(true)
        } else {
          setAnalysis(null)
          setAnalysisError(err instanceof Error ? err.message : 'The poster analysis could not be loaded.')
        }
        setAnalysisLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, analysisNonce])

  useEffect(() => {
    if (!analysis || analysis.status !== 'complete') {
      setPosterUrl(null)
      setPosterLoading(false)
      setPosterError(false)
      return
    }
    let cancelled = false
    let created: string | null = null
    setPosterLoading(true)
    setPosterError(false)
    api
      .fetchPosterBlobUrl(analysis.submissionId ?? id)
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        created = url
        setPosterUrl(url)
        setPosterLoading(false)
        setPosterError(!url)
      })
      .catch(() => {
        if (!cancelled) {
          setPosterUrl(null)
          setPosterLoading(false)
          setPosterError(true)
        }
      })
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [analysis, id])

  const latest = selected?.versions[selected.versions.length - 1]
  const openFindings = selected?.findings.filter((f) => f.status === 'open') ?? []
  const violations = (selected?.findings ?? []).filter((f) => !isUnknownFinding(f))
  const engineUnknown = (selected?.findings ?? []).filter(isUnknownFinding)
  const openViolations = violations.filter((f) => f.status === 'open')
  const aiSuggestions = (aiFindings ?? []).filter((f) => f.sourceType === 'ai_suggestion')
  const aiNeedsReview = (aiFindings ?? []).filter((f) => f.sourceType !== 'ai_suggestion')
  const needsReviewCount = engineUnknown.length + aiNeedsReview.length

  const posterBoxes = useMemo<PosterBox[]>(() => {
    if (!analysis || analysis.status !== 'complete') return []
    const out: PosterBox[] = []
    analysis.contrastFindings.forEach((check) => {
      if (check.status === 'pass') return
      out.push({
        box: check.region,
        tone: check.status === 'fail' ? 'danger' : 'warn',
        label: check.check || check.text,
        active: sameBox(check.region, activeRegion),
      })
    })
    analysis.logoMatches.forEach((logo) => {
      out.push({ box: logo.box, tone: 'info', label: logo.name, active: sameBox(logo.box, activeRegion) })
    })
    return out
  }, [analysis, activeRegion])

  const reviewer = selected ? team.find((t) => t.id === selected.decisions[0]?.reviewerId) : undefined

  function postComment() {
    if (!selected || !comment.trim()) return
    addComment(selected.id, comment.trim())
    setComment('')
    setTab('comments')
    toast.success('Comment added', 'Your brand manager will see it on the next review.')
  }

  function openEdit() {
    if (!selected) return
    setEditText(latest?.text ?? '')
    setEditNote('')
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!selected) return
    if (editText.trim().length < 15) {
      toast.error('Too short', 'Add at least 15 characters before resubmitting.')
      return
    }
    setBusy(true)
    try {
      const updated = await addVersion(selected.id, editText.trim(), editNote.trim() || 'Revised after reviewer feedback')
      toast.success(
        `Version ${updated.version} submitted`,
        updated.issueCount === 0 ? 'No guideline issues detected in this version.' : `${updated.issueCount} finding${updated.issueCount === 1 ? '' : 's'} remain.`,
      )
      setEditOpen(false)
      navigate(`/app/feedback/${updated.id}`)
    } catch (err) {
      toast.error('Could not save version', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function openException(finding?: Finding) {
    if (!selected) return
    setExcRule(finding?.ruleCode ?? openFindings[0]?.ruleCode ?? rules.find((r) => r.status === 'active')?.code ?? '')
    setExcReason('')
    setExcScope(`${selected.channel} · ${selected.title}`)
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setExcExpiry(d.toISOString().slice(0, 10))
    setExcOpen(true)
  }

  async function submitException() {
    if (!selected) return
    if (!excReason.trim()) {
      toast.error('Reason required', 'Explain why this content cannot follow the rule.')
      return
    }
    setBusy(true)
    try {
      await requestException({
        contentId: selected.id,
        ruleCode: excRule,
        reason: excReason.trim(),
        scope: excScope,
        expiresAt: new Date(excExpiry).toISOString(),
      })
      toast.success('Exception requested', 'A brand manager must decide. Nothing is approved automatically.')
      setExcOpen(false)
    } catch (err) {
      toast.error('Could not request exception', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function applyFix(f: Finding) {
    if (!f.suggestedFix) return
    setEditText((prev) => {
      const base = prev || latest?.text || ''
      return base.includes(f.suggestedFix!.original)
        ? base.replace(f.suggestedFix!.original, f.suggestedFix!.proposed)
        : `${base} ${f.suggestedFix!.proposed}`
    })
    setEditNote(`Applied suggested fix for ${f.ruleCode}`)
    setEditOpen(true)
  }

  function locateFinding(f: Finding) {
    if (!f.region) return
    setActiveRegion(f.region)
    window.setTimeout(() => posterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }

  async function runSemanticReview() {
    if (!selected) return
    setSemanticBusy(true)
    setSemanticError(null)
    try {
      const result = await api.runSemanticReview(selected.id)
      setAiFindings(result.findings)
      setAiForbidden(false)
      if (!result.llmConfigured) {
        toast.info('Semantic review is not configured', 'No LLM is configured on this server, so no AI suggestions were generated.')
      } else if (result.count === 0) {
        toast.info('Semantic review complete', 'No advisory findings were returned for this version.')
      } else {
        toast.success('Semantic review complete', `${result.count} advisory finding${result.count === 1 ? '' : 's'} returned.`)
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setAiForbidden(true)
      else setSemanticError(err instanceof Error ? err.message : 'Semantic review failed. Please try again.')
    } finally {
      setSemanticBusy(false)
    }
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]))
  }

  function toggleEvidence(key: string) {
    setOpenEvidence((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]))
  }

  if (loading && !selected) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    )
  }

  if (!selected) {
    return (
      <Card className="p-8">
        <EmptyState
          title="Submission not found"
          description="It may have been removed, or it belongs to another workspace."
          action={<Button onClick={() => navigate('/app/feedback')}>Back to feedback</Button>}
        />
      </Card>
    )
  }

  const canLocate = (f: Finding) => Boolean(f.region && analysis?.status === 'complete')

  return (
    <>
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/app/feedback')}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Review & feedback
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Thumb spec={selected.thumb} size={44} />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.02em] text-ink">{selected.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge status={selected.status} size="sm" />
                <Badge tone="neutral" dot={false} size="sm">v{selected.version}</Badge>
                <span className="text-xs text-muted">{selected.channel} · {fmtDateTime(selected.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<SquarePen className="h-3.5 w-3.5" />} onClick={openEdit}>
              Edit
            </Button>
            <Button size="sm" variant="outline" icon={<ShieldAlert className="h-3.5 w-3.5" />} onClick={() => openException()}>
              Exception
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {/* Left: evidence */}
        <div className="space-y-4 xl:sticky xl:top-[80px]">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">Poster check</p>
              {analysis?.status === 'complete' && (
                <Badge tone={analysis.unreadable ? 'warn' : 'brand'} size="sm">
                  {analysis.unreadable ? 'Unreadable' : `${analysis.summary.contrastFailures} contrast issue${analysis.summary.contrastFailures === 1 ? '' : 's'}`}
                </Badge>
              )}
            </div>

            <div ref={posterRef} className="p-4">
              {analysisLoading ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : analysisForbidden ? (
                <Notice tone="warn" icon={<ShieldAlert className="h-3.5 w-3.5" />}>
                  Your role cannot view this poster.
                </Notice>
              ) : analysisError ? (
                <Notice tone="danger" icon={<AlertTriangle className="h-3.5 w-3.5" />} action={<Button size="xs" variant="outline" icon={<RefreshCw className="h-3 w-3" />} onClick={() => setAnalysisNonce((n) => n + 1)}>Retry</Button>}>
                  {analysisError}
                </Notice>
              ) : analysis?.status === 'complete' ? (
                <>
                  {analysis.unreadable && (
                    <Notice tone="warn" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
                      The image could not be read — nothing is treated as passed.
                    </Notice>
                  )}
                  {posterLoading || (!posterUrl && !posterError) ? (
                    <Skeleton className="h-64 w-full rounded-lg" />
                  ) : posterError ? (
                    <Notice tone="neutral" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
                      The poster file could not be loaded, so the overlay is unavailable. Measurements are still stored.
                    </Notice>
                  ) : (
                    <PosterCanvas imageUrl={posterUrl ?? ''} boxes={posterBoxes} />
                  )}
                </>
              ) : analysis ? (
                <Notice tone="neutral">Analysis is {analysis.status}.</Notice>
              ) : (
                <div className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center">
                  <p className="text-xs text-muted">No poster attached to this submission.</p>
                </div>
              )}
            </div>

            {!analysis && (
              <div className="border-t border-line px-4 py-3">
                <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Content</p>
                <p className="text-sm leading-[21px] text-ink-700">{latest?.text}</p>
              </div>
            )}
          </Card>

          {/* Verdict — three numbers, no paragraphs */}
          <Card>
            <div className="border-b border-line px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">Verdict</p>
            </div>
            <div className="divide-y divide-line">
              <VerdictRow
                tone="danger"
                label="Deterministic violations"
                value={openViolations.length}
                caption={openViolations.length === 0 ? 'No rule failed' : 'Rule engine verdict'}
              />
              <VerdictRow
                tone="warn"
                label="Needs human review"
                value={needsReviewCount}
                caption={needsReviewCount === 0 ? 'Nothing outstanding' : 'Missing facts — not a pass'}
              />
              <VerdictRow
                tone="grape"
                label="AI suggestions"
                value={aiSuggestions.length}
                caption="Advisory only"
              />
            </div>
            {selected.decisions.length > 0 && (
              <div className="flex items-start gap-2 border-t border-line px-4 py-3">
                <Avatar initials={reviewer?.initials ?? 'BM'} tone={reviewer?.avatarTone} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink">
                    {reviewer?.name ?? 'Brand manager'} · {selected.decisions[0].action} v{selected.decisions[0].version}
                  </p>
                  <p className="truncate text-2xs text-muted">{selected.decisions[0].note}</p>
                </div>
                <span className="ml-auto shrink-0 text-2xs text-muted-light">{relative(selected.decisions[0].createdAt)}</span>
              </div>
            )}
          </Card>

          {selected.assetRef && <AttachedAsset assetRef={selected.assetRef} />}
        </div>

        {/* Right: findings / comments / history */}
        <Card className="overflow-hidden">
          <div className="px-4 pt-1">
            <Tabs
              items={[
                { key: 'findings', label: 'Findings', count: violations.length + needsReviewCount },
                { key: 'comments', label: 'Comments', count: selected.comments.length },
                { key: 'history', label: 'History', count: selected.versions.length },
                { key: 'crew', label: 'Review Crew (AI)', count: crewTrace ? crewTrace.steps.length : undefined },
              ]}
              active={tab}
              onChange={(k) => setTab(k as typeof tab)}
            />
          </div>

          <div className="p-4">
            {tab === 'findings' && (
              <div className="space-y-5">
                <Group
                  tone="danger"
                  title="Deterministic violations"
                  caption="The verdict — produced by the rule engine"
                  count={violations.length}
                >
                  {violations.length === 0 ? (
                    <EmptyLine tone="success">No rule failed on this version.</EmptyLine>
                  ) : (
                    violations.map((f) => (
                      <FindingRow
                        key={f.id}
                        finding={f}
                        tone="danger"
                        canLocate={canLocate(f)}
                        expanded={expanded.includes(f.id)}
                        evidenceOpen={openEvidence.includes(f.id)}
                        onToggle={() => toggleExpanded(f.id)}
                        onEvidence={() => toggleEvidence(f.id)}
                        onLocate={() => locateFinding(f)}
                        onApplyFix={() => applyFix(f)}
                        onException={() => openException(f)}
                      />
                    ))
                  )}
                </Group>

                <Group
                  tone="warn"
                  title="Needs human review"
                  caption="The engine returned unknown — neither a pass nor a fail"
                  count={needsReviewCount}
                >
                  {engineUnknown.map((f) => (
                    <FindingRow
                      key={f.id}
                      finding={f}
                      tone="warn"
                      canLocate={canLocate(f)}
                      expanded={expanded.includes(f.id)}
                      evidenceOpen={openEvidence.includes(f.id)}
                      onToggle={() => toggleExpanded(f.id)}
                      onEvidence={() => toggleEvidence(f.id)}
                      onLocate={() => locateFinding(f)}
                      onApplyFix={() => applyFix(f)}
                      onException={() => openException(f)}
                    />
                  ))}

                  {aiLoading && <Skeleton className="h-16 w-full rounded-lg" />}
                  {!aiLoading && aiForbidden && (
                    <Notice tone="warn" icon={<ShieldAlert className="h-3.5 w-3.5" />}>
                      Your role cannot read AI evidence for this submission.
                    </Notice>
                  )}
                  {!aiLoading && !aiForbidden && aiError && (
                    <Notice tone="danger" icon={<AlertTriangle className="h-3.5 w-3.5" />} action={<Button size="xs" variant="outline" icon={<RefreshCw className="h-3 w-3" />} onClick={() => setAiNonce((n) => n + 1)}>Retry</Button>}>
                      {aiError}
                    </Notice>
                  )}
                  {!aiLoading && !aiForbidden && !aiError && aiNeedsReview.map((f) => <AiFindingCard key={f.id} finding={f} />)}
                  {!aiLoading && !aiForbidden && !aiError && needsReviewCount === 0 && (
                    <EmptyLine tone="success">Nothing needs a human check.</EmptyLine>
                  )}
                </Group>

                <Group
                  tone="grape"
                  title="AI suggestions"
                  caption="Advisory only — never changes the verdict"
                  count={aiSuggestions.length}
                  action={
                    <Button
                      size="xs"
                      variant="outline"
                      loading={semanticBusy}
                      disabled={capabilities?.llmConfigured === false || aiForbidden}
                      icon={<ScanSearch className="h-3 w-3" />}
                      onClick={() => void runSemanticReview()}
                    >
                      Run review
                    </Button>
                  }
                >
                  {semanticError && (
                    <Notice tone="danger" icon={<AlertTriangle className="h-3.5 w-3.5" />}>{semanticError}</Notice>
                  )}
                  {capabilitiesError && (
                    <Notice tone="neutral">Semantic review status unavailable: {capabilitiesError}</Notice>
                  )}
                  {!capabilities && !capabilitiesError && <Skeleton className="h-12 w-full rounded-lg" />}
                  {capabilities?.llmConfigured === false && (
                    <Notice tone="warn" icon={<Bot className="h-3.5 w-3.5" />}>
                      Not configured on this server. Deterministic checks above still ran. Retrieval:{' '}
                      {capabilities.retrieval === 'hybrid_bm25_vector' ? 'hybrid BM25 + vector' : 'BM25 only'}.
                    </Notice>
                  )}
                  {aiForbidden && (
                    <Notice tone="warn" icon={<ShieldAlert className="h-3.5 w-3.5" />}>
                      Your role cannot run semantic review.
                    </Notice>
                  )}
                  {!aiForbidden && aiLoading && <Skeleton className="h-16 w-full rounded-lg" />}
                  {!aiLoading && !aiForbidden && aiSuggestions.map((f) => <AiFindingCard key={f.id} finding={f} />)}
                  {!aiLoading && !aiForbidden && capabilities && capabilities.llmConfigured !== false && aiSuggestions.length === 0 && (
                    <EmptyLine tone="neutral">No AI suggestions yet. Run a review to search the guideline passages.</EmptyLine>
                  )}
                </Group>

                {selected.status === 'Approved' && (
                  <div className="space-y-3">
                    <p className="flex items-center gap-1.5 text-xs text-success-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      v{selected.version} is approved. Editing creates a new version that needs a fresh decision.
                    </p>

                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-800">
                            ProofPass™ Approval Passport
                          </span>
                          <Badge tone="success">ACTIVE</Badge>
                        </div>
                        <Link
                          to={`/verify/${selected.id}`}
                          target="_blank"
                          className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
                        >
                          Public Verify <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      <p className="text-2xs text-emerald-700">
                        v{selected.version} is cryptographically anchored. Exact binary matching and perceptual pHash verify this version against unauthorized post-approval modifications.
                      </p>
                      {passportData ? (
                        <div className="rounded-lg bg-white/80 border border-emerald-200 p-2.5 space-y-1.5 text-2xs">
                          <div className="flex items-center justify-between font-mono text-[10px] text-ink-700">
                            <span>SHA-256 Digest:</span>
                            <span className="truncate max-w-[200px]" title={passportData.sha256}>
                              {passportData.sha256}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-muted text-[10px]">
                            <span>Valid Through:</span>
                            <span>{new Date(passportData.valid_until || passportData.expires_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ) : (
                        user?.role === 'manager' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleGeneratePassport}
                            disabled={passportLoading}
                            className="w-full text-2xs"
                          >
                            <Fingerprint className="h-3 w-3 mr-1" />
                            {passportLoading ? 'Issuing Passport…' : 'Generate ProofPass Certificate'}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'comments' && (
              <div className="space-y-4">
                {selected.comments.length === 0 && (
                  <EmptyState title="No comments yet" description="Reviewer comments will appear here." compact />
                )}
                {selected.comments.map((c) => {
                  const author = team.find((t) => t.id === c.authorId)
                  return (
                    <div key={c.id} className="flex items-start gap-2.5">
                      <Avatar initials={author?.initials ?? '??'} tone={author?.avatarTone} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-ink">
                          {author?.name ?? 'Unknown'}
                          <span className="ml-1.5 font-normal text-muted-light">{relative(c.createdAt)}</span>
                        </p>
                        <p className="mt-1 rounded-lg rounded-tl-none border border-line bg-[#FBFDFF] px-3 py-2 text-sm leading-[20px] text-ink-700">
                          {c.body}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div className="relative border-t border-line pt-3">
                  <Input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        postComment()
                      }
                    }}
                    placeholder="Add a comment…"
                    className="pr-10"
                  />
                  <button
                    onClick={postComment}
                    disabled={!comment.trim()}
                    aria-label="Send comment"
                    className="absolute right-1.5 top-[18px] inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:bg-[#E2DCCB]"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {tab === 'history' && (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Versions</p>
                  <ol className="space-y-2">
                    {[...selected.versions].reverse().map((v) => (
                      <li key={v.id} className="rounded-lg border border-line p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-ink">Version {v.version}</p>
                          <span className="text-2xs text-muted-light">{fmtDateTime(v.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">{v.note}</p>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-[18px] text-ink-600">{v.text}</p>
                      </li>
                    ))}
                  </ol>
                </div>
                {selected.decisions.length > 0 && (
                  <div>
                    <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Decisions</p>
                    <ol className="space-y-2">
                      {selected.decisions.map((d) => (
                        <li key={d.id} className="flex items-start gap-2.5 text-xs">
                          <span
                            className={cn(
                              'mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full',
                              d.action === 'Approved' ? 'bg-success-500' : d.action === 'Declined' ? 'bg-danger-500' : 'bg-warn-500',
                            )}
                          />
                          <span className="min-w-0">
                            <span className="font-medium text-ink">{d.action} · v{d.version}</span>
                            <span className="block text-muted">{d.note}</span>
                            <span className="text-2xs text-muted-light">{relative(d.createdAt)}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {tab === 'crew' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-ink">
                      Review Crew · Multi-Agent Advisory System
                    </h3>
                    <p className="text-2xs text-muted">
                      Bounded read-only agents: Intake, Visual, Retrieval, Evidence Verifier & Summary
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRunCrew}
                    disabled={crewLoading}
                    className="text-xs"
                  >
                    <Bot className="h-3.5 w-3.5 mr-1 text-brand-600" />
                    {crewLoading ? 'Running Crew…' : 'Run Review Crew'}
                  </Button>
                </div>

                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-2xs text-amber-800">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    Non-negotiable architectural rule:
                  </div>
                  <p className="mt-1 text-amber-700">
                    Advisory trace only. Deterministic rule engine and Human Brand Manager retain sole approval, rejection, exception, and policy authority.
                  </p>
                </div>

                {crewError && (
                  <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
                    {crewError}
                  </div>
                )}

                {!crewTrace && !crewLoading && (
                  <EmptyState
                    title="No agent trace recorded yet"
                    description="Run Review Crew to execute the 5-agent bounded sequential workflow."
                    compact
                  />
                )}

                {crewLoading && (
                  <div className="space-y-2 p-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent" />
                    <p className="text-xs text-muted">Orchestrating agents with typed tool boundaries…</p>
                  </div>
                )}

                {crewTrace && !crewLoading && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-2xs text-muted border-b border-line pb-2">
                      <span>Status: <strong className="text-success-700 uppercase">{crewTrace.orchestrator_status}</strong></span>
                      <span>Steps: {crewTrace.steps_executed} / {crewTrace.max_steps_allowed}</span>
                      <span>Duration: {crewTrace.total_duration_ms}ms</span>
                    </div>

                    <ol className="space-y-2.5">
                      {crewTrace.steps.map((s: any) => (
                        <li key={s.step_number} className="rounded-lg border border-line bg-white p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700 border border-brand-200">
                                {s.step_number}
                              </span>
                              <span className="text-xs font-semibold text-ink">{s.agent_name}</span>
                              <Badge tone={s.status === 'completed' ? 'success' : 'neutral'} size="sm">
                                {s.status}
                              </Badge>
                            </div>
                            <span className="text-2xs text-muted font-mono">{s.duration_ms}ms</span>
                          </div>
                          <p className="text-2xs text-muted-light">Tool: <code className="bg-canvas px-1 py-0.5 rounded text-ink-600">{s.tool_called}</code></p>
                          <p className="text-xs text-ink-700">{s.output_summary}</p>
                        </li>
                      ))}
                    </ol>

                    {crewTrace.summary && (
                      <div className="rounded-lg border border-line bg-canvas p-3 space-y-1.5 mt-3">
                        <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Summary Agent Draft</p>
                        <p className="text-xs text-ink-700">{crewTrace.summary.overview}</p>
                        <p className="text-2xs text-muted italic">"{crewTrace.summary.recommendation_draft}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit content"
        description={selected ? `Saves as version ${selected.version + 1}. The previous approval does not carry over.` : undefined}
        width="max-w-xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} loading={busy} icon={<Send className="h-3.5 w-3.5" />}>Resubmit</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Content text" htmlFor="edit-text" counter={<span className="text-2xs tabular-nums text-muted-light">{editText.length}/500</span>}>
            <Textarea id="edit-text" rows={7} maxLength={500} value={editText} onChange={(e) => setEditText(e.target.value)} />
          </Field>
          <Field label="Change note" hint="Shown in the version history and the audit trail." htmlFor="edit-note">
            <Input id="edit-note" value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="e.g. Removed the immunity claim" />
          </Field>
        </div>
      </Modal>

      {/* Exception modal */}
      <Modal
        open={excOpen}
        onClose={() => setExcOpen(false)}
        title="Request an exception"
        description="A brand manager must decide. It applies only to the recorded scope and dates."
        footer={
          <>
            <Button variant="ghost" onClick={() => setExcOpen(false)}>Cancel</Button>
            <Button onClick={submitException} loading={busy} icon={<ArrowUpRight className="h-3.5 w-3.5" />}>Submit request</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Rule to exempt" htmlFor="f-exc-rule">
            <Select id="f-exc-rule" value={excRule} onChange={(e) => setExcRule(e.target.value)}>
              {rules.filter((r) => r.status === 'active').map((r) => (
                <option key={r.code} value={r.code}>{r.code} · {r.title}</option>
              ))}
            </Select>
          </Field>
          <Field label="Reason" required htmlFor="f-exc-reason">
            <Textarea id="f-exc-reason" rows={3} value={excReason} onChange={(e) => setExcReason(e.target.value)} placeholder="Why can’t this content follow the rule?" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Scope" htmlFor="f-exc-scope">
              <Input id="f-exc-scope" value={excScope} onChange={(e) => setExcScope(e.target.value)} />
            </Field>
            <Field label="Expires on" htmlFor="f-exc-expiry">
              <Input id="f-exc-expiry" type="date" value={excExpiry} onChange={(e) => setExcExpiry(e.target.value)} />
            </Field>
          </div>
        </div>
      </Modal>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

const TONES = {
  danger: { dot: 'bg-danger-500', text: 'text-danger-700', bg: 'bg-danger-50', border: 'border-danger-100' },
  warn: { dot: 'bg-warn-500', text: 'text-warn-700', bg: 'bg-warn-50', border: 'border-warn-100' },
  grape: { dot: 'bg-grape-500', text: 'text-grape-700', bg: 'bg-grape-50', border: 'border-grape-100' },
} as const

function VerdictRow({ tone, label, value, caption }: { tone: keyof typeof TONES; label: string; value: number; caption: string }) {
  const t = TONES[tone]
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', t.dot)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-ink">{label}</p>
        <p className="truncate text-2xs text-muted">{caption}</p>
      </div>
      <span className={cn('text-lg font-semibold tabular-nums', value > 0 ? t.text : 'text-ink')}>{value}</span>
    </div>
  )
}

function Group({
  tone,
  title,
  caption,
  count,
  action,
  children,
}: {
  tone: keyof typeof TONES
  title: string
  caption: string
  count?: number
  action?: React.ReactNode
  children: React.ReactNode
}) {
  const t = TONES[tone]
  return (
    <section aria-label={title}>
      <div className="mb-2 flex items-center gap-2">
        <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />
        <h2 className={cn('text-xs font-semibold uppercase tracking-[0.06em]', t.text)}>{title}</h2>
        {typeof count === 'number' && (
          <span className={cn('rounded-full px-1.5 py-px text-2xs font-semibold', t.bg, t.text)}>{count}</span>
        )}
        <span className="hidden text-2xs text-muted sm:inline">· {caption}</span>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function EmptyLine({ tone, children }: { tone: 'success' | 'neutral'; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs',
        tone === 'success' ? 'border-success-100 bg-success-50/60 text-success-700' : 'border-dashed border-line-strong text-muted',
      )}
    >
      {tone === 'success' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
      {children}
    </p>
  )
}

function Notice({
  tone,
  icon,
  action,
  children,
}: {
  tone: 'warn' | 'danger' | 'neutral'
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start gap-2 rounded-lg border px-3 py-2.5 text-xs leading-[18px]',
        tone === 'warn' && 'border-warn-100 bg-warn-50 text-warn-700',
        tone === 'danger' && 'border-danger-100 bg-danger-50/60 text-danger-700',
        tone === 'neutral' && 'border-line bg-[#FBFDFF] text-muted',
      )}
    >
      {icon && <span className="mt-[2px] shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  )
}

function FindingRow({
  finding,
  tone,
  canLocate,
  expanded,
  evidenceOpen,
  onToggle,
  onEvidence,
  onLocate,
  onApplyFix,
  onException,
}: {
  finding: Finding
  tone: 'danger' | 'warn'
  canLocate: boolean
  expanded: boolean
  evidenceOpen: boolean
  onToggle: () => void
  onEvidence: () => void
  onLocate: () => void
  onApplyFix: () => void
  onException: () => void
}) {
  const t = TONES[tone]
  const severityDot =
    finding.severity === 'High' ? 'bg-danger-500' : finding.severity === 'Medium' ? 'bg-warn-500' : 'bg-brand-400'

  return (
    <div className={cn('rounded-lg border bg-white transition-colors', expanded ? t.border : 'border-line hover:border-line-strong')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
      >
        <span className={cn('mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full', severityDot)} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-ink">{finding.ruleTitle}</span>
            <span className="rounded bg-[#F1ECE0] px-1.5 py-px text-[10px] font-semibold text-ink-600">{finding.ruleCode}</span>
            {finding.status === 'resolved' && <Badge tone="success" size="sm">Resolved</Badge>}
            {finding.status === 'accepted_exception' && <Badge tone="grape" size="sm">Exception</Badge>}
            {finding.region && canLocate && <MapPin className="h-3 w-3 text-brand-500" />}
          </span>
          {!expanded && (
            <span className="mt-0.5 line-clamp-1 block text-xs leading-[18px] text-muted">{finding.explanation}</span>
          )}
        </span>
        <ChevronDown className={cn('mt-1 h-3.5 w-3.5 shrink-0 text-muted-light transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="animate-fade-in space-y-2.5 px-3 pb-3">
          <p className="text-xs leading-[19px] text-ink-700">{finding.explanation}</p>

          {isUnknownFinding(finding) && (
            <p className={cn('rounded-md border px-2.5 py-2 text-2xs leading-[16px]', t.border, t.bg, t.text)}>
              <span className="font-semibold">Not checked.</span>{' '}
              {finding.outcomeDetail ?? 'The engine did not have the evidence this rule needs.'} This is not a pass.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={onEvidence} className="inline-flex items-center gap-1 text-2xs font-medium text-brand-600 hover:text-brand-700">
              <FileText className="h-3 w-3" />
              {evidenceOpen ? 'Hide source' : 'Source passage'}
            </button>
            {canLocate && (
              <button onClick={onLocate} className="inline-flex items-center gap-1 text-2xs font-medium text-brand-600 hover:text-brand-700">
                <MapPin className="h-3 w-3" />
                Show on poster
              </button>
            )}
            {finding.suggestedFix && (
              <button onClick={onApplyFix} className="inline-flex items-center gap-1 text-2xs font-medium text-brand-600 hover:text-brand-700">
                <Wand2 className="h-3 w-3" />
                Apply fix
              </button>
            )}
            <button onClick={onException} className="inline-flex items-center gap-1 text-2xs font-medium text-muted hover:text-ink">
              <ArrowUpRight className="h-3 w-3" />
              Request exception
            </button>
          </div>

          {evidenceOpen && (
            <div className="animate-fade-in rounded-md border border-brand-100 bg-brand-50/40 p-2.5">
              <p className="text-2xs font-semibold text-brand-700">
                {finding.sourceDocName || 'Guideline document'} · {finding.sourceVersion} · p.{finding.sourcePage}
              </p>
              <p className="mt-1 border-l-2 border-brand-300 pl-2 text-xs italic leading-[18px] text-ink-600">“{finding.sourcePassage}”</p>
              {!finding.evidenceVerified && (
                <p className="mt-1 flex items-center gap-1 text-2xs font-medium text-warn-700">
                  <AlertTriangle className="h-3 w-3" />
                  Passage not verified — treat as needs review.
                </p>
              )}
            </div>
          )}

          {finding.suggestedFix && (
            <div className="rounded-md border border-success-100 bg-success-50/50 p-2.5">
              <p className="mb-1 flex items-center gap-1 text-2xs font-semibold uppercase tracking-[0.05em] text-success-700">
                <Sparkles className="h-3 w-3" />
                Suggested minimal fix
              </p>
              <p className="text-xs leading-[18px] text-danger-700 line-through decoration-danger-300">{finding.suggestedFix.original}</p>
              <p className="text-xs font-medium leading-[18px] text-success-700">{finding.suggestedFix.proposed}</p>
              <p className="mt-1 text-2xs leading-[16px] text-muted">{finding.suggestedFix.rationale}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function sameBox(a: ImageBox, b: ImageBox | null): boolean {
  return Boolean(b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h)
}

/**
 * `needs_review` is the engine's third outcome: a required fact was missing, so
 * the rule is neither a pass nor a fail. The API sends it as `outcome`; the
 * wording test remains only as a fallback for records stored before that field.
 */
function isUnknownFinding(f: Finding): boolean {
  if (f.outcome === 'needs_review') return true
  return /(could not be (?:read|measured|extracted|checked)|cannot be measured|no [a-z][a-z -]{0,40} was recorded|needs a human check)/i.test(
    f.explanation,
  )
}
