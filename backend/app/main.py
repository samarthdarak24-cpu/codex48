"""Precedent FastAPI application.

Wires every domain router, installs request-id tracing and the structured error
format, starts/stops the Sentinel scheduler, and ensures tables exist on
startup. (Seeding is a separate, explicit step: `python seed.py`.)

In the Docker image the built frontend is copied to `../dist` and mounted at
`/`, so the API and the SPA share one origin and CORS stops mattering.
"""
import logging
import os
import sys
import tempfile
from contextlib import asynccontextmanager

# Ensure backend directory is in sys.path whether executed from root or backend
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.db import SessionLocal, init_db
from app.errors import RequestIDMiddleware, install_error_handlers
from app.routers import (
    canonical_v1,
    agents as agents_router,
    analysis,
    analytics,
    assets,
    audit,
    auth,
    claims,
    crew,
    evidence,
    exceptions,
    feedback,
    guidelines,
    proofpass,
    rules,
    sentinel,
    simulations,
    snippets,
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

        tess_ready, tess_detail = ocr_mod._tesseract_ready()  # noqa: SLF001 - status probe
        rapid_ready, rapid_detail = ocr_mod._rapidocr_ready()
        langs, used_langs = ocr_mod._resolve_langs(settings.ocr_langs)
        return {
            "ok": bool(tess_ready or rapid_ready),
            "engine": settings.ocr_engine,
            "fallback_engine": settings.ocr_fallback_engine,
            "tesseract": {
                "ready": bool(tess_ready),
                "detail": tess_detail,
                "cmd": settings.tesseract_cmd,
                "tessdata_prefix": os.environ.get("TESSDATA_PREFIX", ""),
            },
            "rapidocr": {
                "ready": bool(rapid_ready),
                "detail": rapid_detail,
                "version": "1.4.4" if rapid_ready else None,
            },
            "languages": used_langs,
            "hindi_marathi_ready": "hin" in used_langs and "mar" in used_langs,
        }
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


@app.get("/health/models")
def health_models() -> dict:
    """Show real model readiness, versions, OCR languages, embeddings, and LLM configuration."""
    import importlib.util

    ocr = _ocr_status()
    embeddings = _embeddings_status()
    llm = _llm_status()
    imagehash_available = importlib.util.find_spec("imagehash") is not None
    return {
        "status": "ok" if (ocr["ok"] and embeddings["ok"]) else "degraded",
        "ocr": ocr,
        "embeddings": {
            **embeddings,
            "cache_dir": settings.model_cache_dir,
            "model_name": embeddings.get("model") or "multilingual-e5-small",
            "dimension": 384,
            "device": "cpu",
        },
        "llm": llm,
        "perceptual_hash": {"ready": imagehash_available, "engine": "ImageHash"},
        "retrieval": "hybrid_bm25_vector" if embeddings["ok"] else "bm25_only",
    }


@app.get("/ready")
def readiness() -> dict:
    """Readiness probe checking database connectivity."""
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "app": settings.app_name,
            "database": "connected",
            "storage": "local",
        }
    except Exception as e:
        return {"status": "unavailable", "error": str(e)}
    finally:
        db.close()


@app.get("/ai/status")
def ai_status() -> dict:
    """A2 AI Status & Trust Panel summary."""
    from app.services import evidence as ev_svc

    db = SessionLocal()
    try:
        summary = ev_svc.ai_trust_summary(db, "PureGlow", days=30)
        return {
            "ok": True,
            "capabilities": {
                "llmConfigured": bool(settings.llm_api_key and settings.llm_base_url),
                "model": settings.llm_model,
                "embeddingModel": ev_svc._embedding_model_name() or "multilingual-e5-small",
                "promptVersion": ev_svc.PROMPT_VERSION,
            },
            "trust": summary,
        }
    finally:
        db.close()


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
    snippets.router,
    feedback.router,
    proofpass.router,
    crew.router,
    analytics.router,
):
    app.include_router(_router)

# Direct top-level alias routers matching exact prompt contracts
_publications_alias = APIRouter(prefix="/publications", tags=["publications"])
_publications_alias.add_api_route("", sentinel.mark_published, methods=["POST"])
_publications_alias.add_api_route("", sentinel.publications, methods=["GET"])
_publications_alias.add_api_route("/{publication_id}", sentinel.withdraw, methods=["DELETE"])
app.include_router(_publications_alias)

_notifications_alias = APIRouter(prefix="/notifications", tags=["notifications"])
_notifications_alias.add_api_route("", sentinel.notifications, methods=["GET"])
_notifications_alias.add_api_route("/unread-count", sentinel.unread, methods=["GET"])
_notifications_alias.add_api_route("/{notification_id}/read", sentinel.mark_read, methods=["POST"])
_notifications_alias.add_api_route("/read-all", sentinel.mark_all_read, methods=["POST"])
app.include_router(_notifications_alias)

# ProofPass alias router matching blueprint prompt
_proofpass_alias = APIRouter(prefix="/proofpass", tags=["proofpass"])
for route in proofpass.router.routes:
    rel_path = getattr(route, "path", "").replace("/passport", "") or "/"
    _proofpass_alias.add_api_route(
        rel_path,
        route.endpoint,
        methods=route.methods,
        response_model=getattr(route, "response_model", None),
        status_code=getattr(route, "status_code", None),
        tags=route.tags,
    )
app.include_router(_proofpass_alias)

# Canonical v1 router
app.include_router(canonical_v1.router)

# Agent Studio — root aliases (matching the rest of the app) and /api/v1.
app.include_router(agents_router.build_router(""))
app.include_router(agents_router.build_router("/api/v1"))



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
