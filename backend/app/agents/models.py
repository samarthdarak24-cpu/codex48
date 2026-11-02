"""Relational models for Precedent Agent Studio.

Defines schemas for Agents, Versions, Workflows, Tool Permissions, Runs, Steps,
Approvals, Memory Sessions, and Triggers.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String, default="brand_compliance", index=True)
    icon: Mapped[str] = mapped_column(String, default="Bot")
    status: Mapped[str] = mapped_column(String, default="draft", index=True)  # draft | published | paused | archived
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    published_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    visibility: Mapped[str] = mapped_column(String, default="workspace")  # workspace | creators | private
    instructions: Mapped[str] = mapped_column(Text, default="")
    tools: Mapped[list] = mapped_column(JSON, default=list)
    input_schema: Mapped[dict] = mapped_column(JSON, default=dict)
    output_schema: Mapped[dict] = mapped_column(JSON, default=dict)
    memory_config: Mapped[dict] = mapped_column(JSON, default=lambda: {"enabled": False, "scope": "session"})
    execution_limits: Mapped[dict] = mapped_column(JSON, default=lambda: {"max_steps": 10, "timeout_seconds": 120})
    approval_policy: Mapped[dict] = mapped_column(
        JSON, default=lambda: {"human_approval_required_for_write_actions": True, "require_manager_approval": True}
    )
    workflow: Mapped[dict] = mapped_column(JSON, default=lambda: {"nodes": [], "edges": []})
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    versions: Mapped[List["AgentVersion"]] = relationship("AgentVersion", back_populates="agent", cascade="all, delete-orphan")
    runs: Mapped[List["AgentRun"]] = relationship("AgentRun", back_populates="agent_rel", cascade="all, delete-orphan")


class AgentVersion(Base):
    __tablename__ = "agent_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    instructions: Mapped[str] = mapped_column(Text, default="")
    tools: Mapped[list] = mapped_column(JSON, default=list)
    input_schema: Mapped[dict] = mapped_column(JSON, default=dict)
    output_schema: Mapped[dict] = mapped_column(JSON, default=dict)
    memory_config: Mapped[dict] = mapped_column(JSON, default=dict)
    execution_limits: Mapped[dict] = mapped_column(JSON, default=dict)
    approval_policy: Mapped[dict] = mapped_column(JSON, default=dict)
    workflow: Mapped[dict] = mapped_column(JSON, default=dict)
    changelog: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    agent: Mapped["Agent"] = relationship("Agent", back_populates="versions")


class AgentWorkflow(Base):
    __tablename__ = "agent_workflows"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    nodes: Mapped[list] = mapped_column(JSON, default=list)
    edges: Mapped[list] = mapped_column(JSON, default=list)
    viewport: Mapped[dict] = mapped_column(JSON, default=lambda: {"x": 0, "y": 0, "zoom": 1})
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class AgentToolPermission(Base):
    __tablename__ = "agent_tool_permissions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id", ondelete="CASCADE"), index=True)
    tool_id: Mapped[str] = mapped_column(String, nullable=False)
    permission_class: Mapped[str] = mapped_column(String, default="read")  # read | draft | write | action
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    max_calls_per_run: Mapped[int] = mapped_column(Integer, default=10)


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    agent_id: Mapped[Optional[str]] = mapped_column(ForeignKey("agents.id", ondelete="CASCADE"), nullable=True, index=True)
    agent_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=1)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    submission_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    trigger_type: Mapped[str] = mapped_column(String, default="manual")  # manual | test | submission_created | guideline_updated | rule_changed | exception_expired | scheduled
    status: Mapped[str] = mapped_column(String, default="running", index=True)  # queued | running | waiting_for_approval | completed | failed | cancelled
    inputs: Mapped[dict] = mapped_column(JSON, default=dict)
    outputs: Mapped[dict] = mapped_column(JSON, default=dict)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    tool_call_count: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    budget: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    # Relationships
    agent_rel: Mapped[Optional["Agent"]] = relationship("Agent", back_populates="runs")
    steps: Mapped[List["AgentRunStep"]] = relationship("AgentRunStep", back_populates="run", cascade="all, delete-orphan")
    approvals: Mapped[List["AgentApproval"]] = relationship("AgentApproval", back_populates="run", cascade="all, delete-orphan")


class AgentRunStep(Base):
    __tablename__ = "agent_run_steps"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    run_id: Mapped[str] = mapped_column(ForeignKey("agent_runs.id", ondelete="CASCADE"), index=True)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    node_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    node_type: Mapped[str] = mapped_column(String, default="tool")  # trigger | ai | tool | logic | human_approval | output
    node_label: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="pending")  # pending | running | completed | failed | skipped | waiting_for_approval
    tool_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    inputs: Mapped[dict] = mapped_column(JSON, default=dict)
    outputs: Mapped[dict] = mapped_column(JSON, default=dict)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ms: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    run: Mapped["AgentRun"] = relationship("AgentRun", back_populates="steps")


class AgentApproval(Base):
    __tablename__ = "agent_approvals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    run_id: Mapped[str] = mapped_column(ForeignKey("agent_runs.id", ondelete="CASCADE"), index=True)
    step_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    action_type: Mapped[str] = mapped_column(String, nullable=False)  # write_action | create_review_draft | create_notification | create_sentinel_task
    description: Mapped[str] = mapped_column(Text, default="")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    requested_by_agent: Mapped[str] = mapped_column(String, default="Agent")
    status: Mapped[str] = mapped_column(String, default="pending", index=True)  # pending | approved | rejected
    decided_by_user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    decision_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    run: Mapped["AgentRun"] = relationship("AgentRun", back_populates="approvals")


class AgentMemorySession(Base):
    __tablename__ = "agent_memory_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id", ondelete="CASCADE"), index=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    user_id: Mapped[str] = mapped_column(String, index=True)
    session_id: Mapped[str] = mapped_column(String, index=True)
    turns: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class AgentTrigger(Base):
    __tablename__ = "agent_triggers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id", ondelete="CASCADE"), index=True)
    trigger_type: Mapped[str] = mapped_column(String, nullable=False)  # submission_created | guideline_updated | rule_changed | exception_expired | scheduled
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_triggered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

