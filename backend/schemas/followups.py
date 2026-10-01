from typing import Literal, Optional

from pydantic import BaseModel, Field, Strict
from typing_extensions import Annotated

from schemas.common import UTCDateTime


class FollowUpCustomer(BaseModel):
    id: str
    name: str
    phone: Optional[str]
    email: Optional[str]


class FollowUpProduct(BaseModel):
    id: Optional[str]
    name: str


class FollowUpItem(BaseModel):
    key: str
    customer: FollowUpCustomer
    product: FollowUpProduct
    status: Literal["overdue", "due_today", "due_soon", "upcoming"]
    last_purchase_at: UTCDateTime
    expected_at: str
    days_overdue: Optional[int]
    days_until: Optional[int]
    interval_days: int
    interval_source: Literal["history", "product", "business_rhythm"]
    purchase_count: int
    confidence: float
    suggested_message: str
    whatsapp_url: Optional[str]
    tel_url: Optional[str]


class FollowUpCounts(BaseModel):
    overdue: int
    due_today: int
    due_soon: int
    upcoming: int


class FollowUpList(BaseModel):
    items: list[FollowUpItem]
    total: int
    limit: int
    offset: int
    counts: FollowUpCounts


class DoneIn(BaseModel):
    channel: Literal["whatsapp", "phone", "in_person", "other"] = "other"


class SnoozeIn(BaseModel):
    days: Annotated[int, Strict(), Field(ge=1, le=30)]


class FollowUpActionOut(BaseModel):
    key: str
    action: Literal["done", "snoozed", "dismissed"]
    channel: Optional[str] = None
    snooze_until: Optional[str] = None
    created_at: UTCDateTime
