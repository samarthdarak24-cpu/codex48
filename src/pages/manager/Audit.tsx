import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock3, Download, FileText, Filter, ListChecks, ShieldCheck, XCircle } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { api } from '@/services/api'
import { PageHeader } from '@/components/layout/Shell'
import { Card, MetricCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchInput, Select } from '@/components/ui/Field'
import { DataTable, EmptyState, Pagination, type Column } from '@/components/ui/Table'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Misc'
import { ContentThumb } from '@/components/content/ContentThumb'
import { useToast } from '@/components/ui/Toast'
import { auditBreakdown, auditStats } from '@/lib/selectors'
import { cn, fmtDate, fmtDateTime, fmtTime, relative } from '@/lib/utils'
import type { AuditAction, AuditEvent } from '@/lib/types'

const PAGE_SIZE = 10

const ACTIONS: (AuditAction | 'All Actions')[] = [
  'All Actions',
  'Approved',
  'Rejected',
  'Exception',
  'Revised',
  'Rule updated',
  'Guideline updated',
  'Simulation',
  'Login',
]

const RANGES = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'All time']

const actionTone: Record<AuditEvent['status'], Tone> = {
  Approved: 'success',
  Rejected: 'danger',
  Exception: 'grape',
  Revised: 'brand',
  Recorded: 'neutral',
}

export default function AuditHistory() {
  const { audit, team, submissions, loading } = useData()
  const navigate = useNavigate()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [action, setAction] = useState<string>('All Actions')
  const [userId, setUserId] = useState('All Users')
  const [range, setRange] = useState('Last 30 Days')
  const [brand, setBrand] = useState('All Brands')
  const [page, setPage] = useState(1)

  const stats = auditStats(audit)
  const breakdown = auditBreakdown(audit)
  const submissionById = useMemo(() => new Map(submissions.map((s) => [s.id, s])), [submissions])

  /** Average hours between submission and its first recorded decision. */
  const avgReviewHours = useMemo(() => {
    const spans = submissions
      .map((s) => {
        const first = s.decisions[s.decisions.length - 1]
        if (!first) return null
        return (+new Date(first.createdAt) - +new Date(s.createdAt)) / 3600000
      })
      .filter((n): n is number => n !== null && n >= 0)
    if (!spans.length) return null
    return spans.reduce((a, b) => a + b, 0) / spans.length
  }, [submissions])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const cutoff =
      range === 'All time'
        ? 0
        : Date.now() - (range === 'Last 7 Days' ? 7 : range === 'Last 90 Days' ? 90 : 30) * 86400000
    return audit.filter((e) => {
      const actor = team.find((t) => t.id === e.userId)
      const matchesQuery =
        !q ||
        e.entityTitle.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q) ||
        (actor?.name.toLowerCase().includes(q) ?? false)
      const matchesAction = action === 'All Actions' || e.action === action
      const matchesUser = userId === 'All Users' || e.userId === userId
      const matchesBrand = brand === 'All Brands' || e.brand === brand
      const matchesRange = +new Date(e.at) >= cutoff
      return matchesQuery && matchesAction && matchesUser && matchesBrand && matchesRange
    })
  }, [audit, query, action, userId, range, brand, team])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function reset() {
    setQuery('')
    setAction('All Actions')
    setUserId('All Users')
    setRange('Last 30 Days')
    setBrand('All Brands')
    setPage(1)
  }

  async function download(format: 'csv' | 'json') {
    try {
      await api.downloadAudit(format)
      toast.success('Report exported', `Audit events written to ${format.toUpperCase()}.`)
    } catch (err) {
      // Never claim success we did not observe.
      toast.error('Export failed', err instanceof Error ? err.message : 'Please try again.')
    }
  }

  const exportCsv = () => void download('csv')
  const exportJson = () => void download('json')

  const columns: Column<AuditEvent>[] = [
    {
      key: 'date',
      header: 'Date & Time',
      width: '92px',
      cell: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-xs text-ink-600">{fmtDate(row.at)}</p>
          <p className="text-2xs text-muted-light">{fmtTime(row.at)}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      width: '104px',
      cell: (row) => (
        <Badge tone={actionTone[row.status]} size="sm">
          {row.action}
        </Badge>
      ),
    },
    {
      key: 'content',
      header: 'Content',
      width: '190px',
      cell: (row) => {
        const sub = row.entityKind === 'submission' ? submissionById.get(row.entityId) : undefined
        return (
          <div className="flex items-center gap-2">
            {row.thumb ? (
              <ContentThumb thumb={row.thumb} assetRef={sub?.assetRef} size={26} />
            ) : (
              <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-[#F2F7FD] text-brand-500">
                <FileText className="h-3 w-3" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-medium leading-[16px] text-ink">{row.entityTitle}</p>
              <p className="truncate text-2xs leading-[13px] text-muted">
                {row.brand} · {row.entityMeta}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'user',
      header: 'User',
      width: '118px',
      className: 'hidden lg:table-cell', headerClassName: 'hidden lg:table-cell',
      cell: (row) => {
        const actor = team.find((t) => t.id === row.userId)
        return (
          <div className="flex items-center gap-1.5">
            <Avatar initials={actor?.initials ?? '??'} tone={actor?.avatarTone} size="sm" />
            <p className="min-w-0 truncate text-xs font-medium text-ink">{actor?.name ?? 'Unknown'}</p>
          </div>
        )
      },
    },
    {
      key: 'details',
      header: 'Details',
      cell: (row) => (
        <span className="block truncate text-2xs text-muted" title={row.details}>
          {row.details || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '88px',
      cell: (row) => (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-2xs font-medium',
            row.status === 'Approved' && 'text-success-700',
            row.status === 'Rejected' && 'text-danger-700',
            row.status === 'Exception' && 'text-grape-700',
            row.status === 'Revised' && 'text-brand-700',
            row.status === 'Recorded' && 'text-muted',
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              row.status === 'Approved' && 'bg-success-500',
              row.status === 'Rejected' && 'bg-danger-500',
              row.status === 'Exception' && 'bg-grape-500',
              row.status === 'Revised' && 'bg-brand-500',
              row.status === 'Recorded' && 'bg-[#8C8578]',
            )}
          />
          {row.status}
        </span>
      ),
    },
    {
      key: 'view',
      header: '',
      width: '58px',
      align: 'right',
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (row.entityKind === 'submission') navigate(`/manager/queue/${row.entityId}`)
            else if (row.entityKind === 'exception') navigate('/manager/exceptions')
            else if (row.entityKind === 'simulation') navigate('/manager/sandbox')
            else navigate('/manager/guidelines')
          }}
          className="text-2xs font-medium text-brand-600 hover:text-brand-700"
        >
          View
        </button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Audit History"
        subtitle="Track all brand governance actions, decisions and changes across your content lifecycle."
        backTo="/manager/overview"
        backLabel="Back to Dashboard"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Total Actions" value={String(stats.total)} sub="All audit events" icon={<ListChecks className="h-4 w-4" />} tone="green" />
        <MetricCard label="Approvals" value={String(stats.approvals)} sub={`${stats.total ? Math.round((stats.approvals / stats.total) * 100) : 0}% of total`} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
        <MetricCard label="Rejections" value={String(stats.rejections)} sub={`${stats.total ? Math.round((stats.rejections / stats.total) * 100) : 0}% of total`} icon={<XCircle className="h-4 w-4" />} tone="amber" />
        <MetricCard label="Exceptions" value={String(stats.exceptions)} sub={`${stats.total ? Math.round((stats.exceptions / stats.total) * 100) : 0}% of total`} icon={<ShieldCheck className="h-4 w-4" />} tone="amber" />
        <MetricCard
          label="Avg. Review Time"
          value={avgReviewHours === null ? '—' : avgReviewHours.toFixed(1)}
          suffix="hrs"
          sub="From submission to decision"
          icon={<Clock3 className="h-4 w-4" />}
          tone="green"
        />
      </div>

      <div className="mt-4">
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Search by content title, brand, user, or action…" className="w-full sm:w-auto flex-1 min-w-[180px]" />
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }} className="h-[34px] flex-1 sm:flex-initial sm:w-auto min-w-[112px] py-0 text-xs">
                {ACTIONS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </Select>
              <Select value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1) }} className="h-[34px] flex-1 sm:flex-initial sm:w-auto min-w-[104px] py-0 text-xs">
                <option>All Users</option>
                {team.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
              <Select value={range} onChange={(e) => { setRange(e.target.value); setPage(1) }} className="h-[34px] flex-1 sm:flex-initial sm:w-auto min-w-[110px] py-0 text-xs">
                {RANGES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
              <button
                onClick={reset}
                aria-label="Reset filters"
                className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-line-strong bg-white text-ink-600 transition-colors hover:bg-[#F7FAFE]"
              >
                <Filter className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button className="w-full sm:w-auto sm:ml-auto" variant="outline" icon={<Download className="h-3.5 w-3.5" />} onClick={exportCsv} disabled={filtered.length === 0}>
              Export Report
            </Button>
          </div>

          <div className="flex items-center justify-between px-4 pb-1 pt-3">
            <h2 className="flex items-center gap-1.5 text-md font-semibold text-ink">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
              Audit Log
            </h2>
            <span className="text-2xs text-muted">{filtered.length} event{filtered.length === 1 ? '' : 's'}</span>
          </div>

          <DataTable
            columns={columns}
            rows={paged}
            loading={loading}
            minWidth="640px"
            getKey={(r) => r.id}
            dense
            empty={
              <EmptyState
                icon={<Filter className="h-5 w-5" />}
                title="No audit events match these filters"
                description="Audit records are append-only and generated by real operations. Try widening the date range."
                action={
                  <Button size="sm" variant="outline" onClick={reset}>
                    Reset filters
                  </Button>
                }
              />
            }
          />

          {filtered.length > PAGE_SIZE && (
            <div className="border-t border-line">
              <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} label="audit events" />
            </div>
          )}
        </Card>

      </div>
    </>
  )
}
