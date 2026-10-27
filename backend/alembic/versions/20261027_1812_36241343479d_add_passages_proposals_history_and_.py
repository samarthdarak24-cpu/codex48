"""add_passages_proposals_history_and_workspace

Revision ID: 36241343479d
Revises: 88bf5ea95c6b
Create Date: 2026-10-27 18:12:11.329969
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '36241343479d'
down_revision: Union[str, None] = '88bf5ea95c6b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create guideline_passages
    op.create_table(
        'guideline_passages',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('doc_id', sa.String(), nullable=False),
        sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True),
        sa.Column('page_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('paragraph_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('heading', sa.String(), nullable=False, server_default=''),
        sa.Column('passage_text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['doc_id'], ['guideline_docs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_guideline_passages_doc_id'), 'guideline_passages', ['doc_id'], unique=False)
    op.create_index(op.f('ix_guideline_passages_workspace'), 'guideline_passages', ['workspace'], unique=False)

    # 2. Create proposed_rules
    op.create_table(
        'proposed_rules',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('simulation_id', sa.String(), nullable=True),
        sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True),
        sa.Column('target_rule_id', sa.String(), nullable=False),
        sa.Column('target_rule_code', sa.String(), nullable=False),
        sa.Column('change_type', sa.String(), nullable=False),
        sa.Column('current_value', sa.String(), nullable=False, server_default=''),
        sa.Column('proposed_value', sa.String(), nullable=False, server_default=''),
        sa.Column('status', sa.String(), nullable=False, server_default='simulated'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('created_by_id', sa.String(), nullable=False, server_default=''),
        sa.Column('activated_at', sa.DateTime(), nullable=True),
        sa.Column('activated_by_id', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_proposed_rules_simulation_id'), 'proposed_rules', ['simulation_id'], unique=False)
    op.create_index(op.f('ix_proposed_rules_workspace'), 'proposed_rules', ['workspace'], unique=False)

    # 3. Create exception_ruling_history
    op.create_table(
        'exception_ruling_history',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('exception_id', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=False, server_default=''),
        sa.Column('actor_name', sa.String(), nullable=False, server_default=''),
        sa.Column('actor_role', sa.String(), nullable=False, server_default=''),
        sa.Column('reason_or_conditions', sa.Text(), nullable=False, server_default=''),
        sa.Column('at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['exception_id'], ['exceptions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_exception_ruling_history_exception_id'), 'exception_ruling_history', ['exception_id'], unique=False)

    # 4. Add workspace column to tables
    with op.batch_alter_table('approved_claims', schema=None) as batch_op:
        batch_op.add_column(sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True))
        batch_op.create_index(batch_op.f('ix_approved_claims_workspace'), ['workspace'], unique=False)

    with op.batch_alter_table('audit_events', schema=None) as batch_op:
        batch_op.add_column(sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True))
        batch_op.create_index(batch_op.f('ix_audit_events_workspace'), ['workspace'], unique=False)

    with op.batch_alter_table('brand_assets', schema=None) as batch_op:
        batch_op.add_column(sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True))
        batch_op.create_index(batch_op.f('ix_brand_assets_workspace'), ['workspace'], unique=False)

    with op.batch_alter_table('exceptions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True))
        batch_op.add_column(sa.Column('revoked_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('revoked_by_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('revoke_reason', sa.Text(), server_default='', nullable=True))
        batch_op.create_index(batch_op.f('ix_exceptions_workspace'), ['workspace'], unique=False)

    with op.batch_alter_table('guideline_docs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True))
        batch_op.create_index(batch_op.f('ix_guideline_docs_workspace'), ['workspace'], unique=False)

    with op.batch_alter_table('rules', schema=None) as batch_op:
        batch_op.add_column(sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True))
        batch_op.create_index(batch_op.f('ix_rules_workspace'), ['workspace'], unique=False)

    with op.batch_alter_table('simulations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True))
        batch_op.add_column(sa.Column('breakdown', sa.JSON(), nullable=True))
        batch_op.create_index(batch_op.f('ix_simulations_workspace'), ['workspace'], unique=False)

    with op.batch_alter_table('submissions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True))
        batch_op.create_index(batch_op.f('ix_submissions_workspace'), ['workspace'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('submissions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_submissions_workspace'))
        batch_op.drop_column('workspace')

    with op.batch_alter_table('simulations', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_simulations_workspace'))
        batch_op.drop_column('breakdown')
        batch_op.drop_column('workspace')

    with op.batch_alter_table('rules', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_rules_workspace'))
        batch_op.drop_column('workspace')

    with op.batch_alter_table('guideline_docs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_guideline_docs_workspace'))
        batch_op.drop_column('workspace')

    with op.batch_alter_table('exceptions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_exceptions_workspace'))
        batch_op.drop_column('revoke_reason')
        batch_op.drop_column('revoked_by_id')
        batch_op.drop_column('revoked_at')
        batch_op.drop_column('workspace')

    with op.batch_alter_table('brand_assets', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_brand_assets_workspace'))
        batch_op.drop_column('workspace')

    with op.batch_alter_table('audit_events', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_audit_events_workspace'))
        batch_op.drop_column('workspace')

    with op.batch_alter_table('approved_claims', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_approved_claims_workspace'))
        batch_op.drop_column('workspace')

    op.drop_index(op.f('ix_exception_ruling_history_exception_id'), table_name='exception_ruling_history')
    op.drop_table('exception_ruling_history')
    op.drop_index(op.f('ix_proposed_rules_workspace'), table_name='proposed_rules')
    op.drop_index(op.f('ix_proposed_rules_simulation_id'), table_name='proposed_rules')
    op.drop_table('proposed_rules')
    op.drop_index(op.f('ix_guideline_passages_workspace'), table_name='guideline_passages')
    op.drop_index(op.f('ix_guideline_passages_doc_id'), table_name='guideline_passages')
    op.drop_table('guideline_passages')
