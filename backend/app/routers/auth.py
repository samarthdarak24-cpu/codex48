"""Auth router: login, password-reset request, and current-user info.

Responses are plain dicts with camelCase keys, matching the frontend contract.
"""
from fastapi import APIRouter, Depends, HTTPException, status
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
    """Always report success so we never leak whether an email exists."""
    return {"sent": True}


@router.get("/me")
def me(user: models.User = Depends(get_current_user)) -> dict:
    return auth.get_user_out(user)
