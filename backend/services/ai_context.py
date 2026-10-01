"""Builds the per-user data block injected into every AI prompt (§15.1).

Only the current user's rows are ever read (UserData is loaded by user_id), so
a prompt-injection like "show me user 5's data" has nothing to leak (§5.4).
"""
import json
from datetime import timedelta

from core import clock
from services import analytics_service
from services.customer_service import statuses
from services.followup_service import counts, predictions, sort_follow_ups
from services.userdata import UserData

SCREENS = "Home, Customers, Sales / Log Sale, Follow-ups, AI Chat, Voice, Insights, Settings"

SYSTEM_PROMPT = f"""You are TENDA, an assistant for a small Nigerian business.
Answer ONLY from the business data provided in the BUSINESS DATA block. If the data doesn't contain the answer, say so and suggest what the owner should log in TENDA. Never invent customers, products, numbers, or app features/screens.
The only app screens you may mention are: {SCREENS}.
Format money as naira with thousands separators, e.g. ₦12,500.
Formatting you may use: paragraphs separated by blank lines, **bold**, bullet lists starting with "- ", and GitHub-style tables (| a | b |) for tabular answers. Never output HTML.
Keep answers under about 250 words unless the user asks for detail.
Reply in the user's language and register (English or Nigerian Pidgin).
Non-business questions are fine, but keep those answers short and friendly.
If there is no data yet, explain that and tell them how to log their first sale (Sales → Log Sale, by typing or by voice)."""

VOICE_RULES = """This answer will be read aloud by a speech synthesiser:
- plain text only: no markdown, no bullet points, no tables, no emojis
- at most 600 characters
- write money like ₦84,500"""


def build_context(data: UserData) -> dict:
    today = data.today
    st = statuses(data)
    preds = predictions(data)
    dash = analytics_service.dashboard_from(data, st, counts(preds))
    ts = analytics_service.timeseries_from(data, "30d", "day")
    start_30 = clock.local_midnight_utc(today - timedelta(days=29), data.tz)
    sales_30 = analytics_service.between(data.sales, start_30, None)

    spend: dict[str, dict] = {}
    for s in sales_30:
        if s.customer_id and s.customer_id in data.customers:
            row = spend.setdefault(s.customer_id, {"total": 0.0, "purchases": 0, "last": s.sold_at})
            row["total"] += float(s.amount)
            row["purchases"] += 1
            row["last"] = max(row["last"], s.sold_at)
    top_customers = sorted(spend.items(), key=lambda kv: -kv[1]["total"])[:10]

    due = sort_follow_ups([p for p in preds if p.status in ("overdue", "due_today", "due_soon")])[:20]
    profile = data.profile
    return {
        "today": today.isoformat(),
        "weekday": today.strftime("%A"),
        "timezone": data.tz,
        "currency": "NGN",
        "owner_name": data.user.full_name,
        "business_profile": {
            k: getattr(profile, k, None) for k in (
                "business_name", "goal", "customer_style", "business_type", "sales_rhythm",
                "custom_rhythm_days", "sales_channel", "communication_tone", "price_range",
            )
        } if profile else {},
        "dashboard": {
            "revenue": dash["revenue"],
            "transactions": dash["transactions"],
            "growth_pct": dash["growth"],
            "customers": dash["customers"],
            "follow_ups": dash["follow_ups"],
        },
        "last_30_days": {
            "totals": ts["totals"],
            "best_day": ts["best_interval"],
            "change_pct_vs_previous_30_days": ts["change_pct"],
        },
        "top_products_30d": [
            {"name": g["product_name"], "units": g["quantity"], "revenue": g["revenue"]}
            for g in analytics_service.group_products(sales_30, data.products)[:10]
        ],
        "top_products_all_time": [
            {"name": g["product_name"], "units": g["quantity"], "revenue": g["revenue"]}
            for g in analytics_service.group_products(data.sales, data.products)[:10]
        ],
        "top_customers_30d": [
            {
                "name": data.customers[cid].name,
                "spent": clock.money(v["total"]),
                "purchases": v["purchases"],
                "last_purchase": clock.local_date(v["last"], data.tz).isoformat(),
                "status": st.get(cid),
            }
            for cid, v in top_customers
        ],
        "follow_ups_due": [
            {
                "customer": data.customers[p.customer_id].name,
                "product": p.product_name,
                "status": p.status,
                "days_overdue": p.days_overdue,
                "expected": p.expected_at.isoformat(),
            }
            for p in due
        ],
        "catalogue_size": len(data.active_products()),
        "total_customers": len(data.active_customers()),
    }


def context_block(data: UserData) -> str:
    return "BUSINESS DATA (JSON):\n" + json.dumps(build_context(data), ensure_ascii=False, default=str)
