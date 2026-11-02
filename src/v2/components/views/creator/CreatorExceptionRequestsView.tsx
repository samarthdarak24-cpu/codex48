import React, { useState } from 'react';
import {
  AlertTriangle, CalendarDays, CheckCircle2, Clock, FileText, Loader2, Plus, Scale, XCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '../../../context/AppContext';
import type { ExceptionItem } from '../../../types';
import {
  AnimatedCounter, AnimatedDrawer, AnimatedModal, AnimatedTabs, EmptyState, PageTransition,
  SectionHeader, Stagger, StaggerItem, AnimatedCard, Timeline, type TimelineItem,
} from '../../motion';

/* Validation lives in one place: the same schema drives inline field errors
   and the submit gate, so the rules cannot drift apart. */
const exceptionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'A request title is required.')
    .max(120, 'Keep the title under 120 characters.'),
  campaign: z.string().trim().max(80, 'Keep the campaign name under 80 characters.'),
  reason: z
    .string()
    .trim()
    .min(10, 'Give the governance team at least 10 characters of context.')
    .max(2000, 'Keep the reason under 2000 characters.'),
});

type ExceptionForm = z.infer<typeof exceptionSchema>;

type Tab = 'All' | 'Pending' | 'Approved' | 'Rejected';

const TABS: Tab[] = ['All', 'Pending', 'Approved', 'Rejected'];

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const cls =
    status === 'Approved' ? 'badge-approved' : status === 'Rejected' ? 'badge-rejected' : 'badge-pending';
  return <span className={cls}>{status}</span>;
};

/** Days until the stored expiry date, or null when the request has none. */
function daysUntil(dateLabel: string | undefined): number | null {
  if (!dateLabel || dateLabel === 'No expiry') return null;
  const ts = Date.parse(dateLabel);
  if (Number.isNaN(ts)) return null;
  return Math.ceil((ts - Date.now()) / 86400000);
}

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

export const CreatorExceptionRequestsView: React.FC = () => {
  const { addToast, exceptions, addNewException, loading, error, refresh } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExceptionForm>({
    resolver: zodResolver(exceptionSchema),
    defaultValues: { title: '', campaign: '', reason: '' },
    mode: 'onSubmit',
  });

  const totalCount = exceptions.length;
  const approvedCount = exceptions.filter((e) => e.status === 'Approved').length;
  const pendingCount = exceptions.filter((e) => e.status === 'Pending').length;
  const rejectedCount = exceptions.filter((e) => e.status === 'Rejected').length;
  const expiringCount = exceptions.filter((e) => {
    if (e.status !== 'Approved') return false;
    const days = daysUntil(e.expiryDate);
    return days !== null && days >= 0 && days <= 14;
  }).length;

  const filtered = exceptions.filter((ex) => {
    if (activeTab === 'Pending' && ex.status !== 'Pending') return false;
    if (activeTab === 'Approved' && ex.status !== 'Approved') return false;
    if (activeTab === 'Rejected' && ex.status !== 'Rejected') return false;
    return true;
  });

  const detail = exceptions.find((e) => e.id === detailId) ?? null;

  const counts: Record<Tab, number> = {
    All: totalCount,
    Pending: pendingCount,
    Approved: approvedCount,
    Rejected: rejectedCount,
  };

  const submitRequest = handleSubmit(async (values) => {
    try {
      await addNewException({
        campaign: values.campaign,
        requestTitle: values.title,
        reason: values.reason,
      });
      setIsNewModalOpen(false);
      reset();
    } catch {
      /* surfaced by the context's own toast */
    }
  });

  const historyFor = (ex: ExceptionItem): TimelineItem[] => {
    const items: TimelineItem[] = [
      {
        id: `${ex.id}-submitted`,
        title: 'Request submitted',
        description: `Submitted by ${ex.creator || 'you'}${ex.scope ? ` · scope: ${ex.scope}` : ''}`,
        time: ex.submittedOn,
        tone: 'brand',
      },
    ];
    if (ex.status === 'Pending') {
      items.push({
        id: `${ex.id}-pending`,
        title: 'Awaiting governance review',
        description: 'No decision has been recorded yet.',
        tone: 'amber',
      });
    } else {
      items.push({
        id: `${ex.id}-decision`,
        title: ex.status === 'Approved' ? 'Exception approved' : 'Exception rejected',
        description: ex.managerNotes || (ex.status === 'Approved'
          ? 'The governance team granted a variance from the standard rule.'
          : 'The governance team declined this request.'),
        tone: ex.status === 'Approved' ? 'sage' : 'danger',
      });
    }
    const days = daysUntil(ex.expiryDate);
    if (ex.expiryDate && ex.expiryDate !== 'No expiry') {
      items.push({
        id: `${ex.id}-expiry`,
        title: days !== null && days < 0 ? 'Expired' : 'Expiry',
        description:
          days === null
            ? ex.expiryDate
            : days < 0
              ? `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
              : `${days} day${days === 1 ? '' : 's'} remaining`,
        time: ex.expiryDate,
        tone: days !== null && days <= 14 ? 'terracotta' : 'olive',
      });
    }
    return items;
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6" aria-busy="true" aria-label="Loading exception requests">
        <div className="h-8 w-64 animate-pulse rounded-xl bg-cream-100" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-line bg-white" />
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[100px] animate-pulse rounded-2xl border border-line bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
          <p className="text-sm font-semibold text-danger-700">Exception requests could not load.</p>
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
      <div className="mx-auto max-w-[1200px] space-y-5">

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">Governance</p>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">Exception Requests</h1>
            <p className="mt-1 text-sm text-muted">
              Ask for a documented variance when a campaign cannot meet a standard brand rule.
            </p>
          </div>
          <button
            onClick={() => { reset(); setIsNewModalOpen(true); }}
            className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />Request exception
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Metric label="Total requests" value={totalCount} icon={<FileText className="h-4 w-4" />} tone="bg-brand-50 text-brand-600" />
          <Metric label="Approved" value={approvedCount} icon={<CheckCircle2 className="h-4 w-4" />} tone="bg-sage-50 text-sage-600" />
          <Metric label="Pending review" value={pendingCount} icon={<Clock className="h-4 w-4" />} tone="bg-warn-50 text-warn-600" />
          <Metric label="Rejected" value={rejectedCount} icon={<XCircle className="h-4 w-4" />} tone="bg-terracotta-50 text-terracotta-600" />
        </div>

        {expiringCount > 0 && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-2xl border border-warn-200 bg-warn-50 px-4 py-3 text-xs text-warn-800"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-600" />
            <p>
              <strong>{expiringCount}</strong> approved exception{expiringCount === 1 ? '' : 's'} expire
              {expiringCount === 1 ? 's' : ''} within 14 days. Renew or let the variance lapse before publishing.
            </p>
          </div>
        )}

        <AnimatedTabs
          tabs={TABS.map((tab) => ({
            id: tab,
            label: `${tab === 'All' ? 'All requests' : tab} (${counts[tab]})`,
          }))}
          active={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Scale className="h-6 w-6" />}
            title={exceptions.length === 0 ? 'No exception requests yet' : 'No requests in this filter'}
            description={
              exceptions.length === 0
                ? 'If a campaign cannot meet a rule, raise a request and the governance team will decide.'
                : 'Try another status to see the rest of your requests.'
            }
            action={
              exceptions.length === 0
                ? { label: 'Request exception', onClick: () => setIsNewModalOpen(true) }
                : { label: 'Show all', onClick: () => setActiveTab('All') }
            }
          />
        ) : (
          <Stagger className="space-y-3">
            {filtered.map((ex) => {
              const days = daysUntil(ex.expiryDate);
              const expiring = ex.status === 'Approved' && days !== null && days >= 0 && days <= 14;
              const expired = ex.status === 'Approved' && days !== null && days < 0;
              return (
                <StaggerItem key={ex.id}>
                  <AnimatedCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                    <img
                      src={ex.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-xl border border-line object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{ex.requestTitle}</p>
                        <StatusChip status={ex.status} />
                        {expiring && (
                          <span className="badge-pending">
                            <AlertTriangle className="h-3 w-3" />Expires in {days}d
                          </span>
                        )}
                        {expired && <span className="badge-rejected">Expired</span>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{ex.reason}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-light">
                        <span className="flex items-center gap-1"><Scale className="h-3 w-3" />{ex.campaign || 'No campaign'}</span>
                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />Submitted {ex.submittedOn}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Expiry {ex.expiryDate || 'none'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setDetailId(ex.id)}
                      className="shrink-0 self-start rounded-xl border border-line px-3 py-1.5 text-2xs font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                    >
                      View details
                    </button>
                  </AnimatedCard>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </div>

      {/* Detail */}
      <AnimatedDrawer
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail?.requestTitle ?? 'Exception request'}
        subtitle={detail ? `${detail.campaign || 'No campaign'} · ${detail.status}` : undefined}
      >
        {detail && (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-line bg-cream-100">
              <img src={detail.thumbnail} alt="" className="h-36 w-full object-cover" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={detail.status} />
              {(() => {
                const days = daysUntil(detail.expiryDate);
                if (days === null) return null;
                if (days < 0) return <span className="badge-rejected">Expired</span>;
                if (days <= 14) return <span className="badge-pending">Expires in {days}d</span>;
                return <span className="badge-draft">{days}d remaining</span>;
              })()}
            </div>

            <p className="text-xs leading-relaxed text-ink-600">{detail.reason}</p>

            <div>
              <SectionHeader title="Request information" />
              <dl className="mt-2 space-y-0">
                {[
                  ['Campaign', detail.campaign || '—'],
                  ['Submitted', detail.submittedOn],
                  ['Requested by', detail.creator || 'You'],
                  ['Scope', detail.scope || 'Not specified'],
                  ['Expiry', detail.expiryDate || 'No expiry'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-3 border-b border-line-soft py-1.5 text-xs last:border-0"
                  >
                    <dt className="shrink-0 text-muted">{label}</dt>
                    <dd className="max-w-[62%] break-words text-right font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {detail.conditions && (
              <div className="rounded-xl border border-olive-200 bg-olive-50/70 p-3">
                <p className="text-xs font-semibold text-olive-800">Conditions</p>
                <p className="mt-1 text-2xs leading-relaxed text-olive-800/90">{detail.conditions}</p>
              </div>
            )}

            <div>
              <SectionHeader title="Status history" subtitle="Reconstructed from the stored request record." />
              <Timeline items={historyFor(detail)} className="mt-3" />
            </div>
          </div>
        )}
      </AnimatedDrawer>

      {/* New request */}
      <AnimatedModal
        open={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="New exception request"
        description="The governance team reviews every request against the cited rule."
        footer={
          <>
            <button
              onClick={() => setIsNewModalOpen(false)}
              className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="exception-request-form"
              disabled={isSubmitting}
              className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSubmitting ? 'Submitting…' : 'Submit request'}
            </button>
          </>
        }
      >
        <form
          id="exception-request-form"
          onSubmit={submitRequest}
          noValidate
          className="space-y-3"
        >
          <div>
            <label htmlFor="exception-title" className="mb-1 block text-xs font-semibold text-ink-700">
              Request title <span className="text-danger-500">*</span>
            </label>
            <input
              id="exception-title"
              {...register('title')}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? 'exception-title-error' : undefined}
              placeholder="What does this request cover?"
              className={`w-full rounded-xl border bg-white px-3 py-2.5 text-xs text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 ${
                errors.title
                  ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-500/20'
                  : 'border-line focus:border-brand-400 focus:ring-brand-500/20'
              }`}
            />
            {errors.title && (
              <p id="exception-title-error" role="alert" className="mt-1 text-2xs font-medium text-danger-600">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="exception-campaign" className="mb-1 block text-xs font-semibold text-ink-700">
              Campaign
            </label>
            <input
              id="exception-campaign"
              {...register('campaign')}
              aria-invalid={errors.campaign ? true : undefined}
              aria-describedby={errors.campaign ? 'exception-campaign-error' : undefined}
              placeholder="Which campaign is this for?"
              className={`w-full rounded-xl border bg-white px-3 py-2.5 text-xs text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 ${
                errors.campaign
                  ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-500/20'
                  : 'border-line focus:border-brand-400 focus:ring-brand-500/20'
              }`}
            />
            {errors.campaign && (
              <p id="exception-campaign-error" role="alert" className="mt-1 text-2xs font-medium text-danger-600">
                {errors.campaign.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="exception-reason" className="mb-1 block text-xs font-semibold text-ink-700">
              Reason <span className="text-danger-500">*</span>
            </label>
            <textarea
              id="exception-reason"
              {...register('reason')}
              rows={4}
              aria-invalid={errors.reason ? true : undefined}
              aria-describedby={errors.reason ? 'exception-reason-error' : undefined}
              placeholder="Explain why this exception is needed…"
              className={`w-full resize-none rounded-xl border bg-white px-3 py-2.5 text-xs text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 ${
                errors.reason
                  ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-500/20'
                  : 'border-line focus:border-brand-400 focus:ring-brand-500/20'
              }`}
            />
            {errors.reason ? (
              <p id="exception-reason-error" role="alert" className="mt-1 text-2xs font-medium text-danger-600">
                {errors.reason.message}
              </p>
            ) : (
              <p className="mt-1 text-2xs text-muted-light">
                At least 10 characters. This is what the governance team reviews.
              </p>
            )}
          </div>
        </form>
      </AnimatedModal>
    </PageTransition>
  );
};
