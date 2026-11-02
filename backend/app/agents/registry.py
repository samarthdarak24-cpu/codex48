"""Central tool registry.

The LLM can only choose tool ids from :data:`TOOL_SPECS`. Anything it invents is
dropped by the generator/validator. This is the single place to audit what an
agent is capable of doing.
"""
from __future__ import annotations

from . import tools
from .base import ToolSpec

_READ = "read"
_DRAFT = "draft"
_WRITE = "write"


def _spec(
    tool_id: str,
    name: str,
    description: str,
    category: str,
    executor,
    *,
    permission: str = _READ,
    approval_required: bool = False,
    timeout_seconds: int = 20,
    idempotent: bool = True,
    input_schema: dict | None = None,
    output_schema: dict | None = None,
) -> ToolSpec:
    return ToolSpec(
        id=tool_id,
        name=name,
        description=description,
        category=category,
        permission=permission,
        approval_required=approval_required,
        timeout_seconds=timeout_seconds,
        input_schema=input_schema or {"type": "object", "properties": {}},
        output_schema=output_schema or {"type": "object"},
        executor=executor,
        idempotent=idempotent,
    )


TOOL_SPECS: list[ToolSpec] = [
    _spec(
        "get_submission",
        "Retrieve submission",
        "Load a content submission with its latest copy and stored deterministic findings.",
        "content",
        tools.get_submission,
        input_schema={
            "type": "object",
            "required": ["submission_id"],
            "properties": {"submission_id": {"type": "string"}},
        },
    ),
    _spec(
        "extract_document_text",
        "Extract poster / document text",
        "Return OCR text from a stored visual analysis, or the submission copy when no image exists.",
        "content",
        tools.extract_document_text,
        input_schema={
            "type": "object",
            "properties": {"submission_id": {"type": "string"}, "text": {"type": "string"}},
        },
    ),
    _spec(
        "search_guidelines",
        "Search brand guidelines",
        "Hybrid lexical/vector search across indexed guideline passages. Returns exact passages with document and page references.",
        "retrieval",
        tools.search_guidelines,
        input_schema={
            "type": "object",
            "required": ["query"],
            "properties": {"query": {"type": "string"}, "top_k": {"type": "integer", "maximum": 10}},
        },
    ),
    _spec(
        "run_brand_rules",
        "Run deterministic brand rules",
        "Read the deterministic rule outcomes already stored for a submission. The agent cannot override them.",
        "rules",
        tools.run_brand_rules,
        input_schema={
            "type": "object",
            "required": ["submission_id"],
            "properties": {"submission_id": {"type": "string"}},
        },
    ),
    _spec(
        "retrieve_evidence",
        "Verify evidence passages",
        "Fetch stored guideline passages and verify that a quoted span is a real substring of the stored text.",
        "evidence",
        tools.retrieve_evidence,
        input_schema={
            "type": "object",
            "properties": {
                "passage_ids": {"type": "array", "items": {"type": "string"}},
                "quotes": {"type": "array", "items": {"type": "object"}},
            },
        },
    ),
    _spec(
        "get_exception",
        "Retrieve exception details",
        "Load a scoped exception request, including its rule, scope, conditions and status.",
        "exceptions",
        tools.get_exception,
        input_schema={
            "type": "object",
            "required": ["exception_id"],
            "properties": {"exception_id": {"type": "string"}},
        },
    ),
    _spec(
        "search_rules",
        "Search brand rules",
        "Search active brand rules by code, title or summary.",
        "rules",
        tools.search_rules,
        input_schema={
            "type": "object",
            "properties": {"query": {"type": "string"}, "include_inactive": {"type": "boolean"}},
        },
    ),
    _spec(
        "get_owner",
        "Get content owner",
        "Resolve the creator or requester responsible for a submission or exception.",
        "content",
        tools.get_owner,
        input_schema={
            "type": "object",
            "properties": {"submission_id": {"type": "string"}, "exception_id": {"type": "string"}},
        },
    ),
    _spec(
        "check_effective_dates",
        "Check effective dates",
        "Determine whether an exception or rule is active, expired or not yet effective.",
        "exceptions",
        tools.check_effective_dates,
        input_schema={
            "type": "object",
            "properties": {"exception_id": {"type": "string"}, "rule_id": {"type": "string"}},
        },
    ),
    _spec(
        "get_affected_submissions",
        "Find affected submissions",
        "List submissions that carry findings for a rule code — used for impact analysis.",
        "sentinel",
        tools.get_affected_submissions,
        input_schema={
            "type": "object",
            "properties": {"rule_code": {"type": "string"}},
        },
    ),
    _spec(
        "get_audit_events",
        "Get audit history",
        "Read the append-only audit stream for the workspace.",
        "audit",
        tools.get_audit_events,
        input_schema={
            "type": "object",
            "properties": {"limit": {"type": "integer", "maximum": 100}},
        },
    ),
    _spec(
        "get_review_statistics",
        "Get review statistics",
        "Aggregate submission statuses, decisions and finding counts from stored data.",
        "audit",
        tools.get_review_statistics,
    ),
    _spec(
        "get_exception_statistics",
        "Get exception statistics",
        "Aggregate exception statuses and count those expiring within 30 days.",
        "exceptions",
        tools.get_exception_statistics,
    ),
    _spec(
        "get_visual_analysis",
        "Get visual analysis",
        "Read stored OCR blocks, dominant colours, logo matches, contrast findings and layout metrics.",
        "analysis",
        tools.get_visual_analysis,
        input_schema={
            "type": "object",
            "required": ["submission_id"],
            "properties": {"submission_id": {"type": "string"}},
        },
    ),
    _spec(
        "generate_summary",
        "Generate review summary",
        "Summarise supplied findings and evidence. Falls back to a deterministic summary when no LLM is configured.",
        "ai",
        tools.generate_summary,
        input_schema={
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "findings": {"type": "array"},
                "evidence": {"type": "array"},
            },
        },
    ),
    _spec(
        "create_review_draft",
        "Create review draft",
        "Assemble a review draft (findings + evidence + recommendation). Does not write to official records.",
        "output",
        tools.create_review_draft,
        permission=_DRAFT,
        input_schema={
            "type": "object",
            "properties": {
                "submission_id": {"type": "string"},
                "summary": {"type": "string"},
                "findings": {"type": "array"},
                "evidence": {"type": "array"},
                "recommendedAction": {"type": "string"},
            },
        },
    ),
    _spec(
        "create_notification",
        "Create notification",
        "Send an in-app notification to a workspace member. Protected write action — requires human approval.",
        "output",
        tools.create_notification,
        permission=_WRITE,
        approval_required=True,
        idempotent=False,
        input_schema={
            "type": "object",
            "required": ["title"],
            "properties": {
                "title": {"type": "string"},
                "body": {"type": "string"},
                "user_id": {"type": "string"},
            },
        },
    ),
]

TOOLS: dict[str, ToolSpec] = {spec.id: spec for spec in TOOL_SPECS}
TOOL_IDS: frozenset[str] = frozenset(TOOLS)


def get_tool(tool_id: str) -> ToolSpec | None:
    return TOOLS.get(tool_id)


def list_tools() -> list[dict]:
    return [spec.public() for spec in TOOL_SPECS]


def tools_by_category() -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for spec in TOOL_SPECS:
        grouped.setdefault(spec.category, []).append(spec.public())
    return grouped


def approval_required_tool_ids() -> set[str]:
    return {spec.id for spec in TOOL_SPECS if spec.approval_required}
