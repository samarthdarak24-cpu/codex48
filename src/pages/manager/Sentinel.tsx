import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  Radar,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import { api, ApiError } from '@/services/api'
import { PageHeader } from '@/components/layout/Shell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Field, Textarea } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/Table'
import { Modal, Skeleton, Tabs } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { cn, fmtDate, relative } from '@/lib/utils'
import type { MonitoredPublication, ReassessmentTask, SentinelTrigger } from '@/lib/types'

type StatusFilter = 'open' | 'resolved'
type ResolveAction = 're_approve' | 'request_changes' | 'withdraw'

const TRIGGER_LABEL: Record<SentinelTrigger, string> = {
  rule_activated: 'Rule activated',
  rule_edited: 'Rule edited',
  rule_deactivated: 'Rule deactivated',
  exception_expired: 'Exception expired',
  exception_revoked: 'Exception revoked',
  claim_withdrawn: 'Claim withdrawn',
}

const RESOLUTIONS: Array<{ value: ResolveAction; label: string; description: string }> = [
  {
    value: 're_approve',
    label: 'Re-approve',
    description: 'The content still meets the new rule set. Record that a human checked it.',
  },
  {
    value: 'request_changes',
    label: 'Request changes',
    description: 'The content no longer complies. The creator must submit a new version.',
  },
  {
    value: 'withdraw',
    label: 'Withdraw',
    description: 'Take the content out of circulation until it can be reassessed.',
  },
]

const RESOLUTION_LABEL: Record<ResolveAction, string> = {
  re_approve: 'Re-approved',
  request_changes: 'Changes requested',
  withdraw: 'Withdrawn',
}

export default function SentinelPage() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const highlightedId = searchParams.get('task')

  const [status, setStatus] = useState<StatusFilter>('open')
  const [tasks, setTasks] = useState<ReassessmentTask[] | null>(null)
  const [pubs, setPubs] = useState<MonitoredPublication[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [nonce, setNonce] = useState(0)

  const [target, setTarget] = useState<ReassessmentTask | null>(null)
  const [action, setAction] = useState<ResolveAction>('re_approve')
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)

  /**
   * Manual scan. The backend runs the same idempotent service as the daily
   * scheduler, so pressing this twice cannot create duplicate tasks.
   */
  async function runScan() {
    setScanning(true)
    try {
      const result = await api.scanExpiring(30)
      toast.success(
        'Scan complete',
        result.notified > 0
          ? `${result.notified} expiry notice${result.notified === 1 ? '' : 's'} sent.`
          : 'No new expiries in the next 30 days.',
      )
      setNonce((n) => n + 1)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error('Not permitted', 'Only a brand manager can start a scan.')
      } else {
        toast.error('Scan failed', err instanceof Error ? err.message : 'Please try again.')
      }
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setForbidden(false)
    api
      .sentinelTasks(status)
      .then((list) => {
        if (cancelled) return
        setTasks(list)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 403) setForbidden(true)
        else setError(err instanceof Error ? err.message : 'Reassessment tasks could not be loaded.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [status, nonce])

  const overdue = useMemo(() => (tasks ?? []).filter((t) => t.isOverdue).length, [tasks])

  /* What Sentinel is watching. Loaded separately: a failure here must not hide
     the task list, which is the actionable part of the page. */
  useEffect(() => {
    let cancelled = false
    api
      .sentinelPublications('published', 8)
      .then((list) => {
        if (!cancelled) setPubs(list)
      })
      .catch(() => {
        if (!cancelled) setPubs([])
      })
    return () => {
      cancelled = true
    }
  }, [nonce])
  const ruleCodes = useMemo(() => {
    const set = new Set<string>()
    ;(tasks ?? []).forEach((t) => t.affectedRuleCodes.forEach((code) => set.add(code)))
    return set.size
  }, [tasks])

  function openResolve(task: ReassessmentTask) {
    setTarget(task)
    setAction('re_approve')
    setNote('')
    setNoteError(null)
    setResolveError(null)
  }

  async function submitResolution() {
    if (!target) return
    if (action !== 're_approve' && !note.trim()) {
      setNoteError('Add a note so the creator knows what happens next.')
      return
    }
    setBusy(true)
    setResolveError(null)
    try {
      await api.resolveTask(target.id, action, note.trim())
      toast.success(
        'Task resolved',
        `${target.submissionTitle} was marked ${RESOLUTION_LABEL[action].toLowerCase()}.`,
      )
      setTarget(null)
      setNonce((n) => n + 1)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setResolveError('Your role does not have permission to resolve this task.')
      } else {
        setResolveError(err instanceof Error ? err.message : 'The task could not be resolved. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Sentinel"
        subtitle="Reassessment tasks raised when a rule, exception or claim changes after content was approved."
        backTo="/manager/overview"
        backLabel="Back to Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50/60 px-2.5 py-1.5 text-xs font-medium text-brand-700 sm:inline-flex">
              <Radar className="h-3 w-3" />
              Runs daily · also on rule or exception changes
            </span>
            <Button
              size="sm"
              variant="outline"
              loading={scanning}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={runScan}
            >
              Scan now
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-2">
          <Tabs
            items={[
              { key: 'open', label: 'Open' },
              { key: 'resolved', label: 'Resolved' },
            ]}
            active={status}
            onChange={(key) => setStatus(key as StatusFilter)}
            className="min-w-[220px] flex-1"
          />
          <p className="pb-2.5 text-2xs text-muted">
            {loading
              ? 'Loading tasks…'
              : `${tasks?.length ?? 0} ${status} task${(tasks?.length ?? 0) === 1 ? '' : 's'} · ${overdue} overdue · ${ruleCodes} rule code${ruleCodes === 1 ? '' : 's'}`}
          </p>
        </div>
      </Card>

      {loading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading reassessment tasks">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/5" />
                  <Skeleton className="h-2.5 w-4/5" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && forbidden && (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-warn-50 text-warn-600">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <p className="text-base font-semibold text-ink">Sentinel is restricted to brand managers</p>
            <p className="mt-1 max-w-sm text-xs leading-[17px] text-muted">
              The server denied this request. Nothing is hidden on the client — ask a workspace administrator if you
              believe you should have access.
            </p>
          </div>
        </Card>
      )}

      {!loading && !forbidden && error && (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-danger-50 text-danger-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <p className="text-base font-semibold text-ink">Could not load reassessment tasks</p>
            <p role="alert" className="mt-1 max-w-sm text-xs leading-[17px] text-muted">
              {error}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => setNonce((n) => n + 1)}
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {!loading && !forbidden && !error && tasks && tasks.length === 0 && (
        <Card>
          <EmptyState
            icon={<Radar className="h-5 w-5" />}
            title={status === 'open' ? 'No open reassessment tasks' : 'No resolved tasks yet'}
            description={
              status === 'open'
                ? 'Nothing is waiting to be re-checked. Sentinel creates a task only when a rule, exception or claim change affects already-approved content.'
                : 'Once a manager resolves an open task, it will be recorded here with the resolution note.'
            }
          />
        </Card>
      )}

      {!loading && !forbidden && !error && tasks && tasks.length > 0 && (
        <div className="space-y-3">
          {tasks.map((task) => (
            <article
              key={task.id}
              className={cn(
                'rounded-xl border bg-white p-4 shadow-card',
                highlightedId === task.id ? 'border-brand-300 ring-2 ring-brand-500/15' : 'border-line',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    to={`/manager/queue/${task.submissionId}`}
                    className="text-md font-semibold text-ink transition-colors hover:text-brand-700"
                  >
                    {task.submissionTitle}
                  </Link>
                  <p className="mt-0.5 text-2xs text-muted">
                    {TRIGGER_LABEL[task.triggerType]}
                    {task.createdAt ? ` · raised ${relative(task.createdAt)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {task.isOverdue && (
                    <Badge tone="danger" size="sm">
                      Overdue
                    </Badge>
                  )}
                  <Badge tone={task.status === 'open' ? 'warn' : task.status === 'resolved' ? 'success' : 'neutral'} size="sm">
                    {task.status === 'open' ? 'Open' : task.status === 'resolved' ? 'Resolved' : 'Dismissed'}
                  </Badge>
                </div>
              </div>

              <p className="mt-2 text-xs leading-[18px] text-ink-600">{task.reason}</p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#F1ECE0] px-1.5 py-0.5 text-2xs font-semibold text-ink-600">
                  <FileText className="h-3 w-3" />
                  {task.affectedRuleCodes.length ? task.affectedRuleCodes.join(', ') : 'No rule code'}
                </span>
                <span className={cn('inline-flex items-center gap-1 text-2xs', task.isOverdue ? 'font-medium text-danger-700' : 'text-muted')}>
                  <CalendarClock className="h-3 w-3" />
                  {task.dueAt ? `Due ${fmtDate(task.dueAt)}` : 'No due date'}
                </span>
                <span className="inline-flex items-center gap-1 text-2xs text-muted">
                  <Clock3 className="h-3 w-3" />
                  {task.isOverdue ? 'Past due' : 'Re-check against the current rules'}
                </span>
              </div>

              {task.status !== 'open' && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-canvas/60 px-2.5 py-1.5">
                  {task.resolution === 'request_changes' ? (
                    <XCircle className="h-3 w-3 text-warn-600" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3 text-success-600" />
                  )}
                  <span className="text-xs font-medium text-ink">
                    {task.resolution ? task.resolution.replace(/_/g, ' ') : 'No resolution recorded'}
                  </span>
                  {task.resolvedAt && <span className="text-2xs text-muted">· {fmtDate(task.resolvedAt)}</span>}
                  {task.resolutionNote && <span className="min-w-0 flex-1 truncate text-2xs text-muted">· {task.resolutionNote}</span>}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
                <p className="text-2xs text-muted">
                  {task.triggerRef ? `Reference ${task.triggerRef}` : 'No trigger reference recorded'}
                </p>
                {task.status === 'open' && (
                  <Button size="sm" onClick={() => openResolve(task)} icon={<CheckCircle2 className="h-3 w-3" />}>
                    Resolve
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !forbidden && !error && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Radar className="h-3.5 w-3.5 text-brand-500" />
              Monitored publications
            </h2>
            <p className="text-2xs text-muted">
              {pubs === null
                ? 'Loading…'
                : `${pubs.length} published version${pubs.length === 1 ? '' : 's'} watched`}
            </p>
          </div>

          {pubs !== null && pubs.length === 0 && (
            <p className="px-4 py-4 text-xs leading-[17px] text-muted">
              Nothing has been published yet. Sentinel only re-checks versions that actually shipped — drafts nobody
              released are never queued.
            </p>
          )}

          {(pubs ?? []).map((pub) => (
            <div
              key={pub.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2.5 last:border-0"
            >
              <Link
                to={`/manager/queue/${pub.submissionId}`}
                className="min-w-0 flex-1 truncate text-xs font-medium text-ink transition-colors hover:text-brand-700"
              >
                {pub.title || 'Untitled version'}
              </Link>
              <span className="text-2xs text-muted">{pub.channel || 'No channel'}</span>
              <span className="text-2xs text-muted">{pub.publishedAt ? fmtDate(pub.publishedAt) : '—'}</span>
              {pub.openTasks > 0 ? (
                <Badge tone="warn" size="sm">
                  {pub.openTasks} to re-check
                </Badge>
              ) : (
                <Badge tone="success" size="sm">
                  Up to date
                </Badge>
              )}
            </div>
          ))}
        </Card>
      )}

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target ? `Resolve · ${target.submissionTitle}` : 'Resolve task'}
        description={
          target
            ? `${TRIGGER_LABEL[target.triggerType]} · ${target.affectedRuleCodes.join(', ') || 'no rule codes recorded'}`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={() => void submitResolution()} icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
              Resolve task
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-700">Resolution</p>
            <div className="space-y-1.5">
              {RESOLUTIONS.map((option) => {
                const selected = action === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setAction(option.value)
                      setNoteError(null)
                    }}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                      selected
                        ? 'border-brand-300 bg-brand-50/60 ring-1 ring-brand-500/15'
                        : 'border-line hover:border-brand-200 hover:bg-[#FBFDFF]',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-[3px] h-3 w-3 shrink-0 rounded-full border',
                        selected ? 'border-brand-500 bg-brand-500' : 'border-line-strong bg-white',
                      )}
                    />
                    <span className="min-w-0">
                      <span className={cn('block text-xs font-semibold', selected ? 'text-brand-700' : 'text-ink')}>
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-[9.5px] leading-[13px] text-muted">{option.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <Field
            label="Note"
            htmlFor="sentinel-note"
            required={action !== 're_approve'}
            error={noteError ?? undefined}
            hint="Recorded on the task and shown in the audit trail."
          >
            <Textarea
              id="sentinel-note"
              rows={4}
              value={note}
              invalid={Boolean(noteError)}
              onChange={(e) => {
                setNote(e.target.value)
                setNoteError(null)
              }}
              placeholder={
                action === 're_approve'
                  ? 'e.g. Re-checked against v2.1 — background and disclosure still compliant.'
                  : 'Explain what needs to change, or why the content is being withdrawn.'
              }
            />
          </Field>

          {resolveError && (
            <p role="alert" className="rounded-lg border border-danger-100 bg-danger-50 px-2.5 py-2 text-2xs leading-[15px] text-danger-700">
              {resolveError}
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}
