"""Specification and publish-gate validation."""
from __future__ import annotations

from .graph import node_category, node_tool_id, validate_graph
from .registry import approval_required_tool_ids, get_tool
from .schemas import AgentSpec


def validate_spec(spec: AgentSpec) -> dict:
    errors: list[str] = []
    warnings: list[str] = []

    if not spec.name.strip():
        errors.append("Agent name is required.")
    if not spec.instructions.strip():
        errors.append("System instructions are required.")
    if not spec.tools:
        warnings.append("No tools are enabled; the agent cannot read any Precedent data.")

    unknown = [t for t in spec.tools if get_tool(t) is None]
    if unknown:
        errors.append("Unknown or unavailable tool(s): " + ", ".join(unknown))

    write_tools = [t for t in spec.tools if (get_tool(t) and get_tool(t).permission == "write")]
    if write_tools and not spec.approval_policy.human_approval_required_for_write_actions:
        errors.append(
            "Write tools require human approval; the policy cannot disable it for: "
            + ", ".join(write_tools)
        )

    if spec.memory.enabled and spec.memory.scope == "none":
        warnings.append("Memory is enabled but scope is 'none'; memory will not persist.")

    graph_result = validate_graph(
        spec.workflow,
        allowed_tools=spec.tools,
        approval_required_tools=approval_required_tool_ids(),
    )
    errors.extend(graph_result["errors"])
    warnings.extend(graph_result["warnings"])

    # Consistency between the declared tool list and the graph.
    graph_tools = {
        node_tool_id(node)
        for node in spec.workflow.nodes
        if node_category(node) == "tool" and node_tool_id(node)
    }
    declared = set(spec.tools)
    missing_from_graph = declared - graph_tools
    missing_from_spec = graph_tools - declared
    if missing_from_graph:
        warnings.append(
            "Enabled but not placed in the workflow: " + ", ".join(sorted(missing_from_graph))
        )
    if missing_from_spec:
        errors.append(
            "Workflow uses tools that are not enabled on the agent: "
            + ", ".join(sorted(missing_from_spec))
        )

    executable_nodes = [n for n in spec.workflow.nodes if node_category(n) not in ("trigger", "output")]
    if len(executable_nodes) > spec.execution_limits.max_steps:
        errors.append(
            f"Workflow has {len(executable_nodes)} executable steps but max_steps is "
            f"{spec.execution_limits.max_steps}."
        )

    return {
        "ok": not errors,
        "errors": errors,
        "warnings": warnings,
        "order": graph_result.get("order", []),
        "toolCount": len(spec.tools),
        "nodeCount": len(spec.workflow.nodes),
        "edgeCount": len(spec.workflow.edges),
    }


def publish_gate(spec: AgentSpec) -> dict:
    """Publishing is stricter than saving a draft: no warnings may remain."""
    result = validate_spec(spec)
    errors = list(result["errors"])
    if not result["ok"]:
        return {"ok": False, "errors": errors, "warnings": result["warnings"]}

    if not spec.tools:
        errors.append("Enable at least one tool before publishing.")
    if not any(node_category(n) == "trigger" for n in spec.workflow.nodes):
        errors.append("Add a trigger node before publishing.")

    return {
        "ok": not errors,
        "errors": errors,
        "warnings": result["warnings"],
    }
