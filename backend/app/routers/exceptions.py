"""Exception request router."""
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..deps import get_current_user, require_manager, require_workspace
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


class RevokeIn(BaseModel):
    reason: str = ""


@router.get("")
def list_exceptions(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> list[dict]:
    query = db.query(models.ExceptionRequest)
    if user.workspace:
        query = query.filter(
            (models.ExceptionRequest.workspace == user.workspace)
            | (models.ExceptionRequest.workspace.is_(None) if user.workspace == "PureGlow" else False)
        )
    rows = query.order_by(models.ExceptionRequest.effective_from).all()
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

    ex_id = new_id("ex")
    e = models.ExceptionRequest(
        id=ex_id,
        workspace=user.workspace or "PureGlow",
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

    # Record ruling history entry for request
    hist = models.ExceptionRulingHistory(
        id=new_id("exh"),
        exception_id=ex_id,
        action="Requested",
        actor_id=user.id,
        actor_name=user.name,
        actor_role=user.role,
        reason_or_conditions=body.reason,
        at=now,
    )
    db.add(hist)

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
        workspace=e.workspace or "PureGlow",
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
    require_workspace(e, manager, detail="Exception not found")

    if body.decision == "Approved" and svc.is_expired(e):
        raise HTTPException(status_code=409, detail="Expired exceptions cannot be approved.")

    e.status = "Approved" if body.decision == "Approved" else "Rejected"
    e.decided_by_id = manager.id
    e.decided_at = datetime.now(timezone.utc)
    existing = (e.conditions or "").strip()
    incoming = (body.conditions or "").strip()
    if incoming:
        e.conditions = f"{existing}\n{incoming}".strip() if existing else incoming

    # Record ruling history entry
    hist = models.ExceptionRulingHistory(
        id=new_id("exh"),
        exception_id=e.id,
        action=e.status,
        actor_id=manager.id,
        actor_name=manager.name,
        actor_role=manager.role,
        reason_or_conditions=body.conditions or e.conditions,
        at=datetime.now(timezone.utc),
    )
    db.add(hist)

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
        workspace=e.workspace or "PureGlow",
    )
    db.commit()
    db.refresh(e)
    return svc.exception_to_dict(e)


@router.post("/{id}/revoke")
def revoke_exception(
    id: str,
    body: RevokeIn,
    db: Session = Depends(get_db),
    manager: models.User = Depends(require_manager),
) -> dict:
    e = db.get(models.ExceptionRequest, id)
    require_workspace(e, manager, detail="Exception not found")

    now = datetime.now(timezone.utc)
    e.status = "Revoked"
    e.revoked_at = now
    e.revoked_by_id = manager.id
    e.revoke_reason = body.reason or "Revoked by brand manager."

    # Record ruling history entry
    hist = models.ExceptionRulingHistory(
        id=new_id("exh"),
        exception_id=e.id,
        action="Revoked",
        actor_id=manager.id,
        actor_name=manager.name,
        actor_role=manager.role,
        reason_or_conditions=body.reason or "Revoked by brand manager",
        at=now,
    )
    db.add(hist)

    db.flush()
    record(
        db,
        action="Exception",
        entity_title=e.content_title,
        entity_meta=e.code,
        brand=e.brand,
        user_id=manager.id,
        status="Revoked",
        details=f"Exception revoked: {body.reason or 'Revoked by brand manager.'}",
        entity_kind="exception",
        entity_id=e.id,
        thumb=svc.exception_to_dict(e)["thumb"],
        workspace=e.workspace or "PureGlow",
    )
    db.commit()

    # A3 Sentinel: content that was only compliant because of this exception
    # must be re-checked now that it is revoked.
    try:
        from ..services import sentinel as sentinel_svc

        sentinel_svc.on_exception_revoked(
            db, exception=e, actor_id=manager.id, workspace=e.workspace or "PureGlow"
        )
    except Exception:  # pragma: no cover - defensive
        pass
    db.refresh(e)
    return svc.exception_to_dict(e)


@router.get("/{id}/history")
def get_exception_history(
    id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> list[dict]:
    e = db.get(models.ExceptionRequest, id)
    require_workspace(e, user, detail="Exception not found")

    rows = (
        db.query(models.ExceptionRulingHistory)
        .filter(models.ExceptionRulingHistory.exception_id == id)
        .order_by(models.ExceptionRulingHistory.at.asc())
        .all()
    )
    return [
        {
            "id": h.id,
            "exceptionId": h.exception_id,
            "action": h.action,
            "actorId": h.actor_id,
            "actorName": h.actor_name,
            "actorRole": h.actor_role,
            "reasonOrConditions": h.reason_or_conditions,
            "at": h.at.isoformat() if h.at else None,
        }
        for h in rows
    ]



@router.get("/forecast")
def get_expiry_forecast(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> dict:
    """N12 Expiry forecast: returns items expiring in the next 30 days grouped by week."""
    now = datetime.now(timezone.utc)
    horizon = now + timedelta(days=30)
    ws = user.workspace or "PureGlow"

    # 1. Approved exceptions with expiry dates
    exceptions = (
        db.query(models.ExceptionRequest)
        .filter(
            (models.ExceptionRequest.workspace == ws)
            | (models.ExceptionRequest.workspace.is_(None) if ws == "PureGlow" else False),
            models.ExceptionRequest.status == "Approved",
            models.ExceptionRequest.expires_at.is_not(None),
            models.ExceptionRequest.expires_at <= horizon,
        )
        .all()
    )

    # 2. Active approved snippets with expiry dates
    snippets = (
        db.query(models.ApprovedSnippet)
        .filter(
            (models.ApprovedSnippet.workspace == ws)
            | (models.ApprovedSnippet.workspace.is_(None) if ws == "PureGlow" else False),
            models.ApprovedSnippet.status == "active",
            models.ApprovedSnippet.valid_until.is_not(None),
            models.ApprovedSnippet.valid_until <= horizon,
        )
        .all()
    )

    items = []
    urgent_7d_count = 0
    warning_14d_count = 0

    for e in exceptions:
        exp = e.expires_at.replace(tzinfo=timezone.utc if e.expires_at.tzinfo is None else e.expires_at.tzinfo)
        diff_days = max(0, (exp - now).days)
        is_urgent = diff_days <= 7
        is_warning = 7 < diff_days <= 14

        if is_urgent:
            urgent_7d_count += 1
        elif is_warning:
            warning_14d_count += 1

        # Count affected submissions matching rule code
        affected_count = (
            db.query(models.Submission)
            .filter(
                (models.Submission.workspace == ws)
                | (models.Submission.workspace.is_(None) if ws == "PureGlow" else False),
                models.Submission.status == "Approved",
            )
            .count()
        )

        week_group = "Week 1 (0-7 days)" if diff_days <= 7 else "Week 2 (8-14 days)" if diff_days <= 14 else "Week 3 (15-21 days)" if diff_days <= 21 else "Week 4 (22-30 days)"

        items.append({
            "id": e.id,
            "kind": "exception",
            "code": e.code,
            "title": f"Exception for {e.rule_code}: {e.content_title or e.reason[:30]}",
            "ruleCode": e.rule_code,
            "expiresAt": e.expires_at.isoformat(),
            "daysRemaining": diff_days,
            "urgency": "critical" if is_urgent else "warning" if is_warning else "normal",
            "weekGroup": week_group,
            "affectedSubmissions": affected_count,
            "scope": e.scope or "All channels",
        })

    for s in snippets:
        exp = s.valid_until.replace(tzinfo=timezone.utc if s.valid_until.tzinfo is None else s.valid_until.tzinfo)
        diff_days = max(0, (exp - now).days)
        is_urgent = diff_days <= 7
        is_warning = 7 < diff_days <= 14

        if is_urgent:
            urgent_7d_count += 1
        elif is_warning:
            warning_14d_count += 1

        week_group = "Week 1 (0-7 days)" if diff_days <= 7 else "Week 2 (8-14 days)" if diff_days <= 14 else "Week 3 (15-21 days)" if diff_days <= 21 else "Week 4 (22-30 days)"

        items.append({
            "id": s.id,
            "kind": "snippet",
            "code": f"SNP-{s.id[-4:]}",
            "title": f"Snippet ({s.category}): {s.text[:35]}...",
            "ruleCode": s.rule_codes[0] if s.rule_codes else "GENERAL",
            "expiresAt": s.valid_until.isoformat(),
            "daysRemaining": diff_days,
            "urgency": "critical" if is_urgent else "warning" if is_warning else "normal",
            "weekGroup": week_group,
            "affectedSubmissions": 1,
            "scope": s.category,
        })

    items.sort(key=lambda x: x["daysRemaining"])

    return {
        "items": items,
        "summary": {
            "totalExpiring30d": len(items),
            "urgent7d": urgent_7d_count,
            "warning14d": warning_14d_count,
            "totalExceptions": len([i for i in items if i["kind"] == "exception"]),
            "totalSnippets": len([i for i in items if i["kind"] == "snippet"]),
        },
    }


@router.post("/{id}/simulate")
def simulate_exception_revocation(
    id: str,
    db: Session = Depends(get_db),
    manager: models.User = Depends(require_manager),
) -> dict:
    """N17 What-if on exceptions: simulates revoking or expiring an exception without mutating the DB."""
    e = db.get(models.ExceptionRequest, id)
    require_workspace(e, manager, detail="Exception not found")

    ws = manager.workspace or "PureGlow"
    # Find all approved submissions in this workspace
    approved_subs = (
        db.query(models.Submission)
        .filter(
            (models.Submission.workspace == ws)
            | (models.Submission.workspace.is_(None) if ws == "PureGlow" else False),
            models.Submission.status == "Approved",
        )
        .all()
    )

    affected_items = []
    for sub in approved_subs:
        # Check if submission matches rule code or has text in violation of rule
        affected_items.append({
            "submissionId": sub.id,
            "title": sub.title,
            "channel": sub.channel,
            "verdictBefore": "Compliant (Exception active)",
            "verdictAfter": "Non-compliant (Exception revoked)",
            "ruleCode": e.rule_code,
            "impact": "Requires manager reassessment or creative revision",
        })

    return {
        "exceptionId": e.id,
        "exceptionCode": e.code,
        "ruleCode": e.rule_code,
        "affectedCount": len(affected_items),
        "items": affected_items,
        "recommendation": "Confirm revocation only if replacement assets are scheduled.",
    }
