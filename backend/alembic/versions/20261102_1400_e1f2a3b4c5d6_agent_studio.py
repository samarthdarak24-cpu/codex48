"""Add Agent Studio tables.

Revision ID: e1f2a3b4c5d6
Revises: d9e3f4a5b6c7
Create Date: 2026-11-02 14:00:00.000000

Creates the ``studio_*`` namespace. These tables are intentionally separate
from the Review Crew's ``agent_runs`` table, which is tied to a submission
version and has different semantics.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "d9e3f4a5b6c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return name in inspector.get_table_names()


def upgrade() -> None:
    if not _has_table("studio_agents"):
        op.create_table(
            "studio_agents",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("workspace", sa.String(), nullable=False, server_default="PureGlow"),
            sa.Column("workspace_id", sa.String(), nullable=True),
            sa.Column("owner_id", sa.String(), nullable=False, server_default=""),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("slug", sa.String(), nullable=False, server_default=""),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("category", sa.String(), nullable=False, server_default="brand_compliance"),
            sa.Column("icon", sa.String(), nullable=False, server_default="sparkles"),
            sa.Column("status", sa.String(), nullable=False, server_default="draft"),
            sa.Column("current_version_number", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("published_version_id", sa.String(), nullable=True),
            sa.Column("last_run_at", sa.DateTime(), nullable=True),
            sa.Column("created_by", sa.String(), nullable=False, server_default=""),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_studio_agents_workspace", "studio_agents", ["workspace"])
        op.create_index("ix_studio_agents_owner_id", "studio_agents", ["owner_id"])
        op.create_index("ix_studio_agents_slug", "studio_agents", ["slug"])
        op.create_index("ix_studio_agents_category", "studio_agents", ["category"])
        op.create_index("ix_studio_agents_status", "studio_agents", ["status"])

    if not _has_table("studio_agent_versions"):
        op.create_table(
            "studio_agent_versions",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("agent_id", sa.String(), sa.ForeignKey("studio_agents.id", ondelete="CASCADE"), nullable=False),
            sa.Column("version_number", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("spec", sa.JSON(), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default="draft"),
            sa.Column("validation", sa.JSON(), nullable=False),
            sa.Column("created_by", sa.String(), nullable=False, server_default=""),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("published_at", sa.DateTime(), nullable=True),
            sa.Column("published_by", sa.String(), nullable=False, server_default=""),
            sa.UniqueConstraint("agent_id", "version_number", name="uq_studio_agent_version"),
        )
        op.create_index("ix_studio_agent_versions_agent_id", "studio_agent_versions", ["agent_id"])

    if not _has_table("studio_agent_workflows"):
        op.create_table(
            "studio_agent_workflows",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column(
                "agent_version_id",
                sa.String(),
                sa.ForeignKey("studio_agent_versions.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("graph", sa.JSON(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("agent_version_id", name="uq_studio_agent_workflow"),
        )
        op.create_index("ix_studio_agent_workflows_version", "studio_agent_workflows", ["agent_version_id"])

    if not _has_table("studio_agent_tool_permissions"):
        op.create_table(
            "studio_agent_tool_permissions",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column(
                "agent_version_id",
                sa.String(),
                sa.ForeignKey("studio_agent_versions.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("tool_id", sa.String(), nullable=False),
            sa.Column("permission_class", sa.String(), nullable=False, server_default="read"),
            sa.Column("approval_required", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("config", sa.JSON(), nullable=False),
            sa.UniqueConstraint("agent_version_id", "tool_id", name="uq_studio_agent_tool"),
        )
        op.create_index("ix_studio_agent_tools_version", "studio_agent_tool_permissions", ["agent_version_id"])

    if not _has_table("studio_agent_runs"):
        op.create_table(
            "studio_agent_runs",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("workspace", sa.String(), nullable=False, server_default="PureGlow"),
            sa.Column("agent_id", sa.String(), sa.ForeignKey("studio_agents.id", ondelete="CASCADE"), nullable=False),
            sa.Column("agent_version_id", sa.String(), nullable=True),
            sa.Column("triggered_by", sa.String(), nullable=False, server_default=""),
            sa.Column("trigger_type", sa.String(), nullable=False, server_default="manual"),
            sa.Column("trigger_ref", sa.String(), nullable=False, server_default=""),
            sa.Column("status", sa.String(), nullable=False, server_default="queued"),
            sa.Column("input", sa.JSON(), nullable=False),
            sa.Column("output", sa.JSON(), nullable=True),
            sa.Column("error", sa.Text(), nullable=True),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("finished_at", sa.DateTime(), nullable=True),
            sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("token_usage", sa.JSON(), nullable=False),
            sa.Column("step_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("tool_call_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_studio_agent_runs_workspace", "studio_agent_runs", ["workspace"])
        op.create_index("ix_studio_agent_runs_agent_id", "studio_agent_runs", ["agent_id"])
        op.create_index("ix_studio_agent_runs_status", "studio_agent_runs", ["status"])
        op.create_index("ix_studio_agent_runs_triggered_by", "studio_agent_runs", ["triggered_by"])

    if not _has_table("studio_agent_run_steps"):
        op.create_table(
            "studio_agent_run_steps",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("run_id", sa.String(), sa.ForeignKey("studio_agent_runs.id", ondelete="CASCADE"), nullable=False),
            sa.Column("node_id", sa.String(), nullable=False, server_default=""),
            sa.Column("node_type", sa.String(), nullable=False, server_default="tool"),
            sa.Column("node_subtype", sa.String(), nullable=False, server_default=""),
            sa.Column("label", sa.String(), nullable=False, server_default=""),
            sa.Column("sequence", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("status", sa.String(), nullable=False, server_default="pending"),
            sa.Column("tool_id", sa.String(), nullable=True),
            sa.Column("input", sa.JSON(), nullable=False),
            sa.Column("output", sa.JSON(), nullable=True),
            sa.Column("error", sa.Text(), nullable=True),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("finished_at", sa.DateTime(), nullable=True),
            sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        )
        op.create_index("ix_studio_agent_run_steps_run_id", "studio_agent_run_steps", ["run_id"])

    if not _has_table("studio_agent_approvals"):
        op.create_table(
            "studio_agent_approvals",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("workspace", sa.String(), nullable=False, server_default="PureGlow"),
            sa.Column("run_id", sa.String(), sa.ForeignKey("studio_agent_runs.id", ondelete="CASCADE"), nullable=False),
            sa.Column("step_id", sa.String(), nullable=True),
            sa.Column("agent_id", sa.String(), nullable=False, server_default=""),
            sa.Column("action", sa.String(), nullable=False, server_default=""),
            sa.Column("status", sa.String(), nullable=False, server_default="pending"),
            sa.Column("requested_by", sa.String(), nullable=False, server_default=""),
            sa.Column("decided_by", sa.String(), nullable=False, server_default=""),
            sa.Column("decision_note", sa.Text(), nullable=False, server_default=""),
            sa.Column("requested_at", sa.DateTime(), nullable=False),
            sa.Column("decided_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_studio_agent_approvals_workspace", "studio_agent_approvals", ["workspace"])
        op.create_index("ix_studio_agent_approvals_run_id", "studio_agent_approvals", ["run_id"])
        op.create_index("ix_studio_agent_approvals_status", "studio_agent_approvals", ["status"])
        op.create_index("ix_studio_agent_approvals_agent_id", "studio_agent_approvals", ["agent_id"])

    if not _has_table("studio_agent_memory"):
        op.create_table(
            "studio_agent_memory",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("workspace", sa.String(), nullable=False, server_default="PureGlow"),
            sa.Column("agent_id", sa.String(), nullable=False),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("session_id", sa.String(), nullable=False, server_default="default"),
            sa.Column("key", sa.String(), nullable=False, server_default="summary"),
            sa.Column("value", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("agent_id", "user_id", "session_id", "key", name="uq_studio_agent_memory"),
        )
        op.create_index("ix_studio_agent_memory_workspace", "studio_agent_memory", ["workspace"])
        op.create_index("ix_studio_agent_memory_agent_id", "studio_agent_memory", ["agent_id"])
        op.create_index("ix_studio_agent_memory_user_id", "studio_agent_memory", ["user_id"])

    if not _has_table("studio_agent_triggers"):
        op.create_table(
            "studio_agent_triggers",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("workspace", sa.String(), nullable=False, server_default="PureGlow"),
            sa.Column("agent_id", sa.String(), sa.ForeignKey("studio_agents.id", ondelete="CASCADE"), nullable=False),
            sa.Column("trigger_type", sa.String(), nullable=False, server_default="manual"),
            sa.Column("config", sa.JSON(), nullable=False),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("last_fired_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("agent_id", "trigger_type", name="uq_studio_agent_trigger"),
        )
        op.create_index("ix_studio_agent_triggers_workspace", "studio_agent_triggers", ["workspace"])
        op.create_index("ix_studio_agent_triggers_agent_id", "studio_agent_triggers", ["agent_id"])


def downgrade() -> None:
    for table in (
        "studio_agent_triggers",
        "studio_agent_memory",
        "studio_agent_approvals",
        "studio_agent_run_steps",
        "studio_agent_runs",
        "studio_agent_tool_permissions",
        "studio_agent_workflows",
        "studio_agent_versions",
        "studio_agents",
    ):
        if _has_table(table):
            op.drop_table(table)
