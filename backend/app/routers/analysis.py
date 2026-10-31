"""A1 VisualGuard endpoints — poster upload, analysis status, results.

Upload returns immediately with status "pending"; the analyser runs as a
FastAPI background task and the frontend polls `GET /analysis/{id}` every two
seconds (blueprint 3.5). Nothing about a poster is guessed: if an analyser
cannot measure a fact, the fact is absent and the rule engine reports
"Needs review".
"""
from __future__ import annotations

import io
import os

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user, require_workspace
from .. import models
from ..services import submissions as sub_svc
from ..services.audit import record
from ..services.visual import pipeline as visual

router = APIRouter(prefix="/analysis", tags=["visualguard"])

ALLOWED = {".png", ".jpg", ".jpeg", ".webp"}
MAX_BYTES = 10 * 1024 * 1024


def _magic_ok(content: bytes) -> bool:
    """Trust magic bytes, not the extension (blueprint 3.2)."""
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    if content.startswith(b"\xff\xd8\xff"):
        return True
    if content.startswith(b"RIFF") and b"WEBP" in content[:16]:
        return True
    return False


@router.post("/upload")
def upload_poster(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    submission_id: str | None = Form(None),
    title: str = Form(""),
    channel: str = Form("Social Media"),
    brand: str = Form("PureGlow"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Store the poster, create the analysis row, return immediately."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED:
        raise HTTPException(415, f"Unsupported image type '{ext}'. Allowed: {', '.join(sorted(ALLOWED))}")

    content = file.file.read()
    if not content:
        raise HTTPException(400, "The uploaded file is empty.")
    if len(content) > MAX_BYTES:
        raise HTTPException(413, "Image exceeds the 10MB limit.")
    if not _magic_ok(content):
        raise HTTPException(400, "File header does not match a supported image format.")

    # Magic bytes can be forged or the payload truncated after them. Parse the
    # image header *before* creating a submission, so an unreadable file never
    # leaves an orphan record (and an empty review card) behind.
    try:
        with Image.open(io.BytesIO(content)) as probe:
            probe.size  # noqa: B018 - forces the header parse
    except Exception:
        raise HTTPException(400, "That file is not a readable image. Re-export it and try again.")

    os.makedirs(settings.uploads_dir, exist_ok=True)
    import uuid

    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.uploads_dir, name)
    with open(path, "wb") as out:
        out.write(content)

    ws = getattr(current_user, "workspace", "PureGlow") or "PureGlow"

    sub: models.Submission | None = None
    if submission_id:
        sub = db.get(models.Submission, submission_id)
        require_workspace(sub, current_user, detail="Submission not found")
        if sub.creator_id != current_user.id and current_user.role != "manager":
            raise HTTPException(403, "You can only attach a poster to your own submission")
    else:
        sub = sub_svc.create_submission(
            db,
            title=title or (file.filename or "Poster"),
            excerpt="Poster uploaded for visual analysis.",
            type="Image",
            channel=channel,
            brand=brand,
            text="",
            asset=None,
            thumb={"kind": "art", "palette": "lime", "glyph": "leaf"},
            creator_id=current_user.id,
            workspace=ws,
        )

    sub.asset_url = f"/analysis/{sub.id}/file"
    sub.asset_name = file.filename or "Poster"
    db.commit()

    analysis = visual.create_analysis(
        db, file_path=path, workspace=ws, user_id=current_user.id, submission_id=sub.id
    )

    record(
        db,
        action="Revised",
        entity_title=sub.title,
        entity_meta="Poster",
        brand=sub.brand,
        user_id=current_user.id,
        details="Uploaded poster for visual analysis.",
        entity_kind="analysis",
        entity_id=analysis.id,
        workspace=ws,
    )
    db.commit()

    background.add_task(visual.analyze_asset_detached, analysis.id)

    return {
        "analysisId": analysis.id,
        "submissionId": sub.id,
        "status": analysis.status,
    }


@router.get("/{analysis_id}")
def get_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    a = db.get(models.AssetAnalysis, analysis_id)
    require_workspace(a, current_user, detail="Analysis not found")
    payload = visual.analysis_to_dict(a)
    if a.submission_id:
        sub = db.get(models.Submission, a.submission_id)
        if sub is not None:
            payload["submission"] = sub_svc.submission_to_dict(sub)
    return payload


@router.get("/submission/{submission_id}")
def latest_for_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = (
        db.query(models.AssetAnalysis)
        .filter(models.AssetAnalysis.submission_id == submission_id)
        .order_by(models.AssetAnalysis.created_at.desc())
        .first()
    )
    require_workspace(row, current_user, detail="No analysis for this submission")
    return visual.analysis_to_dict(row)


@router.get("/{submission_id}/file")
def get_poster(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = (
        db.query(models.AssetAnalysis)
        .filter(models.AssetAnalysis.submission_id == submission_id)
        .order_by(models.AssetAnalysis.created_at.desc())
        .first()
    )
    require_workspace(row, current_user, detail="Poster file not found")
    if not row.file_path or not os.path.exists(row.file_path):
        raise HTTPException(404, "Poster file not found")
    return FileResponse(row.file_path, media_type="application/octet-stream")


@router.post("/{analysis_id}/rerun")
def rerun(
    analysis_id: str,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    a = db.get(models.AssetAnalysis, analysis_id)
    require_workspace(a, current_user, detail="Analysis not found")
    a.status = "pending"
    a.error = None
    db.commit()
    background.add_task(visual.analyze_asset_detached, a.id)
    return {"analysisId": a.id, "status": "pending"}
