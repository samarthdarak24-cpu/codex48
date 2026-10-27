import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  History,
  MessageSquare,
  MoreHorizontal,
  Quote,
  Send,
  ShieldAlert,
  Sparkles,
  SquarePen,
  XCircle,
  Filter,
  Wand2,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { AttachedAsset } from '@/components/content/AttachedAsset'
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
import type { Finding, Submission } from '@/lib/types'

const PAGE_SIZE = 6

export default function ReviewFeedback() {
  const { user } = useAuth()
  const { submissions, rules, team, addComment, addVersion, requestException, loading } = useData()
  const navigate = useNavigate()
  const { id } = useParams()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Statuses')
  const [type, setType] = useState('All Types')
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<'details' | 'feedback' | 'history'>('details')
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
  const scrollRef = useRef<HTMLDivElement>(null)

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
  const selected = useMemo(() => mine.find((s) => s.id === id) ?? filtered[0] ?? mine[0], [mine, filtered, id])

  useEffect(() => {
    setTab('details')
    setOpenEvidence([])
  }, [selected?.id])

  const latest = selected?.versions[selected.versions.length - 1]
  const openFindings = selected?.findings.filter((f) => f.status === 'open') ?? []

  const columns: Column<Submission>[] = [
    {
      key: 'content',
      header: 'Content',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <ContentThumb thumb={row.thumb} assetRef={row.assetRef} size={30} />
          <div className="min-w-0">
            <p className="truncate text-base font-medium leading-[17px] text-ink">{row.title}</p>
            <p className="truncate text-2xs leading-[14px] text-muted">{row.excerpt}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '88px',
      className: 'hidden sm:table-cell', headerClassName: 'hidden sm:table-cell',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-ink-600">
          <FileIcon type={row.type} />
          {row.type}
        </span>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted On',
      width: '104px',
      className: 'hidden md:table-cell', headerClassName: 'hidden md:table-cell',
      cell: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-xs text-ink-600">{fmtDate(row.createdAt)}</p>
          <p className="text-2xs text-muted-light">{fmtTime(row.createdAt)}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status',
      width: '140px', cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      width: '92px',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <ViewButton onClick={() => navigate(`/app/feedback/${row.id}`)} />
          <button
            aria-label="More actions"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-7 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-[#F1F6FD] hover:text-ink"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  function postComment() {
    if (!selected || !comment.trim()) return
    addComment(selected.id, comment.trim())
    setComment('')
    setTab('feedback')
    toast.success('Comment added', 'Your brand manager will see this on the next review.')
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
        updated.issueCount === 0
          ? 'No guideline issues detected in this version.'
          : `${updated.issueCount} finding${updated.issueCount === 1 ? '' : 's'} remain. Review the evidence before resubmitting.`,
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

  const reviewer = selected ? team.find((t) => t.id === selected.decisions[0]?.reviewerId) : undefined

  return (
    <>
      <PageHeader
        title="Review & Feedback"
        subtitle="View comments, feedback and take action on your content."
        actions={
          <Button variant="outline" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => navigate('/app/new')}>
            New Content
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total Reviews" value={String(stats.total).padStart(2, '0')} sub="All submissions" icon={<MessageSquare className="h-4 w-4" />} tone="blue" />
        <MetricCard label="Approved" value={String(stats.approved).padStart(2, '0')} sub="No action needed" icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
        <MetricCard label="Changes Requested" value={String(stats.changesRequested).padStart(2, '0')} sub="Needs your attention" icon={<Clock3 className="h-4 w-4" />} tone="amber" />
        <MetricCard label="Declined" value={String(stats.declined).padStart(2, '0')} sub="Review completed" icon={<XCircle className="h-4 w-4" />} tone="rose" />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_382px]">
        {/* List */}
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Search by title, type, or status…" className="min-w-[160px]" />
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="h-[34px] w-auto min-w-[125px] py-0 text-xs">
              {['All Statuses', 'Pending', 'In Review', 'Ready for Approval', 'Changes Requested', 'Approved', 'Declined'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }} className="h-[34px] w-auto min-w-[105px] py-0 text-xs">
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
                title="Nothing to review here"
                description="Once you submit content, reviewer feedback will appear in this list."
              />
            }
          />

          {filtered.length > 0 && (
            <div className="border-t border-line">
              <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} label="submissions" />
            </div>
          )}
        </Card>

        {/* Detail */}
        <div className="xl:sticky xl:top-[80px]">
          {!selected ? (
            <Card className="p-6">
              <EmptyState
                title="Select a submission"
                description="Choose a submission from the list to see its findings, evidence and reviewer comments."
                compact
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {/* Header */}
              <div className="flex items-start gap-2.5 border-b border-line p-3.5">
                <Thumb spec={selected.thumb} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-md font-semibold leading-[19px] text-ink">{selected.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={selected.status} size="sm" />
                    <span className="text-2xs text-muted-light">
                      {selected.type} · {fmtDateTime(selected.createdAt)}
                    </span>
                  </div>
                </div>
                <Badge tone="neutral" dot={false} size="sm">
                  v{selected.version}
                </Badge>
              </div>

              {selected.assetRef && <AttachedAsset assetRef={selected.assetRef} className="mx-3.5 mt-3" />}

              <div className="px-3.5">
                <Tabs
                  items={[
                    { key: 'details', label: 'Details' },
                    { key: 'feedback', label: 'Feedback', count: selected.comments.length },
                    { key: 'history', label: 'History', count: selected.versions.length },
                  ]}
                  active={tab}
                  onChange={(k) => setTab(k as typeof tab)}
                  className="mt-1"
                />
              </div>

              <div className="relative">
                <div ref={scrollRef} className="max-h-[calc(100vh-330px)] overflow-y-auto px-3.5 py-3">
                {tab === 'details' && (
                  <div className="space-y-3">
                    {/* Preview */}
                    <div>
                      <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Content Preview</p>
                      <div className="overflow-hidden rounded-lg border border-line">
                        <div className="relative flex h-[132px] flex-col justify-between bg-gradient-to-br from-[#E8F5C8] via-[#D7EFB0] to-[#B9DE7E] p-2.5">
                          <div className="flex items-start justify-between">
                            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#2C4A1E]/70">{selected.brand}</p>
                            <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[8px] font-medium text-[#2C4A1E]/70">
                              {selected.channel}
                            </span>
                          </div>
                          <p className="line-clamp-4 text-[10px] leading-[14px] text-[#1F3D12]/85">{latest?.text}</p>
                        </div>
                      </div>
                    </div>

                    {/* Review summary */}
                    <div className="rounded-lg border border-line bg-[#FBFDFF] p-2.5">
                      <p className="mb-1.5 text-xs font-semibold text-ink">Review Summary</p>
                      {openFindings.length === 0 ? (
                        <p className="flex items-start gap-1.5 text-xs leading-[16px] text-success-700">
                          <CheckCircle2 className="mt-[1px] h-3.5 w-3.5 shrink-0" />
                          No open findings on version {selected.version}.
                        </p>
                      ) : (
                        <>
                          <p className="flex items-center gap-1.5 text-xs font-medium text-danger-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {openFindings.length} issue{openFindings.length === 1 ? '' : 's'} found
                          </p>
                          <ul className="mt-1 space-y-1">
                            {openFindings.map((f) => (
                              <li key={f.id} className="flex items-start gap-1.5 text-2xs leading-[15px] text-ink-600">
                                <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-danger-500" />
                                {f.explanation.split('.')[0]}.
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>

                    {/* Findings */}
                    {selected.findings.map((f) => {
                      const isOpen = openEvidence.includes(f.id)
                      return (
                        <div key={f.id} className="rounded-lg border border-line">
                          <div className="flex items-start gap-2 p-2.5">
                            <span
                              className={cn(
                                'mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full',
                                f.severity === 'High' ? 'bg-danger-500' : f.severity === 'Medium' ? 'bg-warn-500' : 'bg-brand-400',
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="text-xs font-semibold text-ink">{f.ruleTitle}</p>
                                <span className="rounded bg-[#F1ECE0] px-1 py-px text-[9px] font-semibold text-ink-600">{f.ruleCode}</span>
                                {f.status === 'resolved' && <Badge tone="success" size="sm">Resolved</Badge>}
                              </div>
                              <p className="mt-1 text-2xs leading-[15px] text-ink-600">{f.explanation}</p>

                              <button
                                onClick={() => setOpenEvidence((prev) => (isOpen ? prev.filter((x) => x !== f.id) : [...prev, f.id]))}
                                className="mt-1.5 inline-flex items-center gap-1 text-2xs font-medium text-brand-600 hover:text-brand-700"
                              >
                                <Quote className="h-2.5 w-2.5" />
                                {isOpen ? 'Hide source evidence' : 'View source evidence'}
                                <ChevronDown className={cn('h-2.5 w-2.5 transition-transform', isOpen && 'rotate-180')} />
                              </button>

                              {isOpen && (
                                <div className="mt-1.5 animate-fade-in rounded-md border border-brand-100 bg-brand-50/50 p-2">
                                  <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.05em] text-brand-700">
                                    <FileText className="h-2.5 w-2.5" />
                                    {f.sourceDocName || 'Guideline document'} · {f.sourceVersion} · p.{f.sourcePage}
                                  </p>
                                  <p className="mt-1 border-l-2 border-brand-300 pl-2 text-2xs italic leading-[16px] text-ink-600">
                                    “{f.sourcePassage}”
                                  </p>
                                  {!f.evidenceVerified && (
                                    <p className="mt-1 flex items-center gap-1 text-[9.5px] font-medium text-warn-700">
                                      <AlertTriangle className="h-2.5 w-2.5" />
                                      Source passage could not be verified — treat as needs review.
                                    </p>
                                  )}
                                </div>
                              )}

                              {f.suggestedFix && (
                                <div className="mt-1.5 rounded-md border border-success-100 bg-success-50/60 p-2">
                                  <p className="mb-1 flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.05em] text-success-700">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    Suggested minimal fix
                                  </p>
                                  <p className="text-2xs leading-[15px] text-danger-700 line-through decoration-danger-300">
                                    {f.suggestedFix.original}
                                  </p>
                                  <p className="text-2xs leading-[15px] font-medium text-success-700">{f.suggestedFix.proposed}</p>
                                  <p className="mt-0.5 text-[9.5px] leading-[13px] text-muted">{f.suggestedFix.rationale}</p>
                                  <div className="mt-1.5 flex gap-1.5">
                                    <Button size="xs" variant="subtle" icon={<Wand2 className="h-2.5 w-2.5" />} onClick={() => applyFix(f)}>
                                      Apply & edit
                                    </Button>
                                    <Button size="xs" variant="ghost" onClick={() => openException(f)}>
                                      Request exception
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {selected.decisions.length > 0 && (
                      <div className="rounded-lg border border-line p-2.5">
                        <p className="mb-1.5 text-xs font-semibold text-ink">Latest decision</p>
                        <div className="flex items-start gap-2">
                          <Avatar initials={reviewer?.initials ?? 'BM'} tone={reviewer?.avatarTone} size="sm" />
                          <div className="min-w-0">
                            <p className="text-2xs font-medium text-ink">
                              {reviewer?.name ?? 'Brand Manager'} · {selected.decisions[0].action} v{selected.decisions[0].version}
                            </p>
                            <p className="text-2xs leading-[15px] text-muted">{selected.decisions[0].note}</p>
                            <p className="mt-0.5 text-[9.5px] text-muted-light">{relative(selected.decisions[0].createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'feedback' && (
                  <div className="space-y-3">
                    {selected.comments.length === 0 && (
                      <EmptyState title="No comments yet" description="Reviewer comments will appear here." compact />
                    )}
                    {selected.comments.map((c) => {
                      const author = team.find((t) => t.id === c.authorId)
                      return (
                        <div key={c.id} className="flex items-start gap-2">
                          <Avatar initials={author?.initials ?? '??'} tone={author?.avatarTone} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-2xs font-semibold text-ink">
                              {author?.name ?? 'Unknown'}{' '}
                              <span className="font-normal text-muted-light">({author?.title ?? '—'})</span>
                            </p>
                            <p className="text-2xs text-muted-light">{fmtDateTime(c.createdAt)}</p>
                            <p className="mt-1 rounded-lg rounded-tl-none border border-line bg-[#FBFDFF] px-2.5 py-1.5 text-xs leading-[17px] text-ink-600">
                              {c.body}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {tab === 'history' && (
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Versions</p>
                      <ol className="space-y-2">
                        {[...selected.versions].reverse().map((v) => (
                          <li key={v.id} className="rounded-lg border border-line p-2.5">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-ink">Version {v.version}</p>
                              <span className="text-[9.5px] text-muted-light">{fmtDateTime(v.createdAt)}</span>
                            </div>
                            <p className="mt-0.5 text-2xs leading-[15px] text-muted">{v.note}</p>
                            <p className="mt-1 line-clamp-2 text-2xs leading-[15px] text-ink-600">{v.text}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                    {selected.decisions.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Decisions</p>
                        <ol className="space-y-1.5">
                          {selected.decisions.map((d) => (
                            <li key={d.id} className="flex items-start gap-2 text-2xs">
                              <span
                                className={cn(
                                  'mt-[4px] h-1.5 w-1.5 shrink-0 rounded-full',
                                  d.action === 'Approved' ? 'bg-success-500' : d.action === 'Declined' ? 'bg-danger-500' : 'bg-warn-500',
                                )}
                              />
                              <span className="min-w-0">
                                <span className="font-medium text-ink">
                                  {d.action} · v{d.version}
                                </span>
                                <span className="block leading-[15px] text-muted">{d.note}</span>
                                <span className="text-[9.5px] text-muted-light">{relative(d.createdAt)}</span>
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent" />
              </div>

              {/* Composer + actions */}
              <div className="border-t border-line p-3">
                <div className="relative">
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
                    className="pr-9 text-xs"
                  />
                  <button
                    onClick={postComment}
                    disabled={!comment.trim()}
                    aria-label="Send comment"
                    className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:bg-[#E2DCCB]"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" block icon={<SquarePen className="h-3 w-3" />} onClick={openEdit}>
                    Edit Content
                  </Button>
                  <Button size="sm" block variant="outline" icon={<ShieldAlert className="h-3 w-3" />} onClick={() => openException()}>
                    Request Exception
                  </Button>
                </div>
                {selected.status === 'Approved' && (
                  <p className="mt-2 flex items-center gap-1 text-[9.5px] leading-[13px] text-success-700">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Version {selected.version} is approved. Editing creates a new version that needs a fresh decision.
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit content"
        description={selected ? `Editing version ${selected.version} creates version ${selected.version + 1}. The previous approval does not carry over.` : undefined}
        width="max-w-xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} loading={busy} icon={<Send className="h-3.5 w-3.5" />}>
              Resubmit for Review
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Content text" htmlFor="edit-text" counter={<span className="text-2xs tabular-nums text-muted-light">{editText.length}/500</span>}>
            <Textarea id="edit-text" rows={7} maxLength={500} value={editText} onChange={(e) => setEditText(e.target.value)} />
          </Field>
          <Field label="Change note" hint="Shown in the version history and the audit trail." htmlFor="edit-note">
            <Input id="edit-note" value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="e.g. Updated background colour to green" />
          </Field>
        </div>
      </Modal>

      {/* Exception modal */}
      <Modal
        open={excOpen}
        onClose={() => setExcOpen(false)}
        title="Request an exception"
        description="A brand manager must decide. Exceptions apply only to the recorded scope and dates."
        footer={
          <>
            <Button variant="ghost" onClick={() => setExcOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitException} loading={busy} icon={<ArrowUpRight className="h-3.5 w-3.5" />}>
              Submit request
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Rule to exempt" htmlFor="f-exc-rule">
            <Select id="f-exc-rule" value={excRule} onChange={(e) => setExcRule(e.target.value)}>
              {rules.filter((r) => r.status === 'active').map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} · {r.title}
                </option>
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
