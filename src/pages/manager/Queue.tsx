import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Filter,
  Quote,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  XCircle,
  ListChecks,
} from 'lucide-react'
import { useData } from '@/context/DataContext'
import { AttachedAsset } from '@/components/content/AttachedAsset'
import { PageHeader } from '@/components/layout/Shell'
import { Card, MetricCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, SearchInput, Select, Textarea } from '@/components/ui/Field'
import { DataTable, EmptyState, Pagination, type Column } from '@/components/ui/Table'
import { PriorityBadge, StatusBadge, Badge } from '@/components/ui/Badge'
import { Avatar, Modal, Skeleton, Thumb } from '@/components/ui/Misc'
import { ContentThumb } from '@/components/content/ContentThumb'
import { useToast } from '@/components/ui/Toast'
import { FileIcon } from '@/pages/content/Overview'
import { awaitingDecision, priorityOf, submissionsWithExceptions } from '@/lib/selectors'
import { cn, fmtDateTime, relative } from '@/lib/utils'
import type { Priority, Submission } from '@/lib/types'

const PAGE_SIZE = 8

const CONTENT_TYPES = ['All', 'Image', 'Text', 'Document', 'URL'] as const
const STATUS_FILTERS = ['All', 'Pending', 'In Review', 'Ready for Approval', 'Approved', 'Changes Requested', 'Declined'] as const
const PRIORITIES = ['All', 'High', 'Medium', 'Low'] as const

export default function ReviewQueue() {
  const { submissions, exceptions, team, decideSubmission, approveAsset, loading } = useData()
  const navigate = useNavigate()
  const { id } = useParams()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [type, setType] = useState<string>('All')
  const [status, setStatus] = useState<string>('All')
  const [priority, setPriority] = useState<string>('All')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [openId, setOpenId] = useState<string | null>(id ?? null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [approvedAssets, setApprovedAssets] = useState<string[]>([])

  async function onApproveAsset(assetId: string) {
    try {
      await approveAsset(assetId)
      setApprovedAssets((prev) => [...prev, assetId])
      toast.success('Asset approved', 'The decision is recorded in the audit trail.')
    } catch {
      toast.error('Could not approve asset', 'Please try again.')
    }
  }
  const [bulkOpen, setBulkOpen] = useState(false)
  const [openEvidence, setOpenEvidence] = useState<string[]>([])

  useEffect(() => {
    if (id) setOpenId(id)
  }, [id])

  const queue = useMemo(() => awaitingDecision(submissions), [submissions])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = queue.filter((s) => {
      const creator = team.find((t) => t.id === s.creatorId)
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (creator?.name.toLowerCase().includes(q) ?? false)
      const matchesType = type === 'All' || s.type === type
      const matchesStatus = status === 'All' || s.status === status
      const matchesPriority = priority === 'All' || s.priority === priority
      return matchesQuery && matchesType && matchesStatus && matchesPriority
    })
    return rows.sort((a, b) => {
      if (sort === 'priority') {
        const w: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 }
        return w[a.priority] - w[b.priority]
      }
      if (sort === 'issues') return b.issueCount - a.issueCount
      if (sort === 'oldest') return +new Date(a.createdAt) - +new Date(b.createdAt)
      return +new Date(b.createdAt) - +new Date(a.createdAt)
    })
  }, [queue, query, type, status, priority, sort, team])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const active = submissions.find((s) => s.id === openId) ?? null

  function resetFilters() {
    setQuery('')
    setType('All')
    setStatus('All')
    setPriority('All')
    setSort('newest')
    setPage(1)
  }

  function decide(action: 'Approved' | 'Changes Requested' | 'Declined') {
    if (!active) return
    if (action !== 'Approved' && !note.trim()) {
      toast.error('Comment required', 'Explain what needs to change so the creator can act on it.')
      return
    }
    setBusy(true)
    decideSubmission(active.id, action, note.trim() || 'Approved — all findings resolved.')
    toast.success(
      `${action} · version ${active.version}`,
      'The decision is saved against this exact version and recorded in the audit trail.',
    )
    setBusy(false)
    setNote('')
    setOpenId(null)
    navigate('/manager/queue')
  }

  function bulkApprove() {
    const items = submissions.filter((s) => selectedIds.includes(s.id))
    setBusy(true)
    items.forEach((s) => decideSubmission(s.id, 'Approved', 'Bulk approved from the review queue.'))
    toast.success(`${items.length} submissions approved`, 'Each decision was recorded against its own version.')
    setBusy(false)
    setBulkOpen(false)
    setSelectedIds([])
  }

  const columns: Column<Submission>[] = [
    {
      key: 'content',
      header: 'Content',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <ContentThumb thumb={row.thumb} assetRef={row.assetRef} size={32} />
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
      width: '74px',
      className: 'hidden md:table-cell', headerClassName: 'hidden md:table-cell',
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
      width: '128px',
      className: 'hidden lg:table-cell', headerClassName: 'hidden lg:table-cell',
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
      width: '56px',
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
    { key: 'priority', header: 'Priority', width: '76px', className: 'hidden md:table-cell', headerClassName: 'hidden md:table-cell', cell: (row) => <PriorityBadge priority={row.priority} /> },
    { key: 'status', header: 'Status', width: '140px', cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      width: '78px',
      align: 'right',
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs"
          onClick={(e) => {
            e.stopPropagation()
            setOpenId(row.id)
          }}
        >
          Review
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Review Queue"
        subtitle="Review submitted content, check for brand violations and take action."
        backTo="/manager/overview"
        backLabel="Back to Dashboard"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="High Priority" value={String(priorityOf(queue, 'High')).padStart(2, '0')} sub="Needs immediate review" icon={<AlertTriangle className="h-4 w-4" />} tone="rose" />
        <MetricCard label="Pending Review" value={String(queue.length).padStart(2, '0')} sub="Awaiting your decision" icon={<Clock3 className="h-4 w-4" />} tone="amber" />
        <MetricCard label="Ready for Approval" value={String(queue.filter((s) => s.issueCount === 0).length).padStart(2, '0')} sub="No open issues" icon={<CheckCircle2 className="h-4 w-4" />} tone="blue" />
        <MetricCard label="With Exceptions" value={String(submissionsWithExceptions(submissions, exceptions)).padStart(2, '0')} sub="Requires special handling" icon={<ShieldAlert className="h-4 w-4" />} tone="purple" />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_272px]">
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Search by title, creator, or content ID…" className="w-full sm:w-auto flex-1 min-w-[170px]" />
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }} className="h-[34px] flex-1 sm:flex-initial sm:w-auto min-w-[118px] py-0 text-xs">
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === 'All' ? 'All Content Types' : t}
                  </option>
                ))}
              </Select>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="h-[34px] flex-1 sm:flex-initial sm:w-auto min-w-[110px] py-0 text-xs">
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'All' ? 'All Statuses' : s}
                  </option>
                ))}
              </Select>
              <button
                onClick={resetFilters}
                aria-label="Reset filters"
                className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-line-strong bg-white text-ink-600 transition-colors hover:bg-[#F7FAFE]"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={paged}
            loading={loading}
            minWidth="580px"
            getKey={(r) => r.id}
            onRowClick={(r) => setOpenId(r.id)}
            selectedIds={selectedIds}
            onToggleRow={(rid) => setSelectedIds((prev) => (prev.includes(rid) ? prev.filter((x) => x !== rid) : [...prev, rid]))}
            onToggleAll={(next) => setSelectedIds(next ? paged.map((r) => r.id) : [])}
            empty={
              <EmptyState
                icon={<ListChecks className="h-5 w-5" />}
                title={queue.length === 0 ? 'The queue is clear' : 'No items match these filters'}
                description={
                  queue.length === 0
                    ? 'Every submitted version has a recorded decision. New submissions will land here.'
                    : 'Reset the filters to see the full queue.'
                }
                action={
                  queue.length > 0 ? (
                    <Button size="sm" variant="outline" onClick={resetFilters}>
                      Reset filters
                    </Button>
                  ) : undefined
                }
              />
            }
          />

          {filtered.length > 0 && (
            <div className="border-t border-line">
              <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} label="items" />
            </div>
          )}
        </Card>

        {/* Rail */}
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-2.5 flex items-center gap-1.5 text-md font-semibold text-ink">
              <Filter className="h-3.5 w-3.5 text-brand-500" />
              Filter & Sort
            </h2>

            <Field label="Sort by" htmlFor="sort">
              <Select id="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="text-xs">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Priority</option>
                <option value="issues">Most issues</option>
              </Select>
            </Field>

            <ChipGroup label="Content Type" options={[...CONTENT_TYPES]} value={type} onChange={(v) => { setType(v); setPage(1) }} />
            <ChipGroup label="Status" options={['All', 'Pending', 'In Review', 'Ready for Approval', 'Changes Requested']} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />
            <ChipGroup label="Priority" options={[...PRIORITIES]} value={priority} onChange={(v) => { setPriority(v); setPage(1) }} />

            <button
              onClick={resetFilters}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filters
            </button>
          </Card>

          <Card className="p-4">
            <h2 className="mb-2.5 text-md font-semibold text-ink">Quick Stats</h2>
            <ul className="space-y-2">
              {[
                { label: 'High Priority', value: priorityOf(queue, 'High'), tone: 'bg-danger-50 text-danger-600', icon: AlertTriangle },
                { label: 'Pending Review', value: queue.length, tone: 'bg-warn-50 text-warn-600', icon: Clock3 },
                { label: 'Ready for Approval', value: queue.filter((s) => s.issueCount === 0).length, tone: 'bg-success-50 text-success-600', icon: CheckCircle2 },
                { label: 'With Exceptions', value: submissionsWithExceptions(submissions, exceptions), tone: 'bg-grape-50 text-grape-600', icon: ShieldAlert },
              ].map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', s.tone)}>
                    <s.icon className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 flex-1 text-xs text-ink-600">{s.label}</span>
                  <span className="text-sm font-semibold text-ink">{s.value}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="mb-2.5 flex items-center gap-1.5 text-md font-semibold text-ink">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              Actions
            </h2>
            <div className="space-y-1.5">
              <Button
                block
                size="sm"
                icon={<CheckCircle2 className="h-3 w-3" />}
                disabled={selectedIds.length === 0}
                onClick={() => setBulkOpen(true)}
              >
                Approve Selected {selectedIds.length > 0 && `(${selectedIds.length})`}
              </Button>
              <Button
                block
                size="sm"
                variant="outline"
                icon={<ShieldAlert className="h-3 w-3" />}
                onClick={() => navigate('/manager/exceptions')}
              >
                Request Exception
              </Button>
            </div>
            <p className="mt-2 text-[9.5px] leading-[13px] text-muted-light">
              Bulk approval records a separate decision for each selected version.
            </p>
          </Card>
        </div>
      </div>

      {/* Review modal */}
      <Modal
        open={Boolean(active)}
        onClose={() => {
          setOpenId(null)
          navigate('/manager/queue')
        }}
        title={active ? `Review · ${active.title}` : ''}
        description={active ? `Deciding on version ${active.version} · ${active.type} · ${active.channel}` : undefined}
        width="max-w-3xl"
        footer={
          active ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <span className="text-2xs text-muted">
                Decision is saved against <span className="font-semibold text-ink">version {active.version}</span> only.
              </span>
              <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                <Button size="sm" variant="outline" className="flex-1 sm:flex-initial" onClick={() => decide('Declined')} disabled={busy} icon={<XCircle className="h-3 w-3" />}>
                  Decline
                </Button>
                <Button size="sm" variant="outline" onClick={() => decide('Changes Requested')} disabled={busy} icon={<SquarePen className="h-3 w-3" />}>
                  Request Changes
                </Button>
                <Button size="sm" onClick={() => decide('Approved')} disabled={busy} icon={<CheckCircle2 className="h-3 w-3" />}>
                  Approve v{active.version}
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {active && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_228px]">
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Thumb spec={active.thumb} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-ink">{active.title}</p>
                  <p className="text-2xs text-muted">
                    {active.code} · submitted {fmtDateTime(active.createdAt)}
                  </p>
                </div>
                <StatusBadge status={active.status} />
              </div>

              {active.assetRef && (
                <div className="flex items-center gap-2">
                  <AttachedAsset assetRef={active.assetRef} className="flex-1" />
                  {approvedAssets.includes(active.assetRef.id) ? (
                    <span className="text-2xs font-medium text-success-600">Image approved</span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onApproveAsset(active.assetRef!.id)}>
                      Approve image
                    </Button>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-line bg-[#FAF7EF] p-2.5">
                <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Submitted copy</p>
                <p className="text-xs leading-[18px] text-ink-600">{active.versions[active.versions.length - 1]?.text}</p>
              </div>

              <div>
                <p className="mb-1.5 flex items-center justify-between text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                  Findings ({active.findings.length})
                  <span className="font-normal normal-case tracking-normal text-muted-light">
                    {active.findings.filter((f) => f.evidenceVerified).length} with verified evidence
                  </span>
                </p>
                {active.findings.length === 0 && (
                  <div className="rounded-lg border border-success-100 bg-success-50 px-3 py-2.5 text-xs text-success-700">
                    <CheckCircle2 className="mr-1 inline h-3 w-3" />
                    No guideline issues detected by the rule engine.
                  </div>
                )}
                <div className="space-y-2">
                  {active.findings.map((f) => {
                    const open = openEvidence.includes(f.id)
                    return (
                      <div key={f.id} className="rounded-lg border border-line p-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={cn('h-1.5 w-1.5 rounded-full', f.severity === 'High' ? 'bg-danger-500' : f.severity === 'Medium' ? 'bg-warn-500' : 'bg-brand-400')} />
                          <p className="text-xs font-semibold text-ink">{f.ruleTitle}</p>
                          <span className="rounded bg-[#F1ECE0] px-1 py-px text-[9px] font-semibold text-ink-600">{f.ruleCode}</span>
                          {!f.evidenceVerified && <Badge tone="warn" size="sm">Unverified</Badge>}
                        </div>
                        <p className="mt-1 text-2xs leading-[15px] text-ink-600">{f.explanation}</p>
                        <button
                          onClick={() => setOpenEvidence((prev) => (open ? prev.filter((x) => x !== f.id) : [...prev, f.id]))}
                          className="mt-1 inline-flex items-center gap-1 text-2xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          <Quote className="h-2.5 w-2.5" />
                          {open ? 'Hide evidence' : 'Show evidence'}
                          <ChevronDown className={cn('h-2.5 w-2.5 transition-transform', open && 'rotate-180')} />
                        </button>
                        {open && (
                          <div className="mt-1.5 rounded-md border border-brand-100 bg-brand-50/50 p-2">
                            <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.05em] text-brand-700">
                              <FileText className="h-2.5 w-2.5" />
                              {f.sourceDocName || 'Guideline'} · {f.sourceVersion} · p.{f.sourcePage}
                            </p>
                            <p className="mt-1 border-l-2 border-brand-300 pl-2 text-2xs italic leading-[16px] text-ink-600">
                              “{f.sourcePassage}”
                            </p>
                          </div>
                        )}
                        {f.suggestedFix && (
                          <div className="mt-1.5 rounded-md bg-[#FAF7EF] p-2 text-2xs leading-[15px]">
                            <span className="text-danger-600 line-through">{f.suggestedFix.original}</span>
                            <span className="mx-1 text-muted-light">→</span>
                            <span className="font-medium text-success-700">{f.suggestedFix.proposed}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Field label="Decision note" hint="Required for Request Changes and Decline." htmlFor="decision-note">
                <Textarea
                  id="decision-note"
                  rows={5}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Explain the decision so the creator knows exactly what to do next…"
                  className="text-xs"
                />
              </Field>

              <div className="rounded-lg border border-line bg-[#FBFDFF] p-2.5">
                <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Submission</p>
                <dl className="space-y-1 text-2xs">
                  <Row label="Creator" value={team.find((t) => t.id === active.creatorId)?.name ?? '—'} />
                  <Row label="Version" value={`v${active.version}`} />
                  <Row label="Issues" value={String(active.issueCount)} />
                  <Row label="Priority" value={active.priority} />
                  <Row label="Updated" value={relative(active.updatedAt)} />
                </dl>
              </div>

              <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-2.5">
                <p className="text-[9.5px] leading-[13px] text-brand-700/80">
                  Approving records your identity, the timestamp and version {active.version}. If the creator edits the
                  content, a new version must be approved separately.
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk approve confirm */}
      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title={`Approve ${selectedIds.length} submission${selectedIds.length === 1 ? '' : 's'}?`}
        description="Each item gets its own recorded decision against its current version."
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={bulkApprove} loading={busy} icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
              Approve {selectedIds.length}
            </Button>
          </>
        }
      >
        <ul className="max-h-56 space-y-1.5 overflow-y-auto">
          {submissions
            .filter((s) => selectedIds.includes(s.id))
            .map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5">
                <Thumb spec={s.thumb} size={24} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">{s.title}</span>
                <span className="text-2xs text-muted">v{s.version}</span>
                {s.issueCount > 0 && (
                  <span className="rounded-full bg-warn-50 px-1.5 text-[9.5px] font-semibold text-warn-700">
                    {s.issueCount} open
                  </span>
                )}
              </li>
            ))}
        </ul>
        {submissions.filter((s) => selectedIds.includes(s.id) && s.issueCount > 0).length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-warn-100 bg-warn-50 px-2.5 py-2 text-2xs leading-[15px] text-warn-700">
            <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" />
            Some selected items still have open findings. Approving them creates an exception-worthy record — consider
            requesting an exception instead.
          </p>
        )}
      </Modal>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate font-medium text-ink">{value}</dd>
    </div>
  )
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              'rounded-md px-2 py-1 text-2xs font-medium transition-colors',
              value === o ? 'bg-brand-500 text-white shadow-[0_1px_2px_rgba(15,33,56,.12)]' : 'bg-[#F3F7FD] text-ink-600 hover:bg-[#E9F1FC]',
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}
