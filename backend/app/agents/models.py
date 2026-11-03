"""SQLAlchemy models for Agent Studio.

These tables are deliberately separate from the Review Crew's ``agent_runs`` /
``agent_tool_calls`` tables (which pre-date Agent Studio and are tied to a
submission version). Reusing those tables would have coupled two unrelated
execution models, so Agent Studio owns the ``studio_*`` namespace instead.

Every table carries workspace ownership so the router can enforce tenant
isolation at the row level, exactly like the rest of Precedent.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base
from ..models import gen_uuid, utcnow


class StudioAgent(Base):
    """An agent identity. Configuration lives in immutable versions."""

    __tablename__ = "studio_agents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    owner_id: Mapped[str] = mapped_column(String, default="", index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, default="", index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String, default="brand_compliance", index=True)
    icon: Mapped[str] = mapped_column(String, default="sparkles")
    status: Mapped[str] = mapped_column(String, default="draft", index=True)  # draft | published | paused | archived
    current_version_number: Mapped[int] = mapped_column(Integer, default=1)
    published_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    versions: Mapped[List["StudioAgentVersion"]] = relationship(
        "StudioAgentVersion", backref="agent", cascade="all, delete-orphan",
        order_by="StudioAgentVersion.version_number",
    )


class StudioAgentVersion(Base):
    """An immutable snapshot of an agent specification."""

    __tablename__ = "studio_agent_versions"
    __table_args__ = (UniqueConstraint("agent_id", "version_number", name="uq_studio_agent_version"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    agent_id: Mapped[str] = mapped_column(
        ForeignKey("studio_agents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    spec: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String, default="draft")  # draft | published | archived
    validation: Mapped[dict] = mapped_column(JSON, default=dict)
    created_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    published_by: Mapped[str] = mapped_column(String, default="")

    workflow: Mapped[Optional["StudioAgentWorkflow"]] = relationship(
        "StudioAgentWorkflow", backref="version", cascade="all, delete-orphan", uselist=False
    )
    tool_permissions: Mapped[List["StudioAgentToolPermission"]] = relationship(
        "StudioAgentToolPermission", backref="version", cascade="all, delete-orphan"
    )


class StudioAgentWorkflow(Base):
    """The saved node/edge graph for one agent version."""

    __tablename__ = "studio_agent_workflows"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    agent_version_id: Mapped[str] = mapped_column(
        ForeignKey("studio_agent_versions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    graph: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class StudioAgentToolPermission(Base):
    """The resolved allow-list for one agent version."""

    __tablename__ = "studio_agent_tool_permissions"
    __table_args__ = (
        UniqueConstraint("agent_version_id", "tool_id", name="uq_studio_agent_tool"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    agent_version_id: Mapped[str] = mapped_column(
        ForeignKey("studio_agent_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tool_id: Mapped[str] = mapped_column(String, nullable=False)
    permission_class: Mapped[str] = mapped_column(String, default="read")  # read | draft | write
    approval_required: Mapped[bool] = mapped_column(Boolean, default=False)
    config: Mapped[dict] = mapped_column(JSON, default=dict)


class StudioAgentRun(Base):
    """One bounded execution of an agent version."""

    __tablename__ = "studio_agent_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    agent_id: Mapped[str] = mapped_column(
        ForeignKey("studio_agents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    agent_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    triggered_by: Mapped[str] = mapped_column(String, default="", index=True)
    trigger_type: Mapped[str] = mapped_column(String, default="manual")
    trigger_ref: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="queued", index=True)
    # queued | running | waiting_approval | completed | failed | cancelled
    input: Mapped[dict] = mapped_column(JSON, default=dict)
    output: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    token_usage: Mapped[dict] = mapped_column(JSON, default=dict)
    step_count: Mapped[int] = mapped_column(Integer, default=0)
    tool_call_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    steps: Mapped[List["StudioAgentRunStep"]] = relationship(
        "StudioAgentRunStep", backref="run", cascade="all, delete-orphan",
        order_by="StudioAgentRunStep.sequence",
    )
    approvals: Mapped[List["StudioAgentApproval"]] = relationship(
        "StudioAgentApproval", backref="run", cascade="all, delete-orphan"
    )


class StudioAgentRunStep(Base):
    """A single node execution inside a run."""

    __tablename__ = "studio_agent_run_steps"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    run_id: Mapped[str] = mapped_column(
        ForeignKey("studio_agent_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    node_id: Mapped[str] = mapped_column(String, default="")
    node_type: Mapped[str] = mapped_column(String, default="tool")
    node_subtype: Mapped[str] = mapped_column(String, default="")
    label: Mapped[str] = mapped_column(String, default="")
    sequence: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="pending")
    # pending | running | completed | failed | skipped | waiting_approval
    tool_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    input: Mapped[dict] = mapped_column(JSON, default=dict)
    output: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)


class StudioAgentApproval(Base):
    """A human-approval checkpoint for a protected write action."""

    __tablename__ = "studio_agent_approvals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    run_id: Mapped[str] = mapped_column(
        ForeignKey("studio_agent_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    step_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    agent_id: Mapped[str] = mapped_column(String, default="", index=True)
    action: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="pending", index=True)
    # pending | approved | rejected | expired
    requested_by: Mapped[str] = mapped_column(String, default="")
    decided_by: Mapped[str] = mapped_column(String, default="")
    decision_note: Mapped[str] = mapped_column(Text, default="")
    requested_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class StudioAgentMemory(Base):
    """Opt-in, workspace-scoped agent memory (never shared across users)."""

    __tablename__ = "studio_agent_memory"
    __table_args__ = (
        UniqueConstraint("agent_id", "user_id", "session_id", "key", name="uq_studio_agent_memory"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    agent_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(String, default="default")
    key: Mapped[str] = mapped_column(String, default="summary")
    value: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class StudioAgentTrigger(Base):
    """A persisted trigger configuration for an agent."""

    __tablename__ = "studio_agent_triggers"
    __table_args__ = (UniqueConstraint("agent_id", "trigger_type", name="uq_studio_agent_trigger"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    agent_id: Mapped[str] = mapped_column(
        ForeignKey("studio_agents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    trigger_type: Mapped[str] = mapped_column(String, default="manual")
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_fired_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
