from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from core import clock
from core.config import settings
from core.database import engine
from schemas.common import UTCDateTime
from services.gemini import gemini_service

router = APIRouter(tags=["Health"])


class HealthOut(BaseModel):
    status: str
    db: str
    ai: str
    version: str
    time: UTCDateTime


@router.get("/health", response_model=HealthOut)
async def health():
    """No auth. Never calls the AI provider — AI status comes from recent calls (§18)."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "db": db_status,
        "ai": gemini_service.status(),
        "version": settings.app_version,
        "time": clock.now(),
    }
