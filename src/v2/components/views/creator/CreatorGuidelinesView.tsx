import React, { useMemo, useRef, useState } from 'react';
import {
  Archive, BookOpen, Calendar, CheckCircle2, Clock, Download, Eye, FileText, Loader2, Search,
  Tag, Upload, User,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import {
  AnimatedCounter, AnimatedDrawer, AnimatedModal, EmptyState, FilterPills, PageTransition,
  SectionHeader, Stagger, StaggerItem, AnimatedCard,
} from '../../motion';

type StatusFilter = 'All' | 'Active' | 'Draft' | 'Archived';

const STATUS_FILTERS: StatusFilter[] = ['All', 'Active', 'Draft', 'Archived'];

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const cls =
    status === 'Active'
      ? 'badge-approved'
      : status === 'Draft'
        ? 'badge-draft'
        : status === 'Pending'
          ? 'badge-pending'
          : 'badge-archived';
  return <span className={cls}>{status}</span>;
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  'Brand Identity': <BookOpen className="h-3.5 w-3.5" />,
  'Messaging & Tone': <FileText className="h-3.5 w-3.5" />,
  'Visual Standards': <Eye className="h-3.5 w-3.5" />,
  'Product Claims': <Tag className="h-3.5 w-3.5" />,
  'Legal & Compliance': <Archive className="h-3.5 w-3.5" />,
  'Marketing Assets': <Upload className="h-3.5 w-3.5" />,
};

const Metric: React.FC<{ label: string; value: number; icon: React.ReactNode; tone: string }> = ({
  label, value, icon, tone,
}) => (
  <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
    <p className="mt-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
    <p className="mt-0.5 text-2xl font-semibold leading-none tabular-nums text-ink">
      <AnimatedCounter value={value} />
    </p>
  </div>
);

export const CreatorGuidelinesView: React.FC = () => {
  const { addToast, guidelines, downloadGuideline, loading, error, refresh } = useApp();
  const [activeCategory, setActiveCategory] = useState('All Guidelines');
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Newest First');
  const [detailId, setDetailId] = useState<string | null>(null);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Brand Identity');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCount = guidelines.filter((g) => g.status === 'Active').length;
  const draftCount = guidelines.filter((g) => g.status === 'Draft' || g.status === 'Pending').length;
  const archivedCount = guidelines.filter((g) => g.status === 'Archived').length;

  const categories = useMemo(
    () => [
      { name: 'All Guidelines', count: guidelines.length },
      ...['Brand Identity', 'Messaging & Tone', 'Visual Standards', 'Product Claims', 'Legal & Compliance', 'Marketing Assets'].map((name) => ({
        name,
        count: guidelines.filter((g) => g.category === name).length,
      })),
    ],
    [guidelines],
  );

  const filtered = useMemo(() => {
    const rows = guidelines.filter((g) => {
      if (activeCategory !== 'All Guidelines' && g.category !== activeCategory) return false;
      if (activeStatus === 'Active' && g.status !== 'Active') return false;
      if (activeStatus === 'Draft' && g.status !== 'Draft' && g.status !== 'Pending') return false;
      if (activeStatus === 'Archived' && g.status !== 'Archived') return false;
      const q = searchQuery.trim().toLowerCase();
      if (q && !g.title.toLowerCase().includes(q) && !g.description.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sortBy === 'Title A–Z') rows.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'Version') rows.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    else rows.sort((a, b) => (Date.parse(b.lastUpdated) || 0) - (Date.parse(a.lastUpdated) || 0));
    return rows;
  }, [guidelines, activeCategory, activeStatus, searchQuery, sortBy]);

  const detail = guidelines.find((g) => g.id === detailId) ?? null;

  const handleUpload = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!uploadTitle.trim() || !uploadFile) {
      setUploadError('Please fill in the title and select a file.');
      addToast('Please fill in title and select a file.', 'error');
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    try {
      await api.uploadGuidelineFile(uploadFile, uploadTitle, uploadCategory, uploadDescription);
      await refresh();
      addToast('Guideline uploaded successfully.');
      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadFile(null);
      setUploadDescription('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      setUploadError(message);
      addToast(message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6" aria-busy="true" aria-label="Loading guidelines">
        <div className="h-8 w-64 animate-pulse rounded-xl bg-cream-100" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-line bg-white" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[250px] animate-pulse rounded-2xl border border-line bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
          <p className="text-sm font-semibold text-danger-700">Guidelines could not load.</p>
          <p className="mt-1 text-xs text-danger-600">{error}</p>
          <button
            onClick={() => void refresh()}
            className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">Reference</p>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">Brand Guidelines</h1>
            <p className="mt-1 text-sm text-muted">
              The documents the rule engine cites when it reviews your content.
            </p>
          </div>
          <button
            onClick={() => { setUploadError(null); setIsUploadOpen(true); }}
            className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
          >
            <Upload className="h-4 w-4" />Upload document
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Metric label="Total documents" value={guidelines.length} icon={<BookOpen className="h-4 w-4" />} tone="bg-brand-50 text-brand-600" />
          <Metric label="Active versions" value={activeCount} icon={<CheckCircle2 className="h-4 w-4" />} tone="bg-sage-50 text-sage-600" />
          <Metric label="Draft or pending" value={draftCount} icon={<Clock className="h-4 w-4" />} tone="bg-warn-50 text-warn-600" />
          <Metric label="Archived" value={archivedCount} icon={<Archive className="h-4 w-4" />} tone="bg-cream-100 text-muted" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)]">
          {/* Categories */}
          <nav aria-label="Guideline categories" className="lg:space-y-1">
            <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  aria-pressed={activeCategory === cat.name}
                  className={`flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors lg:w-full ${
                    activeCategory === cat.name
                      ? 'bg-brand-50 font-semibold text-brand-700'
                      : 'text-ink-600 hover:bg-cream-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className={activeCategory === cat.name ? 'text-brand-600' : 'text-muted-light'}>
                      {CATEGORY_ICON[cat.name] ?? <BookOpen className="h-3.5 w-3.5" />}
                    </span>
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 text-2xs font-bold tabular-nums ${
                    activeCategory === cat.name ? 'bg-brand-100 text-brand-700' : 'bg-cream-100 text-ink-600'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </nav>

          {/* Grid */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FilterPills
                options={STATUS_FILTERS.map((tab) => ({
                  id: tab,
                  label: `${tab} (${tab === 'All' ? guidelines.length : tab === 'Active' ? activeCount : tab === 'Draft' ? draftCount : archivedCount})`,
                }))}
                selected={[activeStatus]}
                onChange={(sel) => {
                  const next = sel.filter((id) => id !== activeStatus);
                  setActiveStatus((next[next.length - 1] as typeof activeStatus) ?? 'All');
                }}
              />
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <div className="relative min-w-0 flex-1 sm:flex-none">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-light" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents"
                    aria-label="Search guidelines"
                    className="w-full rounded-xl border border-line bg-white py-2 pl-8 pr-3 text-xs text-ink placeholder:text-muted-light focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:w-48"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort guidelines"
                  className="cursor-pointer rounded-xl border border-line bg-white px-2.5 py-2 text-xs font-medium text-ink focus:outline-none"
                >
                  <option>Newest First</option>
                  <option>Title A–Z</option>
                  <option>Version</option>
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-6 w-6" />}
                title={guidelines.length === 0 ? 'No guidelines published yet' : 'No documents match this filter'}
                description={
                  guidelines.length === 0
                    ? 'An administrator must publish a guideline before the rule engine can cite one.'
                    : 'Try a different category, status or search term.'
                }
                action={
                  guidelines.length > 0
                    ? {
                        label: 'Clear filters',
                        onClick: () => { setActiveCategory('All Guidelines'); setActiveStatus('All'); setSearchQuery(''); },
                      }
                    : undefined
                }
              />
            ) : (
              <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((g) => (
                  <StaggerItem key={g.id}>
                    <AnimatedCard className="flex h-full flex-col overflow-hidden">
                      <button
                        onClick={() => setDetailId(g.id)}
                        aria-label={`Open ${g.title}`}
                        className="group relative block h-36 w-full overflow-hidden bg-cream-100 text-left"
                      >
                        <img
                          src={g.thumbnail}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <span className="absolute right-2 top-2"><StatusChip status={g.status} /></span>
                      </button>
                      <div className="flex flex-1 flex-col p-3.5">
                        <p className="truncate text-xs font-semibold text-ink">{g.title}</p>
                        <p className="mt-1 line-clamp-2 text-2xs leading-relaxed text-muted">{g.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft pt-2 text-2xs text-muted-light">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />{g.format || 'PDF'} · {g.version}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />{g.lastUpdated}
                          </span>
                        </div>
                        <div className="mt-auto flex items-center gap-3 pt-2.5">
                          <button
                            onClick={() => setDetailId(g.id)}
                            className="inline-flex items-center gap-1 text-2xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
                          >
                            <Eye className="h-3 w-3" />View
                          </button>
                          <button
                            onClick={() => void downloadGuideline(g.id)}
                            aria-label={`Download ${g.title}`}
                            className="ml-auto rounded-lg p-1 text-muted transition-colors hover:bg-cream-50 hover:text-ink-700"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </AnimatedCard>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </div>
        </div>
      </div>

      {/* Detail */}
      <AnimatedDrawer
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail?.title ?? 'Guideline'}
        subtitle={detail ? `${detail.category} · ${detail.version}` : undefined}
        footer={
          detail ? (
            <button
              onClick={() => void downloadGuideline(detail.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white py-2.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
            >
              <Download className="h-4 w-4" />Download document
            </button>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-line bg-cream-100">
              <img src={detail.thumbnail} alt="" className="h-40 w-full object-cover" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={detail.status} />
              <span className="badge-draft">{detail.format || 'PDF'}</span>
            </div>
            <p className="text-xs leading-relaxed text-ink-600">{detail.description}</p>
            <div>
              <SectionHeader title="Document record" />
              <dl className="mt-2 space-y-0">
                {[
                  ['Version', detail.version],
                  ['Last updated', detail.lastUpdated],
                  ['Owner', detail.owner],
                  ['Category', detail.category],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 border-b border-line-soft py-1.5 text-xs last:border-0"
                  >
                    <dt className="flex items-center gap-1.5 text-muted">
                      {label === 'Version' && <FileText className="h-3 w-3" />}
                      {label === 'Last updated' && <Calendar className="h-3 w-3" />}
                      {label === 'Owner' && <User className="h-3 w-3" />}
                      {label === 'Category' && <Tag className="h-3 w-3" />}
                      {label}
                    </dt>
                    <dd className="max-w-[60%] truncate text-right font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </AnimatedDrawer>

      {/* Upload */}
      <AnimatedModal
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload guideline document"
        description="Published documents become citable evidence for the rule engine."
        footer={
          <>
            <button
              onClick={() => setIsUploadOpen(false)}
              className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isUploading ? 'Uploading…' : 'Upload'}
            </button>
          </>
        }
      >
        <form onSubmit={handleUpload} className="space-y-3">
          <div>
            <label htmlFor="guideline-title" className="mb-1 block text-xs font-semibold text-ink-700">Title *</label>
            <input
              id="guideline-title"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="e.g. Brand identity guidelines"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs text-ink placeholder:text-muted-light focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label htmlFor="guideline-category" className="mb-1 block text-xs font-semibold text-ink-700">Category</label>
            <select
              id="guideline-category"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-line bg-white px-3 py-2.5 text-xs text-ink focus:outline-none"
            >
              {['Brand Identity', 'Messaging & Tone', 'Visual Standards', 'Product Claims', 'Legal & Compliance', 'Marketing Assets'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="guideline-description" className="mb-1 block text-xs font-semibold text-ink-700">Description</label>
            <textarea
              id="guideline-description"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              rows={2}
              placeholder="Describe this guideline…"
              className="w-full resize-none rounded-xl border border-line bg-white px-3 py-2.5 text-xs text-ink placeholder:text-muted-light focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold text-ink-700">File *</span>
            <input
              ref={fileInputRef}
              id="guideline-file"
              type="file"
              accept=".pdf,.docx,.doc"
              className="sr-only"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="guideline-file"
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-3 text-xs text-muted transition-colors hover:border-brand-300 hover:bg-brand-50/40"
            >
              <Upload className="h-4 w-4" />
              {uploadFile ? uploadFile.name : 'Choose a PDF or DOCX file'}
            </label>
          </div>
          {uploadError && <p role="alert" className="text-2xs font-medium text-danger-600">{uploadError}</p>}
        </form>
      </AnimatedModal>
    </PageTransition>
  );
};
