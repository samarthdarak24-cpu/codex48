"""Agent Runtime Service for Precedent Agent Studio.

Orchestrates execution of agents, version resolution, memory session tracking,
cancellation, and human approval resumption.
"""
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.agents.models import (
    Agent,
    AgentApproval,
    AgentMemorySession,
    AgentRun,
    AgentRunStep,
    AgentVersion,
)
from app.agent_workflows.executor import WorkflowExecutor


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def start_agent_run(
    db: Session,
    agent: Agent,
    inputs: Dict[str, Any],
    user_id: Optional[str] = None,
    trigger_type: str = "manual",
    session_id: Optional[str] = None,
) -> AgentRun:
    """Initiates an agent run, tracks memory session if enabled, and executes workflow."""
    run_id = str(uuid.uuid4())
    run = AgentRun(
        id=run_id,
        agent_id=agent.id,
        agent_version=agent.current_version,
        workspace=agent.workspace,
        user_id=user_id,
        trigger_type=trigger_type,
        status="running",
        inputs=inputs,
        outputs={},
        started_at=utcnow(),
        tool_call_count=0,
        budget=agent.execution_limits or {"max_steps": 10, "timeout_seconds": 120},
        created_at=utcnow(),
    )
    db.add(run)
    db.commit()

    # Memory turn handling if enabled
    mem_cfg = agent.memory_config or {}
    if mem_cfg.get("enabled") and session_id and user_id:
        sess = (
            db.query(AgentMemorySession)
            .filter(
                AgentMemorySession.agent_id == agent.id,
                AgentMemorySession.session_id == session_id,
                AgentMemorySession.user_id == user_id,
            )
            .first()
        )
        if not sess:
            sess = AgentMemorySession(
                id=str(uuid.uuid4()),
                agent_id=agent.id,
                workspace=agent.workspace,
                user_id=user_id,
                session_id=session_id,
                turns=[],
                created_at=utcnow(),
            )
            db.add(sess)

        turns = list(sess.turns or [])
        turns.append({
            "role": "user",
            "content": inputs,
            "timestamp": str(utcnow()),
        })
        sess.turns = turns[-mem_cfg.get("max_turns", 10):]
        db.commit()

    executor = WorkflowExecutor(db, run=run, agent=agent, user_id=user_id)
    executed_run = executor.execute(initial_inputs=inputs)

    # Persist assistant turn to memory if successful
    if mem_cfg.get("enabled") and session_id and user_id and executed_run.outputs:
        sess = (
            db.query(AgentMemorySession)
            .filter(
                AgentMemorySession.agent_id == agent.id,
                AgentMemorySession.session_id == session_id,
                AgentMemorySession.user_id == user_id,
            )
            .first()
        )
        if sess:
            turns = list(sess.turns or [])
            turns.append({
                "role": "assistant",
                "content": executed_run.outputs,
                "timestamp": str(utcnow()),
            })
            sess.turns = turns[-mem_cfg.get("max_turns", 10):]
            db.commit()

    return executed_run


def resume_agent_run_after_approval(
    db: Session,
    run: AgentRun,
    approval: AgentApproval,
    decision: str,  # "approved" | "rejected"
    user_id: str,
    note: Optional[str] = "",
) -> AgentRun:
    """Resumes an execution that was waiting for human approval."""
    approval.status = decision
    approval.decided_by_user_id = user_id
    approval.decided_at = utcnow()
    approval.decision_note = note
    db.commit()

    if decision == "rejected":
        run.status = "failed"
        run.error = f"Execution rejected by Brand Manager: {note or 'Action declined'}"
        run.finished_at = utcnow()
        db.commit()
        return run

    # Mark the paused step as approved and completed
    approved_node_id = None
    if approval.step_id:
        paused_step = db.query(AgentRunStep).filter(AgentRunStep.id == approval.step_id).first()
        if paused_step:
            paused_step.status = "completed"
            paused_step.explanation = f"Approved by Brand Manager: {note or 'Confirmed'}"
            approved_node_id = paused_step.node_id
            db.commit()

    # Resume workflow execution
    agent = db.query(Agent).filter(Agent.id == run.agent_id).first()
    if not agent:
        run.status = "failed"
        run.error = "Agent definition not found during resumption."
        db.commit()
        return run

    executor = WorkflowExecutor(db, run=run, agent=agent, user_id=user_id)
    return executor.execute(
        initial_inputs=run.inputs,
        resume_step_id=approval.step_id,
        approved_node_id=approved_node_id,
    )


def cancel_agent_run(db: Session, run: AgentRun, user_id: str) -> AgentRun:
    """Cancels an active or waiting agent execution."""
    if run.status in ("completed", "failed", "cancelled"):
        return run

    run.status = "cancelled"
    run.finished_at = utcnow()
    run.error = f"Execution cancelled by user {user_id}."
    db.commit()
    return run
