"""Analytics (§12). All buckets are computed in the user's timezone (§2.7)."""
from datetime import date, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from core import clock
from core.errors import not_found
from models import Customer, Product, User
from services.followup_engine import product_key
from services.userdata import UserData, load_user_data

RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90}
DEFAULT_INTERVAL = {"7d": "day", "30d": "day", "90d": "week", "12m": "month"}


# --- helpers ---------------------------------------------------------------

def between(sales, start: datetime | None, end: datetime | None):
    return [s for s in sales if (start is None or s.sold_at >= start) and (end is None or s.sold_at < end)]


def totals(sales) -> dict:
    return {
        "revenue": clock.money(sum(float(s.amount) for s in sales)),
        "transactions": len(sales),
        "units": sum(s.quantity for s in sales),
    }


def group_products(sales, products: dict) -> list[dict]:
    """Group by product_id when present, else lower(trim(product_name)) (§12.1, §22.19)."""
    groups: dict[str, dict] = {}
    for s in sales:
        key = product_key(s.product_id, s.product_name)
        g = groups.setdefault(key, {"key": key, "product_id": s.product_id, "product_name": s.product_name,
                                    "quantity": 0, "revenue": 0.0, "_latest": s.sold_at})
        g["quantity"] += s.quantity
        g["revenue"] += float(s.amount)
        if s.sold_at >= g["_latest"]:
            g["_latest"] = s.sold_at
            g["product_name"] = s.product_name
    for g in groups.values():
        if g["product_id"] and g["product_id"] in products:
            g["product_name"] = products[g["product_id"]].name
        g["revenue"] = clock.money(g["revenue"])
        g.pop("_latest")
    return sorted(groups.values(), key=lambda g: (-g["revenue"], -g["quantity"], g["product_name"].lower()))


def period_bounds(today: date, tz_name: str) -> dict[str, tuple[datetime, datetime]]:
    """§19.2 periods as [start, end) UTC instants."""
    mid = lambda d: clock.local_midnight_utc(d, tz_name)  # noqa: E731
    tomorrow = today + timedelta(days=1)
    wk = clock.week_start(today)
    mo = clock.month_start(today)
    return {
        "today": (mid(today), mid(tomorrow)),
        "this_week": (mid(wk), mid(tomorrow)),
        "last_week": (mid(wk - timedelta(days=7)), mid(wk)),
        "this_month": (mid(mo), mid(tomorrow)),
        "last_month": (mid(clock.add_months(mo, -1)), mid(mo)),
    }


def range_bounds(range_: str, today: date, tz_name: str):
    """Returns (start_date, end_date_exclusive, prev_start_date)."""
    if range_ == "12m":
        start = clock.add_months(clock.month_start(today), -11)
        end = clock.add_months(clock.month_start(today), 1)
        return start, end, clock.add_months(start, -12)
    n = RANGE_DAYS[range_]
    start = today - timedelta(days=n - 1)
    return start, today + timedelta(days=1), start - timedelta(days=n)


def _bucket_starts(start: date, end: date, interval: str) -> list[date]:
    out = []
    if interval == "day":
        d = start
        while d < end:
            out.append(d)
            d += timedelta(days=1)
    elif interval == "week":
        d = clock.week_start(start)
        while d < end:
            out.append(d)
            d += timedelta(days=7)
    else:
        d = clock.month_start(start)
        while d < end:
            out.append(d)
            d = clock.add_months(d, 1)
    return out


def _bucket_of(d: date, interval: str) -> date:
    if interval == "day":
        return d
    if interval == "week":
        return clock.week_start(d)
    return clock.month_start(d)


def _label(d: date, interval: str) -> str:
    if interval == "day":
        return d.strftime("%a")
    if interval == "week":
        return f"{d.strftime('%b')} {d.day}"
    return d.strftime("%b")


# --- endpoints -------------------------------------------------------------

async def summary(db: AsyncSession, user: User, date_from: date | None, date_to: date | None) -> dict:
    data = await load_user_data(db, user)
    start = clock.local_midnight_utc(date_from, data.tz) if date_from else None
    end = clock.local_midnight_utc(date_to + timedelta(days=1), data.tz) if date_to else None
    sales = between(data.sales, start, end)
    t = totals(sales)
    top = group_products(sales, data.products)[:10]
    return {
        "currency": "NGN",
        "from": date_from.isoformat() if date_from else None,
        "to": date_to.isoformat() if date_to else None,
        "total_revenue": t["revenue"],
        "total_transactions": t["transactions"],
        "total_units": t["units"],
        "unique_customers": len({s.customer_id for s in sales if s.customer_id}),
        "average_order_value": round(t["revenue"] / t["transactions"], 2) if t["transactions"] else 0.0,
        "top_products": [
            {
                "product_name": g["product_name"],
                "product_id": g["product_id"],
                "total_quantity": g["quantity"],
                "total_revenue": g["revenue"],
                "share_of_revenue": round(g["revenue"] / t["revenue"], 4) if t["revenue"] else 0.0,
            }
            for g in top
        ],
    }


def dashboard_from(data: UserData, customer_statuses: dict, follow_up_counts: dict) -> dict:
    p = period_bounds(data.today, data.tz)
    sales = data.sales
    rev = {name: totals(between(sales, *bounds))["revenue"] for name, bounds in p.items()}
    tx = {name: len(between(sales, *p[name])) for name in ("today", "this_week", "this_month")}
    all_time = totals(sales)
    month_start_utc = p["this_month"][0]
    active_customers = data.active_customers()
    top = group_products(sales, data.products)
    return {
        "currency": "NGN",
        "timezone": data.tz,
        "generated_at": clock.now(),
        "revenue": {**rev, "all_time": all_time["revenue"]},
        "transactions": {**tx, "all_time": all_time["transactions"]},
        "growth": {
            "month_over_month_pct": clock.growth_pct(rev["this_month"], rev["last_month"]),
            "week_over_week_pct": clock.growth_pct(rev["this_week"], rev["last_week"]),
        },
        "customers": {
            "total": len(active_customers),
            "new_this_month": sum(1 for c in active_customers if c.created_at >= month_start_utc),
            "at_risk": sum(1 for c in active_customers if customer_statuses.get(c.id) == "at_risk"),
        },
        "follow_ups": {
            "overdue": follow_up_counts["overdue"],
            "due_today": follow_up_counts["due_today"],
            "due_soon": follow_up_counts["due_soon"],
        },
        "top_product": {"product_name": top[0]["product_name"], "total_revenue": top[0]["revenue"]} if top else None,
    }


async def dashboard(db: AsyncSession, user: User) -> dict:
    from services.customer_service import statuses
    from services.followup_service import counts, predictions

    data = await load_user_data(db, user)
    return dashboard_from(data, statuses(data), counts(predictions(data)))


def timeseries_from(data: UserData, range_: str, interval: str, sales=None) -> dict:
    sales = data.sales if sales is None else sales
    start, end, prev_start = range_bounds(range_, data.today, data.tz)
    mid = lambda d: clock.local_midnight_utc(d, data.tz)  # noqa: E731
    current = between(sales, mid(start), mid(end))
    previous = between(sales, mid(prev_start), mid(start))

    buckets = {b: {"revenue": 0.0, "transactions": 0, "units": 0} for b in _bucket_starts(start, end, interval)}
    for s in current:
        b = buckets.get(_bucket_of(clock.local_date(s.sold_at, data.tz), interval))
        if b is not None:
            b["revenue"] += float(s.amount)
            b["transactions"] += 1
            b["units"] += s.quantity
    points = [
        {"start": d.isoformat(), "label": _label(d, interval), "revenue": clock.money(v["revenue"]),
         "transactions": v["transactions"], "units": v["units"]}
        for d, v in buckets.items()
    ]
    cur, prev = totals(current), totals(previous)
    best = max(points, key=lambda pt: pt["revenue"]) if points else None
    return {
        "range": range_,
        "interval": interval,
        "currency": "NGN",
        "points": points,
        "totals": cur,
        "previous_period_totals": prev,
        "change_pct": clock.growth_pct(cur["revenue"], prev["revenue"]),
        "average_per_interval": round(cur["revenue"] / len(points), 2) if points else 0.0,
        "best_interval": (
            {"start": best["start"], "label": best["label"], "revenue": best["revenue"]}
            if best and best["revenue"] > 0 else None
        ),
    }


async def timeseries(db: AsyncSession, user: User, range_: str, interval: str | None,
                     customer_id: str | None, product_id: str | None) -> dict:
    data = await load_user_data(db, user)
    sales = data.sales
    if customer_id:
        c = await db.get(Customer, customer_id)
        if c is None or c.user_id != user.id:
            raise not_found("Customer")
        sales = [s for s in sales if s.customer_id == customer_id]
    if product_id:
        p = await db.get(Product, product_id)
        if p is None or p.user_id != user.id:
            raise not_found("Product")
        sales = [s for s in sales if s.product_id == product_id]
    return timeseries_from(data, range_, interval or DEFAULT_INTERVAL[range_], sales)


def products_breakdown_from(data: UserData, range_: str) -> dict:
    start, end, prev_start = range_bounds(range_, data.today, data.tz)
    mid = lambda d: clock.local_midnight_utc(d, data.tz)  # noqa: E731
    current = group_products(between(data.sales, mid(start), mid(end)), data.products)
    previous = {g["key"]: g["revenue"] for g in group_products(between(data.sales, mid(prev_start), mid(start)), data.products)}
    total = clock.money(sum(g["revenue"] for g in current))

    def row(product_id, name, units, revenue, prev_revenue):
        return {
            "product_id": product_id,
            "product_name": name,
            "units": units,
            "revenue": clock.money(revenue),
            "share_of_revenue": round(revenue / total, 4) if total else 0.0,
            "change_pct": clock.growth_pct(revenue, prev_revenue),
        }

    items = [row(g["product_id"], g["product_name"], g["quantity"], g["revenue"], previous.get(g["key"], 0)) for g in current[:10]]
    rest = current[10:]
    if rest:
        items.append(row(
            None, "Other", sum(g["quantity"] for g in rest), sum(g["revenue"] for g in rest),
            sum(previous.get(g["key"], 0) for g in rest),
        ))
    return {"range": range_, "currency": "NGN", "items": items, "total_revenue": total}


async def products_breakdown(db: AsyncSession, user: User, range_: str) -> dict:
    return products_breakdown_from(await load_user_data(db, user), range_)
