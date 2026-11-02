"""Validated JSON contract shared by the generator, builder, validator and API.

The LLM is asked to emit this shape. Nothing outside this module defines the
agent configuration vocabulary, so a malformed model response can never smuggle
new fields into an execution.
"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


MemoryScope = Literal["none", "session", "persistent"]
NodeCategory = Literal["trigger", "ai", "tool", "logic", "approval", "output"]
AgentStatus = Literal["draft", "published", "paused", "archived"]


class NodePosition(BaseModel):
    model_config = ConfigDict(extra="ignore")
    x: float = 0
    y: float = 0


class NodeData(BaseModel):
    """React Flow `data` payload. Extra keys are preserved for forward compat."""

    model_config = ConfigDict(extra="allow")

    label: str = ""
    subtype: str = ""
    toolId: Optional[str] = None
    description: str = ""
    config: dict = Field(default_factory=dict)


class WorkflowNode(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    type: NodeCategory = "tool"
    position: NodePosition = Field(default_factory=NodePosition)
    data: NodeData = Field(default_factory=NodeData)


class WorkflowEdge(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    source: str
    target: str
    label: Optional[str] = None
    condition: Optional[str] = None


class WorkflowGraph(BaseModel):
    model_config = ConfigDict(extra="ignore")

    nodes: list[WorkflowNode] = Field(default_factory=list)
    edges: list[WorkflowEdge] = Field(default_factory=list)


class MemoryConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")

    enabled: bool = False
    scope: MemoryScope = "none"

    @field_validator("scope", mode="before")
    @classmethod
    def _default_scope(cls, value):
        return value or "none"


class ApprovalPolicy(BaseModel):
    model_config = ConfigDict(extra="ignore")

    human_approval_required_for_write_actions: bool = True
    approval_required_tools: list[str] = Field(default_factory=list)


class ExecutionLimits(BaseModel):
    model_config = ConfigDict(extra="ignore")

    max_steps: int = Field(default=10, ge=1, le=30)
    timeout_seconds: int = Field(default=120, ge=5, le=600)


class AgentSpec(BaseModel):
    """The complete, validated configuration of one agent version."""

    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    category: str = "brand_compliance"
    icon: str = "sparkles"
    instructions: str = ""
    tools: list[str] = Field(default_factory=list)
    input_schema: dict = Field(default_factory=dict)
    output_schema: dict = Field(default_factory=dict)
    memory: MemoryConfig = Field(default_factory=MemoryConfig)
    workflow: WorkflowGraph = Field(default_factory=WorkflowGraph)
    approval_policy: ApprovalPolicy = Field(default_factory=ApprovalPolicy)
    execution_limits: ExecutionLimits = Field(default_factory=ExecutionLimits)

    @field_validator("tools", mode="before")
    @classmethod
    def _clean_tools(cls, value):
        if value is None:
            return []
        seen: list[str] = []
        for item in value:
            if isinstance(item, str) and item and item not in seen:
                seen.append(item)
        return seen


# ---------------------------------------------------------------------------
# API request / response shapes
# ---------------------------------------------------------------------------

class DraftFromPromptIn(BaseModel):
    prompt: str = Field(min_length=8, max_length=4000)
    category: Optional[str] = None
    brand: Optional[str] = None
    workspace: Optional[str] = None


class AgentCreateIn(AgentSpec):
    status: AgentStatus = "draft"


class AgentPatchIn(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    instructions: Optional[str] = None
    tools: Optional[list[str]] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    memory: Optional[MemoryConfig] = None
    workflow: Optional[WorkflowGraph] = None
    approval_policy: Optional[ApprovalPolicy] = None
    execution_limits: Optional[ExecutionLimits] = None


class WorkflowSaveIn(BaseModel):
    graph: WorkflowGraph


class TestAgentIn(BaseModel):
    input: dict = Field(default_factory=dict)
    message: Optional[str] = None


class ExecuteAgentIn(BaseModel):
    input: dict = Field(default_factory=dict)
    trigger_type: str = "manual"
    trigger_ref: str = ""


class ApprovalIn(BaseModel):
    decision: Literal["approve", "reject"]
    note: str = ""


class TemplateApplyIn(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
