"""SQLAlchemy models — 1:1 with src/lib/types.ts (the frontend contract).

Column names are snake_case; the API serializes to camelCase to match the
frontend types. Brand is stored as a plain string ('PureGlow' | 'WellnessLife'
| 'All brands') to match the union in types.ts.
"""
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    role: Mapped[str] = mapped_column(String, nullable=False)  # 'creator' | 'manager'
    title: Mapped[str] = mapped_column(String, default="")
    initials: Mapped[str] = mapped_column(String, default="")
    avatar_tone: Mapped[str] = mapped_column(String, default="green")
    workspace: Mapped[str] = mapped_column(String, default="PureGlow")
    workspace_status: Mapped[str] = mapped_column(String, default="active")
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)


class GuidelineDoc(Base):
    __tablename__ = "guideline_docs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String, default="Visual Identity")
    version: Mapped[str] = mapped_column(String, default="1.0")
    status: Mapped[str] = mapped_column(String, default="active")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    file_type: Mapped[str] = mapped_column(String, default="PDF")
    file_size: Mapped[str] = mapped_column(String, default="")
    pages: Mapped[int] = mapped_column(Integer, default=0)
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    extracted_passages: Mapped[int] = mapped_column(Integer, default=0)
    visible_to_creators: Mapped[bool] = mapped_column(Boolean, default=True)
    file_path: Mapped[str | None] = mapped_column(String, nullable=True)


class Rule(Base):
    __tablename__ = "rules"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    code: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="")
    subject: Mapped[str] = mapped_column(String, default="")
    condition: Mapped[str] = mapped_column(Text, default="")
    action: Mapped[str] = mapped_column(Text, default="")
    scope: Mapped[str] = mapped_column(String, default="")
    priority: Mapped[str] = mapped_column(String, default="Medium")
    status: Mapped[str] = mapped_column(String, default="active")
    source_doc_id: Mapped[str | None] = mapped_column(ForeignKey("guideline_docs.id"), nullable=True)
    source_version: Mapped[str] = mapped_column(String, default="")
    source_passage: Mapped[str] = mapped_column(Text, default="")
    source_page: Mapped[int] = mapped_column(Integer, default=0)
    effective_from: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    overrides_this_quarter: Mapped[int] = mapped_column(Integer, default=0)


class ApprovedClaim(Base):
    __tablename__ = "approved_claims"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    product: Mapped[str] = mapped_column(String, default="")
    source: Mapped[str] = mapped_column(String, default="")
    scope: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="approved")
    approved_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    approved_by: Mapped[str] = mapped_column(String, default="")


# ---------------------------------------------------------------------------
# Submission + nested collections
# ---------------------------------------------------------------------------

class ContentVersion(Base):
    __tablename__ = "content_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    submission_id: Mapped[str] = mapped_column(
        ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    author_id: Mapped[str] = mapped_column(String, default="")
    note: Mapped[str] = mapped_column(String, default="")


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    submission_id: Mapped[str] = mapped_column(
        ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False
    )
    rule_code: Mapped[str] = mapped_column(String, default="")
    rule_title: Mapped[str] = mapped_column(String, default="")
    type: Mapped[str] = mapped_column(String, default="Claims")
    severity: Mapped[str] = mapped_column(String, default="Medium")
    explanation: Mapped[str] = mapped_column(Text, default="")
    source_doc_id: Mapped[str] = mapped_column(String, default="")
    source_doc_name: Mapped[str] = mapped_column(String, default="")
    source_version: Mapped[str] = mapped_column(String, default="")
    source_page: Mapped[int] = mapped_column(Integer, default=0)
    source_passage: Mapped[str] = mapped_column(Text, default="")
    evidence_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    suggested_fix: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String, default="open")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    submission_id: Mapped[str] = mapped_column(
        ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[str] = mapped_column(String, default="")
    body: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ReviewDecision(Base):
    __tablename__ = "review_decisions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    submission_id: Mapped[str] = mapped_column(
        ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False
    )
    action: Mapped[str] = mapped_column(String, default="Approved")
    version: Mapped[int] = mapped_column(Integer, default=1)
    reviewer_id: Mapped[str] = mapped_column(String, default="")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    code: Mapped[str] = mapped_column(String, default="")
    title: Mapped[str] = mapped_column(String, nullable=False)
    excerpt: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[str] = mapped_column(String, default="Text")
    channel: Mapped[str] = mapped_column(String, default="")
    brand: Mapped[str] = mapped_column(String, default="PureGlow")
    status: Mapped[str] = mapped_column(String, default="Pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    creator_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    issue_count: Mapped[int] = mapped_column(Integer, default=0)
    priority: Mapped[str] = mapped_column(String, default="Medium")
    thumb_kind: Mapped[str] = mapped_column(String, default="art")
    thumb_palette: Mapped[str] = mapped_column(String, default="lime")
    thumb_glyph: Mapped[str] = mapped_column(String, default="leaf")
    # AssetFacts (visual rules read these; no model guessing).
    asset_background_colour: Mapped[str | None] = mapped_column(String, nullable=True)
    asset_clear_space_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    asset_typeface: Mapped[str | None] = mapped_column(String, nullable=True)
    asset_aspect_ratio: Mapped[str | None] = mapped_column(String, nullable=True)
    asset_unreadable: Mapped[bool] = mapped_column(Boolean, default=False)

    versions: Mapped[list["ContentVersion"]] = relationship(
        "ContentVersion", backref="submission", cascade="all, delete-orphan",
        order_by="ContentVersion.version",
    )
    findings: Mapped[list["Finding"]] = relationship(
        "Finding", backref="submission", cascade="all, delete-orphan"
    )
    comments: Mapped[list["Comment"]] = relationship(
        "Comment", backref="submission", cascade="all, delete-orphan"
    )
    decisions: Mapped[list["ReviewDecision"]] = relationship(
        "ReviewDecision", backref="submission", cascade="all, delete-orphan"
    )


class ExceptionRequest(Base):
    __tablename__ = "exceptions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    code: Mapped[str] = mapped_column(String, default="")
    content_id: Mapped[str] = mapped_column(String, default="")
    content_title: Mapped[str] = mapped_column(String, default="")
    content_meta: Mapped[str] = mapped_column(String, default="")
    brand: Mapped[str] = mapped_column(String, default="PureGlow")
    rule_code: Mapped[str] = mapped_column(String, default="")
    rule_title: Mapped[str] = mapped_column(String, default="")
    reason: Mapped[str] = mapped_column(Text, default="")
    scope: Mapped[str] = mapped_column(String, default="")
    requested_by_id: Mapped[str] = mapped_column(String, default="")
    decided_by_id: Mapped[str | None] = mapped_column(String, nullable=True)
    effective_from: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String, default="Pending")
    conditions: Mapped[str] = mapped_column(Text, default="")
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    thumb_kind: Mapped[str] = mapped_column(String, default="art")
    thumb_palette: Mapped[str] = mapped_column(String, default="lime")
    thumb_glyph: Mapped[str] = mapped_column(String, default="leaf")


class Simulation(Base):
    __tablename__ = "simulations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, default="")
    rule_id: Mapped[str] = mapped_column(String, default="")
    rule_code: Mapped[str] = mapped_column(String, default="")
    change_type: Mapped[str] = mapped_column(String, default="")
    current_value: Mapped[str] = mapped_column(String, default="")
    new_value: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="Completed")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    created_by_id: Mapped[str] = mapped_column(String, default="")
    items: Mapped[list] = mapped_column(JSON, default=list)
    insight: Mapped[list] = mapped_column(JSON, default=list)
    totals: Mapped[dict] = mapped_column(JSON, default=dict)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    action: Mapped[str] = mapped_column(String, default="Login")
    entity_title: Mapped[str] = mapped_column(String, default="")
    entity_meta: Mapped[str] = mapped_column(String, default="")
    brand: Mapped[str] = mapped_column(String, default="PureGlow")
    user_id: Mapped[str] = mapped_column(String, default="")
    details: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="Recorded")
    entity_kind: Mapped[str] = mapped_column(String, default="auth")
    entity_id: Mapped[str] = mapped_column(String, default="")
    version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    thumb: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class BrandAsset(Base):
    """Brand / product image library (new feature)."""

    __tablename__ = "brand_assets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    brand: Mapped[str] = mapped_column(String, default="PureGlow")
    category: Mapped[str] = mapped_column(String, default="Product Image")  # Brand logo | Product image | Template
    file_path: Mapped[str | None] = mapped_column(String, nullable=True)
    url: Mapped[str | None] = mapped_column(String, nullable=True)
    source: Mapped[str] = mapped_column(String, default="upload")  # upload | external
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending | approved | rejected
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    uploaded_by_id: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
