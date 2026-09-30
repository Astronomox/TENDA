"""Time helpers.

Convention: every datetime stored in the database is *naive UTC*. Business
calculations (today / this week / this month / per-day buckets) are done in the
user's timezone, which defaults to Africa/Lagos (§2.7).

Always call `clock.now()` through the module (not `from core.clock import now`)
so tests can freeze time by patching `core.clock.now`.
"""
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from functools import lru_cache
from zoneinfo import ZoneInfo

DEFAULT_TZ = "Africa/Lagos"


def now() -> datetime:
    """Current time as naive UTC."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


@lru_cache(maxsize=32)
def tz(name: str | None) -> ZoneInfo:
    return ZoneInfo(name or DEFAULT_TZ)


def to_utc_naive(dt: datetime) -> datetime:
    """Accept aware or naive datetimes; naive input is treated as UTC."""
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def to_local(dt: datetime, tz_name: str | None) -> datetime:
    return dt.replace(tzinfo=timezone.utc).astimezone(tz(tz_name))


def local_date(dt: datetime, tz_name: str | None) -> date:
    return to_local(dt, tz_name).date()


def today(tz_name: str | None) -> date:
    return local_date(now(), tz_name)


def local_midnight_utc(d: date, tz_name: str | None) -> datetime:
    """UTC instant of 00:00 local time on date `d`."""
    local = datetime.combine(d, time.min, tzinfo=tz(tz_name))
    return local.astimezone(timezone.utc).replace(tzinfo=None)


def day_range_utc(start: date, end_inclusive: date, tz_name: str | None) -> tuple[datetime, datetime]:
    """[start 00:00, end+1 00:00) in UTC — i.e. both dates inclusive."""
    return local_midnight_utc(start, tz_name), local_midnight_utc(end_inclusive + timedelta(days=1), tz_name)


def week_start(d: date) -> date:
    """Monday of the ISO week containing d."""
    return d - timedelta(days=d.weekday())


def month_start(d: date) -> date:
    return d.replace(day=1)


def add_months(d: date, months: int) -> date:
    """First day of the month `months` away from d's month."""
    idx = d.year * 12 + (d.month - 1) + months
    return date(idx // 12, idx % 12 + 1, 1)


def iso(dt: datetime | None) -> str | None:
    """ISO-8601 UTC with Z, second precision (§2.7)."""
    if dt is None:
        return None
    dt = to_utc_naive(dt)
    return dt.replace(microsecond=0).isoformat() + "Z"


def money(value) -> float:
    """Round half-up to 2 dp (§22.8)."""
    if value is None:
        return 0.0
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def growth_pct(current: float, previous: float) -> float | None:
    """§19.1 — null when previous is 0, never 100."""
    if not previous:
        return None
    return round((current - previous) / previous * 100, 1)
