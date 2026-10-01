import logging
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command as alembic_command
from alembic.config import Config as AlembicConfig
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models  # noqa: F401  (registers every table on Base.metadata)
from core.config import settings
from core.database import engine, Base
from core.errors import register_exception_handlers
from core.logging import configure_logging
from core.middleware import RequestContextMiddleware
from core.migrations import run_migrations
from routers import (
    ai, analytics, auth, business, customers, followups, health, insights, notifications,
    products, sales, templates, voice,
)

configure_logging()
logger = logging.getLogger("tenda")
ROOT = Path(__file__).resolve().parent


def _alembic_upgrade(sync_conn) -> None:
    cfg = AlembicConfig(str(ROOT / "alembic.ini"))
    cfg.attributes["connection"] = sync_conn
    alembic_command.upgrade(cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    problems = settings.startup_problems()
    if problems and settings.is_production:
        # Fail fast: refusing to start beats signing tokens with a guessable
        # secret or writing customer data to a disk that gets wiped.
        raise RuntimeError("Unsafe production configuration: " + "; ".join(problems))
    for problem in problems:
        logger.warning(problem)

    async with engine.begin() as conn:
        if settings.is_sqlite:
            # Local development: create tables + idempotent SQLite data migrations
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(run_migrations)
        else:
            # Postgres: versioned migrations (alembic/versions)
            await conn.run_sync(_alembic_upgrade)
    yield
    await engine.dispose()

app = FastAPI(
    title="TENDA",
    description="Customer Intelligence Platform for Small Businesses",
    version=settings.app_version,
    lifespan=lifespan
)

register_exception_handlers(app)

# Order matters: the last middleware added is the outermost. CORS must wrap the
# request-context middleware so even 500s carry Access-Control-* headers (§3.2).
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    # Vercel preview deployments: https://tenda-<hash>-<team>.vercel.app
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=False,  # Bearer tokens, not cookies
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "Accept", "X-Request-ID"],
    expose_headers=["Retry-After", "X-Request-ID"],
    max_age=600,
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(business.router)
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(sales.router)
app.include_router(voice.router)
app.include_router(analytics.router)
app.include_router(followups.router)
app.include_router(insights.router)
app.include_router(ai.router)
app.include_router(notifications.router)
app.include_router(templates.router)

@app.get("/", include_in_schema=False)
async def root():
    return {"message": "Welcome to the TENDA API"}
