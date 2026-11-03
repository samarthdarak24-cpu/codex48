"""N10 Approved Snippets router: pre-vetted brand copy, claims, disclosures."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user, require_manager
from .. import models
from ..ids import new_id
from ..services.audit import record

router = APIRouter()


class SnippetIn(BaseModel):
    text: str
    category: str = "Claim"  # Claim | Disclaimer | Promotion | Legal
    rule_codes: list[str] = []
    claim_id: str | None = None
    valid_until: str | None = None  # ISO format string


def _serialize(s: models.ApprovedSnippet) -> dict:
    now = datetime.now(timezone.utc)
    # Check if expired
    is_expired = s.valid_until and s.valid_until.replace(tzinfo=timezone.utc if s.valid_until.tzinfo is None else s.valid_until.tzinfo) < now
    computed_status = "expired" if is_expired else s.status

    return {
        "id": s.id,
        "workspace": s.workspace,
        "text": s.text,
        "category": s.category,
        "ruleCodes": s.rule_codes or [],
        "claimId": s.claim_id,
        "validFrom": s.valid_from.isoformat() if s.valid_from else None,
        "validUntil": s.valid_until.isoformat() if s.valid_until else None,
        "status": computed_status,
        "createdBy": s.created_by,
        "createdAt": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("/snippets")
def list_snippets(
    category: str | None = None,
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[dict]:
    """List approved snippets for the workspace."""
    ws = current_user.workspace or "PureGlow"
    q = db.query(models.ApprovedSnippet).filter(
        (models.ApprovedSnippet.workspace == ws) | (models.ApprovedSnippet.workspace.is_(None))
    )
    if category:
        q = q.filter(models.ApprovedSnippet.category == category)
    if active_only:
        q = q.filter(models.ApprovedSnippet.status == "active")

    snippets = q.order_by(models.ApprovedSnippet.category, models.ApprovedSnippet.created_at.desc()).all()
    results = [_serialize(s) for s in snippets]
    if active_only:
        # Also filter out dynamically expired ones
        results = [s for s in results if s["status"] == "active"]
    return results


@router.post("/snippets")
def create_snippet(
    body: SnippetIn,
    db: Session = Depends(get_db),
    manager: models.User = Depends(require_manager),
) -> dict:
    """Create an approved brand snippet (Manager only)."""
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Snippet text cannot be empty")

    until_dt = None
    if body.valid_until:
        try:
            until_dt = datetime.fromisoformat(body.valid_until)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid valid_until datetime format")

    snippet = models.ApprovedSnippet(
        id=new_id("snp"),
        workspace=manager.workspace or "PureGlow",
        text=body.text.strip(),
        category=body.category,
        rule_codes=body.rule_codes,
        claim_id=body.claim_id,
        valid_until=until_dt,
        status="active",
        created_by=manager.name,
    )
    db.add(snippet)
    db.commit()
    db.refresh(snippet)

    record(
        db,
        action="SnippetCreated",
        entity_title=f"{snippet.category} Snippet",
        entity_meta=f"Valid until {until_dt.strftime('%Y-%m-%d') if until_dt else 'indefinite'}",
        brand=manager.workspace or "PureGlow",
        user_id=manager.id,
        details=f"Created approved snippet: '{snippet.text[:50]}...'",
        entity_kind="snippet",
        entity_id=snippet.id,
        workspace=manager.workspace,
    )

    return _serialize(snippet)


@router.post("/snippets/{snippet_id}/retire")
def retire_snippet(
    snippet_id: str,
    db: Session = Depends(get_db),
    manager: models.User = Depends(require_manager),
) -> dict:
    """Retire or deactivate an approved snippet (Manager only)."""
    snippet = db.get(models.ApprovedSnippet, snippet_id)
    if not snippet:
        raise HTTPException(status_code=404, detail="Snippet not found")

    snippet.status = "retired"
    db.commit()
    db.refresh(snippet)

    record(
        db,
        action="SnippetRetired",
        entity_title=f"{snippet.category} Snippet",
        entity_meta="Status set to retired",
        brand=manager.workspace or "PureGlow",
        user_id=manager.id,
        details=f"Retired snippet {snippet_id}",
        entity_kind="snippet",
        entity_id=snippet.id,
        workspace=manager.workspace,
    )

    return _serialize(snippet)
