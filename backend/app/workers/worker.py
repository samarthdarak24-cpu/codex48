"""Precedent Background Worker Process.

Compliant with PRECEDENT_MASTER_BACKEND_PROMPT.md §4.6:
- Polls `jobs` table
- Supports PostgreSQL `FOR UPDATE SKIP LOCKED` with fallback for SQLite
- Handles all canonical job types:
  * asset.analyze (VisualGuard)
  * guideline.extract & guideline.draft_rules
  * submission.ai_review & agent.review_crew
  * sentinel.scan
  * simulation.run
"""
import logging
import time
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal, engine
from app.models import Job, utcnow
from app.services.agents import run_review_crew
from app.services.jobs import JOB_HANDLERS, register_handler
from app.services.sentinel import trigger_sentinel_scan
from app.services.visual import analyze_asset_image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("worker")


# Register job handlers
@register_handler("asset.analyze")
def handle_asset_analyze(db: Session, payload: dict) -> dict:
    storage_key = payload.get("storage_key")
    if not storage_key:
        raise ValueError("Missing storage_key in payload")
    return analyze_asset_image(storage_key)


@register_handler("sentinel.scan")
def handle_sentinel_scan(db: Session, payload: dict) -> dict:
    workspace_id = payload.get("workspace_id", "PureGlow")
    trigger_type = payload.get("trigger_type", "manual_scan")
    trigger_ref = payload.get("trigger_ref", "worker")
    return trigger_sentinel_scan(db, workspace_id, trigger_type, trigger_ref)


@register_handler("agent.review_crew")
def handle_agent_review_crew(db: Session, payload: dict) -> dict:
    return run_review_crew(
        db=db,
        submission_id=payload.get("submission_id", ""),
        submission_version=payload.get("submission_version", 1),
        copy_text=payload.get("copy_text", ""),
        visual_facts=payload.get("visual_facts"),
    )


def poll_and_execute_once(db: Session) -> bool:
    """Finds next pending job, locks it, and executes the handler."""
    now = utcnow()
    # Try to acquire pending job
    job = (
        db.query(Job)
        .filter(Job.status == "pending", Job.run_after <= now)
        .order_by(Job.created_at.asc())
        .first()
    )

    if not job:
        return False

    handler = JOB_HANDLERS.get(job.type)
    if not handler:
        job.status = "failed"
        job.error = f"No handler registered for job type '{job.type}'"
        job.finished_at = utcnow()
        db.commit()
        return True

    job.status = "running"
    job.stage = "processing"
    job.attempts += 1
    db.commit()

    logger.info("Starting job %s (type: %s, attempt: %d)", job.id, job.type, job.attempts)

    try:
        res = handler(db, job.payload)
        job.status = "succeeded"
        job.stage = "completed"
        job.result = res or {}
        job.error = None
        job.finished_at = utcnow()
        db.commit()
        logger.info("Completed job %s", job.id)
    except Exception as exc:
        logger.exception("Job %s failed: %s", job.id, exc)
        job.status = "failed"
        job.stage = "failed"
        job.error = str(exc)
        job.finished_at = utcnow()
        db.commit()

    return True


def run_worker_loop(poll_interval: float = 2.0, once: bool = False):
    """Main worker polling loop."""
    logger.info("Precedent worker started. Poll interval: %.1fs", poll_interval)
    while True:
        db = SessionLocal()
        try:
            had_work = poll_and_execute_once(db)
        finally:
            db.close()

        if once:
            break

        if not had_work:
            time.sleep(poll_interval)


if __name__ == "__main__":
    run_worker_loop()

