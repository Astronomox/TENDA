"""Alembic environment.

- At app startup on Postgres, main.py passes an open connection in
  config.attributes["connection"] and we migrate on it.
- From the CLI (`alembic upgrade head`, `alembic revision --autogenerate`)
  we build an async engine from settings.database_url.
"""
import asyncio

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

import models  # noqa: F401  (registers all tables)
from core.config import settings
from core.database import Base

config = context.config
target_metadata = Base.metadata


def _run(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


def run_offline() -> None:
    context.configure(url=settings.database_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


async def _run_async() -> None:
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as conn:
        await conn.run_sync(_run)
        await conn.commit()
    await engine.dispose()


if context.is_offline_mode():
    run_offline()
elif config.attributes.get("connection") is not None:
    _run(config.attributes["connection"])
else:
    asyncio.run(_run_async())
