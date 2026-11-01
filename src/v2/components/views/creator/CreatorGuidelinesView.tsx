import React, { useMemo, useState } from 'react';
import {
  Upload,
  BookOpen,
  CheckCircle2,
  Clock,
  Archive,
  Download,
  FileText,
  ExternalLink,
  ChevronRight,
  X,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { downloadFile } from '@/services/api';

export const CreatorGuidelinesView: React.FC = () => {
  const { addToast, guidelines, downloadGuideline } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('All Guidelines');
  const [activeStatus, setActiveStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'title'>('newest');
  const [selectedGuidelineId, setSelectedGuidelineId] = useState<string>('');

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: guidelines.length };
    for (const g of guidelines) {
      counts[g.status] = (counts[g.status] ?? 0) + 1;
    }
    return counts;
  }, [guidelines]);

  const categories = useMemo(
    () => [
      { name: 'All Guidelines', count: guidelines.length },
      ...[
        'Brand Identity',
        'Messaging & Tone',
        'Visual Standards',
        'Product Claims',
        'Legal & Compliance',
        'Marketing Assets',
      ].map((name) => ({
        name,
        count: guidelines.filter((g) => g.category === name).length,
      })),
    ],
    [guidelines],
  );

  const guidelinesList = useMemo(
    () =>
      guidelines.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        fullDescription: g.description,
        category: g.category,
        format: g.format ?? 'PDF',
        version: g.version,
        date: g.lastUpdated,
        status: g.status,
        owner: g.owner,
        thumbnail: g.thumbnail,
      })),
    [guidelines],
  );

  const selectedGuideline =
    guidelinesList.find((g) => g.id === selectedGuidelineId) ?? guidelinesList[0];

  const filteredGuidelines = useMemo(() => {
    const filtered = guidelinesList.filter((g) => {
      if (activeCategory !== 'All Guidelines' && g.category !== activeCategory) return false;
      if (activeStatus !== 'All' && g.status !== activeStatus) return false;
      return true;
    });
    const sorted = [...filtered];
    if (sortBy === 'newest') {
      sorted.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    } else {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  }, [guidelinesList, activeCategory, activeStatus, sortBy]);

  const relatedGuidelines = useMemo(
    () => guidelinesList.filter((g) => g.id !== selectedGuideline?.id).slice(0, 3),
    [guidelinesList, selectedGuideline],
  );

  if (guidelinesList.length === 0) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Brand Guidelines</h1>
          <p className="text-sm text-muted mt-0.5">
            Access and consult certified brand guidelines, policies and approved asset rules.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-line/90 shadow-2xs p-10 text-center space-y-3">
          <BookOpen className="w-6 h-6 text-muted mx-auto" />
          <div className="text-sm font-bold text-ink-900">No guidelines published yet</div>
          <p className="text-xs text-muted">
            Guidelines appear here once a Brand Manager uploads and activates them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Brand Guidelines</h1>
          <p className="text-sm text-muted mt-0.5">
            Access and consult certified brand guidelines, policies and approved asset rules.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF7EF] border border-line rounded-lg text-xs text-muted font-medium">
          <BookOpen className="w-3.5 h-3.5 text-brand-600" />
          <span>Read-Only Creator Mode</span>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Total Guidelines</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">{guidelines.length}</div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>↑ Active</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Active Versions</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">
              {guidelines.filter((g) => g.status === 'Active').length}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>Certified</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Pending Review</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">
              {guidelines.filter((g) => g.status === 'Pending' || g.status === 'Draft').length}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 mt-1">
              <Clock className="w-3 h-3" />
              <span>Pending</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Categories</div>
            <div className="text-2xl font-bold text-ink-900 mt-1">
              {new Set(guidelines.map((g) => g.category)).size}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 mt-1">
              <span>Coverage</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-grape-50 text-grape-600 flex items-center justify-center">
            <Archive className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main 3-Column Layout: Left Categories + Center Grid + Right Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Categories Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-line p-4 shadow-xs space-y-1 text-xs">
            <h2 className="font-bold text-ink-900 text-sm mb-3 px-1">Categories</h2>
            {categories.map((cat) => {
              const isSelected = activeCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-brand-50 text-brand-700 font-bold'
                      : 'text-ink-600 hover:bg-[#FAF7EF] hover:text-ink-900'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-brand-200/80 text-brand-700' : 'bg-[#F1ECE0] text-muted'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Brand Kit Card */}
          <div className="p-4 rounded-xl border border-line bg-white shadow-xs text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-xs text-ink-600 leading-tight">
              Keep your brand consistent across all content.
            </p>
            <button
              disabled
              title="The Brand Kit package is managed by your Brand Manager and is not downloadable from creator mode."
              className="text-xs font-bold text-muted/60 cursor-not-allowed inline-flex items-center gap-1"
            >
              <span>View Brand Kit</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Grid: Filter Pills + Guideline Cards */}
        <div className="lg:col-span-6 space-y-4">
          {/* Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: 'All', label: `All (${statusCounts.All ?? 0})` },
                { id: 'Active', label: `Active (${statusCounts.Active ?? 0})` },
                { id: 'Pending Review', label: `Pending (${statusCounts['Pending Review'] ?? 0})` },
                { id: 'Archived', label: `Archived (${statusCounts.Archived ?? 0})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setActiveStatus(pill.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    activeStatus === pill.id
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-white border border-line text-ink-600 hover:bg-[#FAF7EF]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'title')}
                className="px-2.5 py-1.5 bg-white border border-line rounded-lg text-xs font-semibold text-ink-700 shadow-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="newest">Sort by: Newest First</option>
                <option value="title">Sort by: Title (A–Z)</option>
              </select>
            </div>
          </div>

          {/* Guideline Cards 2-Col Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredGuidelines.map((g) => {
              const isSelected = selectedGuideline?.id === g.id;
              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGuidelineId(g.id)}
                  className={`bg-white rounded-xl border overflow-hidden shadow-xs cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-line hover:border-line-strong'
                  }`}
                >
                  <div>
                    <div className="relative h-28 bg-[#F1ECE0] overflow-hidden">
                      <img
                        src={g.thumbnail}
                        alt={g.title}
                        className="w-full h-full object-cover"
                      />
                      <span
                        className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                          g.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>

                    <div className="p-3.5 space-y-1">
                      <h3 className="font-bold text-ink-900 text-xs truncate">{g.title}</h3>
                      <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                        {g.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 border-t border-[#F1ECE0] flex items-center justify-between text-[11px] text-muted-light">
                    <span className="flex items-center gap-1 font-mono text-ink-600">
                      <FileText className="w-3 h-3 text-rose-500" />
                      {g.format} • {g.version}
                    </span>
                    <button className="font-bold text-brand-600 hover:text-brand-700 flex items-center gap-0.5 cursor-pointer">
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Rail: Guideline Details */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-line shadow-xs p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F1ECE0]">
            <h2 className="text-xs font-bold text-ink-900">Guideline Details</h2>
            <button className="text-muted-light hover:text-ink-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedGuideline && (
            <>
              <div className="rounded-xl overflow-hidden border border-line bg-[#F1ECE0]">
                <img
                  src={selectedGuideline.thumbnail}
                  alt={selectedGuideline.title}
                  className="w-full h-36 object-cover"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-ink-900 text-sm">{selectedGuideline.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {selectedGuideline.status}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {selectedGuideline.fullDescription}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#F1ECE0] text-xs">
                <div className="flex justify-between py-1 border-b border-[#FAF7EF]">
                  <span className="text-muted">Version</span>
                  <span className="font-mono font-semibold text-ink-900">{selectedGuideline.version}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#FAF7EF]">
                  <span className="text-muted">Last Updated</span>
                  <span className="font-semibold text-ink-900">{selectedGuideline.date}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted">Owner</span>
                  <span className="font-semibold text-ink-900">{selectedGuideline.owner}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={async () => {
                    try {
                      await downloadFile(
                        `/guidelines/${selectedGuideline.id}/download`,
                        `${selectedGuideline.title.replace(/\s+/g, '_')}.pdf`,
                      );
                      addToast(`Downloaded ${selectedGuideline.title}`, 'success');
                    } catch (err) {
                      addToast(
                        err instanceof Error ? err.message : 'Download failed — the file may not be attached.',
                        'error',
                      );
                    }
                  }}
                  className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={async () => {
                    if (!selectedGuideline) return;
                    try {
                      await downloadGuideline(selectedGuideline.id);
                      addToast(`Opened ${selectedGuideline.title}`, 'success');
                    } catch (err) {
                      addToast(err instanceof Error ? err.message : 'Could not open document.', 'error');
                    }
                  }}
                  className="w-full py-2 bg-white border border-line hover:bg-[#FAF7EF] text-ink-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted" />
                  <span>View Full Document</span>
                </button>
              </div>

              {/* Related Guidelines — derived from the live library */}
              {relatedGuidelines.length > 0 && (
                <div className="pt-2 border-t border-[#F1ECE0] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-ink-900">
                    <span>Related Guidelines</span>
                    <button className="text-[11px] text-brand-600 hover:underline">See All →</button>
                  </div>
                  {relatedGuidelines.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGuidelineId(g.id)}
                      className="flex items-center justify-between p-2 rounded-lg border border-line hover:bg-[#FAF7EF] cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={g.thumbnail}
                          alt=""
                          className="w-8 h-8 rounded object-cover"
                        />
                        <div className="text-left">
                          <div className="text-xs font-bold text-ink-900">{g.title}</div>
                          <div className="text-[10px] text-muted-light">{g.version}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-light" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
