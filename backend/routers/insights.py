from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User
from schemas.common import UTCDateTime
from services import insight_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/insights", tags=["Insights"])

InsightRange = Literal["7d", "30d", "90d"]


class Supporting(BaseModel):
    label: str
    value: str
    sub: Optional[str]


class Insight(BaseModel):
    id: str
    category: Literal["revenue", "customers", "sales", "risk", "growth"]
    priority: Literal["high", "medium", "low"]
    title: str
    summary: str
    trend: Literal["up", "down", "neutral"]
    trend_value: str
    confidence: int
    cta_label: Optional[str]
    cta_route: Optional[str]
    supporting: list[Supporting]


class Recommendation(BaseModel):
    id: str
    priority: Literal["urgent", "high", "normal"]
    impact: Literal["high", "medium", "low"]
    title: str
    description: str
    action_label: str
    action_route: str
    estimated_gain: Optional[str]


class Narrative(BaseModel):
    text: str
    generated_at: UTCDateTime


class DataSource(BaseModel):
    name: str
    record_count: int
    last_updated_at: Optional[UTCDateTime]
    status: str


class DataQuality(BaseModel):
    score: int
    issues: list[str]


class BasedOn(BaseModel):
    customers: int
    transactions: int
    products: int


class InsightsOut(BaseModel):
    range: InsightRange
    generated_at: UTCDateTime
    based_on: BasedOn
    insights: list[Insight]
    recommendations: list[Recommendation]
    ai_narrative: Optional[Narrative]
    data_sources: list[DataSource]
    data_quality: DataQuality


@router.get("", response_model=InsightsOut)
async def get_insights(range: InsightRange = "30d", current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await insight_service.get_insights(db, current_user, range)


@router.post("/refresh", response_model=InsightsOut)
async def refresh_insights(range: InsightRange = "30d", current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await insight_service.refresh(db, current_user, range)
