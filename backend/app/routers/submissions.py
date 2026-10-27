"""Submissions + Review router (CONTRACT.md §Submissions)."""
from fastapi import APIRouter, Depends, HTTPException, status as http_status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..deps import get_current_user, require_manager
from ..services import submissions as svc

router = APIRouter(prefix="/submissions", tags=["submissions"])


class SubmissionIn(BaseModel):
    title: str
    excerpt: str = ""
    type: str = "Text"
    channel: str = ""
    brand: str = "PureGlow"
    text: str = ""
    asset: dict | None = None
    thumb: dict | None = None
    assetId: str | None = None


class VersionIn(BaseModel):
    text: str
    note: str = ""


class CommentIn(BaseModel):
    body: str


class DecideIn(BaseModel):
    action: str
    note: str = ""
    # The version the manager actually reviewed. If it no longer matches the
    # current version, the decision is rejected (409) rather than silently
    # applying to content the reviewer never saw.
    version: int | None = None


def _is_owner_or_manager(sub: models.Submission, user: models.User) -> bool:
    return user.role == "manager" or sub.creator_id == user.id


@router.get("")
def list_submissions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.Submission)
    if current_user.workspace:
        query = query.filter(
            (models.Submission.workspace == current_user.workspace)
            | (models.Submission.workspace.is_(None) if current_user.workspace == "PureGlow" else False)
        )
    if current_user.role == "creator":
        query = query.filter(models.Submission.creator_id == current_user.id)
    subs = query.order_by(models.Submission.updated_at.desc()).all()
    return [svc.submission_to_dict(s) for s in subs]


@router.get("/{sub_id}")
def get_submission(
    sub_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sub = db.get(models.Submission, sub_id)
    if not sub:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if sub.workspace and current_user.workspace and sub.workspace != current_user.workspace:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if current_user.role == "creator" and sub.creator_id != current_user.id:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Not allowed")
    return svc.submission_to_dict(sub)


@router.post("")
def create_submission(
    body: SubmissionIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    thumb = body.thumb or {"kind": "art", "palette": "lime", "glyph": "leaf"}
    sub = svc.create_submission(
        db,
        title=body.title,
        excerpt=body.excerpt,
        type=body.type,
        channel=body.channel,
        brand=body.brand,
        text=body.text,
        asset=body.asset,
        thumb=thumb,
        creator_id=current_user.id,
        asset_id=body.assetId,
        workspace=current_user.workspace,
    )
    return svc.submission_to_dict(sub)


@router.post("/{sub_id}/versions")
def add_version(
    sub_id: str,
    body: VersionIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sub = db.get(models.Submission, sub_id)
    if not sub:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if not _is_owner_or_manager(sub, current_user):
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Not allowed")
    result = svc.add_version(db, sub_id, body.text, body.note, current_user.id)
    return svc.submission_to_dict(result)


@router.post("/{sub_id}/comments")
def add_comment(
    sub_id: str,
    body: CommentIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sub = db.get(models.Submission, sub_id)
    if not sub:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if not _is_owner_or_manager(sub, current_user):
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Not allowed")
    result = svc.add_comment(db, sub_id, body.body, current_user.id)
    return svc.submission_to_dict(result)


@router.post("/{sub_id}/decide")
def decide(
    sub_id: str,
    body: DecideIn,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    sub = db.get(models.Submission, sub_id)
    if not sub:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if body.version is not None and body.version != sub.version:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=(
                f"Version changed: you reviewed v{body.version} but the current version is "
                f"v{sub.version}. Reload before deciding."
            ),
        )
    result = svc.decide(db, sub_id, body.action, body.note, current_user.id)
    if not result:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return svc.submission_to_dict(result)
