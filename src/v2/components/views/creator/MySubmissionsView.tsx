import React, { useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronRight, Clock, Download, FileText, Loader2, Plus,
  Search, Send, SlidersHorizontal, Sparkles,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import type { Submission } from '../../../types';
import { api } from '@/services/api';
import {
  AnimatedBadge, AnimatedCounter, AnimatedDrawer, AnimatedProgress, AnimatedTabs,
  EmptyState, FilterPills, HoverLiftCard, ImageHoverEffect, LayoutTransition, PageTransition,
  SectionHeader, type Tone,
} from '../../motion';

type Filter = 'All' | 'Approved' | 'In Review' | 'Needs Changes' | 'Rejected';

const FILTERS: Filter[] = ['All', 'Approved', 'In Review', 'Needs Changes', 'Rejected'];

/**
 * The submission status enum has five states, so this maps each one to its own
 * tone instead of collapsing them into the four fixed StatusPill labels —
 * "Needs Changes" must never be displayed as "Pending" in a governance tool.
 */
const STATUS_TONE: Record<string, Tone> = {
  Approved: 'sage',
  Rejected: 'danger',
  'Needs Changes': 'terracotta',
  'In Review': 'brand',
  Pending: 'amber',
};

const StatusChip: React.FC<{ status: Submission['status'] }> = ({ status }) => (
  <AnimatedBadge tone={STATUS_TONE[status] ?? 'amber'}>{status}</AnimatedBadge>
);

const Metric: React.FC<{ label: string; value: number; tone: 'brand' | 'sage' | 'warn' | 'terracotta'; icon: React.ReactNode }> = ({
  label, value, tone, icon,
}) => {
  const toneMap = {
    brand: 'bg-brand-50 text-brand-600',
    sage: 'bg-sage-50 text-sage-600',
    warn: 'bg-warn-50 text-warn-600',
    terracotta: 'bg-terracotta-50 text-terracotta-600',
  } as const;
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneMap[tone]}`}>{icon}</span>
      <p className="mt-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold leading-none tabular-nums text-ink">
        <AnimatedCounter value={value} />
      </p>
    </div>
  );
};

export const MySubmissionsView: React.FC = () => {
  const { submissions, setSelectedSubmission, setCurrentPage, addToast, loading, error, refresh } = useApp();
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Newest First');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;
  const pendingCount = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending').length;
  const needsChangesCount = submissions.filter((s) => s.status === 'Needs Changes').length;
  const rejectedCount = submissions.filter((s) => s.status === 'Rejected').length;

  const filtered = submissions.filter((item) => {
    if (activeFilter === 'Approved' && item.status !== 'Approved') return false;
    if (activeFilter === 'In Review' && item.status !== 'In Review') return false;
    if (activeFilter === 'Needs Changes' && item.status !== 'Needs Changes') return false;
    if (activeFilter === 'Rejected' && item.status !== 'Rejected') return false;
    const q = searchQuery.trim().toLowerCase();
    if (q && !item.title.toLowerCase().includes(q) && !item.campaign.toLowerCase().includes(q)) return false;
    return true;
  });

  const sorted = useMemo(() => {
    const rows = [...filtered];
    if (sortBy === 'Highest Score') rows.sort((a, b) => (b.complianceScore ?? 0) - (a.complianceScore ?? 0));
    else if (sortBy === 'Title A–Z') rows.sort((a, b) => a.title.localeCompare(b.title));
    else rows.sort((a, b) => (Date.parse(b.submittedDate || '') || 0) - (Date.parse(a.submittedDate || '') || 0));
    return rows;
  }, [filtered, sortBy]);

  const detail = submissions.find((s) => s.id === detailId) ?? null;

  const counts: Record<Filter, number> = {
    All: submissions.length,
    Approved: approvedCount,
    'In Review': pendingCount,
    'Needs Changes': needsChangesCount,
    Rejected: rejectedCount,
  };

  const downloadReport = async (sub: Submission) => {
    setDownloading(true);
    try {
      await api.downloadSubmissionReport(sub.id, 'text');
      addToast('Report downloaded.');
    } catch {
      addToast('Download failed.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6" aria-busy="true" aria-label="Loading submissions">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-cream-100" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-line bg-white" />
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[92px] animate-pulse rounded-2xl border border-line bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
          <p className="text-sm font-semibold text-danger-700">Your submissions could not load.</p>
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

  const findings = detail?.findings ?? [];
  const violations = findings.filter((f) => f.type === 'error');
  const review = findings.filter((f) => f.type === 'warning');
  const passed = findings.filter((f) => f.type === 'success' || f.type === 'passed');

  return (
    <PageTransition className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">Creator workspace</p>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">My Submissions</h1>
            <p className="mt-1 text-sm text-muted">
              Track every version, its review status and the findings raised against it.
            </p>
          </div>
          <button
            onClick={() => setCurrentPage('new-content')}
            className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />New content
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Metric label="Total submissions" value={submissions.length} tone="brand" icon={<FileText className="h-4 w-4" />} />
          <Metric label="Approved" value={approvedCount} tone="sage" icon={<CheckCircle2 className="h-4 w-4" />} />
          <Metric label="In review" value={pendingCount} tone="warn" icon={<Clock className="h-4 w-4" />} />
          <Metric label="Needs changes" value={needsChangesCount + rejectedCount} tone="terracotta" icon={<AlertCircle className="h-4 w-4" />} />
        </div>

        {/* Toolbar */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterPills
              options={FILTERS.map((f) => ({ id: f, label: `${f} (${counts[f]})` }))}
              selected={[activeFilter]}
              onChange={(sel) => {
                const next = sel.filter((id) => id !== activeFilter);
                setActiveFilter((next[next.length - 1] as Filter) ?? 'All');
              }}
            />
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <AnimatedTabs
                tabs={[
                  { id: 'list', label: 'List' },
                  { id: 'grid', label: 'Grid' },
                ]}
                active={view}
                onChange={(id) => setView(id === 'grid' ? 'grid' : 'list')}
              />
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-light" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title or campaign"
                  aria-label="Search submissions"
                  className="w-full rounded-xl border border-line bg-white py-2 pl-8 pr-3 text-xs text-ink placeholder:text-muted-light focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:w-56"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort submissions"
                  className="cursor-pointer rounded-xl border border-line bg-white px-2.5 py-2 text-xs font-medium text-ink focus:outline-none"
                >
                  <option>Newest First</option>
                  <option>Highest Score</option>
                  <option>Title A–Z</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {sorted.length === 0 ? (
          <EmptyState
            icon={<Send className="h-6 w-6" />}
            title={submissions.length === 0 ? 'No submissions yet' : 'No submissions match this filter'}
            description={
              submissions.length === 0
                ? 'Create your first piece of content and its review status will appear here.'
                : 'Try clearing the search or choosing a different status.'
            }
            action={
              submissions.length === 0
                ? { label: 'New content', onClick: () => setCurrentPage('new-content') }
                : { label: 'Clear filters', onClick: () => { setActiveFilter('All'); setSearchQuery(''); } }
            }
          />
        ) : (
          <LayoutTransition mode={view}>
            {sorted.map((sub, i) => {
              const isSelected = detail?.id === sub.id;
              const issueCount = sub.findingsCount ?? 0;
              const delay = Math.min(i * 0.04, 0.3);
              const openDetail = () => {
                setSelectedSubmission(sub);
                setDetailId(sub.id);
              };

              return view === 'grid' ? (
                <HoverLiftCard
                  key={sub.id}
                  elevation="medium"
                  delay={delay}
                  onClick={openDetail}
                  className="overflow-hidden"
                >
                  <div className="relative bg-cream-100">
                    <ImageHoverEffect className="h-36">
                      <img
                        src={sub.thumbnail}
                        alt=""
                        loading="lazy"
                        className="h-36 w-full object-cover"
                      />
                    </ImageHoverEffect>
                    <span className="absolute right-2 top-2 z-10">
                      <StatusChip status={sub.status} />
                    </span>
                  </div>
                  <div className="p-3.5">
                    <p className="truncate text-sm font-semibold text-ink">{sub.title}</p>
                    <p className="mt-0.5 truncate text-2xs text-muted">
                      {sub.campaign || 'No campaign'} · {sub.version || 'v1.0'}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between text-2xs text-muted">
                      <span>{sub.submittedDate || sub.submittedAt || 'Not dated'}</span>
                      <span className="font-semibold tabular-nums text-ink">{sub.complianceScore}%</span>
                    </div>
                    <div className="mt-1.5">
                      <AnimatedProgress
                        value={sub.complianceScore}
                        max={100}
                        tone={sub.complianceScore >= 80 ? 'sage' : sub.complianceScore >= 50 ? 'amber' : 'danger'}
                        height={5}
                      />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 text-2xs font-semibold ${
                          issueCount === 0 ? 'text-sage-600' : 'text-warn-700'
                        }`}
                      >
                        {issueCount === 0 ? (
                          <><CheckCircle2 className="h-3.5 w-3.5" />No open findings</>
                        ) : (
                          <><AlertCircle className="h-3.5 w-3.5" />{issueCount} finding{issueCount === 1 ? '' : 's'}</>
                        )}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-light" />
                    </div>
                  </div>
                </HoverLiftCard>
              ) : (
                <HoverLiftCard
                  key={sub.id}
                  elevation="medium"
                  delay={delay}
                  onClick={openDetail}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${
                    isSelected ? 'border-brand-300 ring-1 ring-brand-200' : ''
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <ImageHoverEffect className="h-14 w-14 shrink-0 rounded-xl border border-line">
                      <img
                        src={sub.thumbnail}
                        alt=""
                        loading="lazy"
                        className="h-14 w-14 object-cover"
                      />
                    </ImageHoverEffect>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{sub.title}</p>
                        <StatusChip status={sub.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted">{sub.campaign || 'No campaign'}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-2xs text-muted-light">
                        <span>{sub.submittedDate || sub.submittedAt || 'Not dated'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{sub.version || 'v1.0'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{sub.complianceScore}% score</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <span
                      className={`inline-flex items-center gap-1 text-2xs font-semibold ${
                        issueCount === 0 ? 'text-sage-600' : 'text-warn-700'
                      }`}
                    >
                      {issueCount === 0 ? (
                        <><CheckCircle2 className="h-3.5 w-3.5" />No open findings</>
                      ) : (
                        <><AlertCircle className="h-3.5 w-3.5" />{issueCount} finding{issueCount === 1 ? '' : 's'}</>
                      )}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail();
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-line px-3 py-1.5 text-2xs font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                    >
                      View details<ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </HoverLiftCard>
              );
            })}
          </LayoutTransition>
        )}

        <p className="text-center text-2xs text-muted">
          Showing {sorted.length} of {submissions.length} submission{submissions.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Detail drawer */}
      <AnimatedDrawer
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail?.title ?? 'Submission'}
        subtitle={detail ? `${detail.campaign || 'No campaign'} · ${detail.version || 'v1.0'}` : undefined}
        footer={
          detail ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => void downloadReport(detail)}
                disabled={downloading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white py-2.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloading ? 'Preparing…' : 'Download report'}
              </button>
              <button
                onClick={() => {
                  setSelectedSubmission(detail);
                  setCurrentPage('ai-review');
                }}
                className="btn-primary-glow flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold"
              >
                <Sparkles className="h-4 w-4" />Open in AI Review
              </button>
            </div>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-line bg-cream-100">
              <ImageHoverEffect>
                <img src={detail.thumbnail} alt="" className="h-44 w-full object-cover" />
              </ImageHoverEffect>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={detail.status} />
              {detail.priority && <span className="badge-draft">{detail.priority} priority</span>}
            </div>

            {detail.description && (
              <p className="text-xs leading-relaxed text-ink-600">{detail.description}</p>
            )}

            <div>
              <SectionHeader title="Submission record" />
              <dl className="mt-2 space-y-0">
                {[
                  ['Campaign', detail.campaign || '—'],
                  ['Content type', detail.assetType || detail.format || '—'],
                  ['Submitted', detail.submittedDate || detail.submittedAt || '—'],
                  ['Version', detail.version || 'v1.0'],
                  ['Compliance score', `${detail.complianceScore}%`],
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

            <div className="rounded-2xl border border-line bg-cream-50 p-3.5">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-semibold text-ink">Findings breakdown</p>
                <span className="text-2xs tabular-nums text-muted">{findings.length} total</span>
              </div>
              <div className="mt-2.5 space-y-2">
                <AnimatedProgress value={violations.length} max={Math.max(findings.length, 1)} tone="danger" label={`Violations · ${violations.length}`} height={6} />
                <AnimatedProgress value={review.length} max={Math.max(findings.length, 1)} tone="amber" label={`Needs review · ${review.length}`} height={6} />
                <AnimatedProgress value={passed.length} max={Math.max(findings.length, 1)} tone="sage" label={`Passed · ${passed.length}`} height={6} />
              </div>
            </div>

            <div>
              <SectionHeader title="Findings" subtitle="Raised by the rule engine against stored guideline passages." />
              {findings.length === 0 ? (
                <div className="mt-2 rounded-xl border border-line bg-cream-50 px-4 py-6 text-center">
                  <CheckCircle2 className="mx-auto h-5 w-5 text-sage-500" />
                  <p className="mt-2 text-xs font-medium text-ink-600">No findings stored</p>
                  <p className="mt-0.5 text-2xs text-muted">
                    Either every rule passed or the content has not been analysed yet.
                  </p>
                </div>
              ) : (
                <ul className="mt-2 space-y-2">
                  {findings.map((f) => (
                    <li
                      key={f.id}
                      className={`rounded-xl border p-3 ${
                        f.type === 'error'
                          ? 'border-danger-200 bg-danger-50/60'
                          : f.type === 'warning'
                            ? 'border-warn-200 bg-warn-50/60'
                            : 'border-sage-200 bg-sage-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-ink">{f.title}</p>
                        {f.badge && <span className="badge-critical shrink-0">{f.badge}</span>}
                      </div>
                      <p className="mt-1 text-2xs leading-relaxed text-ink-600">{f.description}</p>
                      {f.guidelineRef && (
                        <p className="mt-1.5 flex items-center gap-1 text-2xs text-muted">
                          <FileText className="h-3 w-3" />{f.guidelineRef}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </AnimatedDrawer>
    </PageTransition>
  );
};
