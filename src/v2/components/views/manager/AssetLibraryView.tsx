import React, { useState, useRef } from 'react';
import {
  Images, CheckCircle, Clock, AlertTriangle, ChevronDown, LayoutGrid, List,
  Eye, Download, MoreVertical, Upload, X, Loader2, ArrowUpRight, ArrowDownRight, Search, Tag,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Asset } from '../../../types';
import { api } from '@/services/api';
import { StatCardGrid } from '../../ui/StatCard';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Approved: 'bg-emerald-500 text-white',
    'In Review': 'bg-blue-500 text-white',
    Pending: 'bg-amber-500 text-white',
    Flagged: 'bg-red-500 text-white',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[status] ?? 'bg-slate-500 text-white'}`}>{status}</span>;
};

export const AssetLibraryView: React.FC = () => {
  const { assets, selectedAsset, setSelectedAsset, searchQuery, showToast, loading, refresh } = useApp();

  const approvedCount = assets.filter((a) => a.status === 'Approved').length;
  const pendingCount = assets.filter((a) => a.status === 'In Review' || a.status === 'Pending').length;
  const flaggedCount = assets.filter((a) => a.status === 'Flagged').length;

  const [activeCategory, setActiveCategory] = useState<'All' | 'Images' | 'Videos' | 'Documents' | 'Others'>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const active = selectedAsset || assets[0];

  const filtered = assets.filter((ast) => {
    if (activeCategory === 'Images' && ast.type !== 'image') return false;
    if (activeCategory === 'Videos' && ast.type !== 'video') return false;
    if (activeCategory === 'Documents' && ast.type !== 'document') return false;
    const q = (searchQuery || localSearch).toLowerCase();
    if (q) return ast.name.toLowerCase().includes(q) || ast.campaign.toLowerCase().includes(q) || ast.tags.some((t) => t.toLowerCase().includes(q));
    return true;
  });

  const handleFile = async (file: File) => {
    setIsUploading(true);
    try {
      await api.uploadAsset(file, file.name, 'PureGlow', 'Image', '');
      await refresh();
      showToast('Asset uploaded.');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Upload failed.', 'error'); }
    finally { setIsUploading(false); }
  };

  const handleApprove = async () => {
    if (!active) return;
    setIsApproving(true);
    try { await api.approveAsset(active.id); await refresh(); showToast('Asset approved.'); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Approval failed.', 'error'); }
    finally { setIsApproving(false); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Asset Library</h1>
            <p className="text-xs text-muted mt-0.5">Manage and organize your approved brand assets.</p>
          </div>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Total Assets', value: assets.length, icon: <Images className="w-5 h-5" />, variant: 'blue', trend: 12, sparkPathIndex: 0 },
    { label: 'Approved', value: approvedCount, icon: <CheckCircle className="w-5 h-5" />, variant: 'green', trend: 14, sparkPathIndex: 1 },
    { label: 'Pending Review', value: pendingCount, icon: <Clock className="w-5 h-5" />, variant: 'amber', trend: -6, sparkPathIndex: 2 },
    { label: 'Flagged', value: flaggedCount, icon: <AlertTriangle className="w-5 h-5" />, variant: 'red', trend: 8, sparkPathIndex: 3 },
  ]} />

        {/* Filter tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All Assets', 'Images', 'Videos', 'Documents', 'Others'] as const).map((tab) => {
              const key = tab === 'All Assets' ? 'All' : tab as any;
              const cnt = tab === 'All Assets' ? assets.length : assets.filter((a) => a.type === tab.toLowerCase().slice(0, -1)).length;
              return (
                <button key={tab} onClick={() => setActiveCategory(key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${activeCategory === key ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm font-bold' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                  {tab} ({cnt})
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <select className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"><option>Newest First</option></select>
            <div className="flex items-center gap-0.5 bg-white border border-line rounded-lg p-1">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[#FAF7EF] text-ink-900' : 'text-muted-light hover:text-ink-700'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#FAF7EF] text-ink-900' : 'text-muted-light hover:text-ink-700'}`}><List className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>

        {/* Search filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-light absolute left-3 top-2.5 pointer-events-none" />
            <input value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} placeholder="Search assets..." className="pl-8 pr-3 py-1.5 bg-white border border-line rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>
          {['All Categories', 'All Status', 'All Campaigns', 'All Tags'].map((f) => (
            <button key={f} className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-line rounded-xl text-xs text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
              {f} <ChevronDown className="w-3 h-3 text-muted-light" />
            </button>
          ))}
        </div>

        {/* Grid */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.length === 0 && <div className="col-span-full text-center py-12 text-xs text-muted bg-white rounded-2xl border border-line">No assets found.</div>}
            {filtered.map((ast) => (
              <div key={ast.id} onClick={() => { setSelectedAsset(ast); setIsDrawerOpen(true); }}
                className={`bg-white rounded-2xl border overflow-hidden shadow-2xs cursor-pointer hover:-translate-y-0.5 hover:shadow-xs transition-all ${selectedAsset?.id === ast.id ? 'ring-2 ring-brand-500 border-transparent' : 'border-line hover:border-line-strong'}`}>
                <div className="relative h-36 overflow-hidden bg-[#F1ECE0]">
                  <img src={ast.thumbnail} alt={ast.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2"><StatusBadge status={ast.status} /></div>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-ink-900 text-xs truncate">{ast.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-light">
                    <span>{ast.format}</span><span>·</span><span>{ast.uploadedAt}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#F5F0E8]">
                    <button onClick={(e) => e.stopPropagation()} className="p-1 text-muted hover:text-ink-700 rounded transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => e.stopPropagation()} className="p-1 text-muted hover:text-ink-700 rounded transition-colors"><Download className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => e.stopPropagation()} className="ml-auto p-1 text-muted hover:text-ink-700 rounded"><MoreVertical className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-line shadow-2xs overflow-hidden">
            <table className="w-full text-left">
              <thead><tr className="bg-gradient-to-r from-slate-50 via-blue-50/40 to-pink-50/30 border-b border-slate-200">
                {['Asset', 'Type', 'Status', 'Campaign', 'Uploaded', 'Actions'].map((h) => <th key={h} className="py-3 px-4 text-[11px] font-semibold text-muted uppercase tracking-wide">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {filtered.map((ast) => (
                  <tr key={ast.id} className="hover:bg-[#FAF7EF]/60 transition-colors cursor-pointer" onClick={() => { setSelectedAsset(ast); setIsDrawerOpen(true); }}>
                    <td className="py-3 px-4"><div className="flex items-center gap-3"><img src={ast.thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover border border-line" /><span className="text-xs font-medium text-ink-900">{ast.name}</span></div></td>
                    <td className="py-3 px-4 text-xs text-muted">{ast.format}</td>
                    <td className="py-3 px-4"><StatusBadge status={ast.status} /></td>
                    <td className="py-3 px-4 text-xs text-muted">{ast.campaign}</td>
                    <td className="py-3 px-4 text-xs text-muted">{ast.uploadedAt}</td>
                    <td className="py-3 px-4"><div className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-muted" /><Download className="w-3.5 h-3.5 text-muted" /><MoreVertical className="w-3.5 h-3.5 text-muted" /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">Showing 1–{Math.min(filtered.length, 8)} of {filtered.length} assets</p>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map((p) => <button key={p} className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${p === 1 ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm font-bold' : 'border border-line text-muted hover:bg-[#FAF7EF]'}`}>{p}</button>)}
          </div>
        </div>
      </main>

      {/* Right panel */}
      {isDrawerOpen && active && (
        <aside className="w-[300px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <h3 className="text-sm font-bold text-ink-900">Asset Details</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => { fileInputRef.current?.click(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />Upload
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="rounded-xl overflow-hidden border border-line">
              <img src={active.thumbnail} alt={active.name} className="w-full h-40 object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-ink-900 text-sm flex-1 truncate">{active.name}</p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${active.type === 'image' ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-700'}`}>{active.format || active.type}</span>
              <StatusBadge status={active.status} />
            </div>
            <div className="space-y-0">
              {[['Size', active.size || '—'], ['Dimensions', active.dimensions || '—'], ['Campaign', active.campaign], ['Uploaded By', active.uploadedBy], ['Upload Date', active.uploadedAt]].map(([label, val]) => (
                <div key={String(label)} className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8] last:border-0 text-xs">
                  <span className="text-muted">{label}</span>
                  <span className="font-medium text-ink">{val}</span>
                </div>
              ))}
            </div>
            {/* Tags */}
            <div>
              <p className="text-xs font-bold text-ink-900 mb-2">Tags</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {active.tags.map((tag) => <span key={tag} className="px-2 py-0.5 bg-[#F1ECE0] rounded-full text-[10px] font-medium text-ink-700">{tag}</span>)}
                <button className="px-2 py-0.5 bg-white border border-dashed border-line rounded-full text-[10px] font-medium text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer">+ Add Tag</button>
              </div>
            </div>
            {/* Related guidelines */}
            <div className="p-2.5 bg-[#FAF7EF] border border-line rounded-xl flex items-center gap-2 text-xs cursor-pointer hover:bg-[#F1ECE0] transition-colors">
              <Tag className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span className="text-brand-700 font-medium">Brand Visual Standards v2.0</span>
            </div>
          </div>
          <div className="p-4 border-t border-line space-y-2 shrink-0">
            <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
              <Download className="w-4 h-4" />Download
            </button>
            {active.status !== 'Approved' && (
              <button onClick={handleApprove} disabled={isApproving} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer transition-colors cursor-pointer disabled:opacity-50">
                {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Add to Campaign
              </button>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};
