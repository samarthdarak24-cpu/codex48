/**
 * Precedent — application data store.
 *
 * Loads the whole working set once, then serves every screen from memory with
 * the same shape the backend will return. Mutations below mirror the future
 * API endpoints (`POST /submissions`, `POST /decisions`, …) and append audit
 * events exactly where the backend will, so the wiring is already correct.
 *
 * ⚠️ Records originate from the fictional demo dataset. Nothing is written to
 * a server yet — that is Phase 3/4 of the build.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/services/api'
import { loadDemoBundle, saveDemoBundle } from '@/services/demoStore'
import { docById, userById, users as roster } from '@/lib/demo-data'
import {
  APPROVED_BACKGROUNDS,
  buildFindings,
  evaluateBackground,
  evaluateClearSpace,
  evaluateTypeface,
  hexTokens,
  runRules,
  VISUAL_ONLY_RULES,
  type AssetEvaluation,
} from '@/lib/ruleEngine'
import type {
  ApprovedClaim,
  AssetFacts,
  AuditAction,
  AuditEvent,
  Brand,
  ContentType,
  ExceptionRequest,
  GuidelineDoc,
  ImpactResult,
  ReviewDecision,
  Rule,
  Simulation,
  Submission,
  SubmissionStatus,
  User,
} from '@/lib/types'

export interface DataBundle {
  submissions: Submission[]
  docs: GuidelineDoc[]
  rules: Rule[]
  claims: ApprovedClaim[]
  exceptions: ExceptionRequest[]
  simulations: Simulation[]
  audit: AuditEvent[]
  team: User[]
}

interface DataState extends DataBundle {
  loading: boolean
  error: string | null
  refetch: () => void
  submitContent: (input: SubmitInput) => Promise<Submission>
  addVersion: (submissionId: string, text: string, note: string) => Promise<Submission>
  addComment: (submissionId: string, body: string) => void
  decideSubmission: (submissionId: string, action: ReviewDecision['action'], note: string) => void
  requestException: (input: ExceptionInput) => Promise<ExceptionRequest>
  decideException: (id: string, decision: 'Approved' | 'Rejected', conditions: string) => void
  runSimulation: (input: SimulationInput) => Promise<Simulation>
  addDocument: (input: DocInput) => Promise<GuidelineDoc>
  setDocStatus: (id: string, status: GuidelineDoc['status']) => void
  addRule: (input: RuleInput) => Promise<Rule>
  confirmRule: (id: string) => void
  addClaim: (input: ClaimInput) => Promise<ApprovedClaim>
}

export interface DocInput {
  name: string
  description: string
  category: GuidelineDoc['category']
  fileType: 'PDF' | 'DOCX'
  fileSize: string
  pages: number
}

export interface RuleInput {
  title: string
  summary: string
  subject: string
  condition: string
  action: string
  scope: string
  priority: Rule['priority']
  sourceDocId: string
  sourcePassage: string
  sourcePage: number
}

export interface ClaimInput {
  text: string
  product: string
  scope: string
}

const EMPTY: DataBundle = {
  submissions: [],
  docs: [],
  rules: [],
  claims: [],
  exceptions: [],
  simulations: [],
  audit: [],
  team: [],
}

export interface SubmitInput {
  title: string
  type: ContentType
  channel: string
  brand: Brand
  text: string
}

export interface ExceptionInput {
  contentId: string
  ruleCode: string
  reason: string
  scope: string
  expiresAt: string
}

export interface SimulationInput {
  ruleId: string
  changeType: string
  newValue: string
}

const DataContext = createContext<DataState | null>(null)

/**
 * Deterministic asset-rule evaluation used by the sandbox. Returns `null` when
 * the rule is not asset-evaluable, so the caller falls back to text/findings.
 */
function assetVerdict(
  code: string,
  asset: AssetFacts | undefined,
  newValue: string,
  relaxing: boolean,
): AssetEvaluation | null {
  switch (code) {
    case 'BR-01': {
      const allowedAfter = relaxing
        ? [...new Set([...APPROVED_BACKGROUNDS, ...hexTokens(newValue)])]
        : APPROVED_BACKGROUNDS
      return evaluateBackground(asset, allowedAfter)
    }
    case 'LO-02': {
      const match = newValue.match(/(\d+(?:\.\d+)?)\s*[×x]/)
      const ratio = match ? Number.parseFloat(match[1]) : 1
      return evaluateClearSpace(asset, ratio)
    }
    case 'TY-01':
      return evaluateTypeface(asset, ['Söhne', 'Inter'])
    default:
      return null
  }
}

let seq = 100
/** Collision-safe across reloads because the demo store is rehydrated. */
const nextId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [bundle, setBundle] = useState<DataBundle>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    // A previous tab session may already hold mutations (see services/demoStore).
    const cached = loadDemoBundle()
    if (cached) {
      setBundle(cached)
      setLoading(false)
      return
    }

    Promise.all([
      api.submissions(),
      api.guidelines(),
      api.rules(),
      api.claims(),
      api.exceptions(),
      api.simulations(),
      api.audit(),
      api.team(),
    ])
      .then(([submissions, docs, rules, claims, exceptions, simulations, audit, team]) => {
        if (cancelled) return
        setBundle({ submissions, docs, rules, claims, exceptions, simulations, audit, team })
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unable to load workspace data.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [nonce])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  // Persist the working set so reloads and role switches keep created records.
  const hydrated = useRef(false)
  useEffect(() => {
    if (loading) return
    if (!hydrated.current) {
      hydrated.current = true
    }
    saveDemoBundle(bundle)
  }, [bundle, loading])

  /* ---------------------------------------------------------------- */
  /* Audit helper                                                      */
  /* ---------------------------------------------------------------- */

  const appendAudit = useCallback(
    (event: Omit<AuditEvent, 'id' | 'at'>) => {
      const record: AuditEvent = { ...event, id: nextId('ae'), at: new Date().toISOString() }
      setBundle((prev) => ({ ...prev, audit: [record, ...prev.audit] }))
    },
    [],
  )

  /* ---------------------------------------------------------------- */
  /* Content                                                           */
  /* ---------------------------------------------------------------- */

  const submitContent = useCallback(
    async (input: SubmitInput): Promise<Submission> => {
      const rules = bundle.rules
      const engineFindings = runRules(rules, { text: input.text, channel: input.channel, type: input.type })
      const findings = buildFindings(engineFindings, rules, 1).map((f) => ({
        ...f,
        sourceDocName: docById(f.sourceDocId)?.name ?? 'Guideline document',
      }))
      const creator = roster[1]
      const id = nextId('sub')
      const submission: Submission = {
        id,
        code: `SUB-${1100 + seq}`,
        title: input.title,
        excerpt: input.text.slice(0, 64) + (input.text.length > 64 ? '…' : ''),
        type: input.type,
        channel: input.channel,
        brand: input.brand,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creatorId: creator.id,
        version: 1,
        issueCount: findings.length,
        priority: findings.some((f) => f.severity === 'High') ? 'High' : findings.length ? 'Medium' : 'Low',
        thumb: { kind: input.type === 'Document' || input.type === 'URL' ? 'doc' : 'art', palette: 'mint', glyph: 'leaf' },
        versions: [
          {
            id: `${id}_v1`,
            version: 1,
            text: input.text,
            createdAt: new Date().toISOString(),
            authorId: creator.id,
            note: 'Initial submission',
          },
        ],
        findings,
        comments: [],
        decisions: [],
      }
      setBundle((prev) => ({ ...prev, submissions: [submission, ...prev.submissions] }))
      appendAudit({
        action: 'Revised',
        entityTitle: input.title,
        entityMeta: `${input.type} · ${input.channel}`,
        thumb: submission.thumb,
        brand: input.brand,
        userId: creator.id,
        details: `Submitted for review. ${findings.length} finding${findings.length === 1 ? '' : 's'} raised by the rule engine.`,
        status: 'Revised',
        entityKind: 'submission',
        entityId: id,
        version: 1,
      })
      return submission
    },
    [bundle.rules, appendAudit],
  )

  const addVersion = useCallback(
    async (submissionId: string, text: string, note: string): Promise<Submission> => {
      const current = bundle.submissions.find((s) => s.id === submissionId)
      if (!current) throw new Error('Submission not found.')
      const version = current.version + 1
      const engineFindings = runRules(bundle.rules, { text, channel: current.channel, type: current.type })
      const findings = buildFindings(engineFindings, bundle.rules, version).map((f) => ({
        ...f,
        sourceDocName: docById(f.sourceDocId)?.name ?? 'Guideline document',
      }))
      const updated: Submission = {
        ...current,
        version,
        status: 'Pending',
        updatedAt: new Date().toISOString(),
        excerpt: text.slice(0, 64) + (text.length > 64 ? '…' : ''),
        issueCount: findings.length,
        versions: [
          ...current.versions,
          {
            id: `${submissionId}_v${version}`,
            version,
            text,
            createdAt: new Date().toISOString(),
            authorId: current.creatorId,
            note,
          },
        ],
        findings,
      }
      setBundle((prev) => ({ ...prev, submissions: prev.submissions.map((s) => (s.id === submissionId ? updated : s)) }))
      appendAudit({
        action: 'Revised',
        entityTitle: current.title,
        entityMeta: `Version ${current.version} → ${version}`,
        thumb: current.thumb,
        brand: current.brand,
        userId: current.creatorId,
        details: note || 'New version submitted for review.',
        status: 'Revised',
        entityKind: 'submission',
        entityId: submissionId,
        version,
      })
      return updated
    },
    [bundle.submissions, bundle.rules, appendAudit],
  )

  const addComment = useCallback(
    (submissionId: string, body: string) => {
      const submission = bundle.submissions.find((s) => s.id === submissionId)
      if (!submission) return
      const author = roster[1]
      setBundle((prev) => ({
        ...prev,
        submissions: prev.submissions.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                comments: [
                  ...s.comments,
                  { id: nextId('c'), authorId: author.id, body, createdAt: new Date().toISOString() },
                ],
              }
            : s,
        ),
      }))
    },
    [bundle.submissions],
  )

  const decideSubmission = useCallback(
    (submissionId: string, action: ReviewDecision['action'], note: string) => {
      const submission = bundle.submissions.find((s) => s.id === submissionId)
      if (!submission) return
      const reviewer = roster[0]
      const statusMap: Record<ReviewDecision['action'], SubmissionStatus> = {
        Approved: 'Approved',
        'Changes Requested': 'Changes Requested',
        Declined: 'Declined',
      }
      setBundle((prev) => ({
        ...prev,
        submissions: prev.submissions.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                status: statusMap[action],
                updatedAt: new Date().toISOString(),
                decisions: [
                  {
                    id: nextId('d'),
                    action,
                    version: s.version,
                    reviewerId: reviewer.id,
                    note,
                    createdAt: new Date().toISOString(),
                  },
                  ...s.decisions,
                ],
              }
            : s,
        ),
      }))
      const actionMap: Record<ReviewDecision['action'], AuditAction> = {
        Approved: 'Approved',
        'Changes Requested': 'Revised',
        Declined: 'Rejected',
      }
      appendAudit({
        action: actionMap[action],
        entityTitle: submission.title,
        entityMeta: `Version ${submission.version}`,
        thumb: submission.thumb,
        brand: submission.brand,
        userId: reviewer.id,
        details: note || `${action} on version ${submission.version}.`,
        status: action === 'Approved' ? 'Approved' : action === 'Declined' ? 'Rejected' : 'Revised',
        entityKind: 'submission',
        entityId: submissionId,
        version: submission.version,
      })
    },
    [bundle.submissions, appendAudit],
  )

  /* ---------------------------------------------------------------- */
  /* Exceptions                                                        */
  /* ---------------------------------------------------------------- */

  const requestException = useCallback(
    async (input: ExceptionInput): Promise<ExceptionRequest> => {
      const submission = bundle.submissions.find((s) => s.id === input.contentId)
      const rule = bundle.rules.find((r) => r.code === input.ruleCode)
      const record: ExceptionRequest = {
        id: nextId('exc'),
        code: `EXC-${2100 + seq}`,
        contentId: input.contentId,
        contentTitle: submission?.title ?? 'Unlinked content',
        contentMeta: submission ? `${submission.type} · ${submission.channel}` : '—',
        thumb: submission?.thumb ?? { kind: 'art', palette: 'mint', glyph: 'leaf' },
        brand: submission?.brand ?? 'PureGlow',
        ruleCode: input.ruleCode,
        ruleTitle: rule?.title ?? '—',
        reason: input.reason,
        scope: input.scope,
        requestedById: roster[1].id,
        decidedById: null,
        effectiveFrom: new Date().toISOString(),
        expiresAt: input.expiresAt,
        status: 'Pending',
        conditions: '',
        decidedAt: null,
      }
      setBundle((prev) => ({ ...prev, exceptions: [record, ...prev.exceptions] }))
      appendAudit({
        action: 'Exception',
        entityTitle: submission?.title ?? 'Exception request',
        entityMeta: `Requested · ${input.ruleCode}`,
        thumb: record.thumb,
        brand: record.brand,
        userId: roster[1].id,
        details: `Exception requested for “${input.reason}”. Awaiting a brand manager decision.`,
        status: 'Exception',
        entityKind: 'exception',
        entityId: record.id,
      })
      return record
    },
    [bundle.submissions, bundle.rules, appendAudit],
  )

  const decideException = useCallback(
    (id: string, decision: 'Approved' | 'Rejected', conditions: string) => {
      const record = bundle.exceptions.find((e) => e.id === id)
      if (!record) return
      setBundle((prev) => ({
        ...prev,
        exceptions: prev.exceptions.map((e) =>
          e.id === id
            ? {
                ...e,
                status: decision,
                conditions: decision === 'Approved' ? conditions : '',
                decidedById: roster[0].id,
                decidedAt: new Date().toISOString(),
              }
            : e,
        ),
      }))
      appendAudit({
        action: 'Exception',
        entityTitle: `${record.code} ${decision.toLowerCase()}`,
        entityMeta: record.contentTitle,
        thumb: record.thumb,
        brand: record.brand,
        userId: roster[0].id,
        details:
          decision === 'Approved'
            ? `Exception approved for ${record.scope}${conditions ? ` — ${conditions}` : ''}.`
            : 'Exception rejected by the brand manager.',
        status: decision === 'Approved' ? 'Exception' : 'Rejected',
        entityKind: 'exception',
        entityId: id,
      })
    },
    [bundle.exceptions, appendAudit],
  )

  /* ---------------------------------------------------------------- */
  /* Simulation                                                        */
  /* ---------------------------------------------------------------- */

  const runSimulation = useCallback(
    async (input: SimulationInput): Promise<Simulation> => {
      const rule = bundle.rules.find((r) => r.id === input.ruleId)
      if (!rule) throw new Error('Rule not found.')

      // A proposed rule is evaluated as if active, but never activated here.
      const proposedRules = bundle.rules.map((r) =>
        r.id === rule.id ? { ...r, status: 'active' as const, action: input.newValue } : r,
      )

      // Direction of the change decides whether a recorded violation is
      // resolved by it or left standing.
      const relaxing = /add|allow|extend|relax|permit/i.test(`${input.changeType} ${input.newValue}`)
      const tightening = /remove|prohibit|restrict|reduce|disallow|ban/i.test(
        `${input.changeType} ${input.newValue}`,
      )
      const newTerms = input.newValue
        .split(/[,;]/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 2)

      const items = bundle.submissions.map((s) => {
        const text = s.versions[s.versions.length - 1]?.text ?? ''
        const recorded = s.findings.filter((f) => f.ruleCode === rule.code)
        let impact: ImpactResult
        let note: string

        // Visual rules are evaluated from the asset facts stored with the
        // submission — never from a guess about what the image contains.
        const assetEval = assetVerdict(rule.code, s.asset, input.newValue, relaxing)

        if (assetEval && s.type === 'Text') {
          impact = 'Compliant'
          note = 'Text-only asset — this rule does not apply.'
        } else if (assetEval) {
          if (assetEval.verdict === 'unknown') {
            impact = 'Needs Review'
            note = assetEval.detail
          } else if (assetEval.verdict === 'pass') {
            impact = 'Compliant'
            note =
              recorded.length > 0 && relaxing
                ? `${assetEval.detail} The recorded ${rule.code} violation would be resolved.`
                : assetEval.detail
          } else {
            impact = 'Non-Compliant'
            note = assetEval.detail
          }
        } else if (VISUAL_ONLY_RULES.includes(rule.code)) {
          // Rules without extractable facts fall back to recorded findings.
          if (s.type === 'Text') {
            impact = 'Compliant'
            note = 'Text-only asset — this rule does not apply.'
          } else if (recorded.length > 0) {
            impact = relaxing ? 'Compliant' : tightening ? 'Non-Compliant' : 'Needs Review'
            note = relaxing
              ? `Recorded ${rule.code} violation would be resolved by this change.`
              : tightening
                ? `Recorded ${rule.code} violation would remain under the proposed rule.`
                : `Recorded ${rule.code} violation — the change does not clearly resolve or worsen it.`
          } else {
            impact = 'Needs Review'
            note = 'No extractable asset facts and no recorded review for this rule.'
          }
        } else {
          const before = runRules(bundle.rules, { text, channel: s.channel, type: s.type }).map((f) => f.ruleCode)
          const after = runRules(proposedRules, { text, channel: s.channel, type: s.type }).map((f) => f.ruleCode)
          const newlyFailing = after.filter((c) => !before.includes(c) && c === rule.code)
          const resolved = before.includes(rule.code) && !after.includes(rule.code)
          const stillFailing = after.includes(rule.code) && before.includes(rule.code)

          // The proposed value itself can introduce or lift a violation.
          const hitsNewTerm = newTerms.some((t) => text.toLowerCase().includes(t))

          if (hitsNewTerm && !relaxing) {
            impact = 'Non-Compliant'
            note = `Contains “${newTerms.find((t) => text.toLowerCase().includes(t))}”, which the proposed change prohibits.`
          } else if (newlyFailing.length) {
            impact = 'Non-Compliant'
            note = `Would newly fail ${rule.code} under the proposed change.`
          } else if (resolved) {
            impact = 'Compliant'
            note = `Would now pass ${rule.code}.`
          } else if (stillFailing) {
            impact = 'Needs Review'
            note = `Still flagged by ${rule.code}; the change does not resolve it.`
          } else {
            impact = 'Compliant'
            note = 'Unaffected by this change.'
          }
        }

        return {
          submissionId: s.id,
          title: s.title,
          meta: `${s.type} · ${s.channel}`,
          thumb: s.thumb,
          type: s.type,
          currentStatus: s.status,
          impact,
          note,
        }
      })

      const totals = {
        checked: items.length,
        compliant: items.filter((i) => i.impact === 'Compliant').length,
        needsReview: items.filter((i) => i.impact === 'Needs Review').length,
        nonCompliant: items.filter((i) => i.impact === 'Non-Compliant').length,
      }

      const insight: string[] = []
      if (totals.checked === 0) {
        insight.push('No stored content is available yet, so there is nothing to compare. Submit content first.')
      } else {
        const improved = items.filter((i) => /resolved|now pass/i.test(i.note)).length
        insight.push(
          `${totals.compliant} of ${totals.checked} stored assets remain compliant under the proposed change.`,
        )
        if (improved) insight.push(`${improved} asset${improved === 1 ? '' : 's'} would move from flagged to compliant.`)
        if (totals.needsReview)
          insight.push(`${totals.needsReview} assets cannot be decided automatically and need a human check.`)
        if (totals.nonCompliant) insight.push(`${totals.nonCompliant} assets would fail ${rule.code} under the proposed rule.`)
        insight.push('This simulation does not activate the proposed rule — activation is a separate approval step.')
      }

      const simulation: Simulation = {
        id: nextId('sim'),
        name: `${input.changeType} · ${rule.title}`,
        ruleId: rule.id,
        ruleCode: rule.code,
        changeType: input.changeType,
        currentValue: rule.action,
        newValue: input.newValue,
        status: 'Completed',
        createdAt: new Date().toISOString(),
        createdById: roster[0].id,
        items,
        insight,
        totals,
      }

      setBundle((prev) => ({ ...prev, simulations: [simulation, ...prev.simulations] }))
      appendAudit({
        action: 'Simulation',
        entityTitle: simulation.name,
        entityMeta: `${totals.checked} assets evaluated`,
        thumb: null,
        brand: 'PureGlow',
        userId: roster[0].id,
        details: `Simulation completed: ${totals.compliant} compliant, ${totals.needsReview} need review, ${totals.nonCompliant} non-compliant.`,
        status: 'Recorded',
        entityKind: 'simulation',
        entityId: simulation.id,
      })
      return simulation
    },
    [bundle.rules, bundle.submissions, appendAudit],
  )

  /* ---------------------------------------------------------------- */
  /* Guidelines, rules and claims                                      */
  /* ---------------------------------------------------------------- */

  const addDocument = useCallback(
    async (input: DocInput): Promise<GuidelineDoc> => {
      const doc: GuidelineDoc = {
        id: nextId('doc'),
        name: input.name,
        description: input.description,
        category: input.category,
        version: 'v1.0',
        status: 'active',
        updatedAt: new Date().toISOString(),
        fileType: input.fileType,
        fileSize: input.fileSize,
        pages: input.pages,
        ownerId: roster[0].id,
        extractedPassages: 0,
        visibleToCreators: true,
      }
      setBundle((prev) => ({ ...prev, docs: [doc, ...prev.docs] }))
      appendAudit({
        action: 'Guideline updated',
        entityTitle: doc.name,
        entityMeta: `${doc.category} · v1.0`,
        thumb: null,
        brand: 'PureGlow',
        userId: roster[0].id,
        details: `Guideline uploaded (${doc.fileType}, ${doc.fileSize}). Text extraction queued.`,
        status: 'Recorded',
        entityKind: 'guideline',
        entityId: doc.id,
      })
      return doc
    },
    [appendAudit],
  )

  const setDocStatus = useCallback(
    (id: string, status: GuidelineDoc['status']) => {
      const doc = bundle.docs.find((d) => d.id === id)
      if (!doc) return
      setBundle((prev) => ({ ...prev, docs: prev.docs.map((d) => (d.id === id ? { ...d, status } : d)) }))
      appendAudit({
        action: 'Guideline updated',
        entityTitle: doc.name,
        entityMeta: `Status → ${status}`,
        thumb: null,
        brand: 'PureGlow',
        userId: roster[0].id,
        details: `Document version ${doc.version} set to ${status}.`,
        status: 'Recorded',
        entityKind: 'guideline',
        entityId: id,
      })
    },
    [bundle.docs, appendAudit],
  )

  const addRule = useCallback(
    async (input: RuleInput): Promise<Rule> => {
      const rule: Rule = {
        id: nextId('rule'),
        code: `RU-${String(bundle.rules.length + 1).padStart(2, '0')}`,
        title: input.title,
        summary: input.summary,
        subject: input.subject,
        condition: input.condition,
        action: input.action,
        scope: input.scope,
        priority: input.priority,
        status: 'draft',
        sourceDocId: input.sourceDocId,
        sourceVersion: docById(input.sourceDocId)?.version ?? 'v1.0',
        sourcePassage: input.sourcePassage,
        sourcePage: input.sourcePage,
        effectiveFrom: new Date().toISOString(),
        effectiveTo: null,
        overridesThisQuarter: 0,
      }
      setBundle((prev) => ({ ...prev, rules: [rule, ...prev.rules] }))
      appendAudit({
        action: 'Rule updated',
        entityTitle: rule.title,
        entityMeta: `${rule.code} · draft`,
        thumb: null,
        brand: 'PureGlow',
        userId: roster[0].id,
        details: `Rule draft created from ${docById(input.sourceDocId)?.name ?? 'a guideline'} p.${input.sourcePage}.`,
        status: 'Recorded',
        entityKind: 'rule',
        entityId: rule.id,
      })
      return rule
    },
    [bundle.rules.length, appendAudit],
  )

  const confirmRule = useCallback(
    (id: string) => {
      const rule = bundle.rules.find((r) => r.id === id)
      if (!rule) return
      setBundle((prev) => ({ ...prev, rules: prev.rules.map((r) => (r.id === id ? { ...r, status: 'active' } : r)) }))
      appendAudit({
        action: 'Rule updated',
        entityTitle: rule.title,
        entityMeta: `${rule.code} · activated`,
        thumb: null,
        brand: 'PureGlow',
        userId: roster[0].id,
        details: `Rule confirmed against source p.${rule.sourcePage} and activated.`,
        status: 'Recorded',
        entityKind: 'rule',
        entityId: id,
      })
    },
    [bundle.rules, appendAudit],
  )

  const addClaim = useCallback(
    async (input: ClaimInput): Promise<ApprovedClaim> => {
      const claim: ApprovedClaim = {
        id: nextId('cl'),
        text: input.text,
        product: input.product,
        source: 'Added manually by brand manager',
        scope: input.scope,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: roster[0].id,
      }
      setBundle((prev) => ({ ...prev, claims: [claim, ...prev.claims] }))
      appendAudit({
        action: 'Rule updated',
        entityTitle: `Approved claim: “${claim.text}”`,
        entityMeta: claim.product,
        thumb: null,
        brand: 'PureGlow',
        userId: roster[0].id,
        details: `Claim added to the approved list for ${claim.scope}.`,
        status: 'Recorded',
        entityKind: 'rule',
        entityId: claim.id,
      })
      return claim
    },
    [appendAudit],
  )

  const value = useMemo<DataState>(
    () => ({
      ...bundle,
      loading,
      error,
      refetch,
      submitContent,
      addVersion,
      addComment,
      decideSubmission,
      requestException,
      decideException,
      runSimulation,
      addDocument,
      setDocStatus,
      addRule,
      confirmRule,
      addClaim,
    }),
    [
      bundle,
      loading,
      error,
      refetch,
      submitContent,
      addVersion,
      addComment,
      decideSubmission,
      requestException,
      decideException,
      runSimulation,
      addDocument,
      setDocStatus,
      addRule,
      confirmRule,
      addClaim,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}

export { userById }
