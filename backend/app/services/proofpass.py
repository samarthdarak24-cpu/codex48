"""ProofPass — Approval Passport Service.

Generates and verifies tamper-evident, cryptographically signed approval
certificates for approved content versions. Uses exact SHA-256 digests
along with perceptual hashing (pHash) via ImageHash to detect near-matches
(e.g., social platform recompression) with honest caveats.
"""
from __future__ import annotations

import hashlib
import io
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import jwt
from PIL import Image
from sqlalchemy.orm import Session

from ..config import settings
from ..ids import new_id
from .. import models
from .audit import record

try:
    import imagehash
except Exception:  # pragma: no cover
    imagehash = None

PASSPORT_ALGORITHM = "HS256"
PASSPORT_EXPIRY_DAYS = 90


def compute_file_hashes(file_path_or_bytes: str | bytes) -> dict[str, str]:
    """Compute SHA-256 and perceptual hashes (pHash, dHash) for media."""
    if isinstance(file_path_or_bytes, bytes):
        raw_bytes = file_path_or_bytes
        img_source = io.BytesIO(raw_bytes)
    else:
        with open(file_path_or_bytes, "rb") as f:
            raw_bytes = f.read()
        img_source = file_path_or_bytes

    sha256 = hashlib.sha256(raw_bytes).hexdigest()
    phash_str = ""
    dhash_str = ""

    if imagehash is not None:
        try:
            with Image.open(img_source) as img:
                phash_str = str(imagehash.phash(img))
                dhash_str = str(imagehash.dhash(img))
        except Exception:
            pass

    if not phash_str:
        try:
            if isinstance(file_path_or_bytes, bytes):
                src = io.BytesIO(file_path_or_bytes)
            else:
                src = file_path_or_bytes
            with Image.open(src) as img:
                thumb = img.convert("L").resize((8, 8), Image.Resampling.LANCZOS)
                pixels = list(thumb.getdata())
                avg = sum(pixels) / max(1, len(pixels))
                bits = "".join("1" if p > avg else "0" for p in pixels)
                phash_str = f"{int(bits, 2):016x}"
                dhash_str = phash_str
        except Exception:
            pass

    return {
        "sha256": sha256,
        "phash": phash_str,
        "dhash": dhash_str,
    }


def generate_passport(
    db: Session,
    submission_id: str,
    version_id: Optional[str] = None,
    user: Any = None,
) -> models.ApprovalPassport:
    # Resolve user if None or string
    if user is None:
        user = db.query(models.User).first()
    elif isinstance(user, str):
        found_user = db.query(models.User).filter(
            (models.User.email == user) | (models.User.name == user) | (models.User.id == user)
        ).first()
        user = found_user or db.query(models.User).first()

    # Resolve version_id if not supplied or if submission_id was actually a version
    if submission_id and submission_id.startswith("v_"):
        actual_ver = db.get(models.ContentVersion, submission_id)
        if actual_ver:
            version_id = actual_ver.id
            submission_id = actual_ver.submission_id

    if version_id is None:
        latest_ver = (
            db.query(models.ContentVersion)
            .filter(models.ContentVersion.submission_id == submission_id)
            .order_by(models.ContentVersion.version.desc())
            .first()
        )
        version_id = latest_ver.id if latest_ver else ""

    """Generate a signed approval passport for an exact approved version."""
    sub = db.get(models.Submission, submission_id)
    if sub is None:
        raise ValueError("Submission not found")
    if sub.status != "Approved":
        raise ValueError("Only Approved content versions can receive an Approval Passport")

    version = db.get(models.ContentVersion, version_id)
    if version is None or version.submission_id != submission_id:
        raise ValueError("Content version not found for this submission")

    # Find media file if poster
    file_path = None
    analysis = (
        db.query(models.AssetAnalysis)
        .filter(models.AssetAnalysis.submission_id == submission_id)
        .order_by(models.AssetAnalysis.created_at.desc())
        .first()
    )
    if analysis and analysis.file_path and os.path.exists(analysis.file_path):
        file_path = analysis.file_path

    if file_path:
        hashes = compute_file_hashes(file_path)
    else:
        text_bytes = (version.text or "").encode("utf-8")
        hashes = {
            "sha256": hashlib.sha256(text_bytes).hexdigest(),
            "phash": "",
            "dhash": "",
        }

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=PASSPORT_EXPIRY_DAYS)
    passport_id = new_id("pass")

    payload = {
        "iss": "Precedent Brand Governance",
        "sub": passport_id,
        "submission_id": sub.id,
        "version_id": version.id,
        "version_number": version.version,
        "brand": sub.brand,
        "sha256": hashes["sha256"],
        "phash": hashes["phash"],
        "approved_by": user.name or user.email,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }

    signed_token = jwt.encode(payload, settings.secret_key, algorithm=PASSPORT_ALGORITHM)

    passport = models.ApprovalPassport(
        id=passport_id,
        workspace=sub.workspace or "PureGlow",
        submission_id=sub.id,
        version_id=version.id,
        version_number=version.version,
        brand=sub.brand,
        title=sub.title,
        sha256=hashes["sha256"],
        phash=hashes["phash"],
        dhash=hashes["dhash"],
        token=signed_token,
        approved_by=user.name or user.email,
        status="active",
        created_at=now,
        expires_at=expires_at,
    )
    db.add(passport)

    record(
        db,
        action="Approved",
        entity_title=sub.title,
        entity_meta="ProofPass",
        brand=sub.brand,
        user_id=user.id,
        details=f"Issued ProofPass approval passport ({passport_id}).",
        entity_kind="passport",
        entity_id=passport_id,
        workspace=sub.workspace or "PureGlow",
    )
    db.commit()
    db.refresh(passport)
    return passport


def verify_passport(
    db: Session,
    token_or_id: str,
    probe_bytes: Optional[bytes] = None,
) -> dict[str, Any]:
    """Verify an approval passport and test probe media against certified hashes."""
    # Lookup by passport_id or decode token
    passport = db.get(models.ApprovalPassport, token_or_id)
    token = token_or_id
    if passport is None:
        try:
            payload = jwt.decode(token_or_id, settings.secret_key, algorithms=[PASSPORT_ALGORITHM])
            passport_id = payload.get("sub")
            if passport_id:
                passport = db.get(models.ApprovalPassport, passport_id)
        except Exception:
            return {
                "valid": False,
                "error": "Invalid or forged passport token",
                "verification": "FORGERY_OR_INVALID",
            }

    if passport is None:
        return {"valid": False, "error": "Passport certificate not found", "verification": "NOT_FOUND"}

    # Check status and expiry
    now = datetime.now(timezone.utc)
    if passport.status == "revoked":
        return {
            "valid": False,
            "status": "revoked",
            "revocationReason": passport.revocation_reason or "Revoked by brand compliance officer",
            "passportId": passport.id,
            "title": passport.title,
            "brand": passport.brand,
            "verification": "REVOKED",
        }

    # SQLite returns naive datetime in UTC, ensure timezone consistency
    exp = passport.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if now > exp:
        return {
            "valid": False,
            "status": "expired",
            "passportId": passport.id,
            "title": passport.title,
            "brand": passport.brand,
            "verification": "EXPIRED",
        }

    out = {
        "valid": True,
        "passportId": passport.id,
        "submissionId": passport.submission_id,
        "versionNumber": passport.version_number,
        "title": passport.title,
        "brand": passport.brand,
        "approvedBy": passport.approved_by,
        "certifiedSha256": passport.sha256,
        "certifiedPhash": passport.phash,
        "issuedAt": passport.created_at.isoformat() if passport.created_at else None,
        "expiresAt": passport.expires_at.isoformat() if passport.expires_at else None,
        "status": passport.status,
    }

    if probe_bytes:
        probe_hashes = compute_file_hashes(probe_bytes)
        out["probeSha256"] = probe_hashes["sha256"]
        out["probePhash"] = probe_hashes["phash"]

        if probe_hashes["sha256"] == passport.sha256:
            out["match"] = "IDENTICAL"
            out["matchConfidence"] = 1.0
            out["verification"] = "EXACT_BITWISE_MATCH"
            out["explanation"] = "File is bitwise identical to the exact approved campaign asset."
        elif passport.phash and probe_hashes["phash"] and imagehash is not None:
            cert_hash = imagehash.hex_to_hash(passport.phash)
            probe_hash = imagehash.hex_to_hash(probe_hashes["phash"])
            distance = cert_hash - probe_hash
            out["hammingDistance"] = distance

            if distance <= 6:
                confidence = max(0.0, round(1.0 - (distance / 32.0), 3))
                out["match"] = "VISUALLY_SIMILAR"
                out["matchConfidence"] = confidence
                out["verification"] = "PERCEPTUAL_NEAR_MATCH"
                out["caveat"] = (
                    "Perceptual visual match detected. File encoding, resolution, or compression "
                    "has shifted from the master copy, but core visual layout and content are preserved."
                )
            else:
                out["match"] = "MODIFIED"
                out["matchConfidence"] = 0.0
                out["verification"] = "MODIFIED_OR_MISMATCH"
                out["caveat"] = "File visuals differ significantly from the certified master copy."
        else:
            out["match"] = "DIFFERENT"
            out["matchConfidence"] = 0.0
            out["verification"] = "MODIFIED_OR_MISMATCH"
    else:
        out["verification"] = "CERTIFICATE_AUTHENTIC"

    return out


def revoke_passport(
    db: Session,
    passport_id: str,
    reason: str,
    user: models.User,
) -> models.ApprovalPassport:
    """Revoke an active passport."""
    passport = db.get(models.ApprovalPassport, passport_id)
    if passport is None:
        raise ValueError("Passport not found")

    passport.status = "revoked"
    passport.revocation_reason = reason or "Revoked by brand compliance manager"

    record(
        db,
        action="Rejected",
        entity_title=passport.title,
        entity_meta="ProofPass Revocation",
        brand=passport.brand,
        user_id=user.id,
        details=f"Revoked ProofPass {passport_id}: {passport.revocation_reason}",
        entity_kind="passport",
        entity_id=passport_id,
        workspace=passport.workspace or "PureGlow",
    )
    db.commit()
    db.refresh(passport)
    return passport
