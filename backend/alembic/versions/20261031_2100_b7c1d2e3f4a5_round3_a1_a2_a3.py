"""round3_a1_a2_a3_visualguard_evidence_sentinel

Adds the Round 3 tables from blueprint 3.4:
  asset_analysis, passage_embeddings, ai_findings, ai_call_log,
  publications, reassessment_tasks, notifications

Idempotent by design: the dev server calls Base.metadata.create_all() on
startup, so on an existing database these tables may already exist. Each
create is guarded by an inspector check, which lets the same migration run
on a fresh database and on a Round 2 database without touching existing
rows.

Revision ID: b7c1d2e3f4a5
Revises: 36241343479d
Create Date: 2026-10-31 21:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7c1d2e3f4a5'
down_revision: Union[str, None] = '36241343479d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return name in insp.get_table_names()


def upgrade() -> None:
    # ---- Shared: findings gain an image region for A1 overlay boxes ------
    if _has_table('findings'):
        cols = {c['name'] for c in sa.inspect(op.get_bind()).get_columns('findings')}
        if 'region' not in cols:
            op.add_column('findings', sa.Column('region', sa.JSON(), nullable=True))
        if 'outcome' not in cols:
            op.add_column(
                'findings',
                sa.Column('outcome', sa.String(), nullable=False, server_default='violation'),
            )

    # ---- A1 VisualGuard -------------------------------------------------
    if not _has_table('asset_analysis'):
        op.create_table(
            'asset_analysis',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True),
            sa.Column('asset_id', sa.String(), nullable=True),
            sa.Column('submission_id', sa.String(), nullable=True),
            sa.Column('file_path', sa.String(), nullable=True),
            sa.Column('status', sa.String(), nullable=False, server_default='pending'),
            sa.Column('error', sa.Text(), nullable=True),
            sa.Column('width', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('height', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('ocr_text', sa.Text(), nullable=False, server_default=''),
            sa.Column('text_blocks', sa.JSON(), nullable=True),
            sa.Column('dominant_colors', sa.JSON(), nullable=True),
            sa.Column('logo_matches', sa.JSON(), nullable=True),
            sa.Column('layout_metrics', sa.JSON(), nullable=True),
            sa.Column('contrast_findings', sa.JSON(), nullable=True),
            sa.Column('analyzer_versions', sa.JSON(), nullable=True),
            sa.Column('unreadable', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('created_by_id', sa.String(), nullable=False, server_default=''),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('completed_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_asset_analysis_workspace', 'asset_analysis', ['workspace'])
        op.create_index('ix_asset_analysis_asset_id', 'asset_analysis', ['asset_id'])
        op.create_index('ix_asset_analysis_submission_id', 'asset_analysis', ['submission_id'])
        op.create_index('ix_asset_analysis_status', 'asset_analysis', ['status'])

    # ---- A2 Evidence Intelligence ---------------------------------------
    if not _has_table('passage_embeddings'):
        op.create_table(
            'passage_embeddings',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True),
            sa.Column('passage_id', sa.String(), nullable=False),
            sa.Column('model_name', sa.String(), nullable=False, server_default=''),
            sa.Column('dim', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('vector', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['passage_id'], ['guideline_passages.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('passage_id', 'model_name', name='uq_passage_model'),
        )
        op.create_index('ix_passage_embeddings_workspace', 'passage_embeddings', ['workspace'])
        op.create_index('ix_passage_embeddings_passage_id', 'passage_embeddings', ['passage_id'])

    if not _has_table('ai_findings'):
        op.create_table(
            'ai_findings',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True),
            sa.Column('submission_id', sa.String(), nullable=False, server_default=''),
            sa.Column('submission_version_id', sa.String(), nullable=True),
            sa.Column('rule_code', sa.String(), nullable=True),
            sa.Column('rule_title', sa.String(), nullable=False, server_default=''),
            sa.Column('passage_id', sa.String(), nullable=True),
            sa.Column('source_type', sa.String(), nullable=False, server_default='ai_suggestion'),
            sa.Column('confidence', sa.Float(), nullable=False, server_default='0'),
            sa.Column('similarity', sa.Float(), nullable=False, server_default='0'),
            sa.Column('rationale', sa.Text(), nullable=False, server_default=''),
            sa.Column('minimal_edit', sa.JSON(), nullable=True),
            sa.Column('quote', sa.Text(), nullable=False, server_default=''),
            sa.Column('citation_verified', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('rejected_reason', sa.Text(), nullable=True),
            sa.Column('model', sa.String(), nullable=False, server_default=''),
            sa.Column('prompt_version', sa.String(), nullable=False, server_default=''),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['submission_version_id'], ['content_versions.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_ai_findings_workspace', 'ai_findings', ['workspace'])
        op.create_index('ix_ai_findings_submission_id', 'ai_findings', ['submission_id'])
        op.create_index('ix_ai_findings_submission_version_id', 'ai_findings', ['submission_version_id'])
        op.create_index('ix_ai_findings_source_type', 'ai_findings', ['source_type'])

    if not _has_table('ai_call_log'):
        op.create_table(
            'ai_call_log',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True),
            sa.Column('purpose', sa.String(), nullable=False, server_default=''),
            sa.Column('model', sa.String(), nullable=False, server_default=''),
            sa.Column('prompt_version', sa.String(), nullable=False, server_default=''),
            sa.Column('latency_ms', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('tokens_in', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('tokens_out', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('status', sa.String(), nullable=False, server_default='success'),
            sa.Column('error', sa.Text(), nullable=True),
            sa.Column('citations_verified', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('citations_rejected', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('redaction_count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_ai_call_log_workspace', 'ai_call_log', ['workspace'])
        op.create_index('ix_ai_call_log_purpose', 'ai_call_log', ['purpose'])
        op.create_index('ix_ai_call_log_status', 'ai_call_log', ['status'])

    # ---- A3 Sentinel ----------------------------------------------------
    if not _has_table('publications'):
        op.create_table(
            'publications',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True),
            sa.Column('submission_id', sa.String(), nullable=False, server_default=''),
            sa.Column('submission_version_id', sa.String(), nullable=True),
            sa.Column('channel', sa.String(), nullable=False, server_default=''),
            sa.Column('published_at', sa.DateTime(), nullable=False),
            sa.Column('published_by', sa.String(), nullable=False, server_default=''),
            sa.Column('status', sa.String(), nullable=False, server_default='published'),
            sa.ForeignKeyConstraint(['submission_version_id'], ['content_versions.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_publications_workspace', 'publications', ['workspace'])
        op.create_index('ix_publications_submission_id', 'publications', ['submission_id'])
        op.create_index('ix_publications_submission_version_id', 'publications', ['submission_version_id'])
        op.create_index('ix_publications_status', 'publications', ['status'])

    if not _has_table('reassessment_tasks'):
        op.create_table(
            'reassessment_tasks',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True),
            sa.Column('submission_id', sa.String(), nullable=False, server_default=''),
            sa.Column('submission_version_id', sa.String(), nullable=True),
            sa.Column('trigger_type', sa.String(), nullable=False, server_default=''),
            sa.Column('trigger_ref', sa.String(), nullable=False, server_default=''),
            sa.Column('reason', sa.Text(), nullable=False, server_default=''),
            sa.Column('affected_rule_codes', sa.JSON(), nullable=True),
            sa.Column('assignee_id', sa.String(), nullable=True),
            sa.Column('status', sa.String(), nullable=False, server_default='open'),
            sa.Column('due_at', sa.DateTime(), nullable=True),
            sa.Column('resolution', sa.String(), nullable=True),
            sa.Column('resolution_note', sa.Text(), nullable=False, server_default=''),
            sa.Column('resolved_by_id', sa.String(), nullable=True),
            sa.Column('resolved_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['submission_version_id'], ['content_versions.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('submission_version_id', 'trigger_type', 'trigger_ref', name='uq_task_version_trigger'),
        )
        op.create_index('ix_reassessment_tasks_workspace', 'reassessment_tasks', ['workspace'])
        op.create_index('ix_reassessment_tasks_submission_id', 'reassessment_tasks', ['submission_id'])
        op.create_index('ix_reassessment_tasks_submission_version_id', 'reassessment_tasks', ['submission_version_id'])
        op.create_index('ix_reassessment_tasks_trigger_type', 'reassessment_tasks', ['trigger_type'])
        op.create_index('ix_reassessment_tasks_status', 'reassessment_tasks', ['status'])

    if not _has_table('notifications'):
        op.create_table(
            'notifications',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('workspace', sa.String(), server_default='PureGlow', nullable=True),
            sa.Column('user_id', sa.String(), nullable=False, server_default=''),
            sa.Column('type', sa.String(), nullable=False, server_default='system'),
            sa.Column('title', sa.String(), nullable=False, server_default=''),
            sa.Column('payload', sa.JSON(), nullable=True),
            sa.Column('read_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_notifications_workspace', 'notifications', ['workspace'])
        op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])


def downgrade() -> None:
    for table in (
        'notifications',
        'reassessment_tasks',
        'publications',
        'ai_call_log',
        'ai_findings',
        'passage_embeddings',
        'asset_analysis',
    ):
        if _has_table(table):
            op.drop_table(table)
