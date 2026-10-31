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
    UniqueConstraint,
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
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
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

    passages: Mapped[list["GuidelinePassage"]] = relationship(
        "GuidelinePassage", backref="doc", cascade="all, delete-orphan"
    )


class GuidelinePassage(Base):
    __tablename__ = "guideline_passages"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    doc_id: Mapped[str] = mapped_column(ForeignKey("guideline_docs.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    paragraph_number: Mapped[int] = mapped_column(Integer, default=1)
    heading: Mapped[str] = mapped_column(String, default="")
    passage_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Rule(Base):
    __tablename__ = "rules"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
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
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
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
    # Image-pixel box this finding refers to (A1). Null for text-only findings.
    region: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # 'violation' (condition met with known facts) | 'needs_review' (a required
    # fact was missing). Drives the three result groups in the UI.
    outcome: Mapped[str] = mapped_column(String, default="violation", server_default="violation")
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
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
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
    # Attached brand/product image (snapshot so the reference survives asset edits).
    asset_id: Mapped[str | None] = mapped_column(String, nullable=True)
    asset_name: Mapped[str | None] = mapped_column(String, nullable=True)
    asset_url: Mapped[str | None] = mapped_column(String, nullable=True)
    asset_source: Mapped[str | None] = mapped_column(String, nullable=True)
    asset_attribution: Mapped[str | None] = mapped_column(String, nullable=True)

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


class ExceptionRulingHistory(Base):
    __tablename__ = "exception_ruling_history"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    exception_id: Mapped[str] = mapped_column(
        ForeignKey("exceptions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String, nullable=False)  # "Approved" | "Rejected" | "Revoked" | "Requested"
    actor_id: Mapped[str] = mapped_column(String, default="")
    actor_name: Mapped[str] = mapped_column(String, default="")
    actor_role: Mapped[str] = mapped_column(String, default="")
    reason_or_conditions: Mapped[str] = mapped_column(Text, default="")
    at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ExceptionRequest(Base):
    __tablename__ = "exceptions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
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
    status: Mapped[str] = mapped_column(String, default="Pending")  # Pending | Approved | Rejected | Revoked
    conditions: Mapped[str] = mapped_column(Text, default="")
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoked_by_id: Mapped[str | None] = mapped_column(String, nullable=True)
    revoke_reason: Mapped[str | None] = mapped_column(Text, default="", server_default="", nullable=True)
    thumb_kind: Mapped[str] = mapped_column(String, default="art")
    thumb_palette: Mapped[str] = mapped_column(String, default="lime")
    thumb_glyph: Mapped[str] = mapped_column(String, default="leaf")

    history: Mapped[list["ExceptionRulingHistory"]] = relationship(
        "ExceptionRulingHistory", backref="exception", cascade="all, delete-orphan",
        order_by="ExceptionRulingHistory.at",
    )


class ProposedRule(Base):
    __tablename__ = "proposed_rules"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    simulation_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    target_rule_id: Mapped[str] = mapped_column(String, nullable=False)
    target_rule_code: Mapped[str] = mapped_column(String, nullable=False)
    change_type: Mapped[str] = mapped_column(String, nullable=False)
    current_value: Mapped[str] = mapped_column(String, default="")
    proposed_value: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="simulated")  # simulated | activated | discarded
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    created_by_id: Mapped[str] = mapped_column(String, default="")
    activated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    activated_by_id: Mapped[str | None] = mapped_column(String, nullable=True)


class Simulation(Base):
    __tablename__ = "simulations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
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
    breakdown: Mapped[dict | None] = mapped_column(JSON, default=dict, nullable=True)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
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
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
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


# ---------------------------------------------------------------------------
# Round 3 / A1 — VisualGuard (blueprint 3.4)
# ---------------------------------------------------------------------------

class AssetAnalysis(Base):
    """One analysis run over one uploaded poster.

    Boxes are stored in *image pixel* coordinates. The frontend scales them to
    whatever size the image is displayed at, so they survive resize/mobile.
    Every field here is produced by a deterministic analyser; nothing is
    guessed by a model.
    """

    __tablename__ = "asset_analysis"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    asset_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    submission_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    file_path: Mapped[str | None] = mapped_column(String, nullable=True)

    # pending | processing | complete | failed
    status: Mapped[str] = mapped_column(String, default="pending", index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    width: Mapped[int] = mapped_column(Integer, default=0)
    height: Mapped[int] = mapped_column(Integer, default=0)

    ocr_text: Mapped[str] = mapped_column(Text, default="")
    # [{"text": str, "box": {"x","y","w","h"}, "confidence": float}]
    text_blocks: Mapped[list] = mapped_column(JSON, default=list)
    # [{"hex": "#7AB93B", "ratio": 0.42}]
    dominant_colors: Mapped[list] = mapped_column(JSON, default=list)
    # [{"logoId": str, "name": str, "box": {...}, "confidence": float, "method": str}]
    logo_matches: Mapped[list] = mapped_column(JSON, default=list)
    layout_metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    # [{"check","region","value","threshold","status"}]
    contrast_findings: Mapped[list] = mapped_column(JSON, default=list)
    analyzer_versions: Mapped[dict] = mapped_column(JSON, default=dict)

    unreadable: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


# ---------------------------------------------------------------------------
# Round 3 / A2 — Evidence Intelligence (blueprint 3.4, 5.1)
# ---------------------------------------------------------------------------

class PassageEmbedding(Base):
    """Vector for one guideline passage.

    Stored as JSON so SQLite works with zero setup; on PostgreSQL the same
    column can be migrated to pgvector without changing the service layer.
    """

    __tablename__ = "passage_embeddings"
    __table_args__ = (UniqueConstraint("passage_id", "model_name", name="uq_passage_model"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    passage_id: Mapped[str] = mapped_column(
        ForeignKey("guideline_passages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    model_name: Mapped[str] = mapped_column(String, default="")
    dim: Mapped[int] = mapped_column(Integer, default=0)
    vector: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AiFinding(Base):
    """An AI *suggestion* attached to a submission version.

    Never a verdict: `source_type` is one of ai_suggestion / needs_human_review
    / rejected. A rejected citation is kept (not hidden) so the trust panel can
    report it.
    """

    __tablename__ = "ai_findings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    submission_id: Mapped[str] = mapped_column(String, default="", index=True)
    submission_version_id: Mapped[str | None] = mapped_column(
        ForeignKey("content_versions.id", ondelete="CASCADE"), nullable=True, index=True
    )
    rule_code: Mapped[str | None] = mapped_column(String, nullable=True)
    rule_title: Mapped[str] = mapped_column(String, default="")
    passage_id: Mapped[str | None] = mapped_column(String, nullable=True)
    source_type: Mapped[str] = mapped_column(String, default="ai_suggestion", index=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    similarity: Mapped[float] = mapped_column(Float, default=0.0)
    rationale: Mapped[str] = mapped_column(Text, default="")
    minimal_edit: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    quote: Mapped[str] = mapped_column(Text, default="")
    citation_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    rejected_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    model: Mapped[str] = mapped_column(String, default="")
    prompt_version: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AiCallLog(Base):
    """Every LLM call, including failures. Feeds the AI Trust Panel."""

    __tablename__ = "ai_call_log"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    purpose: Mapped[str] = mapped_column(String, default="", index=True)
    model: Mapped[str] = mapped_column(String, default="")
    prompt_version: Mapped[str] = mapped_column(String, default="")
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    # success | timeout | error | skipped
    status: Mapped[str] = mapped_column(String, default="success", index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    citations_verified: Mapped[int] = mapped_column(Integer, default=0)
    citations_rejected: Mapped[int] = mapped_column(Integer, default=0)
    redaction_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# ---------------------------------------------------------------------------
# Round 3 / A3 — Sentinel (blueprint 3.4, 7.2)
# ---------------------------------------------------------------------------

class Publication(Base):
    """A content version the team has actually shipped.

    Sentinel only re-checks published/approved versions — not drafts nobody
    ever released.
    """

    __tablename__ = "publications"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    submission_id: Mapped[str] = mapped_column(String, default="", index=True)
    submission_version_id: Mapped[str | None] = mapped_column(
        ForeignKey("content_versions.id", ondelete="CASCADE"), nullable=True, index=True
    )
    channel: Mapped[str] = mapped_column(String, default="")
    published_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    published_by: Mapped[str] = mapped_column(String, default="")
    # published | withdrawn
    status: Mapped[str] = mapped_column(String, default="published", index=True)


class ReassessmentTask(Base):
    """One item of work created when a change makes old content non-compliant.

    The unique constraint is the dedupe rule from blueprint 7.2: a given
    (version, trigger type, trigger ref) can only create a task once.
    """

    __tablename__ = "reassessment_tasks"
    __table_args__ = (
        UniqueConstraint(
            "submission_version_id", "trigger_type", "trigger_ref",
            name="uq_task_version_trigger",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    submission_id: Mapped[str] = mapped_column(String, default="", index=True)
    submission_version_id: Mapped[str | None] = mapped_column(
        ForeignKey("content_versions.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # rule_activated | rule_edited | rule_deactivated | exception_expired
    # | exception_revoked | claim_withdrawn
    trigger_type: Mapped[str] = mapped_column(String, default="", index=True)
    trigger_ref: Mapped[str] = mapped_column(String, default="")
    reason: Mapped[str] = mapped_column(Text, default="")
    affected_rule_codes: Mapped[list] = mapped_column(JSON, default=list)
    assignee_id: Mapped[str | None] = mapped_column(String, nullable=True)
    # open | resolved | dismissed
    status: Mapped[str] = mapped_column(String, default="open", index=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # re_approve | request_changes | withdraw
    resolution: Mapped[str | None] = mapped_column(String, nullable=True)
    resolution_note: Mapped[str] = mapped_column(Text, default="")
    resolved_by_id: Mapped[str | None] = mapped_column(String, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace: Mapped[str] = mapped_column(String, default="PureGlow", server_default="PureGlow", nullable=True, index=True)
    user_id: Mapped[str] = mapped_column(String, default="", index=True)
    # sentinel_task | exception_expiring | decision | system
    type: Mapped[str] = mapped_column(String, default="system")
    title: Mapped[str] = mapped_column(String, default="")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
