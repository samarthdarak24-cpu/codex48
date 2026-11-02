"""Pydantic schemas for Agent Studio API contracts."""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Tool Schemas
# ---------------------------------------------------------------------------

class ToolParameter(BaseModel):
    name: str
    type: str
    description: str
    required: bool = True
    default: Optional[Any] = None


class ToolDefinitionOut(BaseModel):
    id: str
    name: str
    description: str
    category: str
    permission_class: Literal["read", "draft", "write", "action"]
    requires_approval: bool = False
    timeout_seconds: int = 30
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    output_schema: Dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Workflow Graph Schemas
# ---------------------------------------------------------------------------

class WorkflowNode(BaseModel):
    id: str
    type: str  # trigger | ai | tool | logic | human_approval | output
    position: Dict[str, float] = Field(default_factory=lambda: {"x": 0.0, "y": 0.0})
    data: Dict[str, Any] = Field(default_factory=dict)


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None
    label: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class WorkflowGraph(BaseModel):
    nodes: List[WorkflowNode] = Field(default_factory=list)
    edges: List[WorkflowEdge] = Field(default_factory=list)
    viewport: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Agent Definition Schemas
# ---------------------------------------------------------------------------

class MemoryConfig(BaseModel):
    enabled: bool = False
    scope: Literal["none", "session", "workspace"] = "session"
    max_turns: int = 10


class ExecutionLimits(BaseModel):
    max_steps: int = 10
    timeout_seconds: int = 120
    max_tokens: int = 4000


class ApprovalPolicy(BaseModel):
    human_approval_required_for_write_actions: bool = True
    require_manager_approval: bool = True


class AgentBase(BaseModel):
    name: str
    description: str = ""
    category: str = "brand_compliance"
    icon: str = "Bot"
    instructions: str = ""
    tools: List[str] = Field(default_factory=list)
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    output_schema: Dict[str, Any] = Field(default_factory=dict)
    memory_config: MemoryConfig = Field(default_factory=MemoryConfig)
    execution_limits: ExecutionLimits = Field(default_factory=ExecutionLimits)
    approval_policy: ApprovalPolicy = Field(default_factory=ApprovalPolicy)
    workflow: Dict[str, Any] = Field(default_factory=lambda: {"nodes": [], "edges": []})
    visibility: Literal["workspace", "creators", "private"] = "workspace"


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    instructions: Optional[str] = None
    tools: Optional[List[str]] = None
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None
    memory_config: Optional[MemoryConfig] = None
    execution_limits: Optional[ExecutionLimits] = None
    approval_policy: Optional[ApprovalPolicy] = None
    workflow: Optional[Dict[str, Any]] = None
    visibility: Optional[Literal["workspace", "creators", "private"]] = None
    status: Optional[Literal["draft", "published", "paused", "archived"]] = None


class AgentOut(AgentBase):
    id: str
    workspace: str
    created_by_id: str
    slug: str
    status: Literal["draft", "published", "paused", "archived"]
    current_version: int
    published_version: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    total_runs: int = 0
    success_rate: float = 0.0
    last_run_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Prompt-to-Agent Schemas
# ---------------------------------------------------------------------------

class AgentPromptIn(BaseModel):
    prompt: str = Field(..., min_length=5, description="Natural language description of desired agent")
    category: Optional[str] = None
    workspace: Optional[str] = None


class AgentPromptSpec(BaseModel):
    name: str
    description: str
    category: str
    instructions: str
    tools: List[str]
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    output_schema: Dict[str, Any] = Field(default_factory=dict)
    memory: MemoryConfig = Field(default_factory=MemoryConfig)
    workflow: Dict[str, Any] = Field(default_factory=lambda: {"nodes": [], "edges": []})
    approval_policy: ApprovalPolicy = Field(default_factory=ApprovalPolicy)
    execution_limits: ExecutionLimits = Field(default_factory=ExecutionLimits)


class AgentPromptOut(BaseModel):
    agent: AgentOut
    spec: AgentPromptSpec
    tool_matches: List[str]
    rejected_tools: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Execution & Run Schemas
# ---------------------------------------------------------------------------

class AgentRunStepOut(BaseModel):
    id: str
    run_id: str
    step_number: int
    node_id: Optional[str] = None
    node_type: str
    node_label: str
    status: str
    tool_id: Optional[str] = None
    inputs: Dict[str, Any] = Field(default_factory=dict)
    outputs: Dict[str, Any] = Field(default_factory=dict)
    explanation: Optional[str] = None
    ms: int = 0
    error: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AgentApprovalOut(BaseModel):
    id: str
    run_id: str
    step_id: Optional[str] = None
    action_type: str
    description: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    requested_by_agent: str
    status: str
    decided_by_user_id: Optional[str] = None
    decided_at: Optional[datetime] = None
    decision_note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AgentApprovalDecisionIn(BaseModel):
    decision: Literal["approved", "rejected"]
    note: Optional[str] = ""


class AgentRunIn(BaseModel):
    inputs: Dict[str, Any] = Field(default_factory=dict)
    trigger_type: str = "manual"
    session_id: Optional[str] = None


class AgentTestIn(BaseModel):
    prompt: Optional[str] = None
    inputs: Optional[Dict[str, Any]] = None
    submission_id: Optional[str] = None
    query: Optional[str] = None


class AgentRunOut(BaseModel):
    id: str
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    agent_version: Optional[int] = None
    workspace: str
    trigger_type: str
    status: str
    inputs: Dict[str, Any] = Field(default_factory=dict)
    outputs: Dict[str, Any] = Field(default_factory=dict)
    duration_ms: int = 0
    tokens_used: int = 0
    tool_call_count: int = 0
    error: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None
    created_at: datetime
    steps: List[AgentRunStepOut] = Field(default_factory=list)
    approvals: List[AgentApprovalOut] = Field(default_factory=list)

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Template Schemas
# ---------------------------------------------------------------------------

class AgentTemplateOut(BaseModel):
    id: str
    name: str
    description: str
    category: str
    icon: str
    instructions: str
    tools: List[str]
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    approval_policy: ApprovalPolicy
    execution_limits: ExecutionLimits
    workflow: Dict[str, Any]

