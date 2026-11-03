/** Agent Studio — frontend contract mirrored from backend/app/agents. */

export type AgentStatus = 'draft' | 'published' | 'paused' | 'archived'
export type RunStatus =
  | 'queued'
  | 'running'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting_approval'

export type NodeCategory = 'trigger' | 'ai' | 'tool' | 'logic' | 'approval' | 'output'

export interface NodePosition {
  x: number
  y: number
}

export interface WorkflowNodeData {
  label: string
  subtype: string
  toolId?: string | null
  description?: string
  config?: Record<string, unknown>
  [key: string]: unknown
}

export interface WorkflowNode {
  id: string
  type: NodeCategory
  position: NodePosition
  data: WorkflowNodeData
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string | null
  condition?: string | null
}

export interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface MemoryConfig {
  enabled: boolean
  scope: 'none' | 'session' | 'persistent'
}

export interface ApprovalPolicy {
  human_approval_required_for_write_actions: boolean
  approval_required_tools: string[]
}

export interface ExecutionLimits {
  max_steps: number
  timeout_seconds: number
}

export interface AgentSpec {
  name: string
  description: string
  category: string
  icon: string
  instructions: string
  tools: string[]
  input_schema: Record<string, unknown>
  output_schema: Record<string, unknown>
  memory: MemoryConfig
  workflow: WorkflowGraph
  approval_policy: ApprovalPolicy
  execution_limits: ExecutionLimits
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  warnings: string[]
  order?: string[]
  toolCount?: number
  nodeCount?: number
  edgeCount?: number
}

export interface AgentToolRef {
  id: string
  name: string
  description?: string
  permission: 'read' | 'draft' | 'write' | string
  approvalRequired?: boolean
}

export interface AgentVersion {
  id: string
  versionNumber: number
  status: string
  spec: AgentSpec
  validation: ValidationResult
  workflow: WorkflowGraph
  tools: AgentToolRef[]
  createdAt: string | null
  publishedAt: string | null
}

export interface AgentSummary {
  id: string
  name: string
  slug: string
  description: string
  category: string
  icon: string
  status: AgentStatus
  workspace: string
  ownerId: string
  ownerName: string
  toolCount: number
  currentVersion: number
  publishedVersionId: string | null
  hasUnpublishedChanges: boolean
  createdAt: string | null
  updatedAt: string | null
  totalRuns: number
  completedRuns: number
  failedRuns: number
  successRate: number | null
  lastRunAt: string | null
  lastRunStatus: RunStatus | null
}

export interface AgentDetail extends AgentSummary {
  version: AgentVersion
  publishedVersion: AgentVersion | null
  versions: {
    id: string
    versionNumber: number
    status: string
    createdAt: string | null
    publishedAt: string | null
  }[]
}

export interface RunStep {
  id: string
  nodeId: string
  nodeType: NodeCategory
  nodeSubtype: string
  label: string
  sequence: number
  status: StepStatus
  toolId: string | null
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  error: string | null
  startedAt: string | null
  finishedAt: string | null
  durationMs: number
}

export interface AgentApproval {
  id: string
  runId: string
  stepId: string | null
  action: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  requestedBy: string
  decidedBy: string
  decisionNote: string
  requestedAt: string | null
  decidedAt: string | null
}

export interface AgentRun {
  id: string
  agentId: string
  agentName: string
  agentIcon: string
  agentVersionId: string | null
  triggeredBy: string
  triggeredByName: string
  triggerType: string
  triggerRef: string
  status: RunStatus
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  error: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string | null
  durationMs: number
  stepCount: number
  toolCallCount: number
  tokenUsage: Record<string, unknown>
  steps?: RunStep[]
  approvals?: AgentApproval[]
}

export interface AgentStats {
  totalAgents: number
  publishedAgents: number
  draftAgents: number
  pausedAgents: number
  activeExecutions: number
  failedExecutions: number
  totalExecutions: number
  successRate: number | null
}

export interface ToolCatalogItem {
  id: string
  name: string
  description: string
  category: string
  permission: string
  approvalRequired: boolean
  timeoutSeconds: number
  idempotent: boolean
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
}

export interface NodeVocabularyItem {
  subtype: string
  label: string
  available?: boolean
  description?: string
}

export interface ToolCatalog {
  tools: ToolCatalogItem[]
  byCategory: Record<string, ToolCatalogItem[]>
  nodeVocabulary: {
    triggers: NodeVocabularyItem[]
    ai: NodeVocabularyItem[]
    logic: NodeVocabularyItem[]
    approval: NodeVocabularyItem[]
    output: NodeVocabularyItem[]
  }
}

export interface AgentTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: string
  trigger: string
  triggerLabel: string
  output: string
  outputLabel: string
  tools: { id: string; name: string; permission: string }[]
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
}

export interface GenerationMeta {
  generatedBy: 'llm' | 'fallback' | 'template' | string
  model: string | null
  droppedTools: string[]
  notes: string[]
  llmConfigured?: boolean
}

export interface DraftFromPromptResponse {
  agent: AgentDetail
  spec: AgentSpec
  validation: ValidationResult
  generation: GenerationMeta
}
