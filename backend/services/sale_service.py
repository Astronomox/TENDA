from datetime import date, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core import clock
from core.errors import field_error, not_found
from models import Customer, Product, Sale, User
from schemas.common import PageParams
from schemas.sales import SaleIn, SaleUpdate
from services import idempotency
from services.customer_lookup import customer_name_key, find_customers_by_name
from services.product_service import find_active_by_name

MAX_AMOUNT = 999_999_999_999.99


def sale_out(s: Sale, customers: dict) -> dict:
    customer_name = None
    if s.customer_id:
        c = customers.get(s.customer_id)
        customer_name = "Deleted customer" if c is None or c.archived_at is not None else c.name
    return {
        "id": s.id,
        "customer_id": s.customer_id,
        "customer_name": customer_name,
        "product_id": s.product_id,
        "product_name": s.product_name,
        "quantity": s.quantity,
        "unit_price": clock.money(s.unit_price),
        "amount": clock.money(s.amount),
        "source": s.source,
        "transcript": s.transcript,
        "note": s.note,
        "sold_at": s.sold_at,
        "created_at": s.created_at,
        "updated_at": s.updated_at,
    }


async def customers_for(db: AsyncSession, sales: list[Sale]) -> dict:
    ids = {s.customer_id for s in sales if s.customer_id}
    if not ids:
        return {}
    rows = (await db.execute(select(Customer).where(Customer.id.in_(ids)))).scalars().all()
    return {c.id: c for c in rows}


async def owned_customer(db: AsyncSession, user: User, customer_id: str, loc=("body", "customer_id")) -> Customer:
    c = await db.get(Customer, customer_id)
    if c is None or c.user_id != user.id or c.archived_at is not None:
        raise field_error(list(loc), "Customer not found")
    return c


async def owned_product(db: AsyncSession, user: User, product_id: str, loc=("body", "product_id")) -> Product:
    p = await db.get(Product, product_id)
    if p is None or p.user_id != user.id or p.archived_at is not None:
        raise field_error(list(loc), "Product not found")
    return p


def check_sold_at(sold_at, loc=("body", "sold_at")):
    sold_at = clock.to_utc_naive(sold_at)
    now = clock.now()
    if sold_at > now + timedelta(minutes=5):
        raise field_error(list(loc), "Sale date can't be in the future")
    if sold_at < now - timedelta(days=730):
        raise field_error(list(loc), "Sale date can't be more than 2 years ago")
    return sold_at


def _amount(quantity: int, unit_price: float) -> float:
    amount = clock.money(quantity * unit_price)
    if amount > MAX_AMOUNT:
        raise field_error(["body", "amount"], "Sale amount is too large")
    return amount


async def build_sale(db: AsyncSession, user: User, body: SaleIn) -> Sale:
    """Apply rules R1–R5 (§10.3). Adds the sale (and any new customer) to the session."""
    product = None
    if body.product_id:  # R1
        product = await owned_product(db, user, body.product_id)
        product_name = product.name
    elif body.product_name:  # R2
        product_name = body.product_name
        product = await find_active_by_name(db, user.id, body.product_name)
    else:
        raise field_error(["body", "product_name"], "Enter a product name")

    unit_price = body.unit_price
    if unit_price is None:
        if product is None:
            raise field_error(["body", "unit_price"], "Enter a price for this product")
        unit_price = clock.money(product.price)

    customer_id = None
    if body.customer_id:
        customer_id = (await owned_customer(db, user, body.customer_id)).id
    elif body.customer_name:  # R3
        matches = await find_customers_by_name(db, user.id, body.customer_name)
        if len(matches) > 1:
            raise field_error(["body", "customer_name"], f"More than one customer is called {body.customer_name} — pick one")
        if matches:
            customer_id = matches[0].id
        else:
            new_customer = Customer(user_id=user.id, name=body.customer_name, name_key=customer_name_key(body.customer_name))
            db.add(new_customer)
            await db.flush()
            customer_id = new_customer.id
    # R4: neither -> anonymous walk-in sale

    amount = body.amount if body.amount is not None else _amount(body.quantity, unit_price)  # R5
    sold_at = check_sold_at(body.sold_at) if body.sold_at else clock.now()

    sale = Sale(
        user_id=user.id,
        customer_id=customer_id,
        product_id=product.id if product else None,
        product_name=product_name,
        quantity=body.quantity,
        unit_price=unit_price,
        amount=amount,
        source=body.source,
        transcript=body.transcript,
        note=body.note,
        sold_at=sold_at,
    )
    db.add(sale)
    await db.flush()
    return sale


async def create_sale(db: AsyncSession, user: User, body: SaleIn, key: str | None) -> tuple[int, dict]:
    """Returns (status_code, body). Replays stored responses for a reused key."""
    req_hash = idempotency.request_hash(body.model_dump())
    if key:
        replay = await idempotency.lookup(db, user.id, key, req_hash)
        if replay:
            return replay

    sale = await build_sale(db, user, body)
    sale.idempotency_key = key
    out = sale_out(sale, await customers_for(db, [sale]))
    if key:
        idempotency.store(db, user.id, key, "/sales", req_hash, 201, out)
    try:
        await db.commit()
    except IntegrityError:
        # Lost a race with an identical request carrying the same key
        await db.rollback()
        if key:
            replay = await idempotency.lookup(db, user.id, key, req_hash)
            if replay:
                return replay
        raise
    return 201, out


SORTS = {
    "-sold_at": (Sale.sold_at.desc(),),
    "sold_at": (Sale.sold_at.asc(),),
    "-amount": (Sale.amount.desc(), Sale.sold_at.desc()),
    "amount": (Sale.amount.asc(), Sale.sold_at.desc()),
    "-created_at": (Sale.created_at.desc(),),
}


async def list_sales(
    db: AsyncSession, user: User, page: PageParams, sort: str = "-sold_at",
    date_from: date | None = None, date_to: date | None = None,
    customer_id: str | None = None, product_id: str | None = None, source: str | None = None,
) -> dict:
    query = select(Sale).where(Sale.user_id == user.id, Sale.deleted_at.is_(None))
    tz_name = user.timezone
    if date_from:
        query = query.where(Sale.sold_at >= clock.local_midnight_utc(date_from, tz_name))
    if date_to:
        query = query.where(Sale.sold_at < clock.local_midnight_utc(date_to + timedelta(days=1), tz_name))
    if customer_id:
        query = query.where(Sale.customer_id == customer_id)
    if product_id:
        query = query.where(Sale.product_id == product_id)
    if source:
        query = query.where(Sale.source == source)
    if page.q:
        ql = page.q.lower()
        matching_customers = select(Customer.id).where(
            Customer.user_id == user.id, Customer.name_key.contains(ql, autoescape=True)
        )
        query = query.where(or_(
            func.lower(Sale.product_name).contains(ql, autoescape=True),
            Sale.customer_id.in_(matching_customers),
        ))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    rows = (await db.execute(query.order_by(*SORTS[sort], Sale.id).limit(page.limit).offset(page.offset))).scalars().all()
    customers = await customers_for(db, rows)
    return {"items": [sale_out(s, customers) for s in rows], "total": total, "limit": page.limit, "offset": page.offset}


async def get_owned_sale(db: AsyncSession, user: User, sale_id: str) -> Sale:
    sale = await db.get(Sale, sale_id)
    if sale is None or sale.user_id != user.id or sale.deleted_at is not None:
        raise not_found("Sale")
    return sale


async def get_sale(db: AsyncSession, user: User, sale_id: str) -> dict:
    sale = await get_owned_sale(db, user, sale_id)
    return sale_out(sale, await customers_for(db, [sale]))


async def update_sale(db: AsyncSession, user: User, sale_id: str, body: SaleUpdate) -> dict:
    sale = await get_owned_sale(db, user, sale_id)
    changes = body.model_dump(exclude_unset=True)

    if "customer_id" in changes:
        sale.customer_id = (await owned_customer(db, user, changes["customer_id"])).id if changes["customer_id"] else None
    if "product_id" in changes:
        if changes["product_id"]:
            product = await owned_product(db, user, changes["product_id"])
            sale.product_id, sale.product_name = product.id, product.name
        else:
            sale.product_id = None
    elif "product_name" in changes:
        sale.product_name = changes["product_name"]
        match = await find_active_by_name(db, user.id, changes["product_name"])
        sale.product_id = match.id if match else None
    if "quantity" in changes:
        sale.quantity = changes["quantity"]
    if "unit_price" in changes:
        sale.unit_price = changes["unit_price"]
    if "amount" in changes:
        sale.amount = changes["amount"]
    elif "quantity" in changes or "unit_price" in changes:
        sale.amount = _amount(sale.quantity, clock.money(sale.unit_price))
    if "sold_at" in changes:
        sale.sold_at = check_sold_at(changes["sold_at"])
    if "note" in changes:
        sale.note = changes["note"]

    await db.commit()
    await db.refresh(sale)
    return sale_out(sale, await customers_for(db, [sale]))


async def delete_sale(db: AsyncSession, user: User, sale_id: str) -> None:
    sale = await get_owned_sale(db, user, sale_id)
    sale.deleted_at = clock.now()
    await db.commit()
