"""Store the compliance score on the submission; label demo rows.

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-11-02 20:30:00.000000

Why this exists (GAP_REPORT G2 / spec O4): the compliance score used to be
computed in the browser by `AppContext.complianceScore()`, which violates the
rule that the frontend never computes compliance. The score is now produced by
`app/services/scoring.py`, persisted here, and only displayed by the UI.

`formula_version` is stored alongside so an old score can be identified as
stale rather than silently mixed with a new formula.

Also adds `is_demo` so seeded rows can be labelled per spec rule 2.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    sub_cols = _columns("submissions")
    if "compliance_score" not in sub_cols:
        op.add_column("submissions", sa.Column("compliance_score", sa.Integer(), nullable=True))
    if "score_formula_version" not in sub_cols:
        op.add_column("submissions", sa.Column("score_formula_version", sa.String(), nullable=True))
    if "score_computed_at" not in sub_cols:
        op.add_column("submissions", sa.Column("score_computed_at", sa.DateTime(), nullable=True))
    if "is_demo" not in sub_cols:
        op.add_column(
            "submissions",
            sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    camp_cols = _columns("campaigns")
    if "is_demo" not in camp_cols:
        op.add_column(
            "campaigns",
            sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade() -> None:
    sub_cols = _columns("submissions")
    for name in ("score_computed_at", "score_formula_version", "compliance_score", "is_demo"):
        if name in sub_cols:
            op.drop_column("submissions", name)

    camp_cols = _columns("campaigns")
    if "is_demo" in camp_cols:
        op.drop_column("campaigns", "is_demo")
