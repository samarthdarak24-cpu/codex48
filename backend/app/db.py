"""Database engine, session factory and declarative base."""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker, declarative_base

from .config import settings

connect_args: dict = {}
if settings.database_url.startswith("sqlite"):
    # SQLite needs this so the connection can be shared across threads.
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.database_url, connect_args=connect_args, future=True)
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
