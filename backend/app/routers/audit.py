"""Audit log router: list events and derive health/metrics for the dashboard.

All metrics are computed from the database at request time (nothing hardcoded),
porting the derived values from the frontend's lib/selectors.ts.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from .. import models

router = APIRouter()


def _audit_to_dict(e: models.AuditEvent) -> dict:
    return {
        "id": e.id,
        "at": e.at.isoformat() if e.at else None,
        "action": e.action,
        "entityTitle": e.entity_title,
        "entityMeta": e.entity_meta,
        "thumb": e.thumb,  # dict | null
        "brand": e.brand,
        "userId": e.user_id,
        "details": e.details,
        "status": e.status,
        "entityKind": e.entity_kind,
        "entityId": e.entity_id,
        "version": e.version,  # int | null
    }


def _exception_to_dict(e: models.ExceptionRequest) -> dict:
    # Inline serializer (subset of ExceptionRequest) for health/expiringSoon.
    return {
        "id": e.id,
        "code": e.code,
        "contentTitle": e.content_title,
        "ruleCode": e.rule_code,
        "expiresAt": e.expires_at.isoformat() if e.expires_at else None,
        "status": e.status,
    }


@router.get("/audit")
def list_audit(
    action: Optional[str] = Query(default=None),
    brand: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    q = db.query(models.AuditEvent)
    if action is not None:
        q = q.filter(models.AuditEvent.action == action)
    if brand is not None:
        q = q.filter(models.AuditEvent.brand == brand)
    events = q.order_by(models.AuditEvent.at.desc()).all()
    return [_audit_to_dict(e) for e in events]


@router.get("/audit/health")
def audit_health(
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    # --- Guideline stats -----------------------------------------------------
    g_total = db.query(func.count(models.GuidelineDoc.id)).scalar() or 0
    g_active = (
        db.query(func.count(models.GuidelineDoc.id))
        .filter(models.GuidelineDoc.status == "active")
        .scalar()
        or 0
    )
    g_processing = (
        db.query(func.count(models.GuidelineDoc.id))
        .filter(models.GuidelineDoc.status == "processing")
        .scalar()
        or 0
    )
    g_archived = (
        db.query(func.count(models.GuidelineDoc.id))
        .filter(models.GuidelineDoc.status == "archived")
        .scalar()
        or 0
    )
    guideline_stats = {
        "total": g_total,
        "active": g_active,
        "processing": g_processing,
        "archived": g_archived,
    }

    # --- Rules by category ---------------------------------------------------
    # Rule has no `category` column; group active rules by `subject` (the
    # closest grouping dimension available) and expose it as `category`.
    cat_rows = (
        db.query(models.Rule.subject, func.count(models.Rule.id))
        .filter(models.Rule.status == "active")
        .group_by(models.Rule.subject)
        .all()
    )
    rules_by_category = [{"category": c or "Uncategorized", "count": n} for c, n in cat_rows]

    # --- Expiring soon -------------------------------------------------------
    # Filter in Python with UTC normalisation so SQLite (naive) and PostgreSQL
    # (aware) behave identically.
    now = datetime.now(timezone.utc)
    horizon = now + timedelta(days=30)

    def _aware(dt):
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)

    rows = (
        db.query(models.ExceptionRequest)
        .filter(
            models.ExceptionRequest.status == "Approved",
            models.ExceptionRequest.expires_at.isnot(None),
        )
        .all()
    )
    expiring = sorted(
        [e for e in rows if _aware(e.expires_at) <= horizon],
        key=lambda e: _aware(e.expires_at),
    )
    expiring_soon = [_exception_to_dict(e) for e in expiring]

    # --- Most overridden rules ----------------------------------------------
    most_overridden_rows = (
        db.query(models.Rule.code, models.Rule.overrides_this_quarter)
        .order_by(models.Rule.overrides_this_quarter.desc())
        .limit(5)
        .all()
    )
    most_overridden = [{"rule": code, "count": cnt} for code, cnt in most_overridden_rows]

    # --- Audit stats ---------------------------------------------------------
    a_total = db.query(func.count(models.AuditEvent.id)).scalar() or 0
    a_approved = (
        db.query(func.count(models.AuditEvent.id))
        .filter(models.AuditEvent.action == "Approved")
        .scalar()
        or 0
    )
    a_rejected = (
        db.query(func.count(models.AuditEvent.id))
        .filter(models.AuditEvent.action == "Rejected")
        .scalar()
        or 0
    )
    a_exception = (
        db.query(func.count(models.AuditEvent.id))
        .filter(models.AuditEvent.action == "Exception")
        .scalar()
        or 0
    )
    a_revised = (
        db.query(func.count(models.AuditEvent.id))
        .filter(models.AuditEvent.action == "Revised")
        .scalar()
        or 0
    )
    audit_stats = {
        "total": a_total,
        "approved": a_approved,
        "rejected": a_rejected,
        "exception": a_exception,
        "revised": a_revised,
    }

    # --- Audit breakdown -----------------------------------------------------
    breakdown_rows = (
        db.query(models.AuditEvent.action, func.count(models.AuditEvent.id))
        .group_by(models.AuditEvent.action)
        .all()
    )
    audit_breakdown = [{"action": a or "Unknown", "count": n} for a, n in breakdown_rows]

    return {
        "guidelineStats": guideline_stats,
        "rulesByCategory": rules_by_category,
        "expiringSoon": expiring_soon,
        "mostOverridden": most_overridden,
        "auditStats": audit_stats,
        "auditBreakdown": audit_breakdown,
    }
