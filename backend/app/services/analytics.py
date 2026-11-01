"""Analytics & Metric Aggregations Service.

Compliant with PRECEDENT_MASTER_BACKEND_PROMPT.md §10:
- Strict formulas without hardcoded metrics
- Denominators (sample_size) returned for all rates and charts
- Approval time median & p90 calculations
- Creator and Brand Manager dashboard summaries
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    ApprovalDecision,
    ExceptionModel,
    ExceptionRequest,
    Finding,
    GuidelineDoc,
    ReassessmentTask,
    ReviewDecision,
    Rule,
    RuleConflict,
    Submission,
    User,
    utcnow,
)


def get_creator_dashboard_metrics(db: Session, user: User) -> dict:
    """Calculates live Creator dashboard metrics per §10."""
    subs = db.query(Submission).filter(Submission.creator_id == user.id).all()
    non_withdrawn = [s for s in subs if s.status.lower() != "withdrawn"]

    total_submissions = len(non_withdrawn)
    approved = sum(1 for s in non_withdrawn if s.status in ("Approved", "approved", "published"))
    pending_review = sum(1 for s in non_withdrawn if s.status in ("Pending", "in_review", "Ready for Approval"))

    # Sentinel tasks assigned to creator
    open_tasks = (
        db.query(ReassessmentTask)
        .filter(ReassessmentTask.assignee_id == user.id, ReassessmentTask.status.in_(["open", "in_progress"]))
        .count()
    )

    needs_changes = sum(1 for s in non_withdrawn if s.status in ("Changes Requested", "changes_requested"))
    needs_attention = needs_changes + open_tasks

    recent = [
        {
            "id": s.id,
            "title": s.title,
            "channel": s.channel,
            "brand": s.brand,
            "status": s.status,
            "version": s.version,
            "updatedAt": s.updated_at.isoformat(),
        }
        for s in sorted(non_withdrawn, key=lambda x: x.updated_at, reverse=True)[:5]
    ]

    return {
        "total_submissions": total_submissions,
        "approved": approved,
        "pending_review": pending_review,
        "needs_attention": needs_attention,
        "open_tasks": open_tasks,
        "sample_size": total_submissions,
        "recent_submissions": recent,
        "generated_at": utcnow().isoformat(),
    }


def get_manager_dashboard_metrics(db: Session, workspace_id: str) -> dict:
    """Calculates live Brand Manager dashboard metrics per §10."""
    now = utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # 1. Pending reviews in queue
    pending_reviews = (
        db.query(Submission)
        .filter(Submission.workspace == workspace_id, Submission.status.in_(["Pending", "in_review", "Ready for Approval"]))
        .count()
    )

    # 2. Approved today
    approved_today = (
        db.query(ReviewDecision)
        .join(Submission, ReviewDecision.submission_id == Submission.id)
        .filter(Submission.workspace == workspace_id, ReviewDecision.action.in_(["Approved", "approve"]))
        .filter(ReviewDecision.created_at >= today_start)
        .count()
    )

    # 3. Active & expiring exceptions
    in_7_days = now + timedelta(days=7)
    active_exceptions = (
        db.query(ExceptionRequest)
        .filter(ExceptionRequest.workspace == workspace_id, ExceptionRequest.status == "Approved")
        .filter((ExceptionRequest.expires_at == None) | (ExceptionRequest.expires_at > now))
        .count()
    )

    expiring_soon = (
        db.query(ExceptionRequest)
        .filter(ExceptionRequest.workspace == workspace_id, ExceptionRequest.status == "Approved")
        .filter(ExceptionRequest.expires_at > now, ExceptionRequest.expires_at <= in_7_days)
        .count()
    )

    # 4. Rules pending confirmation & open conflicts
    draft_rules = (
        db.query(Rule)
        .filter(Rule.workspace == workspace_id, Rule.status.in_(["draft", "needs_confirmation"]))
        .count()
    )
    open_conflicts = (
        db.query(RuleConflict)
        .filter(RuleConflict.workspace_id == workspace_id, RuleConflict.status == "open")
        .count()
    )
    rules_pending_confirmation = draft_rules + open_conflicts

    # 5. Open Sentinel tasks
    open_sentinel_tasks = (
        db.query(ReassessmentTask)
        .filter(ReassessmentTask.workspace_id == workspace_id, ReassessmentTask.status.in_(["open", "in_progress"]))
        .count()
    )

    # Total submissions in workspace as denominator
    total_content = db.query(Submission).filter(Submission.workspace == workspace_id).count()

    return {
        "pending_reviews": pending_reviews,
        "approved_today": approved_today,
        "active_exceptions": active_exceptions,
        "expiring_soon": expiring_soon,
        "rules_pending_confirmation": rules_pending_confirmation,
        "open_sentinel_tasks": open_sentinel_tasks,
        "sample_size": total_content,
        "generated_at": now.isoformat(),
    }


def get_approval_time_metrics(db: Session, workspace_id: str) -> dict:
    """Calculates median and 90th percentile approval durations."""
    decisions = (
        db.query(ReviewDecision, Submission)
        .join(Submission, ReviewDecision.submission_id == Submission.id)
        .filter(Submission.workspace == workspace_id, ReviewDecision.action.in_(["Approved", "approve"]))
        .all()
    )

    durations_hours = []
    for d, s in decisions:
        if d.created_at and s.created_at:
            delta = (d.created_at - s.created_at).total_seconds() / 3600.0
            durations_hours.append(max(0.1, round(delta, 2)))

    if not durations_hours:
        return {
            "median_hours": 0.0,
            "p90_hours": 0.0,
            "sample_size": 0,
            "generated_at": utcnow().isoformat(),
        }

    durations_hours.sort()
    n = len(durations_hours)
    median = durations_hours[n // 2]
    p90 = durations_hours[int(n * 0.9)]

    return {
        "median_hours": median,
        "p90_hours": p90,
        "sample_size": n,
        "generated_at": utcnow().isoformat(),
    }

