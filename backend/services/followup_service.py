import re
from datetime import datetime, timedelta
from urllib.parse import quote

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core import clock
from core.errors import not_found
from models import Customer, FollowUpAction, Sale, User
from services.followup_engine import compute_follow_ups, follow_up_key, sort_follow_ups
from services.userdata import UserData, load_user_data

PLACEHOLDERS = {"customer_name", "customer_first_name", "product_name", "business_name", "days_since_last_purchase"}


def predictions(data: UserData):
    return compute_follow_ups(data.sales, data.customers, data.products, data.profile, data.actions, data.today, data.tz)


def first_name(name: str) -> str:
    return (name or "").split()[0] if (name or "").split() else name


def fill_template(body: str, values: dict) -> str:
    return re.sub(r"\{([a-z_]+)\}", lambda m: str(values.get(m.group(1), m.group(0))), body)


def suggested_message(data: UserData, customer: Customer, product_name: str, days_since: int) -> str:
    business = (data.profile.business_name if data.profile else None) or "us"
    first = first_name(customer.name)
    values = {
        "customer_name": customer.name,
        "customer_first_name": first,
        "product_name": product_name,
        "business_name": business,
        "days_since_last_purchase": days_since,
    }
    if data.default_template is not None:
        return fill_template(data.default_template.body, values)
    tone = data.profile.communication_tone if data.profile else None
    if tone == "professional":
        return (f"Hello {first}, this is {business}. It has been {days_since} days since your last "
                f"{product_name} order. Would you like to reorder?")
    if tone == "friendly":
        return f"Hi {first}! 👋 Just checking in — are you running low on {product_name}? I can get some ready for you."
    return (f"Hi {first}! It's been a while — your {product_name} should be running low. "
            f"Want me to set some aside for you? 😊")


def contact_links(phone: str | None, message: str) -> tuple[str | None, str | None]:
    if not phone:
        return None, None
    digits = phone.lstrip("+")
    return f"https://wa.me/{digits}?text={quote(message)}", f"tel:{phone}"


def item_out(data: UserData, p) -> dict:
    customer = data.customers[p.customer_id]
    days_since = (data.today - clock.local_date(p.last_purchase_at, data.tz)).days
    message = suggested_message(data, customer, p.product_name, days_since)
    whatsapp, tel = contact_links(customer.phone, message)
    return {
        "key": p.key,
        "customer": {"id": customer.id, "name": customer.name, "phone": customer.phone, "email": customer.email},
        "product": {"id": p.product_id, "name": p.product_name},
        "status": p.status,
        "last_purchase_at": p.last_purchase_at,
        "expected_at": p.expected_at.isoformat(),
        "days_overdue": p.days_overdue,
        "days_until": p.days_until,
        "interval_days": p.interval_days,
        "interval_source": p.interval_source,
        "purchase_count": p.purchase_count,
        "confidence": p.confidence,
        "suggested_message": message,
        "whatsapp_url": whatsapp,
        "tel_url": tel,
    }


def counts(preds) -> dict:
    out = {"overdue": 0, "due_today": 0, "due_soon": 0, "upcoming": 0}
    for p in preds:
        out[p.status] += 1
    return out


STATUS_FILTER = {
    "all": {"overdue", "due_today", "due_soon"},
    "overdue": {"overdue"},
    "due_soon": {"due_today", "due_soon"},  # due today is listed with "due soon" (§19.3)
    "upcoming": {"upcoming"},
}


async def list_follow_ups(db: AsyncSession, user: User, status: str, limit: int, offset: int) -> dict:
    data = await load_user_data(db, user)
    preds = predictions(data)
    wanted = STATUS_FILTER[status]
    selected = sort_follow_ups([p for p in preds if p.status in wanted])
    page = selected[offset: offset + limit]
    return {
        "items": [item_out(data, p) for p in page],
        "total": len(selected),
        "limit": limit,
        "offset": offset,
        "counts": counts(preds),
    }


async def _resolve_key(db: AsyncSession, user: User, key: str) -> tuple[Customer, str]:
    """Unknown key -> 404. A key is valid if the customer bought that product."""
    customer_id, sep, product_part = key.partition(":")
    if not sep or not product_part:
        raise not_found("Follow-up")
    customer = await db.get(Customer, customer_id)
    if customer is None or customer.user_id != user.id or customer.archived_at is not None:
        raise not_found("Follow-up")
    sales = (await db.execute(
        select(Sale).where(Sale.user_id == user.id, Sale.customer_id == customer_id, Sale.deleted_at.is_(None))
    )).scalars().all()
    matches = [s for s in sales if follow_up_key(customer_id, s.product_id, s.product_name) == key]
    if not matches:
        raise not_found("Follow-up")
    latest = max(matches, key=lambda s: s.sold_at)
    return customer, latest.product_name


async def record_action(db: AsyncSession, user: User, key: str, action: str, channel: str | None = None,
                        days: int | None = None) -> dict:
    customer, product_name = await _resolve_key(db, user, key)
    snooze_until = None
    if action == "snoozed":
        snooze_until = datetime.combine(clock.today(user.timezone) + timedelta(days=days), datetime.min.time())
    row = FollowUpAction(
        user_id=user.id, follow_up_key=key, customer_id=customer.id, product_name=product_name,
        action=action, channel=channel, snooze_until=snooze_until,
    )
    db.add(row)
    await db.commit()
    return {
        "key": key,
        "action": action,
        "channel": channel,
        "snooze_until": snooze_until.date().isoformat() if snooze_until else None,
        "created_at": row.created_at,
    }
