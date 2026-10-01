from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.errors import field_error
from models.user import User
from services.auth_service import get_current_user
from services import analytics_service
from schemas.analytics import BusinessSummary, Dashboard, Interval, ProductBreakdown, Range, Timeseries

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary", response_model=BusinessSummary, response_model_by_alias=True)
async def fetch_summary(
    date_from: Optional[date] = Query(None, alias="from"),
    date_to: Optional[date] = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if date_from and date_to and date_from > date_to:
        raise field_error(["query", "from"], "'from' must be on or before 'to'")
    # Fetch real calculations from our service layer
    return await analytics_service.summary(db, current_user, date_from, date_to)


@router.get("/dashboard", response_model=Dashboard)
async def fetch_dashboard(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await analytics_service.dashboard(db, current_user)


@router.get("/timeseries", response_model=Timeseries)
async def fetch_timeseries(
    range: Range = "30d",
    interval: Optional[Interval] = None,
    customer_id: Optional[str] = None,
    product_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.timeseries(db, current_user, range, interval, customer_id, product_id)


@router.get("/products", response_model=ProductBreakdown)
async def fetch_products(
    range: Range = "30d",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.products_breakdown(db, current_user, range)
