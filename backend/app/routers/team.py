"""Team router: list workspace users.

Auth required. Returns camelCase user dicts ordered by name.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..deps import get_current_user
from ..services import auth

router = APIRouter(prefix="/team", tags=["team"])


@router.get("")
def list_team(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list:
    # Workspace isolation: never expose members of another workspace.
    ws = current_user.workspace or "PureGlow"
    users = (
        db.query(models.User)
        .filter((models.User.workspace == ws) | (models.User.workspace.is_(None)))
        .order_by(models.User.name)
        .all()
    )
    return [auth.get_user_out(u) for u in users]
