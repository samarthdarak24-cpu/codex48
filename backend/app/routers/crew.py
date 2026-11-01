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
