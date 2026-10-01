from datetime import datetime
from typing import Annotated, Generic, TypeVar

from pydantic import AfterValidator, BaseModel, BeforeValidator, Field, PlainSerializer, Strict

from core import clock
from core.errors import field_error

T = TypeVar("T")

# Serialised as ISO-8601 UTC with a trailing Z (§2.7).
UTCDateTime = Annotated[datetime, PlainSerializer(clock.iso, return_type=str)]


def _strip(v):
    return v.strip() if isinstance(v, str) else v


def _two_dp(v: float) -> float:
    if abs(round(v, 2) - v) > 1e-9:
        raise ValueError("Use at most 2 decimal places")
    return clock.money(v)


def _lower(v):
    return v.lower() if isinstance(v, str) else v


# Strict: real JSON numbers only ("4500" as a string is rejected, §8.3).
Price = Annotated[float, Strict(), Field(ge=0, le=100_000_000, allow_inf_nan=False), AfterValidator(_two_dp)]
# NUMERIC(14,2) holds up to 999,999,999,999.99 (§22.7)
Amount = Annotated[float, Strict(), Field(ge=0, le=999_999_999_999.99, allow_inf_nan=False), AfterValidator(_two_dp)]
Quantity = Annotated[int, Strict(), Field(ge=1, le=100_000)]
RepurchaseDays = Annotated[int, Strict(), Field(ge=1, le=365)]
Name80 = Annotated[str, BeforeValidator(_strip), Field(min_length=1, max_length=80)]
Name60 = Annotated[str, BeforeValidator(_strip), Field(min_length=1, max_length=60)]


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int


class PageParams:
    def __init__(self, limit: int, offset: int, q: str | None):
        self.limit = limit
        self.offset = offset
        self.q = q


def page_params(limit: int = 50, offset: int = 0, q: str | None = None) -> PageParams:
    """§2.8: clamp limit/offset instead of 422; trim q; max 100 chars."""
    limit = min(max(limit, 1), 200)
    offset = max(offset, 0)
    if q is not None:
        q = q.strip()
        if len(q) > 100:
            raise field_error(["query", "q"], "Search must be at most 100 characters")
        q = q or None
    return PageParams(limit, offset, q)


def check_sort(sort: str | None, allowed: set[str], default: str) -> str:
    sort = sort or default
    if sort not in allowed:
        raise field_error(["query", "sort"], f"Sort must be one of: {', '.join(sorted(allowed))}")
    return sort


class Message(BaseModel):
    message: str
