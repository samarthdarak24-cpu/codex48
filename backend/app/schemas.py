"""Auth + common Pydantic schemas.

Response models use camelCase field names so the JSON matches the frontend
types.ts contract exactly.
"""
from typing import Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    title: str
    initials: str
    avatarTone: str
    workspace: str
    workspaceStatus: str


class TokenOut(BaseModel):
    token: str
    user: UserOut


class MessageOut(BaseModel):
    ok: bool = True
    message: str = ""


class ErrorOut(BaseModel):
    detail: str


def user_to_out(u) -> UserOut:
    return UserOut(
        id=u.id,
        name=u.name,
        email=u.email,
        role=u.role,
        title=u.title,
        initials=u.initials,
        avatarTone=u.avatar_tone,
        workspace=u.workspace,
        workspaceStatus=u.workspace_status,
    )
