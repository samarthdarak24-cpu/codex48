import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  BellOff,
  CheckCheck,
  Clock3,
  RefreshCw,
  ShieldAlert,
  Sparkles,
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
import { NOTIFICATION_TYPE_LABEL, notificationLink } from '@/lib/notificationLink'
import { cn, fmtDateTime, relative } from '@/lib/utils'
import type { AppNotification } from '@/lib/types'

const TYPE_TONE: Record<AppNotification['type'], 'brand' | 'warn' | 'success' | 'neutral'> = {
  sentinel_task: 'warn',
  exception_expiring: 'warn',
  decision: 'success',
  system: 'brand',
}

function TypeIcon({ type }: { type: AppNotification['type'] }) {
  const className = 'h-3.5 w-3.5'
  if (type === 'sentinel_task') return <ShieldAlert className={className} />
  if (type === 'exception_expiring') return <Clock3 className={className} />
  if (type === 'decision') return <CheckCheck className={className} />
  return <Sparkles className={className} />
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState<AppNotification[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setForbidden(false)
    api
      .notifications()
      .then((list) => {
        if (cancelled) return
        setItems(list)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 403) setForbidden(true)
        else setError(err instanceof Error ? err.message : 'Notifications could not be loaded.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [nonce])

  const unread = useMemo(() => (items ?? []).filter((n) => !n.isRead).length, [items])

  async function markAllRead() {
    setMarking(true)
    try {
      await api.markAllNotificationsRead()
      setItems((prev) =>
        prev?.map((n) => ({ ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() })) ?? prev,
      )
      toast.success('All notifications marked read', 'The unread badge will clear on the next poll.')
    } catch (err) {
      toast.error('Could not mark notifications read', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setMarking(false)
    }
  }

  function markOne(item: AppNotification) {
    if (item.isRead) return
    setItems((prev) =>
      prev?.map((n) => (n.id === item.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)) ?? prev,
    )
    void api.markNotificationRead(item.id).catch(() => undefined)
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Decisions, Sentinel reassessment tasks and exception reminders for your workspace."
        actions={
          <Button
            variant="outline"
            icon={<CheckCheck className="h-3.5 w-3.5" />}
            disabled={unread === 0 || loading || Boolean(forbidden)}
            loading={marking}
            onClick={() => void markAllRead()}
          >
            Mark all read
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <Bell className="h-3.5 w-3.5 text-brand-500" />
            All notifications
          </p>
          <p className="text-2xs text-muted">
            {loading ? 'Loading…' : `${unread} unread of ${items?.length ?? 0}`}
          </p>
        </div>

        {loading && (
          <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading notifications">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-line p-3">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && forbidden && (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-warn-50 text-warn-600">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <p className="text-base font-semibold text-ink">Notifications are not available to your role</p>
            <p className="mt-1 max-w-sm text-xs leading-[17px] text-muted">
              The server denied this request. Nothing is hidden on the client — ask a workspace administrator if you
              believe you should have access.
            </p>
          </div>
        )}

        {!loading && !forbidden && error && (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-danger-50 text-danger-600">
              <TriangleAlert className="h-5 w-5" />
            </span>
            <p className="text-base font-semibold text-ink">Could not load notifications</p>
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
        )}

        {!loading && !forbidden && !error && items && items.length === 0 && (
          <EmptyState
            icon={<BellOff className="h-5 w-5" />}
            title="No notifications yet"
            description="When a reviewer makes a decision, a rule change triggers Sentinel, or an exception is about to expire, it will appear here."
          />
        )}

        {!loading && !forbidden && !error && items && items.length > 0 && (
          <ul className="divide-line">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to={notificationLink(item, user?.role ?? 'creator')}
                  onClick={() => markOne(item)}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#F9FBFF]',
                    !item.isRead && 'bg-brand-50/40',
                  )}
                >
                  <span
                    className={cn(
                      'mt-[1px] flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                      item.isRead ? 'bg-[#F1F5FA] text-muted' : 'bg-brand-50 text-brand-600',
                    )}
                  >
                    <TypeIcon type={item.type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          'text-xs leading-[16px]',
                          item.isRead ? 'font-medium text-ink-600' : 'font-semibold text-ink',
                        )}
                      >
                        {item.title}
                      </span>
                      <Badge tone={TYPE_TONE[item.type]} size="sm">
                        {NOTIFICATION_TYPE_LABEL[item.type]}
                      </Badge>
                      {!item.isRead && (
                        <span className="rounded-full bg-brand-500 px-1.5 py-px text-[9px] font-semibold text-white">
                          Unread
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-2xs text-muted">
                      {item.createdAt ? `${relative(item.createdAt)} · ${fmtDateTime(item.createdAt)}` : 'No timestamp recorded'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
