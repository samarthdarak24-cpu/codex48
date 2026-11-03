"""Exception triage tools for Precedent Agent Studio."""
import time
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.agent_tools.base import AgentTool, ToolExecutionContext, ToolResult
from app.models import ExceptionRequest


class GetExceptionDetailsTool(AgentTool):
    id = "get_exception_details"
    name = "Get Exception Details"
    description = "Retrieves active and expired exception requests, conditions, expiry dates, and risk factors."
    category = "exceptions"
    permission_class = "read"
    requires_approval = False
    timeout_seconds = 15
    input_schema = {
        "type": "object",
        "properties": {
            "exception_id": {"type": "string", "description": "Optional specific exception request ID"},
            "rule_code": {"type": "string", "description": "Filter by rule code (e.g., CL-04)"},
            "status": {"type": "string", "description": "Filter by status (pending, Approved, Rejected, Expired)"},
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "exceptions": {"type": "array", "items": {"type": "object"}},
            "count": {"type": "integer"},
        },
    }

    def run(self, db: Session, inputs: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        t0 = time.time()
        exc_id = inputs.get("exception_id")
        rule_code = inputs.get("rule_code")
        status = inputs.get("status")

        q = db.query(ExceptionRequest).filter((ExceptionRequest.workspace == context.workspace) | (ExceptionRequest.workspace == 'PureGlow') | (ExceptionRequest.workspace.is_(None)))

        if exc_id:
            q = q.filter(ExceptionRequest.id == exc_id)
        if rule_code:
            q = q.filter(ExceptionRequest.rule_code == rule_code)
        if status:
            q = q.filter(ExceptionRequest.status.ilike(status))

        records = q.all()

        results = [
            {
                "id": e.id,
                "code": e.code,
                "content_title": e.content_title,
                "rule_code": e.rule_code,
                "rule_title": e.rule_title,
                "status": e.status,
                "reason": e.reason,
                "conditions": e.conditions,
                "scope": e.scope,
                "expires_at": str(e.expires_at) if hasattr(e, "expires_at") and e.expires_at else None,
            }
            for e in records
        ]

        summary = f"Retrieved {len(results)} exception records for workspace {context.workspace}."
        return ToolResult(
            success=True,
            data={"exceptions": results, "count": len(results)},
            summary=summary,
            ms=int((time.time() - t0) * 1000),
        )

