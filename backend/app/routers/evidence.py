"""A2 Evidence Intelligence endpoints.

The AI layer is advisory only. These endpoints return deterministic findings
and AI suggestions as SEPARATE lists, and the trust panel exposes how many
citations were rejected — rejected evidence is shown, never hidden.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..ai import ai_available
from ..config import settings
from ..db import get_db
from ..deps import get_current_user, require_manager
from .. import models
from ..services import evidence as svc
from ..services.audit import record

router = APIRouter(prefix="/evidence", tags=["evidence"])


def _ws(user) -> str:
    return getattr(user, "workspace", None) or "PureGlow"


@router.get("/capabilities")
def capabilities(current_user=Depends(get_current_user)):
    """What this deployment can actually do — used to label the UI honestly."""
    embeddings = _embeddings_available()
    return {
        "llmConfigured": ai_available(),
        "embeddingModel": svc._embedding_model_name() or None,  # noqa: SLF001 - status probe
        "promptVersion": svc.PROMPT_VERSION,
        "retrieval": "hybrid_bm25_vector" if embeddings else "bm25_only",
    }


def _embeddings_available() -> bool:
    try:
        return svc.embed_text("probe") is not None
    except Exception:
        return False


@router.get("/findings/{submission_id}")
def list_findings(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return svc.list_ai_findings(db, submission_id, _ws(current_user))


class ReviewBody(BaseModel):
    versionId: str | None = None


@router.post("/review/{submission_id}")
def run_review(
    submission_id: str,
    body: ReviewBody | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Run the semantic review for a submission's current version."""
    sub = db.get(models.Submission, submission_id)
    if sub is None:
        raise HTTPException(404, "Submission not found")
    if sub.workspace and sub.workspace != _ws(current_user):
        raise HTTPException(403, "Not available in this workspace")

    version_id = body.versionId if body else None
    version = None
    if version_id:
        version = db.get(models.ContentVersion, version_id)
        if version is None or version.submission_id != submission_id:
            raise HTTPException(404, "Version not found")
    elif sub.versions:
        version = max(sub.versions, key=lambda v: v.version)

    text = version.text if version else ""
    if not text.strip():
        # A poster has no typed copy; use the OCR text when available.
        analysis = (
            db.query(models.AssetAnalysis)
            .filter(models.AssetAnalysis.submission_id == submission_id)
            .order_by(models.AssetAnalysis.created_at.desc())
            .first()
        )
        text = (analysis.ocr_text if analysis else "") or ""

    rows = svc.semantic_review(
        db,
        submission_id=submission_id,
        version_id=version.id if version else None,
        text=text,
        workspace=_ws(current_user),
        created_by_id=current_user.id,
    )

    record(
        db,
        action="Revised",
        entity_title=sub.title,
        entity_meta="AI review",
        brand=sub.brand,
        user_id=current_user.id,
        details=f"Semantic review produced {len(rows)} AI suggestion(s).",
        entity_kind="submission",
        entity_id=sub.id,
        workspace=_ws(current_user),
    )
    db.commit()

    return {
        "submissionId": submission_id,
        "count": len(rows),
        "findings": [svc.to_dict(r) for r in rows],
        "llmConfigured": ai_available(),
    }


@router.post("/sync-embeddings")
def sync_embeddings(
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    result = svc.sync_embeddings(db, _ws(current_user))
    return result


@router.get("/search")
def search(
    q: str,
    topK: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Hybrid retrieval over guideline passages (BM25 when no model)."""
    if not (q or "").strip():
        return {"query": q, "results": [], "method": "none"}
    results = svc.hybrid_retrieve(db, q, _ws(current_user), top_k=topK)
    method = "hybrid_bm25_vector" if any(r.get("method") == "hybrid" for r in results) else "bm25_only"
    return {"query": q, "results": results, "method": method}


@router.get("/trust")
def trust(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    """AI Trust Panel: calls, failures, citations verified vs rejected."""
    return svc.ai_trust_summary(db, _ws(current_user), days=days)
