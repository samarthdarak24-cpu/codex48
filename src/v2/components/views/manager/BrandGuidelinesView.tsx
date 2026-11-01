import React, { useState, useRef } from 'react';
import {
  BookOpen, Layers, Clock, Archive, Search, ChevronDown, Eye, Download,
  MoreVertical, X, FileText, Calendar, User, Tag, Upload, ArrowRight,
  CheckCircle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Guideline } from '../../../types';
import { api } from '@/services/api';
import { StatCardGrid } from '../../ui/StatCard';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Active: 'badge-approved',
    Draft: 'badge-draft',
    Pending: 'badge-pending',
    Archived: 'badge-archived',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status] ?? 'badge-draft'}`}>
      {status}
    </span>
  );
};

export const BrandGuidelinesView: React.FC = () => {
  const { guidelines, selectedGuideline, setSelectedGuideline, searchQuery, showToast, refresh } = useApp();

  const activeCount = guidelines.filter((g) => g.status === 'Active').length;
  const pendingCount = guidelines.filter((g) => g.status === 'Pending' || g.status === 'Draft').length;
  const archivedCount = guidelines.filter((g) => g.status === 'Archived').length;

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Draft' | 'Archived'>('All');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Brand Identity');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeGuide = selectedGuideline || guidelines[0];

  const categories = [
    { name: 'All Guidelines', count: guidelines.length },
    ...['Brand Identity', 'Messaging & Tone', 'Visual Standards', 'Product Claims', 'Legal & Compliance', 'Marketing Assets'].map((name) => ({
      name, count: guidelines.filter((g) => g.category === name).length,
    })),
  ];

  const filtered = guidelines.filter((g) => {
    if (activeCategory !== 'All Guidelines' && g.category !== activeCategory) return false;
    if (statusFilter === 'Active' && g.status !== 'Active') return false;
    if (statusFilter === 'Draft' && g.status !== 'Draft') return false;
    if (statusFilter === 'Archived' && g.status !== 'Archived') return false;
    if (searchQuery) { const q = searchQuery.toLowerCase(); return g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q); }
    return true;
  });

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) { showToast('Please enter a guideline title.', 'error'); return; }
    if (!uploadFile) { showToast('Please select a file to upload.', 'error'); return; }
    setIsUploading(true);
    try {
      await api.uploadGuidelineFile(uploadFile, uploadTitle.trim(), uploadCategory, uploadDescription.trim());
      await refresh();
      showToast('Guideline uploaded successfully.');
      setIsUploadOpen(false); setUploadTitle(''); setUploadDescription(''); setUploadFile(null);
    } catch (err) { showToast(err instanceof Error ? err.message : 'Upload failed.', 'error'); }
    finally { setIsUploading(false); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Brand Guidelines</h1>
            <p className="text-xs text-muted mt-0.5">Browse and manage official brand guidelines, policies and standards.</p>
          </div>
          <button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer shadow-2xs transition-colors cursor-pointer shrink-0">
            <Upload className="w-4 h-4" />Upload Document
          </button>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Total Guidelines', value: guidelines.length, icon: <BookOpen className="w-5 h-5" />, variant: 'green', trend: 12, sparkPathIndex: 0 },
    { label: 'Active Versions', value: activeCount, icon: <Layers className="w-5 h-5" />, variant: 'blue', trend: 8, sparkPathIndex: 1 },
    { label: 'Pending Review', value: pendingCount, icon: <Clock className="w-5 h-5" />, variant: 'amber', trend: -1, sparkPathIndex: 2 },
    { label: 'Archived', value: archivedCount, icon: <Archive className="w-5 h-5" />, variant: 'purple', trend: 0, sparkPathIndex: 3 },
  ]} />

        {/* Two-column body */}
        <div className="flex gap-5">
          {/* Category sidebar */}
          <div className="w-52 shrink-0 space-y-1">
            {categories.map((cat) => (
              <button key={cat.name} onClick={() => setActiveCategory(cat.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${activeCategory === cat.name ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-600 hover:bg-[#FAF7EF]'}`}>
                <span className="truncate">{cat.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeCategory === cat.name ? 'bg-brand-100 text-brand-700' : 'bg-[#F1ECE0] text-ink-600'}`}>{cat.count}</span>
              </button>
            ))}
            <div className="mt-4 p-3 bg-brand-50 border border-brand-100 rounded-xl text-center">
              <p className="text-[11px] font-semibold text-brand-700">Keep your brand consistent across all content.</p>
              <button className="mt-2 w-full py-1 bg-white border border-brand-200 rounded-lg text-[11px] font-semibold text-brand-700 hover:bg-[#FAF7EF] transition inline-flex items-center justify-center gap-1">
                View Brand Kit <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {(['All', 'Active', 'Draft', 'Archived'] as const).map((tab) => (
                  <button key={tab} onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${statusFilter === tab ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm font-bold' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                    {tab} ({tab === 'All' ? guidelines.length : tab === 'Active' ? activeCount : tab === 'Draft' ? pendingCount : archivedCount})
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <select className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer">
                  <option>All Versions</option>
                </select>
                <select className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer">
                  <option>All Status</option>
                </select>
                <span className="text-muted">Sort by:</span>
                <select className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer">
                  <option>Last Updated</option>
                </select>
              </div>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.length === 0 && (
                <div className="col-span-full text-center py-12 text-xs text-muted bg-white rounded-2xl border border-line">No guidelines found.</div>
              )}
              {filtered.map((g) => (
                <div key={g.id} onClick={() => { setSelectedGuideline(g); setIsDrawerOpen(true); }}
                  className={`bg-white rounded-2xl border overflow-hidden shadow-2xs cursor-pointer hover:-translate-y-0.5 hover:shadow-xs transition-all ${selectedGuideline?.id === g.id ? 'ring-2 ring-brand-500 border-transparent' : 'border-line hover:border-line-strong'}`}>
                  <div className="relative h-36 overflow-hidden bg-[#F1ECE0]">
                    <img src={g.thumbnail} alt={g.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2"><StatusBadge status={g.status} /></div>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="font-bold text-ink-900 text-xs">{g.title}</p>
                    <p className="text-[11px] text-muted line-clamp-2">{g.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-light pt-1 border-t border-[#F5F0E8]">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{g.format || 'PDF'} · {g.version}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{g.lastUpdated}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={(e) => { e.stopPropagation(); }} className="flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-ink-700 p-1 rounded hover:bg-[#F1ECE0] transition-colors"><Eye className="w-3 h-3" />View</button>
                      <button onClick={(e) => { e.stopPropagation(); }} className="flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-ink-700 p-1 rounded hover:bg-[#F1ECE0] transition-colors"><Download className="w-3 h-3" />Download</button>
                      <button className="ml-auto p-1 text-muted hover:text-ink-700 rounded"><MoreVertical className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Right detail panel */}
      {isDrawerOpen && activeGuide && (
        <aside className="w-[320px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <h3 className="text-sm font-bold text-ink-900">Guideline Details</h3>
            <button onClick={() => setIsDrawerOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700 hover:bg-[#F1ECE0] transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="rounded-xl overflow-hidden border border-line">
              <img src={activeGuide.thumbnail} alt={activeGuide.title} className="w-full h-40 object-cover" />
            </div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-ink-900 text-sm">{activeGuide.title}</p>
                <p className="text-xs text-muted mt-0.5">{activeGuide.description}</p>
              </div>
              <StatusBadge status={activeGuide.status} />
            </div>
            <div className="space-y-0">
              {[['Version', activeGuide.version], ['Last Updated', activeGuide.lastUpdated], ['Owner', activeGuide.owner], ['Category', activeGuide.category]].map(([label, val]) => (
                <div key={String(label)} className="flex items-center justify-between py-2 border-b border-[#F5F0E8] last:border-0 text-xs">
                  <span className="text-muted flex items-center gap-2">
                    {label === 'Version' && <FileText className="w-3.5 h-3.5" />}
                    {label === 'Last Updated' && <Calendar className="w-3.5 h-3.5" />}
                    {label === 'Owner' && <User className="w-3.5 h-3.5" />}
                    {label === 'Category' && <Tag className="w-3.5 h-3.5" />}
                    {label}
                  </span>
                  <span className="font-medium text-ink">{val}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <button onClick={async () => { try { await api.fetchGuidelineBlobUrl(activeGuide.id); showToast('Download started.'); } catch { showToast('Download failed.', 'error'); } }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
                <Download className="w-4 h-4" />Download PDF
              </button>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FAF7EF] border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#F1ECE0] transition-colors cursor-pointer">
                <Eye className="w-4 h-4" />View Full Document
              </button>
            </div>
            {activeGuide.relatedGuidelines && activeGuide.relatedGuidelines.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-ink-900">Related Guidelines</p>
                  <button className="text-[11px] text-brand-600 font-semibold hover:underline">See All →</button>
                </div>
                <div className="space-y-2">
                  {activeGuide.relatedGuidelines.slice(0, 2).map((rel: any, i: number) => (
                    <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl border border-line hover:bg-[#FAF7EF] cursor-pointer transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-[#F1ECE0] border border-line shrink-0 overflow-hidden">
                        <img src={rel.thumbnail || activeGuide.thumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink-900 truncate">{rel.title}</p>
                        <p className="text-[10px] text-muted-light">{rel.version}</p>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-light -rotate-90 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Upload modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-line">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="font-bold text-ink-900 text-sm">Upload Guideline Document</h3>
              <button onClick={() => setIsUploadOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Title *</label>
                <input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Brand Identity Guidelines" className="w-full px-3 py-2 text-xs border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Category</label>
                <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} className="w-full px-3 py-2 text-xs border border-line rounded-xl focus:outline-none cursor-pointer">
                  {['Brand Identity', 'Messaging & Tone', 'Visual Standards', 'Product Claims', 'Legal & Compliance', 'Marketing Assets'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Description</label>
                <textarea value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} rows={2} placeholder="Describe this guideline..." className="w-full px-3 py-2 text-xs border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">File *</label>
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-line rounded-xl text-xs text-muted hover:border-brand-400 hover:bg-brand-50 transition-colors">
                  {uploadFile ? uploadFile.name : 'Click to select PDF or DOCX'}
                </button>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsUploadOpen(false)} className="flex-1 py-2 border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors">Cancel</button>
                <button type="submit" disabled={isUploading} className="flex-1 py-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer transition-colors disabled:opacity-50">
                  {isUploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
