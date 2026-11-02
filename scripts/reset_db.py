"""Database reset script for development and QA environments.

Refuses to execute if APP_ENV=production.
Drops all tables and re-initializes schema.
"""
import os
import sys

# Ensure backend is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.config import settings
from app.db import Base, engine, init_db


def reset_db():
    if settings.app_env.lower() == "production":
        print("ERROR: reset_db is disabled when APP_ENV=production")
        sys.exit(1)

    print(f"Resetting database at {settings.database_url}...")
    Base.metadata.drop_all(bind=engine)
    init_db()
    print("Database reset complete. All tables re-initialized.")


if __name__ == "__main__":
    reset_db()

