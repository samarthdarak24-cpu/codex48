"""Sentinel impact and reassessment tools for Precedent Agent Studio."""
import time
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.agent_tools.base import AgentTool, ToolExecutionContext, ToolResult
from app.models import ReassessmentTask, Submission, SubmissionVersion, utcnow


class CreateSentinelTaskTool(AgentTool):
    id = "create_sentinel_task"
    name = "Create Sentinel Reassessment Task"
    description = "Prepares a Sentinel reassessment task for content affected by changed guidelines or rules."
    category = "sentinel"
    permission_class = "action"
    requires_approval = True
    timeout_seconds = 20
    input_schema = {
        "type": "object",
        "required": ["submission_id", "reason"],
        "properties": {
            "submission_id": {"type": "string", "description": "The affected submission ID"},
            "reason": {"type": "string", "description": "Trigger rationale or changed rule reference"},
            "priority": {"type": "string", "default": "High", "enum": ["Low", "Medium", "High", "Critical"]},
            "recommended_steps": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Recommended steps to resolve the compliance issue",
            },
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "task_id": {"type": "string"},
            "submission_id": {"type": "string"},
            "status": {"type": "string"},
        },
    }

    def run(self, db: Session, inputs: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        t0 = time.time()
        sub_id = inputs.get("submission_id")
        reason = inputs.get("reason", "Rule update impact")
        priority = inputs.get("priority", "High")
        recommended_steps = inputs.get("recommended_steps", ["Re-evaluate content against updated policy"])

        sub = db.query(Submission).filter(
            Submission.workspace == context.workspace,
            Submission.id == sub_id
        ).first()

        if not sub:
            return ToolResult(
                success=False,
                error=f"Submission {sub_id} not found in workspace {context.workspace}",
                ms=int((time.time() - t0) * 1000),
            )

        if context.approval_required_for_write:
            return ToolResult(
                success=True,
                requires_approval=True,
                approval_action_type="create_sentinel_task",
                approval_payload={
                    "submission_id": sub.id,
                    "submission_title": sub.title,
                    "priority": priority,
                    "reason": reason,
                    "recommended_steps": recommended_steps,
                },
                summary=f"Staged Sentinel reassessment task for '{sub.title}'. Pausing for Brand Manager approval.",
                ms=int((time.time() - t0) * 1000),
            )

        task_id = str(uuid.uuid4())
        task = ReassessmentTask(
            id=task_id,
            workspace_id=context.workspace,
            submission_id=sub.id,
            submission_version_id=sub.current_version_id or f"{sub.id}:v1",
            trigger_type="rule_edited",
            trigger_ref=reason,
            priority=priority,
            status="open",
            recommended_steps=recommended_steps,
            created_at=utcnow(),
        )
        db.add(task)
        db.commit()

        return ToolResult(
            success=True,
            data={"task_id": task_id, "submission_id": sub.id, "status": "open"},
            summary=f"Created Sentinel task {task_id[:8]} for '{sub.title}'.",
            ms=int((time.time() - t0) * 1000),
        )

