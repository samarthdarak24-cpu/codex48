import { AlertTriangle, BadgeCheck, Quote, Sparkles, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { AiFinding } from '@/lib/types'

function asPercent(value: number): string {
  const pct = value <= 1 ? value * 100 : value
  return `${Math.round(pct)}%`
}

const SOURCE_LABEL: Record<AiFinding['sourceType'], string> = {
  ai_suggestion: 'AI suggestion',
  needs_human_review: 'Needs human review',
  rejected: 'Rejected citation',
}

/**
 * One AI finding, including the exact retrieved passage, its similarity score
 * and whether the citation was verified. A rejected citation is always shown —
 * it is never filtered out or hidden behind a disclosure.
 */
export function AiFindingCard({ finding }: { finding: AiFinding }) {
  const rejected = !finding.citationVerified || finding.sourceType === 'rejected'
  const needsHuman = finding.sourceType === 'needs_human_review'

  return (
    <article
      className={cn(
        'rounded-lg border p-2.5',
        rejected
          ? 'border-danger-100 bg-danger-50/40'
          : needsHuman
            ? 'border-warn-100 bg-warn-50/40'
            : 'border-grape-100 bg-grape-50/30',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-1.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink">{finding.ruleTitle}</p>
          <p className="mt-0.5 text-[9.5px] leading-[13px] text-muted">
            {finding.ruleCode ? `${finding.ruleCode} · ` : ''}
            Passage{' '}
            <span className="font-mono text-[9px] text-ink-600">{finding.passageId ?? 'not recorded'}</span>
            {' · '}
            similarity {asPercent(finding.similarity)}
            {' · '}
            confidence {asPercent(finding.confidence)}
          </p>
        </div>
        <Badge tone={rejected ? 'danger' : needsHuman ? 'warn' : 'grape'} size="sm">
          {SOURCE_LABEL[finding.sourceType]}
        </Badge>
      </div>

      <blockquote className="mt-2 border-l-2 border-brand-300 pl-2">
        <p className="flex items-start gap-1 text-[9.5px] font-semibold uppercase tracking-[0.05em] text-muted">
          <Quote className="mt-[1px] h-2.5 w-2.5 shrink-0" />
          Exact quote from the retrieved passage
        </p>
        <p className="mt-0.5 text-2xs italic leading-[16px] text-ink-600">“{finding.quote}”</p>
      </blockquote>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {rejected ? (
          <Badge tone="danger" size="sm" dot={false} className="max-w-full whitespace-normal text-left leading-[14px]">
            <XCircle className="h-2.5 w-2.5 shrink-0" />
            Citation rejected — {finding.rejectedReason ?? 'no reason was recorded'}
          </Badge>
        ) : (
          <Badge tone="success" size="sm" dot={false}>
            <BadgeCheck className="h-2.5 w-2.5" />
            Citation verified
          </Badge>
        )}
        {needsHuman && !rejected && (
          <Badge tone="warn" size="sm" dot={false}>
            <AlertTriangle className="h-2.5 w-2.5" />
            Human decision required
          </Badge>
        )}
      </div>

      {finding.rationale && (
        <p className="mt-1.5 text-2xs leading-[15px] text-ink-600">{finding.rationale}</p>
      )}

      {finding.minimalEdit && (
        <div className="mt-2 rounded-md border border-line bg-white p-2">
          <p className="mb-1 flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.05em] text-grape-700">
            <Sparkles className="h-2.5 w-2.5" />
            Minimal edit · advisory only
          </p>
          <p className="text-2xs leading-[15px] text-danger-700 line-through decoration-danger-300">
            {finding.minimalEdit.original}
          </p>
          <p className="text-2xs leading-[15px] font-medium text-success-700">{finding.minimalEdit.proposed}</p>
          <p className="mt-0.5 text-[9.5px] leading-[13px] text-muted">{finding.minimalEdit.rationale}</p>
        </div>
      )}

      <p className="mt-1.5 text-[9px] text-muted-light">
        {finding.model} · prompt {finding.promptVersion}
        {finding.createdAt ? ` · ${new Date(finding.createdAt).toLocaleString()}` : ''}
      </p>
    </article>
  )
}
