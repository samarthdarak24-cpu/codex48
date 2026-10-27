"""Shared pytest fixtures for the Precedent backend.

IMPORTANT: the DATABASE_URL (and UPLOADS_DIR) environment variables must be set
*before* any `app.*` module is imported, because `app.db` builds its engine from
`settings.database_url` at import time. We therefore set them at the very top of
this module, before importing the application package.
"""
import os
import tempfile

# --- configure environment BEFORE importing the app -------------------------
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db.name}"
os.environ["UPLOADS_DIR"] = tempfile.mkdtemp(prefix="precedent_uploads_")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app.db  # noqa: E402  (engine is built here, using the env above)
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models import User  # noqa: E402
from app.security import hash_password  # noqa: E402


# Initialise the schema once the temp database is configured.
app.db.init_db()


@pytest.fixture(autouse=True)
def _reset_tables():
    """Drop and recreate all tables between tests for full isolation."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    """A TestClient bound to the wired FastAPI app."""
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def users():
    """Seed a manager and a creator directly, returning their credentials."""
    db = SessionLocal()
    manager = User(
        id="manager-1",
        name="Test Manager",
        email="manager@precedent.test",
        role="manager",
        workspace="PureGlow",
        password_hash=hash_password("precedent"),
    )
    creator = User(
        id="creator-1",
        name="Test Creator",
        email="creator@precedent.test",
        role="creator",
        workspace="PureGlow",
        password_hash=hash_password("precedent"),
    )
    other = User(
        id="user-other-ws",
        name="Sarah Chen",
        email="sarah.chen@wellnesslife.co",
        role="creator",
        workspace="WellnessLife",
        password_hash=hash_password("precedent"),
    )
    db.add_all([manager, creator, other])
    db.commit()
    db.close()
    return {
        "manager": {
            "email": "manager@precedent.test",
            "password": "precedent",
            "id": "manager-1",
            "role": "manager",
            "workspace": "PureGlow",
        },
        "creator": {
            "email": "creator@precedent.test",
            "password": "precedent",
            "id": "creator-1",
            "role": "creator",
            "workspace": "PureGlow",
        },
        "other": {
            "email": "sarah.chen@wellnesslife.co",
            "password": "precedent",
            "id": "user-other-ws",
            "role": "creator",
            "workspace": "WellnessLife",
        },
    }


def get_token(client, email: str, password: str) -> str:
    """Log in and return the bearer token."""
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def manager_token(client, users) -> str:
    return get_token(client, users["manager"]["email"], users["manager"]["password"])


@pytest.fixture
def creator_token(client, users) -> str:
    return get_token(client, users["creator"]["email"], users["creator"]["password"])


@pytest.fixture
def other_workspace_token(client, users) -> str:
    return get_token(client, users["other"]["email"], users["other"]["password"])

