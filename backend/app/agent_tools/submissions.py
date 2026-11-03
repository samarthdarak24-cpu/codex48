"""Submission tools for Precedent Agent Studio."""
import time
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.agent_tools.base import AgentTool, ToolExecutionContext, ToolResult
from app.models import Finding, Submission, SubmissionVersion


class GetSubmissionTool(AgentTool):
    id = "get_submission"
    name = "Get Submission Details"
    description = "Retrieves a marketing submission, its latest copy text, brand, channel, and review status."
    category = "submissions"
    permission_class = "read"
    requires_approval = False
    timeout_seconds = 15
    input_schema = {
        "type": "object",
        "properties": {
            "submission_id": {
                "type": "string",
                "description": "Optional submission ID. If omitted, the latest pending submission in the workspace is retrieved.",
            }
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "title": {"type": "string"},
            "type": {"type": "string"},
            "channel": {"type": "string"},
            "brand": {"type": "string"},
            "status": {"type": "string"},
            "copy": {"type": "string"},
            "excerpt": {"type": "string"},
            "version": {"type": "integer"},
            "asset_background_colour": {"type": "string"},
            "findings_count": {"type": "integer"},
        },
    }

    def run(self, db: Session, inputs: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        t0 = time.time()
        sub_id = (
            inputs.get("submission_id")
            or inputs.get("content_id")
            or inputs.get("target_submission_id")
            or (inputs.get("input") if isinstance(inputs.get("input"), dict) else {}).get("submission_id")
        )

        sub = None
        if sub_id:
            sub = db.query(Submission).filter(Submission.id == sub_id).first()
            if not sub:
                sub = db.query(Submission).filter(Submission.code == sub_id).first()
            if not sub:
                sub = db.query(Submission).filter(Submission.id.ilike(f"%{sub_id}%")).first()

        if not sub:
            ws = context.workspace or "PureGlow"
            sub = (
                db.query(Submission)
                .filter(
                    (Submission.workspace == ws)
                    | (Submission.workspace == "PureGlow")
                    | (Submission.workspace.is_(None))
                )
                .order_by(desc(Submission.created_at))
                .first()
            )

        if not sub:
            sub = db.query(Submission).order_by(desc(Submission.created_at)).first()

        if not sub:
            return ToolResult(
                success=False,
                error=f"No submission found in workspace '{context.workspace}' or matching '{sub_id}'",
                ms=int((time.time() - t0) * 1000),
            )

        # Get latest copy from SubmissionVersion
        latest_version = (
            db.query(SubmissionVersion)
            .filter(SubmissionVersion.submission_id == sub.id)
            .order_by(desc(SubmissionVersion.version_number))
            .first()
        )
        copy_text = latest_version.copy if latest_version else sub.excerpt

        # Get existing findings count
        findings_count = db.query(Finding).filter(Finding.submission_id == sub.id).count()

        data = {
            "id": sub.id,
            "title": sub.title,
            "code": sub.code,
            "type": sub.type,
            "channel": sub.channel,
            "brand": sub.brand,
            "status": sub.status,
            "copy": copy_text,
            "excerpt": sub.excerpt,
            "version": sub.version,
            "asset_background_colour": sub.asset_background_colour,
            "findings_count": findings_count,
        }

        return ToolResult(
            success=True,
            data=data,
            summary=f"Retrieved submission '{sub.title}' ({sub.id}) with {len(copy_text)} chars of copy.",
            ms=int((time.time() - t0) * 1000),
        )


class CreateReviewDraftTool(AgentTool):
    id = "create_review_draft"
    name = "Create Review Draft"
    description = "Prepares an AI advisory review draft with findings and suggestions for human Brand Manager review."
    category = "submissions"
    permission_class = "draft"
    requires_approval = True
    timeout_seconds = 20
    input_schema = {
        "type": "object",
        "required": ["submission_id"],
        "properties": {
            "submission_id": {"type": "string", "description": "Target submission ID"},
            "findings": {
                "type": "array",
                "description": "List of detected issues or compliance findings",
                "items": {"type": "object"},
            },
            "summary": {"type": "string", "description": "Review summary and synthesis"},
            "recommendation": {
                "type": "string",
                "enum": ["Approve", "Request Changes", "Reject", "Requires Manager Attention"],
                "description": "Recommended governance action (non-binding)",
            },
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "draft_id": {"type": "string"},
            "submission_id": {"type": "string"},
            "status": {"type": "string"},
            "findings_staged": {"type": "integer"},
        },
    }

    def run(self, db: Session, inputs: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        t0 = time.time()
        sub_id = inputs.get("submission_id")
        findings = inputs.get("findings", [])
        summary = inputs.get("summary", "")
        recommendation = inputs.get("recommendation", "Requires Manager Attention")

        sub = None
        if sub_id:
            sub = db.query(Submission).filter(Submission.id == sub_id).first()
            if not sub:
                sub = db.query(Submission).filter(Submission.code == sub_id).first()
        if not sub:
            ws = context.workspace or "PureGlow"
            sub = db.query(Submission).filter(
                (Submission.workspace == ws) | (Submission.workspace == "PureGlow") | (Submission.workspace.is_(None))
            ).first()

        if not sub:
            return ToolResult(
                success=False,
                error=f"Submission '{sub_id}' not found in workspace '{context.workspace}'",
                ms=int((time.time() - t0) * 1000),
            )

        # If human approval is required for write actions, request it
        if context.approval_required_for_write:
            return ToolResult(
                success=True,
                requires_approval=True,
                approval_action_type="create_review_draft",
                approval_payload={
                    "submission_id": sub.id,
                    "submission_title": sub.title,
                    "findings_count": len(findings),
                    "summary": summary,
                    "recommendation": recommendation,
                    "findings": findings,
                },
                summary=f"Staged review draft for submission '{sub.title}'. Pausing for Brand Manager approval.",
                ms=int((time.time() - t0) * 1000),
            )

        # Non-blocking / pre-approved execution:
        draft_record = {
            "draft_id": f"draft-{sub.id[:8]}",
            "submission_id": sub.id,
            "status": "staged_for_review",
            "findings_staged": len(findings),
            "summary": summary,
            "recommendation": recommendation,
        }

        return ToolResult(
            success=True,
            data=draft_record,
            summary=f"Created advisory review draft with {len(findings)} findings for '{sub.title}'.",
            ms=int((time.time() - t0) * 1000),
        )

