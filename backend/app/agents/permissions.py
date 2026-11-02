"""Row- and role-level authorisation for Agent Studio."""
from __future__ import annotations

from fastapi import HTTPException, status

from ..models import User
from .models import StudioAgent


def is_manager(user: User) -> bool:
    return user.role == "manager"


def assert_manager(user: User) -> None:
    if not is_manager(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a Brand Manager can manage organisation-wide agents.",
        )


def assert_agent_visible(agent: StudioAgent | None, user: User) -> StudioAgent:
    """404 for a missing row *or* a row in another workspace."""
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    if agent.workspace != (user.workspace or "PureGlow"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return agent


def assert_can_manage(agent: StudioAgent | None, user: User) -> StudioAgent:
    agent = assert_agent_visible(agent, user)
    assert_manager(user)
    return agent


def assert_can_use(agent: StudioAgent, user: User) -> None:
    """Creators may only run published agents; managers may run drafts for testing."""
    if is_manager(user):
        return
    if agent.status != "published":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This assistant is not published yet.",
        )


def assert_can_view_runs(agent: StudioAgent, user: User) -> None:
    if is_manager(user):
        return
    if agent.status != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
