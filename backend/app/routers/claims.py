"""Claims router: list and create approved marketing claims."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user, require_manager, require_workspace
from .. import models
from ..ids import new_id
from ..services.audit import record

router = APIRouter()


class ClaimIn(BaseModel):
    text: str
    product: str
    source: str
    scope: str
    status: str | None = None


def _serialize(claim: models.ApprovedClaim) -> dict:
    return {
        "id": claim.id,
        "text": claim.text,
        "product": claim.product,
        "source": claim.source,
        "scope": claim.scope,
        "status": claim.status,
        "approvedAt": claim.approved_at.isoformat() if claim.approved_at else None,
        "approvedBy": claim.approved_by,
    }


@router.get("/claims")
def list_claims(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[dict]:
    # Workspace isolation: a user only sees claims approved for their own
    # workspace (NULL = legacy rows, treated as shared).
    ws = current_user.workspace or "PureGlow"
    claims = (
        db.query(models.ApprovedClaim)
        .filter(
            (models.ApprovedClaim.workspace == ws)
            | (models.ApprovedClaim.workspace.is_(None))
        )
        .all()
    )
    return [_serialize(c) for c in claims]


@router.post("/claims")
def create_claim(
    body: ClaimIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager),
) -> dict:
    now = datetime.now(timezone.utc)
    claim = models.ApprovedClaim(
        id=new_id("claim"),
        workspace=current_user.workspace or "PureGlow",
        text=body.text,
        product=body.product,
        source=body.source,
        scope=body.scope,
        status=body.status or "approved",
        approved_at=now,
        approved_by=current_user.id,
    )
    db.add(claim)
    db.flush()
    record(
        db,
        action="Approved",
        entity_title=body.text,
        entity_kind="claim",
        entity_id=claim.id,
        user_id=current_user.id,
        details=f"Approved claim for {body.product}",
    )
    db.commit()
    db.refresh(claim)
    return _serialize(claim)


@router.post("/claims/{claim_id}/withdraw")
def withdraw_claim(
    claim_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager),
) -> dict:
    """Withdraw an approved claim.

    A3 Sentinel trigger: any published content that used this claim has to be
    re-checked, because the substantiation it relied on no longer exists.
    """
    claim = db.get(models.ApprovedClaim, claim_id)
    require_workspace(claim, current_user, shared=True, detail="Claim not found")

    claim.status = "withdrawn"
    record(
        db,
        action="Revoked",
        entity_title=claim.text,
        entity_kind="claim",
        entity_id=claim.id,
        user_id=current_user.id,
        details=f"Withdrew claim for {claim.product}",
    )
    db.commit()
    db.refresh(claim)

    try:
        from ..services import sentinel as sentinel_svc

        sentinel_svc.on_claim_withdrawn(
            db, claim=claim, actor_id=current_user.id,
            workspace=claim.workspace or "PureGlow",
        )
    except Exception:  # pragma: no cover - defensive
        pass

    return _serialize(claim)
