"""ProofPass Router — Approval Passport issuance, public verification, and revocation."""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user, require_manager
from .. import models
from ..services import proofpass as svc

router = APIRouter(tags=["proofpass"])


class GeneratePassportBody(BaseModel):
    submissionId: str
    versionId: Optional[str] = None


class RevokePassportBody(BaseModel):
    reason: str


@router.post("/generate")
def issue_passport(
    body: GeneratePassportBody,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager),
):
    """Issue a signed ProofPass certificate for an approved content version."""
    sub = db.get(models.Submission, body.submissionId)
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Submission not found")

    version_id = body.versionId
    if not version_id and sub.versions:
        version_id = max(sub.versions, key=lambda v: v.version).id

    if not version_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No content version found")

    try:
        passport = svc.generate_passport(db, sub.id, version_id, current_user)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    return {
        "id": passport.id,
        "submissionId": passport.submission_id,
        "versionNumber": passport.version_number,
        "brand": passport.brand,
        "title": passport.title,
        "sha256": passport.sha256,
        "phash": passport.phash,
        "token": passport.token,
        "approvedBy": passport.approved_by,
        "status": passport.status,
        "expiresAt": passport.expires_at.isoformat(),
    }


@router.get("")
def list_passports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all approval passports for the current workspace."""
    ws = getattr(current_user, "workspace", "PureGlow") or "PureGlow"
    passports = (
        db.query(models.ApprovalPassport)
        .filter(models.ApprovalPassport.workspace == ws)
        .order_by(models.ApprovalPassport.created_at.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "submissionId": p.submission_id,
            "versionNumber": p.version_number,
            "brand": p.brand,
            "title": p.title,
            "sha256": p.sha256,
            "phash": p.phash,
            "token": p.token,
            "approvedBy": p.approved_by,
            "status": p.status,
            "revocationReason": p.revocation_reason,
            "createdAt": p.created_at.isoformat() if p.created_at else None,
            "expiresAt": p.expires_at.isoformat() if p.expires_at else None,
        }
        for p in passports
    ]


@router.get("/{passport_id}")
def get_passport(
    passport_id: str,
    db: Session = Depends(get_db),
):
    """Get public certificate details for an approval passport."""
    passport = db.get(models.ApprovalPassport, passport_id)
    if not passport:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Passport not found")

    return {
        "id": passport.id,
        "submissionId": passport.submission_id,
        "versionNumber": passport.version_number,
        "brand": passport.brand,
        "title": passport.title,
        "sha256": passport.sha256,
        "phash": passport.phash,
        "approvedBy": passport.approved_by,
        "status": passport.status,
        "createdAt": passport.created_at.isoformat() if passport.created_at else None,
        "expiresAt": passport.expires_at.isoformat() if passport.expires_at else None,
    }


@router.get("/verify/{passportIdOrToken}")
def verify_passport_get(
    passportIdOrToken: str,
    db: Session = Depends(get_db),
):
    """Public verification GET endpoint: checks certificate authenticity."""
    return svc.verify_passport(db, passportIdOrToken, probe_bytes=None)


@router.post("/verify")
def verify_passport_endpoint(
    passportIdOrToken: str = Form(...),
    probeFile: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """Public verification endpoint: checks certificate authenticity and tests probe image."""
    probe_bytes = None
    if probeFile is not None:
        probe_bytes = probeFile.file.read()

    result = svc.verify_passport(db, passportIdOrToken, probe_bytes=probe_bytes)
    return result


@router.post("/{passport_id}/revoke")
def revoke_passport_endpoint(
    passport_id: str,
    body: RevokePassportBody,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager),
):
    """Revoke an approval passport when policy or campaign state changes."""
    try:
        passport = svc.revoke_passport(db, passport_id, body.reason, current_user)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))

    return {
        "id": passport.id,
        "status": passport.status,
        "revocationReason": passport.revocation_reason,
    }
