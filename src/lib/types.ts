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
  score?: number
  creator?: string
  text?: string
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
  revokedAt?: string | null
  revokedById?: string | null
  revokeReason?: string
  createdAt?: string
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

/* ------------------------------------------------------------------ */
/* Agent Studio & Workflow Types                                      */
/* ------------------------------------------------------------------ */

export type AgentStatus = 'draft' | 'published' | 'paused' | 'archived'

export interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, any>
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  label?: string
  data?: Record<string, any>
}

export interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  viewport?: { x: number; y: number; zoom: number }
}

export interface Agent {
  id: string
  workspace: string
  created_by_id: string
  name: string
  slug: string
  description: string
  category: string
  icon: string
  status: AgentStatus
  current_version: number
  published_version?: number | null
  visibility: 'workspace' | 'creators' | 'private'
  instructions: string
  tools: string[]
  input_schema: Record<string, any>
  output_schema: Record<string, any>
  memory_config: { enabled: boolean; scope: 'none' | 'session' | 'workspace'; max_turns?: number }
  execution_limits: { max_steps: number; timeout_seconds: number; max_tokens: number }
  approval_policy: { human_approval_required_for_write_actions: boolean; require_manager_approval: boolean }
  workflow: WorkflowGraph
  created_at: string
  updated_at: string
  total_runs: number
  success_rate: number
  last_run_at?: string | null
}

export interface AgentTool {
  id: string
  name: string
  description: string
  category: string
  permission_class: 'read' | 'draft' | 'write' | 'action'
  requires_approval: boolean
  timeout_seconds: number
  input_schema: Record<string, any>
  output_schema: Record<string, any>
}

export interface AgentRunStep {
  id: string
  run_id: string
  step_number: number
  node_id?: string | null
  node_type: string
  node_label: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting_for_approval'
  tool_id?: string | null
  inputs: Record<string, any>
  outputs: Record<string, any>
  explanation?: string | null
  ms: number
  error?: string | null
  created_at: string
}

export interface AgentApproval {
  id: string
  run_id: string
  step_id?: string | null
  action_type: string
  description: string
  payload: Record<string, any>
  requested_by_agent: string
  status: 'pending' | 'approved' | 'rejected'
  decided_by_user_id?: string | null
  decided_at?: string | null
  decision_note?: string | null
  created_at: string
}

export interface AgentRun {
  id: string
  agent_id?: string | null
  agent_name?: string | null
  agent_version?: number | null
  workspace: string
  trigger_type: string
  status: 'queued' | 'running' | 'waiting_for_approval' | 'completed' | 'failed' | 'cancelled'
  inputs: Record<string, any>
  outputs: Record<string, any>
  duration_ms: number
  tokens_used: number
  tool_call_count: number
  error?: string | null
  started_at: string
  finished_at?: string | null
  created_at: string
  steps: AgentRunStep[]
  approvals: AgentApproval[]
}

export interface AgentTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: string
  instructions: string
  tools: string[]
  input_schema: Record<string, any>
  output_schema: Record<string, any>
  approval_policy: any
  execution_limits: any
  workflow: WorkflowGraph
}

export interface AgentPromptResult {
  agent: Agent
  spec: any
  tool_matches: string[]
  rejected_tools: string[]
  warnings: string[]
}

export interface AssistantStatus {
  status: 'healthy' | 'degraded' | 'unavailable'
  provider: string
  model: string
  retrieval_only: boolean
  version: string
  notice?: string
}

export interface AssistantCitationItem {
  passage_id?: string
  document_name?: string
  page_number?: number
  quote: string
  verified: boolean
}

export interface AssistantActionItem {
  label: string
  action_type: string
  route?: string
  payload?: any
}

export interface AssistantMessage {
  id: string
  sender: 'user' | 'assistant' | 'system'
  content: string
  citations?: AssistantCitationItem[]
  suggested_actions?: AssistantActionItem[]
  draft?: any
  latency_ms?: number
  created_at?: string
}

export interface AssistantConversation {
  id: string
  title: string
  context_route?: string
  status?: string
  created_at?: string
  updated_at?: string
  messages?: AssistantMessage[]
}

export interface NavCounts {
  manager: {
    review_queue: number
    exceptions: number
    sentinel: number
  }
  creator: {
    my_submissions: number
    ai_review: number
    exception_requests: number
    sentinel_tasks: number
    approved_content: number
  }
  unread_notifications: number
}

export interface SubmissionsSummary {
  total: number
  approved: number
  pending: number
  needs_changes: number
  rejected: number
}
