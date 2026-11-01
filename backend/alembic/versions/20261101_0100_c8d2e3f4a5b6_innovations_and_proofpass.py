"""add_snippets_feedback_and_approval_passports

Revision ID: c8d2e3f4a5b6
Revises: b7c1d2e3f4a5
Create Date: 2026-11-01 01:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c8d2e3f4a5b6'
down_revision: Union[str, None] = 'b7c1d2e3f4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return name in insp.get_table_names()


def upgrade() -> None:
    if not _has_table('approved_snippets'):
        op.create_table(
            'approved_snippets',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True),
            sa.Column('text', sa.Text(), nullable=False),
            sa.Column('category', sa.String(), default='Claim'),
            sa.Column('rule_codes', sa.JSON(), default=list),
            sa.Column('claim_id', sa.String(), nullable=True),
            sa.Column('valid_from', sa.DateTime(), nullable=False),
            sa.Column('valid_until', sa.DateTime(), nullable=True),
            sa.Column('status', sa.String(), default='active'),
            sa.Column('created_by', sa.String(), default='David Kim'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
        )

    if not _has_table('finding_feedback'):
        op.create_table(
            'finding_feedback',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True),
            sa.Column('finding_id', sa.String(), nullable=False),
            sa.Column('submission_id', sa.String(), default=''),
            sa.Column('rule_code', sa.String(), default=''),
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('user_name', sa.String(), default=''),
            sa.Column('reason', sa.String(), default='not_a_violation'),
            sa.Column('notes', sa.Text(), default=''),
            sa.Column('status', sa.String(), default='submitted'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
        )

    if not _has_table('approval_passports'):
        op.create_table(
            'approval_passports',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True),
            sa.Column('submission_id', sa.String(), nullable=False),
            sa.Column('version_id', sa.String(), nullable=False),
            sa.Column('version_number', sa.Integer(), default=1),
            sa.Column('brand', sa.String(), default='PureGlow'),
            sa.Column('title', sa.String(), default=''),
            sa.Column('sha256', sa.String(), nullable=False),
            sa.Column('phash', sa.String(), default=''),
            sa.Column('dhash', sa.String(), default=''),
            sa.Column('token', sa.Text(), nullable=False),
            sa.Column('approved_by', sa.String(), default=''),
            sa.Column('status', sa.String(), default='active'),
            sa.Column('revocation_reason', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
        )


def downgrade() -> None:
    if _has_table('approval_passports'):
        op.drop_table('approval_passports')
    if _has_table('finding_feedback'):
        op.drop_table('finding_feedback')
    if _has_table('approved_snippets'):
        op.drop_table('approved_snippets')
