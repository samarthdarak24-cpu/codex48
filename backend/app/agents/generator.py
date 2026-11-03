"""Prompt -> validated agent specification.

The model is asked for *configuration*, never code. Its response is parsed,
normalised, filtered against the tool allow-list, then validated with the same
Pydantic schema the API accepts. If no LLM is configured — or the response is
unusable — a deterministic keyword router selects one of the six templates, so
the feature still works offline without pretending an LLM ran.
"""
from __future__ import annotations

import json
import re
from typing import Any

from .. import ai
from ..ai import ai_available, llm_complete
from ..config import settings
from .graph import SUBTYPE_CATEGORY, TRIGGERS, build_graph
from .registry import TOOL_IDS, TOOL_SPECS, get_tool
from .schemas import (
    AgentSpec,
    ApprovalPolicy,
    ExecutionLimits,
    MemoryConfig,
    NodeData,
    NodePosition,
    WorkflowEdge,
    WorkflowGraph,
    WorkflowNode,
)
from .templates import TEMPLATE_DEFS, build_spec_from_template, get_template

SYSTEM_PROMPT = """You are a senior AI-agent architect for Precedent, a brand-governance platform.

Design a bounded, read-only-by-default agent that answers the user's request.
Return ONLY a JSON object (no markdown, no commentary) with this shape:

{
  "name": "short agent name",
  "description": "one sentence",
  "category": "brand_compliance | guideline_research | visual_review | exceptions | sentinel | audit",
  "instructions": "system instructions for the agent",
  "tools": ["tool_id", ...],
  "input_schema": {"type": "object", "properties": {}},
  "output_schema": {"type": "object", "properties": {}},
  "memory": {"enabled": false, "scope": "none"},
  "workflow": {
    "nodes": [
      {"id": "trigger-1", "type": "trigger", "position": {"x": 0, "y": 0},
       "data": {"label": "Manual Trigger", "subtype": "manual_trigger"}},
      {"id": "tool-1", "type": "tool", "position": {"x": 0, "y": 120},
       "data": {"label": "Retrieve submission", "subtype": "tool", "toolId": "get_submission"}}
    ],
    "edges": [{"id": "edge-1", "source": "trigger-1", "target": "tool-1"}]
  },
  "approval_policy": {"human_approval_required_for_write_actions": true, "approval_required_tools": []},
  "execution_limits": {"max_steps": 10, "timeout_seconds": 120}
}

HARD RULES:
- `tools` MUST be a subset of the allow-list below. Never invent tool ids.
- The workflow must contain exactly one trigger, be acyclic, and every tool node
  must reference an allow-listed tool via data.toolId.
- Node type must be one of: trigger, ai, tool, logic, approval, output.
- Never propose approving/rejecting content, activating rules, granting exceptions,
  publishing content or editing audit records. Those actions are forbidden.
- Never include secrets, API keys, URLs, shell commands or source code.
- Keep the workflow between 2 and 12 nodes.
"""


def _tool_catalogue_text() -> str:
    lines = []
    for spec in TOOL_SPECS:
        lines.append(f"- {spec.id} ({spec.permission}): {spec.description}")
    return "\n".join(lines)


def _extract_json(text: str) -> dict | None:
    if not text:
        return None
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, dict) else None
    except Exception:
        pass
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        data = json.loads(cleaned[start : end + 1])
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _pick(data: dict, *keys: str, default=None):
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return default


def _coerce_workflow(raw: Any, tools: list[str]) -> WorkflowGraph:
    if not isinstance(raw, dict):
        return build_graph(tools, tool_labels=_labels(tools))

    raw_nodes = raw.get("nodes") or []
    raw_edges = raw.get("edges") or []
    if not isinstance(raw_nodes, list) or not raw_nodes:
        return build_graph(tools, tool_labels=_labels(tools))

    nodes: list[WorkflowNode] = []
    seen_ids: set[str] = set()
    for index, item in enumerate(raw_nodes[:40]):
        if not isinstance(item, dict):
            continue
        node_id = str(item.get("id") or f"node-{index + 1}")
        if node_id in seen_ids:
            node_id = f"{node_id}-{index + 1}"
        seen_ids.add(node_id)

        data = item.get("data") if isinstance(item.get("data"), dict) else {}
        subtype = str(data.get("subtype") or item.get("subtype") or "").strip()
        node_type = str(item.get("type") or "").strip()
        if not subtype:
            subtype = "tool" if data.get("toolId") else (node_type or "tool")
        category = SUBTYPE_CATEGORY.get(subtype, node_type or "tool")
        if category not in ("trigger", "ai", "tool", "logic", "approval", "output"):
            category = "tool"

        position = item.get("position") if isinstance(item.get("position"), dict) else {}
        nodes.append(
            WorkflowNode(
                id=node_id,
                type=category,  # type: ignore[arg-type]
                position=NodePosition(x=float(position.get("x", 0) or 0), y=float(position.get("y", index * 120))),
                data=NodeData(
                    label=str(data.get("label") or subtype.replace("_", " ").title()),
                    subtype=subtype,
                    toolId=data.get("toolId"),
                    description=str(data.get("description") or ""),
                    config=data.get("config") if isinstance(data.get("config"), dict) else {},
                ),
            )
        )

    edges: list[WorkflowEdge] = []
    valid_ids = {n.id for n in nodes}
    for index, item in enumerate(raw_edges[:80]):
        if not isinstance(item, dict):
            continue
        source, target = item.get("source"), item.get("target")
        if source in valid_ids and target in valid_ids and source != target:
            edges.append(
                WorkflowEdge(
                    id=str(item.get("id") or f"edge-{index + 1}"),
                    source=str(source),
                    target=str(target),
                    label=item.get("label"),
                    condition=item.get("condition"),
                )
            )

    if not edges:
        for previous, current in zip(nodes, nodes[1:]):
            edges.append(WorkflowEdge(id=f"edge-{len(edges) + 1}", source=previous.id, target=current.id))

    return WorkflowGraph(nodes=nodes, edges=edges)


def _labels(tools: list[str]) -> dict[str, str]:
    return {tool_id: (get_tool(tool_id).name if get_tool(tool_id) else tool_id) for tool_id in tools}


def _normalise_tools(raw: Any) -> tuple[list[str], list[str]]:
    """Return (valid_tools, dropped_tools)."""
    if not isinstance(raw, list):
        return [], []
    valid: list[str] = []
    dropped: list[str] = []
    for item in raw:
        if isinstance(item, str) and item in TOOL_IDS and item not in valid:
            valid.append(item)
        elif isinstance(item, str):
            dropped.append(item)
    return valid, dropped


def _default_tools_for_prompt(prompt: str) -> list[str]:
    text = prompt.lower()
    if any(k in text for k in ("exception", "waiver", "variance")):
        return ["get_exception", "search_rules", "get_owner", "check_effective_dates", "generate_summary"]
    if any(k in text for k in ("sentinel", "impact", "affected", "rule change")):
        return ["search_rules", "get_affected_submissions", "check_effective_dates", "generate_summary"]
    if any(k in text for k in ("audit", "weekly report", "governance report", "trend")):
        return ["get_audit_events", "get_review_statistics", "get_exception_statistics", "generate_summary"]
    if any(k in text for k in ("poster", "visual", "image", "ocr", "logo", "contrast")):
        return ["get_submission", "get_visual_analysis", "extract_document_text", "run_brand_rules", "generate_summary"]
    if any(k in text for k in ("guideline", "research", "answer", "question", "policy lookup")):
        return ["search_guidelines", "retrieve_evidence", "generate_summary"]
    return [
        "get_submission",
        "extract_document_text",
        "search_guidelines",
        "run_brand_rules",
        "retrieve_evidence",
        "generate_summary",
        "create_review_draft",
    ]


def _fallback_template(prompt: str) -> str:
    text = prompt.lower()
    scores = {
        "brand-compliance-reviewer": sum(
            k in text for k in ("review", "compliance", "claim", "submission", "marketing", "poster", "violation")
        ),
        "guideline-research-assistant": sum(
            k in text for k in ("guideline", "research", "answer", "question", "policy")
        ),
        "visualguard-assistant": sum(k in text for k in ("visual", "poster", "image", "logo", "ocr")),
        "exception-triage-assistant": sum(k in text for k in ("exception", "waiver", "variance")),
        "sentinel-impact-assistant": sum(k in text for k in ("sentinel", "impact", "affected", "rule change")),
        "audit-report-assistant": sum(k in text for k in ("audit", "report", "weekly", "trend")),
    }
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "brand-compliance-reviewer"


def _derive_name(prompt: str) -> str:
    cleaned = re.sub(r"^(create|build|make|design)\s+(an?\s+)?(ai\s+)?(agent|assistant)\s+(that|which|to)\s+", "", prompt.strip(), flags=re.I)
    cleaned = cleaned.strip(" .")
    if not cleaned:
        return "Untitled Agent"
    words = cleaned.split()[:6]
    name = " ".join(words)
    return name[:1].upper() + name[1:]


def generate_from_prompt(
    prompt: str,
    *,
    category: str | None = None,
    brand: str | None = None,
) -> tuple[AgentSpec, dict]:
    """Return ``(spec, meta)``. Never raises for a well-formed prompt string."""
    meta: dict[str, Any] = {
        "generatedBy": "fallback",
        "model": None,
        "droppedTools": [],
        "notes": [],
        "llmConfigured": ai_available(),
    }

    if ai_available():
        user_prompt = (
            f"User request:\n{prompt}\n\n"
            f"Brand/workspace: {brand or 'PureWorkspace'}\n"
            f"Preferred category: {category or 'auto'}\n\n"
            f"Allow-listed tools:\n{_tool_catalogue_text()}\n"
        )
        # 1800 was too small: a reasoning model spends ~700-1600 tokens thinking
        # before it emits the spec, so the reply was cut mid-object and every
        # draft silently fell back to keyword routing. The spec itself needs
        # ~1800 output tokens on top of that.
        raw = llm_complete(SYSTEM_PROMPT, user_prompt, max_tokens=4096, temperature=0.2)
        data = _extract_json(raw) if raw else None
        if data:
            spec = _spec_from_llm(data, prompt, category)
            if spec is not None:
                meta.update(
                    {
                        "generatedBy": "llm",
                        "model": settings.llm_model,
                        "droppedTools": meta.get("droppedTools", []),
                    }
                )
                return spec, meta
            meta["notes"].append("The model returned a configuration that failed validation; used the deterministic router instead.")
        else:
            reason = ai.last_error()
            meta["notes"].append(
                "The model did not return valid JSON"
                + (f" ({reason})" if reason else "")
                + "; used the deterministic router instead."
            )

    # Deterministic fallback: pick the closest template, then keep its clear
    # product name (the prompt itself is preserved as the description).
    template_id = _fallback_template(prompt)
    spec = build_spec_from_template(
        template_id,
        description=prompt.strip()[:240],
    )
    if spec is None:  # defensive — the catalogue always contains this id
        spec = build_spec_from_template("brand-compliance-reviewer")
    meta["notes"].append(f"Matched template '{template_id}' using keyword routing.")
    if category:
        spec.category = category
    return spec, meta


def _spec_from_llm(data: dict, prompt: str, category: str | None) -> AgentSpec | None:
    # Unwrap common envelopes.
    for key in ("agent", "spec", "configuration", "config"):
        if isinstance(data.get(key), dict):
            data = data[key]
            break

    tools, dropped = _normalise_tools(_pick(data, "tools", "tool_ids", "toolIds", default=[]))
    if not tools:
        tools = _default_tools_for_prompt(prompt)

    workflow = _coerce_workflow(_pick(data, "workflow", "graph", default={}), tools)

    # If the model omitted tool nodes, rebuild the graph deterministically.
    graph_tools = [
        node.data.toolId
        for node in workflow.nodes
        if node.type == "tool" and node.data.toolId
    ]
    if not graph_tools:
        workflow = build_graph(
            tools,
            tool_labels=_labels(tools),
            trigger="manual_trigger",
            include_approval=any(get_tool(t) and get_tool(t).approval_required for t in tools),
            output_subtype="save_review_draft" if "create_review_draft" in tools else "return_result",
        )

    memory_raw = _pick(data, "memory", default={}) or {}
    policy_raw = _pick(data, "approval_policy", "approvalPolicy", default={}) or {}
    limits_raw = _pick(data, "execution_limits", "executionLimits", default={}) or {}

    try:
        spec = AgentSpec(
            name=str(_pick(data, "name", default=_derive_name(prompt)))[:120],
            description=str(_pick(data, "description", default=prompt[:240])),
            category=str(category or _pick(data, "category", default="brand_compliance")),
            icon=str(_pick(data, "icon", default="sparkles")),
            instructions=str(_pick(data, "instructions", "system_instructions", "systemInstructions", default="")),
            tools=tools,
            input_schema=_pick(data, "input_schema", "inputSchema", default={}) or {},
            output_schema=_pick(data, "output_schema", "outputSchema", default={}) or {},
            memory=MemoryConfig(
                enabled=bool(memory_raw.get("enabled", False)),
                scope=memory_raw.get("scope") or "none",
            ),
            workflow=workflow,
            approval_policy=ApprovalPolicy(
                human_approval_required_for_write_actions=True,
                approval_required_tools=[
                    t for t in (policy_raw.get("approval_required_tools") or []) if isinstance(t, str)
                ],
            ),
            execution_limits=ExecutionLimits(
                max_steps=int(limits_raw.get("max_steps") or limits_raw.get("maxSteps") or 10),
                timeout_seconds=int(limits_raw.get("timeout_seconds") or limits_raw.get("timeoutSeconds") or 120),
            ),
        )
    except Exception:
        return None

    if not spec.instructions.strip():
        spec.instructions = (
            "Act as a read-only brand-governance assistant. Use only the enabled tools, cite exact "
            "stored evidence, and never approve, reject, publish or alter official records."
        )
    if dropped:
        # Surface what was rejected; the caller includes this in the response meta.
        setattr(spec, "__dropped_tools__", dropped)
    return spec


def dropped_tools(spec: AgentSpec) -> list[str]:
    return list(getattr(spec, "__dropped_tools__", []) or [])


def template_choices() -> list[dict]:
    return [{"id": d["id"], "name": d["name"]} for d in TEMPLATE_DEFS]
