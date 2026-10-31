"""Precedent FastAPI application.

Wires every domain router, installs request-id tracing and the structured error
format, starts/stops the Sentinel scheduler, and ensures tables exist on
startup. (Seeding is a separate, explicit step: `python seed.py`.)

In the Docker image the built frontend is copied to `../dist` and mounted at
`/`, so the API and the SPA share one origin and CORS stops mattering.
"""
import logging
import os
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.db import SessionLocal, init_db
from app.errors import RequestIDMiddleware, install_error_handlers
from app.routers import (
    analysis,
    assets,
    audit,
    auth,
    claims,
    evidence,
    exceptions,
    guidelines,
    rules,
    sentinel,
    simulations,
    submissions,
    team,
)
from app.services import scheduler as sentinel_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("precedent")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    sentinel_scheduler.start()
    try:
        yield
    finally:
        sentinel_scheduler.shutdown()


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

install_error_handlers(app)


# ---------------------------------------------------------------------------
# Health — reports each optional capability without leaking secrets
# ---------------------------------------------------------------------------


def _database_status() -> dict:
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"ok": True, "driver": settings.database_url.split(":", 1)[0]}
    except Exception as exc:
        return {"ok": False, "error": str(exc)[:200]}
    finally:
        db.close()


def _storage_status() -> dict:
    path = os.path.abspath(settings.uploads_dir)
    try:
        os.makedirs(path, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=path, delete=True):
            pass
        return {"ok": True, "writable": True}
    except Exception as exc:
        return {"ok": False, "writable": False, "error": str(exc)[:200]}


def _ocr_status() -> dict:
    try:
        from app.services.visual import ocr as ocr_mod

        ready, detail = ocr_mod._tesseract_ready()  # noqa: SLF001 - status probe
        return {"ok": bool(ready), "engine": "tesseract", "detail": detail}
    except Exception as exc:
        return {"ok": False, "engine": "tesseract", "detail": str(exc)[:200]}


def _embeddings_status() -> dict:
    try:
        from app.services.semantic.embeddings import encoder_status

        status = encoder_status(
            (settings.embedding_onnx_path or "").strip(),
            (settings.embedding_tokenizer_path or "").strip(),
        )
        return {"ok": bool(status.get("available")), **status}
    except Exception as exc:
        return {"ok": False, "available": False, "error": str(exc)[:200]}


def _llm_status() -> dict:
    configured = bool(settings.llm_api_key and settings.llm_base_url)
    return {
        "ok": True,
        "configured": configured,
        "model": settings.llm_model if configured else None,
        "daily_call_limit": settings.llm_daily_call_limit,
    }


@app.get("/health")
def health() -> dict:
    database = _database_status()
    storage = _storage_status()
    ocr = _ocr_status()
    embeddings = _embeddings_status()
    llm = _llm_status()
    scheduler = sentinel_scheduler.status()
    degraded = not (database["ok"] and storage["ok"])
    return {
        "status": "error" if degraded else "ok",
        "app": settings.app_name,
        "version": "1.0.0",
        "database": database,
        "storage": storage,
        "ocr": ocr,
        "embeddings": embeddings,
        "llm": llm,
        "scheduler": scheduler,
        "retrieval": "hybrid_bm25_vector" if embeddings["ok"] else "bm25",
    }


for _router in (
    auth.router,
    team.router,
    submissions.router,
    guidelines.router,
    rules.router,
    claims.router,
    exceptions.router,
    simulations.router,
    audit.router,
    assets.router,
    analysis.router,
    evidence.router,
    sentinel.router,
):
    app.include_router(_router)


# ---------------------------------------------------------------------------
# Single-origin static serving (Docker / production)
# ---------------------------------------------------------------------------
# When a built frontend exists next to the backend, serve it from the same
# origin as the API. Mounted last so it never shadows an API route.
_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "dist"))

if os.path.isdir(_DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(_DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str):
        """Serve real files when they exist, otherwise hand routing to the SPA."""
        candidate = os.path.abspath(os.path.join(_DIST_DIR, full_path))
        # Path traversal guard: the resolved path must sit *inside* dist, so
        # compare against the directory plus a separator ("dist-evil/" must not
        # pass a bare prefix check).
        root = _DIST_DIR.rstrip(os.sep) + os.sep
        if full_path and candidate.startswith(root) and os.path.isfile(candidate):
            return FileResponse(candidate)
        index = os.path.join(_DIST_DIR, "index.html")
        if os.path.isfile(index):
            return FileResponse(index)
        return {"detail": "Frontend build not found"}
