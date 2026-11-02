import React, { useState } from 'react'
import {
  CheckCircle2,
  Download,
  Share2,
  Calendar,
  ShieldCheck,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { useData } from '@/context/DataContext'
import { cn } from '@/lib/utils'

export default function CreatorApprovedContentPage() {
  const { submissions } = useData()
  const approvedList = submissions.filter((s) => s.status === 'Approved')
  const [publishedMap, setPublishedMap] = useState<Record<string, boolean>>({
    'sub-03': true,
  })

  const markPublished = (id: string) => {
    setPublishedMap((prev) => ({ ...prev, [id]: true }))
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-widest text-muted uppercase">COMPLIANT ASSET VAULT</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink mt-0.5">Approved Content</h1>
        <p className="text-sm text-muted">
          Your brand-approved marketing copy and creative assets with immutable governance sign-offs.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-white shadow-card overflow-hidden">
        <div className="border-b border-line bg-stone-50/60 px-4 py-3 flex items-center justify-between">
          <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
            Approved Submissions ({approvedList.length})
          </h2>
          <span className="text-[11px] text-muted">Cryptographically verified snapshots</span>
        </div>

        <div className="divide-y divide-line">
          {approvedList.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No approved content yet. Submissions approved by Brand Managers will appear here automatically.
            </div>
          ) : (
            approvedList.map((item) => {
              const isPublished = publishedMap[item.id]
              return (
                <div key={item.id} className="p-4 hover:bg-stone-50/60 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Approved
                        </span>
                        <span className="text-xs font-bold text-ink">{item.title}</span>
                        <span className="text-[11px] font-mono text-muted">v{item.version || 1}</span>
                      </div>

                      <p className="text-xs text-muted-dark italic font-serif">"{item.text || item.excerpt}"</p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted pt-1">
                        <span>Campaign: <strong className="text-ink font-semibold">{item.brand || 'Summer 2026'}</strong></span>
                        <span>Channel: {item.channel || 'Instagram'}</span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" /> Approver: David Kim
                        </span>
                        <span>Approved: {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPublished ? (
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-700 border border-stone-200">
                          Live / Published
                        </span>
                      ) : (
                        <button
                          onClick={() => markPublished(item.id)}
                          className="rounded-lg bg-[#1C3A27] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#254F35]"
                        >
                          Mark as Published
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

