import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Inbox,
  MessageSquarePlus,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react'
import { api, ApiError } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/layout/Shell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Table'
import { Skeleton } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { cn, relative, fmtDateTime } from '@/lib/utils'
import type { ReassessmentTask, SentinelTrigger } from '@/lib/types'

const TRIGGER_LABEL: Record<SentinelTrigger, string> = {
  rule_activated: 'Rule activated',
  rule_edited: 'Rule edited',
  rule_deactivated: 'Rule deactivated',
  exception_expired: 'Exception expired',
  exception_revoked: 'Exception revoked',
  claim_withdrawn: 'Claim withdrawn',
}

function statusTone(status: ReassessmentTask['status']): 'warn' | 'success' | 'neutral' {
  if (status === 'open') return 'warn'
  if (status === 'resolved') return 'success'
  return 'neutral'
}

function TaskCard({
  task,
  onExplained,
}: {
  task: ReassessmentTask
  onExplained: (submissionId: string) => void
}) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')

  async function submitNote() {
    const body = note.trim()
    if (!body || !task.submissionId) return
    setBusy(true)
    try {
      await api.addComment(task.submissionId, `Reassessment note (${TRIGGER_LABEL[task.triggerType]}): ${body}`)
      onExplained(task.submissionId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save your note.')
    } finally {
      setBusy(false)
      setShowNote(false)
      setNote('')
    }
  }

  const open = task.status === 'open'

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(task.status)}>
              {task.status === 'open' ? 'Action required' : task.status === 'resolved' ? 'Resolved' : 'Dismissed'}
            </Badge>
            <Badge tone="brand" dot={false}>
              {TRIGGER_LABEL[task.triggerType]}
            </Badge>
            {task.isOverdue && open && (
              <Badge tone="danger" dot={false}>
                Overdue
              </Badge>
            )}
          </div>
          <button
            onClick={() => task.submissionId && navigate(`/app/feedback/${task.submissionId}`)}
            className="mt-1.5 block text-left text-base font-semibold text-ink hover:text-brand-700"
          >
            {task.submissionTitle}
          </button>
          {task.affectedRuleCodes?.length > 0 && (
            <p className="mt-0.5 text-2xs text-muted">
              Affected rule(s): {task.affectedRuleCodes.join(', ')}
            </p>
          )}
        </div>
        {task.dueAt && open && (
          <span className="inline-flex items-center gap-1 text-2xs text-muted">
            <Clock3 className="h-3 w-3" />
            {relative(task.dueAt)}
          </span>
        )}
      </div>

      <div className="px-4 py-3">
        <p className="text-sm leading-[18px] text-ink-600">{task.reason}</p>

        {task.status === 'resolved' && (
          <div className="mt-3 rounded-lg border border-success-100 bg-success-50/60 px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-success-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolved {task.resolvedAt ? `· ${fmtDateTime(task.resolvedAt)}` : ''}
            </p>
            {task.resolutionNote && <p className="mt-1 text-2xs text-ink-600">{task.resolutionNote}</p>}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            icon={<ArrowRight className="h-3.5 w-3.5" />}
            disabled={!task.submissionId}
            onClick={() => task.submissionId && navigate(`/app/feedback/${task.submissionId}`)}
          >
            Open submission
          </Button>
          {open && (
            <Button
              size="sm"
              variant="outline"
              icon={<MessageSquarePlus className="h-3.5 w-3.5" />}
              onClick={() => setShowNote((v) => !v)}
            >
              Add explanation
            </Button>
          )}
        </div>

        {showNote && (
          <div className="mt-3 rounded-lg border border-line bg-canvas/40 p-2.5">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Explain the change you made or why this content is compliant…"
              className="w-full resize-y rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink placeholder:text-muted-light focus:border-brand-300 focus:outline-none focus:ring-[3px] focus:ring-brand-500/10"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button size="xs" variant="ghost" onClick={() => setShowNote(false)}>
                Cancel
              </Button>
              <Button size="xs" variant="primary" loading={busy} onClick={() => void submitNote()}>
                Save note
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function ReassessmentPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [tasks, setTasks] = useState<ReassessmentTask[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [filter, setFilter] = useState<'open' | 'all'>('open')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setForbidden(false)
    api
      .sentinelTasks(undefined, true)
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
  }, [nonce])

  const openCount = useMemo(() => (tasks ?? []).filter((t) => t.status === 'open').length, [tasks])
  const visible = useMemo(
    () => (tasks ?? []).filter((t) => (filter === 'open' ? t.status === 'open' : true)),
    [tasks, filter],
  )

  return (
    <>
      <PageHeader
        title="Reassessment Tasks"
        subtitle="Sentinel monitors approved content. When a rule, exception, claim or guideline changes, affected items land here for your review."
        actions={
          <Button
            variant="outline"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => setNonce((n) => n + 1)}
          >
            Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
          {(['open', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                filter === f ? 'bg-brand-50 text-brand-700' : 'text-muted hover:text-ink',
              )}
            >
              {f === 'open' ? `Open (${openCount})` : 'All'}
            </button>
          ))}
        </div>
        <span className="text-2xs text-muted">
          Tasks are scoped to you and your workspace. Only a Brand Manager can close a task.
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <ShieldAlert className="h-3.5 w-3.5 text-brand-500" />
            {filter === 'open' ? 'Open reassessment tasks' : 'All reassessment tasks'}
          </p>
        </div>

        {loading && (
          <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading reassessment tasks">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-line p-3">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && forbidden && (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-warn-50 text-warn-600">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <p className="text-base font-semibold text-ink">Reassessment tasks are not available to your role</p>
            <p className="mt-1 max-w-sm text-xs leading-[17px] text-muted">
              The server denied this request. Nothing is hidden on the client.
            </p>
          </div>
        )}

        {!loading && !forbidden && error && (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-danger-50 text-danger-600">
              <TriangleAlert className="h-5 w-5" />
            </span>
            <p className="text-base font-semibold text-ink">Could not load reassessment tasks</p>
            <p role="alert" className="mt-1 max-w-sm text-xs leading-[17px] text-muted">
              {error}
            </p>
            <Button size="sm" variant="outline" className="mt-3" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setNonce((n) => n + 1)}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !forbidden && !error && visible.length === 0 && (
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            title={filter === 'open' ? 'No open reassessment tasks' : 'No reassessment tasks yet'}
            description={
              filter === 'open'
                ? 'Great — nothing in your scope needs re-review right now. New tasks appear automatically when a relevant policy changes.'
                : 'When a rule, exception, claim or guideline changes, affected approved content will be listed here.'
            }
          />
        )}

        {!loading && !forbidden && !error && visible.length > 0 && (
          <div className="divide-line">
            {visible.map((task) => (
              <div key={task.id} className="border-b border-line last:border-b-0 p-3">
                <TaskCard task={task} onExplained={() => toast.success('Note saved', 'Your explanation was added to the submission thread.')} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {!loading && !forbidden && user && (
        <p className="mt-3 text-2xs text-muted">
          Signed in as {user.name} · {user.role}. Notifications for these tasks also appear in your bell and the Notifications screen.
        </p>
      )}
    </>
  )
}
