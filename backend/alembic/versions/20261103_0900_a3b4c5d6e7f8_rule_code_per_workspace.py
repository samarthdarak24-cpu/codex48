"""Scope rule code uniqueness to the workspace

Rule codes were globally unique (``ix_rules_code`` UNIQUE), so a second
workspace could not own its own "CL-03". Codes are house conventions, not global
identifiers, so uniqueness moves to the (workspace, code) pair.

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-11-03 09:00:00
"""

from alembic import op

revision = "a3b4c5d6e7f8"
down_revision = "f2a3b4c5d6e7"
branch_labels = None
depends_on = None


def _index_names(conn) -> set[str]:
    rows = conn.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='rules'")
    return {r[0] for r in rows}


def upgrade() -> None:
    names = _index_names(op.get_bind())

    if "ix_rules_code" in names:
        op.drop_index("ix_rules_code", table_name="rules")

    # Keep a plain index: lookups by code still happen, they just aren't unique.
    op.create_index("ix_rules_code", "rules", ["code"], unique=False)

    if "uq_rule_workspace_code" not in names:
        op.create_index(
            "uq_rule_workspace_code", "rules", ["workspace", "code"], unique=True
        )


def downgrade() -> None:
    names = _index_names(op.get_bind())

    if "uq_rule_workspace_code" in names:
        op.drop_index("uq_rule_workspace_code", table_name="rules")
    if "ix_rules_code" in names:
        op.drop_index("ix_rules_code", table_name="rules")

    op.create_index("ix_rules_code", "rules", ["code"], unique=True)
