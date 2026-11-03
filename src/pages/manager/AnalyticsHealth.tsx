import React, { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AnalyticsHealthPage() {
  const [dateRange, setDateRange] = useState('30d')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest text-muted uppercase">EXECUTIVE GOVERNANCE</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink mt-0.5">Analytics & Brand Health</h1>
          <p className="text-sm text-muted">
            Aggregated compliance metrics, top violated brand policies, and AI verification quality.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-ink shadow-xs focus:outline-none"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <button
            onClick={() => alert('Exporting Analytics CSV report...')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink shadow-xs hover:bg-stone-50"
          >
            <Download className="h-4 w-4 text-muted" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* High-level KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Avg Compliance Score</div>
          <div className="mt-1 text-2xl font-bold text-ink">88.4%</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">↑ +3.2% vs last month</div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Total Submissions</div>
          <div className="mt-1 text-2xl font-bold text-ink">15</div>
          <div className="mt-1 text-[11px] text-muted">PureGlow workspace</div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Avg Review Turnaround</div>
          <div className="mt-1 text-2xl font-bold text-ink">4.2 hrs</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">↓ 1.1 hrs faster</div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Citation Verify Rate</div>
          <div className="mt-1 text-2xl font-bold text-ink">100.0%</div>
          <div className="mt-1 text-[11px] text-muted">Zero unverified citations</div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Rule Violations Heatmap */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider">Top Violated Brand Policies</h2>
            <span className="text-[11px] text-muted">Past 30 days</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-ink">CL-04: No absolute or superlative cure claims</span>
                <span className="font-bold text-amber-700">8 flags</span>
              </div>
              <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-ink">DISC-01: Mandatory 'Results may vary' disclaimer</span>
                <span className="font-bold text-amber-700">5 flags</span>
              </div>
              <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '42%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-ink">VIS-02: Secondary logo minimum clearance buffer</span>
                <span className="font-bold text-stone-600">3 flags</span>
              </div>
              <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full bg-stone-400 rounded-full" style={{ width: '25%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* AI & Verification Quality */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-brand-600" />
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">AI Observability & Reliability</h2>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Optimal Quality
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-line/60">
              <span className="text-muted">Total Grounded Evidence Queries:</span>
              <span className="font-semibold text-ink">84</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-line/60">
              <span className="text-muted">Unverified Quotes Rejected by Validator:</span>
              <span className="font-semibold text-emerald-700">0 (100% precision)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-line/60">
              <span className="text-muted">Manager Decision Override Rate:</span>
              <span className="font-semibold text-ink">4.8% (Advisory alignment)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-line/60">
              <span className="text-muted">Average Verification Latency:</span>
              <span className="font-semibold text-ink">185ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

