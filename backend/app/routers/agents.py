"""FastAPI Router for Agent Studio — Agent Lifecycle Endpoints."""
import re
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db import get_db
from app.deps import get_current_user, require_manager
from app.errors import ForbiddenException, NotFoundException, ValidationException
from app.models import User, utcnow
from app.agents.models import Agent, AgentRun, AgentVersion, AgentWorkflow
from app.agents.generator import generate_agent_specification
from app.agents.permissions import check_agent_access, require_agent_authoring_permission
from app.agents.registry import list_tools, validate_tools
from app.agents.runtime import start_agent_run
from app.agents.schemas import (
    AgentCreate,
    AgentOut,
    AgentPromptIn,
    AgentPromptOut,
    AgentRunOut,
    AgentTemplateOut,
    AgentTestIn,
    AgentUpdate,
)
from app.agents.templates import get_template, list_templates
from app.agents.validator import validate_agent_configuration

router = APIRouter(prefix="/api/v1", tags=["Agent Studio"])


def _slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", s)[:50]


def _format_agent_out(db: Session, agent: Agent) -> AgentOut:
    """Helper to enrich AgentOut with real run metrics and statistics."""
    runs = db.query(AgentRun).filter(AgentRun.agent_id == agent.id).all()
    total_runs = len(runs)
    completed_runs = sum(1 for r in runs if r.status == "completed")
    success_rate = (completed_runs / total_runs * 100.0) if total_runs > 0 else 0.0
    last_run = (
        db.query(AgentRun)
        .filter(AgentRun.agent_id == agent.id)
        .order_by(desc(AgentRun.created_at))
        .first()
    )

    return AgentOut(
        id=agent.id,
        workspace=agent.workspace,
        created_by_id=agent.created_by_id,
        name=agent.name,
        slug=agent.slug,
        description=agent.description or "",
        category=agent.category,
        icon=agent.icon or "Bot",
        status=agent.status,
        current_version=agent.current_version,
        published_version=agent.published_version,
        visibility=agent.visibility,
        instructions=agent.instructions or "",
        tools=agent.tools or [],
        input_schema=agent.input_schema or {},
        output_schema=agent.output_schema or {},
        memory_config=agent.memory_config or {},
        execution_limits=agent.execution_limits or {},
        approval_policy=agent.approval_policy or {},
        workflow=agent.workflow or {"nodes": [], "edges": []},
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        total_runs=total_runs,
        success_rate=round(success_rate, 1),
        last_run_at=last_run.created_at if last_run else None,
    )


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

@router.get("/agent-templates", response_model=List[AgentTemplateOut])
def get_agent_templates(user: User = Depends(get_current_user)) -> List[AgentTemplateOut]:
    """Lists ready-made enterprise agent templates."""
    return list_templates()


@router.post("/agent-templates/{template_id}/instantiate", response_model=AgentOut)
def instantiate_agent_template(
    template_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentOut:
    """Creates a new editable draft agent from a template."""
    require_agent_authoring_permission(user)
    tmpl = get_template(template_id)
    if not tmpl:
        raise NotFoundException(f"Template '{template_id}' not found.")

    agent_id = str(uuid.uuid4())
    slug = _slugify(tmpl["name"])

    agent = Agent(
        id=agent_id,
        workspace=user.workspace,
        created_by_id=user.id,
        name=tmpl["name"],
        slug=f"{slug}-{agent_id[:6]}",
        description=tmpl["description"],
        category=tmpl["category"],
        icon=tmpl["icon"],
        status="draft",
        current_version=1,
        visibility="workspace",
        instructions=tmpl["instructions"],
        tools=tmpl["tools"],
        input_schema=tmpl["input_schema"],
        output_schema=tmpl["output_schema"],
        memory_config={"enabled": False, "scope": "session"},
        execution_limits=tmpl["execution_limits"],
        approval_policy=tmpl["approval_policy"],
        workflow=tmpl["workflow"],
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return _format_agent_out(db, agent)


# ---------------------------------------------------------------------------
# Prompt-to-Agent Generation
# ---------------------------------------------------------------------------

@router.post("/agents/draft-from-prompt", response_model=AgentPromptOut)
def draft_agent_from_prompt(
    payload: AgentPromptIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentPromptOut:
    """Natural Language Prompt-to-Agent Builder.

    Converts English requirements into a configured, validated AI agent and workflow graph.
    """
    require_agent_authoring_permission(user)

    spec, valid_tools, rejected_tools, warnings = generate_agent_specification(
        prompt=payload.prompt,
        category_hint=payload.category,
    )

    agent_id = str(uuid.uuid4())
    slug = _slugify(spec.name)

    agent = Agent(
        id=agent_id,
        workspace=user.workspace,
        created_by_id=user.id,
        name=spec.name,
        slug=f"{slug}-{agent_id[:6]}",
        description=spec.description,
        category=spec.category,
        icon="Sparkles",
        status="draft",
        current_version=1,
        visibility="workspace",
        instructions=spec.instructions,
        tools=valid_tools,
        input_schema=spec.input_schema,
        output_schema=spec.output_schema,
        memory_config=spec.memory.model_dump(),
        execution_limits=spec.execution_limits.model_dump(),
        approval_policy=spec.approval_policy.model_dump(),
        workflow=spec.workflow,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)

    return AgentPromptOut(
        agent=_format_agent_out(db, agent),
        spec=spec,
        tool_matches=valid_tools,
        rejected_tools=rejected_tools,
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# Agent CRUD
# ---------------------------------------------------------------------------

@router.get("/agents", response_model=List[AgentOut])
def list_agents(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> List[AgentOut]:
    """Lists agents in the user's workspace."""
    q = db.query(Agent).filter(Agent.workspace == user.workspace)

    # Creators can only view published agents marked for workspace/creators
    if user.role != "manager":
        q = q.filter(Agent.status == "published", Agent.visibility.in_(["workspace", "creators"]))

    if status:
        q = q.filter(Agent.status == status)
    if category:
        q = q.filter(Agent.category == category)
    if search:
        term = f"%{search}%"
        q = q.filter(Agent.name.ilike(term) | Agent.description.ilike(term))

    agents = q.order_by(desc(Agent.updated_at)).all()
    return [_format_agent_out(db, a) for a in agents]


@router.post("/agents", response_model=AgentOut)
def create_agent(
    payload: AgentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentOut:
    """Creates a new agent from scratch."""
    require_agent_authoring_permission(user)

    valid_tools, rejected_tools = validate_tools(payload.tools)
    if rejected_tools:
        raise ValidationException(f"Unrecognized tools: {', '.join(rejected_tools)}")

    agent_id = str(uuid.uuid4())
    slug = _slugify(payload.name)

    agent = Agent(
        id=agent_id,
        workspace=user.workspace,
        created_by_id=user.id,
        name=payload.name,
        slug=f"{slug}-{agent_id[:6]}",
        description=payload.description,
        category=payload.category,
        icon=payload.icon,
        status="draft",
        current_version=1,
        visibility=payload.visibility,
        instructions=payload.instructions,
        tools=valid_tools,
        input_schema=payload.input_schema,
        output_schema=payload.output_schema,
        memory_config=payload.memory_config.model_dump(),
        execution_limits=payload.execution_limits.model_dump(),
        approval_policy=payload.approval_policy.model_dump(),
        workflow=payload.workflow,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return _format_agent_out(db, agent)


@router.get("/agents/{agent_id}", response_model=AgentOut)
def get_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentOut:
    """Retrieves an agent by ID."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise NotFoundException(f"Agent '{agent_id}' not found.")
    check_agent_access(agent.workspace, user)
    return _format_agent_out(db, agent)


@router.patch("/agents/{agent_id}", response_model=AgentOut)
def update_agent(
    agent_id: str,
    payload: AgentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentOut:
    """Updates an agent's configuration or visual workflow."""
    require_agent_authoring_permission(user)
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise NotFoundException(f"Agent '{agent_id}' not found.")
    check_agent_access(agent.workspace, user)

    update_data = payload.model_dump(exclude_unset=True)

    if "tools" in update_data and update_data["tools"] is not None:
        valid_tools, rejected = validate_tools(update_data["tools"])
        if rejected:
            raise ValidationException(f"Invalid tools: {', '.join(rejected)}")
        agent.tools = valid_tools

    for field in [
        "name",
        "description",
        "category",
        "icon",
        "instructions",
        "input_schema",
        "output_schema",
        "visibility",
        "status",
        "workflow",
    ]:
        if field in update_data and update_data[field] is not None:
            setattr(agent, field, update_data[field])

    if "memory_config" in update_data and update_data["memory_config"] is not None:
        agent.memory_config = update_data["memory_config"]
    if "execution_limits" in update_data and update_data["execution_limits"] is not None:
        agent.execution_limits = update_data["execution_limits"]
    if "approval_policy" in update_data and update_data["approval_policy"] is not None:
        agent.approval_policy = update_data["approval_policy"]

    agent.updated_at = utcnow()
    db.commit()
    db.refresh(agent)
    return _format_agent_out(db, agent)


@router.delete("/agents/{agent_id}")
def delete_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Deletes or archives an agent."""
    require_agent_authoring_permission(user)
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise NotFoundException(f"Agent '{agent_id}' not found.")
    check_agent_access(agent.workspace, user)

    db.delete(agent)
    db.commit()
    return {"status": "deleted", "agent_id": agent_id}


# ---------------------------------------------------------------------------
# Validation, Publish & Lifecycle
# ---------------------------------------------------------------------------

@router.post("/agents/{agent_id}/validate")
def validate_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Validates an agent and its workflow graph."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise NotFoundException(f"Agent '{agent_id}' not found.")
    check_agent_access(agent.workspace, user)

    agent_dict = {
        "name": agent.name,
        "instructions": agent.instructions,
        "tools": agent.tools,
        "workflow": agent.workflow,
        "execution_limits": agent.execution_limits,
    }
    is_valid, errors = validate_agent_configuration(agent_dict)
    return {"valid": is_valid, "errors": errors}


@router.post("/agents/{agent_id}/publish", response_model=AgentOut)
def publish_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentOut:
    """Validates and publishes an agent, creating an immutable version snapshot."""
    require_agent_authoring_permission(user)
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise NotFoundException(f"Agent '{agent_id}' not found.")
    check_agent_access(agent.workspace, user)

    # Validate before publishing
    agent_dict = {
        "name": agent.name,
        "instructions": agent.instructions,
        "tools": agent.tools,
        "workflow": agent.workflow,
        "execution_limits": agent.execution_limits,
    }
    is_valid, errors = validate_agent_configuration(agent_dict)
    if not is_valid:
        raise ValidationException(f"Cannot publish agent with validation errors: {'; '.join(errors)}")

    # Create immutable AgentVersion snapshot
    version_snapshot = AgentVersion(
        id=str(uuid.uuid4()),
        agent_id=agent.id,
        version=agent.current_version,
        name=agent.name,
        description=agent.description,
        instructions=agent.instructions,
        tools=agent.tools,
        input_schema=agent.input_schema,
        output_schema=agent.output_schema,
        memory_config=agent.memory_config,
        execution_limits=agent.execution_limits,
        approval_policy=agent.approval_policy,
        workflow=agent.workflow,
        created_by_id=user.id,
        created_at=utcnow(),
    )
    db.add(version_snapshot)

    agent.status = "published"
    agent.published_version = agent.current_version
    agent.updated_at = utcnow()
    db.commit()
    db.refresh(agent)
    return _format_agent_out(db, agent)


@router.post("/agents/{agent_id}/pause", response_model=AgentOut)
def pause_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentOut:
    """Pauses an agent's automated triggers and executions."""
    require_agent_authoring_permission(user)
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise NotFoundException(f"Agent '{agent_id}' not found.")
    check_agent_access(agent.workspace, user)

    agent.status = "paused"
    agent.updated_at = utcnow()
    db.commit()
    db.refresh(agent)
    return _format_agent_out(db, agent)


# ---------------------------------------------------------------------------
# Test Playground & Execution
# ---------------------------------------------------------------------------

@router.post("/agents/{agent_id}/test", response_model=AgentRunOut)
def test_agent(
    agent_id: str,
    payload: AgentTestIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentRunOut:
    """Executes an agent run in Test Playground mode with full observability."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise NotFoundException(f"Agent '{agent_id}' not found.")
    check_agent_access(agent.workspace, user)

    # Merge inputs
    inputs = dict(payload.inputs or {})
    if payload.submission_id:
        inputs["submission_id"] = payload.submission_id
    if payload.query:
        inputs["query"] = payload.query
    if payload.prompt:
        inputs["prompt"] = payload.prompt
        inputs["text"] = payload.prompt

    run = start_agent_run(
        db=db,
        agent=agent,
        inputs=inputs,
        user_id=user.id,
        trigger_type="test",
    )

    db.refresh(run)
    return AgentRunOut.model_validate(run)


@router.post("/agents/{agent_id}/execute", response_model=AgentRunOut)
def execute_agent(
    agent_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentRunOut:
    """Executes a published agent with specified inputs."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise NotFoundException(f"Agent '{agent_id}' not found.")
    check_agent_access(agent.workspace, user)

    if agent.status == "paused":
        raise ValidationException("Cannot execute paused agent. Please unpause first.")

    # Creators can execute published agents available to their workspace
    if user.role != "manager" and agent.status != "published":
        raise ForbiddenException("Creators can only run published AI assistants.")

    trigger_type = payload.get("trigger_type", "manual")
    session_id = payload.get("session_id")
    inputs = payload.get("inputs", payload)

    run = start_agent_run(
        db=db,
        agent=agent,
        inputs=inputs,
        user_id=user.id,
        trigger_type=trigger_type,
        session_id=session_id,
    )

    db.refresh(run)
    return AgentRunOut.model_validate(run)


@router.get("/agents/{agent_id}/runs", response_model=List[AgentRunOut])
def get_agent_runs(
    agent_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> List[AgentRunOut]:
    """Retrieves execution history for a specific agent."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise NotFoundException(f"Agent '{agent_id}' not found.")
    check_agent_access(agent.workspace, user)

    runs = (
        db.query(AgentRun)
        .filter(AgentRun.agent_id == agent.id)
        .order_by(desc(AgentRun.created_at))
        .limit(50)
        .all()
    )
    return [AgentRunOut.model_validate(r) for r in runs]

