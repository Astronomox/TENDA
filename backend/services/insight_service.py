"""Rule-based insights (§14). Every number here comes from a query over the
user's own data — nothing is invented. The optional AI narrative is the only
model-generated text and is produced on POST /insights/refresh."""
import json
from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession

from core import clock, ratelimit
from core.errors import AppError
from models import User
from services import analytics_service as an
from services.ai_context import SYSTEM_PROMPT
from services.followup_service import predictions
from services.gemini import gemini_service
from services.userdata import UserData, load_user_data

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}
RANGE_LABEL = {"7d": "7 days", "30d": "30 days", "90d": "90 days"}

# (user_id, range) -> {"text", "generated_at"}
_narratives: dict[tuple[int, str], dict] = {}


def naira(x: float) -> str:
    return f"₦{x:,.0f}"


def pct_text(p: float | None) -> str:
    if p is None:
        return "new"
    return f"{'+' if p > 0 else ''}{p:g}%"


def confidence(sample_size: int, days_of_data: int) -> int:
    """§19.5"""
    return int(min(95, 40 + 5 * min(sample_size, 10) + 5 * min(days_of_data / 7, 3)))


def _trend(p: float | None) -> str:
    if p is None or p == 0:
        return "neutral"
    return "up" if p > 0 else "down"


def build(data: UserData, range_: str) -> dict:
    today, tz = data.today, data.tz
    start, end, prev_start = an.range_bounds(range_, today, tz)
    mid = lambda d: clock.local_midnight_utc(d, tz)  # noqa: E731
    cur = an.between(data.sales, mid(start), mid(end))
    prev = an.between(data.sales, mid(prev_start), mid(start))
    label = RANGE_LABEL[range_]

    first_sale = min((s.sold_at for s in data.sales), default=None)
    days_of_data = (today - clock.local_date(first_sale, tz)).days + 1 if first_sale else 0
    cur_t, prev_t = an.totals(cur), an.totals(prev)
    preds = predictions(data)
    overdue = [p for p in preds if p.status == "overdue"]

    weekday_rev: dict[int, float] = defaultdict(float)
    for s in cur:
        weekday_rev[clock.local_date(s.sold_at, tz).weekday()] += float(s.amount)
    best_wd = max(weekday_rev.items(), key=lambda kv: kv[1]) if weekday_rev else None
    WD = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    insights = []

    # revenue_trend
    if len(cur) >= 5 and len(prev) >= 5:
        p = clock.growth_pct(cur_t["revenue"], prev_t["revenue"])
        aov_c = cur_t["revenue"] / cur_t["transactions"]
        aov_p = prev_t["revenue"] / prev_t["transactions"]
        direction = "up" if p >= 0 else "down"
        summary = f"You made {naira(cur_t['revenue'])} in the last {label}, {direction} from {naira(prev_t['revenue'])}."
        if best_wd:
            summary += f" {WD[best_wd[0]]}s are your strongest day."
        supporting = [
            {"label": "Revenue", "value": naira(cur_t["revenue"]), "sub": f"{pct_text(p)} vs previous"},
            {"label": "Transactions", "value": str(cur_t["transactions"]), "sub": "this period"},
            {"label": "Avg order value", "value": naira(aov_c), "sub": pct_text(clock.growth_pct(aov_c, aov_p))},
        ]
        if best_wd:
            supporting.append({"label": "Best day", "value": WD[best_wd[0]], "sub": naira(best_wd[1])})
        insights.append({
            "id": "revenue_trend", "category": "revenue",
            "priority": "high" if abs(p) >= 20 else "medium" if abs(p) >= 5 else "low",
            "title": f"Revenue {direction} {abs(p):g}% vs previous {label}",
            "summary": summary, "trend": _trend(p), "trend_value": pct_text(p),
            "confidence": confidence(len(cur) + len(prev), days_of_data),
            "cta_label": "View sales", "cta_route": "/sales", "supporting": supporting,
        })

    # best_day
    if days_of_data >= 14 and len(cur) >= 10 and best_wd:
        share = round(best_wd[1] / cur_t["revenue"] * 100) if cur_t["revenue"] else 0
        ranked = sorted(weekday_rev.items(), key=lambda kv: -kv[1])[:3]
        insights.append({
            "id": "best_day", "category": "sales", "priority": "low",
            "title": f"{WD[best_wd[0]]} is your strongest day",
            "summary": f"{WD[best_wd[0]]}s brought in {naira(best_wd[1])} ({share}% of revenue) in the last {label}.",
            "trend": "neutral", "trend_value": f"{share}%",
            "confidence": confidence(len(cur), days_of_data),
            "cta_label": None, "cta_route": None,
            "supporting": [{"label": WD[d], "value": naira(v), "sub": None} for d, v in ranked],
        })

    cur_products = an.group_products(cur, data.products)
    prev_products = {g["key"]: g for g in an.group_products(prev, data.products)}

    # top_product_concentration — only meaningful when there is more than one
    # product to compare against (a one-product business is always "100%")
    if len(cur_products) > 1 and cur_t["revenue"] > 0:
        top = cur_products[0]
        share = top["revenue"] / cur_t["revenue"]
        if share > 0.5:
            pct = round(share * 100)
            insights.append({
                "id": "top_product_concentration", "category": "risk", "priority": "medium",
                "title": f"{top['product_name']} makes {pct}% of your revenue",
                "summary": f"{top['product_name']} brought in {naira(top['revenue'])} of {naira(cur_t['revenue'])} in the last {label}. "
                           "Relying on one product is risky if supply or demand changes.",
                "trend": "neutral", "trend_value": f"{pct}%",
                "confidence": confidence(len(cur), days_of_data),
                "cta_label": "View products", "cta_route": "/settings",
                "supporting": [{"label": g["product_name"], "value": naira(g["revenue"]), "sub": f"{g['quantity']} units"} for g in cur_products[:4]],
            })

    # rising / declining products
    rising, declining = None, None
    for g in cur_products:
        prev_rev = prev_products.get(g["key"], {}).get("revenue", 0)
        change = clock.growth_pct(g["revenue"], prev_rev)
        if change is not None and change >= 30 and g["revenue"] >= 10_000 and (rising is None or change > rising[1]):
            rising = (g, change, prev_rev)
    for key, pg in prev_products.items():
        cur_rev = next((g["revenue"] for g in cur_products if g["key"] == key), 0.0)
        change = clock.growth_pct(cur_rev, pg["revenue"])
        if change is not None and change <= -30 and pg["revenue"] >= 10_000 and (declining is None or change < declining[1]):
            declining = (pg, change, cur_rev)
    if rising:
        g, change, prev_rev = rising
        insights.append({
            "id": "rising_product", "category": "growth", "priority": "medium",
            "title": f"{g['product_name']} sales are rising",
            "summary": f"{g['product_name']} made {naira(g['revenue'])} in the last {label}, up {change:g}% from {naira(prev_rev)}.",
            "trend": "up", "trend_value": pct_text(change),
            "confidence": confidence(len(cur), days_of_data),
            "cta_label": None, "cta_route": None,
            "supporting": [{"label": "This period", "value": naira(g["revenue"]), "sub": f"{g['quantity']} units"},
                           {"label": "Previous", "value": naira(prev_rev), "sub": None}],
        })
    if declining:
        pg, change, cur_rev = declining
        insights.append({
            "id": "declining_product", "category": "risk", "priority": "high" if change <= -50 else "medium",
            "title": f"{pg['product_name']} sales dropped {abs(change):g}%",
            "summary": f"{pg['product_name']} made {naira(cur_rev)} in the last {label}, down from {naira(pg['revenue'])}.",
            "trend": "down", "trend_value": pct_text(change),
            "confidence": confidence(len(prev), days_of_data),
            "cta_label": None, "cta_route": None,
            "supporting": [{"label": "This period", "value": naira(cur_rev), "sub": None},
                           {"label": "Previous", "value": naira(pg["revenue"]), "sub": f"{pg['quantity']} units"}],
        })

    # overdue_customers
    overdue_customers = list(dict.fromkeys(p.customer_id for p in overdue))
    if overdue_customers:
        n = len(overdue_customers)
        names = [data.customers[c].name for c in overdue_customers]
        insights.append({
            "id": "overdue_customers", "category": "customers", "priority": "high" if n >= 3 else "medium",
            "title": f"{n} customer{'s are' if n != 1 else ' is'} due to reorder",
            "summary": f"{', '.join(names[:3])}{' and others' if n > 3 else ''} usually buy again by now.",
            "trend": "neutral", "trend_value": str(n),
            "confidence": confidence(sum(p.sales_count for p in overdue), days_of_data),
            "cta_label": "Go to Follow-ups", "cta_route": "/follow-up",
            "supporting": [{"label": data.customers[p.customer_id].name, "value": p.product_name,
                            "sub": f"{p.days_overdue} days overdue"} for p in overdue[:4]],
        })

    # repeat_rate (all-time)
    per_customer = defaultdict(int)
    for s in data.sales:
        if s.customer_id:
            per_customer[s.customer_id] += 1
    if len(per_customer) >= 10:
        repeaters = sum(1 for n in per_customer.values() if n > 1)
        pct = round(repeaters / len(per_customer) * 100)
        insights.append({
            "id": "repeat_rate", "category": "customers", "priority": "low" if pct >= 40 else "medium",
            "title": f"{pct}% of customers bought more than once",
            "summary": f"{repeaters} of your {len(per_customer)} customers with sales have come back to buy again.",
            "trend": "neutral", "trend_value": f"{pct}%",
            "confidence": confidence(sum(per_customer.values()), days_of_data),
            "cta_label": "View customers", "cta_route": "/customers",
            "supporting": [{"label": "Repeat customers", "value": str(repeaters), "sub": None},
                           {"label": "One-time customers", "value": str(len(per_customer) - repeaters), "sub": None}],
        })

    # new_customers
    new_in_range = [c for c in data.active_customers() if mid(start) <= c.created_at < mid(end)]
    if new_in_range:
        n = len(new_in_range)
        insights.append({
            "id": "new_customers", "category": "customers", "priority": "low",
            "title": f"{n} new customer{'s' if n != 1 else ''} in the last {label}",
            "summary": f"You added {n} customer{'s' if n != 1 else ''} in the last {label}.",
            "trend": "up", "trend_value": f"+{n}",
            "confidence": confidence(n, days_of_data),
            "cta_label": "View customers", "cta_route": "/customers",
            "supporting": [{"label": c.name, "value": clock.local_date(c.created_at, tz).isoformat(), "sub": None} for c in new_in_range[:4]],
        })

    # untracked_sales
    untracked = [s for s in cur if not s.customer_id]
    if cur and len(cur) >= 5 and len(untracked) / len(cur) > 0.3:
        pct = round(len(untracked) / len(cur) * 100)
        insights.append({
            "id": "untracked_sales", "category": "risk", "priority": "medium",
            "title": "Most sales aren't linked to a customer" if pct > 50 else f"{pct}% of sales aren't linked to a customer",
            "summary": f"{len(untracked)} of {len(cur)} sales in the last {label} have no customer, so TENDA can't predict follow-ups for them.",
            "trend": "neutral", "trend_value": f"{pct}%",
            "confidence": confidence(len(cur), days_of_data),
            "cta_label": "Log a sale", "cta_route": "/sales/add-sales",
            "supporting": [{"label": "Without customer", "value": str(len(untracked)), "sub": None},
                           {"label": "With customer", "value": str(len(cur) - len(untracked)), "sub": None}],
        })

    # aov_change
    if len(cur) >= 10 and len(prev) >= 10:
        aov_c = cur_t["revenue"] / cur_t["transactions"]
        aov_p = prev_t["revenue"] / prev_t["transactions"]
        change = clock.growth_pct(aov_c, aov_p)
        if change is not None and abs(change) >= 10:
            insights.append({
                "id": "aov_change", "category": "revenue", "priority": "medium",
                "title": f"Average order value {'up' if change > 0 else 'down'} {abs(change):g}%",
                "summary": f"Customers spent {naira(aov_c)} per order in the last {label}, compared with {naira(aov_p)} before.",
                "trend": _trend(change), "trend_value": pct_text(change),
                "confidence": confidence(len(cur) + len(prev), days_of_data),
                "cta_label": None, "cta_route": None,
                "supporting": [{"label": "This period", "value": naira(aov_c), "sub": None},
                               {"label": "Previous", "value": naira(aov_p), "sub": None}],
            })

    insights.sort(key=lambda i: PRIORITY_ORDER[i["priority"]])
    insights = insights[:8]

    # recommendations
    recommendations = []
    if overdue_customers:
        backing = sum(p.sales_count for p in overdue)
        gain = None
        if backing >= 3:
            raw = sum((p.revenue / p.sales_count) * 0.3 for p in overdue if p.sales_count)
            gain = f"Est. {naira(round(raw / 500) * 500)}"
        n = len(overdue_customers)
        first_names = [data.customers[c].name.split()[0] for c in overdue_customers]
        others = f" and {n - 2} other{'s' if n - 2 > 1 else ''}" if n > 2 else ""
        recommendations.append({
            "id": "reengage_at_risk", "priority": "urgent" if n >= 3 else "high", "impact": "high",
            "title": f"Reach out to {n} overdue customer{'s' if n != 1 else ''} this week",
            "description": f"{', '.join(first_names[:2])}{others} usually reorder by now. A quick WhatsApp message keeps them buying from you.",
            "action_label": "Go to Follow-ups", "action_route": "/follow-up", "estimated_gain": gain,
        })
    if cur and len(untracked) / len(cur) > 0.3:
        recommendations.append({
            "id": "link_customers", "priority": "normal", "impact": "medium",
            "title": "Add the customer when you log a sale",
            "description": "Sales linked to a customer let TENDA remind you when they're due to buy again.",
            "action_label": "Log a sale", "action_route": "/sales/add-sales", "estimated_gain": None,
        })
    missing_days = [p for p in data.active_products() if p.repurchase_days is None and p.is_replenishable is not False]
    if missing_days:
        recommendations.append({
            "id": "set_repurchase_days", "priority": "normal", "impact": "medium",
            "title": f"Set repurchase times for {len(missing_days)} product{'s' if len(missing_days) != 1 else ''}",
            "description": "Tell TENDA how often customers usually rebuy each product so follow-ups start sooner.",
            "action_label": "Open Settings", "action_route": "/settings", "estimated_gain": None,
        })

    # data sources & quality
    active_customers, active_products = data.active_customers(), data.active_products()
    sources = [
        ("Sales records", len(data.sales), max((s.updated_at for s in data.sales), default=None)),
        ("Customer profiles", len(active_customers), max((c.updated_at for c in active_customers), default=None)),
        ("Product catalogue", len(active_products), max((p.updated_at for p in active_products), default=None)),
    ]
    n_sales = len(data.sales)
    metrics = [
        sum(1 for s in data.sales if s.customer_id) / n_sales * 100 if n_sales else 0,
        sum(1 for s in data.sales if s.product_id) / n_sales * 100 if n_sales else 0,
        sum(1 for p in active_products if p.repurchase_days) / len(active_products) * 100 if active_products else 0,
        sum(1 for c in active_customers if c.phone) / len(active_customers) * 100 if active_customers else 0,
        min(100, (today - clock.local_date(first_sale, tz)).days / 30 * 100) if first_sale else 0,
    ]
    issues = []
    if n_sales < 10:
        issues.append("Log at least 10 sales to unlock insights.")
    if n_sales and metrics[0] < 100:
        issues.append(f"{round(100 - metrics[0])}% of sales have no customer attached — follow-ups can't be predicted for them.")
    if n_sales and metrics[1] < 100:
        issues.append(f"{round(100 - metrics[1])}% of sales aren't linked to a catalogue product.")
    if missing_days:
        issues.append(f"{len(missing_days)} product{'s have' if len(missing_days) != 1 else ' has'} no repurchase time set.")
    no_phone = sum(1 for c in active_customers if not c.phone)
    if no_phone:
        issues.append(f"{no_phone} customer{'s have' if no_phone != 1 else ' has'} no phone number, so you can't message them from TENDA.")

    return {
        "range": range_,
        "generated_at": clock.now(),
        "based_on": {"customers": len(active_customers), "transactions": n_sales, "products": len(active_products)},
        "insights": insights,
        "recommendations": recommendations,
        "ai_narrative": _narratives.get((data.user.id, range_)),
        "data_sources": [
            {"name": name, "record_count": count, "last_updated_at": updated, "status": "ok" if count else "empty"}
            for name, count, updated in sources
        ],
        "data_quality": {"score": round(sum(metrics) / len(metrics)), "issues": issues},
    }


async def get_insights(db: AsyncSession, user: User, range_: str) -> dict:
    return build(await load_user_data(db, user), range_)


async def refresh(db: AsyncSession, user: User, range_: str) -> dict:
    retry = ratelimit.hit("insights_refresh", str(user.id), limit=1, window=300)
    if retry is not None:
        raise AppError(429, "RATE_LIMITED", "Insights were refreshed recently. Please try again in a few minutes.",
                       headers={"Retry-After": str(retry)})
    data = await load_user_data(db, user)
    out = build(data, range_)
    facts = {k: out[k] for k in ("insights", "recommendations", "data_quality", "based_on")}
    prompt = (
        "INSIGHTS (JSON, computed from the owner's real data):\n"
        + json.dumps(facts, ensure_ascii=False, default=str)
        + f"\n\nWrite a 3–4 sentence plain-text overview of the business for the last {RANGE_LABEL[range_]}, "
          "using only these facts. No markdown. End with the single most important next step."
    )
    try:
        text = await gemini_service.generate_text(SYSTEM_PROMPT, prompt, "insights_narrative", user.id)
        narrative = {"text": text.replace("**", ""), "generated_at": clock.now()}
        _narratives[(user.id, range_)] = narrative
        out["ai_narrative"] = narrative
    except AppError as exc:
        if exc.code != "AI_UNAVAILABLE":
            raise
        out["ai_narrative"] = None  # the rest of the page still renders
    return out


def clear_caches() -> None:
    _narratives.clear()
