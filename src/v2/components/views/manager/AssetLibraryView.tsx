/**
 * Asset Library — visual-first gallery.
 *
 * Thumbnails, counts, tags and file previews all come from `useApp().assets`
 * and the protected `/assets/:id/file` endpoint. Nothing is seeded.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronDown, Download, Eye, Images, LayoutGrid,
  List, Loader2, Lock, Search, Upload, UploadCloud, X,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { Asset } from '../../../types';
import {
  AnimatedCard, AnimatedCounter, AnimatedModal, EmptyState, FilterPills, PageTransition,
  SectionHeader, Stagger, StaggerItem, SuccessCheck,
} from '../../motion';
import { DataTable, type DataTableColumn } from '../../ui/DataTable';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 12;

const STATUS_CLASS: Record<string, string> = {
  Approved: 'badge-approved',
  'In Review': 'badge-inreview',
  Pending: 'badge-pending',
  Flagged: 'badge-flagged',
};

const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => (
  <span className={`${STATUS_CLASS[status] ?? 'badge-draft'} ${className}`}>{status}</span>
);

type Category = 'All' | 'image' | 'video' | 'document' | 'other';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'All', label: 'All assets' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'document', label: 'Documents' },
  { id: 'other', label: 'Others' },
];

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export const AssetLibraryView: React.FC = () => {
  const {
    role, assets, searchQuery, showToast, loading, error, refresh,
    selectedAsset, setSelectedAsset,
  } = useApp();

  const [category, setCategory] = useState<Category>('All');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [query, setQuery] = useState(searchQuery);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Asset | null>(selectedAsset ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'missing'>('idle');
  const [isUploading, setIsUploading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  const approvedCount = assets.filter((a) => a.status === 'Approved').length;
  const pendingCount = assets.filter((a) => a.status === 'In Review' || a.status === 'Pending').length;
  const flaggedCount = assets.filter((a) => a.status === 'Flagged').length;

  const counts = useMemo(() => {
    const map: Record<Category, number> = {
      All: assets.length,
      image: 0,
      video: 0,
      document: 0,
      other: 0,
    };
    for (const a of assets) map[a.type] += 1;
    return map;
  }, [assets]);

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    return assets.filter((ast) => {
      if (category !== 'All' && ast.type !== category) return false;
      if (statusFilter !== 'All statuses' && ast.status !== statusFilter) return false;
      if (!q) return true;
      return (
        ast.name.toLowerCase().includes(q) ||
        ast.campaign.toLowerCase().includes(q) ||
        ast.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [assets, category, statusFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const columns = useMemo<DataTableColumn<Asset>[]>(
    () => [
      {
        id: 'name',
        header: 'Asset',
        accessor: (ast) => ast.name,
        cell: (ast) => (
          <div className="flex items-center gap-2.5">
            <img src={ast.thumbnail} alt="" className="h-9 w-9 rounded-lg border border-line object-cover" />
            <span className="text-xs font-medium text-ink">{ast.name}</span>
          </div>
        ),
      },
      {
        id: 'format',
        header: 'Type',
        accessor: (ast) => ast.format,
        cell: (ast) => <span className="text-xs text-muted">{ast.format}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        accessor: (ast) => ast.status,
        cell: (ast) => <StatusBadge status={ast.status} />,
      },
      {
        id: 'campaign',
        header: 'Campaign',
        accessor: (ast) => ast.campaign,
        cell: (ast) => <span className="text-xs text-muted">{ast.campaign}</span>,
      },
      {
        id: 'uploaded',
        header: 'Uploaded',
        accessor: (ast) => ast.uploadedAt,
        cell: (ast) => <span className="text-xs text-muted">{ast.uploadedAt}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        sortable: false,
        canHide: false,
        align: 'right',
        width: '88px',
        cell: (ast) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openPreview(ast);
              }}
              aria-label={`Preview ${ast.name}`}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-cream-100 hover:text-ink"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(ast);
              }}
              aria-label={`Download ${ast.name}`}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-cream-100 hover:text-ink"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  /* ---- Fetch the real file for the preview modal ---- */
  useEffect(() => {
    if (!preview) return;
    let cancelled = false;
    let created: string | null = null;
    setPreviewUrl(null);
    setPreviewState('loading');

    api
      .fetchAssetBlobUrl(preview.id)
      .then((url) => {
        created = url;
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        setPreviewUrl(url);
        setPreviewState(url ? 'idle' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setPreviewState('missing');
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [preview?.id]);

  const openPreview = (asset: Asset) => {
    setSelectedAsset(asset);
    setPreview(asset);
    setUploadedName(null);
  };

  const handleFile = async (file: File) => {
    setIsUploading(true);
    setUploadedName(null);
    try {
      await api.uploadAsset(file, file.name, 'PureGlow', 'Image', '');
      await refresh();
      setUploadedName(file.name);
      showToast('Asset uploaded.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  /* Whole-library drop target: drag a file anywhere onto the gallery, or use
     the header button (which delegates to the same dropzone picker). */
  const { getRootProps, getInputProps, open: openPicker, isDragActive, isDragReject } = useDropzone({
    onDrop: (accepted, rejections) => {
      if (rejections.length > 0) {
        const code = rejections[0].errors[0]?.code;
        showToast(
          code === 'file-too-large'
            ? 'That file is larger than 40 MB.'
            : 'That file type is not supported in the asset library.',
          'error',
        );
        return;
      }
      if (accepted[0]) handleFile(accepted[0]);
    },
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'],
      'video/*': ['.mp4', '.webm'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 40 * 1024 * 1024,
    multiple: false,
    noClick: true,
    disabled: isUploading,
  });

  const handleApprove = async () => {
    if (!preview) return;
    setIsApproving(true);
    try {
      await api.approveAsset(preview.id);
      await refresh();
      showToast('Asset approved.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Approval failed.', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDownload = async (asset: Asset) => {
    try {
      const url = await api.fetchAssetBlobUrl(asset.id);
      if (!url) {
        showToast('No stored file for this asset.', 'warning');
        return;
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast('Download failed.', 'error');
    }
  };

  /* ---- States ---- */

  if (role !== 'manager') {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-10 text-center shadow-card">
          <Lock className="mx-auto h-8 w-8 text-muted-light" />
          <h1 className="mt-3 text-lg font-semibold text-ink">Manager access only</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            The brand asset library is managed by brand managers. Your current role is {role}.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-[1500px] space-y-4">
          <div className="h-14 w-1/3 animate-pulse rounded-2xl bg-cream-100" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[100px] animate-pulse rounded-2xl bg-cream-100" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-cream-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="p-4 sm:p-6">
      {isDragActive && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-brand-900/25 backdrop-blur-[2px]">
          <div
            className={`flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed px-10 py-8 shadow-pop ${
              isDragReject ? 'border-danger-300 bg-danger-50' : 'border-brand-300 bg-cream-50'
            }`}
          >
            <UploadCloud className={`h-9 w-9 ${isDragReject ? 'text-danger-500' : 'text-brand-500'}`} />
            <p className="text-sm font-semibold text-ink">
              {isDragReject ? 'That file type is not accepted' : 'Drop to add to the library'}
            </p>
            <p className="text-2xs text-muted">PNG, JPG, WEBP, SVG, MP4, WEBM or PDF · up to 40 MB</p>
          </div>
        </div>
      )}
      <div {...getRootProps()} className="mx-auto max-w-[1500px] space-y-4">

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-xs text-danger-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">
              Brand assets
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">Asset Library</h1>
            <p className="mt-1 text-sm text-muted">
              Manage and organise the brand assets stored for this workspace.
            </p>
          </div>
          <button
            onClick={openPicker}
            disabled={isUploading}
            className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {isUploading ? 'Uploading…' : 'Upload asset'}
          </button>
          <input {...getInputProps()} aria-label="Choose a file to upload" />
        </div>

        {uploadedName && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-xs font-medium text-sage-700"
          >
            <SuccessCheck size={16} />
            {uploadedName} uploaded and added to the library.
            <button
              onClick={() => setUploadedName(null)}
              aria-label="Dismiss upload confirmation"
              className="ml-auto rounded p-0.5 text-sage-600 hover:text-sage-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Metrics */}
        <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total assets', value: assets.length, icon: <Images className="h-4 w-4" />, ring: 'bg-brand-50 text-brand-600' },
            { label: 'Approved', value: approvedCount, icon: <CheckCircle2 className="h-4 w-4" />, ring: 'bg-sage-50 text-sage-600' },
            { label: 'Pending review', value: pendingCount, icon: <Loader2 className="h-4 w-4" />, ring: 'bg-warn-50 text-warn-600' },
            { label: 'Flagged', value: flaggedCount, icon: <AlertTriangle className="h-4 w-4" />, ring: 'bg-danger-50 text-danger-600' },
          ].map((m) => (
            <StaggerItem key={m.label}>
              <AnimatedCard className="p-4">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${m.ring}`}>{m.icon}</span>
                <p className="mt-2.5 text-xl font-semibold leading-none tabular-nums text-ink">
                  <AnimatedCounter value={m.value} />
                </p>
                <p className="mt-1.5 text-xs font-medium text-muted">{m.label}</p>
              </AnimatedCard>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterPills
              options={CATEGORIES.map((c) => ({ id: c.id, label: `${c.label} (${counts[c.id]})` }))}
              selected={[category]}
              onChange={(sel) => {
                const next = sel.filter((id) => id !== category);
                setCategory((next[next.length - 1] as typeof category) ?? 'all');
                setPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-light" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search assets, tags, campaigns…"
                aria-label="Search assets"
                className="w-full rounded-xl border border-line bg-white py-1.5 pl-8 pr-8 text-xs text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/40 sm:w-60"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-2 rounded p-0.5 text-muted-light hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by status"
                className="appearance-none rounded-xl border border-line bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-300/40"
              >
                {['All statuses', 'Approved', 'In Review', 'Pending', 'Flagged'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-light" />
            </div>

            <div className="flex items-center gap-0.5 rounded-xl border border-line bg-white p-1">
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                className={`rounded-md p-1.5 transition-colors ${
                  viewMode === 'grid' ? 'bg-cream-100 text-ink' : 'text-muted-light hover:text-ink-700'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                className={`rounded-md p-1.5 transition-colors ${
                  viewMode === 'list' ? 'bg-cream-100 text-ink' : 'text-muted-light hover:text-ink-700'
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Gallery */}
        {paginated.length === 0 ? (
          <EmptyState
            icon={<Images className="h-6 w-6" />}
            title={assets.length === 0 ? 'No assets yet' : 'No assets match these filters'}
            description={
              assets.length === 0
                ? 'Upload a brand file to start the library. Nothing is pre-seeded.'
                : 'Try another category, status or search term.'
            }
            action={
              assets.length === 0
                ? { label: 'Upload asset', onClick: openPicker }
                : undefined
            }
          />
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginated.map((ast) => (
              <AnimatedCard key={ast.id} interactive className="overflow-hidden" onClick={() => openPreview(ast)}>
                <div className="relative h-36 overflow-hidden bg-cream-100">
                  <img src={ast.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute left-2 top-2">
                    <StatusBadge status={ast.status} />
                  </div>
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-semibold text-ink">{ast.name}</p>
                  <p className="mt-0.5 truncate text-2xs text-muted">
                    {ast.format} · {ast.uploadedAt}
                  </p>
                  <div className="mt-2 flex items-center gap-1 border-t border-line pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openPreview(ast);
                      }}
                      aria-label={`Preview ${ast.name}`}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-cream-100 hover:text-ink"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(ast);
                      }}
                      aria-label={`Download ${ast.name}`}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-cream-100 hover:text-ink"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <span className="ml-auto truncate text-2xs text-muted-light">{ast.campaign}</span>
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(ast) => ast.id}
            globalFilter={query}
            onGlobalFilterChange={setQuery}
            onRowClick={openPreview}
            pageSize={12}
            pageSizeOptions={[12, 24, 48]}
            minWidth="760px"
            emptyTitle="No assets match these filters"
            emptyDescription="Try another category, status or search term."
            emptyIcon={<Images className="h-6 w-6 text-muted-light" />}
            footnote="List view sorts and pages independently of grid view; both read the same stored assets."
          />
        )}

        {/* Pagination — grid view only; the table pages itself */}
        {viewMode === 'grid' && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-2xs text-muted">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{' '}
              {filtered.length} assets
            </p>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  aria-current={p === safePage ? 'page' : undefined}
                  className={`h-7 w-7 rounded-lg text-xs font-semibold transition-colors ${
                    p === safePage ? 'bg-brand-600 text-white' : 'border border-line text-muted hover:bg-cream-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview modal */}
      <AnimatedModal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.name ?? 'Asset'}
        description={preview ? `${preview.format} · ${preview.campaign} · ${preview.uploadedAt}` : undefined}
        maxWidth={720}
        footer={
          preview ? (
            <div className="flex w-full items-center justify-between gap-2">
              <StatusBadge status={preview.status} />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(preview)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                {preview.status !== 'Approved' && (
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                  >
                    {isApproving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Approve asset
                  </button>
                )}
              </div>
            </div>
          ) : null
        }
      >
        {preview && (
          <div className="space-y-4">
            <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-line bg-cream-100">
              {previewState === 'loading' ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted" />
              ) : previewState === 'missing' || !previewUrl ? (
                <div className="px-4 py-10 text-center">
                  <Images className="mx-auto h-6 w-6 text-muted-light" />
                  <p className="mt-2 text-xs font-medium text-ink-600">No stored file</p>
                  <p className="mt-0.5 text-2xs text-muted">
                    Only the generated thumbnail is available for this record.
                  </p>
                  <img src={preview.thumbnail} alt="" className="mx-auto mt-3 h-28 rounded-lg object-cover" />
                </div>
              ) : preview.type === 'video' ? (
                <video src={previewUrl} controls className="max-h-[46vh] w-full bg-black/80" />
              ) : (
                <img src={previewUrl} alt={preview.name} className="max-h-[46vh] w-full object-contain" />
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {[
                ['Type', preview.type],
                ['Format', preview.format],
                ['Size', preview.size || '—'],
                ['Dimensions', preview.dimensions || '—'],
                ['Campaign', preview.campaign],
                ['Uploaded by', preview.uploadedBy],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line bg-cream-50 px-2.5 py-2">
                  <dt className="text-2xs text-muted">{label}</dt>
                  <dd className="mt-0.5 truncate font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div>
              <SectionHeader title="Tags" subtitle={preview.tags.length > 0 ? `${preview.tags.length} stored` : undefined} />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {preview.tags.length > 0 ? (
                  preview.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-cream-100 px-2 py-0.5 text-2xs font-medium text-ink-700">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-2xs text-muted">No tags were stored for this asset.</span>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>
    </PageTransition>
  );
};
