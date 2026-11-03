"""N11 False-Positive feedback loop router: creator disputes and governance feedback."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user, require_manager
from .. import models
from ..ids import new_id
from ..services.audit import record

router = APIRouter()


class FeedbackIn(BaseModel):
    reason: str = "not_a_violation"  # not_a_violation | rule_unclear | exception_applies | other
    notes: str = ""


class FeedbackStatusIn(BaseModel):
    status: str  # under_review | converted_to_test | dismissed


def _serialize(fb: models.FindingFeedback, db: Session) -> dict:
    finding = db.get(models.Finding, fb.finding_id)
    return {
        "id": fb.id,
        "workspace": fb.workspace,
        "findingId": fb.finding_id,
        "submissionId": fb.submission_id,
        "ruleCode": fb.rule_code or (finding.rule_code if finding else ""),
        "ruleTitle": finding.rule_title if finding else "",
        "userId": fb.user_id,
        "userName": fb.user_name,
        "reason": fb.reason,
        "notes": fb.notes,
        "status": fb.status,
        "createdAt": fb.created_at.isoformat() if fb.created_at else None,
    }


@router.post("/submissions/findings/{finding_id}/feedback")
def submit_finding_feedback(
    finding_id: str,
    body: FeedbackIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> dict:
    """Submit creator dispute or clarification on a specific finding (N11)."""
    finding = db.get(models.Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    ws = current_user.workspace or "PureGlow"

    # Deduplicate: if this user already reported this finding, update notes/reason
    existing = (
        db.query(models.FindingFeedback)
        .filter(
            models.FindingFeedback.finding_id == finding_id,
            models.FindingFeedback.user_id == current_user.id,
        )
        .first()
    )

    if existing:
        existing.reason = body.reason
        existing.notes = body.notes.strip()
        db.commit()
        db.refresh(existing)
        return _serialize(existing, db)

    fb = models.FindingFeedback(
        id=new_id("fbk"),
        workspace=ws,
        finding_id=finding.id,
        submission_id=finding.submission_id,
        rule_code=finding.rule_code,
        user_id=current_user.id,
        user_name=current_user.name,
        reason=body.reason,
        notes=body.notes.strip(),
        status="submitted",
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    record(
        db,
        action="FindingFeedbackSubmitted",
        entity_title=f"Dispute on {finding.rule_code}",
        entity_meta=body.reason,
        brand=ws,
        user_id=current_user.id,
        details=f"User {current_user.name} reported finding {finding.id} ({finding.rule_code}): {body.notes[:80]}",
        entity_kind="feedback",
        entity_id=fb.id,
        workspace=ws,
    )

    return _serialize(fb, db)


@router.get("/feedback/reports")
def list_feedback_reports(
    db: Session = Depends(get_db),
    manager: models.User = Depends(require_manager),
) -> list[dict]:
    """List all creator feedback reports (Manager only)."""
    ws = manager.workspace or "PureGlow"
    reports = (
        db.query(models.FindingFeedback)
        .filter(
            (models.FindingFeedback.workspace == ws)
            | (models.FindingFeedback.workspace.is_(None))
        )
        .order_by(models.FindingFeedback.created_at.desc())
        .all()
    )
    return [_serialize(r, db) for r in reports]


@router.post("/feedback/{feedback_id}/status")
def update_feedback_status(
    feedback_id: str,
    body: FeedbackStatusIn,
    db: Session = Depends(get_db),
    manager: models.User = Depends(require_manager),
) -> dict:
    """Update review status of a feedback report (e.g. converted_to_test, dismissed)."""
    fb = db.get(models.FindingFeedback, feedback_id)
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback report not found")

    fb.status = body.status
    db.commit()
    db.refresh(fb)

    record(
        db,
        action="FindingFeedbackStatusUpdated",
        entity_title=f"Feedback {fb.rule_code}",
        entity_meta=body.status,
        brand=manager.workspace or "PureGlow",
        user_id=manager.id,
        details=f"Updated feedback {feedback_id} status to {body.status}",
        entity_kind="feedback",
        entity_id=fb.id,
        workspace=manager.workspace,
    )

    return _serialize(fb, db)
