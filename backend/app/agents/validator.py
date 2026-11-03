"""Agent and Workflow Graph Validator for Precedent Agent Studio."""
from typing import Any, Dict, List, Tuple
from app.agents.registry import get_allowed_tool_ids, validate_tools


class AgentValidationError(Exception):
    def __init__(self, errors: List[str]):
        super().__init__("; ".join(errors))
        self.errors = errors


def validate_agent_configuration(agent_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validates an agent definition dictionary.

    Returns:
        (is_valid, list_of_errors)
    """
    errors: List[str] = []

    name = agent_data.get("name", "").strip()
    if not name:
        errors.append("Agent name cannot be empty.")
    elif len(name) > 120:
        errors.append("Agent name must be 120 characters or fewer.")

    instructions = agent_data.get("instructions", "").strip()
    if not instructions:
        errors.append("Agent instructions cannot be empty.")

    # Validate tools
    tools = agent_data.get("tools", [])
    valid_tools, rejected_tools = validate_tools(tools)
    if rejected_tools:
        errors.append(f"Contains unregistered tools: {', '.join(rejected_tools)}")

    # Validate execution limits
    limits = agent_data.get("execution_limits", {})
    if limits:
        max_steps = limits.get("max_steps", 10)
        if not (1 <= max_steps <= 50):
            errors.append("Execution limit 'max_steps' must be between 1 and 50.")
        timeout = limits.get("timeout_seconds", 120)
        if not (5 <= timeout <= 600):
            errors.append("Execution limit 'timeout_seconds' must be between 5 and 600.")

    # Validate workflow graph if present
    workflow = agent_data.get("workflow", {})
    if workflow:
        graph_valid, graph_errors = validate_workflow_graph(workflow)
        if not graph_valid:
            errors.extend(graph_errors)

    return len(errors) == 0, errors


def validate_workflow_graph(workflow: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validates React Flow nodes and edges for correctness and cycle avoidance.

    Returns:
        (is_valid, list_of_errors)
    """
    errors: List[str] = []
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])

    if not nodes:
        errors.append("Workflow must contain at least one node.")
        return False, errors

    node_ids = {n.get("id") for n in nodes if n.get("id")}
    if len(node_ids) != len(nodes):
        errors.append("Workflow contains duplicate node IDs.")

    # Check for trigger node
    trigger_nodes = [n for n in nodes if n.get("type") == "trigger"]
    if not trigger_nodes:
        errors.append("Workflow must contain at least one Trigger node.")

    # Check for output node
    output_nodes = [n for n in nodes if n.get("type") == "output"]
    if not output_nodes:
        errors.append("Workflow must contain at least one Output node.")

    # Validate edges
    valid_tools = set(get_allowed_tool_ids())
    for n in nodes:
        if n.get("type") == "tool":
            t_id = n.get("data", {}).get("tool_id")
            if t_id and t_id not in valid_tools:
                errors.append(f"Node '{n.get('id')}' references unapproved tool '{t_id}'.")

    for e in edges:
        src = e.get("source")
        tgt = e.get("target")
        if src not in node_ids:
            errors.append(f"Edge '{e.get('id')}' source '{src}' does not exist.")
        if tgt not in node_ids:
            errors.append(f"Edge '{e.get('id')}' target '{tgt}' does not exist.")
        if src == tgt:
            errors.append(f"Self-loop detected on node '{src}'.")

    return len(errors) == 0, errors

