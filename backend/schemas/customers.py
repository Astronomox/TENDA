from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, TypeAdapter, field_validator, model_validator

from core.phone import normalize_phone
from schemas.common import Name80, UTCDateTime

CustomerStatus = Literal["new", "active", "at_risk", "lapsed"]
_email = TypeAdapter(EmailStr)


def _blank_to_none(v):
    if isinstance(v, str) and not v.strip():
        return None
    return v


class _ContactFields(BaseModel):
    @field_validator("phone", mode="before", check_fields=False)
    @classmethod
    def _phone(cls, v):
        v = _blank_to_none(v)
        if v is None:
            return None
        if not isinstance(v, str):
            raise ValueError("Enter a valid phone number")
        return normalize_phone(v)

    @field_validator("email", mode="before", check_fields=False)
    @classmethod
    def _email(cls, v):
        v = _blank_to_none(v)
        if v is None:
            return None
        if not isinstance(v, str) or len(v.strip()) > 254:
            raise ValueError("Enter a valid email address")
        try:
            return _email.validate_python(v.strip()).lower()
        except Exception:
            raise ValueError("Enter a valid email address")

    @field_validator("note", mode="before", check_fields=False)
    @classmethod
    def _note(cls, v):
        return _blank_to_none(v)


class CustomerIn(_ContactFields):
    name: Name80
    phone: Optional[str] = None
    email: Optional[str] = None
    note: Optional[str] = Field(None, max_length=500)


class CustomerUpdate(_ContactFields):
    name: Optional[Name80] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    note: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def _name_not_null(self):
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("Name can't be empty")
        return self


class CustomerOut(BaseModel):
    id: str
    name: str
    phone: Optional[str]
    email: Optional[str]
    note: Optional[str]
    created_at: UTCDateTime
    updated_at: UTCDateTime
    total_spent: float
    purchase_count: int
    last_purchase_at: Optional[UTCDateTime]
    status: CustomerStatus


class CustomerStats(BaseModel):
    total_spent: float
    purchase_count: int
    units_purchased: int
    average_order_value: float
    first_purchase_at: Optional[UTCDateTime]
    last_purchase_at: Optional[UTCDateTime]
    days_since_last_purchase: Optional[int]


class MonthRevenue(BaseModel):
    month: str
    revenue: float


class CustomerTopProduct(BaseModel):
    product_id: Optional[str]
    product_name: str
    units: int
    revenue: float
    last_purchased_at: UTCDateTime


class Activity(BaseModel):
    type: Literal["sale", "follow_up_done", "customer_created"]
    sale_id: Optional[str] = None
    label: str
    amount: Optional[float] = None
    at: UTCDateTime


class NextFollowUp(BaseModel):
    product_name: str
    expected_at: str
    status: Literal["overdue", "due_today", "due_soon", "upcoming"]


class CustomerDetail(BaseModel):
    id: str
    name: str
    phone: Optional[str]
    email: Optional[str]
    note: Optional[str]
    created_at: UTCDateTime
    updated_at: UTCDateTime
    status: CustomerStatus
    stats: CustomerStats
    revenue_by_month: list[MonthRevenue]
    top_products: list[CustomerTopProduct]
    recent_activity: list[Activity]
    next_follow_up: Optional[NextFollowUp]
