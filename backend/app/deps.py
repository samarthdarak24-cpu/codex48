"""Auth dependencies: bearer token resolution and role-based access control."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import User
from .security import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(creds.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = db.get(User, payload["sub"])
    if not user:
        # The token is well-formed but its account no longer exists (e.g. the
        # database was reseeded). Tell the client to re-authenticate.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired — please sign in again.",
        )
    return user


def require_manager(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    if user.role != "manager":
        from .services.audit import record
        try:
            record(
                db,
                action="Security Event",
                entity_title="Unauthorized manager access attempt",
                entity_meta=user.role,
                brand=user.workspace,
                user_id=user.id,
                details=f"User {user.email} with role '{user.role}' attempted manager-restricted action",
                status="Blocked",
                entity_kind="security",
                entity_id=user.id,
            )
            db.commit()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager role required")
    return user


def require_workspace(row, user: User, *, shared: bool = False, detail: str = "Not found") -> None:
    """Assert that a row belongs to the caller's workspace, or 404.

    Row-level authorisation is separate from role checks: a manager in
    workspace A must not read or mutate a row in workspace B just because they
    know its id. Call this immediately after loading a row by id.

    `shared` mirrors how the corresponding list endpoint treats NULL rows:
      shared=True  -> NULL is global/shared (guidelines, rules, claims)
      shared=False -> NULL is PureGlow-only (submissions, assets, exceptions)
    The 404 (not 403) is deliberate: it does not confirm that the id exists.
    """
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

    ws = getattr(user, "workspace", None) or "PureGlow"
    row_ws = getattr(row, "workspace", None)

    if row_ws is None:
        if shared or ws == "PureGlow":
            return
    elif row_ws == ws:
        return

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
