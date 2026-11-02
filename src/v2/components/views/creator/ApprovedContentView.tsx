import React, { useMemo, useState } from 'react';
import {
  CalendarDays, CheckCircle2, Download, ExternalLink, FileText, Loader2, Search, Star, X,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import type { Submission } from '../../../types';
import { api } from '@/services/api';
import {
  AnimatedBadge, AnimatedCounter, AnimatedModal, AnimatedProgress, EmptyState, FilterPills,
  PageTransition, RingProgress, Stagger, StaggerItem, AnimatedCard, SectionHeader,
} from '../../motion';

type Category = 'All' | 'Social Media' | 'Product Launch' | 'Campaign' | 'Others';

const CATEGORIES: Category[] = ['All', 'Social Media', 'Product Launch', 'Campaign', 'Others'];

const matches: Record<Exclude<Category, 'All' | 'Others'>, (s: Submission) => boolean> = {
  'Social Media': (s) =>
    s.assetType?.toLowerCase().includes('social') === true || s.campaign?.toLowerCase().includes('social') === true,
  'Product Launch': (s) =>
    s.campaign?.toLowerCase().includes('launch') === true || s.title?.toLowerCase().includes('product') === true,
  Campaign: (s) =>
    s.campaign?.toLowerCase().includes('campaign') === true || s.campaign?.toLowerCase().includes('sale') === true,
};

const isOther = (s: Submission) =>
  !matches['Social Media'](s) && !matches['Product Launch'](s) && !matches.Campaign(s);

const Metric: React.FC<{ label: string; value: React.ReactNode; hint: string; icon: React.ReactNode }> = ({
  label, value, hint, icon,
}) => (
  <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-50 text-sage-600">{icon}</span>
    <p className="mt-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
    <p className="mt-0.5 text-2xl font-semibold leading-none tabular-nums text-ink">{value}</p>
    <p className="mt-1 text-2xs text-muted-light">{hint}</p>
  </div>
);

export const ApprovedContentView: React.FC = () => {
  const { submissions, addToast, setCurrentPage, setSelectedSubmission, loading, error, refresh } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [sortBy, setSortBy] = useState('Latest Approved');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const approvedList = submissions.filter((s) => s.status === 'Approved');
  const avgScore =
    approvedList.length > 0
      ? Math.round(approvedList.reduce((n, s) => n + (s.complianceScore || 0), 0) / approvedList.length)
      : null;
  const findingsTotal = approvedList.reduce((n, s) => n + (s.findingsCount ?? 0), 0);

  const counts: Record<Category, number> = {
    All: approvedList.length,
    'Social Media': approvedList.filter(matches['Social Media']).length,
    'Product Launch': approvedList.filter(matches['Product Launch']).length,
    Campaign: approvedList.filter(matches.Campaign).length,
    Others: approvedList.filter(isOther).length,
  };

  const filtered = useMemo(() => {
    const rows = approvedList.filter((item) => {
      if (activeCategory === 'Others' && !isOther(item)) return false;
      if (activeCategory !== 'All' && activeCategory !== 'Others' && !matches[activeCategory](item)) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q && !item.title.toLowerCase().includes(q) && !item.campaign.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sortBy === 'Highest Score') rows.sort((a, b) => (b.complianceScore ?? 0) - (a.complianceScore ?? 0));
    else rows.sort((a, b) => (Date.parse(b.submittedDate || '') || 0) - (Date.parse(a.submittedDate || '') || 0));
    return rows;
  }, [approvedList, activeCategory, searchQuery, sortBy]);

  const preview = approvedList.find((s) => s.id === previewId) ?? null;
  const lastApproved = approvedList[0]?.submittedDate || approvedList[0]?.submittedAt || '—';

  const downloadReport = async (item: Submission) => {
    setDownloading(true);
    try {
      await api.downloadSubmissionReport(item.id, 'text');
      addToast('Report downloaded.');
    } catch {
      addToast('Download failed.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6" aria-busy="true" aria-label="Loading approved content">
        <div className="h-8 w-64 animate-pulse rounded-xl bg-cream-100" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[118px] animate-pulse rounded-2xl border border-line bg-white" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[260px] animate-pulse rounded-2xl border border-line bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
          <p className="text-sm font-semibold text-danger-700">Approved content could not load.</p>
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

        <div className="min-w-0">
          <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">Creator workspace</p>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">Approved Content</h1>
          <p className="mt-1 text-sm text-muted">
            Every approved submission in this workspace, with the score and findings recorded at approval.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Metric
            label="Approved"
            value={<AnimatedCounter value={approvedList.length} />}
            hint="Cleared for publication"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <Metric
            label="Average score"
            value={avgScore === null ? '—' : <AnimatedCounter value={avgScore} suffix="%" />}
            hint={avgScore === null ? 'No approved content yet' : 'Across approved content'}
            icon={<Star className="h-4 w-4" />}
          />
          <Metric
            label="Findings at approval"
            value={<AnimatedCounter value={findingsTotal} />}
            hint="Stored against these versions"
            icon={<FileText className="h-4 w-4" />}
          />
          <Metric
            label="Last approved"
            value={<span className="text-md">{lastApproved}</span>}
            hint="Most recent decision"
            icon={<CalendarDays className="h-4 w-4" />}
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterPills
            options={CATEGORIES.map((tab) => ({ id: tab, label: `${tab} (${counts[tab]})` }))}
            selected={[activeCategory]}
            onChange={(sel) => {
              const next = sel.filter((id) => id !== activeCategory);
              setActiveCategory((next[next.length - 1] as typeof activeCategory) ?? 'All');
            }}
          />
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-light" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search approved content"
                aria-label="Search approved content"
                className="w-full rounded-xl border border-line bg-white py-2 pl-8 pr-3 text-xs text-ink placeholder:text-muted-light focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:w-56"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort approved content"
              className="cursor-pointer rounded-xl border border-line bg-white px-2.5 py-2 text-xs font-medium text-ink focus:outline-none"
            >
              <option>Latest Approved</option>
              <option>Highest Score</option>
            </select>
          </div>
        </div>

        {/* Gallery */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-6 w-6" />}
            title={approvedList.length === 0 ? 'No approved content yet' : 'Nothing matches this filter'}
            description={
              approvedList.length === 0
                ? 'Once a manager approves a submission it will be collected here.'
                : 'Try a different category or clear the search.'
            }
            action={
              approvedList.length > 0
                ? { label: 'Clear filters', onClick: () => { setActiveCategory('All'); setSearchQuery(''); } }
                : undefined
            }
          />
        ) : (
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <StaggerItem key={item.id}>
                <AnimatedCard className="flex h-full flex-col overflow-hidden">
                  <button
                    onClick={() => setPreviewId(item.id)}
                    className="group relative block h-44 w-full overflow-hidden bg-cream-100 text-left"
                    aria-label={`Preview ${item.title}`}
                  >
                    <img
                      src={item.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <span className="absolute left-2.5 top-2.5 z-10">
                      <AnimatedBadge tone="sage" variant="solid" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />Approved
                      </AnimatedBadge>
                    </span>
                  </button>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                    <p className="mt-0.5 truncate text-2xs text-muted">
                      {item.campaign || 'No campaign'} · {item.version || 'v1.0'}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-2xs text-muted">
                      <span>{item.submittedDate || item.submittedAt || 'Not dated'}</span>
                      <span className="font-semibold tabular-nums text-ink">{item.complianceScore}%</span>
                    </div>
                    <div className="mt-1.5">
                      <AnimatedProgress
                        value={item.complianceScore}
                        max={100}
                        tone={item.complianceScore >= 80 ? 'sage' : 'amber'}
                        height={5}
                      />
                    </div>
                    <button
                      onClick={() => setPreviewId(item.id)}
                      className="mt-3 inline-flex items-center gap-1 self-start text-2xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
                    >
                      Preview<ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </AnimatedCard>
              </StaggerItem>
            ))}
          </Stagger>
        )}

        <p className="text-center text-2xs text-muted">
          Showing {filtered.length} of {approvedList.length} approved item{approvedList.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Preview modal */}
      <AnimatedModal
        open={Boolean(preview)}
        onClose={() => setPreviewId(null)}
        title={preview?.title ?? 'Approved content'}
        description={preview ? `${preview.campaign || 'No campaign'} · ${preview.version || 'v1.0'}` : undefined}
        maxWidth={720}
        footer={
          preview ? (
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => void downloadReport(preview)}
                disabled={downloading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloading ? 'Preparing…' : 'Download report'}
              </button>
              <button
                onClick={() => {
                  setSelectedSubmission(preview);
                  setCurrentPage('ai-review');
                }}
                className="btn-primary-glow inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
              >
                <ExternalLink className="h-4 w-4" />View submission
              </button>
            </div>
          ) : undefined
        }
      >
        {preview && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-line bg-cream-100">
              <img src={preview.thumbnail} alt="" className="max-h-[320px] w-full object-contain" />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {preview.complianceScore !== undefined && (
                <RingProgress
                  value={preview.complianceScore}
                  max={100}
                  size={104}
                  stroke={9}
                  tone={preview.complianceScore >= 80 ? 'sage' : 'amber'}
                  centerLabel={<AnimatedCounter value={preview.complianceScore} suffix="%" />}
                  centerSublabel="Score"
                />
              )}
              <div className="min-w-0 flex-1">
                <SectionHeader title="Approval record" />
                <dl className="mt-2 space-y-0">
                  {[
                    ['Campaign', preview.campaign || '—'],
                    ['Content type', preview.assetType || preview.format || '—'],
                    ['Version', preview.version || 'v1.0'],
                    ['Approved on', preview.submittedDate || preview.submittedAt || '—'],
                    ['Findings stored', String(preview.findingsCount ?? 0)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-3 border-b border-line-soft py-1.5 text-xs last:border-0"
                    >
                      <dt className="text-muted">{label}</dt>
                      <dd className="max-w-[60%] truncate text-right font-medium text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {preview.description && (
              <p className="rounded-xl border border-line bg-cream-50 px-3 py-2.5 text-xs leading-relaxed text-ink-600">
                {preview.description}
              </p>
            )}
          </div>
        )}
      </AnimatedModal>
    </PageTransition>
  );
};
