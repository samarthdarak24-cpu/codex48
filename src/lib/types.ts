/**
 * Precedent — domain types.
 *
 * These mirror the backend contract described in the master prompt (Section 9).
 * The frontend is built against these types only; the `services/` layer is the
 * single seam where mock data is replaced by real FastAPI endpoints later.
 */

export type Role = 'creator' | 'manager'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  title: string
  initials: string
  avatarTone: AvatarTone
  workspace: string
  workspaceStatus: 'active' | 'invited' | 'suspended'
}

export type AvatarTone = 'blue' | 'green' | 'amber' | 'grape' | 'rose' | 'teal' | 'indigo'

export type Brand = 'PureGlow' | 'WellnessLife' | 'All brands'

/* ------------------------------------------------------------------ */
/* Guidelines                                                          */
/* ------------------------------------------------------------------ */

export type GuidelineCategory =
  | 'Visual Identity'
  | 'Communication'
  | 'Claims'
  | 'Visual Content'
  | 'Social Media'
  | 'Marketing'

export type DocStatus = 'active' | 'draft' | 'archived' | 'processing'

export interface GuidelineDoc {
  id: string
  name: string
  description: string
  category: GuidelineCategory
  version: string
  status: DocStatus
  updatedAt: string
  fileType: 'PDF' | 'DOCX'
  fileSize: string
  pages: number
  ownerId: string
  extractedPassages: number
  /** Creators see the active, workspace-relevant subset only (read-only). */
  visibleToCreators: boolean
}

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

export type RuleStatus = 'active' | 'draft' | 'needs_confirmation' | 'archived'
export type Priority = 'High' | 'Medium' | 'Low'

export interface Rule {
  id: string
  code: string
  title: string
  summary: string
  /** Rule engine fields (deterministic evaluation). */
  subject: string
  condition: string
  action: string
  scope: string
  priority: Priority
  status: RuleStatus
  sourceDocId: string
  sourceVersion: string
  sourcePassage: string
  sourcePage: number
  effectiveFrom: string
  effectiveTo: string | null
  overridesThisQuarter: number
}

export interface ApprovedClaim {
  id: string
  text: string
  product: string
  source: string
  scope: string
  status: 'approved' | 'needs_review' | 'retired'
  approvedAt: string
  approvedBy: string
}

/* ------------------------------------------------------------------ */
/* Submissions                                                         */
/* ------------------------------------------------------------------ */

export type ContentType = 'Text' | 'Image' | 'Document' | 'URL'

export type SubmissionStatus =
  | 'Pending'
  | 'In Review'
  | 'Changes Requested'
  | 'Approved'
  | 'Declined'
  | 'Ready for Approval'

export interface ContentVersion {
  id: string
  version: number
  text: string
  createdAt: string
  authorId: string
  note: string
}

export interface Finding {
  id: string
  ruleCode: string
  ruleTitle: string
  type: 'Brand colour' | 'Claims' | 'Logo usage' | 'Typography' | 'Tone of voice' | 'Disclosure'
  severity: Priority
  explanation: string
  sourceDocId: string
  sourceDocName: string
  sourceVersion: string
  sourcePage: number
  sourcePassage: string
  evidenceVerified: boolean
  suggestedFix: {
    original: string
    proposed: string
    rationale: string
  } | null
  status: 'open' | 'resolved' | 'accepted_exception'
}

export interface Comment {
  id: string
  authorId: string
  body: string
  createdAt: string
}

export interface ReviewDecision {
  id: string
  action: 'Approved' | 'Changes Requested' | 'Declined'
  version: number
  reviewerId: string
  note: string
  createdAt: string
}

export interface Submission {
  id: string
  code: string
  title: string
  excerpt: string
  type: ContentType
  channel: string
  brand: Brand
  status: SubmissionStatus
  createdAt: string
  updatedAt: string
  creatorId: string
  version: number
  issueCount: number
  priority: Priority
  thumb: ThumbSpec
  asset?: AssetFacts
  assetRef?: AssetRef | null
  versions: ContentVersion[]
  findings: Finding[]
  comments: Comment[]
  decisions: ReviewDecision[]
}

/** Deterministic, dependency-free thumbnail descriptor (no external images). */
export interface ThumbSpec {
  kind: 'art' | 'doc'
  palette: 'lime' | 'peach' | 'mint' | 'violet' | 'sky' | 'rose' | 'sand' | 'indigo'
  glyph: 'bottle' | 'bag' | 'leaf' | 'star' | 'wave' | 'text' | 'dot'
}

/**
 * Asset-level facts captured when content is submitted. These are what the
 * deterministic rule engine reads for visual rules — no model guessing.
 * `unreadable` marks an asset whose properties could not be extracted, which
 * must surface as "needs human review" rather than a pass or a fail.
 */
export interface AssetFacts {
  backgroundColour?: string
  clearSpaceRatio?: number
  typeface?: string
  aspectRatio?: string
  unreadable?: boolean
}

/** A brand/product image attached to a submission (snapshot of the asset). */
export interface AssetRef {
  id: string
  name: string
  url?: string | null
  source?: string | null
  attribution?: string | null
}

/** A record in the brand/product image library. */
export interface BrandAsset {
  id: string
  name: string
  brand: string
  category: string
  filePath?: string | null
  url?: string | null
  source: string
  sourceUrl?: string | null
  status: string
  width?: number | null
  height?: number | null
  notes: string
  uploadedById: string
  createdAt: string
}

/* ------------------------------------------------------------------ */
/* Exceptions                                                          */
/* ------------------------------------------------------------------ */

export type ExceptionStatus = 'Pending' | 'In Review' | 'Approved' | 'Rejected' | 'Expired' | 'Revoked'

export interface ExceptionRequest {
  id: string
  code: string
  contentId: string
  contentTitle: string
  contentMeta: string
  thumb: ThumbSpec
  brand: Brand
  ruleCode: string
  ruleTitle: string
  reason: string
  scope: string
  requestedById: string
  decidedById: string | null
  effectiveFrom: string
  expiresAt: string
  status: ExceptionStatus
  conditions: string
  decidedAt: string | null
}

/* ------------------------------------------------------------------ */
/* Simulations                                                         */
/* ------------------------------------------------------------------ */

export type SimulationStatus = 'Completed' | 'Running' | 'Failed'
export type ImpactResult = 'Compliant' | 'Needs Review' | 'Non-Compliant'

export interface SimulationItem {
  submissionId: string
  title: string
  meta: string
  thumb: ThumbSpec
  type: ContentType
  currentStatus: SubmissionStatus
  impact: ImpactResult
  note: string
}

export interface Simulation {
  id: string
  name: string
  ruleId: string
  ruleCode: string
  changeType: string
  currentValue: string
  newValue: string
  status: SimulationStatus
  createdAt: string
  createdById: string
  items: SimulationItem[]
  insight: string[]
  totals: {
    checked: number
    compliant: number
    needsReview: number
    nonCompliant: number
  }
}

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

export type AuditAction =
  | 'Approved'
  | 'Rejected'
  | 'Exception'
  | 'Revised'
  | 'Rule updated'
  | 'Guideline updated'
  | 'Simulation'
  | 'Login'

export interface AuditEvent {
  id: string
  at: string
  action: AuditAction
  entityTitle: string
  entityMeta: string
  thumb: ThumbSpec | null
  brand: Brand
  userId: string
  details: string
  status: 'Approved' | 'Rejected' | 'Exception' | 'Revised' | 'Recorded'
  entityKind: 'submission' | 'rule' | 'guideline' | 'exception' | 'simulation' | 'auth'
  entityId: string
  version?: number
}

/* ------------------------------------------------------------------ */
/* Shared API envelope                                                 */
/* ------------------------------------------------------------------ */

export interface Paged<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

export interface ReviewChecklistItem {
  id: string
  label: string
  hint: string
  ruleCode: string
  done: boolean
}

export interface UpcomingTask {
  id: string
  title: string
  when: string
  tone: 'blue' | 'grape' | 'green'
}
