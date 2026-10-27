"""Exception request router."""
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..deps import get_current_user, require_manager
from ..ids import new_id
from ..services import exceptions as svc
from ..services.audit import record

router = APIRouter(prefix="/exceptions", tags=["exceptions"])


class ExceptionIn(BaseModel):
    contentId: str
    contentTitle: str | None = None
    contentMeta: str = ""
    brand: str | None = None
    ruleCode: str
    ruleTitle: str | None = None
    reason: str
    scope: str = ""
    effectiveFrom: str | None = None
    expiresAt: str | None = None
    thumb: dict | None = None
    conditions: str = ""


class DecideIn(BaseModel):
    decision: str  # "Approved" | "Rejected"
    conditions: str = ""


@router.get("")
def list_exceptions(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> list[dict]:
    rows = (
        db.query(models.ExceptionRequest)
        .order_by(models.ExceptionRequest.effective_from)
        .all()
    )
    return [svc.exception_to_dict(e) for e in rows]


@router.post("")
def create_exception(
    body: ExceptionIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> dict:
    now = datetime.now(timezone.utc)
    count = db.query(models.ExceptionRequest).count()
    thumb = body.thumb or {"kind": "art", "palette": "lime", "glyph": "leaf"}

    # The frontend only sends contentId + ruleCode for the linked content; derive
    # the human-readable title/meta/brand/ruleTitle server-side from the database
    # so a request is never rejected for omitting fields it cannot know.
    sub = db.get(models.Submission, body.contentId) if body.contentId else None
    content_title = body.contentTitle or (sub.title if sub else "")
    content_meta = body.contentMeta or (f"{sub.type} · {sub.channel}" if sub else "")
    brand = body.brand or (sub.brand if sub else "PureGlow")
    rule = (
        db.query(models.Rule).filter(models.Rule.code == body.ruleCode).first()
        if body.ruleCode
        else None
    )
    rule_title = body.ruleTitle or (rule.title if rule else "")
    if sub is not None:
        thumb = {
            "kind": sub.thumb_kind,
            "palette": sub.thumb_palette,
            "glyph": sub.thumb_glyph,
        }

    effective_from = (
        datetime.fromisoformat(body.effectiveFrom) if body.effectiveFrom else now
    )
    expires_at = (
        datetime.fromisoformat(body.expiresAt) if body.expiresAt else None
    )

    e = models.ExceptionRequest(
        id=new_id("ex"),
        code=f"EX-{1000 + count + 1}",
        content_id=body.contentId,
        content_title=content_title,
        content_meta=content_meta,
        brand=brand,
        rule_code=body.ruleCode,
        rule_title=rule_title,
        reason=body.reason,
        scope=body.scope,
        requested_by_id=user.id,
        effective_from=effective_from,
        expires_at=expires_at,
        status="Pending",
        conditions=body.conditions,
        thumb_kind=thumb.get("kind", "art"),
        thumb_palette=thumb.get("palette", "lime"),
        thumb_glyph=thumb.get("glyph", "leaf"),
    )
    db.add(e)
    db.flush()
    record(
        db,
        action="Exception",
        entity_title=e.content_title,
        entity_meta=e.code,
        brand=e.brand,
        user_id=user.id,
        status="Pending",
        entity_kind="exception",
        entity_id=e.id,
        thumb=svc.exception_to_dict(e)["thumb"],
    )
    db.commit()
    db.refresh(e)
    return svc.exception_to_dict(e)


@router.post("/{id}/decide")
def decide_exception(
    id: str,
    body: DecideIn,
    db: Session = Depends(get_db),
    manager: models.User = Depends(require_manager),
) -> dict:
    e = db.get(models.ExceptionRequest, id)
    if not e:
        raise HTTPException(status_code=404, detail="Exception not found")

    if body.decision == "Approved" and svc.is_expired(e):
        raise HTTPException(status_code=409, detail="Expired exceptions cannot be approved.")

    e.status = "Approved" if body.decision == "Approved" else "Rejected"
    e.decided_by_id = manager.id
    e.decided_at = datetime.now(timezone.utc)
    existing = (e.conditions or "").strip()
    incoming = (body.conditions or "").strip()
    if incoming:
        e.conditions = f"{existing}\n{incoming}".strip() if existing else incoming

    db.flush()
    record(
        db,
        action="Exception",
        entity_title=e.content_title,
        entity_meta=e.code,
        brand=e.brand,
        user_id=manager.id,
        status=e.status,
        entity_kind="exception",
        entity_id=e.id,
        thumb=svc.exception_to_dict(e)["thumb"],
    )
    db.commit()
    db.refresh(e)
    return svc.exception_to_dict(e)
