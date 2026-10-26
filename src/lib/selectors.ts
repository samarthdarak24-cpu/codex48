/**
 * Precedent — derived selectors.
 *
 * Nothing in the UI hardcodes a count. Every number rendered is computed here
 * from the records the service layer returned, so the dashboards stay truthful
 * when the database is empty, half-full, or fully populated.
 */

import type {
  ApprovedClaim,
  AuditEvent,
  ExceptionRequest,
  GuidelineDoc,
  Priority,
  Rule,
  Simulation,
  Submission,
  User,
} from '@/lib/types'
import { daysUntil, pct } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Submissions                                                         */
/* ------------------------------------------------------------------ */

export interface SubmissionStats {
  total: number
  pending: number
  inReview: number
  changesRequested: number
  approved: number
  declined: number
  readyForApproval: number
}

export function submissionStats(rows: Submission[]): SubmissionStats {
  const count = (s: Submission['status']) => rows.filter((r) => r.status === s).length
  return {
    total: rows.length,
    pending: count('Pending'),
    inReview: count('In Review'),
    changesRequested: count('Changes Requested'),
    approved: count('Approved'),
    declined: count('Declined'),
    readyForApproval: count('Ready for Approval'),
  }
}

/** Awaiting a human decision on the manager side. */
export function awaitingDecision(rows: Submission[]) {
  return rows.filter((r) => r.status === 'Pending' || r.status === 'In Review' || r.status === 'Ready for Approval')
}

/** Compliance split derived from real review outcomes (approved vs. everything else). */
export function complianceSplit(rows: Submission[]) {
  const reviewed = rows.filter((r) => r.status !== 'Pending')
  const compliant = reviewed.filter((r) => r.status === 'Approved').length
  const needsReview = reviewed.filter((r) => r.status === 'In Review' || r.status === 'Ready for Approval' || r.status === 'Changes Requested').length
  const nonCompliant = reviewed.filter((r) => r.status === 'Declined').length
  const total = reviewed.length
  return {
    total,
    compliant,
    needsReview,
    nonCompliant,
    rate: pct(compliant, total),
  }
}

export function openFindings(rows: Submission[]) {
  return rows.reduce((sum, r) => sum + r.findings.filter((f) => f.status === 'open').length, 0)
}

export function priorityOf(rows: Submission[], p: Priority) {
  return rows.filter((r) => r.priority === p).length
}

export function submissionsWithExceptions(rows: Submission[], exceptions: ExceptionRequest[]) {
  const ids = new Set(exceptions.filter((e) => e.status === 'Approved' || e.status === 'In Review').map((e) => e.contentId))
  return rows.filter((r) => ids.has(r.id)).length
}

/* ------------------------------------------------------------------ */
/* Guidelines & rules                                                  */
/* ------------------------------------------------------------------ */

export function guidelineStats(docs: GuidelineDoc[], rules: Rule[], claims: ApprovedClaim[], exceptions: ExceptionRequest[]) {
  return {
    totalDocs: docs.length,
    activeRules: rules.filter((r) => r.status === 'active').length,
    rulesToConfirm: rules.filter((r) => r.status === 'needs_confirmation').length,
    draftRules: rules.filter((r) => r.status === 'draft').length,
    approvedClaims: claims.filter((c) => c.status === 'approved').length,
    claimsNeedingReview: claims.filter((c) => c.status === 'needs_review').length,
    exceptionsWithExpiry: exceptions.filter((e) => e.status === 'Approved' || e.status === 'Pending' || e.status === 'In Review').length,
  }
}

export function rulesByCategory(rows: Rule[]) {
  const map = new Map<string, number>()
  for (const r of rows) map.set(r.subject, (map.get(r.subject) ?? 0) + 1)
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

/** Rules most frequently overridden — a real Guideline Health signal. */
export function mostOverridden(rows: Rule[], limit = 4) {
  return [...rows]
    .filter((r) => r.overridesThisQuarter > 0)
    .sort((a, b) => b.overridesThisQuarter - a.overridesThisQuarter)
    .slice(0, limit)
}

/** Deterministic contradiction check: same subject + same scope + opposing action. */
export function detectConflicts(rows: Rule[]) {
  const conflicts: { a: Rule; b: Rule; reason: string }[] = []
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i]
      const b = rows[j]
      if (a.status !== 'active' || b.status !== 'active') continue
      if (a.subject !== b.subject) continue
      if (a.scope !== b.scope) continue
      const aBlock = /block/i.test(a.action)
      const bBlock = /block/i.test(b.action)
      const aAllow = /allow/i.test(a.action)
      const bAllow = /allow/i.test(b.action)
      if ((aBlock && bAllow) || (aAllow && bBlock)) {
        conflicts.push({
          a,
          b,
          reason: `${a.code} blocks what ${b.code} allows for "${a.subject}" in the same scope.`,
        })
      }
    }
  }
  return conflicts
}

/* ------------------------------------------------------------------ */
/* Exceptions                                                          */
/* ------------------------------------------------------------------ */

export function exceptionStats(rows: ExceptionRequest[]) {
  const count = (s: ExceptionRequest['status']) => rows.filter((r) => r.status === s).length
  return {
    total: rows.length,
    active: count('Approved'),
    pending: count('Pending'),
    inReview: count('In Review'),
    approved: count('Approved'),
    rejected: count('Rejected'),
    expired: count('Expired'),
    revoked: count('Revoked'),
  }
}

/** Approved exceptions whose window closes within `days`. */
export function expiringSoon(rows: ExceptionRequest[], days = 45) {
  return rows
    .filter((r) => r.status === 'Approved' && daysUntil(r.expiresAt) <= days)
    .sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt))
}

/* ------------------------------------------------------------------ */
/* Simulations                                                         */
/* ------------------------------------------------------------------ */

export function simulationStats(rows: Simulation[]) {
  const latest = rows[0]
  const checked = rows.reduce((n, r) => n + r.totals.checked, 0)
  const compliant = rows.reduce((n, r) => n + r.totals.compliant, 0)
  return {
    total: rows.length,
    checked,
    compliant,
    needsReview: rows.reduce((n, r) => n + r.totals.needsReview, 0),
    nonCompliant: rows.reduce((n, r) => n + r.totals.nonCompliant, 0),
    successRate: pct(compliant, checked),
    latest,
  }
}

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

export function auditStats(rows: AuditEvent[]) {
  const count = (...actions: AuditEvent['action'][]) => rows.filter((r) => actions.includes(r.action)).length
  return {
    total: rows.length,
    approvals: count('Approved'),
    rejections: count('Rejected'),
    exceptions: count('Exception'),
    revisions: count('Revised'),
    ruleChanges: count('Rule updated', 'Guideline updated'),
    simulations: count('Simulation'),
  }
}

export function auditBreakdown(rows: AuditEvent[]) {
  const s = auditStats(rows)
  return [
    { label: 'Approvals', value: s.approvals, tone: 'success' as const },
    { label: 'Rejections', value: s.rejections, tone: 'danger' as const },
    { label: 'Exceptions', value: s.exceptions, tone: 'grape' as const },
    { label: 'Revisions', value: s.revisions, tone: 'brand' as const },
  ]
}

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export function nameOf(people: User[], id: string) {
  return people.find((p) => p.id === id)?.name ?? 'Unknown'
}

export function userRecord(people: User[], id: string): User | undefined {
  return people.find((p) => p.id === id)
}
