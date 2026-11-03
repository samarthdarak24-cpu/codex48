"""Auth router: login, password-reset request, and current-user info.

Responses are plain dicts with camelCase keys, matching the frontend contract.
"""
import logging
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..deps import get_current_user
from ..schemas import LoginRequest
from ..security import create_token, verify_password
from ..services import auth
from ..services.audit import record

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)) -> dict:
    t_start = time.perf_counter()
    
    # 1. DB User Lookup
    t_db_start = time.perf_counter()
    normalized = (body.email or "").strip().lower()
    user = db.query(models.User).filter(models.User.email == normalized).first()
    t_db_elapsed = (time.perf_counter() - t_db_start) * 1000

    # 2. Password Check
    t_pw_start = time.perf_counter()
    valid_password = bool(user and user.password_hash and verify_password(body.password, user.password_hash))
    t_pw_elapsed = (time.perf_counter() - t_pw_start) * 1000

    if not user or not valid_password:
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
        t_total_elapsed = (time.perf_counter() - t_start) * 1000
        logger.warning(
            f"[AUTH TIMING] FAILED login for '{body.email}' | "
            f"Total: {t_total_elapsed:.1f}ms | DB: {t_db_elapsed:.1f}ms | PW_Check: {t_pw_elapsed:.1f}ms"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # 3. Token Generation
    t_tok_start = time.perf_counter()
    token = create_token(user.id, user.role)
    t_tok_elapsed = (time.perf_counter() - t_tok_start) * 1000

    # 4. Audit Log Write
    t_audit_start = time.perf_counter()
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
    t_audit_elapsed = (time.perf_counter() - t_audit_start) * 1000

    t_total_elapsed = (time.perf_counter() - t_start) * 1000
    logger.info(
        f"[AUTH TIMING] SUCCESS login for '{user.email}' ({user.role}) | "
        f"Total: {t_total_elapsed:.1f}ms | "
        f"DB Lookup: {t_db_elapsed:.1f}ms | "
        f"Password Verify: {t_pw_elapsed:.1f}ms | "
        f"Token: {t_tok_elapsed:.1f}ms | "
        f"Audit Write: {t_audit_elapsed:.1f}ms"
    )

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
    """Always report success so we never leak whether an email exists."""
    return {"sent": True}


@router.get("/me")
def me(user: models.User = Depends(get_current_user)) -> dict:
    return auth.get_user_out(user)
