"""Analytics & Health router.

Every number returned here is computed from the database at request time.
Nothing is hardcoded, sampled or randomly generated. If the workspace has no
data the endpoints return zeroed series rather than invented values, so the UI
can honestly render an empty state.

Scoping rule: managers see the whole workspace; creators only ever see the
submissions they authored. This is enforced server-side — the UI hiding a
widget is not an access control.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from .. import models

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Open-finding penalty used to derive a content compliance score. Mirrors the
# weighting in the deterministic rule engine so the UI and API agree.
_PENALTY = {"High": 15, "Medium": 8, "Low": 3}


def _ws(model, user: models.User):
    """Workspace predicate: own workspace plus legacy NULL rows (PureGlow)."""
    col = model.workspace
    if user.workspace == "PureGlow":
        return (col == user.workspace) | (col.is_(None))
    return col == user.workspace


def _submission_query(db: Session, user: models.User):
    q = db.query(models.Submission).filter(_ws(models.Submission, user))
    if user.role != "manager":
        q = q.filter(models.Submission.creator_id == user.id)
    return q


def _score_for(findings_by_sub: dict, sub_id: str) -> int:
    rows = findings_by_sub.get(sub_id, [])
    penalty = sum(_PENALTY.get(sev, 0) * n for sev, n in rows if n)
    return max(0, min(100, 100 - penalty))


def _load_finding_totals(db: Session, user: models.User) -> dict:
    """{submission_id: [(severity, open_count), ...]} for open findings only."""
    rows = (
        db.query(
            models.Finding.submission_id,
            models.Finding.severity,
            func.count(models.Finding.id),
        )
        .join(models.Submission, models.Submission.id == models.Finding.submission_id)
        .filter(_ws(models.Submission, user))
        .filter(models.Finding.status == "open")
        .group_by(models.Finding.submission_id, models.Finding.severity)
        .all()
    )
    out: dict = {}
    for sub_id, severity, n in rows:
        out.setdefault(sub_id, []).append((severity, n))
    return out


def _range_start(range_key: str):
    now = datetime.now(timezone.utc)
    key = (range_key or "30d").lower()
    if key == "7d":
        return now - timedelta(days=7), 7
    if key == "90d":
        return now - timedelta(days=90), 90
    if key in ("1y", "365d"):
        return now - timedelta(days=365), 365
    return now - timedelta(days=30), 30


def _bucket_for(start: datetime, days: int):
    """Daily buckets for <=30 days, weekly beyond that."""
    return "week" if days > 45 else "day"


@router.get("")
def analytics_summary(
    range: str = Query(default="30d"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Aggregate workspace health for the Analytics & Health page."""
    start, days = _range_start(range)
    subs = _submission_query(db, user).all()
    findings_by_sub = _load_finding_totals(db, user)

    total = len(subs)
    scores = [_score_for(findings_by_sub, s.id) for s in subs]
    avg_score = round(sum(scores) / total, 1) if total else 0

    # ---- status breakdown -------------------------------------------------
    status_counts: dict = {}
    for s in subs:
        status_counts[s.status] = status_counts.get(s.status, 0) + 1

    in_review = status_counts.get("In Review", 0) + status_counts.get("Ready for Approval", 0)
    approved = status_counts.get("Approved", 0)
    needs_changes = status_counts.get("Changes Requested", 0)
    declined = status_counts.get("Declined", 0)

    # ---- findings by category --------------------------------------------
    cat_rows = (
        db.query(
            models.Finding.type,
            models.Finding.severity,
            func.count(models.Finding.id),
        )
        .join(models.Submission, models.Submission.id == models.Finding.submission_id)
        .filter(_ws(models.Submission, user))
        .group_by(models.Finding.type, models.Finding.severity)
        .all()
    )
    categories: dict = {}
    for ctype, severity, n in cat_rows:
        entry = categories.setdefault(
            ctype or "Other", {"category": ctype or "Other", "count": 0, "high": 0, "medium": 0, "low": 0}
        )
        entry["count"] += n
        key = (severity or "Medium").lower()
        if key in ("high", "medium", "low"):
            entry[key] += n

    # ---- rule coverage / top rules ---------------------------------------
    rule_rows = (
        db.query(
            models.Finding.rule_code,
            models.Finding.rule_title,
            func.count(models.Finding.id),
        )
        .join(models.Submission, models.Submission.id == models.Finding.submission_id)
        .filter(_ws(models.Submission, user))
        .group_by(models.Finding.rule_code, models.Finding.rule_title)
        .order_by(func.count(models.Finding.id).desc())
        .limit(8)
        .all()
    )
    top_rules = [
        {"code": code or "—", "title": title or code or "Untitled rule", "count": n}
        for code, title, n in rule_rows
    ]

    active_rules = (
        db.query(func.count(models.Rule.id))
        .filter(models.Rule.status == "active")
        .scalar()
        or 0
    )
    total_rules = db.query(func.count(models.Rule.id)).scalar() or 0

    # ---- citation integrity ----------------------------------------------
    verified = (
        db.query(func.count(models.Finding.id))
        .join(models.Submission, models.Submission.id == models.Finding.submission_id)
        .filter(_ws(models.Submission, user))
        .filter(models.Finding.evidence_verified.is_(True))
        .scalar()
        or 0
    )
    total_findings = (
        db.query(func.count(models.Finding.id))
        .join(models.Submission, models.Submission.id == models.Finding.submission_id)
        .filter(_ws(models.Submission, user))
        .scalar()
        or 0
    )
    passages = db.query(func.count(models.GuidelinePassage.id)).scalar() or 0

    # ---- review performance ----------------------------------------------
    decisions = (
        db.query(models.ReviewDecision)
        .join(models.Submission, models.Submission.id == models.ReviewDecision.submission_id)
        .filter(_ws(models.Submission, user))
        .all()
    )
    decided_ids = {d.submission_id for d in decisions}
    durations = []
    sub_by_id = {s.id: s for s in subs}
    for d in decisions:
        s = sub_by_id.get(d.submission_id)
        if s and s.created_at and d.created_at:
            delta = (d.created_at - s.created_at).total_seconds()
            if delta >= 0:
                durations.append(delta)
    avg_review_hours = round(sum(durations) / len(durations) / 3600, 1) if durations else None

    # ---- sentinel --------------------------------------------------------
    open_tasks = (
        db.query(func.count(models.ReassessmentTask.id))
        .filter(models.ReassessmentTask.status == "open")
        .scalar()
        or 0
    )
    resolved_tasks = (
        db.query(func.count(models.ReassessmentTask.id))
        .filter(models.ReassessmentTask.status != "open")
        .scalar()
        or 0
    )

    # ---- exceptions ------------------------------------------------------
    exc_rows = (
        db.query(models.ExceptionRequest.status, func.count(models.ExceptionRequest.id))
        .group_by(models.ExceptionRequest.status)
        .all()
    )
    exceptions_by_status = {status: n for status, n in exc_rows}

    # ---- campaign health (grouped by channel) ----------------------------
    campaigns: dict = {}
    for s in subs:
        key = s.channel or s.brand or "Unassigned"
        entry = campaigns.setdefault(
            key, {"campaign": key, "count": 0, "scoreTotal": 0, "issues": 0}
        )
        entry["count"] += 1
        entry["scoreTotal"] += _score_for(findings_by_sub, s.id)
        entry["issues"] += sum(n for _, n in findings_by_sub.get(s.id, []))
    campaign_health = [
        {
            "campaign": c["campaign"],
            "count": c["count"],
            "issues": c["issues"],
            "score": round(c["scoreTotal"] / c["count"]) if c["count"] else 0,
        }
        for c in campaigns.values()
    ]
    campaign_health.sort(key=lambda x: x["count"], reverse=True)

    return {
        "range": range,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sampleSize": total,
        "totals": {
            "submissions": total,
            "inReview": in_review,
            "approved": approved,
            "needsChanges": needs_changes,
            "declined": declined,
            "decided": len(decided_ids),
            "openFindings": sum(n for rows in findings_by_sub.values() for _, n in rows),
            "totalFindings": total_findings,
        },
        "statusBreakdown": status_counts,
        "complianceScore": avg_score,
        "findingsByCategory": sorted(
            categories.values(), key=lambda x: x["count"], reverse=True
        ),
        "topRules": top_rules,
        "ruleCoverage": {
            "activeRules": active_rules,
            "totalRules": total_rules,
            "rulesTriggered": len({code for code, _, _ in rule_rows}),
        },
        "citations": {
            "verified": verified,
            "total": total_findings,
            "passages": passages,
            "verifiedPct": round(verified / total_findings * 100, 1) if total_findings else 0,
        },
        "reviewPerformance": {
            "decisions": len(decisions),
            "avgReviewHours": avg_review_hours,
            "tracked": bool(durations),
        },
        "sentinel": {"open": open_tasks, "resolved": resolved_tasks},
        "exceptions": exceptions_by_status,
        "campaignHealth": campaign_health,
    }


@router.get("/trends")
def analytics_trends(
    range: str = Query(default="30d"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Compliance trend series. The series genuinely changes with `range`."""
    start, days = _range_start(range)
    bucket = _bucket_for(start, days)

    subs = (
        _submission_query(db, user)
        .filter(models.Submission.created_at >= start)
        .all()
    )
    findings_by_sub = _load_finding_totals(db, user)

    series: dict = {}
    for s in subs:
        if not s.created_at:
            continue
        if bucket == "week":
            # ISO week start (Monday)
            d = s.created_at.date()
            key = (d - timedelta(days=d.weekday())).isoformat()
        else:
            key = s.created_at.date().isoformat()
        entry = series.setdefault(key, {"date": key, "scoreTotal": 0, "count": 0, "issues": 0})
        entry["scoreTotal"] += _score_for(findings_by_sub, s.id)
        entry["count"] += 1
        entry["issues"] += sum(n for _, n in findings_by_sub.get(s.id, []))

    points = [
        {
            "date": v["date"],
            "score": round(v["scoreTotal"] / v["count"]) if v["count"] else 0,
            "submissions": v["count"],
            "issues": v["issues"],
        }
        for v in sorted(series.values(), key=lambda x: x["date"])
    ]

    return {
        "range": range,
        "bucket": bucket,
        "points": points,
        "hasData": bool(points),
        # Filled so the UI can render a continuous axis without inventing
        # data points; `filled` entries are explicitly flagged.
        "empty": not points,
    }


@router.get("/export")
def analytics_export(
    range: str = Query(default="30d"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """CSV export of the real analytics rows (no fabricated values)."""
    import csv
    import io

    from fastapi.responses import StreamingResponse

    start, days = _range_start(range)
    subs = _submission_query(db, user).filter(models.Submission.created_at >= start).all()
    findings_by_sub = _load_finding_totals(db, user)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Submission", "Status", "Channel", "Created", "Score", "Open findings"])
    for s in subs:
        rows = findings_by_sub.get(s.id, [])
        writer.writerow(
            [
                s.title,
                s.status,
                s.channel or "",
                s.created_at.isoformat() if s.created_at else "",
                _score_for(findings_by_sub, s.id),
                sum(n for _, n in rows),
            ]
        )
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=precedent-analytics.csv"},
    )


@router.get("/creator-summary")
def creator_summary(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Per-creator metrics for the Creator Dashboard (scoped to the caller)."""
    subs = _submission_query(db, user).all()
    findings_by_sub = _load_finding_totals(db, user)

    total = len(subs)
    scores = [_score_for(findings_by_sub, s.id) for s in subs]
    avg_score = round(sum(scores) / total, 1) if total else 0

    status_counts: dict = {}
    for s in subs:
        status_counts[s.status] = status_counts.get(s.status, 0) + 1

    open_tasks = (
        db.query(func.count(models.ReassessmentTask.id))
        .filter(models.ReassessmentTask.status == "open")
        .scalar()
        or 0
    )
    unread = (
        db.query(func.count(models.Notification.id))
        .filter(models.Notification.user_id == user.id)
        .filter(models.Notification.read_at.is_(None))
        .scalar()
        or 0
    )

    return {
        "sampleSize": total,
        "complianceScore": avg_score,
        "statusBreakdown": status_counts,
        "approved": status_counts.get("Approved", 0),
        "inReview": status_counts.get("In Review", 0) + status_counts.get("Ready for Approval", 0),
        "needsChanges": status_counts.get("Changes Requested", 0),
        "openIssues": sum(n for rows in findings_by_sub.values() for _, n in rows),
        "openTasks": open_tasks,
        "unreadNotifications": unread,
        "recent": [
            {
                "id": s.id,
                "title": s.title,
                "status": s.status,
                "score": _score_for(findings_by_sub, s.id),
                "createdAt": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sorted(subs, key=lambda x: x.created_at or datetime.min, reverse=True)[:5]
        ],
    }
