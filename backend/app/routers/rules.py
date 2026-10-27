"""Rules + Conflicts router.

Manager-only creation/confirmation; anyone authenticated may read rules and the
conflict report. See CONTRACT.md > Rules + Conflicts.
"""
import re

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..deps import get_current_user, require_manager
from ..ids import new_id
from ..services import rules as svc
from ..services.audit import record

router = APIRouter(tags=["rules"])


class RuleCreate(BaseModel):
    code: str | None = None
    title: str
    summary: str = ""
    subject: str = ""
    condition: str = ""
    action: str = ""
    scope: str = ""
    priority: str = "Medium"
    sourceDocId: str | None = None
    sourceVersion: str = ""
    sourcePassage: str = ""
    sourcePage: int = 0
    effectiveFrom: datetime | None = None
    effectiveTo: datetime | None = None


def _parse_dt(value: datetime | None) -> datetime | None:
    return value


@router.get("/rules")
def list_rules(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ws = getattr(current_user, "workspace", "PureGlow")
    # Workspace isolation: only this workspace's rules (NULL = legacy/shared).
    rules = db.query(models.Rule).filter(
        (models.Rule.workspace == ws) | (models.Rule.workspace.is_(None))
    ).all()
    return [svc.rule_to_dict(r) for r in rules]


@router.post("/rules", status_code=201)
def create_rule(
    body: RuleCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_manager),
):
    code = body.code
    if not code:
        base = re.sub(r"[^A-Z0-9]+", "-", (body.title or "RULE").upper()).strip("-")[:14] or "RULE"
        candidate = base
        n = 1
        while db.query(models.Rule).filter(models.Rule.code == candidate).first():
            candidate = f"{base}-{n}"
            n += 1
        code = candidate
    else:
        existing = db.query(models.Rule).filter(models.Rule.code == code).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Rule code '{code}' already exists")

    ws = getattr(user, "workspace", "PureGlow")
    r = models.Rule(
        id=new_id("rule"),
        workspace=ws,
        code=code,
        title=body.title,
        summary=body.summary,
        subject=body.subject,
        condition=body.condition,
        action=body.action,
        scope=body.scope,
        priority=body.priority,
        status="needs_confirmation",
        source_doc_id=body.sourceDocId,
        source_version=body.sourceVersion,
        source_passage=body.sourcePassage,
        source_page=body.sourcePage,
        effective_from=body.effectiveFrom,
        effective_to=body.effectiveTo,
        overrides_this_quarter=0,
    )
    db.add(r)
    db.flush()
    record(
        db,
        action="Rule updated",
        entity_title=r.title,
        entity_meta=r.code,
        user_id=user.id,
        brand=ws,
        details=f"Created rule {r.code} (needs confirmation)",
        entity_kind="rule",
        entity_id=r.id,
    )
    db.commit()
    db.refresh(r)
    return svc.rule_to_dict(r)


@router.post("/rules/{rule_id}/confirm")
def confirm_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_manager),
):
    r = db.get(models.Rule, rule_id)
    if not r:
        raise HTTPException(status_code=404, detail="Rule not found")

    r.status = "active"
    db.flush()
    record(
        db,
        action="Rule updated",
        entity_title=r.title,
        entity_meta=r.code,
        user_id=user.id,
        brand=r.workspace or "PureGlow",
        details=f"Confirmed rule {r.code} (active)",
        entity_kind="rule",
        entity_id=r.id,
    )
    db.commit()
    db.refresh(r)
    return svc.rule_to_dict(r)


@router.post("/rules/{rule_id}/reject")
def reject_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_manager),
):
    r = db.get(models.Rule, rule_id)
    if not r:
        raise HTTPException(status_code=404, detail="Rule not found")

    r.status = "rejected"
    db.flush()
    record(
        db,
        action="Rule updated",
        entity_title=r.title,
        entity_meta=r.code,
        user_id=user.id,
        brand=r.workspace or "PureGlow",
        details=f"Rejected rule draft {r.code}",
        entity_kind="rule",
        entity_id=r.id,
    )
    db.commit()
    db.refresh(r)
    return svc.rule_to_dict(r)


@router.get("/rules/conflicts")
def rules_conflicts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ws = getattr(current_user, "workspace", "PureGlow")
    conflicts = svc.detect_conflicts(db, workspace=ws)
    # Optional AI explanation, grounded in the deterministic conflicts. Never
    # creates or resolves conflicts; the deterministic checker is authoritative.
    try:
        from .. import ai

        if ai.ai_available():
            for c in conflicts[:3]:
                if "ruleA" in c and "ruleB" in c:
                    note = ai.explain_conflict(c["ruleA"], c["ruleB"])
                    if note:
                        c["aiExplanation"] = note
    except Exception:
        pass
    return conflicts


@router.get("/rules/{rule_id}")
def get_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    r = db.get(models.Rule, rule_id)
    if not r:
        raise HTTPException(status_code=404, detail="Rule not found")
    return svc.rule_to_dict(r)
