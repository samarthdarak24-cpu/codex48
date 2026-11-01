"""Sentinel background scheduling (A3, blueprint 9.3).

One shared, idempotent scan runs from two entry points:

* ``POST /sentinel/scan`` — a manager asking "check now".
* this APScheduler job — the daily sweep configured by ``SENTINEL_CRON``.

Safety:

* The job is skipped entirely when ``SENTINEL_SCHEDULER=0`` (the default in
  tests) so a test run never starts a thread.
* Every notification and task the scan writes is de-duplicated in the database
  (``_notification_exists`` / the unique key on reassessment tasks), so a second
  worker, a retry or a double click cannot multiply alerts.
* APScheduler is started once per process in the FastAPI lifespan; a
  multi-worker deployment should set ``SENTINEL_SCHEDULER=0`` on all but one
  worker, which is the documented, supported way to keep it single-instance.
"""
from __future__ import annotations

import logging
from typing import Optional

from . import sentinel as sentinel_service
from ..config import settings
from ..db import SessionLocal

log = logging.getLogger("precedent.scheduler")

_scheduler = None
_last_run: Optional[dict] = None
_last_error: Optional[str] = None


def _parse_cron(value: str) -> tuple[int, int]:
    """`"02:00"` → (2, 0). Falls back to 02:00 on anything unparsable."""
    try:
        hour_s, minute_s = (value or "").strip().split(":", 1)
        hour, minute = int(hour_s), int(minute_s)
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return hour, minute
    except Exception:
        pass
    return 2, 0


def run_daily_scan() -> dict:
    """Run the expiry/reassessment sweep for every workspace. Idempotent."""
    global _last_run, _last_error
    db = SessionLocal()
    try:
        workspaces = [row[0] for row in db.query(sentinel_service.models.Submission.workspace).distinct().all()]
        workspaces = [w for w in workspaces if w]
        summary: dict = {"workspaces": len(workspaces), "notified": 0, "lapsed": 0, "errors": []}
        for workspace in workspaces:
            try:
                # Close what has already lapsed first, so the forecast below
                # never counts an exception that is no longer valid.
                lapsed = sentinel_service.lapse_exceptions(db, workspace=workspace)
                summary["lapsed"] += int(lapsed.get("exceptionsExpired", 0) or 0)
                result = sentinel_service.scan_expiring(db, workspace=workspace, days=30)
                summary["notified"] += int(result.get("notificationsCreated", 0) or 0)
            except Exception as exc:  # keep going: one bad workspace must not stop the sweep
                db.rollback()
                summary["errors"].append({"workspace": workspace, "error": str(exc)[:200]})
                log.warning("sentinel scan failed for workspace=%s: %s", workspace, exc)
        _last_run = summary
        _last_error = None if not summary["errors"] else "; ".join(e["error"] for e in summary["errors"])
        return summary
    except Exception as exc:
        _last_error = str(exc)[:300]
        log.exception("sentinel daily scan failed")
        raise
    finally:
        db.close()


def start() -> bool:
    """Start the scheduler. Returns True when it is running."""
    global _scheduler
    import os

    if os.environ.get("PYTEST_CURRENT_TEST"):
        return False
    if not getattr(settings, "sentinel_scheduler_enabled", True):
        log.info("Sentinel scheduler disabled by configuration")
        return False
    if _scheduler is not None:
        return True
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger
    except Exception as exc:  # pragma: no cover - optional dependency
        log.warning("APScheduler unavailable, daily scan disabled: %s", exc)
        return False

    hour, minute = _parse_cron(settings.sentinel_cron)
    try:
        scheduler = BackgroundScheduler(timezone="UTC", daemon=True)
        scheduler.add_job(
            run_daily_scan,
            trigger=CronTrigger(hour=hour, minute=minute),
            id="sentinel-daily-scan",
            name="Sentinel daily scan",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=3600,
        )
        scheduler.start()
        _scheduler = scheduler
        log.info("Sentinel daily scan scheduled for %02d:%02d UTC", hour, minute)
        return True
    except Exception as exc:  # pragma: no cover - defensive
        log.warning("Could not start Sentinel scheduler: %s", exc)
        return False


def shutdown() -> None:
    global _scheduler
    if _scheduler is not None:
        try:
            _scheduler.shutdown(wait=False)
        except Exception:  # pragma: no cover
            pass
        _scheduler = None


def status() -> dict:
    """Scheduler status for /health and the Sentinel screen."""
    running = _scheduler is not None and getattr(_scheduler, "running", False)
    hour, minute = _parse_cron(settings.sentinel_cron)
    next_run = None
    if running:
        job = _scheduler.get_job("sentinel-daily-scan")
        if job is not None and job.next_run_time is not None:
            next_run = job.next_run_time.isoformat()
    return {
        "enabled": bool(getattr(settings, "sentinel_scheduler_enabled", True)),
        "running": running,
        "cron": f"{hour:02d}:{minute:02d} UTC",
        "next_run": next_run,
        "last_run": _last_run,
        "last_error": _last_error,
    }


# Public alias for health and auditing
get_scheduler_status = status
