"""Bounded workflow executor.

Design rules enforced here:

* The graph is topologically ordered; cycles are rejected before execution.
* Only registry tools run. No ``eval``, ``exec``, subprocess or arbitrary HTTP.
* ``max_steps`` and ``timeout_seconds`` are hard limits, not suggestions.
* A protected write tool pauses the run and creates an approval row.
* Every node writes an ``StudioAgentRunStep`` with its input/output, so the
  execution timeline is real data rather than a UI animation.
* Cancellation is checked between steps.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..models import User, utcnow
from ..services.audit import record
from .base import ToolContext, ToolError
from .graph import node_category, node_label, node_subtype, node_tool_id, topological_order
from .models import (
    StudioAgent,
    StudioAgentApproval,
    StudioAgentMemory,
    StudioAgentRun,
    StudioAgentRunStep,
    StudioAgentToolPermission,
    StudioAgentVersion,
    StudioAgentWorkflow,
)
from .registry import get_tool


class RunError(Exception):
    pass


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------

def load_workflow(db: Session, version: StudioAgentVersion) -> StudioAgentWorkflow | None:
    return (
        db.query(StudioAgentWorkflow)
        .filter(StudioAgentWorkflow.agent_version_id == version.id)
        .first()
    )


def load_tool_permissions(db: Session, version: StudioAgentVersion) -> dict[str, StudioAgentToolPermission]:
    rows = (
        db.query(StudioAgentToolPermission)
        .filter(StudioAgentToolPermission.agent_version_id == version.id)
        .all()
    )
    return {row.tool_id: row for row in rows}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_or_create_step(run: StudioAgentRun, node, sequence: int) -> StudioAgentRunStep:
    for step in run.steps:
        if step.node_id == node.id:
            return step
    step = StudioAgentRunStep(
        run_id=run.id,
        node_id=node.id,
        node_type=node_category(node),
        node_subtype=node_subtype(node),
        label=node_label(node),
        sequence=sequence,
        tool_id=node_tool_id(node),
        status="pending",
    )
    run.steps.append(step)
    return step


def _prior_outputs(run: StudioAgentRun) -> dict[str, Any]:
    return {
        step.node_id: step.output
        for step in run.steps
        if step.status == "completed" and step.output is not None
    }


def _completed_tool_calls(run: StudioAgentRun) -> int:
    return len([s for s in run.steps if s.node_type == "tool" and s.status == "completed"])


def _elapsed_ms(run: StudioAgentRun, fallback_started: float) -> int:
    """Wall-clock duration across pauses, not just the current execution pass."""
    if run.started_at is not None:
        started = run.started_at if run.started_at.tzinfo else run.started_at.replace(tzinfo=timezone.utc)
        return max(0, int((datetime.now(timezone.utc) - started).total_seconds() * 1000))
    return int((time.monotonic() - fallback_started) * 1000)


def _compose_tool_input(spec, node, run_input: dict, prior: dict) -> dict:
    data: dict[str, Any] = dict(run_input)
    config = node.data.config if isinstance(node.data.config, dict) else {}
    for key, value in config.items():
        if value not in (None, ""):
            data.setdefault(key, value)

    # Convenience wiring so a linear workflow can pass results forward without
    # the user hand-mapping every field.
    if spec.id == "search_guidelines" and not data.get("query"):
        candidate = (
            run_input.get("query")
            or run_input.get("text")
            or run_input.get("message")
            or run_input.get("prompt")
            or ""
        )
        if not candidate:
            # Fall through to the text extracted by an earlier node.
            for output in prior.values():
                if isinstance(output, dict):
                    candidate = output.get("text") or output.get("ocrText") or ""
                    if candidate:
                        break
        data["query"] = str(candidate or "")[:600]

    if spec.id == "retrieve_evidence" and not data.get("passage_ids"):
        for output in prior.values():
            if isinstance(output, dict) and output.get("passages"):
                data["passage_ids"] = [
                    p.get("passageId") for p in output["passages"] if p.get("passageId")
                ][:10]
                break

    if spec.id in ("generate_summary", "create_review_draft"):
        for output in prior.values():
            if not isinstance(output, dict):
                continue
            if "findings" in output and "findings" not in data:
                data["findings"] = output["findings"]
            if "evidence" in output and "evidence" not in data:
                data["evidence"] = output["evidence"]
            if "passages" in output and "evidence" not in data:
                data["evidence"] = [
                    {
                        "passageId": p.get("passageId"),
                        "docName": p.get("docName"),
                        "page": p.get("page"),
                        "text": p.get("text"),
                        "verified": True,
                    }
                    for p in output["passages"]
                ]
            if "counts" in output and "findings" not in data and output.get("findings"):
                data["findings"] = output["findings"]

    if spec.id == "create_review_draft" and not data.get("summary"):
        for output in prior.values():
            if isinstance(output, dict) and output.get("summary"):
                data["summary"] = output["summary"]
                break

    return data


def _run_ai_node(node, run_input: dict, prior: dict) -> dict:
    """Deterministic AI-node behaviour. Never claims a model ran when it did not."""
    subtype = node_subtype(node)
    findings: list[dict] = []
    evidence: list[dict] = []
    for output in prior.values():
        if not isinstance(output, dict):
            continue
        if isinstance(output.get("findings"), list):
            findings.extend(output["findings"])
        if isinstance(output.get("evidence"), list):
            evidence.extend(output["evidence"])

    if subtype in ("summarisation", "ai_agent"):
        # Reuse the registry tool so LLM configuration is handled in one place.
        spec = get_tool("generate_summary")
        if spec:
            ctx = ToolContext(db=None, user=None, workspace="", input={  # type: ignore[arg-type]
                "findings": findings,
                "evidence": evidence,
                "text": run_input.get("text", ""),
            })
            # generate_summary does not touch the DB; a null session is safe.
            return spec.executor(ctx)

    if subtype == "classification":
        buckets: dict[str, int] = {}
        for finding in findings:
            key = str(finding.get("severity", "Medium"))
            buckets[key] = buckets.get(key, 0) + 1
        return {"classification": buckets, "count": len(findings)}

    if subtype == "evidence_verification":
        verified = len([e for e in evidence if e.get("verified")])
        return {"verified": verified, "total": len(evidence), "evidence": evidence}

    return {
        "note": f"'{node_label(node)}' is a pass-through analysis node in this build.",
        "findings": findings,
        "evidence": evidence,
    }


def _run_logic_node(node, run_input: dict, prior: dict) -> dict:
    subtype = node_subtype(node)
    config = node.data.config if isinstance(node.data.config, dict) else {}

    if subtype == "if_else":
        field = str(config.get("field") or "findings")
        operator = str(config.get("operator") or "not_empty")
        value = config.get("value")
        actual = run_input.get(field)
        if actual is None:
            for output in prior.values():
                if isinstance(output, dict) and field in output:
                    actual = output[field]
                    break
        result = _compare(actual, operator, value)
        return {"condition": {"field": field, "operator": operator, "value": value}, "result": result}

    if subtype == "merge_results":
        merged: dict[str, Any] = {}
        for output in prior.values():
            if isinstance(output, dict):
                merged.update(output)
        return {"merged": merged, "sources": len(prior)}

    if subtype == "filter":
        items = config.get("items") or []
        for output in prior.values():
            if isinstance(output, dict) and isinstance(output.get("findings"), list):
                items = output["findings"]
                break
        field = str(config.get("field") or "severity")
        expected = config.get("equals")
        filtered = [i for i in items if isinstance(i, dict) and (expected is None or i.get(field) == expected)]
        return {"filtered": filtered, "count": len(filtered)}

    if subtype == "compare_values":
        left = run_input.get(str(config.get("left") or ""))
        right = config.get("right")
        return {"equal": left == right, "left": left, "right": right}

    return {"note": f"Logic node '{node_label(node)}' is a pass-through in this build."}


def _compare(actual: Any, operator: str, expected: Any) -> bool:
    try:
        if operator in ("not_empty", "exists"):
            return bool(actual)
        if operator == "empty":
            return not actual
        if operator == "eq":
            return actual == expected
        if operator == "neq":
            return actual != expected
        if operator == "gt":
            return float(actual) > float(expected)
        if operator == "gte":
            return float(actual) >= float(expected)
        if operator == "lt":
            return float(actual) < float(expected)
        if operator == "lte":
            return float(actual) <= float(expected)
        if operator == "contains":
            return str(expected).lower() in str(actual).lower()
    except Exception:
        return False
    return bool(actual)


def _run_output_node(db: Session, agent: StudioAgent, node, run: StudioAgentRun, run_input: dict, prior: dict) -> dict:
    subtype = node_subtype(node)
    findings: list[dict] = []
    evidence: list[dict] = []
    summary = ""
    for output in prior.values():
        if not isinstance(output, dict):
            continue
        if isinstance(output.get("findings"), list):
            findings.extend(output["findings"])
        if isinstance(output.get("evidence"), list):
            evidence.extend(output["evidence"])
        if isinstance(output.get("summary"), str) and not summary:
            summary = output["summary"]

    if subtype == "save_review_draft":
        spec = get_tool("create_review_draft")
        ctx = ToolContext(
            db=db,
            user=None,  # type: ignore[arg-type]
            workspace=agent.workspace,
            input={
                "submission_id": run_input.get("submission_id"),
                "findings": findings,
                "evidence": evidence,
                "summary": summary,
            },
            agent_id=agent.id,
            run_id=run.id,
        )
        return spec.executor(ctx) if spec else {"draft": {"findings": findings, "summary": summary}}

    if subtype == "create_report":
        stats = {k: v for k, v in prior.items() if isinstance(v, dict)}
        report_lines = [summary] if summary else []
        report_lines.append(f"Evidence-backed findings: {len(findings)}.")
        return {
            "report": "\n".join(report_lines).strip(),
            "summary": summary,
            "findings": findings,
            "statistics": stats,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }

    if subtype == "create_notification":
        return {
            "notificationDraft": {
                "title": "Agent Studio review completed",
                "body": summary or "An agent completed a governed review.",
            },
            "note": "Notification output is prepared here; the protected create_notification tool must run with approval to persist it.",
        }

    if subtype == "create_sentinel_task":
        return {
            "sentinelTaskProposal": {
                "reason": summary or "Agent identified content that may need reassessment.",
                "findings": findings,
            },
            "note": "A human manager must create the Sentinel task; agents cannot write reassessment tasks.",
        }

    return {
        "status": "ok",
        "summary": summary,
        "findings": findings,
        "evidence": evidence,
        "lastStep": next(reversed(list(prior.values())), None) if prior else None,
    }


# ---------------------------------------------------------------------------
# Public executor
# ---------------------------------------------------------------------------

def run_agent(
    db: Session,
    *,
    agent: StudioAgent,
    version: StudioAgentVersion,
    user: User,
    run_input: dict | None = None,
    trigger_type: str = "manual",
    trigger_ref: str = "",
    existing_run: StudioAgentRun | None = None,
    approved: bool = False,
) -> StudioAgentRun:
    workflow_row = load_workflow(db, version)
    if workflow_row is None:
        raise RunError("This agent version has no saved workflow.")

    from .schemas import WorkflowGraph

    try:
        graph = WorkflowGraph(**workflow_row.graph)
        order = topological_order(graph)
    except Exception as exc:
        raise RunError(f"Workflow cannot be executed: {exc}") from exc

    spec = version.spec or {}
    limits = spec.get("execution_limits") or {}
    max_steps = int(limits.get("max_steps") or 10)
    timeout_seconds = int(limits.get("timeout_seconds") or 120)
    permissions = load_tool_permissions(db, version)

    if existing_run is not None:
        run = existing_run
        run.status = "running"
        run.error = None
        if run_input:
            run.input = run_input
    else:
        run = StudioAgentRun(
            workspace=agent.workspace,
            agent_id=agent.id,
            agent_version_id=version.id,
            triggered_by=user.id,
            trigger_type=trigger_type,
            trigger_ref=trigger_ref,
            status="running",
            input=run_input or {},
            started_at=utcnow(),
        )
        db.add(run)
        db.flush()

    run_input = run.input or {}
    started = time.monotonic()
    prior = _prior_outputs(run)
    executed_steps = 0
    tool_calls = 0

    try:
        for sequence, node in enumerate(order):
            db.refresh(run)
            if run.status == "cancelled":
                return run

            if time.monotonic() - started > timeout_seconds:
                raise RunError(f"Execution exceeded the {timeout_seconds}s timeout.")

            step = _get_or_create_step(run, node, sequence)

            # Resume: skip nodes that already completed successfully.
            if step.status == "completed" and step.node_id in prior:
                continue

            if executed_steps >= max_steps:
                raise RunError(f"Execution exceeded the max_steps limit ({max_steps}).")

            category = node_category(node)

            if category == "trigger":
                step.status = "completed"
                step.started_at = utcnow()
                step.finished_at = utcnow()
                step.input = {"trigger": node_subtype(node), "input": run_input}
                step.output = {"triggered": True, "triggerType": trigger_type}
                prior[node.id] = step.output
                db.flush()
                continue

            if category == "tool":
                tool_id = node_tool_id(node)
                spec_tool = get_tool(tool_id) if tool_id else None
                if spec_tool is None:
                    raise RunError(f"Tool '{tool_id}' is not registered.")
                if tool_id not in permissions:
                    raise RunError(f"Tool '{tool_id}' is not permitted for this agent version.")

                # Protected write action -> human approval checkpoint.
                if spec_tool.approval_required and not approved:
                    step.status = "waiting_approval"
                    step.started_at = utcnow()
                    step.input = {"toolId": tool_id}
                    approval = StudioAgentApproval(
                        workspace=agent.workspace,
                        run_id=run.id,
                        step_id=step.id,
                        agent_id=agent.id,
                        action=f"Run protected tool: {spec_tool.name}",
                        status="pending",
                        requested_by=user.id,
                    )
                    db.add(approval)
                    run.status = "waiting_approval"
                    run.step_count = len(run.steps)
                    db.commit()
                    db.refresh(run)
                    return run

                tool_input = _compose_tool_input(spec_tool, node, run_input, prior)
                step.status = "running"
                step.started_at = utcnow()
                step.input = {"toolId": tool_id, "input": _redact(tool_input)}
                db.flush()

                ctx = ToolContext(
                    db=db,
                    user=user,
                    workspace=agent.workspace,
                    input=tool_input,
                    agent_id=agent.id,
                    run_id=run.id,
                    approved=approved,
                )
                try:
                    result = spec_tool.executor(ctx)
                except ToolError as exc:
                    step.finished_at = utcnow()
                    # A tool that is simply missing an identifier is not a
                    # failure of the run: the agent has nothing to look up yet.
                    # Record what it needs and let the workflow continue so the
                    # user gets "tell me the exception id" instead of a red run.
                    if getattr(exc, "code", None) == "missing_input":
                        step.status = "skipped"
                        step.error = exc.message
                        step.output = {
                            "needsInput": True,
                            "message": exc.message,
                            "tool": spec_tool.name,
                        }
                        prior[node.id] = step.output
                        db.flush()
                        continue
                    step.status = "failed"
                    step.error = exc.message
                    raise RunError(f"{spec_tool.name}: {exc.message}") from exc

                step.status = "completed"
                step.output = result
                step.finished_at = utcnow()
                step.duration_ms = int((step.finished_at - step.started_at).total_seconds() * 1000)
                prior[node.id] = result
                tool_calls += 1
                executed_steps += 1
                db.flush()
                continue

            if category == "ai":
                step.status = "running"
                step.started_at = utcnow()
                step.input = {"subtype": node_subtype(node)}
                result = _run_ai_node(node, run_input, prior)
                step.status = "completed"
                step.output = result
                step.finished_at = utcnow()
                step.duration_ms = int((step.finished_at - step.started_at).total_seconds() * 1000)
                prior[node.id] = result
                executed_steps += 1
                db.flush()
                continue

            if category == "logic":
                step.status = "running"
                step.started_at = utcnow()
                step.input = {"subtype": node_subtype(node)}
                result = _run_logic_node(node, run_input, prior)
                step.status = "completed"
                step.output = result
                step.finished_at = utcnow()
                step.duration_ms = int((step.finished_at - step.started_at).total_seconds() * 1000)
                prior[node.id] = result
                executed_steps += 1
                db.flush()
                continue

            if category == "approval":
                if not approved:
                    step.status = "waiting_approval"
                    step.started_at = utcnow()
                    approval = StudioAgentApproval(
                        workspace=agent.workspace,
                        run_id=run.id,
                        step_id=step.id,
                        agent_id=agent.id,
                        action=f"Approve checkpoint: {node_label(node)}",
                        status="pending",
                        requested_by=user.id,
                    )
                    db.add(approval)
                    run.status = "waiting_approval"
                    run.step_count = len(run.steps)
                    db.commit()
                    db.refresh(run)
                    return run
                step.status = "completed"
                step.started_at = utcnow()
                step.finished_at = utcnow()
                step.output = {"approved": True, "approvedBy": user.id}
                prior[node.id] = step.output
                db.flush()
                continue

            if category == "output":
                step.status = "running"
                step.started_at = utcnow()
                step.input = {"subtype": node_subtype(node)}
                result = _run_output_node(db, agent, node, run, run_input, prior)
                step.status = "completed"
                step.output = result
                step.finished_at = utcnow()
                step.duration_ms = int((step.finished_at - step.started_at).total_seconds() * 1000)
                prior[node.id] = result
                run.output = result
                executed_steps += 1
                db.flush()
                continue

            step.status = "skipped"
            step.output = {"note": f"Unknown node category '{category}'."}
            db.flush()

        # Completion
        if run.output is None and prior:
            run.output = next(reversed(list(prior.values())))
        run.status = "completed"
        run.finished_at = utcnow()
        run.duration_ms = _elapsed_ms(run, started)
        run.step_count = len(run.steps)
        run.tool_call_count = _completed_tool_calls(run)
        agent.last_run_at = utcnow()

        _save_memory(db, agent, user, run, spec)

        record(
            db,
            action="Agent Executed",
            entity_title=agent.name,
            entity_kind="agent",
            entity_id=agent.id,
            user_id=user.id,
            workspace=agent.workspace,
            brand=agent.workspace,
            details=f"Run {run.id} completed with {_completed_tool_calls(run)} tool call(s).",
        )
        db.commit()
        db.refresh(run)
        return run

    except RunError as exc:
        run.status = "failed"
        run.error = str(exc)
        run.finished_at = utcnow()
        run.duration_ms = _elapsed_ms(run, started)
        run.step_count = len(run.steps)
        run.tool_call_count = _completed_tool_calls(run)
        for step in run.steps:
            if step.status == "running":
                step.status = "failed"
                step.error = str(exc)
                step.finished_at = utcnow()
        record(
            db,
            action="Agent Execution Failed",
            entity_title=agent.name,
            entity_kind="agent",
            entity_id=agent.id,
            user_id=user.id,
            workspace=agent.workspace,
            brand=agent.workspace,
            status="Failed",
            details=str(exc)[:500],
        )
        db.commit()
        db.refresh(run)
        return run


def _redact(payload: dict) -> dict:
    """Never persist obvious secrets in a step input."""
    sensitive = {"password", "secret", "token", "api_key", "apikey", "authorization", "credential"}
    clean: dict[str, Any] = {}
    for key, value in payload.items():
        if any(marker in str(key).lower() for marker in sensitive):
            clean[key] = "[redacted]"
        else:
            clean[key] = value
    return clean


def _save_memory(db: Session, agent: StudioAgent, user: User, run: StudioAgentRun, spec: dict) -> None:
    memory = spec.get("memory") or {}
    if not memory.get("enabled") or memory.get("scope") not in ("session", "persistent"):
        return
    summary = ""
    if isinstance(run.output, dict):
        summary = str(run.output.get("summary") or "")[:2000]
    if not summary:
        return
    existing = (
        db.query(StudioAgentMemory)
        .filter(
            StudioAgentMemory.agent_id == agent.id,
            StudioAgentMemory.user_id == user.id,
            StudioAgentMemory.session_id == "default",
            StudioAgentMemory.key == "last_summary",
        )
        .first()
    )
    if existing:
        existing.value = {"summary": summary, "runId": run.id}
        existing.updated_at = utcnow()
    else:
        db.add(
            StudioAgentMemory(
                workspace=agent.workspace,
                agent_id=agent.id,
                user_id=user.id,
                session_id="default",
                key="last_summary",
                value={"summary": summary, "runId": run.id},
            )
        )
