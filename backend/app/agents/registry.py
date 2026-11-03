"""Central Tool Registry for Precedent Agent Studio.

Maintains the authoritative allowlist of registered safe internal tools.
Guarantees:
- Strict allowlist enforcement: Only registered tools may be called.
- No arbitrary code execution or unrestricted network/shell calls.
- Typed schemas for inputs, outputs, and permissions.
"""
from typing import Dict, List, Optional, Tuple
from app.agent_tools.base import AgentTool
from app.agent_tools.submissions import CreateReviewDraftTool, GetSubmissionTool
from app.agent_tools.guidelines import ListActiveRulesTool, SearchGuidelinesTool
from app.agent_tools.rules import RunBrandRulesTool
from app.agent_tools.evidence import CheckApprovedClaimsTool, RetrieveEvidenceTool
from app.agent_tools.exceptions import GetExceptionDetailsTool
from app.agent_tools.sentinel import CreateSentinelTaskTool
from app.agent_tools.audit import CreateNotificationTool, GetAuditHistoryTool
from app.agent_tools.visual import AnalyzeImageVisualsTool, ExtractDocumentTextTool
from app.agents.schemas import ToolDefinitionOut


_REGISTRY: Dict[str, AgentTool] = {}


def register_tool(tool: AgentTool) -> None:
    """Registers a tool instance in the global registry."""
    _REGISTRY[tool.id] = tool


def init_tool_registry() -> None:
    """Initializes the default suite of Precedent enterprise tools."""
    if _REGISTRY:
        return

    tools: List[AgentTool] = [
        GetSubmissionTool(),
        CreateReviewDraftTool(),
        SearchGuidelinesTool(),
        ListActiveRulesTool(),
        RunBrandRulesTool(),
        RetrieveEvidenceTool(),
        CheckApprovedClaimsTool(),
        GetExceptionDetailsTool(),
        CreateSentinelTaskTool(),
        GetAuditHistoryTool(),
        CreateNotificationTool(),
        AnalyzeImageVisualsTool(),
        ExtractDocumentTextTool(),
    ]

    for t in tools:
        register_tool(t)


def get_tool(tool_id: str) -> Optional[AgentTool]:
    """Retrieves a registered tool by its unique identifier."""
    init_tool_registry()
    return _REGISTRY.get(tool_id)


def list_tools() -> List[ToolDefinitionOut]:
    """Returns definitions of all registered tools."""
    init_tool_registry()
    return [
        ToolDefinitionOut(
            id=t.id,
            name=t.name,
            description=t.description,
            category=t.category,
            permission_class=t.permission_class,
            requires_approval=t.requires_approval,
            timeout_seconds=t.timeout_seconds,
            input_schema=t.input_schema,
            output_schema=t.output_schema,
        )
        for t in _REGISTRY.values()
    ]


def get_allowed_tool_ids() -> List[str]:
    """Returns the set of valid registered tool IDs."""
    init_tool_registry()
    return list(_REGISTRY.keys())


def validate_tools(requested_tools: List[str]) -> Tuple[List[str], List[str]]:
    """Validates requested tools against the allowlist.

    Returns:
        (valid_tools, rejected_tools)
    """
    init_tool_registry()
    valid = []
    rejected = []
    for t in requested_tools:
        if t in _REGISTRY:
            valid.append(t)
        else:
            rejected.append(t)
    return valid, rejected

