"""Loads one user's business data in a single place.

Every query filters by user_id (§5 rule 1). Analytics, follow-ups, insights and
the AI context are all computed from this object, so tenant isolation only has
to be right here.
"""
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core import clock
from models import BusinessProfile, Customer, FollowUpAction, MessageTemplate, Product, Sale, User


@dataclass
class UserData:
    user: User
    tz: str
    profile: BusinessProfile | None
    products: dict  # id -> Product (archived included, so old sales still resolve)
    customers: dict  # id -> Customer (archived included)
    sales: list  # non-deleted Sale rows
    actions: list  # FollowUpAction rows
    default_template: MessageTemplate | None

    @property
    def today(self):
        return clock.today(self.tz)

    def active_customers(self):
        return [c for c in self.customers.values() if c.archived_at is None]

    def active_products(self):
        return [p for p in self.products.values() if p.archived_at is None]


async def load_user_data(db: AsyncSession, user: User, customer_ids: list[str] | None = None) -> UserData:
    sales_q = select(Sale).where(Sale.user_id == user.id, Sale.deleted_at.is_(None))
    cust_q = select(Customer).where(Customer.user_id == user.id)
    actions_q = select(FollowUpAction).where(FollowUpAction.user_id == user.id)
    if customer_ids is not None:
        sales_q = sales_q.where(Sale.customer_id.in_(customer_ids))
        cust_q = cust_q.where(Customer.id.in_(customer_ids))
        actions_q = actions_q.where(FollowUpAction.customer_id.in_(customer_ids))

    sales = (await db.execute(sales_q.order_by(Sale.sold_at))).scalars().all()
    customers = {c.id: c for c in (await db.execute(cust_q)).scalars().all()}
    products = {p.id: p for p in (await db.execute(select(Product).where(Product.user_id == user.id))).scalars().all()}
    actions = (await db.execute(actions_q)).scalars().all()
    profile = await db.get(BusinessProfile, user.id)
    template = (await db.execute(
        select(MessageTemplate).where(MessageTemplate.user_id == user.id, MessageTemplate.is_default.is_(True))
    )).scalars().first()
    return UserData(user, user.timezone or clock.DEFAULT_TZ, profile, products, customers, list(sales), list(actions), template)
