import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, RefreshCw, ShieldAlert } from 'lucide-react'
import { api, ApiError } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { Skeleton } from '@/components/ui/Misc'
import { Button } from '@/components/ui/Button'
import { notificationLink } from '@/lib/notificationLink'
import { cn, relative } from '@/lib/utils'
import type { AppNotification } from '@/lib/types'

/**
 * Topbar bell. Polls the unread count every 30 seconds and loads the latest
 * five notifications when opened. Escape and outside clicks close the panel.
 */
export function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const panelId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [countUnavailable, setCountUnavailable] = useState(false)
  const [items, setItems] = useState<AppNotification[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    let inFlight = false

    async function poll() {
      if (inFlight) return
      inFlight = true
      try {
        const result = await api.unreadCount()
        if (cancelled) return
        setCount(result.count)
        setCountUnavailable(false)
        setForbidden(false)
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true)
          if (timer !== undefined) window.clearInterval(timer)
        } else {
          setCountUnavailable(true)
        }
      } finally {
        inFlight = false
      }
    }

    timer = window.setInterval(() => {
      void poll()
    }, 30000)
    void poll()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .notifications()
      .then((list) => {
        if (cancelled) return
        setItems(list.slice(0, 5))
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
  }, [open, nonce])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function openNotification(item: AppNotification) {
    setOpen(false)
    if (!item.isRead) {
      setItems((prev) => prev?.map((n) => (n.id === item.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)) ?? prev)
      setCount((prev) => Math.max(0, prev - 1))
      void api.markNotificationRead(item.id).catch(() => undefined)
    }
    navigate(notificationLink(item, user?.role ?? 'creator'))
  }

  const badgeLabel = count > 99 ? '99+' : String(count)

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          count > 0
            ? `Notifications, ${count} unread`
            : countUnavailable
              ? 'Notifications, unread count unavailable'
              : 'Notifications'
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-[#F2F7FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Bell className="h-[17px] w-[17px]" strokeWidth={1.9} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#F0453F] px-1 text-[9px] font-semibold leading-none text-white ring-2 ring-white">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="menu"
          aria-label="Latest notifications"
          className="absolute right-0 top-11 z-40 w-[320px] max-w-[calc(100vw-24px)] animate-pop-in rounded-xl border border-line bg-white p-1.5 shadow-lift"
        >
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Notifications</p>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-2xs font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              View all
            </Link>
          </div>

          {loading && (
            <div className="space-y-1.5 px-1.5 pb-1.5" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!loading && forbidden && (
            <div className="flex items-start gap-2 px-2.5 py-3">
              <ShieldAlert className="mt-[1px] h-3.5 w-3.5 shrink-0 text-warn-600" />
              <p className="text-2xs leading-[15px] text-muted">
                Your role does not have access to notifications in this workspace.
              </p>
            </div>
          )}

          {!loading && !forbidden && error && (
            <div className="px-2.5 py-3">
              <p role="alert" className="text-2xs leading-[15px] text-danger-600">
                {error}
              </p>
              <Button
                size="xs"
                variant="outline"
                className="mt-1.5"
                icon={<RefreshCw className="h-3 w-3" />}
                onClick={() => setNonce((n) => n + 1)}
              >
                Retry
              </Button>
            </div>
          )}

          {!loading && !forbidden && !error && items && items.length === 0 && (
            <div className="px-2.5 py-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
                <CheckCheck className="h-3.5 w-3.5 text-success-500" />
                You are up to date
              </p>
              <p className="mt-0.5 text-2xs leading-[15px] text-muted">
                Decisions, Sentinel tasks and exception reminders will appear here.
              </p>
            </div>
          )}

          {!loading && !forbidden && !error && items && items.length > 0 && (
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openNotification(item)}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[#F5F9FE]',
                      !item.isRead && 'bg-brand-50/50',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full',
                        item.isRead ? 'bg-[#D5DCE6]' : 'bg-brand-500',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium leading-[15px] text-ink">{item.title}</span>
                      <span className="mt-0.5 block text-[9.5px] leading-[13px] text-muted">
                        {item.createdAt ? relative(item.createdAt) : 'Just now'}
                      </span>
                    </span>
                    {!item.isRead && (
                      <span className="mt-[2px] rounded-full bg-brand-50 px-1.5 py-px text-[9px] font-semibold text-brand-700">
                        New
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-1 border-t border-line px-2.5 py-2">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-2xs font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              Open the full notification list
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
