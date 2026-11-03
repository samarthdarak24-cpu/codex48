/**
 * Precedent visual detail kit.
 *
 * One vocabulary for every detail panel in the product: a tinted header, a set
 * of tone-coded info cards, a connected vertical flow, an evidence card that
 * cites its document, and a sticky action footer. Screens compose these instead
 * of hand-rolling bordered text blocks, which is what made the old drawers read
 * as walls of grey text.
 *
 * Colour is meaning, never decoration:
 *   brand      – the entity itself / its primary definition
 *   sage       – supporting evidence, citations, successful state
 *   olive      – neutral context, secondary metadata
 *   amber      – pending, needs attention, the recorded next step
 *   terracotta – warnings, significant change, exception variance
 *   danger     – violations, conflicts, rejections
 *   neutral    – inert metadata
 *
 * Motion: entrances are staggered and short (<=340ms). Every component checks
 * `useReducedMotion()` and renders its final state immediately instead of
 * animating into it, so the panel is fully usable with reduced motion.
 */
import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { AlertCircle, ArrowDown, CheckCircle2, ChevronDown, ChevronRight, FileText, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedDrawer, EASE } from '../motion';

/* ------------------------------------------------------------------ */
/* Tone system                                                         */
/* ------------------------------------------------------------------ */

export type DetailTone =
  | 'brand'
  | 'sage'
  | 'olive'
  | 'terracotta'
  | 'amber'
  | 'danger'
  | 'neutral';

interface ToneStyle {
  /** Soft icon chip / badge fill. */
  chip: string;
  /** Tinted card surface + hairline border. */
  card: string;
  /** 3px left rail. */
  rail: string;
  /** Eyebrow + badge text. */
  eyebrow: string;
  /** Solid dot / line colour. */
  dot: string;
  /** Connector line between flow steps. */
  line: string;
  /** Icon stroke colour for inline glyphs. */
  ink: string;
}

export const TONE_STYLES: Record<DetailTone, ToneStyle> = {
  brand: {
    chip: 'bg-brand-50 text-brand-600 border-brand-200/70',
    card: 'bg-brand-50/60 border-brand-200/70',
    rail: 'bg-brand-400',
    eyebrow: 'text-brand-700',
    dot: 'bg-brand-500',
    line: 'bg-brand-200',
    ink: 'text-brand-600',
  },
  sage: {
    chip: 'bg-sage-50 text-sage-600 border-sage-200/70',
    card: 'bg-sage-50/70 border-sage-200/70',
    rail: 'bg-sage-400',
    eyebrow: 'text-sage-700',
    dot: 'bg-sage-500',
    line: 'bg-sage-200',
    ink: 'text-sage-600',
  },
  olive: {
    chip: 'bg-olive-50 text-olive-600 border-olive-200/70',
    card: 'bg-olive-50/60 border-olive-200/70',
    rail: 'bg-olive-400',
    eyebrow: 'text-olive-700',
    dot: 'bg-olive-500',
    line: 'bg-olive-200',
    ink: 'text-olive-600',
  },
  terracotta: {
    chip: 'bg-terracotta-50 text-terracotta-600 border-terracotta-200/70',
    card: 'bg-terracotta-50/60 border-terracotta-200/70',
    rail: 'bg-terracotta-400',
    eyebrow: 'text-terracotta-700',
    dot: 'bg-terracotta-500',
    line: 'bg-terracotta-200',
    ink: 'text-terracotta-600',
  },
  amber: {
    chip: 'bg-warn-50 text-warn-600 border-warn-200/70',
    card: 'bg-warn-50/70 border-warn-200/70',
    rail: 'bg-warn-400',
    eyebrow: 'text-warn-700',
    dot: 'bg-warn-500',
    line: 'bg-warn-200',
    ink: 'text-warn-600',
  },
  danger: {
    chip: 'bg-danger-50 text-danger-600 border-danger-200/70',
    card: 'bg-danger-50/60 border-danger-200/70',
    rail: 'bg-danger-400',
    eyebrow: 'text-danger-700',
    dot: 'bg-danger-500',
    line: 'bg-danger-200',
    ink: 'text-danger-600',
  },
  neutral: {
    chip: 'bg-cream-100 text-ink-600 border-line',
    card: 'bg-cream-50 border-line',
    rail: 'bg-line-strong',
    eyebrow: 'text-ink-600',
    dot: 'bg-muted-light',
    line: 'bg-line-strong',
    ink: 'text-muted',
  },
};

/** Header wash per tone — a soft vertical gradient, never a saturated block. */
const HEADER_WASH: Record<DetailTone, string> = {
  brand: 'from-brand-50/90 via-cream-50/60 to-white',
  sage: 'from-sage-50/90 via-cream-50/60 to-white',
  olive: 'from-olive-50/90 via-cream-50/60 to-white',
  terracotta: 'from-terracotta-50/90 via-cream-50/60 to-white',
  amber: 'from-warn-50/90 via-cream-50/60 to-white',
  danger: 'from-danger-50/90 via-cream-50/60 to-white',
  neutral: 'from-cream-100/80 via-cream-50/60 to-white',
};

/**
 * Single mapping from a record's status to a tone, so the same status can never
 * render green on one screen and amber on another.
 */
export function toneForStatus(status?: string | null): DetailTone {
  const s = (status || '').toLowerCase();
  if (!s) return 'neutral';
  if (/(approved|active|resolved|success|passed|confirmed|compliant|complete)/.test(s)) return 'sage';
  if (/(reject|declin|violat|conflict|fail|blocked|error|flagged|critical)/.test(s)) return 'danger';
  if (/(changes|revision|needs)/.test(s)) return 'terracotta';
  if (/(pending|review|awaiting|warning|expiring|attention|open|draft)/.test(s)) return 'amber';
  return 'neutral';
}

/* ------------------------------------------------------------------ */
/* Drawer shell                                                        */
/* ------------------------------------------------------------------ */

export interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name — also used by tests. */
  label: string;
  width?: number;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * The right-hand detail panel. Header and footer are pinned; only the body
 * scrolls, so the actions never leave the viewport on a long record.
 */
export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  open,
  onClose,
  label,
  width = 520,
  header,
  footer,
  children,
}) => (
  <AnimatedDrawer
    open={open}
    onClose={onClose}
    title={label}
    width={width}
    header={header}
    footer={footer}
  >
    <div className="space-y-4">{children}</div>
  </AnimatedDrawer>
);

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

export interface DetailHeaderProps {
  icon: React.ReactNode;
  tone?: DetailTone;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  badges?: React.ReactNode;
  meta?: React.ReactNode;
  onClose: () => void;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  icon,
  tone = 'brand',
  eyebrow,
  title,
  description,
  badges,
  meta,
  onClose,
}) => {
  const t = TONE_STYLES[tone];
  return (
    <div
      className={cn(
        'relative shrink-0 border-b border-line bg-gradient-to-b px-5 pb-4 pt-5',
        HEADER_WASH[tone],
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close panel"
        className="absolute right-3.5 top-3.5 rounded-lg p-1.5 text-muted transition-colors hover:bg-white/80 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]',
            t.chip,
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-0.5 text-md font-semibold leading-snug text-ink">{title}</h2>
          {description && <p className="mt-1 text-xs leading-relaxed text-ink-600">{description}</p>}
        </div>
      </div>

      {badges && <div className="mt-3 flex flex-wrap items-center gap-1.5">{badges}</div>}
      {meta && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted">
          {meta}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export const StatusBadge: React.FC<{
  label: React.ReactNode;
  tone?: DetailTone;
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
}> = ({ label, tone = 'neutral', dot = true, icon, className }) => {
  const t = TONE_STYLES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-semibold',
        t.card,
        t.eyebrow,
        className,
      )}
    >
      {icon ?? (dot ? <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} aria-hidden="true" /> : null)}
      {label}
    </span>
  );
};

/** Small neutral chip for versions, ids and dates. */
export const MetaChip: React.FC<{
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ children, icon, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full border border-line bg-white/90 px-2 py-0.5 text-2xs font-medium text-ink-700',
      className,
    )}
  >
    {icon}
    {children}
  </span>
);

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */

/**
 * Drawer-scale section heading: eyebrow rule + title + optional action.
 * Deliberately smaller than the page-level `SectionHeader` so a panel never
 * competes with the screen behind it.
 */
export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tone?: DetailTone;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, icon, tone = 'neutral', action, className }) => {
  const t = TONE_STYLES[tone];
  return (
    <div className={cn('flex items-end justify-between gap-2', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {icon && (
            <span className={cn('shrink-0', t.ink)} aria-hidden="true">
              {icon}
            </span>
          )}
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-700">
            {title}
          </h3>
        </div>
        {subtitle && <p className="mt-1 text-2xs leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Info card                                                           */
/* ------------------------------------------------------------------ */

export interface InfoCardProps {
  icon?: React.ReactNode;
  tone?: DetailTone;
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  children?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  /** Renders the card as a button when the card itself opens something. */
  onClick?: () => void;
  className?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  tone = 'neutral',
  eyebrow,
  title,
  children,
  meta,
  action,
  onClick,
  className,
}) => {
  const t = TONE_STYLES[tone];
  const body = (
    <>
      <span className={cn('absolute inset-y-0 left-0 w-[3px]', t.rail)} aria-hidden="true" />
      <div className="flex items-start gap-2.5 pl-1">
        {icon && (
          <span
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-white/80',
              t.chip,
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.09em]', t.eyebrow)}>
              {eyebrow}
            </p>
          )}
          {title && <p className="mt-0.5 text-xs font-semibold leading-snug text-ink">{title}</p>}
          {children && (
            <div className="mt-1.5 text-xs leading-relaxed text-ink-700">{children}</div>
          )}
          {meta && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted">
              {meta}
            </div>
          )}
        </div>
      </div>
      {action && <div className="mt-2.5 pl-[38px]">{action}</div>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'relative w-full overflow-hidden rounded-2xl border p-3.5 text-left transition-shadow hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60',
          t.card,
          className,
        )}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border p-3.5', t.card, className)}>
      {body}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Evidence + source reference                                         */
/* ------------------------------------------------------------------ */

export interface EvidenceCardProps {
  passage: React.ReactNode;
  docLabel?: React.ReactNode;
  page?: number | null;
  title?: string;
  tone?: DetailTone;
  action?: React.ReactNode;
}

/** Quoted source passage with its document and page reference. */
export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  passage,
  docLabel,
  page,
  title = 'Guideline evidence',
  tone = 'sage',
  action,
}) => {
  const t = TONE_STYLES[tone];
  return (
    <InfoCard
      tone={tone}
      icon={<FileText className="h-3.5 w-3.5" />}
      eyebrow={title}
      action={action}
    >
      {(docLabel || page != null) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {docLabel && (
            <span
              className={cn(
                'rounded-md border bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold',
                t.card,
                t.eyebrow,
              )}
            >
              {docLabel}
            </span>
          )}
          {page != null && (
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-ink-600">
              <FileText className="h-2.5 w-2.5" aria-hidden="true" />
              Page {page}
            </span>
          )}
        </div>
      )}
      <blockquote className="border-l-2 border-sage-300 pl-2.5 text-xs italic leading-relaxed text-ink-700">
        {passage}
      </blockquote>
    </InfoCard>
  );
};

/**
 * Source reference: which document, which page, and a way to open it.
 * The action is only rendered when the caller supplies a real handler, so the
 * card never offers a link the backend cannot honour.
 */
export const SourceRefCard: React.FC<{
  docLabel?: string | null;
  page?: number | null;
  version?: string | null;
  onOpen?: () => void;
  tone?: DetailTone;
  title?: string;
}> = ({ docLabel, page, version, onOpen, tone = 'sage', title = 'Source document' }) => {
  const t = TONE_STYLES[tone];
  const hasDoc = Boolean(docLabel);
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border p-3.5', t.card)}>
      <span className={cn('absolute inset-y-0 left-0 w-[3px]', t.rail)} aria-hidden="true" />
      <div className="flex items-start gap-2.5 pl-1">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white/85',
            t.chip,
          )}
          aria-hidden="true"
        >
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.09em]', t.eyebrow)}>
            {title}
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold text-ink">
            {hasDoc ? docLabel : 'No document linked'}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-2xs text-muted">
            {page != null && (
              <MetaChip icon={<FileText className="h-2.5 w-2.5" />}>Page {page}</MetaChip>
            )}
            {version && <MetaChip>{version}</MetaChip>}
            {!page && !version && <span>Only the quoted passage is stored.</span>}
          </div>
          {onOpen && hasDoc && (
            <button
              type="button"
              onClick={onOpen}
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-2xs font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60',
                t.eyebrow,
              )}
            >
              Open the document
              <ArrowDown className="h-3 w-3 -rotate-90" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Metadata                                                            */
/* ------------------------------------------------------------------ */

export const MetadataRow: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: DetailTone;
}> = ({ label, value, icon, tone = 'neutral' }) => (
  <div className="flex items-start justify-between gap-3 border-b border-line-soft py-1.5 last:border-0">
    <dt className="flex shrink-0 items-center gap-1.5 text-2xs text-muted">
      {icon && (
        <span className={TONE_STYLES[tone].ink} aria-hidden="true">
          {icon}
        </span>
      )}
      {label}
    </dt>
    <dd className="max-w-[62%] break-words text-right text-2xs font-semibold text-ink">{value}</dd>
  </div>
);

/** Bordered list wrapper so metadata rows share one surface. */
export const MetadataList: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <dl className={cn('rounded-xl border border-line bg-white px-3 py-1.5', className)}>{children}</dl>
);

/* ------------------------------------------------------------------ */
/* Visual flow                                                         */
/* ------------------------------------------------------------------ */

export const VisualFlow: React.FC<{
  children: React.ReactNode;
  className?: string;
  label?: string;
}> = ({ children, className, label }) => (
  <ol className={cn('relative', className)} aria-label={label}>
    {children}
  </ol>
);

export interface FlowStepProps {
  icon: React.ReactNode;
  tone?: DetailTone;
  label?: React.ReactNode;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  isLast?: boolean;
  index?: number;
  /** `card` puts the step body on its own tinted panel; `plain` leaves it open. */
  variant?: 'card' | 'plain';
  /** Optional word rendered next to the connector arrow, e.g. "contradicts". */
  connectorLabel?: string;
}

/**
 * One node in a connected flow.
 *
 * The connector is drawn, not implied: a tinted rule grows downward and ends in
 * a filled arrowhead. The step number sits inside the icon circle so the reader
 * can follow the order even at a glance. Everything is skipped under
 * `prefers-reduced-motion`.
 */
export const FlowStep: React.FC<FlowStepProps> = ({
  icon,
  tone = 'neutral',
  label,
  title,
  children,
  action,
  isLast = false,
  index = 0,
  variant = 'card',
  connectorLabel,
}) => {
  const reduce = useReducedMotion();
  const t = TONE_STYLES[tone];
  const delay = index * 0.06;

  return (
    <li className="relative">
      <div className="flex gap-3">
        <div className="flex w-8 shrink-0 flex-col items-center">
          <motion.span
            className={cn(
              'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-card',
              t.chip,
            )}
            initial={reduce ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.28, delay, ease: EASE }}
            aria-hidden="true"
          >
            {icon}
            <span
              className={cn(
                'absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white text-[8px] font-bold leading-none',
                t.rail,
                tone === 'amber' ? 'text-ink-900' : 'text-white',
              )}
            >
              {index + 1}
            </span>
          </motion.span>

          {!isLast && (
            <div className="relative flex w-full flex-1 flex-col items-center pt-1">
              <motion.span
                className={cn('w-[2px] flex-1 origin-top rounded-full', t.line)}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.32, delay: delay + 0.1, ease: EASE }}
                aria-hidden="true"
              />
              <motion.span
                className={cn('-mt-0.5 flex flex-col items-center', t.ink)}
                initial={reduce ? false : { opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: delay + 0.24, ease: EASE }}
                aria-hidden="true"
              >
                <ChevronDown className="h-3 w-3" strokeWidth={2.6} />
              </motion.span>
            </div>
          )}
        </div>

        <div className={cn('min-w-0 flex-1', isLast ? 'pb-0' : 'pb-3.5')}>
          <motion.div
            className={cn(
              variant === 'card' && 'rounded-xl border px-3 py-2.5',
              variant === 'card' && t.card,
            )}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: delay + 0.04, ease: EASE }}
          >
            {label && (
              <p className={cn('text-[10px] font-semibold uppercase tracking-[0.09em]', t.eyebrow)}>
                {label}
              </p>
            )}
            {title && (
              <p className="mt-0.5 text-xs font-semibold leading-snug text-ink">{title}</p>
            )}
            {children && (
              <div className="mt-1 text-xs leading-relaxed text-ink-700">{children}</div>
            )}
            {action && <div className="mt-2">{action}</div>}
          </motion.div>
          {connectorLabel && !isLast && (
            <p className="mt-1 pl-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
              {connectorLabel}
            </p>
          )}
        </div>
      </div>
    </li>
  );
};

/* ------------------------------------------------------------------ */
/* Comparison (conflicts)                                              */
/* ------------------------------------------------------------------ */

/**
 * Side-by-side comparison for two records that cannot both be satisfied.
 * Both sides keep their own tone so the reader can tell which stored rule is
 * which; the divider carries the conflict marker rather than decorating.
 */
export const ComparisonPair: React.FC<{
  aTitle: string;
  aPassage: React.ReactNode;
  aMeta?: React.ReactNode;
  bTitle: string;
  bPassage: React.ReactNode;
  bMeta?: React.ReactNode;
  verdict?: React.ReactNode;
}> = ({ aTitle, aPassage, aMeta, bTitle, bPassage, bMeta, verdict }) => {
  const reduce = useReducedMotion();
  return (
    <div className="overflow-hidden rounded-2xl border border-danger-200/70 bg-danger-50/30">
      <div className="flex items-center gap-2 border-b border-danger-200/60 bg-danger-50/70 px-3 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-danger-500" aria-hidden="true" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-danger-700">
          {verdict ?? 'Contradiction detected'}
        </p>
      </div>
      <div className="grid gap-2 p-2.5 sm:grid-cols-2">
        <motion.div
          className="rounded-xl border border-terracotta-200/70 bg-white/85 p-2.5"
          initial={reduce ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-terracotta-700">
            {aTitle}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-700">{aPassage}</p>
          {aMeta && <div className="mt-1.5 text-[10px] text-muted">{aMeta}</div>}
        </motion.div>
        <motion.div
          className="rounded-xl border border-olive-200/70 bg-white/85 p-2.5"
          initial={reduce ? false : { opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: EASE }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-olive-700">
            {bTitle}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-700">{bPassage}</p>
          {bMeta && <div className="mt-1.5 text-[10px] text-muted">{bMeta}</div>}
        </motion.div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Metric strip                                                        */
/* ------------------------------------------------------------------ */

/** Compact KPI used inside panels: label, value and a tone that means something. */
export const MetricChip: React.FC<{
  label: string;
  value: React.ReactNode;
  tone?: DetailTone;
  icon?: React.ReactNode;
}> = ({ label, value, tone = 'neutral', icon }) => {
  const t = TONE_STYLES[tone];
  return (
    <div className={cn('rounded-xl border px-2.5 py-2', t.card)}>
      <div className={cn('flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em]', t.eyebrow)}>
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

/** Pinned footer. `note` explains what the actions will and will not do. */
export const ActionFooter: React.FC<{
  children: React.ReactNode;
  note?: React.ReactNode;
}> = ({ children, note }) => (
  <div className="space-y-2">
    {children}
    {note && <p className="text-center text-2xs leading-relaxed text-muted">{note}</p>}
  </div>
);

export const FooterButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
  form?: string;
  /** Override the full-width default when the button shares a row. */
  className?: string;
}> = ({ children, onClick, variant = 'secondary', icon, disabled, type = 'button', form, className }) => (
  <button
    type={type}
    form={form}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60 disabled:cursor-not-allowed disabled:opacity-60',
      variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
      variant === 'secondary' && 'border border-line bg-white text-ink-700 hover:bg-cream-50',
      variant === 'ghost' && 'text-muted hover:bg-cream-50 hover:text-ink',
      className,
    )}
  >
    {icon}
    {children}
  </button>
);

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

export const TooltipInfo: React.FC<{
  label: React.ReactNode;
  children?: React.ReactNode;
}> = ({ label, children }) => (
  <Tooltip.Provider delayDuration={160}>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        {children ?? (
          <button
            type="button"
            aria-label="More information"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-light transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60"
          >
            <Info className="h-3 w-3" />
          </button>
        )}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-[80] max-w-[240px] rounded-lg border border-line bg-white px-2.5 py-1.5 text-2xs leading-relaxed text-ink-700 shadow-pop"
        >
          {label}
          <Tooltip.Arrow className="fill-white" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);

/* ------------------------------------------------------------------ */
/* Horizontal process trail                                            */
/* ------------------------------------------------------------------ */

/**
 * A horizontal, connected sequence of steps — the companion to `VisualFlow`
 * (which is vertical). Use it where a process reads better as a single line:
 * a submission pipeline, a simulation run, a lifecycle strip.
 *
 * Each step carries its own `state` so the trail can show real progress rather
 * than decoration: `done` turns sage and gains a tick, `active` gets a soft
 * ring, `error` turns danger, `pending` stays inert. The connector between two
 * steps is only tinted when the earlier step is genuinely complete.
 */
export type StepState = 'done' | 'active' | 'pending' | 'error';

export interface StepTrailItem {
  label: string;
  icon?: React.ReactNode;
  tone?: DetailTone;
  state?: StepState;
  /** One-line sub-label, e.g. a count or a status word. */
  hint?: string;
}

const STEP_STATE_RING: Record<StepState, string> = {
  done: 'border-sage-300 bg-white',
  active: 'border-brand-400 bg-white ring-2 ring-brand-100',
  pending: 'border-line bg-cream-50/60',
  error: 'border-danger-300 bg-white',
};

export const StepTrail: React.FC<{
  steps: StepTrailItem[];
  className?: string;
  label?: string;
}> = ({ steps, className, label }) => {
  const reduce = useReducedMotion();
  return (
    <ol className={cn('flex flex-wrap items-stretch gap-1.5', className)} aria-label={label}>
      {steps.map((step, i) => {
        const tone = step.tone ?? 'neutral';
        const t = TONE_STYLES[tone];
        const state = step.state ?? 'pending';
        const isLast = i === steps.length - 1;
        return (
          <li key={`${step.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
            <motion.div
              className={cn(
                'flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-1.5',
                STEP_STATE_RING[state],
              )}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: reduce ? 0 : i * 0.04, ease: EASE }}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border',
                  t.chip,
                )}
                aria-hidden="true"
              >
                {step.icon ?? <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-2xs font-semibold text-ink">{step.label}</span>
                {step.hint && (
                  <span className="block truncate text-[10px] leading-tight text-muted">{step.hint}</span>
                )}
              </span>
              {state === 'done' && (
                <CheckCircle2 className="h-3 w-3 shrink-0 text-sage-500" aria-hidden="true" />
              )}
              {state === 'error' && (
                <AlertCircle className="h-3 w-3 shrink-0 text-danger-500" aria-hidden="true" />
              )}
            </motion.div>
            {!isLast && (
              <ChevronRight
                className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  state === 'done' ? 'text-sage-400' : 'text-muted-light',
                )}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};

/* ------------------------------------------------------------------ */
/* Re-exports from the motion library                                  */
/* ------------------------------------------------------------------ */

export { Timeline, EmptyState, AnimatedProgress } from '../motion';
export type { TimelineItem } from '../motion';

/** Stable id helper for `aria-controls` / `aria-labelledby` pairs. */
export function useDetailId(prefix: string): string {
  return `${prefix}-${useId()}`;
}
