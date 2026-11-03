"""Audit and notification tools for Precedent Agent Studio."""
import time
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.agent_tools.base import AgentTool, ToolExecutionContext, ToolResult
from app.models import AuditEvent, Notification, User, utcnow


class GetAuditHistoryTool(AgentTool):
    id = "get_audit_history"
    name = "Get Audit History"
    description = "Queries governance audit events and activity logs across the workspace."
    category = "audit"
    permission_class = "read"
    requires_approval = False
    timeout_seconds = 15
    input_schema = {
        "type": "object",
        "properties": {
            "action": {"type": "string", "description": "Filter by action name (e.g., Login, Review, Exception)"},
            "limit": {"type": "integer", "default": 20, "description": "Maximum records to return"},
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "events": {"type": "array", "items": {"type": "object"}},
            "count": {"type": "integer"},
        },
    }

    def run(self, db: Session, inputs: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        t0 = time.time()
        action = inputs.get("action")
        limit = int(inputs.get("limit", 20))

        q = db.query(AuditEvent).filter(AuditEvent.workspace == context.workspace)
        if action:
            q = q.filter(AuditEvent.action.ilike(f"%{action}%"))

        events = q.order_by(desc(AuditEvent.created_at)).limit(limit).all()

        results = [
            {
                "id": ev.id,
                "action": ev.action,
                "actor_type": ev.actor_type,
                "resource_type": ev.resource_type,
                "resource_id": ev.resource_id,
                "timestamp": str(ev.created_at),
            }
            for ev in events
        ]

        summary = f"Retrieved {len(results)} audit log events for workspace {context.workspace}."
        return ToolResult(
            success=True,
            data={"events": results, "count": len(results)},
            summary=summary,
            ms=int((time.time() - t0) * 1000),
        )


class CreateNotificationTool(AgentTool):
    id = "create_notification"
    name = "Create Notification"
    description = "Dispatches an in-app alert or notification to brand managers or creators."
    category = "audit"
    permission_class = "action"
    requires_approval = True
    timeout_seconds = 15
    input_schema = {
        "type": "object",
        "required": ["title", "body"],
        "properties": {
            "title": {"type": "string", "description": "Notification heading"},
            "body": {"type": "string", "description": "Notification details"},
            "user_id": {"type": "string", "description": "Target user ID (if omitted, notifies workspace managers)"},
            "type": {"type": "string", "default": "system"},
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "notification_id": {"type": "string"},
            "recipient_count": {"type": "integer"},
            "status": {"type": "string"},
        },
    }

    def run(self, db: Session, inputs: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        t0 = time.time()
        title = inputs.get("title", "Agent Notification")
        body = inputs.get("body", "")
        user_id = inputs.get("user_id")
        notif_type = inputs.get("type", "system")

        if context.approval_required_for_write:
            return ToolResult(
                success=True,
                requires_approval=True,
                approval_action_type="create_notification",
                approval_payload={
                    "title": title,
                    "body": body,
                    "user_id": user_id,
                    "type": notif_type,
                },
                summary=f"Staged notification '{title}'. Pausing for Brand Manager approval.",
                ms=int((time.time() - t0) * 1000),
            )

        target_user = None
        if user_id:
            target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user:
            target_user = db.query(User).filter(
                User.workspace == context.workspace,
                User.role == "manager"
            ).first()

        if not target_user:
            return ToolResult(
                success=False,
                error="No target user found to receive notification.",
                ms=int((time.time() - t0) * 1000),
            )

        notif_id = str(uuid.uuid4())
        notif = Notification(
            id=notif_id,
            user_id=target_user.id,
            type=notif_type,
            title=title,
            body=body,
            idempotency_key=f"agent-{notif_id[:8]}",
            created_at=utcnow(),
        )
        db.add(notif)
        db.commit()

        return ToolResult(
            success=True,
            data={"notification_id": notif_id, "recipient_count": 1, "status": "dispatched"},
            summary=f"Notification dispatched to {target_user.name} ({target_user.email}).",
            ms=int((time.time() - t0) * 1000),
        )

