"""Canonical API v1 router module for Precedent.

Implements PRECEDENT_MASTER_BACKEND_PROMPT.md §9 CANONICAL ENDPOINT CATALOGUE.
All routes mounted under `/api/v1`.
"""
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, UploadFile, File, Form
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import get_current_user, require_manager
from app.engine import (
    detect_rule_conflicts,
    evaluate_rule,
    evaluate_submission,
    get_condition_type_catalogue,
)
from app.errors import (
    AppException,
    ForbiddenException,
    NotFoundException,
    StaleVersionException,
    ValidationException,
)
from app.models import (
    AgentRun,
    AiCallLog,
    ApprovalDecision,
    ApprovedClaim,
    AssetAnalysis,
    AuditEvent,
    BrandAsset,
    BrandKit,
    BrandLogo,
    Campaign,
    Comment,
    ExceptionModel,
    ExceptionRequest,
    ExceptionRulingHistory,
    Finding,
    FixSuggestion,
    GuidelineDoc,
    GuidelinePassage,
    GuidelineVersion,
    Job,
    Notification,
    Publication,
    ReassessmentTask,
    ReviewAssignment,
    ReviewDecision,
    Rule,
    RuleConflict,
    RuleVersion,
    ScanRun,
    Simulation,
    Submission,
    SubmissionVersion,
    TaskEvent,
    User,
    utcnow,
)
from app.schemas import TokenOut, UserOut, user_to_out
from app.security import create_token, hash_password, verify_password
from app.services import audit
from app.services.analytics import (
    get_approval_time_metrics,
    get_creator_dashboard_metrics,
    get_manager_dashboard_metrics,
)
from app.services.jobs import enqueue_job, get_job_status
from app.services.reports import export_submissions_csv, generate_submission_compliance_pdf
from app.services.semantic import (
    extract_draft_rules_from_passages,
    search_passages_hybrid,
    validate_citation,
)
from app.services.sentinel import trigger_sentinel_scan
from app.services.storage import get_storage, validate_and_process_upload
from app.services.visual import analyze_asset_image

router = APIRouter(prefix="/api/v1")


# ===========================================================================
# 1. Shared & Auth
# ===========================================================================

class LoginIn(BaseModel):
    email: str
    password: str


import logging
import time

logger = logging.getLogger("uvicorn.error")

@router.post("/auth/login", response_model=TokenOut, tags=["Auth"])
def login(body: LoginIn, db: Session = Depends(get_db)):
    t_start = time.perf_counter()
    
    t_db_start = time.perf_counter()
    u = db.query(User).filter(User.email == body.email.strip().lower()).first()
    t_db_elapsed = (time.perf_counter() - t_db_start) * 1000

    t_pw_start = time.perf_counter()
    valid_password = bool(u and u.password_hash and verify_password(body.password, u.password_hash))
    t_pw_elapsed = (time.perf_counter() - t_pw_start) * 1000

    if not u or not valid_password:
        audit.record(
            db,
            user_id="",
            action="Security Event",
            entity_title=f"Failed login ({body.email})",
            entity_kind="auth",
            entity_id=body.email,
            details=f"Failed login attempt for {body.email}",
            brand=u.workspace if u else "PureGlow",
        )
        t_total_elapsed = (time.perf_counter() - t_start) * 1000
        logger.warning(
            f"[AUTH TIMING /api/v1] FAILED login for '{body.email}' | "
            f"Total: {t_total_elapsed:.1f}ms | DB: {t_db_elapsed:.1f}ms | PW_Check: {t_pw_elapsed:.1f}ms"
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    t_tok_start = time.perf_counter()
    token = create_token(u.id, u.role)
    t_tok_elapsed = (time.perf_counter() - t_tok_start) * 1000

    t_audit_start = time.perf_counter()
    audit.record(
        db,
        user_id=u.id,
        action="Login",
        entity_title=f"User Login ({u.email})",
        entity_kind="auth",
        entity_id=u.id,
        details=f"User {u.email} ({u.role}) signed in",
        brand=u.workspace,
    )
    t_audit_elapsed = (time.perf_counter() - t_audit_start) * 1000

    t_total_elapsed = (time.perf_counter() - t_start) * 1000
    logger.info(
        f"[AUTH TIMING /api/v1] SUCCESS login for '{u.email}' ({u.role}) | "
        f"Total: {t_total_elapsed:.1f}ms | "
        f"DB Lookup: {t_db_elapsed:.1f}ms | "
        f"Password Verify: {t_pw_elapsed:.1f}ms | "
        f"Token: {t_tok_elapsed:.1f}ms | "
        f"Audit Write: {t_audit_elapsed:.1f}ms"
    )

    return TokenOut(token=token, user=user_to_out(u))


@router.post("/auth/logout", tags=["Auth"])
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    audit.record(
        db,
        user_id=current_user.id,
        action="Logout",
        entity_title=f"User Logout ({current_user.email})",
        entity_kind="auth",
        entity_id=current_user.id,
        details=f"User {current_user.email} signed out",
        brand=current_user.workspace,
    )
    return {"ok": True, "message": "Signed out"}


@router.post("/auth/refresh", tags=["Auth"])
def refresh_token(current_user: User = Depends(get_current_user)):
    token = create_token(current_user.id, current_user.role)
    return {"token": token, "user": user_to_out(current_user)}


@router.get("/auth/me", response_model=UserOut, tags=["Auth"])
def me(current_user: User = Depends(get_current_user)):
    return user_to_out(current_user)


@router.get("/search", tags=["Shared"])
def global_search(
    q: str = Query("", description="Search term"),
    types: str = Query("", description="Comma-separated types"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Role-scoped global search for top navigation bar."""
    if not q.strip():
        return {"items": []}

    results = []
    term = f"%{q.strip().lower()}%"
    type_set = set(t.strip() for t in types.split(",") if t.strip()) if types else {"submissions", "guidelines", "rules", "assets"}

    if "submissions" in type_set:
        sub_q = db.query(Submission).filter(Submission.workspace == current_user.workspace)
        if current_user.role == "creator":
            sub_q = sub_q.filter(Submission.creator_id == current_user.id)
        subs = sub_q.filter(Submission.title.ilike(term) | Submission.excerpt.ilike(term)).limit(5).all()
        for s in subs:
            results.append({"type": "submission", "id": s.id, "title": s.title, "subtitle": s.status, "route": f"/app/feedback/{s.id}"})

    if "guidelines" in type_set:
        docs = db.query(GuidelineDoc).filter(GuidelineDoc.workspace == current_user.workspace).filter(GuidelineDoc.name.ilike(term)).limit(5).all()
        for d in docs:
            results.append({"type": "guideline", "id": d.id, "title": d.name, "subtitle": d.category, "route": "/app/guidelines"})

    if "rules" in type_set:
        rules = db.query(Rule).filter(Rule.workspace == current_user.workspace).filter(Rule.title.ilike(term) | Rule.code.ilike(term)).limit(5).all()
        for r in rules:
            results.append({"type": "rule", "id": r.id, "title": f"{r.code}: {r.title}", "subtitle": r.subject, "route": "/manager/guidelines"})

    return {"items": results, "total": len(results)}


@router.get("/jobs/{job_id}", tags=["Shared"])
def poll_job(job_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    status = get_job_status(db, job_id)
    if not status:
        raise NotFoundException("Job", job_id)
    return status


@router.get("/nav/counts", tags=["Shared"])
def get_nav_counts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspace = current_user.workspace or "PureGlow"
    role = current_user.role or "creator"
    
    # Manager counts
    pending_review = db.query(Submission).filter(
        Submission.workspace == workspace,
        Submission.status.in_(["Pending", "in_review", "In Review"])
    ).count()
    
    open_exceptions = db.query(ExceptionRequest).filter(
        ExceptionRequest.workspace == workspace,
        ExceptionRequest.status.in_(["pending", "Pending", "in_review"])
    ).count()
    
    sentinel_tasks = db.query(ReassessmentTask).filter(
        ReassessmentTask.status.in_(["open", "in_progress", "pending"])
    ).count()
    
    # Creator counts
    my_subs = db.query(Submission).filter(
        Submission.creator_id == current_user.id
    ).count()
    
    my_ai_review = db.query(Submission).filter(
        Submission.creator_id == current_user.id,
        Submission.status.in_(["Changes Requested", "needs_changes", "in_review", "Pending"])
    ).count()
    
    my_exceptions = db.query(ExceptionRequest).filter(
        ExceptionRequest.requester_id == current_user.id,
        ExceptionRequest.status.in_(["pending", "Pending"])
    ).count()
    
    my_sentinel = db.query(ReassessmentTask).filter(
        ReassessmentTask.assignee_id == current_user.id,
        ReassessmentTask.status.in_(["open", "in_progress", "pending"])
    ).count()
    
    my_approved = db.query(Submission).filter(
        Submission.creator_id == current_user.id,
        Submission.status.in_(["Approved", "approved"])
    ).count()

    unread_notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read_at == None
    ).count()

    return {
        "manager": {
            "review_queue": pending_review,
            "exceptions": open_exceptions,
            "sentinel": sentinel_tasks,
        },
        "creator": {
            "my_submissions": my_subs,
            "ai_review": my_ai_review,
            "exception_requests": my_exceptions,
            "sentinel_tasks": my_sentinel,
            "approved_content": my_approved,
        },
        "unread_notifications": unread_notifications,
    }


@router.get("/submissions/summary", tags=["Submissions"])
def submissions_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspace = current_user.workspace or "PureGlow"
    q = db.query(Submission).filter(Submission.workspace == workspace)
    total = q.count()
    approved = q.filter(Submission.status.in_(["Approved", "approved"])).count()
    pending = q.filter(Submission.status.in_(["Pending", "in_review", "In Review"])).count()
    needs_changes = q.filter(Submission.status.in_(["Changes Requested", "needs_changes"])).count()
    rejected = q.filter(Submission.status.in_(["Declined", "rejected", "Rejected"])).count()
    return {
        "total": total,
        "approved": approved,
        "pending": pending,
        "needs_changes": needs_changes,
        "rejected": rejected,
    }


@router.post("/submissions/{sub_id}/review-crew", tags=["Review Crew"])
def run_review_crew_endpoint(sub_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.review_crew.engine import ReviewCrewEngine
    return ReviewCrewEngine.run_review(db, sub_id, current_user)


@router.get("/campaigns", tags=["Shared"])
def list_campaigns(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    camps = db.query(Campaign).filter(Campaign.workspace_id == current_user.workspace).all()
    return camps


@router.get("/brand-kit", tags=["Brand Kit"])
def get_brand_kit(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bk = db.query(BrandKit).filter(BrandKit.workspace_id == current_user.workspace).first()
    if not bk:
        # Return default PureGlow brand kit
        return {
            "workspace_id": current_user.workspace,
            "palette": [
                {"hex": "#2C5E3B", "name": "Forest Green", "role": "primary"},
                {"hex": "#7AB93B", "name": "Sage Green", "role": "secondary"},
                {"hex": "#F4F7F2", "name": "Ivory", "role": "background"},
            ],
            "color_tolerance_dE": 10.0,
            "approved_phrases": ["Dermatologist tested", "Cruelty-free", "Sustainably sourced"],
            "required_disclaimers": ["Terms and conditions apply.", "Individual results may vary."],
            "tone_notes": "Warm, authentic, grounded in natural wellness.",
            "logos": [],
        }
    return bk


@router.put("/brand-kit", tags=["Brand Kit"])
def update_brand_kit(
    body: dict,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    bk = db.query(BrandKit).filter(BrandKit.workspace_id == manager.workspace).first()
    if not bk:
        bk = BrandKit(workspace_id=manager.workspace)
        db.add(bk)

    bk.palette = body.get("palette", bk.palette)
    bk.color_tolerance_dE = body.get("color_tolerance_dE", bk.color_tolerance_dE)
    bk.approved_phrases = body.get("approved_phrases", bk.approved_phrases)
    bk.required_disclaimers = body.get("required_disclaimers", bk.required_disclaimers)
    bk.tone_notes = body.get("tone_notes", bk.tone_notes)
    bk.updated_by = manager.id
    bk.updated_at = utcnow()
    db.commit()

    # Brand kit change fires Sentinel scan
    trigger_sentinel_scan(db, manager.workspace, "brand_kit_updated", bk.id)

    audit.record(
        db,
        user_id=manager.id,
        action="Updated",
        entity_title="Brand Kit",
        entity_kind="brand_kit",
        entity_id=bk.id,
        details="Brand Kit palette & rules updated",
        brand=manager.workspace,
    )
    return bk


# ===========================================================================
# 2. Creator Features (C01–C10)
# ===========================================================================

@router.get("/creator/dashboard", tags=["Creator"])
def creator_dashboard(creator: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_creator_dashboard_metrics(db, creator)


@router.post("/submissions", tags=["Creator"])
def create_submission_v1(
    body: dict,
    creator: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.routers.submissions import create_submission
    from app.schemas import SubmissionIn
    # Delegate to core submissions service while honoring canonical contract
    sub_in = SubmissionIn(
        title=body["title"],
        excerpt=body.get("excerpt", body.get("text", "")[:64]),
        type=body.get("type", "Text"),
        channel=body.get("channel", "Instagram"),
        brand=body.get("brand", creator.workspace),
        text=body.get("text", body.get("copy", "")),
        assetId=body.get("assetId"),
    )
    return create_submission(sub_in, creator, db)


@router.get("/submissions/my", tags=["Creator"])
def list_my_submissions(creator: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subs = db.query(Submission).filter(Submission.creator_id == creator.id).order_by(Submission.updated_at.desc()).all()
    from app.routers.submissions import _submission_to_out
    return [_submission_to_out(s) for s in subs]


@router.get("/submissions/{sub_id}/report", tags=["Creator"])
def download_submission_report(sub_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.get(Submission, sub_id)
    if not sub:
        raise NotFoundException("Submission", sub_id)
    pdf_bytes = generate_submission_compliance_pdf(sub)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=compliance_{sub.code or sub.id}.pdf"},
    )


@router.get("/notifications", tags=["Creator"])
def list_notifications(
    category: str = Query("all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if category == "unread":
        q = q.filter(Notification.read_at == None)
    return q.order_by(Notification.created_at.desc()).all()


@router.get("/notifications/unread-count", tags=["Creator"])
def unread_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.read_at == None).count()
    return {"unread_count": count}


@router.patch("/notifications/{notif_id}/read", tags=["Creator"])
def mark_notification_read(notif_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, notif_id)
    if n and n.user_id == current_user.id:
        n.read_at = utcnow()
        db.commit()
    return {"ok": True}


# ===========================================================================
# 3. Manager Features (M01–M11)
# ===========================================================================

@router.get("/manager/dashboard", tags=["Manager"])
def manager_dashboard(manager: User = Depends(require_manager), db: Session = Depends(get_db)):
    return get_manager_dashboard_metrics(db, manager.workspace)


@router.get("/ai/health", tags=["Manager"])
def ai_health(manager: User = Depends(require_manager), db: Session = Depends(get_db)):
    """Live probe health endpoint for Manager overview per §8.5."""
    now = utcnow()
    llm_reachable = bool(settings.llm_base_url and settings.llm_api_key)
    calls_today = db.query(AiCallLog).filter(AiCallLog.created_at >= now.replace(hour=0, minute=0)).count()

    return {
        "status": "healthy" if llm_reachable else "degraded",
        "llm_configured": llm_reachable,
        "llm_provider": "openai" if settings.llm_base_url else "none",
        "ocr_engine": "rapidocr-cpu",
        "vector_search": "lexical_hybrid",
        "calls_today": calls_today,
        "sample_size": calls_today,
        "checked_at": now.isoformat(),
    }


@router.get("/rules/condition-types", tags=["Manager"])
def rule_condition_types():
    """Returns condition catalogue for rule editor."""
    return get_condition_type_catalogue()


@router.post("/rule-conflicts/detect", tags=["Manager"])
def detect_conflicts_endpoint(manager: User = Depends(require_manager), db: Session = Depends(get_db)):
    rules = db.query(Rule).filter(Rule.workspace == manager.workspace, Rule.status == "active").all()
    conflicts = detect_rule_conflicts(rules)
    return conflicts


# ===========================================================================
# 4. Publications (G1)
# ===========================================================================

class PublicationIn(BaseModel):
    channel: str = "Instagram"
    external_ref: Optional[str] = None


@router.post("/submissions/{sub_id}/publications", tags=["Publications"])
def publish_submission(
    sub_id: str,
    body: PublicationIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.get(Submission, sub_id)
    if not sub:
        raise NotFoundException("Submission", sub_id)
    if sub.status not in ("Approved", "approved"):
        raise ValidationException("Only approved submission versions can be published.")

    pub = Publication(
        submission_id=sub.id,
        submission_version_id=sub.current_version_id or str(sub.version),
        channel=body.channel,
        published_at=utcnow(),
        published_by=current_user.id,
        status="published",
        external_ref=body.external_ref,
    )
    sub.status = "published"
    db.add(pub)
    db.commit()

    audit.record(
        db,
        user_id=current_user.id,
        action="Published",
        entity_title=sub.title,
        entity_kind="submission",
        entity_id=sub.id,
        details=f"Published version v{sub.version} to {body.channel}",
        brand=sub.brand,
    )
    return pub


@router.get("/submissions/{sub_id}/publications", tags=["Publications"])
def list_submission_publications(sub_id: str, db: Session = Depends(get_db)):
    pubs = db.query(Publication).filter(Publication.submission_id == sub_id).all()
    return pubs


@router.post("/publications/{pub_id}/unpublish", tags=["Publications"])
def unpublish(pub_id: str, manager: User = Depends(require_manager), db: Session = Depends(get_db)):
    pub = db.get(Publication, pub_id)
    if not pub:
        raise NotFoundException("Publication", pub_id)
    pub.status = "unpublished"
    db.commit()
    return {"ok": True, "status": "unpublished"}


# ===========================================================================
# 5. Sentinel (M08 / C07)
# ===========================================================================

@router.get("/sentinel/summary", tags=["Sentinel"])
def sentinel_summary(manager: User = Depends(require_manager), db: Session = Depends(get_db)):
    total_tasks = db.query(ReassessmentTask).filter(ReassessmentTask.workspace_id == manager.workspace).count()
    open_tasks = db.query(ReassessmentTask).filter(ReassessmentTask.workspace_id == manager.workspace, ReassessmentTask.status.in_(["open", "in_progress"])).count()
    resolved_tasks = db.query(ReassessmentTask).filter(ReassessmentTask.workspace_id == manager.workspace, ReassessmentTask.status == "resolved").count()
    monitored_content = db.query(Submission).filter(Submission.workspace == manager.workspace, Submission.status.in_(["Approved", "published"])).count()

    return {
        "monitored_content_count": monitored_content,
        "total_tasks": total_tasks,
        "open_tasks": open_tasks,
        "resolved_tasks": resolved_tasks,
        "sample_size": monitored_content,
        "generated_at": utcnow().isoformat(),
    }


@router.post("/sentinel/scan", tags=["Sentinel"])
def run_sentinel_scan_now(manager: User = Depends(require_manager), db: Session = Depends(get_db)):
    stats = trigger_sentinel_scan(db, manager.workspace, "manual_scan", "manager_triggered")
    return stats


@router.get("/sentinel/tasks", tags=["Sentinel"])
def list_sentinel_tasks(manager: User = Depends(require_manager), db: Session = Depends(get_db)):
    tasks = db.query(ReassessmentTask).filter(ReassessmentTask.workspace_id == manager.workspace).order_by(ReassessmentTask.created_at.desc()).all()
    return tasks


@router.get("/sentinel/tasks/my", tags=["Sentinel"])
def list_my_sentinel_tasks(creator: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(ReassessmentTask).filter(ReassessmentTask.assignee_id == creator.id).order_by(ReassessmentTask.created_at.desc()).all()
    return tasks


@router.post("/sentinel/tasks/{task_id}/resolution", tags=["Sentinel"])
def submit_task_resolution(
    task_id: str,
    body: dict,
    creator: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.get(ReassessmentTask, task_id)
    if not task:
        raise NotFoundException("ReassessmentTask", task_id)
    task.status = "resolution_submitted"
    task.resolution = body
    db.add(TaskEvent(task_id=task.id, kind="resolution_submitted", actor_id=creator.id, note=body.get("notes", "")))
    db.commit()
    return task


@router.post("/sentinel/tasks/{task_id}/verify-resolution", tags=["Sentinel"])
def verify_task_resolution(
    task_id: str,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    task = db.get(ReassessmentTask, task_id)
    if not task:
        raise NotFoundException("ReassessmentTask", task_id)
    task.status = "resolved"
    db.add(TaskEvent(task_id=task.id, kind="verified", actor_id=manager.id, note="Resolution verified by manager"))
    db.commit()
    return task


@router.post("/sentinel/tasks/{task_id}/close", tags=["Sentinel"])
def close_sentinel_task(
    task_id: str,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    task = db.get(ReassessmentTask, task_id)
    if not task:
        raise NotFoundException("ReassessmentTask", task_id)
    task.status = "closed"
    db.add(TaskEvent(task_id=task.id, kind="closed", actor_id=manager.id, note="Task closed"))
    db.commit()
    return task


# ===========================================================================
# 6. Analytics (M10)
# ===========================================================================

@router.get("/analytics/overview", tags=["Analytics"])
def analytics_overview(manager: User = Depends(require_manager), db: Session = Depends(get_db)):
    return get_manager_dashboard_metrics(db, manager.workspace)


@router.get("/analytics/approval-time", tags=["Analytics"])
def analytics_approval_time(manager: User = Depends(require_manager), db: Session = Depends(get_db)):
    return get_approval_time_metrics(db, manager.workspace)


@router.get("/analytics/export", tags=["Analytics"])
def export_analytics_csv(manager: User = Depends(require_manager), db: Session = Depends(get_db)):
    subs = db.query(Submission).filter(Submission.workspace == manager.workspace).all()
    csv_str = export_submissions_csv(subs)
    audit.record(
        db,
        user_id=manager.id,
        action="Exported",
        entity_title="Submissions CSV Export",
        entity_kind="analytics",
        entity_id="all",
        details="Exported workspace submissions CSV",
        brand=manager.workspace,
    )
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=analytics_export.csv"},
    )

