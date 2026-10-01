from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from schemas.common import UTCDateTime

Range = Literal["7d", "30d", "90d", "12m"]
Interval = Literal["day", "week", "month"]


class TopProduct(BaseModel):
    product_name: str
    product_id: Optional[str] = None
    total_quantity: int
    total_revenue: float
    share_of_revenue: float = 0.0


class BusinessSummary(BaseModel):
    # Original fields — unchanged for backward compatibility
    total_revenue: float
    total_transactions: int
    top_products: List[TopProduct]
    # Added in §12.1
    currency: str = "NGN"
    from_: Optional[str] = Field(None, alias="from")
    to: Optional[str] = None
    total_units: int = 0
    unique_customers: int = 0
    average_order_value: float = 0.0

    model_config = {"populate_by_name": True}


class RevenuePeriods(BaseModel):
    today: float
    this_week: float
    last_week: float
    this_month: float
    last_month: float
    all_time: float


class TransactionPeriods(BaseModel):
    today: int
    this_week: int
    this_month: int
    all_time: int


class Growth(BaseModel):
    month_over_month_pct: Optional[float]
    week_over_week_pct: Optional[float]


class DashboardCustomers(BaseModel):
    total: int
    new_this_month: int
    at_risk: int


class DashboardFollowUps(BaseModel):
    overdue: int
    due_today: int
    due_soon: int


class DashboardTopProduct(BaseModel):
    product_name: str
    total_revenue: float


class Dashboard(BaseModel):
    currency: str
    timezone: str
    generated_at: UTCDateTime
    revenue: RevenuePeriods
    transactions: TransactionPeriods
    growth: Growth
    customers: DashboardCustomers
    follow_ups: DashboardFollowUps
    top_product: Optional[DashboardTopProduct]


class SeriesPoint(BaseModel):
    start: str
    label: str
    revenue: float
    transactions: int
    units: int


class SeriesTotals(BaseModel):
    revenue: float
    transactions: int
    units: int


class BestInterval(BaseModel):
    start: str
    label: str
    revenue: float


class Timeseries(BaseModel):
    range: Range
    interval: Interval
    currency: str
    points: list[SeriesPoint]
    totals: SeriesTotals
    previous_period_totals: SeriesTotals
    change_pct: Optional[float]
    average_per_interval: float
    best_interval: Optional[BestInterval]


class ProductBreakdownItem(BaseModel):
    product_id: Optional[str]
    product_name: str
    units: int
    revenue: float
    share_of_revenue: float
    change_pct: Optional[float]


class ProductBreakdown(BaseModel):
    range: Range
    currency: str
    items: list[ProductBreakdownItem]
    total_revenue: float
