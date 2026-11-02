"""Precedent Standalone Scheduler Process.

Compliant with PRECEDENT_MASTER_BACKEND_PROMPT.md §3 & §8.3:
- Runs in a separate single-instance process (`python -m app.workers.scheduler`)
- Uses APScheduler
- Periodic tasks:
  * Daily Sentinel monitoring scan
  * Expiry sweeper for exception requests
"""
import logging
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings
from app.db import SessionLocal
from app.models import ExceptionRequest, utcnow
from app.services.sentinel import trigger_sentinel_scan

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("scheduler")


def run_daily_sentinel_scan():
    """Runs scheduled Sentinel scans across workspaces."""
    logger.info("Executing scheduled Sentinel scan...")
    db = SessionLocal()
    try:
        stats = trigger_sentinel_scan(db, "PureGlow", "scheduled_scan", "daily_cron")
        logger.info("Daily Sentinel scan completed: %s", stats)
    except Exception as e:
        logger.exception("Error during scheduled Sentinel scan: %s", e)
    finally:
        db.close()


def run_exception_expiry_sweeper():
    """Sweeps expired exceptions and marks them Expired; fires Sentinel trigger."""
    now = utcnow()
    db = SessionLocal()
    try:
        expired = (
            db.query(ExceptionRequest)
            .filter(ExceptionRequest.status == "Approved", ExceptionRequest.expires_at < now)
            .all()
        )
        if expired:
            logger.info("Found %d expired exceptions to revoke/expire", len(expired))
            for exc in expired:
                exc.status = "Expired"
                trigger_sentinel_scan(db, exc.workspace, "exception_expired", exc.id, exc.rule_code)
            db.commit()
    except Exception as e:
        logger.exception("Error during exception expiry sweep: %s", e)
    finally:
        db.close()


def start_scheduler():
    scheduler = BlockingScheduler()

    # Run Sentinel scan daily
    scheduler.add_job(
        run_daily_sentinel_scan,
        CronTrigger.from_crontab(settings.sentinel_cron),
        id="sentinel_daily_scan",
        name="Daily Sentinel Content Scan",
    )

    # Run expiry sweeper every hour
    scheduler.add_job(
        run_exception_expiry_sweeper,
        IntervalTrigger(minutes=60),
        id="exception_expiry_sweeper",
        name="Exception Expiry Sweeper",
    )

    logger.info("Scheduler started with cron: %s", settings.sentinel_cron)
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped.")


if __name__ == "__main__":
    start_scheduler()

