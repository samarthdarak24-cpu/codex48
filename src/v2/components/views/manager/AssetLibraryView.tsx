import React, { useState, useRef } from 'react';
import {
  Images,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  LayoutGrid,
  List,
  Eye,
  Download,
  MoreVertical,
  Upload,
  ExternalLink,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Asset } from '../../../types';
import { api } from '@/services/api';

export const AssetLibraryView: React.FC = () => {
  const { assets, selectedAsset, setSelectedAsset, searchQuery, showToast, loading, refresh } = useApp();

  // Derived from the live asset library — no hardcoded counts.
  const approvedCount = assets.filter((a) => a.status === 'Approved').length;
  const pendingCount = assets.filter((a) => a.status === 'In Review' || a.status === 'Pending').length;
  const flaggedCount = assets.filter((a) => a.status === 'Flagged').length;
  const typeCount = (t: string) => assets.filter((a) => a.type === t.toLowerCase()).length;

  const [activeCategory, setActiveCategory] = useState<'All' | 'Images' | 'Videos' | 'Documents' | 'Others'>('All');
  const [sortOrder, setSortOrder] = useState<'az' | 'za'>('az');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const active = selectedAsset || assets[0];

  const filtered = assets
    .filter((ast) => {
      if (activeCategory === 'Images' && ast.type !== 'image') return false;
      if (activeCategory === 'Videos' && ast.type !== 'video') return false;
      if (activeCategory === 'Documents' && ast.type !== 'document') return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          ast.name.toLowerCase().includes(q) ||
          ast.campaign.toLowerCase().includes(q) ||
          ast.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => (sortOrder === 'az' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));

  const handleFile = async (file: File) => {
    setIsUploading(true);
    const category = file.type.startsWith('image/') ? 'Image' : file.type.startsWith('video/') ? 'Video' : 'Document';
    try {
      await api.uploadAsset(file, file.name, 'PureGlow', category, '');
      await refresh();
      showToast(`Uploaded ${file.name}.`);
      setIsDrawerOpen(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Upload failed.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApprove = async (id: string) => {
    setIsApproving(true);
    try {
      await api.approveAsset(id);
      await refresh();
      showToast('Asset approved.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Approval failed.', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDownload = async (id: string) => {
    setIsDownloading(id);
    try {
      const url = await api.fetchAssetBlobUrl(id);
      if (!url) {
        showToast('This asset has no downloadable file on the server.', 'error');
        return;
      }
      window.open(url, '_blank');
    } catch {
      showToast('Could not open the asset file.', 'error');
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      {/* Main Asset Stream */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F7F3EA]">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-900">Asset Library</h2>
            <p className="text-xs text-muted mt-0.5">
              Manage and organize your approved brand assets.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="py-2 px-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {isUploading ? 'Uploading…' : 'Upload Asset'}
          </button>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-line/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Images className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted">Total Assets</p>
                <h3 className="text-2xl font-bold text-ink-900 leading-tight">{assets.length}</h3>
              </div>
            </div>
            <div className="text-right"><span className="text-[10px] font-medium text-muted-light">live</span></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-line/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted">Approved</p>
                <h3 className="text-2xl font-bold text-ink-900 leading-tight">{approvedCount}</h3>
              </div>
            </div>
            <div className="text-right"><span className="text-[10px] font-medium text-muted-light">live</span></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-line/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted">Pending Review</p>
                <h3 className="text-2xl font-bold text-ink-900 leading-tight">{pendingCount}</h3>
              </div>
            </div>
            <div className="text-right"><span className="text-[10px] font-medium text-muted-light">live</span></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-line/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted">Flagged</p>
                <h3 className="text-2xl font-bold text-ink-900 leading-tight">{flaggedCount}</h3>
              </div>
            </div>
            <div className="text-right"><span className="text-[10px] font-medium text-muted-light">live</span></div>
          </div>
        </div>

        {/* Category Filter Pills & View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'All', label: `All Assets (${assets.length})` },
              { id: 'Images', label: `Images (${typeCount('image')})` },
              { id: 'Videos', label: `Videos (${typeCount('video')})` },
              { id: 'Documents', label: `Documents (${typeCount('document')})` },
              { id: 'Others', label: `Others (${typeCount('other')})` },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeCategory === c.id
                    ? 'bg-brand-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-[#FAF7EF] text-ink-600 border border-line'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'az' | 'za')}
                className="pl-3 pr-8 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink-700 hover:bg-[#FAF7EF] cursor-pointer appearance-none"
              >
                <option value="az">Sort: Name (A–Z)</option>
                <option value="za">Sort: Name (Z–A)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light absolute right-2.5 top-2 pointer-events-none" />
            </div>
            <div className="flex items-center p-0.5 bg-[#F1ECE0] rounded-lg border border-line">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white text-brand-600 shadow-2xs' : 'text-muted'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white text-brand-600 shadow-2xs' : 'text-muted'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sub-toolbar dropdown filters (server-backed category pills above are authoritative) */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-ink-700">
          {['All Categories', 'All Status', 'All Campaigns', 'All Tags'].map((label) => (
            <button
              key={label}
              disabled
              title="Additional server-side filters are not available; use the category pills above."
              className="px-3 py-1.5 bg-white border border-line rounded-lg font-medium opacity-50 cursor-not-allowed flex items-center gap-1.5 shadow-2xs"
            >
              <span>{label}</span> <ChevronDown className="w-3 h-3 text-muted-light" />
            </button>
          ))}
        </div>

        {/* Asset Cards Grid */}
        {loading ? (
          <div className="bg-white rounded-xl border border-line p-10 text-center text-muted text-sm">Loading assets…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-line p-10 text-center text-muted text-sm">
            No assets match this filter.
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filtered.map((ast) => {
              const isSelected = active?.id === ast.id;
              return (
                <div
                  key={ast.id}
                  onClick={() => {
                    setSelectedAsset(ast);
                    setIsDrawerOpen(true);
                  }}
                  className={`bg-white rounded-xl border overflow-hidden shadow-2xs hover:shadow transition cursor-pointer flex flex-col ${
                    isSelected ? 'ring-2 ring-brand-500 border-transparent' : 'border-line'
                  }`}
                >
                  <div className="relative h-36 bg-[#F1ECE0] overflow-hidden">
                    <img
                      alt={ast.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      src={ast.thumbnail}
                    />
                    <span
                      className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs ${
                        ast.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ast.status === 'In Review'
                          ? 'bg-brand-100 text-brand-700'
                          : ast.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      ● {ast.status}
                    </span>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-ink-900 text-xs truncate">{ast.name}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-muted-light mt-1">
                        <span>{ast.format}</span>
                        <span>•</span>
                        <span>{ast.size}</span>
                      </div>
                      <div className="text-[10px] text-muted-light mt-1">{ast.uploadedAt}</div>
                    </div>

                    <div className="pt-2 border-t border-[#F1ECE0] flex items-center justify-between text-muted-light mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(ast);
                          setIsDrawerOpen(true);
                        }}
                        className="p-1 hover:text-ink-700"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownload(ast.id);
                        }}
                        disabled={isDownloading === ast.id}
                        className="p-1 hover:text-ink-700 disabled:opacity-50"
                        title="Download asset"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1 hover:text-ink-700" title="More">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-line shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#F1ECE0] bg-[#FAF7EF]/60 text-[11px] font-semibold text-muted uppercase">
                  <th className="py-2.5 px-4">Asset</th>
                  <th className="py-2.5 px-3">Campaign</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Uploaded</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1ECE0]">
                {filtered.map((ast) => (
                  <tr
                    key={ast.id}
                    onClick={() => {
                      setSelectedAsset(ast);
                      setIsDrawerOpen(true);
                    }}
                    className="hover:bg-[#FAF7EF]/80 cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img alt={ast.name} className="w-8 h-8 rounded-lg object-cover border border-line" src={ast.thumbnail} />
                        <span className="font-semibold text-ink truncate max-w-[180px]">{ast.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-ink-600">{ast.campaign}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ast.status === 'Approved' ? 'bg-emerald-100 text-emerald-800'
                          : ast.status === 'Flagged' ? 'bg-rose-100 text-rose-800'
                          : 'bg-brand-100 text-brand-700'
                      }`}>{ast.status}</span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-muted">{ast.uploadedAt}</td>
                    <td className="py-3 px-3 text-right">
                      <button onClick={(e) => { e.stopPropagation(); void handleDownload(ast.id); }} disabled={isDownloading === ast.id} className="text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-0.5 disabled:opacity-50">
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Right Drawer: Asset Details */}
      {isDrawerOpen && active && (
        <aside className="w-[390px] bg-white border-l border-line flex flex-col justify-between shrink-0 z-20 overflow-y-auto shadow-lg">
          <div className="p-5 flex flex-col space-y-4">
            {/* Drawer Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink-900 text-sm">Asset Details</h3>
              <button onClick={() => setIsDrawerOpen(false)} className="text-muted-light hover:text-ink-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Asset Hero Image */}
            <div className="rounded-xl overflow-hidden border border-line h-44 bg-[#FAF7EF]">
              <img
                alt={active.name}
                className="w-full h-full object-cover"
                src={active.thumbnail}
              />
            </div>

            {/* Title & Badges */}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-ink-900 text-sm truncate">{active.name}</h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1ECE0] text-ink-700">
                  {active.type}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  {active.status}
                </span>
              </div>
            </div>

            {/* Asset Specifications */}
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF7EF] border border-line/70 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-light">Size:</span>
                  <span className="font-medium text-ink">{active.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light">Dimensions:</span>
                  <span className="font-medium text-ink">{active.dimensions || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light">Campaign:</span>
                  <span className="font-medium text-ink">{active.campaign}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light">Uploaded By:</span>
                  <span className="font-medium text-ink">{active.uploadedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light">Upload Date:</span>
                  <span className="font-medium text-ink">{active.uploadedAt}</span>
                </div>
              </div>
            </div>

            {/* Tags Section — real tags from the asset record */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-ink">Tags</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {active.tags.length === 0 && (
                  <span className="text-muted-light">No tags on this asset.</span>
                )}
                {active.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 bg-[#F1ECE0] text-ink-600 rounded-md text-[11px] font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Related Guidelines Link */}
            <div className="space-y-1 text-xs">
              <span className="font-bold text-ink">Related Guidelines</span>
              <div className="p-2.5 rounded-xl border border-line bg-white hover:bg-[#FAF7EF] flex items-center justify-between cursor-pointer">
                <span className="font-medium text-brand-600">Brand Visual Standards v2.0</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-light" />
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="p-4 border-t border-line bg-[#FAF7EF]/50 flex items-center gap-2">
            <button
              onClick={() => void handleDownload(active.id)}
              disabled={isDownloading === active.id}
              className="flex-1 py-2.5 px-3 bg-white border border-line hover:bg-[#FAF7EF] text-ink font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-2xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-muted" /> Download
            </button>
            {active.status !== 'Approved' ? (
              <button
                onClick={() => void handleApprove(active.id)}
                disabled={isApproving}
                className="flex-1 py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-2xs disabled:opacity-50"
              >
                {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
              </button>
            ) : (
              <button
                disabled
                title="This asset is already approved."
                className="flex-1 py-2.5 px-3 bg-white border border-line text-ink font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 opacity-50 cursor-not-allowed"
              >
                <Check className="w-3.5 h-3.5" /> Approved
              </button>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};
