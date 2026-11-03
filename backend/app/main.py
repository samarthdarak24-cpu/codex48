"""Precedent FastAPI application.

Wires canonical `/api/v1` routers as well as root-mounted legacy endpoints.
Configures CORS, Request ID middleware, and structured error handling.
"""
import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db import init_db, SessionLocal
from app.errors import AppException, format_error_response
from app.routers import (
    assets,
    audit,
    auth,
    canonical_v1,
    claims,
    exceptions,
    guidelines,
    rules,
    simulations,
    submissions,
    team,
    agents as agents_router,
    agent_runs as agent_runs_router,
    agent_tools as agent_tools_router,
    assistant as assistant_router,
)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/docs/openapi.json",
)

# CORS Middleware (supports explicit origins, wildcard, and cloud deployment domains)
_cors_origins = settings.cors_origin_list
if "*" in _cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://.*$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.onrender\.com|.*\.vercel\.app)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """Attaches a unique X-Request-ID to each incoming request."""
    req_id = request.headers.get("X-Request-ID") or f"req-{uuid.uuid4().hex[:12]}"
    request.state.request_id = req_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = req_id
    return response


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    req_id = getattr(request.state, "request_id", "")
    return format_error_response(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
        request_id=req_id,
    )


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    """Liveness probe."""
    return {"status": "ok", "app": settings.app_name}


@app.get("/ready")
def readiness() -> dict:
    """Readiness probe checking database connectivity."""
    db = SessionLocal()
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "app": settings.app_name,
            "database": "connected",
            "storage": "local",
        }
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "unavailable", "error": str(e)})
    finally:
        db.close()


# Mount Canonical API v1 router
app.include_router(canonical_v1.router)
app.include_router(agents_router.router)
app.include_router(agent_runs_router.router)
app.include_router(agent_tools_router.router)
app.include_router(assistant_router.router)

# Mount Legacy Root Routers for 100% frontend and test backwards compatibility
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
):
    app.include_router(_router)
