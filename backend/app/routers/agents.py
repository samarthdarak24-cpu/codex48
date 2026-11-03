"""Agent Studio HTTP API.

Mounted twice: once at the root aliases (`/agents`) to match the rest of the
app's compatibility surface, and once under `/api/v1` for the canonical
catalogue.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user, require_manager
from ..models import User, utcnow
from ..services.audit import record
from ..agents import generator, runtime, templates, validator
from ..agents.graph import (
    AI_NODES,
    APPROVAL_NODES,
    LOGIC_NODES,
    OUTPUT_NODES,
    TRIGGERS,
    node_category,
    node_tool_id,
)
from ..agents.models import (
    StudioAgent,
    StudioAgentApproval,
    StudioAgentMemory,
    StudioAgentRun,
    StudioAgentRunStep,
    StudioAgentToolPermission,
    StudioAgentTrigger,
    StudioAgentVersion,
    StudioAgentWorkflow,
)
from ..agents.permissions import (
    assert_agent_visible,
    assert_can_manage,
    assert_can_use,
    assert_can_view_runs,
    assert_manager,
)
from ..agents.registry import get_tool, list_tools, tools_by_category
from ..agents.schemas import (
    AgentCreateIn,
    AgentPatchIn,
    AgentSpec,
    ApprovalIn,
    DraftFromPromptIn,
    ExecuteAgentIn,
    TestAgentIn,
    WorkflowSaveIn,
)


# ---------------------------------------------------------------------------
# Serialisation
# ---------------------------------------------------------------------------

def _slug(name: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return value[:60] or "agent"


def _current_version(db: Session, agent: StudioAgent) -> StudioAgentVersion | None:
    return (
        db.query(StudioAgentVersion)
        .filter(StudioAgentVersion.agent_id == agent.id)
        .order_by(desc(StudioAgentVersion.version_number))
        .first()
    )


def _published_version(db: Session, agent: StudioAgent) -> StudioAgentVersion | None:
    if not agent.published_version_id:
        return None
    return db.get(StudioAgentVersion, agent.published_version_id)


def _version_tools(db: Session, version: StudioAgentVersion) -> list[dict]:
    rows = (
        db.query(StudioAgentToolPermission)
        .filter(StudioAgentToolPermission.agent_version_id == version.id)
        .all()
    )
    out = []
    for row in rows:
        spec = get_tool(row.tool_id)
        out.append(
            {
                "id": row.tool_id,
                "name": spec.name if spec else row.tool_id,
                "description": spec.description if spec else "",
                "permission": row.permission_class,
                "approvalRequired": row.approval_required,
            }
        )
    return out


def _workflow_dict(db: Session, version: StudioAgentVersion) -> dict:
    row = (
        db.query(StudioAgentWorkflow)
        .filter(StudioAgentWorkflow.agent_version_id == version.id)
        .first()
    )
    return row.graph if row else {"nodes": [], "edges": []}


def _serialize_version(db: Session, version: StudioAgentVersion) -> dict:
    return {
        "id": version.id,
        "versionNumber": version.version_number,
        "status": version.status,
        "spec": version.spec,
        "validation": version.validation,
        "workflow": _workflow_dict(db, version),
        "tools": _version_tools(db, version),
        "createdAt": version.created_at.isoformat() if version.created_at else None,
        "publishedAt": version.published_at.isoformat() if version.published_at else None,
    }


def _run_stats(db: Session, agent_id: str) -> dict:
    runs = db.query(StudioAgentRun).filter(StudioAgentRun.agent_id == agent_id).all()
    finished = [r for r in runs if r.status in ("completed", "failed")]
    completed = len([r for r in finished if r.status == "completed"])
    last = max(runs, key=lambda r: r.created_at) if runs else None
    return {
        "totalRuns": len(runs),
        "completedRuns": completed,
        "failedRuns": len([r for r in finished if r.status == "failed"]),
        "successRate": round(completed / len(finished) * 100, 1) if finished else None,
        "lastRunAt": last.created_at.isoformat() if last and last.created_at else None,
        "lastRunStatus": last.status if last else None,
    }


def _serialize_agent(db: Session, agent: StudioAgent, *, detail: bool = False) -> dict:
    version = _current_version(db, agent)
    published = _published_version(db, agent)
    owner = db.get(User, agent.owner_id) if agent.owner_id else None
    data: dict[str, Any] = {
        "id": agent.id,
        "name": agent.name,
        "slug": agent.slug,
        "description": agent.description,
        "category": agent.category,
        "icon": agent.icon,
        "status": agent.status,
        "workspace": agent.workspace,
        "ownerId": agent.owner_id,
        "ownerName": owner.name if owner else "—",
        "toolCount": len(_version_tools(db, version)) if version else 0,
        "currentVersion": version.version_number if version else 0,
        "publishedVersionId": agent.published_version_id,
        "hasUnpublishedChanges": bool(
            published and version and published.id != version.id
        ),
        "createdAt": agent.created_at.isoformat() if agent.created_at else None,
        "updatedAt": agent.updated_at.isoformat() if agent.updated_at else None,
        **_run_stats(db, agent.id),
    }
    if detail and version:
        data["version"] = _serialize_version(db, version)
        data["publishedVersion"] = _serialize_version(db, published) if published else None
        data["versions"] = [
            {
                "id": v.id,
                "versionNumber": v.version_number,
                "status": v.status,
                "createdAt": v.created_at.isoformat() if v.created_at else None,
                "publishedAt": v.published_at.isoformat() if v.published_at else None,
            }
            for v in db.query(StudioAgentVersion)
            .filter(StudioAgentVersion.agent_id == agent.id)
            .order_by(desc(StudioAgentVersion.version_number))
            .all()
        ]
    return data


def _serialize_step(step: StudioAgentRunStep) -> dict:
    return {
        "id": step.id,
        "nodeId": step.node_id,
        "nodeType": step.node_type,
        "nodeSubtype": step.node_subtype,
        "label": step.label,
        "sequence": step.sequence,
        "status": step.status,
        "toolId": step.tool_id,
        "input": step.input,
        "output": step.output,
        "error": step.error,
        "startedAt": step.started_at.isoformat() if step.started_at else None,
        "finishedAt": step.finished_at.isoformat() if step.finished_at else None,
        "durationMs": step.duration_ms,
    }


def _serialize_approval(approval: StudioAgentApproval) -> dict:
    return {
        "id": approval.id,
        "runId": approval.run_id,
        "stepId": approval.step_id,
        "action": approval.action,
        "status": approval.status,
        "requestedBy": approval.requested_by,
        "decidedBy": approval.decided_by,
        "decisionNote": approval.decision_note,
        "requestedAt": approval.requested_at.isoformat() if approval.requested_at else None,
        "decidedAt": approval.decided_at.isoformat() if approval.decided_at else None,
    }


def _serialize_run(db: Session, run: StudioAgentRun, *, detail: bool = False) -> dict:
    agent = db.get(StudioAgent, run.agent_id)
    actor = db.get(User, run.triggered_by) if run.triggered_by else None
    data: dict[str, Any] = {
        "id": run.id,
        "agentId": run.agent_id,
        "agentName": agent.name if agent else "Deleted agent",
        "agentIcon": agent.icon if agent else "sparkles",
        "agentVersionId": run.agent_version_id,
        "triggeredBy": run.triggered_by,
        "triggeredByName": actor.name if actor else "System",
        "triggerType": run.trigger_type,
        "triggerRef": run.trigger_ref,
        "status": run.status,
        "input": run.input,
        "output": run.output,
        "error": run.error,
        "startedAt": run.started_at.isoformat() if run.started_at else None,
        "finishedAt": run.finished_at.isoformat() if run.finished_at else None,
        "createdAt": run.created_at.isoformat() if run.created_at else None,
        "durationMs": run.duration_ms,
        "stepCount": run.step_count,
        "toolCallCount": run.tool_call_count,
        "tokenUsage": run.token_usage,
    }
    if detail:
        data["steps"] = [_serialize_step(s) for s in run.steps]
        data["approvals"] = [_serialize_approval(a) for a in run.approvals]
    return data


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------

def _write_version_artifacts(db: Session, version: StudioAgentVersion, spec: AgentSpec) -> None:
    existing = (
        db.query(StudioAgentWorkflow)
        .filter(StudioAgentWorkflow.agent_version_id == version.id)
        .first()
    )
    graph = spec.workflow.model_dump()
    if existing:
        existing.graph = graph
    else:
        db.add(StudioAgentWorkflow(agent_version_id=version.id, graph=graph))

    db.query(StudioAgentToolPermission).filter(
        StudioAgentToolPermission.agent_version_id == version.id
    ).delete()
    for tool_id in spec.tools:
        tool_spec = get_tool(tool_id)
        db.add(
            StudioAgentToolPermission(
                agent_version_id=version.id,
                tool_id=tool_id,
                permission_class=tool_spec.permission if tool_spec else "read",
                approval_required=bool(tool_spec and tool_spec.approval_required),
            )
        )


def _create_agent(db: Session, spec: AgentSpec, user: User, *, status_value: str = "draft") -> StudioAgent:
    agent = StudioAgent(
        workspace=user.workspace or "PureGlow",
        workspace_id=user.workspace_id,
        owner_id=user.id,
        name=spec.name,
        slug=_slug(spec.name),
        description=spec.description,
        category=spec.category,
        icon=spec.icon,
        status=status_value,
        current_version_number=1,
        created_by=user.id,
    )
    db.add(agent)
    db.flush()

    version = StudioAgentVersion(
        agent_id=agent.id,
        version_number=1,
        spec=spec.model_dump(),
        status="published" if status_value == "published" else "draft",
        validation=validator.validate_spec(spec),
        created_by=user.id,
        published_at=utcnow() if status_value == "published" else None,
        published_by=user.id if status_value == "published" else "",
    )
    db.add(version)
    db.flush()
    _write_version_artifacts(db, version, spec)

    if status_value == "published":
        agent.published_version_id = version.id

    # Persist the trigger configuration from the graph.
    triggers = {
        node.data.subtype
        for node in spec.workflow.nodes
        if node_category(node) == "trigger" and node.data.subtype
    }
    for trigger_type in triggers:
        db.add(StudioAgentTrigger(workspace=agent.workspace, agent_id=agent.id, trigger_type=trigger_type))

    record(
        db,
        action="Agent Created",
        entity_title=spec.name,
        entity_kind="agent",
        entity_id=agent.id,
        user_id=user.id,
        workspace=agent.workspace,
        brand=agent.workspace,
        details=f"Created agent with {len(spec.tools)} tool(s) from {'template' if status_value == 'published' else 'draft'}.",
    )
    db.commit()
    db.refresh(agent)
    return agent


def _add_version(db: Session, agent: StudioAgent, spec: AgentSpec, user: User) -> StudioAgentVersion:
    current = _current_version(db, agent)
    number = (current.version_number if current else 0) + 1
    version = StudioAgentVersion(
        agent_id=agent.id,
        version_number=number,
        spec=spec.model_dump(),
        status="draft",
        validation=validator.validate_spec(spec),
        created_by=user.id,
    )
    db.add(version)
    db.flush()
    _write_version_artifacts(db, version, spec)
    agent.current_version_number = number
    return version


def _apply_spec_to_current(
    db: Session,
    agent: StudioAgent,
    spec: AgentSpec,
    user: User,
) -> StudioAgentVersion:
    """Mutate the current draft in place; branch a new draft if it is published."""
    current = _current_version(db, agent)
    if current is None or current.status == "published":
        return _add_version(db, agent, spec, user)
    current.spec = spec.model_dump()
    current.validation = validator.validate_spec(spec)
    _write_version_artifacts(db, current, spec)
    return current


def _spec_from_version(version: StudioAgentVersion) -> AgentSpec:
    return AgentSpec(**version.spec)


# ---------------------------------------------------------------------------
# Router factory
# ---------------------------------------------------------------------------

def build_router(prefix: str = "") -> APIRouter:
    router = APIRouter(prefix=prefix, tags=["agent-studio"])

    # ---------------------------------------------------------------- catalogue
    @router.get("/agent-tools")
    def agent_tools(current_user: User = Depends(get_current_user)) -> dict:
        return {
            "tools": list_tools(),
            "byCategory": tools_by_category(),
            "nodeVocabulary": {
                "triggers": [{"subtype": k, **v} for k, v in TRIGGERS.items()],
                "ai": [{"subtype": k, "label": v} for k, v in AI_NODES.items()],
                "logic": [{"subtype": k, "label": v} for k, v in LOGIC_NODES.items()],
                "approval": [{"subtype": k, "label": v} for k, v in APPROVAL_NODES.items()],
                "output": [{"subtype": k, "label": v} for k, v in OUTPUT_NODES.items()],
            },
        }

    @router.get("/agents/templates")
    def agent_templates(current_user: User = Depends(get_current_user)) -> list[dict]:
        return templates.list_templates()

    @router.get("/agents/stats")
    def agent_stats(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> dict:
        workspace = current_user.workspace or "PureGlow"
        agents = db.query(StudioAgent).filter(StudioAgent.workspace == workspace).all()
        runs = db.query(StudioAgentRun).filter(StudioAgentRun.workspace == workspace).all()
        finished = [r for r in runs if r.status in ("completed", "failed")]
        completed = len([r for r in finished if r.status == "completed"])
        return {
            "totalAgents": len(agents),
            "publishedAgents": len([a for a in agents if a.status == "published"]),
            "draftAgents": len([a for a in agents if a.status == "draft"]),
            "pausedAgents": len([a for a in agents if a.status == "paused"]),
            "activeExecutions": len(
                [r for r in runs if r.status in ("queued", "running", "waiting_approval")]
            ),
            "failedExecutions": len([r for r in runs if r.status == "failed"]),
            "totalExecutions": len(runs),
            "successRate": round(completed / len(finished) * 100, 1) if finished else None,
        }

    # ---------------------------------------------------------------- generation
    @router.post("/agents/draft-from-prompt", status_code=status.HTTP_201_CREATED)
    def draft_from_prompt(
        body: DraftFromPromptIn,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_manager),
    ) -> dict:
        spec, meta = generator.generate_from_prompt(
            body.prompt,
            category=body.category,
            brand=body.brand or current_user.workspace,
        )
        meta["droppedTools"] = generator.dropped_tools(spec)
        validation = validator.validate_spec(spec)
        agent = _create_agent(db, spec, current_user, status_value="draft")
        return {
            "agent": _serialize_agent(db, agent, detail=True),
            "spec": spec.model_dump(),
            "validation": validation,
            "generation": meta,
        }

    @router.post("/agents/from-template/{template_id}", status_code=status.HTTP_201_CREATED)
    def agent_from_template(
        template_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_manager),
    ) -> dict:
        spec = templates.build_spec_from_template(template_id)
        if spec is None:
            raise HTTPException(status_code=404, detail="Template not found")
        validation = validator.validate_spec(spec)
        agent = _create_agent(db, spec, current_user, status_value="draft")
        return {
            "agent": _serialize_agent(db, agent, detail=True),
            "spec": spec.model_dump(),
            "validation": validation,
            "generation": {"generatedBy": "template", "model": None, "droppedTools": [], "notes": []},
        }

    # ---------------------------------------------------------------- collection
    @router.get("/agents")
    def list_agents(
        q: str | None = Query(default=None),
        status_filter: str | None = Query(default=None, alias="status"),
        category: str | None = Query(default=None),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[dict]:
        workspace = current_user.workspace or "PureGlow"
        query = db.query(StudioAgent).filter(StudioAgent.workspace == workspace)
        if current_user.role != "manager":
            query = query.filter(StudioAgent.status == "published")
        if status_filter:
            query = query.filter(StudioAgent.status == status_filter)
        if category:
            query = query.filter(StudioAgent.category == category)
        agents = query.order_by(desc(StudioAgent.updated_at)).all()
        if q:
            needle = q.lower()
            agents = [
                a
                for a in agents
                if needle in a.name.lower() or needle in a.description.lower()
            ]
        return [_serialize_agent(db, a) for a in agents]

    @router.post("/agents", status_code=status.HTTP_201_CREATED)
    def create_agent(
        body: AgentCreateIn,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_manager),
    ) -> dict:
        payload = body.model_dump()
        status_value = payload.pop("status", "draft")
        spec = AgentSpec(**payload)
        validation = validator.validate_spec(spec)
        if status_value == "published" and not validator.publish_gate(spec)["ok"]:
            raise HTTPException(status_code=422, detail="Agent cannot be published until validation passes.")
        agent = _create_agent(db, spec, current_user, status_value=status_value)
        return {"agent": _serialize_agent(db, agent, detail=True), "validation": validation}

    # ---------------------------------------------------------------- single agent
    @router.get("/agents/{agent_id}")
    def get_agent(
        agent_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> dict:
        agent = assert_agent_visible(db.get(StudioAgent, agent_id), current_user)
        if current_user.role != "manager" and agent.status != "published":
            raise HTTPException(status_code=404, detail="Agent not found")
        return _serialize_agent(db, agent, detail=True)

    @router.patch("/agents/{agent_id}")
    def patch_agent(
        agent_id: str,
        body: AgentPatchIn,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_manager),
    ) -> dict:
        agent = assert_can_manage(db.get(StudioAgent, agent_id), current_user)
        current = _current_version(db, agent)
        if current is None:
            raise HTTPException(status_code=409, detail="Agent has no configuration version.")
        spec = _spec_from_version(current)
        patch = body.model_dump(exclude_unset=True)

        for key in ("name", "description", "category", "icon", "instructions", "tools",
                    "input_schema", "output_schema", "memory", "workflow",
                    "approval_policy", "execution_limits"):
            if key in patch and patch[key] is not None:
                setattr(spec, key, patch[key])

        agent.name = spec.name
        agent.description = spec.description
        agent.category = spec.category
        agent.icon = spec.icon

        version = _apply_spec_to_current(db, agent, spec, current_user)
        record(
            db,
            action="Agent Updated",
            entity_title=agent.name,
            entity_kind="agent",
            entity_id=agent.id,
            user_id=current_user.id,
            workspace=agent.workspace,
            brand=agent.workspace,
            details=f"Saved version {version.version_number}.",
        )
        db.commit()
        db.refresh(agent)
        return {
            "agent": _serialize_agent(db, agent, detail=True),
            "validation": version.validation,
        }

    @router.delete("/agents/{agent_id}")
    def delete_agent(
        agent_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_manager),
    ) -> dict:
        agent = assert_can_manage(db.get(StudioAgent, agent_id), current_user)
        run_count = db.query(StudioAgentRun).filter(StudioAgentRun.agent_id == agent.id).count()
        if agent.status == "draft" and run_count == 0:
            db.delete(agent)
            db.commit()
            return {"deleted": True, "archived": False}
        agent.status = "archived"
        record(
            db,
            action="Agent Archived",
            entity_title=agent.name,
            entity_kind="agent",
            entity_id=agent.id,
            user_id=current_user.id,
            workspace=agent.workspace,
            brand=agent.workspace,
            details="Agent archived to preserve execution history.",
        )
        db.commit()
        return {"deleted": False, "archived": True}

    # ---------------------------------------------------------------- workflow
    @router.put("/agents/{agent_id}/workflow")
    def save_workflow(
        agent_id: str,
        body: WorkflowSaveIn,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_manager),
    ) -> dict:
        agent = assert_can_manage(db.get(StudioAgent, agent_id), current_user)
        current = _current_version(db, agent)
        if current is None:
            raise HTTPException(status_code=409, detail="Agent has no configuration version.")
        spec = _spec_from_version(current)
        spec.workflow = body.graph
        version = _apply_spec_to_current(db, agent, spec, current_user)
        db.commit()
        db.refresh(agent)
        return {
            "agent": _serialize_agent(db, agent, detail=True),
            "validation": version.validation,
        }

    # ---------------------------------------------------------------- lifecycle
    @router.post("/agents/{agent_id}/validate")
    def validate_agent(
        agent_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_manager),
    ) -> dict:
        agent = assert_can_manage(db.get(StudioAgent, agent_id), current_user)
        current = _current_version(db, agent)
        if current is None:
            raise HTTPException(status_code=409, detail="Agent has no configuration version.")
        spec = _spec_from_version(current)
        result = validator.validate_spec(spec)
        current.validation = result
        db.commit()
        return result

    @router.post("/agents/{agent_id}/publish")
    def publish_agent(
        agent_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_manager),
    ) -> dict:
        agent = assert_can_manage(db.get(StudioAgent, agent_id), current_user)
        current = _current_version(db, agent)
        if current is None:
            raise HTTPException(status_code=409, detail="Agent has no configuration version.")
        spec = _spec_from_version(current)
        gate = validator.publish_gate(spec)
        current.validation = gate
        if not gate["ok"]:
            db.commit()
            raise HTTPException(
                status_code=422,
                detail={"message": "Agent failed validation.", "errors": gate["errors"]},
            )
        current.status = "published"
        current.published_at = utcnow()
        current.published_by = current_user.id
        agent.published_version_id = current.id
        agent.status = "published"
        record(
            db,
            action="Agent Published",
            entity_title=agent.name,
            entity_kind="agent",
            entity_id=agent.id,
            user_id=current_user.id,
            workspace=agent.workspace,
            brand=agent.workspace,
            details=f"Published version {current.version_number}.",
        )
        db.commit()
        db.refresh(agent)
        return {"agent": _serialize_agent(db, agent, detail=True), "validation": gate}

    @router.post("/agents/{agent_id}/pause")
    def pause_agent(
        agent_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_manager),
    ) -> dict:
        agent = assert_can_manage(db.get(StudioAgent, agent_id), current_user)
        if agent.status != "published":
            raise HTTPException(status_code=409, detail="Only a published agent can be paused.")
        agent.status = "paused"
        record(
            db,
            action="Agent Paused",
            entity_title=agent.name,
            entity_kind="agent",
            entity_id=agent.id,
            user_id=current_user.id,
            workspace=agent.workspace,
            brand=agent.workspace,
            details="Agent paused by manager.",
        )
        db.commit()
        return {"agent": _serialize_agent(db, agent, detail=True)}

    @router.post("/agents/{agent_id}/resume")
    def resume_agent(
        agent_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_manager),
    ) -> dict:
        agent = assert_can_manage(db.get(StudioAgent, agent_id), current_user)
        if agent.status != "paused" or not agent.published_version_id:
            raise HTTPException(status_code=409, detail="Only a paused, previously published agent can be resumed.")
        agent.status = "published"
        db.commit()
        return {"agent": _serialize_agent(db, agent, detail=True)}

    # ---------------------------------------------------------------- execution
    @router.post("/agents/{agent_id}/test")
    def test_agent(
        agent_id: str,
        body: TestAgentIn,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_manager),
    ) -> dict:
        agent = assert_can_manage(db.get(StudioAgent, agent_id), current_user)
        version = _current_version(db, agent)
        if version is None:
            raise HTTPException(status_code=409, detail="Agent has no configuration version.")
        spec = _spec_from_version(version)
        result = validator.validate_spec(spec)
        if not result["ok"]:
            raise HTTPException(
                status_code=422,
                detail={"message": "Fix validation errors before testing.", "errors": result["errors"]},
            )
        run_input = dict(body.input or {})
        if body.message:
            run_input.setdefault("query", body.message)
            run_input.setdefault("text", body.message)
        try:
            run = runtime.run_agent(
                db,
                agent=agent,
                version=version,
                user=current_user,
                run_input=run_input,
                trigger_type="test",
            )
        except runtime.RunError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return {"run": _serialize_run(db, run, detail=True), "validation": result}

    @router.post("/agents/{agent_id}/execute", status_code=status.HTTP_201_CREATED)
    def execute_agent(
        agent_id: str,
        body: ExecuteAgentIn,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> dict:
        agent = assert_agent_visible(db.get(StudioAgent, agent_id), current_user)
        assert_can_use(agent, current_user)
        version = _published_version(db, agent)
        if version is None:
            if current_user.role == "manager":
                version = _current_version(db, agent)
            else:
                raise HTTPException(status_code=409, detail="This agent has not been published yet.")
        if version is None:
            raise HTTPException(status_code=409, detail="Agent has no executable version.")
        spec = _spec_from_version(version)
        result = validator.validate_spec(spec)
        if not result["ok"]:
            raise HTTPException(
                status_code=422,
                detail={"message": "Agent configuration is invalid.", "errors": result["errors"]},
            )
        try:
            run = runtime.run_agent(
                db,
                agent=agent,
                version=version,
                user=current_user,
                run_input=dict(body.input or {}),
                trigger_type=body.trigger_type,
                trigger_ref=body.trigger_ref,
            )
        except runtime.RunError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return {"run": _serialize_run(db, run, detail=True)}

    @router.get("/agents/{agent_id}/runs")
    def agent_runs(
        agent_id: str,
        limit: int = Query(default=50, ge=1, le=200),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[dict]:
        agent = assert_agent_visible(db.get(StudioAgent, agent_id), current_user)
        assert_can_view_runs(agent, current_user)
        query = db.query(StudioAgentRun).filter(StudioAgentRun.agent_id == agent.id)
        if current_user.role != "manager":
            query = query.filter(StudioAgentRun.triggered_by == current_user.id)
        runs = query.order_by(desc(StudioAgentRun.created_at)).limit(limit).all()
        return [_serialize_run(db, r) for r in runs]

    # ---------------------------------------------------------------- run collection
    @router.get("/agent-runs")
    def all_runs(
        status_filter: str | None = Query(default=None, alias="status"),
        agent_id: str | None = Query(default=None),
        limit: int = Query(default=100, ge=1, le=300),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[dict]:
        workspace = current_user.workspace or "PureGlow"
        query = db.query(StudioAgentRun).filter(StudioAgentRun.workspace == workspace)
        if current_user.role != "manager":
            query = query.filter(StudioAgentRun.triggered_by == current_user.id)
        if status_filter:
            query = query.filter(StudioAgentRun.status == status_filter)
        if agent_id:
            query = query.filter(StudioAgentRun.agent_id == agent_id)
        runs = query.order_by(desc(StudioAgentRun.created_at)).limit(limit).all()
        return [_serialize_run(db, r) for r in runs]

    @router.get("/agent-runs/{run_id}")
    def run_detail(
        run_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> dict:
        run = db.get(StudioAgentRun, run_id)
        if run is None or run.workspace != (current_user.workspace or "PureGlow"):
            raise HTTPException(status_code=404, detail="Execution not found")
        if current_user.role != "manager" and run.triggered_by != current_user.id:
            raise HTTPException(status_code=404, detail="Execution not found")
        return _serialize_run(db, run, detail=True)

    @router.post("/agent-runs/{run_id}/cancel")
    def cancel_run(
        run_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> dict:
        run = db.get(StudioAgentRun, run_id)
        if run is None or run.workspace != (current_user.workspace or "PureGlow"):
            raise HTTPException(status_code=404, detail="Execution not found")
        if current_user.role != "manager" and run.triggered_by != current_user.id:
            raise HTTPException(status_code=404, detail="Execution not found")
        if run.status not in ("queued", "running", "waiting_approval"):
            raise HTTPException(status_code=409, detail="This execution has already finished.")
        run.status = "cancelled"
        run.finished_at = utcnow()
        for step in run.steps:
            if step.status in ("pending", "running", "waiting_approval"):
                step.status = "skipped"
                step.error = "Cancelled by user."
        for approval in run.approvals:
            if approval.status == "pending":
                approval.status = "expired"
        db.commit()
        return {"run": _serialize_run(db, run, detail=True)}

    @router.post("/agent-runs/{run_id}/approve")
    def approve_run(
        run_id: str,
        body: ApprovalIn,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_manager),
    ) -> dict:
        run = db.get(StudioAgentRun, run_id)
        if run is None or run.workspace != (current_user.workspace or "PureGlow"):
            raise HTTPException(status_code=404, detail="Execution not found")
        if run.status != "waiting_approval":
            raise HTTPException(status_code=409, detail="This execution is not waiting for approval.")

        approval = (
            db.query(StudioAgentApproval)
            .filter(
                StudioAgentApproval.run_id == run.id,
                StudioAgentApproval.status == "pending",
            )
            .order_by(desc(StudioAgentApproval.requested_at))
            .first()
        )
        if approval is None:
            raise HTTPException(status_code=409, detail="No pending approval was found.")

        approval.decided_by = current_user.id
        approval.decided_at = utcnow()
        approval.decision_note = body.note

        if body.decision == "reject":
            approval.status = "rejected"
            run.status = "cancelled"
            run.error = "Rejected by Brand Manager."
            run.finished_at = utcnow()
            for step in run.steps:
                if step.status == "waiting_approval":
                    step.status = "skipped"
                    step.error = "Approval rejected."
            record(
                db,
                action="Agent Approval Rejected",
                entity_title=f"Run {run.id}",
                entity_kind="agent",
                entity_id=run.agent_id,
                user_id=current_user.id,
                workspace=run.workspace,
                brand=run.workspace,
                status="Rejected",
                details=body.note[:400],
            )
            db.commit()
            return {"run": _serialize_run(db, run, detail=True), "approved": False}

        approval.status = "approved"
        agent = db.get(StudioAgent, run.agent_id)
        version = db.get(StudioAgentVersion, run.agent_version_id) if run.agent_version_id else None
        if agent is None or version is None:
            raise HTTPException(status_code=409, detail="The agent version no longer exists.")
        record(
            db,
            action="Agent Approval Granted",
            entity_title=f"Run {run.id}",
            entity_kind="agent",
            entity_id=agent.id,
            user_id=current_user.id,
            workspace=run.workspace,
            brand=run.workspace,
            details=body.note[:400],
        )
        db.commit()
        try:
            run = runtime.run_agent(
                db,
                agent=agent,
                version=version,
                user=current_user,
                existing_run=run,
                approved=True,
            )
        except runtime.RunError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return {"run": _serialize_run(db, run, detail=True), "approved": True}

    # ---------------------------------------------------------------- memory
    @router.get("/agents/{agent_id}/memory")
    def get_memory(
        agent_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[dict]:
        agent = assert_agent_visible(db.get(StudioAgent, agent_id), current_user)
        rows = (
            db.query(StudioAgentMemory)
            .filter(
                StudioAgentMemory.agent_id == agent.id,
                StudioAgentMemory.user_id == current_user.id,
            )
            .all()
        )
        return [
            {
                "id": r.id,
                "key": r.key,
                "value": r.value,
                "sessionId": r.session_id,
                "updatedAt": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]

    @router.delete("/agents/{agent_id}/memory")
    def clear_memory(
        agent_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> dict:
        agent = assert_agent_visible(db.get(StudioAgent, agent_id), current_user)
        deleted = (
            db.query(StudioAgentMemory)
            .filter(
                StudioAgentMemory.agent_id == agent.id,
                StudioAgentMemory.user_id == current_user.id,
            )
            .delete()
        )
        db.commit()
        return {"deleted": int(deleted)}

    return router
