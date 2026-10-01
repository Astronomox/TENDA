"""Notifications (§16). Generated on read (no background worker yet), made
idempotent by a per-user `dedupe_key`, as allowed by the contract."""
from datetime import timedelta

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core import clock
from core.errors import field_error, not_found
from models import Notification, User

MILESTONES = [100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000]
RETENTION_DAYS = 60
MAX_PER_USER = 200


async def notify(db: AsyncSession, user_id: int, type_: str, dedupe_key: str, title: str, body: str | None, link: str | None) -> None:
    """Insert once per dedupe_key. Caller commits."""
    exists = (await db.execute(
        select(Notification.id).where(Notification.user_id == user_id, Notification.dedupe_key == dedupe_key)
    )).first()
    if exists is None:
        db.add(Notification(user_id=user_id, type=type_, title=title, body=body, link=link, dedupe_key=dedupe_key))


def _names(names: list[str]) -> str:
    names = list(dict.fromkeys(names))
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    rest = len(names) - 2
    return f"{names[0]}, {names[1]} and {rest} other{'s' if rest > 1 else ''}"


async def generate(db: AsyncSession, user: User) -> None:
    from services import analytics_service
    from services.followup_service import predictions
    from services.userdata import load_user_data

    data = await load_user_data(db, user)
    tz_name, today = data.tz, data.today
    local_now = clock.to_local(clock.now(), tz_name)
    after_8 = local_now.hour >= 8

    if after_8:
        preds = predictions(data)
        overdue = [p for p in preds if p.status == "overdue"]
        if overdue:
            names = [data.customers[p.customer_id].name.split()[0] for p in overdue]
            n = len(set(p.customer_id for p in overdue))
            await notify(db, user.id, "follow_up_overdue", f"follow_up_overdue:{today.isoformat()}",
                         f"{n} customer{'s are' if n != 1 else ' is'} due to reorder",
                         f"{_names(names)} usually buy again by now.", "/follow-up")
        due_today = [p for p in preds if p.status == "due_today"]
        if due_today:
            n = len(due_today)
            await notify(db, user.id, "follow_up_due_today", f"due_today:{today.isoformat()}",
                         f"{n} follow-up{'s' if n != 1 else ''} due today",
                         f"{_names([data.customers[p.customer_id].name.split()[0] for p in due_today])} should be reordering today.",
                         "/follow-up")

    # Weekly items appear from Monday 08:00
    if today.weekday() > 0 or after_8:
        bounds = analytics_service.period_bounds(today, tz_name)
        last_week = analytics_service.between(data.sales, *bounds["last_week"])
        iso_year, iso_week, _ = today.isocalendar()
        week_key = f"{iso_year}-W{iso_week:02d}"
        if last_week:
            t = analytics_service.totals(last_week)
            await notify(db, user.id, "weekly_summary", f"weekly:{week_key}",
                         f"Last week: ₦{t['revenue']:,.0f} from {t['transactions']} sale{'s' if t['transactions'] != 1 else ''}",
                         "Open Insights to see what drove it.", "/insights")
            top = analytics_service.group_products(last_week, data.products)[0]
            await notify(db, user.id, "top_product_week", f"top_product:{week_key}",
                         f"{top['product_name']} was your top product last week",
                         f"₦{top['revenue']:,.0f} from {top['quantity']} unit{'s' if top['quantity'] != 1 else ''}.", "/insights")

    month_rev = analytics_service.totals(
        analytics_service.between(data.sales, *analytics_service.period_bounds(today, tz_name)["this_month"])
    )["revenue"]
    crossed = [m for m in MILESTONES if month_rev >= m]
    if crossed:
        m = crossed[-1]
        await notify(db, user.id, "revenue_milestone", f"milestone:{today.strftime('%Y-%m')}:{m}",
                     f"You crossed ₦{m:,} in sales this month 🎉", f"This month so far: ₦{month_rev:,.0f}.", "/dashboard")

    # Retention: 60 days, max 200 per user
    await db.execute(delete(Notification).where(
        Notification.user_id == user.id, Notification.created_at < clock.now() - timedelta(days=RETENTION_DAYS)
    ))
    await db.flush()
    overflow = (await db.execute(
        select(Notification.id).where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc()).offset(MAX_PER_USER)
    )).scalars().all()
    if overflow:
        await db.execute(delete(Notification).where(Notification.id.in_(overflow)))
    await db.commit()


def notification_out(n: Notification) -> dict:
    return {"id": n.id, "type": n.type, "title": n.title, "body": n.body, "link": n.link,
            "created_at": n.created_at, "read": n.read_at is not None}


async def list_notifications(db: AsyncSession, user: User, unread_only: bool, limit: int) -> dict:
    await generate(db, user)
    base = select(Notification).where(Notification.user_id == user.id, Notification.dismissed_at.is_(None))
    unread = (await db.execute(
        select(func.count()).select_from(base.where(Notification.read_at.is_(None)).subquery())
    )).scalar_one()
    query = base.where(Notification.read_at.is_(None)) if unread_only else base
    rows = (await db.execute(query.order_by(Notification.created_at.desc(), Notification.id).limit(limit))).scalars().all()
    return {"items": [notification_out(n) for n in rows], "unread_count": unread}


async def mark_read(db: AsyncSession, user: User, ids: list[str] | None, all_: bool) -> None:
    if not all_ and not ids:
        raise field_error(["body"], "Send either a list of ids or all: true")
    q = update(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))
    if not all_:
        q = q.where(Notification.id.in_(ids))
    await db.execute(q.values(read_at=clock.now()))
    await db.commit()


async def dismiss(db: AsyncSession, user: User, notification_id: str) -> None:
    n = await db.get(Notification, notification_id)
    if n is None or n.user_id != user.id or n.dismissed_at is not None:
        raise not_found("Notification")
    n.dismissed_at = clock.now()
    await db.commit()
