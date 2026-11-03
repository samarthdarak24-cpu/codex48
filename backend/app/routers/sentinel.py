"""A3 Sentinel endpoints — publications, reassessment tasks, notifications."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user, require_manager, require_workspace
from .. import models
from ..services import sentinel as svc

router = APIRouter(prefix="/sentinel", tags=["sentinel"])


def _ws(user) -> str:
    return getattr(user, "workspace", None) or "PureGlow"


# ---------------------------------------------------------------------------
# Publications
# ---------------------------------------------------------------------------

class PublishBody(BaseModel):
    submissionId: str
    channel: str = ""
    versionId: str | None = None


@router.post("/publications")
def mark_published(
    body: PublishBody,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sub = db.get(models.Submission, body.submissionId)
    if sub is None:
        raise HTTPException(404, "Submission not found")
    if sub.workspace and sub.workspace != _ws(current_user):
        raise HTTPException(403, "Not available in this workspace")
    if current_user.role != "manager" and sub.creator_id != current_user.id:
        raise HTTPException(403, "You can only publish your own content")
    if sub.status != "Approved":
        raise HTTPException(409, "Only approved content can be marked as published")

    version = None
    if body.versionId:
        version = db.get(models.ContentVersion, body.versionId)
        if version is None or version.submission_id != sub.id:
            raise HTTPException(404, "Version not found")
    elif sub.versions:
        version = max(sub.versions, key=lambda v: v.version)

    pub = svc.create_publication(
        db,
        submission_id=sub.id,
        version_id=version.id if version else None,
        channel=body.channel or sub.channel,
        user_id=current_user.id,
        workspace=_ws(current_user),
    )
    return {
        "id": pub.id,
        "submissionId": pub.submission_id,
        "versionId": pub.submission_version_id,
        "channel": pub.channel,
        "status": pub.status,
        "publishedAt": pub.published_at.isoformat() if pub.published_at else None,
        "publishedBy": pub.published_by,
    }


@router.get("/publications")
def publications(
    status: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Published versions Sentinel is watching — the blast radius of a rule edit."""
    return svc.list_publications(
        db, workspace=_ws(current_user), status=status, limit=limit
    )


@router.delete("/publications/{publication_id}")
def withdraw(
    publication_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    pub = db.get(models.Publication, publication_id)
    require_workspace(pub, current_user, detail="Publication not found")
    pub = svc.withdraw_publication(db, publication_id=publication_id, user_id=current_user.id)
    if pub is None:
        raise HTTPException(404, "Publication not found")
    return {"id": pub.id, "status": pub.status}


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

@router.get("/tasks")
def tasks(
    status: str | None = None,
    mine: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return svc.list_tasks(
        db,
        workspace=_ws(current_user),
        status=status,
        assignee_id=current_user.id if mine else None,
    )


@router.get("/tasks/{task_id}")
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    task_row = db.get(models.ReassessmentTask, task_id)
    require_workspace(task_row, current_user, detail="Task not found")
    return svc.task_to_dict(task_row)


@router.get("/impact-preview")
def impact_preview(
    trigger_ref: str = "",
    trigger_type: str = "rule_edited",
    rule_codes: str = "",
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    """Preview the blast radius of a policy change over live content.

    This replays the CURRENT active rule set against every published version
    (see `sentinel.find_affected`) and reports only versions that would
    *newly* become non-compliant. Pre-existing findings are already stored and
    are not counted again, so the number is a real delta rather than a
    restatement of the backlog.

    `totalPublishedChecked` is the number of `published` rows that were
    actually replayed; `blastRadiusCount` is how many of those would need
    reassessment. Both are measured, never estimated.
    """
    ws = _ws(current_user)
    pubs = svc.list_publications(db, workspace=ws, status="published", limit=200)

    codes = [c.strip() for c in (rule_codes or "").split(",") if c.strip()]

    # Real replay: only versions with NEW violations come back.
    affected = svc.find_affected(db, workspace=ws, rule_codes=codes or None)
    by_version = {a["versionId"]: a for a in affected if a.get("versionId")}
    by_submission = {a["submissionId"]: a for a in affected if a.get("submissionId")}

    sample_affected = []
    blast_radius = 0
    for pub in pubs:
        hit = by_version.get(pub.get("versionId")) or by_submission.get(pub.get("submissionId"))
        if hit:
            blast_radius += 1
        sample_affected.append({
            "publicationId": pub.get("id"),
            "submissionId": pub.get("submissionId"),
            "versionId": pub.get("versionId"),
            "title": pub.get("title"),
            "channel": pub.get("channel"),
            "publishedAt": pub.get("publishedAt"),
            "openTasks": pub.get("openTasks", 0),
            "newRuleCodes": hit.get("newRuleCodes", []) if hit else [],
            "impactAssessment": "needs_reassessment" if hit else "unaffected",
        })

    # Most-impacted first so the sample is useful.
    sample_affected.sort(key=lambda r: (-len(r["newRuleCodes"]), r["title"] or ""))

    return {
        "triggerRef": trigger_ref,
        "triggerType": trigger_type,
        "totalPublishedChecked": len(pubs),
        "blastRadiusCount": blast_radius,
        "sampleAffected": sample_affected[:5],
    }


class ResolveBody(BaseModel):
    resolution: str
    note: str = ""


@router.post("/tasks/{task_id}/resolve")
def resolve(
    task_id: str,
    body: ResolveBody,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # A reassessment task can be resolved by a manager or the assigned creator.
    task_row = db.get(models.ReassessmentTask, task_id)
    if task_row is None:
        if current_user.role != "manager":
            raise HTTPException(403, "Manager role required")
        raise HTTPException(404, "Task not found or already resolved")
    require_workspace(task_row, current_user, detail="Task not found or already resolved")
    if current_user.role != "manager" and task_row.assignee_id != current_user.id:
        raise HTTPException(403, "Only a manager or the task assignee may resolve this task")
    try:
        task = svc.resolve_task(
            db,
            task_id=task_id,
            resolution=body.resolution,
            note=body.note,
            user_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    if task is None:
        raise HTTPException(404, "Task not found or already resolved")
    return svc.task_to_dict(task)


@router.post("/scan")
def scan(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    """Check now: close lapsed exceptions, then forecast what expires soon."""
    ws = _ws(current_user)
    lapsed = svc.lapse_exceptions(db, workspace=ws, actor_id=current_user.id)
    forecast = svc.scan_expiring(db, workspace=ws, days=days)
    return {**forecast, "lapsed": lapsed}


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

@router.get("/notifications")
def notifications(
    unreadOnly: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return svc.list_notifications(
        db, user_id=current_user.id, workspace=_ws(current_user), unread_only=unreadOnly
    )


@router.get("/notifications/unread-count")
def unread(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return {"count": svc.unread_count(db, user_id=current_user.id, workspace=_ws(current_user))}


@router.post("/notifications/{notification_id}/read")
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from datetime import datetime, timezone

    n = db.get(models.Notification, notification_id)
    if n is None or n.user_id != current_user.id:
        raise HTTPException(404, "Notification not found")
    if n.read_at is None:
        n.read_at = datetime.now(timezone.utc)
        db.commit()
    return svc.notification_to_dict(n)


@router.post("/notifications/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from datetime import datetime, timezone

    rows = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.read_at.is_(None),
        )
        .all()
    )
    now = datetime.now(timezone.utc)
    for n in rows:
        n.read_at = now
    db.commit()
    return {"marked": len(rows)}
