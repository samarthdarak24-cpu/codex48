"""Precedent Ready-Made Agent Templates.

Implements the 6 official agent templates:
1. Brand Compliance Reviewer
2. Guideline Research Assistant
3. VisualGuard Assistant
4. Exception Triage Assistant
5. Sentinel Impact Assistant
6. Audit Report Assistant
"""
from typing import Any, Dict, List, Optional
from app.agents.schemas import AgentTemplateOut, ApprovalPolicy, ExecutionLimits


TEMPLATES: List[Dict[str, Any]] = [
    {
        "id": "template_brand_compliance_reviewer",
        "name": "Brand Compliance Reviewer",
        "description": "Reviews marketing submissions against active brand guidelines, detects claims, runs deterministic rules, and stages review drafts.",
        "category": "brand_compliance",
        "icon": "ShieldCheck",
        "instructions": (
            "You are the Precedent Brand Compliance Reviewer. Given a marketing submission or text copy:\n"
            "1. Retrieve the submission details and copy text.\n"
            "2. Run deterministic brand rules to detect explicit policy violations.\n"
            "3. Search brand guidelines for passages governing the copy's claims.\n"
            "4. Verify that all quotes and claim citations match stored brand evidence.\n"
            "5. Synthesize findings and create a non-binding review draft for human Brand Manager approval.\n"
            "Never approve or reject content automatically."
        ),
        "tools": [
            "get_submission",
            "run_brand_rules",
            "search_guidelines",
            "retrieve_evidence",
            "create_review_draft",
        ],
        "input_schema": {
            "type": "object",
            "properties": {
                "submission_id": {"type": "string", "description": "Target submission ID to review"},
                "copy_text": {"type": "string", "description": "Optional ad copy text"},
            },
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "compliance_status": {"type": "string"},
                "findings": {"type": "array"},
                "recommendations": {"type": "string"},
            },
        },
        "approval_policy": {
            "human_approval_required_for_write_actions": True,
            "require_manager_approval": True,
        },
        "execution_limits": {
            "max_steps": 10,
            "timeout_seconds": 120,
            "max_tokens": 4000,
        },
        "workflow": {
            "nodes": [
                {
                    "id": "node_trigger",
                    "type": "trigger",
                    "position": {"x": 250, "y": 40},
                    "data": {"label": "Manual / Submission Trigger", "trigger_type": "submission_created"},
                },
                {
                    "id": "node_get_sub",
                    "type": "tool",
                    "position": {"x": 250, "y": 140},
                    "data": {"label": "Get Submission", "tool_id": "get_submission"},
                },
                {
                    "id": "node_rules",
                    "type": "tool",
                    "position": {"x": 250, "y": 240},
                    "data": {"label": "Run Brand Rules", "tool_id": "run_brand_rules"},
                },
                {
                    "id": "node_search",
                    "type": "tool",
                    "position": {"x": 250, "y": 340},
                    "data": {"label": "Search Guidelines", "tool_id": "search_guidelines"},
                },
                {
                    "id": "node_evidence",
                    "type": "tool",
                    "position": {"x": 250, "y": 440},
                    "data": {"label": "Verify Evidence", "tool_id": "retrieve_evidence"},
                },
                {
                    "id": "node_ai_summary",
                    "type": "ai",
                    "position": {"x": 250, "y": 540},
                    "data": {"label": "AI Review Synthesis", "model": "fastapi-llm"},
                },
                {
                    "id": "node_approval",
                    "type": "human_approval",
                    "position": {"x": 250, "y": 640},
                    "data": {"label": "Manager Approval Checkpoint", "action_type": "create_review_draft"},
                },
                {
                    "id": "node_draft",
                    "type": "tool",
                    "position": {"x": 250, "y": 740},
                    "data": {"label": "Save Review Draft", "tool_id": "create_review_draft"},
                },
                {
                    "id": "node_output",
                    "type": "output",
                    "position": {"x": 250, "y": 840},
                    "data": {"label": "Return Compliance Findings"},
                },
            ],
            "edges": [
                {"id": "e1", "source": "node_trigger", "target": "node_get_sub"},
                {"id": "e2", "source": "node_get_sub", "target": "node_rules"},
                {"id": "e3", "source": "node_rules", "target": "node_search"},
                {"id": "e4", "source": "node_search", "target": "node_evidence"},
                {"id": "e5", "source": "node_evidence", "target": "node_ai_summary"},
                {"id": "e6", "source": "node_ai_summary", "target": "node_approval"},
                {"id": "e7", "source": "node_approval", "target": "node_draft"},
                {"id": "e8", "source": "node_draft", "target": "node_output"},
            ],
        },
    },
    {
        "id": "template_guideline_research_assistant",
        "name": "Guideline Research Assistant",
        "description": "Answers brand governance questions with verbatim quotes and document references.",
        "category": "guideline_research",
        "icon": "BookOpen",
        "instructions": (
            "You are the Precedent Guideline Research Assistant. Help users navigate official brand guidelines:\n"
            "1. Search guideline documents using hybrid semantic and lexical retrieval.\n"
            "2. Extract verbatim passages with document title, section, and page number.\n"
            "3. Retrieve active enforcement rules related to the query.\n"
            "4. Formulate clear, well-referenced guidance. State when a policy is ambiguous or missing."
        ),
        "tools": [
            "search_guidelines",
            "extract_document_text",
            "retrieve_evidence",
            "list_active_rules",
        ],
        "input_schema": {
            "type": "object",
            "required": ["query"],
            "properties": {"query": {"type": "string", "description": "Brand guideline question"}},
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "answer": {"type": "string"},
                "supporting_passages": {"type": "array"},
                "document_sources": {"type": "array"},
            },
        },
        "approval_policy": {
            "human_approval_required_for_write_actions": False,
            "require_manager_approval": False,
        },
        "execution_limits": {
            "max_steps": 6,
            "timeout_seconds": 60,
            "max_tokens": 3000,
        },
        "workflow": {
            "nodes": [
                {
                    "id": "n1",
                    "type": "trigger",
                    "position": {"x": 250, "y": 40},
                    "data": {"label": "User Question", "trigger_type": "manual"},
                },
                {
                    "id": "n2",
                    "type": "tool",
                    "position": {"x": 250, "y": 140},
                    "data": {"label": "Search Guidelines", "tool_id": "search_guidelines"},
                },
                {
                    "id": "n3",
                    "type": "tool",
                    "position": {"x": 250, "y": 240},
                    "data": {"label": "List Related Rules", "tool_id": "list_active_rules"},
                },
                {
                    "id": "n4",
                    "type": "ai",
                    "position": {"x": 250, "y": 340},
                    "data": {"label": "Synthesize Sourced Answer", "model": "fastapi-llm"},
                },
                {
                    "id": "n5",
                    "type": "output",
                    "position": {"x": 250, "y": 440},
                    "data": {"label": "Return Answer with Citations"},
                },
            ],
            "edges": [
                {"id": "e1", "source": "n1", "target": "n2"},
                {"id": "e2", "source": "n2", "target": "n3"},
                {"id": "e3", "source": "n3", "target": "n4"},
                {"id": "e4", "source": "n4", "target": "n5"},
            ],
        },
    },
    {
        "id": "template_visual_guard_assistant",
        "name": "VisualGuard Assistant",
        "description": "Reviews uploaded creative imagery and posters for palette accuracy, clear space, and visual branding.",
        "category": "visual_guard",
        "icon": "Eye",
        "instructions": (
            "You are the VisualGuard Assistant. Analyze marketing visuals for branding compliance:\n"
            "1. Ingest visual facts and dominant CIE-Lab colour palette.\n"
            "2. Perform OCR to extract overlay text and check for unapproved claims.\n"
            "3. Evaluate logo clear space and background palette against approved brand kits.\n"
            "4. Return visual observations, bounding coordinates, and recommended fixes."
        ),
        "tools": [
            "analyze_image_visuals",
            "get_submission",
            "run_brand_rules",
            "create_review_draft",
        ],
        "input_schema": {
            "type": "object",
            "properties": {
                "submission_id": {"type": "string"},
                "asset_id": {"type": "string"},
            },
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "visual_findings": {"type": "array"},
                "palette_analysis": {"type": "object"},
                "safe_space_met": {"type": "boolean"},
            },
        },
        "approval_policy": {
            "human_approval_required_for_write_actions": True,
            "require_manager_approval": True,
        },
        "execution_limits": {"max_steps": 8, "timeout_seconds": 90, "max_tokens": 3000},
        "workflow": {
            "nodes": [
                {"id": "v1", "type": "trigger", "position": {"x": 250, "y": 40}, "data": {"label": "Asset Uploaded", "trigger_type": "manual"}},
                {"id": "v2", "type": "tool", "position": {"x": 250, "y": 140}, "data": {"label": "Analyze Visuals & OCR", "tool_id": "analyze_image_visuals"}},
                {"id": "v3", "type": "tool", "position": {"x": 250, "y": 240}, "data": {"label": "Run Brand Rules", "tool_id": "run_brand_rules"}},
                {"id": "v4", "type": "ai", "position": {"x": 250, "y": 340}, "data": {"label": "Visual Findings Summary"}},
                {"id": "v5", "type": "output", "position": {"x": 250, "y": 440}, "data": {"label": "Return Visual Report"}},
            ],
            "edges": [
                {"id": "e1", "source": "v1", "target": "v2"},
                {"id": "e2", "source": "v2", "target": "v3"},
                {"id": "e3", "source": "v3", "target": "v4"},
                {"id": "e4", "source": "v4", "target": "v5"},
            ],
        },
    },
    {
        "id": "template_exception_triage_assistant",
        "name": "Exception Triage Assistant",
        "description": "Summarises and analyses exception requests, assesses policy risks, and checks effective dates.",
        "category": "exception_triage",
        "icon": "AlertTriangle",
        "instructions": (
            "You are the Precedent Exception Triage Assistant:\n"
            "1. Retrieve pending or active exception requests.\n"
            "2. Check associated brand rules and scope conditions.\n"
            "3. Assess risk severity and look for similar historical rulings.\n"
            "4. Provide a structured risk summary to assist the Brand Manager.\n"
            "Under no circumstances are you permitted to approve or reject an exception."
        ),
        "tools": [
            "get_exception_details",
            "list_active_rules",
            "get_submission",
            "get_audit_history",
        ],
        "input_schema": {
            "type": "object",
            "properties": {"exception_id": {"type": "string"}, "rule_code": {"type": "string"}},
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "risk_summary": {"type": "string"},
                "scope_validity": {"type": "string"},
                "recommendation": {"type": "string"},
            },
        },
        "approval_policy": {
            "human_approval_required_for_write_actions": True,
            "require_manager_approval": True,
        },
        "execution_limits": {"max_steps": 6, "timeout_seconds": 60, "max_tokens": 3000},
        "workflow": {
            "nodes": [
                {"id": "ex1", "type": "trigger", "position": {"x": 250, "y": 40}, "data": {"label": "Exception Requested", "trigger_type": "manual"}},
                {"id": "ex2", "type": "tool", "position": {"x": 250, "y": 140}, "data": {"label": "Get Exception Details", "tool_id": "get_exception_details"}},
                {"id": "ex3", "type": "tool", "position": {"x": 250, "y": 240}, "data": {"label": "Check Rule Policy", "tool_id": "list_active_rules"}},
                {"id": "ex4", "type": "ai", "position": {"x": 250, "y": 340}, "data": {"label": "Assess Policy Risk"}},
                {"id": "ex5", "type": "output", "position": {"x": 250, "y": 440}, "data": {"label": "Return Triage Recommendation"}},
            ],
            "edges": [
                {"id": "e1", "source": "ex1", "target": "ex2"},
                {"id": "e2", "source": "ex2", "target": "ex3"},
                {"id": "e3", "source": "ex3", "target": "ex4"},
                {"id": "e4", "source": "ex4", "target": "ex5"},
            ],
        },
    },
    {
        "id": "template_sentinel_impact_assistant",
        "name": "Sentinel Impact Assistant",
        "description": "Identifies content affected by rule or guideline changes and prepares reassessment tasks.",
        "category": "sentinel_impact",
        "icon": "Sparkles",
        "instructions": (
            "You are the Sentinel Impact Assistant. When a rule or guideline is updated:\n"
            "1. Review the changed policy and scope.\n"
            "2. Retrieve active submissions and content that rely on this rule.\n"
            "3. Prepare Sentinel reassessment tasks for human Brand Manager confirmation.\n"
            "4. Return impact severity and affected content counts."
        ),
        "tools": [
            "list_active_rules",
            "search_guidelines",
            "get_submission",
            "get_exception_details",
            "create_sentinel_task",
        ],
        "input_schema": {
            "type": "object",
            "required": ["rule_code"],
            "properties": {"rule_code": {"type": "string"}, "change_summary": {"type": "string"}},
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "affected_submissions_count": {"type": "integer"},
                "impact_level": {"type": "string"},
                "reassessment_tasks_staged": {"type": "integer"},
            },
        },
        "approval_policy": {
            "human_approval_required_for_write_actions": True,
            "require_manager_approval": True,
        },
        "execution_limits": {"max_steps": 8, "timeout_seconds": 90, "max_tokens": 3000},
        "workflow": {
            "nodes": [
                {"id": "s1", "type": "trigger", "position": {"x": 250, "y": 40}, "data": {"label": "Rule Updated Trigger", "trigger_type": "rule_changed"}},
                {"id": "s2", "type": "tool", "position": {"x": 250, "y": 140}, "data": {"label": "List Changed Rules", "tool_id": "list_active_rules"}},
                {"id": "s3", "type": "tool", "position": {"x": 250, "y": 240}, "data": {"label": "Get Affected Submissions", "tool_id": "get_submission"}},
                {"id": "s4", "type": "human_approval", "position": {"x": 250, "y": 340}, "data": {"label": "Approve Reassessment Tasks"}},
                {"id": "s5", "type": "tool", "position": {"x": 250, "y": 440}, "data": {"label": "Create Sentinel Task", "tool_id": "create_sentinel_task"}},
                {"id": "s6", "type": "output", "position": {"x": 250, "y": 540}, "data": {"label": "Return Impact Report"}},
            ],
            "edges": [
                {"id": "e1", "source": "s1", "target": "s2"},
                {"id": "e2", "source": "s2", "target": "s3"},
                {"id": "e3", "source": "s3", "target": "s4"},
                {"id": "e4", "source": "s4", "target": "s5"},
                {"id": "e5", "source": "s5", "target": "s6"},
            ],
        },
    },
    {
        "id": "template_audit_report_assistant",
        "name": "Audit Report Assistant",
        "description": "Prepares governance summaries, compliance audit trends, and activity reports from actual audit logs.",
        "category": "audit_report",
        "icon": "FileText",
        "instructions": (
            "You are the Precedent Audit Report Assistant:\n"
            "1. Query recent governance audit events across the workspace.\n"
            "2. Aggregate review decisions, exceptions, and compliance violations.\n"
            "3. Identify recurring policy failure trends and key events.\n"
            "4. Generate a clean executive summary and optionally dispatch an in-app alert."
        ),
        "tools": [
            "get_audit_history",
            "get_exception_details",
            "list_active_rules",
            "create_notification",
        ],
        "input_schema": {
            "type": "object",
            "properties": {"days_back": {"type": "integer", "default": 7}},
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "total_events_analyzed": {"type": "integer"},
                "summary": {"type": "string"},
                "key_trends": {"type": "array"},
            },
        },
        "approval_policy": {
            "human_approval_required_for_write_actions": True,
            "require_manager_approval": True,
        },
        "execution_limits": {"max_steps": 6, "timeout_seconds": 60, "max_tokens": 3000},
        "workflow": {
            "nodes": [
                {"id": "a1", "type": "trigger", "position": {"x": 250, "y": 40}, "data": {"label": "Scheduled / Manual Trigger", "trigger_type": "scheduled"}},
                {"id": "a2", "type": "tool", "position": {"x": 250, "y": 140}, "data": {"label": "Get Audit Events", "tool_id": "get_audit_history"}},
                {"id": "a3", "type": "tool", "position": {"x": 250, "y": 240}, "data": {"label": "Get Exception Trends", "tool_id": "get_exception_details"}},
                {"id": "a4", "type": "ai", "position": {"x": 250, "y": 340}, "data": {"label": "Generate Governance Report"}},
                {"id": "a5", "type": "output", "position": {"x": 250, "y": 440}, "data": {"label": "Return Audit Summary"}},
            ],
            "edges": [
                {"id": "e1", "source": "a1", "target": "a2"},
                {"id": "e2", "source": "a2", "target": "a3"},
                {"id": "e3", "source": "a3", "target": "a4"},
                {"id": "e4", "source": "a4", "target": "a5"},
            ],
        },
    },
]


def list_templates() -> List[AgentTemplateOut]:
    """Returns the list of available Precedent agent templates."""
    return [AgentTemplateOut(**t) for t in TEMPLATES]


def get_template(template_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a template by ID."""
    for t in TEMPLATES:
        if t["id"] == template_id:
            return t
    return None
