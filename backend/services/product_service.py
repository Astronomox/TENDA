from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core import clock
from core.errors import AppError, not_found
from models import Product, Sale, User
from schemas.common import PageParams
from schemas.products import BulkProductsIn, ProductIn, ProductUpdate


def name_key(name: str) -> str:
    return " ".join(name.split()).lower()


def product_out(p: Product, stats: dict | None = None, include_stats: bool = False) -> dict:
    out = {
        "id": p.id,
        "name": p.name,
        "price": clock.money(p.price),
        "repurchase_days": p.repurchase_days,
        "is_replenishable": p.is_replenishable,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }
    if include_stats:
        out["stats"] = stats or {"units_sold": 0, "revenue": 0.0, "last_sold_at": None}
    return out


def _duplicate(name: str) -> AppError:
    return AppError(409, "CONFLICT", f"You already have a product called {name}")


async def product_stats(db: AsyncSession, user_id: int, product_ids: list[str]) -> dict[str, dict]:
    if not product_ids:
        return {}
    rows = await db.execute(
        select(Sale.product_id, func.sum(Sale.quantity), func.sum(Sale.amount), func.max(Sale.sold_at))
        .where(Sale.user_id == user_id, Sale.deleted_at.is_(None), Sale.product_id.in_(product_ids))
        .group_by(Sale.product_id)
    )
    return {
        pid: {"units_sold": int(units or 0), "revenue": clock.money(rev), "last_sold_at": last}
        for pid, units, rev, last in rows.all()
    }


async def get_owned(db: AsyncSession, user: User, product_id: str, include_archived: bool = False) -> Product:
    product = await db.get(Product, product_id)
    if product is None or product.user_id != user.id or (product.archived_at is not None and not include_archived):
        raise not_found("Product")
    return product


async def find_active_by_name(db: AsyncSession, user_id: int, name: str) -> Product | None:
    result = await db.execute(
        select(Product).where(Product.user_id == user_id, Product.archived_at.is_(None), Product.name_key == name_key(name))
    )
    return result.scalars().first()


async def list_products(db: AsyncSession, user: User, page: PageParams, sort: str, include_stats: bool) -> dict:
    base = select(Product).where(Product.user_id == user.id, Product.archived_at.is_(None))
    if page.q:
        base = base.where(Product.name_key.contains(page.q.lower(), autoescape=True))

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()

    if sort == "-revenue":
        revenue = (
            select(Sale.product_id.label("pid"), func.sum(Sale.amount).label("rev"))
            .where(Sale.user_id == user.id, Sale.deleted_at.is_(None), Sale.product_id.is_not(None))
            .group_by(Sale.product_id)
            .subquery()
        )
        query = base.outerjoin(revenue, revenue.c.pid == Product.id).order_by(
            func.coalesce(revenue.c.rev, 0).desc(), Product.name_key
        )
    elif sort == "-created_at":
        query = base.order_by(Product.created_at.desc(), Product.name_key)
    else:
        query = base.order_by(Product.name_key)

    products = (await db.execute(query.limit(page.limit).offset(page.offset))).scalars().all()
    stats = await product_stats(db, user.id, [p.id for p in products]) if include_stats else {}
    return {
        "items": [product_out(p, stats.get(p.id), include_stats) for p in products],
        "total": total,
        "limit": page.limit,
        "offset": page.offset,
    }


async def create_product(db: AsyncSession, user: User, body: ProductIn) -> dict:
    if await find_active_by_name(db, user.id, body.name):
        raise _duplicate(body.name)
    product = Product(
        user_id=user.id,
        name=body.name,
        name_key=name_key(body.name),
        price=body.price,
        repurchase_days=body.repurchase_days,
        is_replenishable=body.is_replenishable,
    )
    db.add(product)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise _duplicate(body.name)
    await db.refresh(product)
    return product_out(product)


async def bulk_upsert(db: AsyncSession, user: User, body: BulkProductsIn) -> dict:
    """All-or-nothing (§8.2). Rows with `id` update, rows without create."""
    seen: dict[str, str] = {}
    for row in body.products:
        key = name_key(row.name)
        if key in seen:
            raise AppError(409, "CONFLICT", f"{row.name} appears more than once in the list")
        seen[key] = row.name

    existing = (await db.execute(
        select(Product).where(Product.user_id == user.id, Product.archived_at.is_(None))
    )).scalars().all()
    by_id = {p.id: p for p in existing}
    touched_ids = {row.id for row in body.products if row.id}
    for pid in touched_ids:
        if pid not in by_id:
            raise not_found("Product")
    # Names held by products that are not part of this batch
    untouched_names = {p.name_key: p.name for p in existing if p.id not in touched_ids}
    for key, name in seen.items():
        if key in untouched_names:
            raise _duplicate(name)

    results: list[Product] = []
    try:
        for row in body.products:
            if row.id:
                product = by_id[row.id]
                product.name = row.name
                product.name_key = name_key(row.name)
                product.price = row.price
                product.repurchase_days = row.repurchase_days
                product.is_replenishable = row.is_replenishable
            else:
                product = Product(
                    user_id=user.id, name=row.name, name_key=name_key(row.name), price=row.price,
                    repurchase_days=row.repurchase_days, is_replenishable=row.is_replenishable,
                )
                db.add(product)
            results.append(product)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise AppError(409, "CONFLICT", "Two products would end up with the same name")
    for p in results:
        await db.refresh(p)
    return {"items": [product_out(p) for p in results]}


async def get_product(db: AsyncSession, user: User, product_id: str) -> dict:
    product = await get_owned(db, user, product_id)
    stats = await product_stats(db, user.id, [product.id])
    return product_out(product, stats.get(product.id), include_stats=True)


async def update_product(db: AsyncSession, user: User, product_id: str, body: ProductUpdate) -> dict:
    product = await get_owned(db, user, product_id)
    changes = body.model_dump(exclude_unset=True)
    if "name" in changes:
        other = await find_active_by_name(db, user.id, changes["name"])
        if other is not None and other.id != product.id:
            raise _duplicate(changes["name"])
        product.name_key = name_key(changes["name"])
    for field, value in changes.items():
        setattr(product, field, value)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise _duplicate(changes.get("name", product.name))
    await db.refresh(product)
    stats = await product_stats(db, user.id, [product.id])
    return product_out(product, stats.get(product.id), include_stats=True)


async def delete_product(db: AsyncSession, user: User, product_id: str) -> None:
    product = await get_owned(db, user, product_id)
    product.archived_at = clock.now()
    await db.commit()
