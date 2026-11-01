"""Auth router: login, password-reset request, and current-user info.

Responses are plain dicts with camelCase keys, matching the frontend contract.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..deps import get_current_user
from ..schemas import LoginRequest
from ..security import create_token
from ..services import auth

from ..services.audit import record

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)) -> dict:
    user = auth.authenticate(db, body.email, body.password)
    if not user:
        record(
            db,
            action="Security Event",
            entity_title="Failed login attempt",
            entity_meta=body.email,
            brand="System",
            user_id="anonymous",
            details=f"Failed login attempt for email {body.email}",
            status="Warning",
            entity_kind="security",
            entity_id="",
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    record(
        db,
        action="Login",
        entity_title=f"{user.name} signed in",
        entity_meta=user.workspace,
        brand=user.workspace,
        user_id=user.id,
        details=f"User {user.email} signed in ({user.role})",
        status="Recorded",
        entity_kind="auth",
        entity_id=user.id,
    )
    db.commit()
    token = create_token(user.id, user.role)
    return {"token": token, "user": auth.get_user_out(user)}


@router.post("/logout")
def logout(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    record(
        db,
        action="Logout",
        entity_title=f"{user.name} signed out",
        entity_meta=user.workspace,
        brand=user.workspace,
        user_id=user.id,
        details=f"User {user.email} signed out",
        status="Recorded",
        entity_kind="auth",
        entity_id=user.id,
    )
    db.commit()
    return {"success": True, "message": "Logged out successfully"}


@router.post("/request-reset")
def request_reset(body: dict, db: Session = Depends(get_db)) -> dict:
    """Record a password-reset request for a workspace administrator.

    This build sends no email. Rather than pretend it did, the request is
    written to the audit log so an administrator can act on it, and the
    response says so. The reply is identical whether or not the address
    exists, so the endpoint cannot be used to enumerate accounts.
    """
    email = str(body.get("email") or "").strip().lower()
    user = (
        db.query(models.User).filter(func.lower(models.User.email) == email).first()
        if email
        else None
    )
    if user is not None:
        record(
            db,
            action="Password reset requested",
            entity_title=f"{user.name} requested a password reset",
            entity_meta=user.workspace,
            brand=user.workspace,
            user_id=user.id,
            details=f"Reset requested for {user.email}; no email delivery is configured in this build.",
            status="Pending",
            entity_kind="auth",
            entity_id=user.id,
        )
        db.commit()
    return {"sent": True, "delivery": "administrator"}


@router.get("/me")
def me(user: models.User = Depends(get_current_user)) -> dict:
    return auth.get_user_out(user)


@router.get("/me/export")
def export_user_data(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """N18 User privacy and data controls: export personal submissions, comments, and audit records."""
    # 1. User profile
    profile = auth.get_user_out(user)

    # 2. Submissions created by this user
    subs = db.query(models.Submission).filter(models.Submission.creator_id == user.id).all()
    submissions_data = [
        {
            "id": s.id,
            "code": s.code,
            "title": s.title,
            "type": s.type,
            "channel": s.channel,
            "brand": s.brand,
            "status": s.status,
            "version": s.version,
            "createdAt": s.created_at.isoformat() if s.created_at else None,
            "updatedAt": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in subs
    ]

    # 3. Comments made by this user
    comments = db.query(models.Comment).filter(models.Comment.author_id == user.id).all()
    comments_data = [
        {
            "id": c.id,
            "submissionId": c.submission_id,
            "body": c.body,
            "createdAt": c.created_at.isoformat() if c.created_at else None,
        }
        for c in comments
    ]

    # 4. Audit events involving this user
    audits = db.query(models.AuditEvent).filter(models.AuditEvent.user_id == user.id).all()
    audit_data = [
        {
            "id": a.id,
            "action": a.action,
            "entityTitle": a.entity_title,
            "at": a.at.isoformat() if a.at else None,
            "details": a.details,
        }
        for a in audits
    ]

    # 5. Notifications for this user
    notifications = db.query(models.Notification).filter(models.Notification.user_id == user.id).all()
    notifications_data = [
        {
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "readAt": n.read_at.isoformat() if n.read_at else None,
            "createdAt": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]

    record(
        db,
        action="UserDataExported",
        entity_title=f"GDPR/DPDP export for {user.name}",
        entity_meta=user.email,
        brand=user.workspace or "PureGlow",
        user_id=user.id,
        details=f"User {user.email} downloaded complete personal data export package.",
        entity_kind="privacy",
        entity_id=user.id,
        workspace=user.workspace or "PureGlow",
    )
    db.commit()

    return {
        "exportFormat": "Precedent GDPR/DPDP Compliant Data Package v1.0",
        "exportedAt": models.utcnow().isoformat(),
        "user": profile,
        "submissions": submissions_data,
        "comments": comments_data,
        "notifications": notifications_data,
        "auditLogCount": len(audit_data),
        "auditLogs": audit_data,
    }
