/**
 * Audit History — the real audit trail as a vertical timeline.
 *
 * Filters, counts and entries come straight from `useApp().auditEvents`.
 * The old detail panel fabricated a three-step trail; that is gone. Each entry
 * expands to show only what the event actually stores.
 */
import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, Calendar, ChevronDown, ChevronLeft, ChevronRight, Cpu, Download,
  Lock, Search, ShieldCheck, UserCheck, X, CheckCircle2, XCircle,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import { parseStoredDateTime } from '@/lib/utils';
import type { AuditEvent } from '../../../types';
import {
  AnimatedCard, AnimatedCounter, ChartContainer, PageTransition, Stagger, StaggerItem,
  type Tone,
} from '../../motion';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 10;

const RANGE_DAYS: Record<string, number | null> = {
  'All time': null,
  'Last 7 days': 7,
  'Last 30 days': 30,
  'Last 90 days': 90,
};

const EVENT_TYPES = ['All event types', 'Approvals', 'Rejections', 'Rule changes', 'Asset uploads'] as const;

type EventType = (typeof EVENT_TYPES)[number];

const toneOf = (action: string): Tone => {
  const a = action.toLowerCase();
  if (/approv/.test(a)) return 'sage';
  if (/reject|declin|fail/.test(a)) return 'danger';
  if (/comment|update|edit/.test(a)) return 'olive';
  if (/upload|create/.test(a)) return 'brand';
  if (/login|auth|password|role|security/.test(a)) return 'amber';
  return 'olive';
};

const iconOf = (e: AuditEvent): React.ReactNode => {
  if (e.user.isSystem) return <Cpu className="h-3.5 w-3.5" />;
  if (/login|auth|password|role|security/i.test(e.action)) return <ShieldCheck className="h-3.5 w-3.5" />;
  return <UserCheck className="h-3.5 w-3.5" />;
};

const toneRing: Record<Tone, string> = {
  brand: 'border-brand-200 text-brand-600',
  sage: 'border-sage-200 text-sage-600',
  olive: 'border-olive-200 text-olive-600',
  terracotta: 'border-terracotta-200 text-terracotta-600',
  amber: 'border-warn-200 text-warn-600',
  danger: 'border-danger-200 text-danger-600',
};

/** `dateTime` is the display string ("Nov 2, 2026 · 6:52 AM"), so it must be
    parsed through the shared helper — `new Date()` alone returns Invalid Date
    on the middle dot and dropped every event from the range filter. */
const timestampOf = (e: AuditEvent): number =>
  parseStoredDateTime(e.dateTime || `${e.date ?? ''} ${e.time ?? ''}`.trim());

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export const AuditHistoryView: React.FC = () => {
  const { role, auditEvents, loading, error, addToast } = useApp();

  const [query, setQuery] = useState('');
  const [range, setRange] = useState<keyof typeof RANGE_DAYS>('Last 30 days');
  const [eventType, setEventType] = useState<EventType>('All event types');
  const [userFilter, setUserFilter] = useState('All users');
  const [moduleFilter, setModuleFilter] = useState('All modules');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const userOptions = useMemo(
    () => Array.from(new Set(auditEvents.map((e) => e.user.name))).sort(),
    [auditEvents],
  );
  const moduleOptions = useMemo(
    () => Array.from(new Set(auditEvents.map((e) => e.module))).sort(),
    [auditEvents],
  );

  /* Counted over the whole log, not the filtered slice, so the breakdown stays
     a stable map of the workspace while you drill into one module or person. */
  const moduleBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of auditEvents) map.set(e.module, (map.get(e.module) ?? 0) + 1);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }));
  }, [auditEvents]);

  const actorBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of auditEvents) map.set(e.user.name, (map.get(e.user.name) ?? 0) + 1);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }));
  }, [auditEvents]);

  const filtered = useMemo(() => {
    const days = RANGE_DAYS[range];
    const cutoff = days === null ? null : Date.now() - days * 24 * 60 * 60 * 1000;
    const q = query.trim().toLowerCase();

    return auditEvents.filter((evt) => {
      if (moduleFilter !== 'All modules' && evt.module !== moduleFilter) return false;
      if (userFilter !== 'All users' && evt.user.name !== userFilter) return false;

      const a = evt.action.toLowerCase();
      if (eventType === 'Approvals' && !/approv/.test(a)) return false;
      if (eventType === 'Rejections' && !/reject|declin/.test(a)) return false;
      if (eventType === 'Rule changes' && !/rule|update|activat/.test(a)) return false;
      if (eventType === 'Asset uploads' && !/upload/.test(a)) return false;

      if (cutoff !== null) {
        const t = timestampOf(evt);
        // An unparseable timestamp cannot be proven to fall inside the range.
        if (Number.isNaN(t) || t < cutoff) return false;
      }

      if (!q) return true;
      return `${evt.action} ${evt.details} ${evt.subDetails ?? ''} ${evt.module} ${evt.user.name}`
        .toLowerCase()
        .includes(q);
    });
  }, [auditEvents, moduleFilter, userFilter, eventType, range, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalCount = auditEvents.length;
  const userActionCount = auditEvents.filter((e) => !e.user.isSystem).length;
  const systemCount = auditEvents.filter((e) => e.user.isSystem).length;
  const securityCount = auditEvents.filter((e) => /login|auth|password|role|security/i.test(e.action)).length;
  const failureCount = auditEvents.filter((e) => e.status === 'Failed').length;

  const resetFilters = () => {
    setQuery('');
    setRange('Last 30 days');
    setEventType('All event types');
    setUserFilter('All users');
    setModuleFilter('All modules');
    setPage(1);
  };

  const handleExport = async () => {
    try {
      await api.downloadAuditCsv();
      addToast('Audit log exported.');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Export failed.', 'error');
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
            The audit trail is restricted to brand managers. Your current role is {role}.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-[1200px] space-y-4">
          <div className="h-14 w-1/3 animate-pulse rounded-2xl bg-cream-100" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[100px] animate-pulse rounded-2xl bg-cream-100" />
            ))}
          </div>
          <div className="h-[520px] animate-pulse rounded-2xl bg-cream-100" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1200px] space-y-4">

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
              Accountability
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">Audit History</h1>
            <p className="mt-1 text-sm text-muted">
              Every recorded platform activity, change and decision, newest first.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink-700 shadow-card transition-colors hover:bg-cream-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export log
          </button>
        </div>

        {/* Metrics */}
        <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total events', value: totalCount, icon: <Calendar className="h-4 w-4" />, ring: 'bg-brand-50 text-brand-600' },
            { label: 'User actions', value: userActionCount, icon: <UserCheck className="h-4 w-4" />, ring: 'bg-sage-50 text-sage-600' },
            { label: 'System events', value: systemCount, icon: <Cpu className="h-4 w-4" />, ring: 'bg-olive-50 text-olive-600' },
            { label: 'Security events', value: securityCount, icon: <ShieldCheck className="h-4 w-4" />, ring: 'bg-warn-50 text-warn-600' },
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-light" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search action, detail, module or person…"
              aria-label="Search audit events"
              className="w-full rounded-xl border border-line bg-white py-1.5 pl-8 pr-8 text-xs text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/40"
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

          {[
            {
              value: range,
              options: Object.keys(RANGE_DAYS),
              onChange: (v: string) => setRange(v as keyof typeof RANGE_DAYS),
              label: 'Date range',
            },
            {
              value: eventType,
              options: [...EVENT_TYPES],
              onChange: (v: string) => setEventType(v as EventType),
              label: 'Event type',
            },
            {
              value: userFilter,
              options: ['All users', ...userOptions],
              onChange: setUserFilter,
              label: 'User',
            },
            {
              value: moduleFilter,
              options: ['All modules', ...moduleOptions],
              onChange: setModuleFilter,
              label: 'Module',
            },
          ].map((f) => (
            <div key={f.label} className="relative">
              <select
                value={f.value}
                onChange={(e) => {
                  f.onChange(e.target.value);
                  setPage(1);
                }}
                aria-label={f.label}
                className="appearance-none rounded-xl border border-line bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-300/40"
              >
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-light" />
            </div>
          ))}

          <button
            onClick={resetFilters}
            className="rounded-xl px-2.5 py-1.5 text-2xs font-semibold text-brand-600 transition-colors hover:bg-brand-50"
          >
            Reset
          </button>
        </div>

        <p className="text-2xs text-muted">
          {filtered.length} of {totalCount} events match · {failureCount} failed event
          {failureCount === 1 ? '' : 's'} in the full log
        </p>

        {/* Where the activity comes from */}
        {auditEvents.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartContainer
              title="Activity by module"
              subtitle="Across the full log · select a row to filter"
            >
              <ul className="space-y-1">
                {moduleBreakdown.map((row) => {
                  const active = moduleFilter === row.name;
                  const max = moduleBreakdown[0]?.count ?? 1;
                  return (
                    <li key={row.name}>
                      <button
                        onClick={() => {
                          setModuleFilter(active ? 'All modules' : row.name);
                          setPage(1);
                        }}
                        aria-pressed={active}
                        className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                          active
                            ? 'border-brand-400 bg-brand-50/70 ring-1 ring-brand-300/50'
                            : 'border-transparent hover:border-line hover:bg-cream-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate font-medium text-ink">{row.name}</span>
                          <span className="shrink-0 text-2xs tabular-nums text-muted">
                            <span className="font-semibold text-ink">{row.count}</span> event
                            {row.count === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line-soft">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-premium"
                            style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ChartContainer>

            <ChartContainer
              title="Activity by person"
              subtitle="Across the full log · select a row to filter"
            >
              <ul className="space-y-1">
                {actorBreakdown.map((row) => {
                  const active = userFilter === row.name;
                  const max = actorBreakdown[0]?.count ?? 1;
                  return (
                    <li key={row.name}>
                      <button
                        onClick={() => {
                          setUserFilter(active ? 'All users' : row.name);
                          setPage(1);
                        }}
                        aria-pressed={active}
                        className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                          active
                            ? 'border-brand-400 bg-brand-50/70 ring-1 ring-brand-300/50'
                            : 'border-transparent hover:border-line hover:bg-cream-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate font-medium text-ink">{row.name}</span>
                          <span className="shrink-0 text-2xs tabular-nums text-muted">
                            <span className="font-semibold text-ink">{row.count}</span> event
                            {row.count === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line-soft">
                          <div
                            className="h-full rounded-full bg-sage-500 transition-[width] duration-500 ease-premium"
                            style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ChartContainer>
          </div>
        )}

        {/* Timeline */}
        <AnimatedCard className="p-4 sm:p-5">
          {paginated.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Calendar className="mx-auto h-6 w-6 text-muted-light" />
              <p className="mt-2 text-sm font-medium text-ink-600">No audit events match</p>
              <p className="mt-0.5 text-2xs text-muted">
                {totalCount === 0
                  ? 'The workspace has not recorded any activity yet.'
                  : 'Widen the date range or clear a filter.'}
              </p>
            </div>
          ) : (
            <Stagger>
              <ol className="relative">
                <span className="absolute bottom-2 left-[15px] top-2 w-px bg-line" aria-hidden="true" />
                {paginated.map((evt) => {
                  const tone = toneOf(evt.action);
                  const isOpen = expandedId === evt.id;
                  const failed = evt.status === 'Failed';
                  return (
                    <StaggerItem key={evt.id}>
                      <li className="relative pb-3 last:pb-0">
                        <div className="flex gap-3">
                          <span
                            className={`relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white ${toneRing[tone]}`}
                          >
                            {iconOf(evt)}
                          </span>

                          <button
                            onClick={() => setExpandedId(isOpen ? null : evt.id)}
                            aria-expanded={isOpen}
                            className="min-w-0 flex-1 rounded-xl border border-transparent px-2.5 py-2 text-left transition-colors hover:border-line hover:bg-cream-50 focus-visible:border-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                              <p className="min-w-0 text-xs font-semibold text-ink">
                                <span className="truncate">{evt.action}</span>
                                <span className="ml-1.5 font-normal text-muted">· {evt.module}</span>
                              </p>
                              <span className="shrink-0 text-2xs tabular-nums text-muted-light">
                                {evt.dateTime || `${evt.date ?? ''} ${evt.time ?? ''}`}
                              </span>
                            </div>

                            <p className="mt-0.5 truncate text-2xs text-ink-600">{evt.details}</p>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-2xs text-muted">
                              <span className="inline-flex items-center gap-1">
                                <img
                                  src={evt.user.avatar}
                                  alt=""
                                  className="h-4 w-4 rounded-full object-cover ring-1 ring-line"
                                />
                                {evt.user.name}
                              </span>
                              <span className="text-muted-light">·</span>
                              <span>{evt.user.role}</span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold ${
                                  failed
                                    ? 'bg-danger-50 text-danger-700'
                                    : 'bg-sage-50 text-sage-700'
                                }`}
                              >
                                {failed ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                {evt.status ?? 'Success'}
                              </span>
                              <ChevronDown
                                className={`ml-auto h-3.5 w-3.5 text-muted-light transition-transform ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                                aria-hidden="true"
                              />
                            </div>

                            {isOpen && (
                              <dl className="mt-2.5 space-y-1.5 rounded-xl border border-line bg-cream-50 px-3 py-2.5 text-2xs">
                                <div className="flex items-start justify-between gap-3">
                                  <dt className="shrink-0 text-muted">Event ID</dt>
                                  <dd className="break-all text-right font-medium text-ink">{evt.id}</dd>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                  <dt className="shrink-0 text-muted">Timestamp</dt>
                                  <dd className="text-right font-medium text-ink">
                                    {evt.dateTime || '—'}
                                  </dd>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                  <dt className="shrink-0 text-muted">Module</dt>
                                  <dd className="text-right font-medium text-ink">{evt.module}</dd>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                  <dt className="shrink-0 text-muted">Actor</dt>
                                  <dd className="text-right font-medium text-ink">
                                    {evt.user.name} · {evt.user.role}
                                    {evt.user.isSystem ? ' · system' : ''}
                                  </dd>
                                </div>
                                {evt.subDetails && (
                                  <div className="border-t border-line pt-1.5">
                                    <dt className="text-muted">Detail</dt>
                                    <dd className="mt-0.5 leading-relaxed text-ink-600">{evt.subDetails}</dd>
                                  </div>
                                )}
                              </dl>
                            )}
                          </button>
                        </div>
                      </li>
                    </StaggerItem>
                  );
                })}
              </ol>
            </Stagger>
          )}

          {filtered.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-2xs text-muted">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{' '}
                {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  aria-label="Previous page"
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-cream-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - safePage) < 3 || p === 1 || p === totalPages)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && p - arr[idx - 1] > 1 && (
                        <span className="px-1 text-2xs text-muted-light">…</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        aria-current={p === safePage ? 'page' : undefined}
                        className={`h-7 w-7 rounded-lg text-xs font-semibold transition-colors ${
                          p === safePage
                            ? 'bg-brand-600 text-white'
                            : 'border border-line text-muted hover:bg-cream-50'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  aria-label="Next page"
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-cream-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </AnimatedCard>
      </div>
    </PageTransition>
  );
};
