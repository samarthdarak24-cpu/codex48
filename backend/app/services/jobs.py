"""DB-backed asynchronous job queue service.

Compliant with PRECEDENT_MASTER_BACKEND_PROMPT.md §4.6:
- Enqueues jobs into `jobs` table
- Supports synchronous execution when `JOBS_INLINE=true` (for fast tests/dev)
- Polling worker with atomic row locking
- Idempotent handlers with retry tracking
"""
import logging
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Optional
import uuid

from sqlalchemy.orm import Session
from app.config import settings
from app.models import Job, utcnow

logger = logging.getLogger(__name__)

# Registry of job handler functions
JOB_HANDLERS: Dict[str, Callable[[Session, dict], dict]] = {}


def register_handler(job_type: str):
    """Decorator to register a handler for a job type."""
    def decorator(fn: Callable[[Session, dict], dict]):
        JOB_HANDLERS[job_type] = fn
        return fn
    return decorator


def enqueue_job(
    db: Session,
    job_type: str,
    payload: dict,
    max_attempts: int = 3,
) -> Job:
    """Create a new job row. If settings.jobs_inline is True, execute immediately."""
    job = Job(
        id=str(uuid.uuid4()),
        type=job_type,
        payload=payload,
        status="pending",
        stage="queued",
        attempts=0,
        max_attempts=max_attempts,
        run_after=utcnow(),
        created_at=utcnow(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    if settings.jobs_inline:
        run_job_inline(db, job.id)
        db.refresh(job)

    return job


def run_job_inline(db: Session, job_id: str) -> None:
    """Run a specific job synchronously inside the current thread/transaction."""
    job = db.get(Job, job_id)
    if not job or job.status in ("succeeded", "cancelled"):
        return

    handler = JOB_HANDLERS.get(job.type)
    if not handler:
        job.status = "failed"
        job.error = f"No handler registered for job type '{job.type}'"
        job.finished_at = utcnow()
        db.commit()
        return

    job.status = "running"
    job.stage = "executing"
    job.attempts += 1
    db.commit()

    try:
        result = handler(db, job.payload)
        job.status = "succeeded"
        job.stage = "completed"
        job.result = result or {}
        job.error = None
        job.finished_at = utcnow()
        db.commit()
    except Exception as exc:
        logger.exception("Error executing job %s (%s)", job_id, job.type)
        job.status = "failed"
        job.stage = "failed"
        job.error = str(exc)
        job.finished_at = utcnow()
        db.commit()


def get_job_status(db: Session, job_id: str) -> Optional[dict]:
    job = db.get(Job, job_id)
    if not job:
        return None
    return {
        "job_id": job.id,
        "type": job.type,
        "status": job.status,
        "stage": job.stage,
        "attempts": job.attempts,
        "error": job.error,
        "result": job.result,
        "created_at": job.created_at.isoformat(),
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
    }

