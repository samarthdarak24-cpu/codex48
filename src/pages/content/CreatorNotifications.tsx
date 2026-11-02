import React, { useState } from 'react'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CreatorNotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'Review Decision: Changes Requested',
      message: 'David Kim requested revisions on "PureGlow Anti-Aging Serum Copy": Remove superlative claim 100% safe.',
      type: 'decision',
      read: false,
      created_at: '2026-11-02T10:15:00Z',
    },
    {
      id: 'notif-2',
      title: 'Sentinel Reassessment Alert',
      message: 'Rule CL-04 has been updated. Review task assigned for Summer Glow Instagram Ad.',
      type: 'sentinel',
      read: false,
      created_at: '2026-11-01T14:30:00Z',
    },
    {
      id: 'notif-3',
      title: 'Submission Approved',
      message: 'Your poster "PureGlow Vitamin C Boost" (v2) has been approved by Brand Management.',
      type: 'approval',
      read: true,
      created_at: '2026-10-28T09:00:00Z',
    },
  ])

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markItemRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.read : true))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest text-muted uppercase">NOTIFICATION CENTER</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink mt-0.5">Notifications</h1>
          <p className="text-sm text-muted">
            Governance decisions, review feedback, and Sentinel alerts in real time.
          </p>
        </div>

        <button
          onClick={markAllRead}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink shadow-xs hover:bg-stone-50"
        >
          <Check className="h-4 w-4 text-emerald-600" />
          <span>Mark All Read</span>
        </button>
      </div>

      <div className="rounded-xl border border-line bg-white shadow-card overflow-hidden">
        <div className="flex border-b border-line bg-stone-50/60 px-4">
          <button
            onClick={() => setFilter('all')}
            className={cn('border-b-2 px-3 py-2.5 text-xs font-semibold', filter === 'all' ? 'border-[#1C3A27] text-ink font-bold' : 'border-transparent text-muted')}
          >
            All Notifications
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn('border-b-2 px-3 py-2.5 text-xs font-semibold', filter === 'unread' ? 'border-[#1C3A27] text-ink font-bold' : 'border-transparent text-muted')}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
        </div>

        <div className="divide-y divide-line">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">No notifications in this view.</div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => markItemRead(n.id)}
                className={cn(
                  'p-4 transition-colors cursor-pointer flex items-start gap-3.5',
                  !n.read ? 'bg-brand-50/20 hover:bg-brand-50/30' : 'hover:bg-stone-50'
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                    n.type === 'decision'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : n.type === 'approval'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-stone-100 text-stone-700 border-stone-200'
                  )}
                >
                  <Bell className="h-4 w-4" />
                </div>

                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">{n.title}</span>
                    <span className="text-[11px] text-muted">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-muted-dark">{n.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

