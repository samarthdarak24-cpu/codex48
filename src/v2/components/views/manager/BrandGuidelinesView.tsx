import React, { useMemo, useRef, useState } from 'react';
import {
  BookOpen, Layers, Clock, Archive, Eye, Download, FileText, Calendar, User, Tag,
  Upload, X, FolderOpen, Library, ShieldAlert, AlertCircle, FileUp, Search,
  ChevronRight, Lock,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { Guideline } from '../../../types';
import {
  AnimatedCounter, AnimatedCard, AnimatedDrawer, AnimatedModal, FilterPills, Reveal,
  SkeletonCard, SuccessCheck,
} from '../../motion';

/* ------------------------------------------------------------------ */
/* Local presentation helpers                                          */
/* ------------------------------------------------------------------ */

const STATUS_CLASS: Record<Guideline['status'], string> = {
  Active: 'badge-approved',
  Draft: 'badge-draft',
  Pending: 'badge-pending',
  Archived: 'badge-archived',
};

const CATEGORIES: Guideline['category'][] = [
  'Brand Identity',
  'Messaging & Tone',
  'Visual Standards',
  'Product Claims',
  'Legal & Compliance',
  'Marketing Assets',
];

const TILE_TONE = {
  brand: { chip: 'bg-brand-50 text-brand-600', value: 'text-ink' },
  sage: { chip: 'bg-sage-50 text-sage-600', value: 'text-ink' },
  warn: { chip: 'bg-warn-50 text-warn-600', value: 'text-ink' },
  olive: { chip: 'bg-olive-50 text-olive-600', value: 'text-ink' },
} as const;

type TileTone = keyof typeof TILE_TONE;

const Metric: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: TileTone;
  hint?: string;
}> = ({ label, value, icon, tone, hint }) => (
  <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
    <div className="flex items-start justify-between gap-2">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TILE_TONE[tone].chip}`}>
        {icon}
      </span>
      <span className="text-2xs text-muted">{hint}</span>
    </div>
    <p className="mt-3 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
    <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${TILE_TONE[tone].value}`}>
      <AnimatedCounter value={value} />
    </p>
  </div>
);

const Denied: React.FC = () => (
  <div className="mx-auto max-w-lg px-6 py-16 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta-50 text-terracotta-600">
      <Lock className="h-5 w-5" />
    </div>
    <h1 className="mt-4 text-lg font-semibold text-ink">Manager access required</h1>
    <p className="mt-1 text-xs leading-relaxed text-muted">
      The guideline library is restricted to brand managers. Ask a workspace owner to grant you
      the manager role if you need to publish or archive documents.
    </p>
  </div>
);

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export const BrandGuidelinesView: React.FC = () => {
  const {
    guidelines, selectedGuideline, setSelectedGuideline, searchQuery, setSearchQuery,
    showToast, refresh, downloadGuideline, loading, error, role,
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Draft' | 'Pending' | 'Archived'>('All');
  const [sortBy, setSortBy] = useState<'updated' | 'title'>('updated');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<string>('Brand Identity');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCount = guidelines.filter((g) => g.status === 'Active').length;
  const draftCount = guidelines.filter((g) => g.status === 'Draft').length;
  const pendingCount = guidelines.filter((g) => g.status === 'Pending').length;
  const archivedCount = guidelines.filter((g) => g.status === 'Archived').length;

  const categories = useMemo(
    () => [
      { name: 'All', label: 'All documents', count: guidelines.length },
      ...CATEGORIES.map((name) => ({
        name,
        label: name,
        count: guidelines.filter((g) => g.category === name).length,
      })),
    ],
    [guidelines],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = guidelines.filter((g) => {
      if (activeCategory !== 'All' && g.category !== activeCategory) return false;
      if (statusFilter !== 'All' && g.status !== statusFilter) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.owner.toLowerCase().includes(q)
      );
    });

    return [...rows].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      const at = Date.parse(a.lastUpdated);
      const bt = Date.parse(b.lastUpdated);
      if (Number.isNaN(at) || Number.isNaN(bt)) return a.title.localeCompare(b.title);
      return bt - at;
    });
  }, [guidelines, activeCategory, statusFilter, searchQuery, sortBy]);

  const activeGuide = selectedGuideline;

  const openGuide = (g: Guideline) => {
    setSelectedGuideline(g);
    setIsDrawerOpen(true);
  };

  const closeUpload = () => {
    setIsUploadOpen(false);
    setUploadError('');
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) { showToast('Please enter a guideline title.', 'error'); return; }
    if (!uploadFile) { showToast('Please select a file to upload.', 'error'); return; }
    setIsUploading(true);
    setUploadError('');
    try {
      await api.uploadGuidelineFile(uploadFile, uploadTitle.trim(), uploadCategory, uploadDescription.trim());
      await refresh();
      showToast('Guideline uploaded successfully.');
      setNotice(`“${uploadTitle.trim()}” was added to ${uploadCategory}.`);
      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadFile(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      setUploadError(message);
      showToast(message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await downloadGuideline(id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Download failed.', 'error');
    }
  };

  if (role !== 'manager') return <Denied />;

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-[1400px] space-y-5">
          <div className="h-16 animate-pulse rounded-2xl bg-cream-100" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">
              Document library
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">Brand Guidelines</h1>
            <p className="mt-1 text-sm text-muted">
              The documents the rule engine cites. Versions, owners and status come straight from the
              library record.
            </p>
          </div>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
          >
            <Upload className="h-3.5 w-3.5" />Upload document
          </button>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-xs text-danger-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div role="status" className="flex items-center gap-2.5 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-xs font-medium text-sage-700">
            <SuccessCheck size={16} />
            <span className="flex-1">{notice}</span>
            <button
              onClick={() => setNotice('')}
              className="rounded-lg p-1 text-sage-600 transition-colors hover:bg-sage-100"
              aria-label="Dismiss confirmation"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Metrics — counts only, no trend or forecast */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Documents" value={guidelines.length} icon={<BookOpen className="h-4 w-4" />} tone="brand" hint="in library" />
          <Metric label="Active" value={activeCount} icon={<Layers className="h-4 w-4" />} tone="sage" hint="citable" />
          <Metric label="Draft" value={draftCount} icon={<Clock className="h-4 w-4" />} tone="warn" hint={`${pendingCount} pending`} />
          <Metric label="Archived" value={archivedCount} icon={<Archive className="h-4 w-4" />} tone="olive" hint="retired" />
        </div>

        <div className="flex flex-col gap-5 lg:flex-row">

          {/* Category rail */}
          <aside className="lg:w-56 lg:shrink-0">
            <div className="rounded-2xl border border-line bg-white p-3 shadow-card">
              <p className="px-2 pb-2 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
                Categories
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible styled-scroll">
                {categories.map((cat) => {
                  const active = activeCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => setActiveCategory(cat.name)}
                      aria-pressed={active}
                      className={`flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors lg:w-full ${
                        active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-cream-50'
                      }`}
                    >
                      <span className="truncate">{cat.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-2xs font-semibold tabular-nums ${
                          active ? 'bg-brand-100 text-brand-700' : 'bg-cream-100 text-muted'
                        }`}
                      >
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 px-1 text-2xs leading-relaxed text-muted">
              Category totals include archived documents. Status tabs below narrow the list further.
            </p>
          </aside>

          {/* Library */}
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <FilterPills
                  options={([
                    ['All', guidelines.length],
                    ['Active', activeCount],
                    ['Draft', draftCount],
                    ['Pending', pendingCount],
                    ['Archived', archivedCount],
                  ] as const).map(([tab, count]) => ({ id: tab, label: `${tab} (${count})` }))}
                  selected={[statusFilter]}
                  onChange={(sel) => {
                    const next = sel.filter((id) => id !== statusFilter);
                    setStatusFilter((next[next.length - 1] as typeof statusFilter) ?? 'All');
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="relative">
                  <span className="sr-only">Search guidelines</span>
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-light" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search library"
                    className="w-40 rounded-xl border border-line bg-white py-1.5 pl-8 pr-2.5 text-xs text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <span>Sort</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value === 'title' ? 'title' : 'updated')}
                    className="cursor-pointer rounded-xl border border-line bg-white px-2 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="updated">Last updated</option>
                    <option value="title">Title A–Z</option>
                  </select>
                </label>
              </div>
            </div>

            {guidelines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center">
                <Library className="mx-auto h-7 w-7 text-muted-light" />
                <p className="mt-3 text-sm font-semibold text-ink">No guidelines in the library</p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">
                  Upload the first brand document. The rule engine can only cite passages that exist
                  in this library.
                </p>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="btn-primary-glow mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  <Upload className="h-3.5 w-3.5" />Upload a document
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-line bg-white px-6 py-14 text-center">
                <FolderOpen className="mx-auto h-7 w-7 text-muted-light" />
                <p className="mt-3 text-sm font-semibold text-ink">No documents match these filters</p>
                <p className="mt-1 text-xs text-muted">
                  {activeCategory !== 'All' ? `${activeCategory} · ` : ''}
                  {statusFilter} · {searchQuery ? `“${searchQuery}”` : 'all titles'}
                </p>
                <button
                  onClick={() => { setActiveCategory('All'); setStatusFilter('All'); setSearchQuery(''); }}
                  className="mt-4 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((g, i) => (
                  <Reveal key={g.id} delay={Math.min(i, 6) * 0.03}>
                    <AnimatedCard className="group flex h-full flex-col overflow-hidden">
                      <button
                        onClick={() => openGuide(g)}
                        className="relative block h-32 w-full overflow-hidden bg-cream-100 text-left"
                        aria-label={`Open ${g.title}`}
                      >
                        <img
                          src={g.thumbnail}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-2xs font-semibold text-ink-700 backdrop-blur-sm">
                          {g.category}
                        </span>
                        <span className={`absolute right-2 top-2 ${STATUS_CLASS[g.status]}`}>
                          {g.status}
                        </span>
                      </button>

                      <div className="flex flex-1 flex-col p-3.5">
                        <button
                          onClick={() => openGuide(g)}
                          className="text-left text-xs font-semibold leading-snug text-ink transition-colors hover:text-brand-700"
                        >
                          {g.title}
                        </button>
                        <p className="mt-1 line-clamp-2 text-2xs leading-relaxed text-muted">
                          {g.description}
                        </p>

                        <dl className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1 text-2xs text-muted">
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{g.format || 'Document'} · {g.version}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span className="truncate">{g.lastUpdated}</span>
                          </div>
                          <div className="col-span-2 flex items-center gap-1">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">Owner · {g.owner}</span>
                          </div>
                        </dl>

                        <div className="mt-3 flex items-center gap-1 border-t border-line pt-2">
                          <button
                            onClick={() => openGuide(g)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-semibold text-ink-700 transition-colors hover:bg-cream-100"
                          >
                            <Eye className="h-3 w-3" />Details
                          </button>
                          <button
                            onClick={() => handleDownload(g.id)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-semibold text-ink-700 transition-colors hover:bg-cream-100"
                          >
                            <Download className="h-3 w-3" />Download
                          </button>
                          <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-light" />
                        </div>
                      </div>
                    </AnimatedCard>
                  </Reveal>
                ))}
              </div>
            )}

            {filtered.length > 0 && (
              <p className="text-2xs text-muted">
                Showing {filtered.length} of {guidelines.length} documents. Sorted by{' '}
                {sortBy === 'title' ? 'title' : 'last updated'}.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      <AnimatedDrawer
        open={isDrawerOpen && !!activeGuide}
        onClose={() => setIsDrawerOpen(false)}
        title={activeGuide?.title ?? 'Guideline'}
        subtitle={activeGuide ? `${activeGuide.category} · ${activeGuide.version}` : undefined}
        width={460}
        footer={
          activeGuide ? (
            <div className="flex gap-2">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="flex-1 rounded-xl border border-line bg-white py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
              >
                Close
              </button>
              <button
                onClick={() => handleDownload(activeGuide.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <Download className="h-3.5 w-3.5" />Download file
              </button>
            </div>
          ) : undefined
        }
      >
        {activeGuide && (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-line">
              <img src={activeGuide.thumbnail} alt="" className="h-40 w-full object-cover" />
            </div>

            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">{activeGuide.title}</h3>
                <span className={`${STATUS_CLASS[activeGuide.status]} shrink-0`}>{activeGuide.status}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{activeGuide.description}</p>
            </div>

            <div>
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
                Record
              </p>
              <dl className="space-y-1.5">
                {[
                  { label: 'Version', value: activeGuide.version, icon: <FileText className="h-3.5 w-3.5" /> },
                  { label: 'Last updated', value: activeGuide.lastUpdated, icon: <Calendar className="h-3.5 w-3.5" /> },
                  { label: 'Owner', value: activeGuide.owner, icon: <User className="h-3.5 w-3.5" /> },
                  { label: 'Category', value: activeGuide.category, icon: <Tag className="h-3.5 w-3.5" /> },
                  { label: 'Format', value: activeGuide.format || 'Not recorded', icon: <FileUp className="h-3.5 w-3.5" /> },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-xs last:border-0"
                  >
                    <span className="flex items-center gap-1.5 text-muted">
                      {row.icon}{row.label}
                    </span>
                    <span className="max-w-[60%] truncate text-right font-medium text-ink">{row.value}</span>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-xl border border-line bg-cream-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Version history
                </p>
                <span className="text-2xs font-semibold tabular-nums text-ink-600">1 record</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-2xs font-semibold text-brand-700">
                  1
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{activeGuide.version} · current</p>
                  <p className="text-2xs text-muted">Updated {activeGuide.lastUpdated}</p>
                </div>
              </div>
              <p className="mt-2 text-2xs leading-relaxed text-muted">
                Only the current revision is stored for this document. Earlier revisions are not
                available in this workspace.
              </p>
            </div>

            <div className="rounded-xl border border-line p-3">
              <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
                Extracted content
              </p>
              <p className="mt-1.5 text-2xs leading-relaxed text-muted">
                Passage extraction runs on the server. This view does not expose the extracted text,
                so no preview is shown rather than a reconstructed one.
              </p>
            </div>
          </div>
        )}
      </AnimatedDrawer>

      {/* Upload modal */}
      <AnimatedModal
        open={isUploadOpen}
        onClose={closeUpload}
        title="Upload guideline document"
        description="The file is stored as-is. Extracted passages appear only after the server processes it."
        maxWidth={560}
        footer={
          <>
            <button
              type="button"
              onClick={closeUpload}
              className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="guideline-upload-form"
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? 'Uploading…' : 'Upload'}
            </button>
          </>
        }
      >
        <form id="guideline-upload-form" onSubmit={handleUploadSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="guideline-title" className="mb-1 block text-xs font-semibold text-ink-700">
              Title <span className="text-danger-600">*</span>
            </label>
            <input
              id="guideline-title"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Brand Identity Guidelines"
              className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label htmlFor="guideline-category" className="mb-1 block text-xs font-semibold text-ink-700">
              Category
            </label>
            <select
              id="guideline-category"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-line px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="guideline-description" className="mb-1 block text-xs font-semibold text-ink-700">
              Description
            </label>
            <textarea
              id="guideline-description"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              rows={2}
              placeholder="What this document governs"
              className="w-full resize-none rounded-xl border border-line px-3 py-2 text-xs text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-ink-700">
              File <span className="text-danger-600">*</span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
            <div
              role="button"
              tabIndex={0}
              aria-label="Choose a PDF or DOCX file, or drop one here"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) setUploadFile(dropped);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                dragging
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-line bg-cream-50 hover:border-brand-300 hover:bg-brand-50/50'
              }`}
            >
              <FileUp className="h-5 w-5 text-muted-light" />
              {uploadFile ? (
                <>
                  <p className="mt-1.5 max-w-full truncate text-xs font-semibold text-ink">{uploadFile.name}</p>
                  <p className="mt-0.5 text-2xs text-muted">
                    {Math.max(1, Math.round(uploadFile.size / 1024))} KB · click to replace
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1.5 text-xs font-medium text-ink-600">Drop a file here, or click to browse</p>
                  <p className="mt-0.5 text-2xs text-muted">PDF, DOC or DOCX</p>
                </>
              )}
            </div>
          </div>

          {uploadError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-2xs text-danger-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-muted">
            <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
            Uploading does not activate the document. It starts as a draft until a manager sets its
            status.
          </p>
        </form>
      </AnimatedModal>
    </div>
  );
};
