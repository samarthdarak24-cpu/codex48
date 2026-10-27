"""Precedent FastAPI application.

Wires every domain router, configures CORS for the Vite dev origin, and ensures
tables exist on startup. (Seeding is a separate, explicit step: `python seed.py`.)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db
from app.routers import (
    assets,
    audit,
    auth,
    claims,
    exceptions,
    guidelines,
    rules,
    sentinel,
    simulations,
    submissions,
    team,
)

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "app": settings.app_name}


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
    sentinel.router,
):
    app.include_router(_router)
