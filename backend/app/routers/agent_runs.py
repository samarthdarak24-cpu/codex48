"""FastAPI Router for Agent Studio — Executions & Human Approval."""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db import get_db
from app.deps import get_current_user, require_manager
from app.errors import ForbiddenException, NotFoundException, ValidationException
from app.models import User
from app.agents.models import Agent, AgentApproval, AgentRun, AgentRunStep
from app.agents.permissions import require_approval_permission
from app.agents.runtime import cancel_agent_run, resume_agent_run_after_approval
from app.agents.schemas import AgentApprovalDecisionIn, AgentApprovalOut, AgentRunOut, AgentRunStepOut

router = APIRouter(prefix="/api/v1", tags=["Agent Executions"])


@router.get("/agent-runs", response_model=List[AgentRunOut])
def list_agent_runs(
    agent_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> List[AgentRunOut]:
    """Lists agent executions across the user's workspace."""
    q = db.query(AgentRun).filter(AgentRun.workspace == user.workspace)

    if agent_id:
        q = q.filter(AgentRun.agent_id == agent_id)
    if status:
        q = q.filter(AgentRun.status == status)

    runs = q.order_by(desc(AgentRun.created_at)).limit(limit).all()
    results = []
    for r in runs:
        out = AgentRunOut.model_validate(r)
        if r.agent_rel:
            out.agent_name = r.agent_rel.name
        results.append(out)
    return results


@router.get("/agent-runs/{run_id}", response_model=AgentRunOut)
def get_agent_run(
    run_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentRunOut:
    """Retrieves full execution timeline, steps, and approval details for a run."""
    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not run:
        raise NotFoundException(f"Execution '{run_id}' not found.")
    if run.workspace != user.workspace:
        raise ForbiddenException("Execution belongs to another workspace.")

    out = AgentRunOut.model_validate(run)
    if run.agent_rel:
        out.agent_name = run.agent_rel.name
    return out


@router.post("/agent-runs/{run_id}/cancel", response_model=AgentRunOut)
def cancel_run(
    run_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentRunOut:
    """Cancels an active or waiting agent execution."""
    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not run:
        raise NotFoundException(f"Execution '{run_id}' not found.")
    if run.workspace != user.workspace:
        raise ForbiddenException("Execution belongs to another workspace.")

    cancelled_run = cancel_agent_run(db, run=run, user_id=user.id)
    return AgentRunOut.model_validate(cancelled_run)


@router.post("/agent-runs/{run_id}/approve", response_model=AgentRunOut)
def decide_run_approval(
    run_id: str,
    payload: AgentApprovalDecisionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentRunOut:
    """Human-in-the-loop decision checkpoint.

    Allows authorized Brand Managers to approve or reject a paused execution.
    On approval, resumes the workflow execution to completion.
    """
    require_approval_permission(user)

    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not run:
        raise NotFoundException(f"Execution '{run_id}' not found.")
    if run.workspace != user.workspace:
        raise ForbiddenException("Execution belongs to another workspace.")

    if run.status != "waiting_for_approval":
        raise ValidationException(f"Run is in state '{run.status}', not waiting for approval.")

    # Find pending approval
    approval = (
        db.query(AgentApproval)
        .filter(AgentApproval.run_id == run.id, AgentApproval.status == "pending")
        .first()
    )
    if not approval:
        raise NotFoundException("No pending approval found for this execution.")

    resumed_run = resume_agent_run_after_approval(
        db=db,
        run=run,
        approval=approval,
        decision=payload.decision,
        user_id=user.id,
        note=payload.note,
    )

    db.refresh(resumed_run)
    return AgentRunOut.model_validate(resumed_run)

