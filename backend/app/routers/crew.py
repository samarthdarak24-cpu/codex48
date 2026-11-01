"""Review Crew Router  Bounded Multi-Agent Review Endpoints.

Provides endpoints for running the Review Crew advisory agents and retrieving
persisted execution traces.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..deps import get_current_user
from ..services.crew import CrewReviewTrace, get_latest_crew_trace, run_review_crew

router = APIRouter(prefix="", tags=["review-crew"])


@router.get("/crew/summary")
def get_crew_summary(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Retrieve workspace-wide Review Crew multi-agent orchestration summary and health."""
    ws = getattr(user, "workspace", "PureGlow") or "PureGlow"
    traces = (
        db.query(models.AgentTraceRecord)
        .filter(models.AgentTraceRecord.workspace == ws)
        .order_by(models.AgentTraceRecord.created_at.desc())
        .limit(20)
        .all()
    )
    total_runs = db.query(models.AgentTraceRecord).filter(models.AgentTraceRecord.workspace == ws).count()
    completed_runs = db.query(models.AgentTraceRecord).filter(
        models.AgentTraceRecord.workspace == ws,
        models.AgentTraceRecord.orchestrator_status == "completed",
    ).count()

    avg_duration = 0
    if traces:
        durations = [t.total_duration_ms for t in traces if t.total_duration_ms]
        if durations:
            avg_duration = sum(durations) // len(durations)

    return {
        "workspace": ws,
        "totalRuns": total_runs,
        "completedRuns": completed_runs,
        "avgDurationMs": avg_duration,
        "agents": [
            {
                "id": "intake",
                "name": "Intake Agent",
                "role": "Asset & Metadata Parser",
                "status": "active",
                "badge": "Healthy",
                "desc": "Validates file magic bytes, extracts plain copy & dimensions",
            },
            {
                "id": "visual",
                "name": "VisualGuard Agent",
                "role": "OCR & Visual Compliance",
                "status": "active",
                "badge": "Healthy",
                "desc": "Performs multi-lingual OCR, OpenCV logo match & contrast checks",
            },
            {
                "id": "retrieval",
                "name": "Retrieval Agent",
                "role": "Dense + BM25 Hybrid Search",
                "status": "active",
                "badge": "Healthy",
                "desc": "Executes vector + lexical search across active guideline documents",
            },
            {
                "id": "verifier",
                "name": "Evidence Verifier",
                "role": "Hallucination Defense Gate",
                "status": "active",
                "badge": "Healthy",
                "desc": "Enforces strict passage grounding with 0 tolerance for hallucination",
            },
            {
                "id": "summary",
                "name": "Synthesis Agent",
                "role": "Advisory Summary & Fixes",
                "status": "active",
                "badge": "Healthy",
                "desc": "Generates structured feedback and 1-click minimal-edit suggestions",
            },
        ],
        "recentTraces": [
            {
                "id": t.id,
                "submissionId": t.submission_id,
                "versionNum": t.version_num,
                "status": t.orchestrator_status,
                "summary": t.summary_text,
                "durationMs": t.total_duration_ms,
                "createdAt": t.created_at.isoformat() if t.created_at else None,
                "stepsCount": len(t.steps_json) if isinstance(t.steps_json, list) else 0,
            }
            for t in traces[:6]
        ],
    }


@router.post("/submissions/{sub_id}/crew-review", response_model=CrewReviewTrace)
def trigger_crew_review(
    sub_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Run the bounded Review Crew multi-agent sequential workflow on a submission.

    Advisory only. Deterministic rule engine and brand manager remain the sole
    source of truth for compliance verdicts.
    """
    sub = db.query(models.Submission).filter(models.Submission.id == sub_id).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission {sub_id} not found",
        )

    # Creators can only run review on their own submissions; managers can run on any
    if user.role != "manager" and sub.creator_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only run Review Crew on your own submissions",
        )

    workspace = getattr(user, "workspace", "PureGlow") or "PureGlow"
    try:
        trace = run_review_crew(
            db=db,
            submission_id=sub_id,
            user_id=user.id,
            workspace=workspace,
        )
        return trace
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Review crew error: {str(e)}")


@router.get("/submissions/{sub_id}/crew-trace", response_model=Optional[CrewReviewTrace])
def fetch_crew_trace(
    sub_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get the latest persisted Review Crew execution trace for a submission."""
    sub = db.query(models.Submission).filter(models.Submission.id == sub_id).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission {sub_id} not found",
        )

    if user.role != "manager" and sub.creator_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden to submission trace",
        )

    trace = get_latest_crew_trace(db, submission_id=sub_id)
    if not trace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Review Crew trace found for this submission. Run crew-review first.",
        )
    return trace
