import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Filter,
  MoreHorizontal,
  Plus,
  SlidersHorizontal,
  SquarePen,
  XCircle,
  Info,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { PageHeader } from '@/components/layout/Shell'
import { Card, MetricCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchInput, Select } from '@/components/ui/Field'
import { DataTable, EmptyState, Pagination, ViewButton, type Column } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { ContentThumb } from '@/components/content/ContentThumb'
import { FileIcon } from '@/pages/content/Overview'
import { auditStats, submissionStats } from '@/lib/selectors'
import { cn, fmtDate, fmtTime, relative } from '@/lib/utils'
import type { Submission, SubmissionStatus } from '@/lib/types'

const PAGE_SIZE = 6
const TYPES = ['All Types', 'Text', 'Image', 'Document', 'URL']
const STATUSES: (SubmissionStatus | 'All Statuses')[] = [
  'All Statuses',
  'Pending',
  'In Review',
  'Ready for Approval',
  'Changes Requested',
  'Approved',
  'Declined',
]

export default function MySubmissions() {
  const { user } = useAuth()
  const { submissions, audit, loading } = useData()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [type, setType] = useState('All Types')
  const [status, setStatus] = useState<string>(params.get('status') ?? 'All Statuses')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)

  const mine = useMemo(() => submissions.filter((s) => s.creatorId === user?.id), [submissions, user?.id])
  const stats = submissionStats(mine)

  const filtered = useMemo(() => {
    let rows = mine.filter((s) => {
      const q = query.trim().toLowerCase()
      const matchesQuery = !q || s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.excerpt.toLowerCase().includes(q)
      const matchesType = type === 'All Types' || s.type === type
      const matchesStatus = status === 'All Statuses' || s.status === status
      return matchesQuery && matchesType && matchesStatus
    })
    rows = rows.sort((a, b) => {
      if (sort === 'oldest') return +new Date(a.createdAt) - +new Date(b.createdAt)
      if (sort === 'title') return a.title.localeCompare(b.title)
      return +new Date(b.createdAt) - +new Date(a.createdAt)
    })
    return rows
  }, [mine, query, type, status, sort])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function applyStatus(next: string) {
    setStatus(next)
    setPage(1)
    if (next === 'All Statuses') {
      params.delete('status')
    } else {
      params.set('status', next)
    }
    setParams(params, { replace: true })
  }

  const recentActivity = useMemo(() => {
    const ids = new Set(mine.map((s) => s.id))
    return audit.filter((a) => ids.has(a.entityId)).slice(0, 4)
  }, [audit, mine])

  const columns: Column<Submission>[] = [
    {
      key: 'title',
      header: 'Title',
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
      width: '92px',
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
      width: '112px',
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
      width: '96px',
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

  return (
    <>
      <PageHeader
        title="My Submissions"
        subtitle="Track the status of your content and view feedback, comments and approvals."
        actions={
          <Button icon={<FilePlus2 className="h-3.5 w-3.5" />} onClick={() => navigate('/app/new')}>
            New Content
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_272px]">
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label="Total Submissions"
              value={String(stats.total).padStart(2, '0')}
              sub="All time"
              icon={<FilePlus2 className="h-4 w-4" />}
              tone="blue"
              onClick={() => applyStatus('All Statuses')}
            />
            <MetricCard
              label="Pending Review"
              value={String(stats.pending + stats.inReview + stats.readyForApproval).padStart(2, '0')}
              sub="Need attention"
              icon={<Clock3 className="h-4 w-4" />}
              tone="amber"
              onClick={() => applyStatus('Pending')}
            />
            <MetricCard
              label="Approved"
              value={String(stats.approved).padStart(2, '0')}
              sub="Ready to publish"
              icon={<CheckCircle2 className="h-4 w-4" />}
              tone="green"
              onClick={() => applyStatus('Approved')}
            />
            <MetricCard
              label="Changes Requested"
              value={String(stats.changesRequested).padStart(2, '0')}
              sub="Needs revision"
              icon={<SquarePen className="h-4 w-4" />}
              tone="rose"
              onClick={() => applyStatus('Changes Requested')}
            />
          </div>

          <Card>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
              <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Search by title, type, or status…" className="w-full sm:w-auto flex-1 min-w-[160px]" />
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }} className="h-[34px] flex-1 sm:flex-initial sm:w-auto min-w-[110px] py-0 text-xs">
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
                <Select value={status} onChange={(e) => applyStatus(e.target.value)} className="h-[34px] flex-1 sm:flex-initial sm:w-auto min-w-[130px] py-0 text-xs">
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
                <button
                  onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')}
                  aria-label="Toggle sort order"
                  title={`Sorted ${sort}`}
                  className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-line-strong bg-white text-ink-600 transition-colors hover:bg-[#F7FAFE]"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button className="w-full sm:w-auto sm:ml-auto" size="md" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate('/app/new')}>
                New Content
              </Button>
            </div>

            <DataTable
              columns={columns}
              rows={paged}
              loading={loading}
              minWidth="560px"
              getKey={(r) => r.id}
              onRowClick={(r) => navigate(`/app/feedback/${r.id}`)}
              empty={
                <EmptyState
                  icon={<Filter className="h-5 w-5" />}
                  title={mine.length === 0 ? 'No submissions yet' : 'No content matches these filters'}
                  description={
                    mine.length === 0
                      ? 'Submit your first piece of content to start a guideline review.'
                      : 'Try clearing the search or choosing a different status.'
                  }
                  action={
                    mine.length === 0 ? (
                      <Button size="sm" onClick={() => navigate('/app/new')}>
                        New Content
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setQuery('')
                          setType('All Types')
                          applyStatus('All Statuses')
                        }}
                      >
                        Clear filters
                      </Button>
                    )
                  }
                />
              }
            />

            {filtered.length > 0 && (
              <div className="border-t border-line">
                <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} label="submissions" />
              </div>
            )}
          </Card>
        </div>

        {/* Rail */}
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-2.5 text-md font-semibold text-ink">Quick Stats</h2>
            <ul className="space-y-0.5">
              {[
                { label: 'Total Submissions', value: stats.total, tone: 'bg-ink' },
                { label: 'Approved', value: stats.approved, tone: 'bg-success-500' },
                { label: 'Pending', value: stats.pending + stats.inReview, tone: 'bg-warn-500' },
                { label: 'Changes Requested', value: stats.changesRequested, tone: 'bg-brand-500' },
                { label: 'Declined', value: stats.declined, tone: 'bg-danger-500' },
              ].map((row) => (
                <li key={row.label}>
                  <button
                    onClick={() => navigate('/app/submissions')}
                    className="flex w-full items-center gap-2 rounded-lg px-1 py-[7px] text-left transition-colors hover:bg-[#FAF7EF]"
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', row.tone)} />
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-600">{row.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-ink">{row.value}</span>
                    <ArrowRight className="h-3 w-3 text-muted-light" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-md font-semibold text-ink">
                <Clock3 className="h-3.5 w-3.5 text-brand-500" />
                Recent Activity
              </h2>
            </div>
            <ul className="divide-line">
              {recentActivity.length === 0 && (
                <li className="px-4 py-3 text-xs text-muted">No activity recorded for your submissions yet.</li>
              )}
              {recentActivity.map((a) => (
                <li key={a.id} className="px-4 py-2.5">
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        'mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full',
                        a.status === 'Approved' && 'bg-success-500',
                        a.status === 'Rejected' && 'bg-danger-500',
                        a.status === 'Exception' && 'bg-grape-500',
                        a.status === 'Revised' && 'bg-brand-500',
                        a.status === 'Recorded' && 'bg-[#8C8578]',
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-xs leading-[16px] text-ink">{a.details}</p>
                      <p className="mt-0.5 text-2xs text-muted-light">{relative(a.at)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-brand-100 bg-brand-50/50 p-4">
            <h2 className="flex items-center gap-1.5 text-md font-semibold text-brand-800">Need help?</h2>
            <p className="mt-1 text-xs leading-[16px] text-brand-700/80">
              Check the Brand Guidelines or contact your brand manager for any questions.
            </p>
            <Button variant="outline" block size="sm" className="mt-2.5 bg-white" onClick={() => navigate('/app/guidelines')}>
              View Guidelines
            </Button>
          </Card>

          <p className="flex items-start gap-1.5 px-1 text-2xs leading-[15px] text-muted-light">
            <Info className="mt-[1px] h-3 w-3 shrink-0" />
            You only see submissions created by your account.
          </p>
        </div>
      </div>
    </>
  )
}
