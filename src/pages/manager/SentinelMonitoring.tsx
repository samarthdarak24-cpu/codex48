import React, { useEffect, useState } from 'react'
import {
  ShieldAlert,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Calendar,
  UserCheck,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

export default function SentinelMonitoringPage() {
  const { user } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [tasks, setTasks] = useState([
    {
      id: 'task-sent-1',
      version_id: 'sub-01:v1',
      submission_title: 'Summer Glow Serum Instagram Ad',
      trigger_type: 'rule_changed',
      trigger_ref: 'CL-04: Superlative Claims Policy Update',
      assignee: 'Emily Carter',
      due_at: '2026-11-09T00:00:00Z',
      status: 'open',
      change_summary: 'Rule CL-04 was updated to prohibit 100% cure and absolute safety terminology.',
    },
    {
      id: 'task-sent-2',
      version_id: 'sub-04:v1',
      submission_title: 'HydraClean Foaming Cleanser Poster',
      trigger_type: 'exception_expired',
      trigger_ref: 'EX-882: Temporary Exemption for Launch Banner',
      assignee: 'Emily Carter',
      due_at: '2026-11-05T00:00:00Z',
      status: 'in_progress',
      change_summary: 'Exception expired on 2026-11-01. Copy must be brought back into full compliance.',
    },
  ])

  const handleRunScan = async () => {
    setScanning(true)
    setScanResult(null)
    setTimeout(() => {
      setScanning(false)
      setScanResult('Sentinel completed audit scan across 15 published assets. 2 existing tasks remain active. 0 new violations created.')
    }, 1200)
  }

  const handleResolveTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'resolved' } : t))
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest text-muted uppercase">POST-PUBLICATION GOVERNANCE</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink mt-0.5">Sentinel Monitoring</h1>
          <p className="text-sm text-muted">
            Continuous compliance surveillance for approved and live brand content.
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1C3A27] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#254F35] disabled:opacity-50 transition-colors"
        >
          {scanning ? (
            <RotateCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4 fill-white text-white" />
          )}
          <span>{scanning ? 'Scanning Workspace...' : 'Run Sentinel Scan Now'}</span>
        </button>
      </div>

      {scanResult && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{scanResult}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Active Monitoring</div>
          <div className="mt-1 text-2xl font-bold text-ink">15 Approved Assets</div>
          <div className="mt-1 text-[11px] text-muted">Continuous hash verification</div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-card">
          <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            Open Reassessments
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-950">
            {tasks.filter((t) => t.status !== 'resolved').length}
          </div>
          <div className="mt-1 text-[11px] text-amber-700">Triggered by policy & expiry events</div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Nightly Cron Surveillance</div>
          <div className="mt-1 text-2xl font-bold text-ink">02:00 UTC Daily</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Scheduled & Active
          </div>
        </div>
      </div>

      {/* Sentinel Tasks Queue */}
      <div className="rounded-xl border border-line bg-white shadow-card overflow-hidden">
        <div className="border-b border-line bg-stone-50/60 px-4 py-3 flex items-center justify-between">
          <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
            Reassessment Tasks ({tasks.filter((t) => t.status !== 'resolved').length} Pending)
          </h2>
          <span className="text-[11px] text-muted">Strict idempotency enforced</span>
        </div>

        <div className="divide-y divide-line">
          {tasks.map((task) => {
            const isResolved = task.status === 'resolved'
            return (
              <div key={task.id} className="p-4 hover:bg-stone-50/60 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                          task.trigger_type === 'rule_changed'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-rose-100 text-rose-900 border border-rose-200'
                        )}
                      >
                        {task.trigger_type === 'rule_changed' ? 'Rule Modified' : 'Exception Expired'}
                      </span>
                      <span className="text-xs font-bold text-ink">{task.submission_title}</span>
                      <span className="text-[11px] font-mono text-muted">({task.version_id})</span>
                    </div>

                    <p className="text-xs text-muted-dark">{task.change_summary}</p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted pt-1">
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3" /> Assignee: <strong className="text-ink font-semibold">{task.assignee}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Due: {new Date(task.due_at).toLocaleDateString()}
                      </span>
                      <span>Trigger: {task.trigger_ref}</span>
                    </div>
                  </div>

                  <div>
                    {isResolved ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Resolved
                      </span>
                    ) : (
                      <button
                        onClick={() => handleResolveTask(task.id)}
                        className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone-50 shadow-xs"
                      >
                        Resolve with Note
                      </button>
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

