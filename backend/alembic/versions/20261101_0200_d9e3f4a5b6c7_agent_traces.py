"""Add agent_traces table for Review Crew audit traces.

Revision ID: d9e3f4a5b6c7
Revises: c8d2e3f4a5b6
Create Date: 2026-11-01 02:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd9e3f4a5b6c7'
down_revision: Union[str, None] = 'c8d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely create agent_traces table
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "agent_traces" not in existing_tables:
        op.create_table(
            "agent_traces",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("workspace", sa.String(), server_default="PureGlow", nullable=True),
            sa.Column("submission_id", sa.String(), nullable=False),
            sa.Column("version_num", sa.Integer(), server_default="1", nullable=False),
            sa.Column("orchestrator_status", sa.String(), server_default="completed", nullable=False),
            sa.Column("steps_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("summary_text", sa.Text(), nullable=True),
            sa.Column("total_duration_ms", sa.Integer(), server_default="0", nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_agent_traces_submission_id", "agent_traces", ["submission_id"])
        op.create_index("ix_agent_traces_workspace", "agent_traces", ["workspace"])
        op.create_index("ix_agent_traces_status", "agent_traces", ["orchestrator_status"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    if "agent_traces" in existing_tables:
        op.drop_table("agent_traces")
