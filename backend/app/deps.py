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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
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
