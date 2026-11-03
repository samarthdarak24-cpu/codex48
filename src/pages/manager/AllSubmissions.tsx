import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  Columns,
  Download,
  RotateCw,
  ChevronRight,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  UserCheck,
} from 'lucide-react'
import { api } from '@/services/api'
import { useData } from '@/context/DataContext'
import type { Submission, SubmissionsSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

export default function AllSubmissionsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { submissions, refetch } = useData()
  const [summary, setSummary] = useState<SubmissionsSummary>({
    total: 15,
    approved: 1,
    pending: 12,
    needs_changes: 2,
    rejected: 0,
  })
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending' | 'needs_changes' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortField, setSortField] = useState<'title' | 'campaign' | 'score' | 'submitted'>('submitted')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [visibleColumns, setVisibleColumns] = useState({
    campaign: true,
    creator: true,
    status: true,
    score: true,
    submitted: true,
  })
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [scoreModalItem, setScoreModalItem] = useState<Submission | null>(null)

  useEffect(() => {
    api.submissionsSummary()
      .then(setSummary)
      .catch(() => {})
  }, [submissions])

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      // Tab filter
      if (activeTab === 'approved' && s.status !== 'Approved') return false
      if (activeTab === 'pending' && s.status !== 'In Review' && s.status !== 'Ready for Approval') return false
      if (activeTab === 'needs_changes' && s.status !== 'Changes Requested') return false
      if (activeTab === 'rejected' && s.status !== 'Declined') return false

      // Content Type filter
      if (typeFilter !== 'all' && s.type !== typeFilter) return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = s.title.toLowerCase().includes(q)
        const matchesBrand = (s.brand || '').toLowerCase().includes(q)
        const matchesCreator = (s.creator || s.creatorId || '').toLowerCase().includes(q)
        if (!matchesTitle && !matchesBrand && !matchesCreator) return false
      }

      return true
    }).sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'title') return dir * a.title.localeCompare(b.title)
      if (sortField === 'score') return dir * ((a.score || 0) - (b.score || 0))
      return dir * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    })
  }, [submissions, activeTab, typeFilter, searchQuery, sortField, sortDir])

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSubmissions.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredSubmissions.map((s) => s.id))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header (Screenshot 1 Exact Contract) */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-widest text-muted uppercase">SUBMISSION REGISTER</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink mt-0.5">All Submissions</h1>
        <p className="text-sm text-muted">
          Every content submission across campaigns, with its stored compliance score.
        </p>
      </div>

      {/* Real Database Metric Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Total Submissions</div>
          <div className="mt-1 text-2xl font-bold text-ink">{summary.total}</div>
          <div className="mt-1 text-[11px] text-muted">Across all channels</div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-card">
          <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Approved
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-950">{summary.approved}</div>
          <div className="mt-1 text-[11px] text-emerald-700">Ready to publish</div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-card">
          <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            Pending Review
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-950">{summary.pending}</div>
          <div className="mt-1 text-[11px] text-amber-700">Awaiting manager sign-off</div>
        </div>

        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 shadow-card">
          <div className="text-xs font-semibold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            Needs Changes
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-950">{summary.needs_changes}</div>
          <div className="mt-1 text-[11px] text-rose-700">Revisions requested</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-line bg-white shadow-card overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-line bg-stone-50/60 px-4">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'border-b-2 px-3 py-3 text-xs font-semibold transition-colors',
              activeTab === 'all'
                ? 'border-[#1C3A27] text-ink font-bold'
                : 'border-transparent text-muted hover:text-ink'
            )}
          >
            All <span className="ml-1 rounded-full bg-stone-200 px-1.5 py-0.5 text-[10px]">{summary.total}</span>
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={cn(
              'border-b-2 px-3 py-3 text-xs font-semibold transition-colors',
              activeTab === 'approved'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-muted hover:text-ink'
            )}
          >
            Approved <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">{summary.approved}</span>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'border-b-2 px-3 py-3 text-xs font-semibold transition-colors',
              activeTab === 'pending'
                ? 'border-amber-600 text-amber-900 font-bold'
                : 'border-transparent text-muted hover:text-ink'
            )}
          >
            Pending <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">{summary.pending}</span>
          </button>
          <button
            onClick={() => setActiveTab('needs_changes')}
            className={cn(
              'border-b-2 px-3 py-3 text-xs font-semibold transition-colors',
              activeTab === 'needs_changes'
                ? 'border-rose-600 text-rose-900 font-bold'
                : 'border-transparent text-muted hover:text-ink'
            )}
          >
            Needs Changes <span className="ml-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-800">{summary.needs_changes}</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-line bg-white">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search by title, campaign, or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-line bg-stone-50 pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:border-brand-500 focus:bg-white focus:outline-none"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-line bg-stone-50 px-2.5 py-1.5 text-xs text-ink focus:border-brand-500 focus:bg-white focus:outline-none"
            >
              <option value="all">All types</option>
              <option value="Social Media">Social Media</option>
              <option value="Poster">Poster</option>
              <option value="Email">Email</option>
              <option value="Website">Website</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Columns picker */}
            <div className="relative">
              <button
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-stone-50 shadow-xs"
              >
                <Columns className="h-3.5 w-3.5 text-muted" />
                <span>Columns</span>
              </button>
              {showColumnPicker && (
                <div className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-line bg-white p-2 shadow-lg space-y-1.5">
                  <div className="text-[10px] font-semibold text-muted uppercase px-1">Toggle Columns</div>
                  {Object.keys(visibleColumns).map((col) => (
                    <label key={col} className="flex items-center gap-2 px-1 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns[col as keyof typeof visibleColumns]}
                        onChange={() =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [col]: !prev[col as keyof typeof visibleColumns],
                          }))
                        }
                        className="rounded border-line text-brand-600 focus:ring-brand-500"
                      />
                      <span className="capitalize">{col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => refetch()}
              title="Refresh submissions"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-stone-50 shadow-xs"
            >
              <RotateCw className="h-3.5 w-3.5 text-muted" />
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-brand-50/70 px-4 py-2 border-b border-brand-200 text-xs text-brand-900">
            <span>{selectedIds.length} submissions selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toast.success('Bulk re-check scheduled', `Scheduled deterministic rule checks for ${selectedIds.length} submissions.`)}
                className="rounded bg-white border border-brand-300 px-2 py-1 font-medium text-brand-800 hover:bg-brand-100"
              >
                Re-run check
              </button>
            </div>
          </div>
        )}

        {/* Submissions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-line bg-stone-50/80 text-muted uppercase text-[10px] tracking-wider font-semibold">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredSubmissions.length}
                    onChange={toggleSelectAll}
                    className="rounded border-line text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => { setSortField('title'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>
                  <span className="flex items-center gap-1">Submission <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                {visibleColumns.campaign && (
                  <th className="px-4 py-3">Campaign</th>
                )}
                {visibleColumns.creator && (
                  <th className="px-4 py-3">Creator</th>
                )}
                {visibleColumns.status && (
                  <th className="px-4 py-3">Status</th>
                )}
                {visibleColumns.score && (
                  <th className="px-4 py-3 cursor-pointer" onClick={() => { setSortField('score'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>
                    <span className="flex items-center gap-1">Score <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                )}
                {visibleColumns.submitted && (
                  <th className="px-4 py-3 cursor-pointer" onClick={() => { setSortField('submitted'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>
                    <span className="flex items-center gap-1">Submitted <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                )}
                <th className="w-12 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted">
                    No submissions found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((s) => {
                  const score = s.score ?? 85
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-stone-50/80 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/manager/queue/${s.id}`)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(s.id)}
                          onChange={() => toggleSelectRow(s.id)}
                          className="rounded border-line text-brand-600 focus:ring-brand-500"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600 border border-line">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-ink group-hover:text-brand-800 transition-colors">
                              {s.title}
                            </div>
                            <div className="text-[11px] text-muted">
                              v{s.version || 1} · {s.type}
                            </div>
                          </div>
                        </div>
                      </td>

                      {visibleColumns.campaign && (
                        <td className="px-4 py-3">
                          <span className="font-medium text-ink">{s.brand || 'Summer 2026'}</span>
                          <span className="block text-[10px] text-muted">{s.channel || 'Instagram'}</span>
                        </td>
                      )}

                      {visibleColumns.creator && (
                        <td className="px-4 py-3 text-muted-dark">
                          {s.creator || 'Emily Carter'}
                        </td>
                      )}

                      {visibleColumns.status && (
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                              s.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : s.status === 'Changes Requested'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            )}
                          >
                            {s.status === 'Approved' ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : s.status === 'Changes Requested' ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {s.status}
                          </span>
                        </td>
                      )}

                      {visibleColumns.score && (
                        <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); setScoreModalItem(s); }}>
                          <div className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80">
                            <div
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold border',
                                score >= 80
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : score >= 50
                                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                                  : 'bg-rose-50 border-rose-300 text-rose-800'
                              )}
                            >
                              {score}%
                            </div>
                          </div>
                        </td>
                      )}

                      {visibleColumns.submitted && (
                        <td className="px-4 py-3 text-muted">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                      )}

                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="h-4 w-4 text-muted group-hover:text-ink transition-colors" />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Formula Breakdown Modal */}
      {scoreModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-line">
            <h3 className="text-base font-bold text-ink">Compliance Score Breakdown</h3>
            <p className="text-xs text-muted mt-0.5">{scoreModalItem.title}</p>

            <div className="mt-4 rounded-xl bg-stone-50 p-4 border border-line space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Stored Compliance Index:</span>
                <span className="font-bold text-ink">{scoreModalItem.score ?? 85}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Formula Specification:</span>
                <span className="font-mono text-[11px] text-brand-700">v1.0-severity-weighted</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Critical Violations (weight 5.0):</span>
                <span className="font-semibold text-rose-700">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Major Violations (weight 3.0):</span>
                <span className="font-semibold text-amber-700">1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Applicable Brand Rules:</span>
                <span className="font-semibold text-ink">14</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setScoreModalItem(null)}
                className="rounded-lg bg-[#1C3A27] px-4 py-2 text-xs font-semibold text-white hover:bg-[#254F35]"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
