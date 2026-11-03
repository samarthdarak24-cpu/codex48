"""Rule execution tool for Precedent Agent Studio."""
import time
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.agent_tools.base import AgentTool, ToolExecutionContext, ToolResult
from app.models import Rule, Submission
from app.rule_engine import run_rules


class DummyAsset:
    """Helper wrapper for asset facts."""
    def __init__(self, data: Optional[Dict[str, Any]] = None):
        data = data or {}
        self.background_colour = data.get("background_colour") or data.get("backgroundColour")
        self.clear_space_ratio = data.get("clear_space_ratio") or data.get("clearSpaceRatio")
        self.typeface = data.get("typeface")
        self.aspect_ratio = data.get("aspect_ratio") or data.get("aspectRatio")
        self.unreadable = bool(data.get("unreadable", False))


class RunBrandRulesTool(AgentTool):
    id = "run_brand_rules"
    name = "Run Brand Rules"
    description = "Executes deterministic brand governance rules against content copy and asset facts."
    category = "rules"
    permission_class = "read"
    requires_approval = False
    timeout_seconds = 20
    input_schema = {
        "type": "object",
        "properties": {
            "text": {"type": "string", "description": "The copy text to evaluate against brand rules"},
            "channel": {"type": "string", "default": "Instagram", "description": "Distribution channel"},
            "asset_facts": {"type": "object", "description": "Optional visual asset properties (background_colour, clear_space_ratio, etc.)"},
            "submission_id": {"type": "string", "description": "Optional submission ID to evaluate directly from stored submission"},
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "total_rules_checked": {"type": "integer"},
            "violations_count": {"type": "integer"},
            "findings": {"type": "array", "items": {"type": "object"}},
            "is_compliant": {"type": "boolean"},
        },
    }

    def run(self, db: Session, inputs: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        t0 = time.time()
        text = (
            inputs.get("text")
            or inputs.get("copy")
            or inputs.get("query")
            or inputs.get("prompt")
            or ""
        )
        channel = inputs.get("channel", "Instagram")
        asset_facts = inputs.get("asset_facts") or {}
        sub_id = inputs.get("submission_id")

        if sub_id and not text:
            sub = db.query(Submission).filter(
                Submission.workspace == context.workspace,
                Submission.id == sub_id
            ).first()
            if sub:
                from app.models import SubmissionVersion
                v = db.query(SubmissionVersion).filter(SubmissionVersion.submission_id == sub.id).first()
                text = v.copy if v and v.copy else sub.excerpt
                channel = sub.channel or channel
                if sub.asset_background_colour and not asset_facts.get("background_colour"):
                    asset_facts["background_colour"] = sub.asset_background_colour

        if not text:
            text = "PureGlow natural skincare formulation and brand claims" 

        rules = db.query(Rule).filter(Rule.workspace == context.workspace).all()
        asset_obj = DummyAsset(asset_facts) if asset_facts else None

        findings = run_rules(rules, text=text, channel=channel, asset=asset_obj)

        findings_data = [
            {
                "rule_code": f.rule_code,
                "rule_title": f.rule_title,
                "severity": f.severity,
                "type": f.type,
                "explanation": f.explanation,
                "source_passage": f.source_passage[:150] if f.source_passage else "",
                "evidence_verified": f.evidence_verified,
                "suggested_fix": f.suggested_fix,
            }
            for f in findings
        ]

        data = {
            "total_rules_checked": len(rules),
            "violations_count": len(findings_data),
            "findings": findings_data,
            "is_compliant": len(findings_data) == 0,
        }

        summary = f"Checked {len(rules)} rules. Found {len(findings_data)} violations / findings."
        return ToolResult(
            success=True,
            data=data,
            summary=summary,
            ms=int((time.time() - t0) * 1000),
        )

