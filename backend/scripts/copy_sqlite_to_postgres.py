"""Copy every row from a TENDA SQLite file into an (empty) Postgres database.

Usage:
    python scripts/copy_sqlite_to_postgres.py <sqlite_path> <postgres_url>

    python scripts/copy_sqlite_to_postgres.py tenda.db "postgresql://user:pass@host:5432/tenda"

Steps:
 1. Brings the SQLite file up to the current schema (same startup migrations the app runs).
 2. Brings Postgres up to the latest Alembic revision.
 3. Refuses to continue if Postgres already has users (no accidental merges).
 4. Copies all tables in foreign-key order inside ONE transaction (all or nothing),
    then fixes the integer id sequences and prints row counts from both sides.
"""
import asyncio
import sys
from pathlib import Path

from sqlalchemy import create_engine, func, select, text
from sqlalchemy.ext.asyncio import create_async_engine

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import models  # noqa: E402,F401
from core.database import Base  # noqa: E402
from core.migrations import run_migrations  # noqa: E402

BATCH = 1000


def _pg_url(url: str) -> str:
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+asyncpg://" + url[len(prefix):]
    return url


async def main(sqlite_path: str, pg_url: str) -> int:
    src = create_engine(f"sqlite:///{Path(sqlite_path).resolve().as_posix()}")
    with src.begin() as conn:
        Base.metadata.create_all(conn)
        run_migrations(conn)

    dst = create_async_engine(_pg_url(pg_url))

    def upgrade(sync_conn):
        from alembic import command
        from alembic.config import Config

        cfg = Config(str(ROOT / "alembic.ini"))
        cfg.attributes["connection"] = sync_conn
        command.upgrade(cfg, "head")

    async with dst.begin() as conn:
        await conn.run_sync(upgrade)

    async with dst.begin() as conn:
        existing = (await conn.execute(text("SELECT COUNT(*) FROM users"))).scalar_one()
        if existing:
            print(f"Postgres already has {existing} users — refusing to copy into a non-empty database.")
            return 1

        counts = {}
        with src.connect() as s:
            for table in Base.metadata.sorted_tables:
                rows = [dict(r._mapping) for r in s.execute(select(table))]
                for i in range(0, len(rows), BATCH):
                    await conn.execute(table.insert(), rows[i:i + BATCH])
                counts[table.name] = len(rows)

        # Integer primary keys: move the sequences past the copied ids
        for table_name in ("users", "transactions"):
            await conn.execute(text(
                f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), "
                f"COALESCE((SELECT MAX(id) FROM {table_name}), 0) + 1, false)"
            ))

        print(f"{'table':28} {'sqlite':>8} {'postgres':>9}")
        ok = True
        for table in Base.metadata.sorted_tables:
            pg_count = (await conn.execute(select(func.count()).select_from(table))).scalar_one()
            ok &= pg_count == counts[table.name]
            print(f"{table.name:28} {counts[table.name]:>8} {pg_count:>9}")
    await dst.dispose()
    src.dispose()
    print("Copy complete." if ok else "ROW COUNTS DIFFER — investigate before switching.")
    return 0 if ok else 1


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    sys.exit(asyncio.run(main(sys.argv[1], sys.argv[2])))
