"""Database connection and session factory.

Configured with sqlite / postgresql URL via settings.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from .config import settings

# SQLite needs check_same_thread=False for FastAPI concurrency
connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    echo=False,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Dev convenience: create tables if missing.

    Production uses Alembic migrations (see alembic/). This keeps local runs
    and tests friction-free without a manual migrate step.
    """
    from . import models  # noqa: F401  (register models on the metadata)
    from .agents import models as agent_models  # noqa: F401
    from .assistant import models as assistant_models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.uploads_dir, exist_ok=True)

    # Ensure backwards-compatibility for existing DBs where agent_runs was created with older schema
    with engine.begin() as conn:
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(conn)
            if "agent_runs" in inspector.get_table_names():
                existing_cols = {c["name"] for c in inspector.get_columns("agent_runs")}
                needed = [
                    ("agent_id", "VARCHAR"),
                    ("agent_version", "INTEGER DEFAULT 1"),
                    ("workspace", "VARCHAR DEFAULT 'PureGlow'"),
                    ("user_id", "VARCHAR"),
                    ("trigger_type", "VARCHAR DEFAULT 'manual'"),
                    ("inputs", "TEXT DEFAULT '{}'"),
                    ("outputs", "TEXT DEFAULT '{}'"),
                    ("duration_ms", "INTEGER DEFAULT 0"),
                    ("tokens_used", "INTEGER DEFAULT 0"),
                    ("tool_call_count", "INTEGER DEFAULT 0"),
                ]
                for col_name, col_type in needed:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE agent_runs ADD COLUMN {col_name} {col_type}"))
        except Exception:
            pass
