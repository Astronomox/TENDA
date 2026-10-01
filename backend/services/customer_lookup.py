from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Customer


def customer_name_key(name: str) -> str:
    return " ".join(name.split()).lower()


async def find_customers_by_name(db: AsyncSession, user_id: int, name: str) -> list[Customer]:
    """Case-insensitive exact match among active customers (rule R3)."""
    result = await db.execute(
        select(Customer).where(
            Customer.user_id == user_id,
            Customer.archived_at.is_(None),
            Customer.name_key == customer_name_key(name),
        )
    )
    return list(result.scalars().all())
