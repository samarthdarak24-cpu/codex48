import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  Calendar,
  FileEdit,
  ExternalLink,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CreatorSentinelTasksPage() {
  const [tasks, setTasks] = useState([
    {
      id: 'task-sent-creator-1',
      version_id: 'sub-01:v1',
      title: 'Summer Glow Serum Instagram Ad',
      trigger: 'Rule Changed: CL-04 Superlative Safety Terminology',
      what_changed: 'Rule CL-04 now strictly excludes "100% safe" or "cure" claims. Your live copy contains "100% safe results".',
      due_at: '2026-11-09T00:00:00Z',
      status: 'open',
    },
    {
      id: 'task-sent-creator-2',
      version_id: 'sub-04:v1',
      title: 'HydraClean Foaming Cleanser Poster',
      trigger: 'Exception Expired: EX-882 Launch Exemption',
      what_changed: 'The 30-day allowance for banner clearspace has expired. Creative must be updated to conform to VIS-02.',
      due_at: '2026-11-05T00:00:00Z',
      status: 'open',
    },
  ])

  const handleResolve = (taskId: string) => {
    const note = prompt('Provide compliance justification for resolving without revision:')
    if (note) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'resolved' } : t))
      )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-widest text-muted uppercase">POST-PUBLICATION REASSESSMENT</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink mt-0.5">My Sentinel Tasks</h1>
        <p className="text-sm text-muted">
          Reassessment tasks assigned to you when active brand rules, guidelines, or exceptions change.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-white shadow-card overflow-hidden">
        <div className="border-b border-line bg-stone-50/60 px-4 py-3 flex items-center justify-between">
          <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
            Assigned Reassessment Tasks ({tasks.filter((t) => t.status === 'open').length})
          </h2>
          <span className="text-[11px] text-muted">Action required before due date</span>
        </div>

        <div className="divide-y divide-line">
          {tasks.map((task) => {
            const isResolved = task.status === 'resolved'
            return (
              <div key={task.id} className="p-4 hover:bg-stone-50/60 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                          isResolved
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        )}
                      >
                        {isResolved ? 'Resolved' : 'Action Required'}
                      </span>
                      <span className="text-xs font-bold text-ink">{task.title}</span>
                      <span className="text-[11px] font-mono text-muted">({task.version_id})</span>
                    </div>

                    <div className="text-xs font-semibold text-brand-800 mt-1">{task.trigger}</div>
                    <p className="text-xs text-muted-dark leading-relaxed">{task.what_changed}</p>

                    <div className="flex items-center gap-4 text-[11px] text-muted pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Due by: {new Date(task.due_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isResolved && (
                      <>
                        <Link
                          to="/app/new"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#1C3A27] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#254F35]"
                        >
                          <FileEdit className="h-3.5 w-3.5" />
                          <span>Revise Copy</span>
                        </Link>
                        <button
                          onClick={() => handleResolve(task.id)}
                          className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone-50"
                        >
                          Still Compliant (Explain)
                        </button>
                      </>
                    )}
                    {isResolved && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Justification Submitted
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

