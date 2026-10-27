import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FilePlus2,
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
import { StatusBadge } from '@/components/ui/Badge'
import { ContentThumb } from '@/components/content/ContentThumb'
import { RailCard } from '@/components/layout/Shell'
import { complianceSplit, openFindings, submissionStats } from '@/lib/selectors'
import { cn, fmtShort, relative } from '@/lib/utils'
import type { Submission } from '@/lib/types'

export default function CreatorOverview() {
  const { user } = useAuth()
  const { submissions, rules, exceptions, loading } = useData()
  const navigate = useNavigate()

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

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-ink">
            {greeting}, {user?.name.split(' ')[0]}!
          </h1>
          <p className="mt-1 text-base text-muted">Keep every campaign aligned with your brand.</p>
        </div>
        <Button size="md" icon={<FilePlus2 className="h-3.5 w-3.5" />} onClick={() => navigate('/app/new')}>
          New Content
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_268px]">
        <div className="min-w-0 space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_268px]">
            <div className="min-w-0 space-y-4">
              {/* Recent content */}
              <Card>
                <CardHeader title="Recent Content" action={<ViewAll onClick={() => navigate('/app/submissions')} />} />
                <DataTable
                  columns={columns}
                  rows={recent}
                  loading={loading}
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

              {/* Quick actions */}
              <Card className="p-4">
                <h2 className="mb-2.5 flex items-center gap-1.5 text-md font-semibold text-ink">
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                  Quick actions
                </h2>
                <div className="space-y-1.5">
                  <Button block icon={<FilePlus2 className="h-3.5 w-3.5" />} onClick={() => navigate('/app/new')}>
                    New Content
                  </Button>
                  <Button block variant="outline" icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={() => navigate('/app/feedback')}>
                    Check Content
                  </Button>
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

          <Card className="border-brand-100 bg-brand-50/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Tip
            </p>
            <p className="mt-1 text-xs leading-[17px] text-brand-700/80">
              Every finding links to the exact guideline passage it came from. Open a submission to see the source
              evidence before you edit.
            </p>
          </Card>
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
