"""Auth helpers: credential checks and camelCase serialization.

These keep the routers thin and guarantee the JSON shape the frontend expects
(camelCase keys, matching src/lib/types.ts).
"""
from sqlalchemy.orm import Session

from ..models import User
from ..schemas import user_to_out
from ..security import verify_password


def authenticate(db: Session, email: str, password: str) -> User | None:
    """Return the matching User for valid credentials, else None.

    The email is normalized (trim + lowercase) so case/whitespace in the
    submitted email does not break lookup.
    """
    normalized = (email or "").strip().lower()
    if not normalized or not password:
        return None
    user = db.query(User).filter(User.email == normalized).first()
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def get_user_out(user: User) -> dict:
    """Return a plain camelCase dict for a User (frontend expects camelCase)."""
    out = user_to_out(user)
    return {
        "id": out.id,
        "name": out.name,
        "email": out.email,
        "role": out.role,
        "title": out.title,
        "initials": out.initials,
        "avatarTone": out.avatarTone,
        "workspace": out.workspace,
        "workspaceStatus": out.workspaceStatus,
    }
