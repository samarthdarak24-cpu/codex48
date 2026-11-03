"""SQLAlchemy models for Precedent.

Compliant with PRECEDENT_MASTER_BACKEND_PROMPT.md §5 and DESIGN.md §6.
Maintains full backward compatibility with Round 2 models and src/lib/types.ts.
All tables have UUID string primary keys and UTC timestamps.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional

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

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def gen_uuid() -> str:
    return str(uuid.uuid4())


# ===========================================================================
# 1. Identity & Tenancy
# ===========================================================================

class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    timezone: Mapped[str] = mapped_column(String, default="Asia/Kolkata")
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    role: Mapped[str] = mapped_column(String, nullable=False)  # 'creator' | 'manager'
    title: Mapped[str] = mapped_column(String, default="")
    initials: Mapped[str] = mapped_column(String, default="")
    avatar_tone: Mapped[str] = mapped_column(String, default="green")
    avatar_asset_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    department: Mapped[str] = mapped_column(String, default="Creative")
    phone: Mapped[str] = mapped_column(String, default="")
    timezone: Mapped[str] = mapped_column(String, default="Asia/Kolkata")
    workspace: Mapped[str] = mapped_column(String, default="PureGlow")
    workspace_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    workspace_status: Mapped[str] = mapped_column(String, default="active")
    status: Mapped[str] = mapped_column(String, default="active")
    password_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace_id: Mapped[str] = mapped_column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String, default="creator")
    status: Mapped[str] = mapped_column(String, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    user_agent: Mapped[str] = mapped_column(String, default="")
    ip: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    notification_prefs: Mapped[dict] = mapped_column(JSON, default=dict)
    ui_prefs: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


# ===========================================================================
# 2. Brand Context (Campaigns, Brand Kits, Claims)
# ===========================================================================

class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace_id: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    objective: Mapped[str] = mapped_column(String, default="")
    channel: Mapped[str] = mapped_column(String, default="Instagram")
    product: Mapped[str] = mapped_column(String, default="General")
    audience: Mapped[str] = mapped_column(String, default="Global")
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String, default="active")  # active | paused | archived
    thumbnail_asset_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class BrandKit(Base):
    __tablename__ = "brand_kits"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace_id: Mapped[str] = mapped_column(String, default="PureGlow", unique=True, index=True)
    palette: Mapped[list] = mapped_column(JSON, default=list)  # [{hex, name, role}]
    color_tolerance_dE: Mapped[float] = mapped_column(Float, default=10.0)
    approved_phrases: Mapped[list] = mapped_column(JSON, default=list)
    required_disclaimers: Mapped[list] = mapped_column(JSON, default=list)
    tone_notes: Mapped[str] = mapped_column(Text, default="")
    updated_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    logos: Mapped[List["BrandLogo"]] = relationship("BrandLogo", backref="brand_kit", cascade="all, delete-orphan")


class BrandLogo(Base):
    __tablename__ = "brand_logos"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    brand_kit_id: Mapped[str] = mapped_column(String, ForeignKey("brand_kits.id", ondelete="CASCADE"), index=True)
    asset_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    min_width_ratio: Mapped[float] = mapped_column(Float, default=0.15)
    min_clear_space_ratio: Mapped[float] = mapped_column(Float, default=0.20)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ApprovedClaim(Base):
    __tablename__ = "approved_claims"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    code: Mapped[str] = mapped_column(String, default="")
    text: Mapped[str] = mapped_column(Text, nullable=False)
    product: Mapped[str] = mapped_column(String, default="")
    source: Mapped[str] = mapped_column(String, default="")
    scope: Mapped[str] = mapped_column(String, default="")
    evidence_ref: Mapped[str] = mapped_column(String, default="")
    valid_from: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    owner_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="approved")  # approved | withdrawn | expired | needs_review
    approved_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    approved_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


# ===========================================================================
# 3. Content & Versioning
# ===========================================================================

class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    creator_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)
    campaign_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    code: Mapped[str] = mapped_column(String, default="")
    title: Mapped[str] = mapped_column(String, nullable=False)
    excerpt: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[str] = mapped_column(String, default="Text")
    channel: Mapped[str] = mapped_column(String, default="Instagram")
    brand: Mapped[str] = mapped_column(String, default="PureGlow")
    status: Mapped[str] = mapped_column(String, default="Pending")  # draft | in_review | changes_requested | approved | rejected | published | withdrawn
    current_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    row_version: Mapped[int] = mapped_column(Integer, default=1)
    version: Mapped[int] = mapped_column(Integer, default=1)
    issue_count: Mapped[int] = mapped_column(Integer, default=0)
    priority: Mapped[str] = mapped_column(String, default="Medium")
    thumb_kind: Mapped[str] = mapped_column(String, default="art")
    thumb_palette: Mapped[str] = mapped_column(String, default="lime")
    thumb_glyph: Mapped[str] = mapped_column(String, default="leaf")

    # Visual facts cached
    asset_background_colour: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    asset_clear_space_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    asset_typeface: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    asset_aspect_ratio: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    asset_unreadable: Mapped[bool] = mapped_column(Boolean, default=False)
    asset_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    asset_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    asset_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    asset_source: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    asset_attribution: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Stored compliance score (spec Part 4). Computed by services/scoring.py and
    # only displayed by the UI; `score_formula_version` lets a stale score be
    # identified instead of silently mixed with a new formula.
    compliance_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    score_formula_version: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    score_computed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    versions: Mapped[List["ContentVersion"]] = relationship(
        "ContentVersion", backref="submission", cascade="all, delete-orphan", order_by="ContentVersion.version"
    )
    detailed_versions: Mapped[List["SubmissionVersion"]] = relationship(
        "SubmissionVersion", backref="submission_parent", cascade="all, delete-orphan", order_by="SubmissionVersion.version_number"
    )
    findings: Mapped[List["Finding"]] = relationship("Finding", backref="submission", cascade="all, delete-orphan")
    comments: Mapped[List["Comment"]] = relationship("Comment", backref="submission", cascade="all, delete-orphan")
    decisions: Mapped[List["ReviewDecision"]] = relationship("ReviewDecision", backref="submission", cascade="all, delete-orphan")


class ContentVersion(Base):
    """Legacy version table kept 100% intact for backward compatibility."""
    __tablename__ = "content_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    author_id: Mapped[str] = mapped_column(String, default="")
    note: Mapped[str] = mapped_column(String, default="")


class SubmissionVersion(Base):
    """Enhanced immutable version model per PRECEDENT_MASTER_BACKEND_PROMPT.md §5."""
    __tablename__ = "submission_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    copy: Mapped[str] = mapped_column(Text, default="")
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    asset_ids: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String, default="draft")  # draft | submitted | changes_requested | approved | rejected | superseded
    frozen_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    content_hash: Mapped[str] = mapped_column(String, default="")
    review_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)  # {rule_version_ids, guideline_version_ids, exception_ids, findings_hash}
    created_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    __table_args__ = (UniqueConstraint("submission_id", "version_number", name="uq_submission_version_number"),)


# ===========================================================================
# 4. Assets & Media
# ===========================================================================

class BrandAsset(Base):
    __tablename__ = "brand_assets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    owner_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    filename: Mapped[str] = mapped_column(String, default="")
    brand: Mapped[str] = mapped_column(String, default="PureGlow")
    category: Mapped[str] = mapped_column(String, default="Product Image")
    kind: Mapped[str] = mapped_column(String, default="image")  # image | video | document | logo | product | template
    storage_key: Mapped[str] = mapped_column(String, default="")
    file_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    mime_type: Mapped[str] = mapped_column(String, default="image/png")
    size: Mapped[int] = mapped_column(Integer, default=0)
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    checksum: Mapped[str] = mapped_column(String, default="")
    url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    source: Mapped[str] = mapped_column(String, default="upload")
    source_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending | approved | flagged | archived
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    notes: Mapped[str] = mapped_column(Text, default="")
    uploaded_by_id: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class AssetVersion(Base):
    __tablename__ = "asset_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    asset_id: Mapped[str] = mapped_column(ForeignKey("brand_assets.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    storage_key: Mapped[str] = mapped_column(String, nullable=False)
    checksum: Mapped[str] = mapped_column(String, default="")
    created_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace_id: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    __table_args__ = (UniqueConstraint("workspace_id", "name", name="uq_workspace_tag"),)


class AssetTag(Base):
    __tablename__ = "asset_tags"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    asset_id: Mapped[str] = mapped_column(ForeignKey("brand_assets.id", ondelete="CASCADE"), index=True)
    tag_id: Mapped[str] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), index=True)


class AssetLink(Base):
    __tablename__ = "asset_links"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    asset_id: Mapped[str] = mapped_column(ForeignKey("brand_assets.id", ondelete="CASCADE"), index=True)
    resource_type: Mapped[str] = mapped_column(String, nullable=False)  # campaign | guideline | submission
    resource_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AssetAnalysis(Base):
    __tablename__ = "asset_analysis"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    asset_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    asset_version: Mapped[int] = mapped_column(Integer, default=1)
    submission_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    file_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    status: Mapped[str] = mapped_column(String, default="pending", index=True)  # pending | running | complete | completed | failed
    stage: Mapped[str] = mapped_column(String, default="queued")
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    width: Mapped[int] = mapped_column(Integer, default=0)
    height: Mapped[int] = mapped_column(Integer, default=0)

    ocr_text: Mapped[str] = mapped_column(Text, default="")
    ocr_blocks: Mapped[list] = mapped_column(JSON, default=list)
    text_blocks: Mapped[list] = mapped_column(JSON, default=list)

    dominant_colors: Mapped[list] = mapped_column(JSON, default=list)
    colors: Mapped[list] = mapped_column(JSON, default=list)

    logo_detections: Mapped[list] = mapped_column(JSON, default=list)
    logo_matches: Mapped[list] = mapped_column(JSON, default=list)

    layout_facts: Mapped[dict] = mapped_column(JSON, default=dict)
    layout_metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    layout: Mapped[dict] = mapped_column(JSON, default=dict)

    contrast_samples: Mapped[list] = mapped_column(JSON, default=list)
    contrast_findings: Mapped[list] = mapped_column(JSON, default=list)
    contrast: Mapped[list] = mapped_column(JSON, default=list)

    analyzer_versions: Mapped[dict] = mapped_column(JSON, default=dict)
    unreadable: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[str] = mapped_column(String, default="")

    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# ===========================================================================
# 5. Guidelines & Evidence
# ===========================================================================

class GuidelineDoc(Base):
    __tablename__ = "guideline_docs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String, default="Visual Identity")
    version: Mapped[str] = mapped_column(String, default="1.0")
    status: Mapped[str] = mapped_column(String, default="active")  # draft | active | archived | processing
    current_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    owner_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)
    file_type: Mapped[str] = mapped_column(String, default="PDF")
    file_size: Mapped[str] = mapped_column(String, default="")
    pages: Mapped[int] = mapped_column(Integer, default=0)
    extracted_passages: Mapped[int] = mapped_column(Integer, default=0)
    visible_to_creators: Mapped[bool] = mapped_column(Boolean, default=True)
    file_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    passages: Mapped[List["GuidelinePassage"]] = relationship(
        "GuidelinePassage", backref="doc", cascade="all, delete-orphan"
    )
    versions: Mapped[List["GuidelineVersion"]] = relationship(
        "GuidelineVersion", backref="guideline_parent", cascade="all, delete-orphan"
    )


class GuidelineVersion(Base):
    __tablename__ = "guideline_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    guideline_id: Mapped[str] = mapped_column(ForeignKey("guideline_docs.id", ondelete="CASCADE"), index=True)
    version: Mapped[str] = mapped_column(String, default="1.0")
    storage_key: Mapped[str] = mapped_column(String, default="")
    filename: Mapped[str] = mapped_column(String, default="")
    effective_from: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    effective_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String, default="active")  # processing | extraction_failed | draft | active | superseded | archived
    extraction_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    __table_args__ = (UniqueConstraint("guideline_id", "version", name="uq_guideline_version"),)


class GuidelinePassage(Base):
    __tablename__ = "guideline_passages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    doc_id: Mapped[str] = mapped_column(ForeignKey("guideline_docs.id", ondelete="CASCADE"), nullable=False, index=True)
    guideline_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    ordinal: Mapped[int] = mapped_column(Integer, default=0)
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    paragraph_number: Mapped[int] = mapped_column(Integer, default=1)
    heading: Mapped[str] = mapped_column(String, default="")
    section: Mapped[str] = mapped_column(String, default="")
    passage_text: Mapped[str] = mapped_column(Text, nullable=False)
    text_hash: Mapped[str] = mapped_column(String, default="")
    bbox: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    ocr_used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class PassageEmbedding(Base):
    __tablename__ = "passage_embeddings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    passage_id: Mapped[str] = mapped_column(ForeignKey("guideline_passages.id", ondelete="CASCADE"), index=True)
    model_name: Mapped[str] = mapped_column(String, default="bge-m3")
    dim: Mapped[int] = mapped_column(Integer, default=1024)
    vector: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class GuidelineRelation(Base):
    __tablename__ = "guideline_relations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    a_id: Mapped[str] = mapped_column(String, index=True)
    b_id: Mapped[str] = mapped_column(String, index=True)
    kind: Mapped[str] = mapped_column(String, default="supersedes")  # supersedes | references | complements


# ===========================================================================
# 6. Rules & Engine
# ===========================================================================

class Rule(Base):
    __tablename__ = "rules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # Codes are unique *within a workspace*, not globally: two brands may each
    # run their own "CL-03" without colliding, which is what a multi-tenant
    # rulebook requires.
    code: Mapped[str] = mapped_column(String, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String, default="Brand")
    subject: Mapped[str] = mapped_column(String, default="")
    condition: Mapped[str] = mapped_column(Text, default="")
    action: Mapped[str] = mapped_column(Text, default="")
    scope: Mapped[str] = mapped_column(String, default="")
    priority: Mapped[str] = mapped_column(String, default="Medium")
    severity: Mapped[str] = mapped_column(String, default="medium")  # low | medium | high | critical
    priority_int: Mapped[int] = mapped_column(Integer, default=100)
    status: Mapped[str] = mapped_column(String, default="active")  # draft | active | inactive | archived | needs_confirmation
    current_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    owner_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    source_doc_id: Mapped[Optional[str]] = mapped_column(ForeignKey("guideline_docs.id"), nullable=True)
    source_version: Mapped[str] = mapped_column(String, default="")
    source_passage: Mapped[str] = mapped_column(Text, default="")
    source_page: Mapped[int] = mapped_column(Integer, default=0)
    effective_from: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    effective_to: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    overrides_this_quarter: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    versions: Mapped[List["RuleVersion"]] = relationship("RuleVersion", backref="rule_parent", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("workspace", "code", name="uq_rule_workspace_code"),
    )


class RuleVersion(Base):
    __tablename__ = "rule_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    rule_id: Mapped[str] = mapped_column(ForeignKey("rules.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    condition_type: Mapped[str] = mapped_column(String, default="forbidden_phrase")
    condition_config: Mapped[dict] = mapped_column(JSON, default=dict)
    scope: Mapped[dict] = mapped_column(JSON, default=dict)  # {channels[], campaign_ids[], content_types[], markets[]}
    effective_from: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    effective_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    source_passage_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    guideline_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="active")  # draft | active | inactive | archived
    created_by: Mapped[str] = mapped_column(String, default="")
    activated_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    activated_from_simulation_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class RuleConflict(Base):
    __tablename__ = "rule_conflicts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace_id: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    rule_a_id: Mapped[str] = mapped_column(String, default="")
    rule_b_id: Mapped[str] = mapped_column(String, default="")
    rule_a_code: Mapped[str] = mapped_column(String, default="")
    rule_b_code: Mapped[str] = mapped_column(String, default="")
    rule_a_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    rule_b_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    conflict_type: Mapped[str] = mapped_column(String, default="contradictory_config")  # overlapping_scope | contradictory_config | date_overlap | palette_clash
    reason: Mapped[str] = mapped_column(Text, default="")
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String, default="open")  # open | resolved | dismissed
    resolution: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class RuleTestCase(Base):
    __tablename__ = "rule_test_cases"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    rule_id: Mapped[str] = mapped_column(ForeignKey("rules.id", ondelete="CASCADE"), index=True)
    input_facts: Mapped[dict] = mapped_column(JSON, default=dict)
    expected_outcome: Mapped[str] = mapped_column(String, default="compliant")  # violation | compliant | unknown
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# ===========================================================================
# 7. Findings, Review & Decisions
# ===========================================================================

class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    submission_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    engine_version: Mapped[str] = mapped_column(String, default="1.0.0")
    rule_set_hash: Mapped[str] = mapped_column(String, default="")
    triggered_by: Mapped[str] = mapped_column(String, default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    submission_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    rule_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    rule_code: Mapped[str] = mapped_column(String, default="")
    rule_title: Mapped[str] = mapped_column(String, default="")
    source: Mapped[str] = mapped_column(String, default="deterministic")  # deterministic | visual | ai
    outcome: Mapped[str] = mapped_column(String, default="violation")  # violation | compliant | unknown
    type: Mapped[str] = mapped_column(String, default="Claims")
    severity: Mapped[str] = mapped_column(String, default="Medium")
    explanation: Mapped[str] = mapped_column(Text, default="")
    passage_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    source_doc_id: Mapped[str] = mapped_column(String, default="")
    source_doc_name: Mapped[str] = mapped_column(String, default="")
    source_version: Mapped[str] = mapped_column(String, default="")
    source_page: Mapped[int] = mapped_column(Integer, default=0)
    source_passage: Mapped[str] = mapped_column(Text, default="")
    evidence_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    region: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # [x1, y1, x2, y2]
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    outcome: Mapped[str] = mapped_column(String, default='violation', server_default='violation')
    waived_by_exception_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    evaluation_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    facts_used: Mapped[dict] = mapped_column(JSON, default=dict)
    suggested_fix: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String, default="open")  # open | resolved | accepted_exception


class AiFinding(Base):
    __tablename__ = "ai_findings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    submission_id: Mapped[str] = mapped_column(String, default="", index=True)
    submission_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    rule_code: Mapped[str] = mapped_column(String, default="")
    rule_title: Mapped[str] = mapped_column(String, default="")
    source_type: Mapped[str] = mapped_column(String, default="ai_suggestion")
    similarity: Mapped[float] = mapped_column(Float, default=0.0)
    passage_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    quote: Mapped[str] = mapped_column(Text, default="")
    rationale: Mapped[str] = mapped_column(Text, default="")
    minimal_edit: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.85)
    citation_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    rejected_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    model: Mapped[str] = mapped_column(String, default="gpt-4o-mini")
    prompt_version: Mapped[str] = mapped_column(String, default="1.0")
    needs_human_review: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class FixSuggestion(Base):
    __tablename__ = "fix_suggestions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    finding_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    ai_finding_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    original_text: Mapped[str] = mapped_column(Text, default="")
    suggested_text: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="proposed")  # proposed | applied | dismissed
    applied_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    model: Mapped[str] = mapped_column(String, default="heuristic")
    prompt_version: Mapped[str] = mapped_column(String, default="1.0")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ReviewDecision(Base):
    __tablename__ = "review_decisions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    submission_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String, default="Approved")  # Approved | Changes Requested | Declined
    decision: Mapped[str] = mapped_column(String, default="approve")  # approve | request_changes | reject
    version: Mapped[int] = mapped_column(Integer, default=1)
    reviewer_id: Mapped[str] = mapped_column(String, default="")
    manager_id: Mapped[str] = mapped_column(String, default="")
    note: Mapped[str] = mapped_column(Text, default="")
    comment: Mapped[str] = mapped_column(Text, default="")
    snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


ApprovalDecision = ReviewDecision



class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    resource_type: Mapped[str] = mapped_column(String, default="submission")  # submission | version | exception_request | task | asset
    resource_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    author_id: Mapped[str] = mapped_column(String, default="")
    body: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ReviewAssignment(Base):
    __tablename__ = "review_assignments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    reviewer_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    assigned_by: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="pending")  # pending | completed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# ===========================================================================
# 8. Exceptions
# ===========================================================================

class ExceptionRequest(Base):
    __tablename__ = "exceptions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    code: Mapped[str] = mapped_column(String, default="")
    content_id: Mapped[str] = mapped_column(String, default="")
    submission_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    campaign_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    content_title: Mapped[str] = mapped_column(String, default="")
    content_meta: Mapped[str] = mapped_column(String, default="")
    brand: Mapped[str] = mapped_column(String, default="PureGlow")
    rule_code: Mapped[str] = mapped_column(String, default="")
    rule_title: Mapped[str] = mapped_column(String, default="")
    reason: Mapped[str] = mapped_column(Text, default="")
    scope: Mapped[str] = mapped_column(String, default="")
    scope_json: Mapped[dict] = mapped_column("scope_details", JSON, default=dict)
    conditions: Mapped[str] = mapped_column(Text, default="")
    conditions_json: Mapped[list] = mapped_column("conditions_details", JSON, default=list)
    requested_by_id: Mapped[str] = mapped_column(String, default="")
    requester_id: Mapped[str] = mapped_column(String, default="")
    decided_by_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    decided_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    decision_note: Mapped[str] = mapped_column(Text, default="")
    effective_from: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    requested_from: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    requested_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String, default="Pending")  # Pending | Approved | Rejected | Revoked | Cancelled
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    revoked_by_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    revoke_reason: Mapped[Optional[str]] = mapped_column(Text, default="")
    thumb_kind: Mapped[str] = mapped_column(String, default="art")
    thumb_palette: Mapped[str] = mapped_column(String, default="lime")
    thumb_glyph: Mapped[str] = mapped_column(String, default="leaf")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    history: Mapped[List["ExceptionRulingHistory"]] = relationship(
        "ExceptionRulingHistory", backref="exception_parent", cascade="all, delete-orphan", order_by="ExceptionRulingHistory.at"
    )


class ExceptionModel(Base):
    """The active approved exception entity."""
    __tablename__ = "exceptions_active"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    request_id: Mapped[str] = mapped_column(ForeignKey("exceptions.id", ondelete="CASCADE"), unique=True)
    rule_code: Mapped[str] = mapped_column(String, nullable=False, index=True)
    scope: Mapped[dict] = mapped_column(JSON, default=dict)
    conditions: Mapped[list] = mapped_column(JSON, default=list)
    effective_from: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    effective_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approved_by: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="active")  # active | expired | revoked
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    revoked_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    revoke_reason: Mapped[Optional[str]] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ExceptionRulingHistory(Base):
    __tablename__ = "exception_ruling_history"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    exception_id: Mapped[str] = mapped_column(ForeignKey("exceptions.id", ondelete="CASCADE"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String, nullable=False)  # Approved | Rejected | Revoked | Requested | Cancelled
    actor_id: Mapped[str] = mapped_column(String, default="")
    actor_name: Mapped[str] = mapped_column(String, default="")
    actor_role: Mapped[str] = mapped_column(String, default="")
    reason_or_conditions: Mapped[str] = mapped_column(Text, default="")
    at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# ===========================================================================
# 9. Lifecycle, Sentinel & Monitoring
# ===========================================================================

class Publication(Base):
    __tablename__ = "publications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    submission_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    channel: Mapped[str] = mapped_column(String, default="Instagram")
    published_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    published_by: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="published")  # published | unpublished
    external_ref: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ReassessmentTask(Base):
    __tablename__ = "reassessment_tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    workspace_id: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    submission_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    trigger_type: Mapped[str] = mapped_column(String, nullable=False)  # rule_activated | rule_edited | rule_deactivated | exception_expired | exception_revoked | guideline_replaced | claim_changed | manual_scan
    trigger_ref: Mapped[str] = mapped_column(String, default="")
    trigger_hash: Mapped[str] = mapped_column(String, default="")
    reason: Mapped[str] = mapped_column(Text, default="")
    affected_rule_codes: Mapped[list] = mapped_column(JSON, default=list)
    assignee_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    priority: Mapped[str] = mapped_column(String, default="High")
    status: Mapped[str] = mapped_column(String, default="open")  # open | in_progress | resolution_submitted | reassessing | awaiting_verification | resolved | closed
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    previous_outcome: Mapped[str] = mapped_column(String, default="compliant")
    new_outcome: Mapped[str] = mapped_column(String, default="violation")
    recommended_steps: Mapped[list] = mapped_column(JSON, default=list)
    resolution: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    resolution_note: Mapped[str] = mapped_column(Text, default="")
    resolved_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    resolved_by_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    __table_args__ = (UniqueConstraint("submission_version_id", "trigger_type", "trigger_ref", name="uq_reassessment_trigger"),)


class TaskEvent(Base):
    __tablename__ = "task_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    task_id: Mapped[str] = mapped_column(ForeignKey("reassessment_tasks.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String, default="created")  # created | assigned | resolution_submitted | verified | closed | comment
    actor_id: Mapped[str] = mapped_column(String, default="")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ScanRun(Base):
    __tablename__ = "scan_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace_id: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    trigger_type: Mapped[str] = mapped_column(String, default="manual_scan")
    trigger_ref: Mapped[str] = mapped_column(String, default="")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String, default="running")  # running | completed | failed
    stats: Mapped[dict] = mapped_column(JSON, default=dict)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String, default="system")  # submission_approved | changes_requested | submission_rejected | comment_added | exception_decided | exception_expiring | exception_revoked | guideline_activated | rule_activated | sentinel_task_created | sentinel_task_verified | system
    title: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(Text, default="")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String, nullable=True, default=None)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    __table_args__ = (UniqueConstraint("user_id", "idempotency_key", name="uq_user_notification_idempotency"),)


# ===========================================================================
# 10. Simulation
# ===========================================================================

class Simulation(Base):
    __tablename__ = "simulations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    manager_id: Mapped[str] = mapped_column(String, default="")
    name: Mapped[str] = mapped_column(String, default="")
    rule_id: Mapped[str] = mapped_column(String, default="")
    rule_code: Mapped[str] = mapped_column(String, default="")
    base_rule_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    change_type: Mapped[str] = mapped_column(String, default="")
    current_value: Mapped[str] = mapped_column(String, default="")
    new_value: Mapped[str] = mapped_column(String, default="")
    proposed_config: Mapped[dict] = mapped_column(JSON, default=dict)
    sample_filter: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String, default="Completed")
    summary: Mapped[dict] = mapped_column(JSON, default=dict)
    snapshot_hash: Mapped[str] = mapped_column(String, default="")
    saved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[str] = mapped_column(String, default="")
    items: Mapped[list] = mapped_column(JSON, default=list)
    insight: Mapped[list] = mapped_column(JSON, default=list)
    totals: Mapped[dict] = mapped_column(JSON, default=dict)
    breakdown: Mapped[Optional[dict]] = mapped_column(JSON, default=dict, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class SimulationItem(Base):
    __tablename__ = "simulation_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    simulation_id: Mapped[str] = mapped_column(ForeignKey("simulations.id", ondelete="CASCADE"), index=True)
    submission_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    previous_outcome: Mapped[str] = mapped_column(String, default="compliant")
    proposed_outcome: Mapped[str] = mapped_column(String, default="violation")
    impact_reason: Mapped[str] = mapped_column(Text, default="")
    campaign_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    channel: Mapped[str] = mapped_column(String, default="")


class ProposedRule(Base):
    __tablename__ = "proposed_rules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    simulation_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    target_rule_id: Mapped[str] = mapped_column(String, nullable=False)
    target_rule_code: Mapped[str] = mapped_column(String, nullable=False)
    change_type: Mapped[str] = mapped_column(String, nullable=False)
    current_value: Mapped[str] = mapped_column(String, default="")
    proposed_value: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="simulated")
    created_by_id: Mapped[str] = mapped_column(String, default="")
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    activated_by_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# ===========================================================================
# 11. AI Observability & Agents
# ===========================================================================

class AiCallLog(Base):
    __tablename__ = "ai_call_log"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    purpose: Mapped[str] = mapped_column(String, default="review")
    provider: Mapped[str] = mapped_column(String, default="openai")
    model: Mapped[str] = mapped_column(String, default="gpt-4o-mini")
    prompt_version: Mapped[str] = mapped_column(String, default="1.0")
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="success")  # success | error | fallback
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    citations_verified: Mapped[int] = mapped_column(Integer, default=0)
    citations_rejected: Mapped[int] = mapped_column(Integer, default=0)
    redaction_count: Mapped[int] = mapped_column(Integer, default=0)
    citations_verified: Mapped[int] = mapped_column(Integer, default=0)
    citations_rejected: Mapped[int] = mapped_column(Integer, default=0)
    redaction_count: Mapped[int] = mapped_column(Integer, default=0)
    redacted_pii_count: Mapped[int] = mapped_column(Integer, default=0)
    request_id: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AgentRun(Base):
    __tablename__ = "agent_runs"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    submission_version_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String, default="running")  # running | succeeded | failed
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    budget: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AgentToolCall(Base):
    __tablename__ = "agent_tool_calls"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    run_id: Mapped[str] = mapped_column(ForeignKey("agent_runs.id", ondelete="CASCADE"), index=True)
    agent: Mapped[str] = mapped_column(String, nullable=False)
    tool: Mapped[str] = mapped_column(String, nullable=False)
    permission_class: Mapped[str] = mapped_column(String, default="read")  # read | draft
    input_summary: Mapped[str] = mapped_column(Text, default="")
    output_summary: Mapped[str] = mapped_column(Text, default="")
    ms: Mapped[int] = mapped_column(Integer, default=0)
    result: Mapped[str] = mapped_column(String, default="success")  # success | denied | failed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# ===========================================================================
# 12. Audit & Background Jobs
# ===========================================================================

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", index=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    actor_id: Mapped[str] = mapped_column(String, default="")
    user_id: Mapped[str] = mapped_column(String, default="")
    actor_type: Mapped[str] = mapped_column(String, default="human")  # human | system | ai
    action: Mapped[str] = mapped_column(String, default="Login")
    resource_type: Mapped[str] = mapped_column(String, default="auth")
    entity_kind: Mapped[str] = mapped_column(String, default="auth")
    resource_id: Mapped[str] = mapped_column(String, default="")
    entity_id: Mapped[str] = mapped_column(String, default="")
    entity_title: Mapped[str] = mapped_column(String, default="")
    entity_meta: Mapped[str] = mapped_column(String, default="")
    brand: Mapped[str] = mapped_column(String, default="PureGlow")
    details: Mapped[str] = mapped_column(Text, default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    before: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    after: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String, default="Recorded")
    version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    thumb: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    request_id: Mapped[str] = mapped_column(String, default="")
    ip: Mapped[str] = mapped_column(String, default="")
    at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String, default="pending", index=True)  # pending | running | succeeded | failed | cancelled
    stage: Mapped[str] = mapped_column(String, default="queued")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    run_after: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    locked_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


# Second Batch Innovations (N10 Approved Snippets, N11 False-Positive Feedback)
# ---------------------------------------------------------------------------

class ApprovedSnippet(Base):
    """N10 Approved Snippets library: pre-vetted brand copy, claims, disclosures."""

    __tablename__ = "approved_snippets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String, default="Claim")  # Claim | Disclaimer | Promotion | Legal
    rule_codes: Mapped[list] = mapped_column(JSON, default=list)
    claim_id: Mapped[str | None] = mapped_column(String, nullable=True)
    valid_from: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # active | expired | retired
    status: Mapped[str] = mapped_column(String, default="active", index=True)
    created_by: Mapped[str] = mapped_column(String, default="David Kim")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class FindingFeedback(Base):
    """N11 False-Positive feedback loop: creator disputes or clarifications on findings."""

    __tablename__ = "finding_feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    finding_id: Mapped[str] = mapped_column(
        ForeignKey("findings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    submission_id: Mapped[str] = mapped_column(String, default="", index=True)
    rule_code: Mapped[str] = mapped_column(String, default="")
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    user_name: Mapped[str] = mapped_column(String, default="")
    # not_a_violation | rule_unclear | exception_applies | other
    reason: Mapped[str] = mapped_column(String, default="not_a_violation")
    notes: Mapped[str] = mapped_column(Text, default="")
    # submitted | under_review | converted_to_test | dismissed
    status: Mapped[str] = mapped_column(String, default="submitted")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# ---------------------------------------------------------------------------
# ProofPass — Approval Passport Stretch Innovation (ImageHash & SHA-256)
# ---------------------------------------------------------------------------

class ApprovalPassport(Base):
    """ProofPass approval passport: cryptographic SHA-256 + perceptual pHash certificate."""

    __tablename__ = "approval_passports"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    submission_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    version_id: Mapped[str] = mapped_column(String, nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    brand: Mapped[str] = mapped_column(String, default="PureGlow")
    title: Mapped[str] = mapped_column(String, default="")
    sha256: Mapped[str] = mapped_column(String, nullable=False)
    phash: Mapped[str] = mapped_column(String, default="")
    dhash: Mapped[str] = mapped_column(String, default="")
    token: Mapped[str] = mapped_column(Text, nullable=False)
    approved_by: Mapped[str] = mapped_column(String, default="")
    # active | revoked | expired
    status: Mapped[str] = mapped_column(String, default="active", index=True)
    revocation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


# ---------------------------------------------------------------------------
# Review Crew  Bounded Advisory Multi-Agent System (PydanticAI)
# ---------------------------------------------------------------------------

class AgentTraceRecord(Base):
    """Persisted audit trace of Review Crew bounded multi-agent executions."""

    __tablename__ = "agent_traces"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    submission_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    version_num: Mapped[int] = mapped_column(Integer, default=1)
    orchestrator_status: Mapped[str] = mapped_column(String, default="completed", index=True)
    steps_json: Mapped[str] = mapped_column(Text, default="[]")
    summary_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class RuleConflictReview(Base):
    """A manager's decision to mark a detected rule conflict as reviewed.

    Conflict detection itself is deterministic and recomputed on every read, so
    a review cannot silently delete a conflict. This row only records that a
    human acknowledged it, which is what lets the UI show a persistent
    'reviewed' state instead of a local-only toggle.
    """

    __tablename__ = "rule_conflict_reviews"
    __table_args__ = (
        UniqueConstraint("workspace", "rule_a_code", "rule_b_code", name="uq_conflict_review"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    rule_a_code: Mapped[str] = mapped_column(String, nullable=False)
    rule_b_code: Mapped[str] = mapped_column(String, nullable=False)
    resolution: Mapped[str] = mapped_column(String, default="reviewed")  # reviewed | dismissed
    note: Mapped[str] = mapped_column(Text, default="")
    reviewed_by_id: Mapped[str] = mapped_column(String, default="")
    reviewed_by_name: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

