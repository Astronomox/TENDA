from collections import defaultdict

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core import clock
from core.errors import AppError, not_found
from core.phone import search_variants
from models import Customer, Sale, User
from schemas.common import PageParams
from schemas.customers import CustomerIn, CustomerUpdate
from services.customer_lookup import customer_name_key
from services.followup_engine import customer_status, product_key, sort_follow_ups
from services.followup_service import predictions
from services.userdata import UserData, load_user_data


def _phone_conflict(existing: Customer) -> AppError:
    return AppError(
        409, "CONFLICT", f"{existing.name} already has this phone number",
        extra={"existing_customer_id": existing.id},
    )


async def get_owned(db: AsyncSession, user: User, customer_id: str) -> Customer:
    c = await db.get(Customer, customer_id)
    if c is None or c.user_id != user.id or c.archived_at is not None:
        raise not_found("Customer")
    return c


async def _find_by_phone(db: AsyncSession, user_id: int, phone: str) -> Customer | None:
    return (await db.execute(
        select(Customer).where(Customer.user_id == user_id, Customer.archived_at.is_(None), Customer.phone == phone)
    )).scalars().first()


def statuses(data: UserData) -> dict[str, str]:
    overdue = {p.customer_id for p in predictions(data) if p.status == "overdue"}
    sold = defaultdict(list)
    for s in data.sales:
        if s.customer_id:
            sold[s.customer_id].append(s.sold_at)
    return {
        cid: customer_status(c.created_at, sold.get(cid, []), cid in overdue, data.today, data.tz)
        for cid, c in data.customers.items()
    }


def _list_item(c: Customer, spent, count, last, status: str) -> dict:
    return {
        "id": c.id, "name": c.name, "phone": c.phone, "email": c.email, "note": c.note,
        "created_at": c.created_at, "updated_at": c.updated_at,
        "total_spent": clock.money(spent), "purchase_count": int(count or 0),
        "last_purchase_at": last, "status": status,
    }


async def list_customers(db: AsyncSession, user: User, page: PageParams, sort: str, status: str | None) -> dict:
    agg = (
        select(
            Sale.customer_id.label("cid"),
            func.sum(Sale.amount).label("spent"),
            func.count(Sale.id).label("cnt"),
            func.max(Sale.sold_at).label("last"),
        )
        .where(Sale.user_id == user.id, Sale.deleted_at.is_(None), Sale.customer_id.is_not(None))
        .group_by(Sale.customer_id)
        .subquery()
    )
    query = (
        select(Customer, agg.c.spent, agg.c.cnt, agg.c.last)
        .outerjoin(agg, agg.c.cid == Customer.id)
        .where(Customer.user_id == user.id, Customer.archived_at.is_(None))
    )
    if page.q:
        ql = page.q.lower()
        conditions = [Customer.name_key.contains(ql, autoescape=True), Customer.email.contains(ql, autoescape=True)]
        conditions += [Customer.phone.contains(v, autoescape=True) for v in search_variants(page.q)]
        query = query.where(or_(*conditions))

    order = {
        "name": (Customer.name_key, Customer.id),
        "-last_purchase_at": (agg.c.last.is_(None), agg.c.last.desc(), Customer.name_key),
        "-total_spent": (func.coalesce(agg.c.spent, 0).desc(), Customer.name_key),
        "-created_at": (Customer.created_at.desc(), Customer.id),
    }[sort]
    query = query.order_by(*order)

    if status:
        # Status is computed, so filter in Python over every match.
        rows = (await db.execute(query)).all()
        data = await load_user_data(db, user, [r[0].id for r in rows])
        st = statuses(data)
        rows = [r for r in rows if st.get(r[0].id) == status]
        total = len(rows)
        rows = rows[page.offset: page.offset + page.limit]
    else:
        total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        rows = (await db.execute(query.limit(page.limit).offset(page.offset))).all()
        data = await load_user_data(db, user, [r[0].id for r in rows])
        st = statuses(data)

    return {
        "items": [_list_item(c, spent, cnt, last, st.get(c.id, "new")) for c, spent, cnt, last in rows],
        "total": total, "limit": page.limit, "offset": page.offset,
    }


async def create_customer(db: AsyncSession, user: User, body: CustomerIn) -> dict:
    if body.phone:
        existing = await _find_by_phone(db, user.id, body.phone)
        if existing:
            raise _phone_conflict(existing)
    customer = Customer(
        user_id=user.id, name=body.name, name_key=customer_name_key(body.name),
        phone=body.phone, email=body.email, note=body.note,
    )
    db.add(customer)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await _find_by_phone(db, user.id, body.phone) if body.phone else None
        if existing:
            raise _phone_conflict(existing)
        raise
    await db.refresh(customer)
    return await customer_detail(db, user, customer.id)


async def update_customer(db: AsyncSession, user: User, customer_id: str, body: CustomerUpdate) -> dict:
    customer = await get_owned(db, user, customer_id)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("phone"):
        existing = await _find_by_phone(db, user.id, changes["phone"])
        if existing and existing.id != customer.id:
            raise _phone_conflict(existing)
    if "name" in changes:
        customer.name_key = customer_name_key(changes["name"])
    for field, value in changes.items():
        setattr(customer, field, value)
    await db.commit()
    return await customer_detail(db, user, customer.id)


async def delete_customer(db: AsyncSession, user: User, customer_id: str) -> None:
    customer = await get_owned(db, user, customer_id)
    customer.archived_at = clock.now()
    await db.commit()


async def customer_detail(db: AsyncSession, user: User, customer_id: str) -> dict:
    customer = await get_owned(db, user, customer_id)
    data = await load_user_data(db, user, [customer.id])
    tz_name, today = data.tz, data.today
    sales = sorted(data.sales, key=lambda s: s.sold_at)

    total = clock.money(sum(float(s.amount) for s in sales))
    count = len(sales)
    last = sales[-1].sold_at if sales else None
    stats = {
        "total_spent": total,
        "purchase_count": count,
        "units_purchased": sum(s.quantity for s in sales),
        "average_order_value": round(total / count, 2) if count else 0.0,
        "first_purchase_at": sales[0].sold_at if sales else None,
        "last_purchase_at": last,
        "days_since_last_purchase": (today - clock.local_date(last, tz_name)).days if last else None,
    }

    # Last 6 calendar months, oldest first, zero-filled
    this_month = clock.month_start(today)
    months = [clock.add_months(this_month, -i) for i in range(5, -1, -1)]
    by_month = {m.strftime("%Y-%m"): 0.0 for m in months}
    for s in sales:
        label = clock.local_date(s.sold_at, tz_name).strftime("%Y-%m")
        if label in by_month:
            by_month[label] += float(s.amount)
    revenue_by_month = [{"month": k, "revenue": clock.money(v)} for k, v in by_month.items()]

    # Top products: max 5, units desc then revenue desc
    groups: dict[str, dict] = {}
    for s in sales:
        g = groups.setdefault(product_key(s.product_id, s.product_name), {
            "product_id": s.product_id, "product_name": s.product_name, "units": 0, "revenue": 0.0, "last_purchased_at": s.sold_at,
        })
        g["units"] += s.quantity
        g["revenue"] += float(s.amount)
        if s.sold_at >= g["last_purchased_at"]:
            g["last_purchased_at"] = s.sold_at
            g["product_name"] = s.product_name
    for g in groups.values():
        if g["product_id"] and g["product_id"] in data.products:
            g["product_name"] = data.products[g["product_id"]].name
        g["revenue"] = clock.money(g["revenue"])
    top_products = sorted(groups.values(), key=lambda g: (-g["units"], -g["revenue"], g["product_name"].lower()))[:5]

    # Recent activity: max 10, newest first
    activity = [
        {"type": "sale", "sale_id": s.id, "label": f"Bought {s.quantity} × {s.product_name}", "amount": clock.money(s.amount), "at": s.sold_at}
        for s in sales
    ]
    activity += [
        {"type": "follow_up_done", "label": f"Followed up about {a.product_name or 'a product'}", "at": a.created_at}
        for a in data.actions if a.action == "done"
    ]
    activity.append({"type": "customer_created", "label": "Added as a customer", "at": customer.created_at})
    activity.sort(key=lambda a: a["at"], reverse=True)

    preds = sort_follow_ups([p for p in predictions(data) if p.customer_id == customer.id])
    next_fu = None
    if preds:
        p = preds[0]
        next_fu = {"product_name": p.product_name, "expected_at": p.expected_at.isoformat(), "status": p.status}

    return {
        "id": customer.id, "name": customer.name, "phone": customer.phone, "email": customer.email,
        "note": customer.note, "created_at": customer.created_at, "updated_at": customer.updated_at,
        "status": statuses(data)[customer.id],
        "stats": stats,
        "revenue_by_month": revenue_by_month,
        "top_products": top_products,
        "recent_activity": activity[:10],
        "next_follow_up": next_fu,
    }
