"""Database engine, session factory and declarative base."""
import os

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker, declarative_base

from .config import settings

engine_kwargs: dict = {"future": True}

if settings.database_url.startswith("sqlite"):
    # SQLite needs this so the connection can be shared across threads.
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine = create_engine(settings.database_url, **engine_kwargs)

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()
else:
    # PostgreSQL / MySQL: Connection pooling with pre-ping to prevent stale connection drops on Render
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_pre_ping"] = True  # Drops dead connections silently closed by cloud firewalls
    engine_kwargs["pool_recycle"] = 300   # Recycle connections every 5 minutes
    engine_kwargs["pool_timeout"] = 30
    engine = create_engine(settings.database_url, **engine_kwargs)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
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

    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.uploads_dir, exist_ok=True)
