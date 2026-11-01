import React, { useMemo, useState, useRef } from 'react';
import { Upload, BookOpen, CheckCircle2, Clock, Archive, Download, FileText, ExternalLink, ChevronRight, X, Sparkles, ArrowUpRight, ArrowDownRight, Eye, MoreVertical, Calendar, User, Tag } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import { StatCardGrid } from '../../ui/StatCard';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Active: 'bg-emerald-500 text-white', Draft: 'bg-amber-500 text-white',
    Pending: 'bg-amber-500 text-white', Archived: 'bg-slate-400 text-white',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[status] ?? 'bg-slate-400 text-white'}`}>{status}</span>;
};

export const CreatorGuidelinesView: React.FC = () => {
  const { addToast, guidelines, downloadGuideline } = useApp();
  const [activeCategory, setActiveCategory] = useState('All Guidelines');
  const [activeStatus, setActiveStatus] = useState('All');
  const [selectedGuidelineId, setSelectedGuidelineId] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Brand Identity');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCount = guidelines.filter((g) => g.status === 'Active').length;
  const pendingCount = guidelines.filter((g) => g.status === 'Pending' || g.status === 'Draft').length;
  const archivedCount = guidelines.filter((g) => g.status === 'Archived').length;

  const selectedGuideline = guidelines.find((g) => g.id === selectedGuidelineId) || guidelines[0];

  const categories = useMemo(() => [
    { name: 'All Guidelines', count: guidelines.length },
    ...['Brand Identity', 'Messaging & Tone', 'Visual Standards', 'Product Claims', 'Legal & Compliance', 'Marketing Assets'].map((name) => ({
      name, count: guidelines.filter((g) => g.category === name).length,
    })),
  ], [guidelines]);

  const filtered = guidelines.filter((g) => {
    if (activeCategory !== 'All Guidelines' && g.category !== activeCategory) return false;
    if (activeStatus === 'Active' && g.status !== 'Active') return false;
    if (activeStatus === 'Draft' && g.status !== 'Draft') return false;
    if (activeStatus === 'Archived' && g.status !== 'Archived') return false;
    return true;
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadFile) { addToast('Please fill in title and select a file.', 'error'); return; }
    setIsUploading(true);
    try {
      await api.uploadGuidelineFile(uploadFile, uploadTitle, uploadCategory, uploadDescription);
      addToast('Guideline uploaded successfully.');
      setIsUploadOpen(false); setUploadTitle(''); setUploadFile(null);
    } catch (err) { addToast(err instanceof Error ? err.message : 'Upload failed.', 'error'); }
    finally { setIsUploading(false); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-canvas">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">Brand Guidelines</h1>
            <p className="text-xs text-muted mt-0.5">Access and manage your brand guidelines, policies and approved assets.</p>
          </div>
          <button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer shadow-2xs transition-colors cursor-pointer shrink-0">
            <Upload className="w-4 h-4" />Upload Document
          </button>
        </div>

        {/* KPI Cards */}
        <StatCardGrid cards={[
    { label: 'Total Guidelines', value: guidelines.length, icon: <BookOpen className="w-5 h-5" />, variant: 'green', trend: 12, sparkPathIndex: 0 },
    { label: 'Active Versions', value: activeCount, icon: <CheckCircle2 className="w-5 h-5" />, variant: 'blue', trend: 8, sparkPathIndex: 1 },
    { label: 'Pending Review', value: pendingCount, icon: <Clock className="w-5 h-5" />, variant: 'amber', trend: -1, sparkPathIndex: 2 },
    { label: 'Archived', value: archivedCount, icon: <Archive className="w-5 h-5" />, variant: 'purple', trend: 0, sparkPathIndex: 3 },
  ]} />

        {/* Two-column body */}
        <div className="flex gap-5">
          {/* Left: Category sidebar */}
          <div className="w-52 shrink-0 space-y-1">
            {categories.map((cat) => (
              <button key={cat.name} onClick={() => setActiveCategory(cat.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${activeCategory === cat.name ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-600 hover:bg-[#FAF7EF]'}`}>
                <span className="truncate">{cat.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeCategory === cat.name ? 'bg-brand-100 text-brand-700' : 'bg-[#F1ECE0] text-ink-600'}`}>{cat.count}</span>
              </button>
            ))}
            <div className="mt-4 p-3 bg-brand-50 border border-brand-100 rounded-xl text-center space-y-1.5">
              <p className="text-[11px] font-semibold text-brand-700 flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" />Keep your brand consistent across all content.</p>
              <button className="w-full py-1 bg-white border border-brand-200 rounded-lg text-[11px] font-semibold text-brand-700 hover:bg-[#FAF7EF] transition inline-flex items-center justify-center gap-1">
                View Brand Kit <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right: Guidelines grid */}
          <div className="flex-1 space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {(['All', 'Active', 'Draft', 'Archived'] as const).map((tab) => {
                  const cnt = tab === 'All' ? guidelines.length : tab === 'Active' ? activeCount : tab === 'Draft' ? pendingCount : archivedCount;
                  return (
                    <button key={tab} onClick={() => setActiveStatus(tab)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${activeStatus === tab ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm font-bold' : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'}`}>
                      {tab} ({cnt})
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted">Sort by:</span>
                <select className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"><option>Newest First</option></select>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.length === 0 && <div className="col-span-full text-center py-12 text-xs text-muted bg-white rounded-2xl border border-line">No guidelines found.</div>}
              {filtered.map((g) => (
                <div key={g.id} onClick={() => { setSelectedGuidelineId(g.id); setIsDetailOpen(true); }}
                  className={`bg-white rounded-2xl border overflow-hidden shadow-2xs cursor-pointer hover:-translate-y-0.5 hover:shadow-xs transition-all ${selectedGuideline?.id === g.id ? 'ring-2 ring-brand-500 border-transparent' : 'border-line hover:border-line-strong'}`}>
                  <div className="relative h-36 overflow-hidden bg-[#F1ECE0]">
                    <img src={g.thumbnail} alt={g.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2"><StatusBadge status={g.status} /></div>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="font-bold text-ink-900 text-xs">{g.title}</p>
                    <p className="text-[11px] text-muted line-clamp-2">{g.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-light pt-1 border-t border-[#F5F0E8]">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" />PDF · {g.version}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{g.lastUpdated}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedGuidelineId(g.id); setIsDetailOpen(true); }} className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">
                        <Eye className="w-3 h-3" />View →
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); downloadGuideline(g.id); }} className="ml-auto p-1 text-muted hover:text-ink-700 rounded transition-colors"><Download className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Right detail panel */}
      {isDetailOpen && selectedGuideline && (
        <aside className="w-[300px] bg-white border-l border-line flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <h3 className="text-sm font-bold text-ink-900">Guideline Details</h3>
            <button onClick={() => setIsDetailOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="rounded-xl overflow-hidden border border-line">
              <img src={selectedGuideline.thumbnail} alt={selectedGuideline.title} className="w-full h-36 object-cover" />
            </div>
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-ink-900 text-sm">{selectedGuideline.title}</p>
              <StatusBadge status={selectedGuideline.status} />
            </div>
            <p className="text-xs text-muted leading-relaxed">{selectedGuideline.description}</p>
            <div className="space-y-0">
              {[['Version', selectedGuideline.version], ['Last Updated', selectedGuideline.lastUpdated], ['Owner', selectedGuideline.owner], ['Category', selectedGuideline.category]].map(([label, val]) => (
                <div key={String(label)} className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8] last:border-0 text-xs">
                  <span className="text-muted flex items-center gap-1.5">
                    {label === 'Version' && <FileText className="w-3 h-3" />}
                    {label === 'Last Updated' && <Calendar className="w-3 h-3" />}
                    {label === 'Owner' && <User className="w-3 h-3" />}
                    {label === 'Category' && <Tag className="w-3 h-3" />}
                    {label}
                  </span>
                  <span className="font-medium text-ink">{val}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <button onClick={() => downloadGuideline(selectedGuideline.id)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors cursor-pointer">
                <Download className="w-4 h-4" />Download PDF
              </button>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FAF7EF] border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#F1ECE0] transition-colors cursor-pointer">
                <ExternalLink className="w-4 h-4" />View Full Document
              </button>
            </div>
            {selectedGuideline.relatedGuidelines && selectedGuideline.relatedGuidelines.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-ink-900">Related Guidelines</p>
                  <button className="text-[11px] text-brand-600 font-semibold hover:underline cursor-pointer">See All →</button>
                </div>
                {selectedGuideline.relatedGuidelines.slice(0, 2).map((rel: any, i: number) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl border border-line hover:bg-[#FAF7EF] cursor-pointer transition-colors mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F1ECE0] border border-line shrink-0 overflow-hidden">
                      <img src={rel.thumbnail || selectedGuideline.thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink-900 truncate">{rel.title}</p>
                      <p className="text-[10px] text-muted-light">{rel.version}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-light shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-line">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="font-bold text-ink-900 text-sm">Upload Guideline Document</h3>
              <button onClick={() => setIsUploadOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-3">
              <div><label className="block text-xs font-semibold text-ink-700 mb-1">Title *</label><input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Brand Identity Guidelines" className="w-full px-3 py-2 text-xs border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
              <div><label className="block text-xs font-semibold text-ink-700 mb-1">Category</label><select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} className="w-full px-3 py-2 text-xs border border-line rounded-xl focus:outline-none cursor-pointer">{['Brand Identity', 'Messaging & Tone', 'Visual Standards', 'Product Claims', 'Legal & Compliance', 'Marketing Assets'].map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-ink-700 mb-1">Description</label><textarea value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} rows={2} placeholder="Describe this guideline..." className="w-full px-3 py-2 text-xs border border-line rounded-xl focus:outline-none resize-none" /></div>
              <div><label className="block text-xs font-semibold text-ink-700 mb-1">File *</label><input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} /><button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-line rounded-xl text-xs text-muted hover:border-brand-400 hover:bg-brand-50 transition-colors">{uploadFile ? uploadFile.name : 'Click to select PDF or DOCX'}</button></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsUploadOpen(false)} className="flex-1 py-2 border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors">Cancel</button>
                <button type="submit" disabled={isUploading} className="flex-1 py-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer transition-colors disabled:opacity-50">{isUploading ? 'Uploading…' : 'Upload'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
