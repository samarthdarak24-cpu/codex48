import React, { useState } from 'react'
import {
  Clock,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { useData } from '@/context/DataContext'
import { cn } from '@/lib/utils'

export default function CreatorExceptionRequestsPage() {
  const { exceptions, requestException } = useData()
  const [showModal, setShowModal] = useState(false)
  const [selectedRule, setSelectedRule] = useState('CL-04')
  const [scope, setScope] = useState('Summer 2026 Instagram Campaign')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('2026-11-30')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    setSubmitting(true)
    try {
      await requestException({
        contentId: 'sub-new',
        ruleCode: selectedRule,
        reason,
        scope,
        expiresAt,
      })
      setShowModal(false)
      setReason('')
    } catch (err) {
      alert('Failed to submit exception request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest text-muted uppercase">POLICY EXCEPTIONS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink mt-0.5">My Exception Requests</h1>
          <p className="text-sm text-muted">
            Request time-bounded brand policy allowances for seasonal promotions or campaign constraints.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1C3A27] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#254F35] transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Exception Request</span>
        </button>
      </div>

      {/* Exception Requests List */}
      <div className="rounded-xl border border-line bg-white shadow-card overflow-hidden">
        <div className="border-b border-line bg-stone-50/60 px-4 py-3">
          <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
            Active & Pending Requests ({exceptions.length})
          </h2>
        </div>

        <div className="divide-y divide-line">
          {exceptions.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No exception requests found. Click 'New Exception Request' to submit an allowance for review.
            </div>
          ) : (
            exceptions.map((ex) => (
              <div key={ex.id} className="p-4 hover:bg-stone-50/60 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                          ex.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : ex.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        )}
                      >
                        {ex.status}
                      </span>
                      <span className="text-xs font-bold text-ink">Rule {ex.ruleCode}</span>
                    </div>

                    <p className="text-xs text-ink font-medium">{ex.reason}</p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted pt-1">
                      <span>Scope: <strong className="text-ink font-semibold">{ex.scope}</strong></span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Expires: {new Date(ex.expiresAt).toLocaleDateString()}
                      </span>
                      <span>Requested: {new Date(ex.createdAt || ex.effectiveFrom).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-line space-y-4">
            <h3 className="text-base font-bold text-ink">Request Policy Exception</h3>
            <p className="text-xs text-muted">
              Brand policy exceptions require formal review and approval by a Brand Manager.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-ink mb-1">Target Rule *</label>
                <select
                  value={selectedRule}
                  onChange={(e) => setSelectedRule(e.target.value)}
                  className="w-full rounded-lg border border-line bg-stone-50 p-2 text-ink focus:bg-white focus:outline-none"
                >
                  <option value="CL-04">CL-04: No superlative or absolute health claims</option>
                  <option value="DISC-01">DISC-01: Mandatory disclaimer on efficacy claims</option>
                  <option value="VIS-02">VIS-02: Secondary logo clearspace buffer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Campaign / Content Scope *</label>
                <input
                  type="text"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  required
                  className="w-full rounded-lg border border-line bg-stone-50 p-2 text-ink focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Business Rationale / Justification *</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this content requires a temporary policy allowance..."
                  required
                  className="w-full rounded-lg border border-line bg-stone-50 p-2 text-ink focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Requested Expiration Date *</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  required
                  className="w-full rounded-lg border border-line bg-stone-50 p-2 text-ink focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-line px-4 py-2 font-semibold text-ink hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#1C3A27] px-4 py-2 font-semibold text-white hover:bg-[#254F35] disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit for Manager Ruling'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
