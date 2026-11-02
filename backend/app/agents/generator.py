"""Prompt-to-Agent Generator for Precedent Agent Studio.

Translates natural language user prompts into validated agent specifications
and React Flow visual workflows. Supports both LLM-driven generation and
deterministic fallback generation with 100% schema compliance.
"""
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.ai import ai_available, llm_complete
from app.agents.registry import get_allowed_tool_ids, validate_tools
from app.agents.schemas import AgentPromptIn, AgentPromptSpec, ApprovalPolicy, ExecutionLimits, MemoryConfig

logger = logging.getLogger(__name__)


SYSTEM_AGENT_ARCHITECT_PROMPT = """You are a senior enterprise AI agent architect for Precedent, a brand governance and content approval platform.
Your task is to convert a user's natural language request into a structured AI agent specification and workflow graph.

STRICT REQUIREMENTS:
1. ONLY select tools from this registered tool list:
   - get_submission: Retrieve submission copy, brand, channel, and review status
   - create_review_draft: Prepare review findings for manager approval
   - search_guidelines: Search official brand guidelines for passages and citations
   - list_active_rules: Query active published brand rules
   - run_brand_rules: Execute deterministic brand compliance rules
   - retrieve_evidence: Verify quotes and claim citations against stored database rows
   - check_approved_claims: Check copy against approved clinical/brand claims
   - get_exception_details: Inspect active/expired exceptions
   - create_sentinel_task: Create reassessment task for content affected by rule changes
   - get_audit_history: Query governance audit logs
   - create_notification: Dispatch in-app alerts to managers or creators
   - analyze_image_visuals: Ingest dominant palette, OCR text, and visual facts
   - extract_document_text: Extract passages from PDF/DOCX guideline docs

2. Do NOT hallucinate tools outside this list. Any unrecognized tool will be rejected.
3. Agents must NOT have permission to autonomously approve/reject content or change official rules.
4. Output MUST be valid JSON adhering strictly to this structure:
{
  "name": "Short Descriptive Title",
  "description": "One sentence summary of agent purpose",
  "category": "brand_compliance", // or guideline_research, visual_guard, exception_triage, sentinel_impact, audit_report
  "instructions": "Detailed system instructions explaining the step-by-step reasoning",
  "tools": ["tool_id_1", "tool_id_2"],
  "input_schema": {"type": "object", "properties": {}},
  "output_schema": {"type": "object", "properties": {}},
  "memory": {"enabled": false, "scope": "session", "max_turns": 10},
  "execution_limits": {"max_steps": 10, "timeout_seconds": 120, "max_tokens": 4000},
  "approval_policy": {"human_approval_required_for_write_actions": true, "require_manager_approval": true},
  "workflow": {
    "nodes": [
      {"id": "node_1", "type": "trigger", "position": {"x": 250, "y": 40}, "data": {"label": "Start"}},
      {"id": "node_2", "type": "tool", "position": {"x": 250, "y": 140}, "data": {"label": "Run Tool", "tool_id": "get_submission"}},
      {"id": "node_3", "type": "output", "position": {"x": 250, "y": 240}, "data": {"label": "Finish"}}
    ],
    "edges": [
      {"id": "e1", "source": "node_1", "target": "node_2"},
      {"id": "e2", "source": "node_2", "target": "node_3"}
    ]
  }
}
Respond ONLY with the JSON object. Do not include markdown code blocks."""


def _heuristic_generate_agent(prompt: str, category_hint: Optional[str] = None) -> AgentPromptSpec:
    """Deterministic prompt-to-agent generator for guaranteed zero-failure generation."""
    p = prompt.lower()

    # Determine primary category and tools based on prompt semantics
    if "poster" in p or "image" in p or "visual" in p or "logo" in p or "color" in p or "colour" in p:
        category = "visual_guard"
        name = "Visual Brand & Poster Guard"
        description = "Analyzes uploaded posters and images for visual branding, logo clear space, and palette accuracy."
        tools = ["analyze_image_visuals", "get_submission", "run_brand_rules", "create_review_draft"]
        icon = "Eye"
        workflow_nodes = [
            {"id": "t1", "type": "trigger", "position": {"x": 250, "y": 40}, "data": {"label": "Image / Poster Submission", "trigger_type": "manual"}},
            {"id": "t2", "type": "tool", "position": {"x": 250, "y": 140}, "data": {"label": "Analyze Visuals & Palette", "tool_id": "analyze_image_visuals"}},
            {"id": "t3", "type": "tool", "position": {"x": 250, "y": 240}, "data": {"label": "Run Visual Rules", "tool_id": "run_brand_rules"}},
            {"id": "t4", "type": "ai", "position": {"x": 250, "y": 340}, "data": {"label": "Synthesize Visual Observations"}},
            {"id": "t5", "type": "human_approval", "position": {"x": 250, "y": 440}, "data": {"label": "Manager Confirmation"}},
            {"id": "t6", "type": "tool", "position": {"x": 250, "y": 540}, "data": {"label": "Save Review Findings", "tool_id": "create_review_draft"}},
            {"id": "t7", "type": "output", "position": {"x": 250, "y": 640}, "data": {"label": "Return Visual Report"}},
        ]
        edges = [
            {"id": "e1", "source": "t1", "target": "t2"},
            {"id": "e2", "source": "t2", "target": "t3"},
            {"id": "e3", "source": "t3", "target": "t4"},
            {"id": "e4", "source": "t4", "target": "t5"},
            {"id": "e5", "source": "t5", "target": "t6"},
            {"id": "e6", "source": "t6", "target": "t7"},
        ]
    elif "exception" in p or "expired" in p or "waiver" in p:
        category = "exception_triage"
        name = "Exception & Policy Triage Assistant"
        description = "Monitors exception lifecycles, verifies expiry dates, and assesses policy risk on approved content."
        tools = ["get_exception_details", "list_active_rules", "get_submission", "get_audit_history"]
        workflow_nodes = [
            {"id": "e1", "type": "trigger", "position": {"x": 250, "y": 40}, "data": {"label": "Exception Event / Schedule", "trigger_type": "exception_expired"}},
            {"id": "e2", "type": "tool", "position": {"x": 250, "y": 140}, "data": {"label": "Get Exception Details", "tool_id": "get_exception_details"}},
            {"id": "e3", "type": "tool", "position": {"x": 250, "y": 240}, "data": {"label": "Check Rule Policies", "tool_id": "list_active_rules"}},
            {"id": "e4", "type": "ai", "position": {"x": 250, "y": 340}, "data": {"label": "Assess Exception Risk"}},
            {"id": "e5", "type": "output", "position": {"x": 250, "y": 440}, "data": {"label": "Return Triage Summary"}},
        ]
        edges = [
            {"id": "ed1", "source": "e1", "target": "e2"},
            {"id": "ed2", "source": "e2", "target": "e3"},
            {"id": "ed3", "source": "e3", "target": "e4"},
            {"id": "ed4", "source": "e4", "target": "e5"},
        ]
    elif "audit" in p or "report" in p or "weekly" in p or "history" in p:
        category = "audit_report"
        name = "Governance & Audit Report Assistant"
        description = "Compiles weekly brand compliance summaries, violation trends, and governance activity from real audit logs."
        tools = ["get_audit_history", "get_exception_details", "list_active_rules", "create_notification"]
        workflow_nodes = [
            {"id": "a1", "type": "trigger", "position": {"x": 250, "y": 40}, "data": {"label": "Weekly Report Trigger", "trigger_type": "scheduled"}},
            {"id": "a2", "type": "tool", "position": {"x": 250, "y": 140}, "data": {"label": "Get Audit History", "tool_id": "get_audit_history"}},
            {"id": "a3", "type": "tool", "position": {"x": 250, "y": 240}, "data": {"label": "Get Exception Trends", "tool_id": "get_exception_details"}},
            {"id": "a4", "type": "ai", "position": {"x": 250, "y": 340}, "data": {"label": "Synthesize Audit Report"}},
            {"id": "a5", "type": "output", "position": {"x": 250, "y": 440}, "data": {"label": "Export Governance Report"}},
        ]
        edges = [
            {"id": "ad1", "source": "a1", "target": "a2"},
            {"id": "ad2", "source": "a2", "target": "a3"},
            {"id": "ad3", "source": "a3", "target": "a4"},
            {"id": "ad4", "source": "a4", "target": "a5"},
        ]
    elif "sentinel" in p or "change" in p or "affected" in p or "reassessment" in p:
        category = "sentinel_impact"
        name = "Sentinel Impact & Reassessment Assistant"
        description = "Identifies marketing content affected when brand rules change and prepares reassessment tasks."
        tools = ["list_active_rules", "search_guidelines", "get_submission", "create_sentinel_task"]
        workflow_nodes = [
            {"id": "s1", "type": "trigger", "position": {"x": 250, "y": 40}, "data": {"label": "Rule Change Trigger", "trigger_type": "rule_changed"}},
            {"id": "s2", "type": "tool", "position": {"x": 250, "y": 140}, "data": {"label": "List Changed Rules", "tool_id": "list_active_rules"}},
            {"id": "s3", "type": "tool", "position": {"x": 250, "y": 240}, "data": {"label": "Get Submissions", "tool_id": "get_submission"}},
            {"id": "s4", "type": "human_approval", "position": {"x": 250, "y": 340}, "data": {"label": "Manager Confirmation"}},
            {"id": "s5", "type": "tool", "position": {"x": 250, "y": 440}, "data": {"label": "Stage Sentinel Task", "tool_id": "create_sentinel_task"}},
            {"id": "s6", "type": "output", "position": {"x": 250, "y": 540}, "data": {"label": "Return Impact Summary"}},
        ]
        edges = [
            {"id": "se1", "source": "s1", "target": "s2"},
            {"id": "se2", "source": "s2", "target": "s3"},
            {"id": "se3", "source": "s3", "target": "s4"},
            {"id": "se4", "source": "s4", "target": "s5"},
            {"id": "se5", "source": "s5", "target": "s6"},
        ]
    elif "search" in p or "question" in p or "find" in p or "reference" in p:
        category = "guideline_research"
        name = "Guideline Document Research Assistant"
        description = "Searches official brand guideline documents and answers questions with exact document passages."
        tools = ["search_guidelines", "extract_document_text", "retrieve_evidence", "list_active_rules"]
        workflow_nodes = [
            {"id": "g1", "type": "trigger", "position": {"x": 250, "y": 40}, "data": {"label": "User Query Trigger", "trigger_type": "manual"}},
            {"id": "g2", "type": "tool", "position": {"x": 250, "y": 140}, "data": {"label": "Search Guidelines", "tool_id": "search_guidelines"}},
            {"id": "g3", "type": "tool", "position": {"x": 250, "y": 240}, "data": {"label": "Verify Sourced Passages", "tool_id": "retrieve_evidence"}},
            {"id": "g4", "type": "ai", "position": {"x": 250, "y": 340}, "data": {"label": "Draft Document Answer"}},
            {"id": "g5", "type": "output", "position": {"x": 250, "y": 440}, "data": {"label": "Return Sourced Guidance"}},
        ]
        edges = [
            {"id": "ge1", "source": "g1", "target": "g2"},
            {"id": "ge2", "source": "g2", "target": "g3"},
            {"id": "ge3", "source": "g3", "target": "g4"},
            {"id": "ge4", "source": "g4", "target": "g5"},
        ]
    else:
        # Default: Brand Compliance Reviewer
        category = category_hint or "brand_compliance"
        name = "Brand Submission Reviewer"
        description = "Reviews marketing submissions against approved brand policies and identifies unsupported claims with verified evidence."
        tools = ["get_submission", "extract_document_text", "search_guidelines", "run_brand_rules", "retrieve_evidence", "create_review_draft"]
        workflow_nodes = [
            {"id": "b1", "type": "trigger", "position": {"x": 250, "y": 40}, "data": {"label": "Submission Trigger", "trigger_type": "submission_created"}},
            {"id": "b2", "type": "tool", "position": {"x": 250, "y": 140}, "data": {"label": "Retrieve Submission", "tool_id": "get_submission"}},
            {"id": "b3", "type": "tool", "position": {"x": 250, "y": 240}, "data": {"label": "Run Brand Rules", "tool_id": "run_brand_rules"}},
            {"id": "b4", "type": "tool", "position": {"x": 250, "y": 340}, "data": {"label": "Search Brand Guidelines", "tool_id": "search_guidelines"}},
            {"id": "b5", "type": "tool", "position": {"x": 250, "y": 440}, "data": {"label": "Verify Evidence", "tool_id": "retrieve_evidence"}},
            {"id": "b6", "type": "ai", "position": {"x": 250, "y": 540}, "data": {"label": "AI Review Summary"}},
            {"id": "b7", "type": "human_approval", "position": {"x": 250, "y": 640}, "data": {"label": "Manager Approval Checkpoint"}},
            {"id": "b8", "type": "tool", "position": {"x": 250, "y": 740}, "data": {"label": "Save Review Draft", "tool_id": "create_review_draft"}},
            {"id": "b9", "type": "output", "position": {"x": 250, "y": 840}, "data": {"label": "Return Compliance Findings"}},
        ]
        edges = [
            {"id": "be1", "source": "b1", "target": "b2"},
            {"id": "be2", "source": "b2", "target": "b3"},
            {"id": "be3", "source": "b3", "target": "b4"},
            {"id": "be4", "source": "b4", "target": "b5"},
            {"id": "be5", "source": "b5", "target": "b6"},
            {"id": "be6", "source": "b6", "target": "b7"},
            {"id": "be7", "source": "b7", "target": "b8"},
            {"id": "be8", "source": "b8", "target": "b9"},
        ]

    instructions = (
        f"You are the {name}. Your role is defined by the following prompt: '{prompt}'.\n"
        "Execute the registered tools strictly in accordance with brand policy. "
        "Validate all claims against authentic citations. Under no circumstances should you "
        "autonomously approve or reject submissions or alter system audit history. "
        "Pause for Brand Manager authorization on any write actions."
    )

    return AgentPromptSpec(
        name=name,
        description=description,
        category=category,
        instructions=instructions,
        tools=tools,
        input_schema={"type": "object", "properties": {"submission_id": {"type": "string"}, "query": {"type": "string"}}},
        output_schema={"type": "object", "properties": {"status": {"type": "string"}, "findings": {"type": "array"}}},
        memory=MemoryConfig(enabled=False, scope="session", max_turns=10),
        workflow={"nodes": workflow_nodes, "edges": edges},
        approval_policy=ApprovalPolicy(human_approval_required_for_write_actions=True, require_manager_approval=True),
        execution_limits=ExecutionLimits(max_steps=10, timeout_seconds=120, max_tokens=4000),
    )


def generate_agent_specification(prompt: str, category_hint: Optional[str] = None) -> Tuple[AgentPromptSpec, List[str], List[str], List[str]]:
    """Converts a prompt into a validated AgentPromptSpec.

    Returns:
        (spec, valid_tools, rejected_tools, warnings)
    """
    spec: Optional[AgentPromptSpec] = None
    warnings: List[str] = []

    # Attempt LLM generation if configured
    if ai_available():
        user_prompt = f"User Request: '{prompt}'\nCategory hint: {category_hint or 'unspecified'}"
        raw_response = llm_complete(
            system=SYSTEM_AGENT_ARCHITECT_PROMPT,
            user=user_prompt,
            max_tokens=1500,
            temperature=0.2,
        )
        if raw_response:
            try:
                # Strip markdown code fencing if present
                clean = raw_response.strip()
                if clean.startswith("```"):
                    clean = re.sub(r"^```(?:json)?\s*", "", clean)
                    clean = re.sub(r"\s*```$", "", clean)
                data = json.loads(clean)
                spec = AgentPromptSpec(**data)
            except Exception as e:
                logger.warning(f"Failed to parse LLM agent specification: {e}. Falling back to heuristic.")
                warnings.append("LLM output parsing failed; fallback generator applied.")

    # Fallback to heuristic generation if LLM is unavailable or failed
    if not spec:
        spec = _heuristic_generate_agent(prompt, category_hint)
        if not ai_available():
            warnings.append("External LLM not configured; agent synthesized via Precedent Heuristic Architect.")

    # Enforce strict tool validation against allowlist
    valid_tools, rejected_tools = validate_tools(spec.tools)
    if rejected_tools:
        warnings.append(f"Rejected unapproved tools: {', '.join(rejected_tools)}")
    spec.tools = valid_tools

    return spec, valid_tools, rejected_tools, warnings

