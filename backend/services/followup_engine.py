"""Pure follow-up prediction & customer status logic (§19.3, §19.4).

No database access here — callers pass plain objects so the algorithm can be
unit-tested in isolation.
"""
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from statistics import median

from core import clock

RHYTHM_DAYS = {"weekly": 7, "every_2_weeks": 14, "monthly": 30}
HIDING_ACTIONS = ("done", "dismissed")


def product_key(product_id: str | None, product_name: str) -> str:
    if product_id:
        return product_id
    return "name:" + " ".join((product_name or "").split()).lower()


def follow_up_key(customer_id: str, product_id: str | None, product_name: str) -> str:
    return f"{customer_id}:{product_key(product_id, product_name)}"


def _round_half_up(x: float) -> int:
    return int(Decimal(str(x)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def median_gap_days(dates: list[date]) -> float | None:
    if len(dates) < 2:
        return None
    gaps = [(b - a).days for a, b in zip(dates, dates[1:])]
    return median(gaps)


@dataclass
class FollowUpPrediction:
    key: str
    customer_id: str
    product_id: str | None
    product_name: str
    status: str  # overdue | due_today | due_soon | upcoming
    last_purchase_at: datetime
    expected_at: date
    days_overdue: int | None
    days_until: int | None
    interval_days: int
    interval_source: str  # history | product | business_rhythm
    purchase_count: int
    confidence: float
    revenue: float = 0.0  # total spent on this product by this customer
    sales_count: int = 0


@dataclass
class _Pair:
    customer_id: str
    product_id: str | None
    names: list[tuple[datetime, str]] = field(default_factory=list)
    sold_at: list[datetime] = field(default_factory=list)
    revenue: float = 0.0


def compute_follow_ups(
    sales,            # iterable with .customer_id .product_id .product_name .sold_at .amount
    customers: dict,  # id -> obj with .archived_at
    products: dict,   # id -> obj with .repurchase_days .is_replenishable .name
    profile,          # obj with .sales_rhythm .custom_rhythm_days (or None)
    actions,          # iterable with .follow_up_key .action .created_at .snooze_until
    today: date,
    tz_name: str | None,
) -> list[FollowUpPrediction]:
    pairs: dict[str, _Pair] = {}
    for s in sales:
        if not s.customer_id:
            continue  # walk-in sales never produce follow-ups (R4)
        cust = customers.get(s.customer_id)
        if cust is None or cust.archived_at is not None:
            continue
        key = follow_up_key(s.customer_id, s.product_id, s.product_name)
        pair = pairs.setdefault(key, _Pair(s.customer_id, s.product_id))
        pair.sold_at.append(s.sold_at)
        pair.names.append((s.sold_at, s.product_name))
        pair.revenue += float(s.amount or 0)

    actions_by_key: dict[str, list] = {}
    for a in actions:
        actions_by_key.setdefault(a.follow_up_key, []).append(a)

    rhythm_days = None
    if profile is not None:
        if profile.sales_rhythm in RHYTHM_DAYS:
            rhythm_days = RHYTHM_DAYS[profile.sales_rhythm]
        elif profile.sales_rhythm == "custom" and profile.custom_rhythm_days:
            rhythm_days = profile.custom_rhythm_days

    out: list[FollowUpPrediction] = []
    for key, pair in pairs.items():
        product = products.get(pair.product_id) if pair.product_id else None
        # 3. one-time purchases never get follow-ups
        if product is not None and product.is_replenishable is False:
            continue

        # 1. distinct purchase days in the business timezone
        dates = sorted({clock.local_date(dt, tz_name) for dt in pair.sold_at})

        # 2. choose the interval
        gap = median_gap_days(dates)
        if gap is not None:
            interval = min(max(_round_half_up(gap), 3), 365)
            source = "history"
            confidence = min(0.95, 0.5 + 0.1 * (len(dates) - 1))
        elif product is not None and product.repurchase_days:
            interval, source, confidence = product.repurchase_days, "product", 0.5
        elif rhythm_days:
            interval, source, confidence = rhythm_days, "business_rhythm", 0.3
        else:
            continue

        # 4–5. expected date and status
        last_day = dates[-1]
        expected = last_day + timedelta(days=interval)
        delta = (expected - today).days
        if delta < 0:
            status = "overdue"
        elif delta == 0:
            status = "due_today"
        elif delta <= 3:
            status = "due_soon"
        elif delta <= 14:
            status = "upcoming"
        else:
            continue

        # 6. user actions taken after the latest purchase
        last_sold_at = max(pair.sold_at)
        hidden = False
        for a in actions_by_key.get(key, []):
            if a.created_at <= last_sold_at:
                continue  # a newer purchase resets earlier actions
            if a.action in HIDING_ACTIONS:
                hidden = True
            elif a.action == "snoozed" and a.snooze_until is not None:
                snooze_day = a.snooze_until.date() if isinstance(a.snooze_until, datetime) else a.snooze_until
                if snooze_day > today:
                    hidden = True
        if hidden:
            continue

        # 7. lapsed customers stop generating follow-ups
        days_overdue = -delta if delta < 0 else None
        if days_overdue is not None and days_overdue > max(3 * interval, 90):
            continue

        latest_name = max(pair.names, key=lambda x: x[0])[1]
        out.append(FollowUpPrediction(
            key=key,
            customer_id=pair.customer_id,
            product_id=pair.product_id,
            product_name=product.name if product is not None else latest_name,
            status=status,
            last_purchase_at=last_sold_at,
            expected_at=expected,
            days_overdue=days_overdue,
            days_until=None if delta < 0 else delta,
            interval_days=interval,
            interval_source=source,
            purchase_count=len(pair.sold_at),
            confidence=round(confidence, 2),
            revenue=clock.money(pair.revenue),
            sales_count=len(pair.sold_at),
        ))
    return out


STATUS_ORDER = {"overdue": 0, "due_today": 1, "due_soon": 1, "upcoming": 2}


def sort_follow_ups(items: list[FollowUpPrediction]) -> list[FollowUpPrediction]:
    """Overdue first by days_overdue desc; then due by expected_at asc (§13.1)."""
    return sorted(
        items,
        key=lambda i: (STATUS_ORDER[i.status], -(i.days_overdue or 0), i.expected_at, i.product_name.lower()),
    )


def customer_status(created_at: datetime, sold_at: list[datetime], has_overdue: bool, today: date, tz_name: str | None) -> str:
    """§19.4. `lapsed` uses max(90, 3 × typical interval), consistent with §19.3 step 7."""
    days_since_created = (today - clock.local_date(created_at, tz_name)).days if created_at else 999
    if not sold_at:
        return "new" if days_since_created < 14 else "lapsed"
    if days_since_created < 14 and len(sold_at) <= 1:
        return "new"
    dates = sorted({clock.local_date(dt, tz_name) for dt in sold_at})
    gap = median_gap_days(dates)
    interval = gap if gap is not None else 30
    days_since = (today - dates[-1]).days
    if days_since > max(90, 3 * interval):
        return "lapsed"
    if has_overdue:
        return "at_risk"
    if days_since <= max(1.5 * interval, 30):
        return "active"
    return "at_risk"
