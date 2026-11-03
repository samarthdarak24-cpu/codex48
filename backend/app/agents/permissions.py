"""Permissions and Workspace Isolation for Precedent Agent Studio."""
from app.errors import ForbiddenException
from app.models import User


def check_agent_access(agent_workspace: str, user: User) -> None:
    """Enforces workspace boundary isolation."""
    if agent_workspace != user.workspace:
        raise ForbiddenException("Access denied: Agent belongs to another workspace.")


def require_agent_authoring_permission(user: User) -> None:
    """Ensures only authorized Brand Managers can create, edit, or publish agents."""
    if user.role != "manager":
        raise ForbiddenException("Creators do not have permission to build, edit, or publish agents.")


def require_approval_permission(user: User) -> None:
    """Ensures only Brand Managers can approve or reject protected write actions."""
    if user.role != "manager":
        raise ForbiddenException("Only Brand Managers can decide approval requests.")

