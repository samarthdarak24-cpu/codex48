"""Workflow vocabulary, graph construction and validation.

This module owns the *only* legal node/edge shapes. The frontend renders what
this module validates; the runtime executes what this module orders. A graph
that fails :func:`validate_graph` can never be published or executed.
"""
from __future__ import annotations

from collections import deque
from typing import Iterable

from .schemas import WorkflowGraph, WorkflowNode


class GraphError(ValueError):
    """Raised when a graph cannot be ordered (cycle) or is structurally invalid."""


# ---------------------------------------------------------------------------
# Node vocabulary
# ---------------------------------------------------------------------------

TRIGGERS: dict[str, dict] = {
    "manual_trigger": {"label": "Manual Trigger", "available": True, "description": "Run on demand from Agent Studio."},
    "submission_created": {"label": "Submission Created", "available": True, "description": "Dispatched when a new submission is executed against this agent."},
    "scheduled_trigger": {"label": "Scheduled Trigger", "available": True, "description": "Run on the configured schedule via the platform scheduler."},
    "guideline_updated": {"label": "Guideline Updated", "available": False, "description": "Requires the guideline event bus (not wired in this build)."},
    "rule_changed": {"label": "Rule Changed", "available": False, "description": "Requires the rule event bus (not wired in this build)."},
    "exception_expired": {"label": "Exception Expired", "available": False, "description": "Requires the exception sweep hook (not wired in this build)."},
}

AI_NODES: dict[str, str] = {
    "ai_agent": "AI Agent",
    "text_analysis": "Text Analysis",
    "document_analysis": "Document Analysis",
    "evidence_verification": "Evidence Verification",
    "summarisation": "Summarisation",
    "classification": "Classification",
}

LOGIC_NODES: dict[str, str] = {
    "if_else": "If / Else",
    "condition": "Condition",
    "filter": "Filter",
    "compare_values": "Compare Values",
    "merge_results": "Merge Results",
}

APPROVAL_NODES: dict[str, str] = {
    "manager_approval": "Manager Approval",
    "review_required": "Review Required",
    "confirm_action": "Confirm Action",
}

OUTPUT_NODES: dict[str, str] = {
    "return_result": "Return Result",
    "create_report": "Create Report",
    "save_review_draft": "Save Review Draft",
    "create_notification": "Create Notification",
    "create_sentinel_task": "Create Sentinel Task",
}

SUBTYPE_CATEGORY: dict[str, str] = {}
for _key in TRIGGERS:
    SUBTYPE_CATEGORY[_key] = "trigger"
for _key in AI_NODES:
    SUBTYPE_CATEGORY[_key] = "ai"
for _key in LOGIC_NODES:
    SUBTYPE_CATEGORY[_key] = "logic"
for _key in APPROVAL_NODES:
    SUBTYPE_CATEGORY[_key] = "approval"
for _key in OUTPUT_NODES:
    SUBTYPE_CATEGORY[_key] = "output"
SUBTYPE_CATEGORY["tool"] = "tool"


def node_subtype(node: WorkflowNode) -> str:
    return (node.data.subtype or node.type or "").strip()


def node_category(node: WorkflowNode) -> str:
    subtype = node_subtype(node)
    return SUBTYPE_CATEGORY.get(subtype, node.type)


def node_tool_id(node: WorkflowNode) -> str | None:
    return node.data.toolId or node.data.config.get("toolId")


def node_label(node: WorkflowNode) -> str:
    return node.data.label or (node.data.subtype or node.type).replace("_", " ").title()


# ---------------------------------------------------------------------------
# Ordering
# ---------------------------------------------------------------------------

def topological_order(graph: WorkflowGraph) -> list[WorkflowNode]:
    """Kahn's algorithm. Raises :class:`GraphError` on a cycle."""
    nodes = {n.id: n for n in graph.nodes}
    indegree = {n.id: 0 for n in graph.nodes}
    adjacency: dict[str, list[str]] = {n.id: [] for n in graph.nodes}

    for edge in graph.edges:
        if edge.source not in nodes or edge.target not in nodes:
            continue
        adjacency[edge.source].append(edge.target)
        indegree[edge.target] += 1

    queue = deque([nid for nid, degree in indegree.items() if degree == 0])
    ordered: list[WorkflowNode] = []
    while queue:
        nid = queue.popleft()
        ordered.append(nodes[nid])
        for target in adjacency[nid]:
            indegree[target] -= 1
            if indegree[target] == 0:
                queue.append(target)

    if len(ordered) != len(nodes):
        raise GraphError("Workflow contains a cycle. Bounded agent workflows must be acyclic.")
    return ordered


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_graph(
    graph: WorkflowGraph,
    *,
    allowed_tools: Iterable[str],
    approval_required_tools: Iterable[str] = (),
    max_nodes: int = 40,
    max_edges: int = 80,
) -> dict:
    """Return ``{errors, warnings, order}``. Never raises for user input."""
    errors: list[str] = []
    warnings: list[str] = []
    allowed = set(allowed_tools)
    approval_tools = set(approval_required_tools)

    if not graph.nodes:
        return {"errors": ["Workflow must contain at least one node."], "warnings": [], "order": []}
    if len(graph.nodes) > max_nodes:
        errors.append(f"Workflow has {len(graph.nodes)} nodes; the maximum is {max_nodes}.")
    if len(graph.edges) > max_edges:
        errors.append(f"Workflow has {len(graph.edges)} edges; the maximum is {max_edges}.")

    ids = [n.id for n in graph.nodes]
    if len(ids) != len(set(ids)):
        errors.append("Workflow contains duplicate node ids.")

    node_map = {n.id: n for n in graph.nodes}
    triggers = [n for n in graph.nodes if node_category(n) == "trigger"]
    if not triggers:
        errors.append("Workflow requires exactly one trigger node.")
    elif len(triggers) > 1:
        errors.append("Workflow must have exactly one trigger node.")

    tool_nodes = [n for n in graph.nodes if node_category(n) == "tool"]
    if not tool_nodes:
        warnings.append("Workflow has no tool nodes; the agent will only pass input through.")

    for node in tool_nodes:
        tool_id = node_tool_id(node)
        if not tool_id:
            errors.append(f"Tool node '{node_label(node)}' has no toolId.")
        elif tool_id not in allowed:
            errors.append(f"Tool '{tool_id}' is not enabled for this agent or is not in the registry.")

    has_approval_node = any(node_category(n) == "approval" for n in graph.nodes)
    used_approval_tools = {node_tool_id(n) for n in tool_nodes} & approval_tools
    if used_approval_tools and not has_approval_node:
        warnings.append(
            "This workflow calls a protected write tool without an approval node. "
            "The runtime will still pause and request human approval."
        )

    if not any(node_category(n) == "output" for n in graph.nodes):
        warnings.append("Workflow has no output node; the run will return the last tool result.")

    # Edge integrity
    seen_edges: set[tuple[str, str]] = set()
    for edge in graph.edges:
        if edge.source not in node_map or edge.target not in node_map:
            errors.append(f"Edge '{edge.id}' references a missing node.")
            continue
        if edge.source == edge.target:
            errors.append(f"Edge '{edge.id}' connects a node to itself.")
        key = (edge.source, edge.target)
        if key in seen_edges:
            warnings.append(f"Duplicate edge from '{edge.source}' to '{edge.target}'.")
        seen_edges.add(key)

    # Reachability from the trigger
    order: list[str] = []
    if triggers:
        adjacency: dict[str, list[str]] = {n.id: [] for n in graph.nodes}
        for edge in graph.edges:
            if edge.source in adjacency and edge.target in adjacency:
                adjacency[edge.source].append(edge.target)
        reachable: set[str] = set()
        stack = [triggers[0].id]
        while stack:
            current = stack.pop()
            if current in reachable:
                continue
            reachable.add(current)
            stack.extend(adjacency.get(current, []))
        unreachable = [n for n in graph.nodes if n.id not in reachable]
        if unreachable:
            warnings.append(
                "Unreachable node(s): " + ", ".join(node_label(n) for n in unreachable[:5])
            )

    if not errors:
        try:
            order = [n.id for n in topological_order(graph)]
        except GraphError as exc:
            errors.append(str(exc))

    return {"errors": errors, "warnings": warnings, "order": order}


# ---------------------------------------------------------------------------
# Deterministic graph construction
# ---------------------------------------------------------------------------

def _node(node_id: str, category: str, subtype: str, label: str, x: int, y: int, **data) -> WorkflowNode:
    return WorkflowNode(
        id=node_id,
        type=category,  # type: ignore[arg-type]
        position={"x": x, "y": y},  # type: ignore[arg-type]
        data={"label": label, "subtype": subtype, **data},  # type: ignore[arg-type]
    )


def build_graph(
    tool_ids: list[str],
    *,
    tool_labels: dict[str, str] | None = None,
    trigger: str = "manual_trigger",
    include_approval: bool = False,
    output_subtype: str = "return_result",
) -> WorkflowGraph:
    """Build a clean linear graph from an ordered tool list.

    The generator uses this so a prompt never produces an arbitrary topology;
    users can then edit the graph in the visual builder.
    """
    labels = tool_labels or {}
    trigger_label = TRIGGERS.get(trigger, {}).get("label", "Manual Trigger")

    nodes: list[WorkflowNode] = [
        _node("trigger-1", "trigger", trigger, trigger_label, 0, 0)
    ]
    edges: list[dict] = []
    previous = "trigger-1"
    y = 120

    for index, tool_id in enumerate(tool_ids, start=1):
        node_id = f"tool-{index}"
        nodes.append(
            _node(
                node_id,
                "tool",
                "tool",
                labels.get(tool_id, tool_id.replace("_", " ").title()),
                0,
                y,
                toolId=tool_id,
            )
        )
        edges.append({"id": f"edge-{len(edges) + 1}", "source": previous, "target": node_id})
        previous = node_id
        y += 120

    if include_approval:
        nodes.append(_node("approval-1", "approval", "manager_approval", "Manager Approval", 0, y))
        edges.append({"id": f"edge-{len(edges) + 1}", "source": previous, "target": "approval-1"})
        previous = "approval-1"
        y += 120

    nodes.append(
        _node("output-1", "output", output_subtype, OUTPUT_NODES.get(output_subtype, "Return Result"), 0, y)
    )
    edges.append({"id": f"edge-{len(edges) + 1}", "source": previous, "target": "output-1"})

    return WorkflowGraph(nodes=nodes, edges=edges)  # type: ignore[arg-type]
