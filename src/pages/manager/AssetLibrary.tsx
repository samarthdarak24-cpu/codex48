import React, { useState } from 'react'
import {
  Image,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Tag,
  Search,
  Filter,
  FileText,
  Palette,
  Eye,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AssetLibraryPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'logos' | 'products' | 'posters'>('all')
  const [search, setSearch] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null)
  const [assets, setAssets] = useState([
    {
      id: 'ast-pureglow-logo',
      name: 'PureGlow Master Brandmark Shield',
      category: 'logos',
      type: 'image/png',
      status: 'approved',
      version: 2,
      checksum: 'e9b2...8f1a',
      dominant_colors: ['#1C3A27', '#254F35', '#FAF7F0'],
      uploaded_at: '2026-10-15',
      ocr_text: 'PUREGLOW BOTANICALS',
    },
    {
      id: 'ast-serum-bottle',
      name: 'Anti-Aging Serum Packaging Hero 3D',
      category: 'products',
      type: 'image/jpeg',
      status: 'approved',
      version: 1,
      checksum: '4a1c...22d9',
      dominant_colors: ['#FAF7F0', '#C27D56', '#1C3A27'],
      uploaded_at: '2026-10-18',
      ocr_text: 'PureGlow Rapid Renewal Night Serum 50ml',
    },
    {
      id: 'ast-spring-flyer',
      name: 'Spring Launch Campaign Retail Flyer',
      category: 'posters',
      type: 'image/jpeg',
      status: 'deprecated',
      version: 1,
      checksum: '88c1...9b42',
      dominant_colors: ['#FAF7F0', '#E5A93C'],
      uploaded_at: '2026-05-10',
      ocr_text: 'Spring Clearance 20% Off All Skincare',
    },
  ])

  const filtered = assets.filter((a) => {
    if (activeTab !== 'all' && a.category !== activeTab) return false
    if (search.trim()) {
      return a.name.toLowerCase().includes(search.toLowerCase()) || a.ocr_text.toLowerCase().includes(search.toLowerCase())
    }
    return true
  })

  const toggleStatus = (assetId: string) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === assetId
          ? { ...a, status: a.status === 'approved' ? 'deprecated' : 'approved' }
          : a
      )
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest text-muted uppercase">CREATIVE ASSET VAULT</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink mt-0.5">Brand Asset Library</h1>
          <p className="text-sm text-muted">
            Authoritative reference creative assets, verified logos, and OCR inspection data.
          </p>
        </div>

        <button
          onClick={() => alert('Asset upload modal ready: Drag and drop PNG, JPEG or SVG')}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1C3A27] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#254F35] transition-colors"
        >
          <Upload className="h-4 w-4" />
          <span>Upload New Asset</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-3 shadow-card">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', activeTab === 'all' ? 'bg-[#1C3A27] text-white' : 'text-muted hover:bg-stone-100')}
          >
            All Assets
          </button>
          <button
            onClick={() => setActiveTab('logos')}
            className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', activeTab === 'logos' ? 'bg-[#1C3A27] text-white' : 'text-muted hover:bg-stone-100')}
          >
            Logos
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', activeTab === 'products' ? 'bg-[#1C3A27] text-white' : 'text-muted hover:bg-stone-100')}
          >
            Product Photography
          </button>
          <button
            onClick={() => setActiveTab('posters')}
            className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', activeTab === 'posters' ? 'bg-[#1C3A27] text-white' : 'text-muted hover:bg-stone-100')}
          >
            Campaign Posters
          </button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search assets or OCR text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-stone-50 pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((asset) => {
          const isApproved = asset.status === 'approved'
          return (
            <div
              key={asset.id}
              className="group rounded-xl border border-line bg-white p-4 shadow-card hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                      isApproved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-700 border border-stone-200'
                    )}
                  >
                    {isApproved ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <ShieldAlert className="h-3 w-3 text-stone-500" />}
                    {asset.status}
                  </span>
                  <span className="text-[11px] font-mono text-muted">v{asset.version}</span>
                </div>

                <div className="mt-3 flex h-36 items-center justify-center rounded-lg bg-stone-50 border border-line text-muted">
                  <Image className="h-10 w-10 text-muted-light" />
                </div>

                <div className="mt-3">
                  <h3 className="text-sm font-semibold text-ink group-hover:text-brand-800 transition-colors">
                    {asset.name}
                  </h3>
                  <p className="mt-1 text-[11px] text-muted font-mono truncate">SHA256: {asset.checksum}</p>
                </div>

                {/* Color Palette Pill */}
                <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-line">
                  <Palette className="h-3.5 w-3.5 text-muted" />
                  <div className="flex gap-1">
                    {asset.dominant_colors.map((c, i) => (
                      <span
                        key={i}
                        className="h-3.5 w-3.5 rounded-full border border-black/10"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-line text-xs">
                <button
                  onClick={() => setSelectedAsset(asset)}
                  className="font-medium text-brand-700 hover:text-brand-900 inline-flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Inspect OCR</span>
                </button>

                <button
                  onClick={() => toggleStatus(asset.id)}
                  className="text-[11px] font-semibold text-muted hover:text-ink underline"
                >
                  Mark {isApproved ? 'Deprecated' : 'Approved'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Asset Detail / OCR Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-line space-y-4">
            <h3 className="text-base font-bold text-ink">{selectedAsset.name}</h3>

            <div className="rounded-xl bg-stone-50 p-3.5 border border-line space-y-2 text-xs">
              <div>
                <span className="font-semibold text-muted block mb-0.5">Extracted OCR Text:</span>
                <p className="italic text-ink font-serif">"{selectedAsset.ocr_text}"</p>
              </div>
              <div>
                <span className="font-semibold text-muted block mb-0.5">VisualGuard Status:</span>
                <p className="text-emerald-700 font-medium">Clearspace compliant · Minimum size 32px verified</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedAsset(null)}
                className="rounded-lg bg-[#1C3A27] px-4 py-2 text-xs font-semibold text-white hover:bg-[#254F35]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

