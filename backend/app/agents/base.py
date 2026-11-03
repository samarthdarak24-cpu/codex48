"""Shared primitives for the tool layer.

A tool is *never* allowed to raise an arbitrary exception into the runtime: it
raises :class:`ToolError`, which the executor converts into a failed step with a
readable message. This keeps one misbehaving tool from aborting an entire run
with a stack trace.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.orm import Session

from ..models import User


class ToolError(Exception):
    """A handled, user-readable tool failure."""

    def __init__(self, message: str, *, code: str = "tool_error") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


@dataclass
class ToolContext:
    """Everything a tool may touch. No global state, no ambient authority."""

    db: Session
    user: User
    workspace: str
    input: dict[str, Any] = field(default_factory=dict)
    agent_id: str = ""
    run_id: str = ""
    approved: bool = False


@dataclass(frozen=True)
class ToolSpec:
    """The registry contract. The LLM may only choose ``id`` values from here."""

    id: str
    name: str
    description: str
    category: str
    permission: str  # read | draft | write
    approval_required: bool
    timeout_seconds: int
    input_schema: dict
    output_schema: dict
    executor: Any
    idempotent: bool = True

    def public(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "permission": self.permission,
            "approvalRequired": self.approval_required,
            "timeoutSeconds": self.timeout_seconds,
            "idempotent": self.idempotent,
            "inputSchema": self.input_schema,
            "outputSchema": self.output_schema,
        }
