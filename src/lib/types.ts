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

export type RuleStatus = 'active' | 'draft' | 'needs_confirmation' | 'archived' | 'rejected'
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
  | 'Draft'
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
  type: 'Brand colour' | 'Claims' | 'Logo usage' | 'Typography' | 'Tone of voice' | 'Disclosure' | 'Readability' | 'Layout'
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
  /** A1: image-pixel box this finding refers to (null for text-only rules). */
  region?: ImageBox | null
  /**
   * The deterministic engine's outcome. `needs_review` means the rule could not
   * be evaluated from the evidence available — it is neither a pass nor a fail
   * and must be surfaced for human review. This vocabulary matches the backend
   * (`Finding.outcome` in models.py).
   */
  outcome?: 'violation' | 'needs_review'
  /** Why the engine returned `unknown` (shown verbatim to the reviewer). */
  outcomeDetail?: string
  status: 'open' | 'resolved' | 'accepted_exception'
}

/* ------------------------------------------------------------------ */
/* A1 VisualGuard                                                      */
/* ------------------------------------------------------------------ */

export interface ImageBox {
  x: number
  y: number
  w: number
  h: number
}

export interface TextBlock {
  text: string
  box: ImageBox
  confidence: number
}

export interface DominantColor {
  hex: string
  ratio: number
}

export interface LogoMatch {
  logoId: string
  name: string
  box: ImageBox
  confidence: number
  method: string
  confident: boolean
}

export interface ContrastFinding {
  check: string
  region: ImageBox
  text: string
  value: number | null
  threshold: number
  status: 'pass' | 'fail' | 'unknown'
  foreground: string | null
  background: string | null
  isLargeText: boolean
}

export interface LayoutMetrics {
  width: number
  height: number
  aspectRatio: string
  aspectValue: number
  margins: { top: number; right: number; bottom: number; left: number }
  textAreaRatio: number
  emptySpaceRatio: number
  clearSpaceRatio: number | null
  clearSpaceRatioWidth: number | null
  logoCount: number
  textBlockCount: number
  status: string
}

export interface AssetAnalysis {
  id: string
  assetId: string | null
  submissionId: string | null
  status: 'pending' | 'processing' | 'complete' | 'failed'
  error: string | null
  width: number
  height: number
  /** False when the stored poster file is gone — the UI must not request it. */
  hasFile?: boolean
  ocrText: string
  ocrConfidence: number
  textBlocks: TextBlock[]
  dominantColors: DominantColor[]
  logoMatches: LogoMatch[]
  layoutMetrics: LayoutMetrics | Record<string, never>
  contrastFindings: ContrastFinding[]
  analyzerVersions: Record<string, string>
  unreadable: boolean
  createdAt: string | null
  completedAt: string | null
  summary: {
    textRegions: number
    logos: number
    contrastFailures: number
    contrastUnknown: number
    background: string | null
    aspectRatio: string
  }
  submission?: Submission
}

/* ------------------------------------------------------------------ */
/* A2 Evidence Intelligence                                            */
/* ------------------------------------------------------------------ */

export type AiSourceType = 'ai_suggestion' | 'needs_human_review' | 'rejected'

export interface AiFinding {
  id: string
  submissionId: string
  versionId: string | null
  ruleCode: string | null
  ruleTitle: string
  passageId: string | null
  sourceType: AiSourceType
  confidence: number
  similarity: number
  rationale: string
  minimalEdit: { original: string; proposed: string; rationale: string } | null
  quote: string
  citationVerified: boolean
  rejectedReason: string | null
  model: string
  promptVersion: string
  createdAt: string | null
}

export interface RetrievedPassage {
  passageId: string
  ruleCode: string
  docId: string
  heading: string
  text: string
  score: number
  bm25Score: number
  vectorScore: number
  method: string
  rank: number
}

export interface EvidenceCapabilities {
  llmConfigured: boolean
  embeddingModel: string | null
  promptVersion: string
  retrieval: 'hybrid_bm25_vector' | 'bm25_only'
}

/**
 * AI Trust Panel figures. Every number is aggregated from stored
 * `ai_call_log` rows — the API never estimates or back-fills them.
 */
export interface AiTrustSummary {
  workspace: string
  days: number
  promptVersion: string
  model: string
  totalCalls: number
  byPurpose: Record<string, number>
  byStatus: { success: number; timeout: number; error: number; skipped: number }
  successRate: number
  timeoutRate: number
  errorRate: number
  skippedRate: number
  citationsVerified: number
  citationsRejected: number
  citationRejectionRate: number
  avgLatencyMs: number
  redactionCount: number
  tokensIn: number
  tokensOut: number
  retrievalMethod: string
  embeddingModel: string | null
  lastCallAt: string | null
}

/** `/health` — capability report shown in the trust panel. */
export interface SystemHealth {
  status: string
  app: string
  version: string
  database: { ok: boolean; driver?: string; error?: string }
  storage: { ok: boolean; writable?: boolean; error?: string }
  ocr: { ok: boolean; engine?: string; detail?: string }
  embeddings: { ok: boolean; available?: boolean; model?: string; dim?: number | null; error?: string | null }
  llm: { ok: boolean; configured: boolean; model: string | null; daily_call_limit: number }
  scheduler: { enabled: boolean; running: boolean; cron: string; next_run: string | null; last_run: unknown; last_error: string | null }
  retrieval: string
}

/* ------------------------------------------------------------------ */
/* A3 Sentinel                                                         */
/* ------------------------------------------------------------------ */

export interface Publication {
  id: string
  submissionId: string
  versionId: string | null
  channel: string
  status: 'published' | 'withdrawn'
  publishedAt: string | null
  publishedBy: string
}

/** A publication as Sentinel sees it, with the content context it needs. */
export interface MonitoredPublication extends Publication {
  title: string
  type: string
  openTasks: number
}

export type SentinelTrigger =
  | 'rule_activated'
  | 'rule_edited'
  | 'rule_deactivated'
  | 'exception_expired'
  | 'exception_revoked'
  | 'claim_withdrawn'

export interface ReassessmentTask {
  id: string
  submissionId: string
  versionId: string | null
  submissionTitle: string
  triggerType: SentinelTrigger
  triggerRef: string
  reason: string
  affectedRuleCodes: string[]
  assigneeId: string | null
  status: 'open' | 'resolved' | 'dismissed'
  dueAt: string | null
  resolution: string | null
  resolutionNote: string
  resolvedById: string | null
  resolvedAt: string | null
  createdAt: string | null
  isOverdue: boolean
}

export interface AppNotification {
  id: string
  userId: string
  type: 'sentinel_task' | 'exception_expiring' | 'decision' | 'system'
  title: string
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string | null
  isRead: boolean
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
  /** Joined `campaigns.name`; null when the submission is not linked. */
  campaignId?: string | null
  campaign?: string | null
  brand: Brand
  status: SubmissionStatus
  /** Stored, server-computed compliance score (services/scoring.py). */
  complianceScore?: number
  scoreBreakdown?: ScoreBreakdown
  createdAt: string
  updatedAt: string
  creatorId: string
  version: number
  issueCount: number
  priority: Priority
  thumb: ThumbSpec
  asset?: AssetFacts
  assetId?: string | null
  assetName?: string | null
  assetUrl?: string | null
  assetRef?: AssetRef | null
  versions: ContentVersion[]
  findings: Finding[]
  comments: Comment[]
  decisions: ReviewDecision[]
}

/** Mirrors `ScoreBreakdown.as_dict()` in backend/app/services/scoring.py. */
export interface ScoreBreakdown {
  high: number
  medium: number
  low: number
  unknown: number
  passed: number
  penalty: number
  score: number
  applicable: number
  counted: number
  formulaVersion: string
  computedAt: string | null
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
  filename?: string
  mimeType?: string
  size?: number
  checksum?: string
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
  revokedAt?: string | null
  revokedById?: string | null
  revokeReason?: string
}

export interface ExceptionRulingHistory {
  id: string
  exceptionId: string
  action: string
  actorId: string
  actorName: string
  actorRole: string
  reasonOrConditions: string
  at: string | null
}

export interface GuidelinePassage {
  id: string
  docId: string
  pageNumber: number
  paragraphNumber: number
  passageText: string
  snippet?: string
}

/* ------------------------------------------------------------------ */
/* Simulations                                                         */
/* ------------------------------------------------------------------ */

export type SimulationStatus = 'Completed' | 'Running' | 'Failed' | 'Activated'
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

export interface SimulationBreakdownCategory {
  count: number
  items: Array<{ id: string; title: string; brand?: string }>
}

export interface SimulationBreakdown {
  newlyFlagged: SimulationBreakdownCategory
  resolved: SimulationBreakdownCategory
  unchanged: SimulationBreakdownCategory
  potentialConflicts: number
  exceptionsNeedingAttention: {
    count: number
    items: Array<{ id: string; code: string; reason: string; scope: string }>
  }
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
  breakdown?: SimulationBreakdown
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
