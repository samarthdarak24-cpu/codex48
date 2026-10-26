import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  HelpCircle,
  MoreHorizontal,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { useData } from '@/context/DataContext'
import { PageHeader, QuickAction, RailCard } from '@/components/layout/Shell'
import { Card, MetricCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, SearchInput, Select, Textarea } from '@/components/ui/Field'
import { DataTable, EmptyState, Pagination, type Column } from '@/components/ui/Table'
import { ExceptionBadge, Badge } from '@/components/ui/Badge'
import { Avatar, Donut, DonutLegend, Modal, Thumb } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { exceptionStats, expiringSoon } from '@/lib/selectors'
import { cn, daysUntil, fmtDate, fmtDateTime, relative } from '@/lib/utils'
import type { ExceptionRequest } from '@/lib/types'

const PAGE_SIZE = 8

export default function ExceptionsPage() {
  const { exceptions, submissions, rules, team, loading, decideException, requestException } = useData()
  const navigate = useNavigate()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Statuses')
  const [brand, setBrand] = useState('All Brands')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<ExceptionRequest | null>(null)
  const [conditions, setConditions] = useState('')
  const [busy, setBusy] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newRule, setNewRule] = useState('BR-01')
  const [newReason, setNewReason] = useState('')
  const [newScope, setNewScope] = useState('Campaign · single asset')
  const [newExpiry, setNewExpiry] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })

  const stats = exceptionStats(exceptions)
  const expiring = expiringSoon(exceptions)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = exceptions.filter((e) => {
      const requester = team.find((t) => t.id === e.requestedById)
      const matchesQuery =
        !q ||
        e.contentTitle.toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        (requester?.name.toLowerCase().includes(q) ?? false)
      const matchesStatus = status === 'All Statuses' || e.status === status
      const matchesBrand = brand === 'All Brands' || e.brand === brand
      return matchesQuery && matchesStatus && matchesBrand
    })
    return rows.sort((a, b) => (sort === 'oldest' ? +new Date(a.effectiveFrom) - +new Date(b.effectiveFrom) : +new Date(b.effectiveFrom) - +new Date(a.effectiveFrom)))
  }, [exceptions, query, status, brand, sort, team])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const segments = [
    { value: stats.approved, color: '#10B981', label: 'Approved' },
    { value: stats.pending, color: '#F0A32B', label: 'Pending' },
    { value: stats.inReview, color: '#2F6FED', label: 'In review' },
    { value: stats.rejected, color: '#EF4444', label: 'Rejected' },
    { value: stats.expired + stats.revoked, color: '#B7C4D6', label: 'Expired' },
  ]

  const recentActivity = useMemo(() => exceptions.slice(0, 4), [exceptions])

  const columns: Column<ExceptionRequest>[] = [
    {
      key: 'content',
      header: 'Content',
      width: '208px',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Thumb spec={row.thumb} size={32} />
          <div className="min-w-0">
            <p className="truncate text-base font-medium leading-[17px] text-ink">{row.contentTitle}</p>
            <p className="truncate text-2xs leading-[14px] text-muted">{row.contentMeta}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Brand',
      width: '84px',
      className: 'hidden md:table-cell', headerClassName: 'hidden md:table-cell',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-ink-600">
          <ShieldCheck className="h-3 w-3 text-success-500" />
          {row.brand}
        </span>
      ),
    },
    { key: 'reason', header: 'Reason', cell: (row) => <span className="line-clamp-2 text-xs leading-[16px] text-ink-600">{row.reason}</span> },
    {
      key: 'requester',
      header: 'Requested By',
      width: '144px',
      className: 'hidden lg:table-cell', headerClassName: 'hidden lg:table-cell',
      cell: (row) => {
        const requester = team.find((t) => t.id === row.requestedById)
        return (
          <div className="flex items-center gap-1.5">
            <Avatar initials={requester?.initials ?? '??'} tone={requester?.avatarTone} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium leading-[15px] text-ink">{requester?.name ?? 'Unknown'}</p>
              <p className="truncate text-2xs leading-[13px] text-muted-light">{requester?.title ?? '—'}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'expiry',
      header: 'Expiry Date',
      width: '90px',
      cell: (row) => {
        const days = daysUntil(row.expiresAt)
        return (
          <div className="whitespace-nowrap">
            <p className="text-xs text-ink-600">{fmtDate(row.expiresAt)}</p>
            <p
              className={cn(
                'text-2xs',
                row.status === 'Expired' ? 'text-muted-light' : days < 20 ? 'font-medium text-warn-600' : 'text-muted-light',
              )}
            >
              {row.status === 'Expired' ? 'passed' : days < 0 ? 'passed' : `in ${days} days`}
            </p>
          </div>
        )
      },
    },
    { key: 'status', header: 'Status', width: '92px', cell: (row) => <ExceptionBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      width: '70px',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              setDetail(row)
              setConditions(row.conditions)
            }}
          >
            View
          </Button>
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

  function decide(decision: 'Approved' | 'Rejected') {
    if (!detail) return
    if (decision === 'Approved' && daysUntil(detail.expiresAt) < 0) {
      toast.error('Cannot approve', 'This exception’s expiry date has already passed. Update the dates first.')
      return
    }
    setBusy(true)
    decideException(detail.id, decision, conditions)
    toast.success(`Exception ${decision.toLowerCase()}`, 'The decision, scope and expiry are recorded in the audit trail.')
    setBusy(false)
    setDetail(null)
  }

  async function createException() {
    if (!newContent) {
      toast.error('Select content', 'An exception must reference the content it applies to.')
      return
    }
    if (!newReason.trim()) {
      toast.error('Reason required', 'Explain why the content cannot follow the rule.')
      return
    }
    setBusy(true)
    try {
      await requestException({
        contentId: newContent,
        ruleCode: newRule,
        reason: newReason.trim(),
        scope: newScope,
        expiresAt: new Date(newExpiry).toISOString(),
      })
      toast.success('Exception requested', 'It now appears in the queue as Pending.')
      setCreateOpen(false)
      setNewReason('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Exceptions"
        subtitle="Manage brand policy exceptions, track their status and ensure proper approval and expiry."
        backTo="/manager/overview"
        backLabel="Back to Dashboard"
        actions={
          <Button icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>
            Request Exception
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total Exceptions" value={String(stats.total).padStart(2, '0')} sub="Across all brands" icon={<ShieldAlert className="h-4 w-4" />} tone="blue" />
        <MetricCard label="Active Exceptions" value={String(stats.active).padStart(2, '0')} sub="Currently in use" icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
        <MetricCard label="Pending Review" value={String(stats.pending + stats.inReview).padStart(2, '0')} sub="Awaiting decision" icon={<Clock3 className="h-4 w-4" />} tone="amber" />
        <MetricCard label="Expired" value={String(stats.expired + stats.revoked).padStart(2, '0')} sub="No longer valid" icon={<XCircle className="h-4 w-4" />} tone="purple" />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_286px]">
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Search by content title, brand, reason, or requester…" className="min-w-[190px]" />
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="h-[34px] w-auto min-w-[118px] py-0 text-xs">
              {['All Statuses', 'Pending', 'In Review', 'Approved', 'Rejected', 'Expired', 'Revoked'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Select value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1) }} className="h-[34px] w-auto min-w-[105px] py-0 text-xs">
              {['All Brands', 'PureGlow', 'WellnessLife'].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </Select>
            <Button className="ml-auto" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>
              Request Exception
            </Button>
          </div>

          <div className="flex items-center justify-between px-4 pb-1 pt-3">
            <h2 className="text-md font-semibold text-ink">Exception Requests</h2>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-7 w-auto min-w-[128px] py-0 text-2xs">
              <option value="newest">Sort by: Newest first</option>
              <option value="oldest">Sort by: Oldest first</option>
            </Select>
          </div>

          <DataTable
            columns={columns}
            rows={paged}
            loading={loading}
            getKey={(r) => r.id}
            onRowClick={(r) => {
              setDetail(r)
              setConditions(r.conditions)
            }}
            empty={
              <EmptyState
                icon={<ShieldAlert className="h-5 w-5" />}
                title={exceptions.length === 0 ? 'No exceptions requested' : 'No exceptions match these filters'}
                description={
                  exceptions.length === 0
                    ? 'When content cannot follow a rule, creators can request a scoped, time-limited exception here.'
                    : 'Try a different status or brand.'
                }
                action={
                  exceptions.length === 0 ? (
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      Request Exception
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => { setQuery(''); setStatus('All Statuses'); setBrand('All Brands') }}>
                      Clear filters
                    </Button>
                  )
                }
              />
            }
          />

          {filtered.length > PAGE_SIZE && (
            <div className="border-t border-line">
              <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} label="exceptions" />
            </div>
          )}
        </Card>

        {/* Rail */}
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-md font-semibold text-ink">
              <ShieldAlert className="h-3.5 w-3.5 text-brand-500" />
              Exception Summary
            </h2>
            <div className="flex items-center gap-3">
              <Donut size={92} thickness={10} segments={segments} centerValue={stats.total} centerLabel="Total" />
              <div className="min-w-0 flex-1">
                <DonutLegend segments={segments} total={stats.total} />
              </div>
            </div>
            {expiring.length > 0 && (
              <div className="mt-3 rounded-lg border border-warn-100 bg-warn-50 px-2.5 py-2">
                <p className="flex items-center gap-1.5 text-2xs font-semibold text-warn-700">
                  <CalendarClock className="h-3 w-3" />
                  {expiring.length} exception{expiring.length === 1 ? '' : 's'} expiring soon
                </p>
                <p className="mt-0.5 text-[9.5px] leading-[13px] text-warn-700/80">
                  Earliest: {expiring[0].code} on {fmtDate(expiring[0].expiresAt)}
                </p>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-1.5 text-md font-semibold text-ink">Quick Actions</h2>
            <div className="space-y-0.5">
              <QuickAction icon={<Plus className="h-3 w-3" />} label="Request New Exception" description="Submit a new exception request" onClick={() => setCreateOpen(true)} />
              <QuickAction icon={<FileText className="h-3 w-3" />} label="View Exception Templates" description="Use pre-approved templates" tone="success" onClick={() => setStatus('Approved')} />
              <QuickAction icon={<CalendarClock className="h-3 w-3" />} label="Manage Expiry Dates" description="Review upcoming expiries" tone="warn" onClick={() => setStatus('Approved')} />
            </div>
          </Card>

          <RailCard title="Recent Activity" icon={<Clock3 className="h-3.5 w-3.5" />} action={<span className="text-2xs text-muted">Latest</span>}>
            <ul className="space-y-2">
              {recentActivity.map((e) => {
                const requester = team.find((t) => t.id === e.requestedById)
                return (
                  <li key={e.id} className="flex items-start gap-2">
                    <span
                      className={cn(
                        'mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full',
                        e.status === 'Approved' && 'bg-success-500',
                        e.status === 'Pending' && 'bg-warn-500',
                        e.status === 'In Review' && 'bg-brand-500',
                        e.status === 'Rejected' && 'bg-danger-500',
                        (e.status === 'Expired' || e.status === 'Revoked') && 'bg-[#B7C4D6]',
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-xs leading-[15px] text-ink">
                        {requester?.name ?? 'Someone'} · {e.contentTitle}
                      </p>
                      <p className="text-2xs text-muted-light">
                        {e.status} · {relative(e.effectiveFrom)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </RailCard>

          <Card className="border-brand-100 bg-brand-50/50 p-4">
            <h2 className="flex items-center gap-1.5 text-md font-semibold text-brand-800">
              <HelpCircle className="h-3.5 w-3.5" />
              Need help?
            </h2>
            <p className="mt-1 text-xs leading-[16px] text-brand-700/80">
              Check the exception guidelines or contact your brand manager.
            </p>
            <Button variant="outline" size="sm" block className="mt-2.5 bg-white" onClick={() => navigate('/manager/guidelines')}>
              View Guidelines
            </Button>
          </Card>
        </div>
      </div>

      {/* Detail modal */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.code} · ${detail.contentTitle}` : ''}
        description={detail ? `${detail.brand} · ${detail.contentMeta}` : undefined}
        width="max-w-2xl"
        footer={
          detail ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <span className="text-2xs text-muted">
                Expires {fmtDate(detail.expiresAt)} · {daysUntil(detail.expiresAt) < 0 ? 'passed' : `${daysUntil(detail.expiresAt)} days left`}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => decide('Rejected')} disabled={busy} icon={<XCircle className="h-3 w-3" />}>
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => decide('Approved')}
                  disabled={busy || detail.status === 'Approved' || detail.status === 'Expired' || detail.status === 'Revoked'}
                  icon={<CheckCircle2 className="h-3 w-3" />}
                >
                  Approve exception
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detail && (
          <div className="space-y-3">
            {daysUntil(detail.expiresAt) < 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2">
                <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0 text-danger-600" />
                <p className="text-2xs leading-[15px] text-danger-700">
                  {detail.status === 'Expired'
                    ? `This exception expired on ${fmtDate(detail.expiresAt)}. It can no longer be applied to any review.`
                    : 'The recorded expiry date has passed. This exception can no longer be applied to reviews.'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Status', value: detail.status },
                { label: 'Rule', value: detail.ruleCode },
                { label: 'Effective', value: fmtDate(detail.effectiveFrom) },
                { label: 'Expires', value: fmtDate(detail.expiresAt) },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-line bg-[#FBFDFF] px-2.5 py-2">
                  <p className="text-2xs text-muted">{s.label}</p>
                  <p className="text-xs font-semibold text-ink">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-line p-2.5">
              <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Reason</p>
              <p className="mt-1 text-xs leading-[17px] text-ink-600">{detail.reason}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-2">
                <div>
                  <p className="text-2xs text-muted">Rule being qualified</p>
                  <p className="text-xs font-medium text-ink">{detail.ruleTitle}</p>
                </div>
                <div>
                  <p className="text-2xs text-muted">Scope</p>
                  <p className="text-xs font-medium text-ink">{detail.scope}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-line p-2.5">
                <p className="text-2xs text-muted">Requested by</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {(() => {
                    const u = team.find((t) => t.id === detail.requestedById)
                    return (
                      <>
                        <Avatar initials={u?.initials ?? '??'} tone={u?.avatarTone} size="sm" />
                        <span className="text-xs font-medium text-ink">{u?.name ?? 'Unknown'}</span>
                      </>
                    )
                  })()}
                </div>
              </div>
              <div className="rounded-lg border border-line p-2.5">
                <p className="text-2xs text-muted">Decided by</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {(() => {
                    const u = team.find((t) => t.id === detail.decidedById)
                    return u ? (
                      <>
                        <Avatar initials={u.initials} tone={u.avatarTone} size="sm" />
                        <span className="text-xs font-medium text-ink">{u.name}</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted">Awaiting decision</span>
                    )
                  })()}
                </div>
              </div>
            </div>

            {detail.decidedAt && (
              <p className="text-2xs text-muted-light">Decision recorded {fmtDateTime(detail.decidedAt)}</p>
            )}

            <Field label="Conditions attached to this approval" htmlFor="exc-conditions" hint="Conditions travel with the exception and are shown to reviewers.">
              <Textarea
                id="exc-conditions"
                rows={3}
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="e.g. Applies to the hero banner only; claim must be removed in paid media."
                className="text-xs"
                disabled={detail.status === 'Approved' || detail.status === 'Rejected'}
              />
            </Field>

            <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-2.5">
              <p className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-[0.05em] text-brand-700">
                <Sparkles className="h-2.5 w-2.5" />
                Enforcement
              </p>
              <p className="mt-1 text-[9.5px] leading-[14px] text-brand-700/80">
                The backend validates scope and expiry on every review. An expired or out-of-scope exception is never
                accepted as a valid override — even if the interface is manipulated.
              </p>
            </div>

            {detail.status === 'Approved' && detail.conditions && (
              <div className="flex items-start gap-2 rounded-lg border border-success-100 bg-success-50 px-3 py-2">
                <Badge tone="success">Approved</Badge>
                <p className="text-2xs leading-[15px] text-success-700">{detail.conditions}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Request an exception"
        description="Exceptions are scoped and time-limited. A manager decision is still required."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createException} loading={busy} icon={<ArrowRight className="h-3.5 w-3.5" />}>Submit request</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Content" required htmlFor="n-content">
            <Select id="n-content" value={newContent} onChange={(e) => setNewContent(e.target.value)}>
              <option value="">Select a submission…</option>
              {submissions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} (v{s.version})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Rule to qualify" htmlFor="n-rule">
            <Select id="n-rule" value={newRule} onChange={(e) => setNewRule(e.target.value)}>
              {rules.filter((r) => r.status === 'active').map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} · {r.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reason" required htmlFor="n-reason">
            <Textarea id="n-reason" rows={3} value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Why can’t this content follow the rule?" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Scope" htmlFor="n-scope">
              <Input id="n-scope" value={newScope} onChange={(e) => setNewScope(e.target.value)} />
            </Field>
            <Field label="Expires on" htmlFor="n-expiry">
              <Input id="n-expiry" type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} />
            </Field>
          </div>
        </div>
      </Modal>
    </>
  )
}
