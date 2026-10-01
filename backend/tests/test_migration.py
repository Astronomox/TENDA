"""The legacy transactions table becomes sales without losing rows, and
/analytics/summary returns the same numbers before and after (§6)."""
import sqlite3

import pytest
from sqlalchemy import create_engine

from core.config import settings

import models  # noqa: F401
from core.database import Base
from core.migrations import run_migrations

LEGACY_SCHEMA = """
CREATE TABLE users (id INTEGER NOT NULL PRIMARY KEY, email VARCHAR NOT NULL, hashed_password VARCHAR NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE TABLE transactions (id INTEGER NOT NULL PRIMARY KEY, user_id INTEGER NOT NULL, product_name VARCHAR NOT NULL,
                           quantity INTEGER, amount FLOAT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                           FOREIGN KEY(user_id) REFERENCES users (id));
INSERT INTO users VALUES (1, 'Amina@Example.com', 'x', '2026-06-01 10:00:00');
INSERT INTO users VALUES (2, 'amina@example.com', 'y', '2026-06-02 10:00:00');
INSERT INTO users VALUES (3, 'other@example.com', 'z', '2026-06-03 10:00:00');
INSERT INTO transactions VALUES (1, 1, 'keyboards', 3, 50.0, '2026-06-08 22:11:32');
INSERT INTO transactions VALUES (2, 1, 'Rice (bag)', 2, 9000.5, '2026-06-09 08:00:00');
INSERT INTO transactions VALUES (3, 1, 'rice (bag)', NULL, 4500.0, '2026-06-10 08:00:00');
INSERT INTO transactions VALUES (4, 3, 'Oil', 1, 1800.0, '2026-06-11 08:00:00');
"""


def _legacy_summary(conn, user_id):
    return conn.execute("SELECT COALESCE(SUM(amount), 0), COUNT(id) FROM transactions WHERE user_id=?", (user_id,)).fetchone()


def _new_summary(conn, user_id):
    return conn.execute(
        "SELECT COALESCE(SUM(amount), 0), COUNT(id) FROM sales WHERE user_id=? AND deleted_at IS NULL", (user_id,)
    ).fetchone()


def test_migration_preserves_rows_and_totals(tmp_path):
    path = tmp_path / "legacy.db"
    raw = sqlite3.connect(path)
    raw.executescript(LEGACY_SCHEMA)
    before = {uid: _legacy_summary(raw, uid) for uid in (1, 3)}
    raw.close()

    engine = create_engine(f"sqlite:///{path.as_posix()}")
    with engine.begin() as conn:
        Base.metadata.create_all(conn)
        run_migrations(conn)
    with engine.begin() as conn:  # running twice must be a no-op
        Base.metadata.create_all(conn)
        run_migrations(conn)
    engine.dispose()

    raw = sqlite3.connect(path)
    for uid, (total, count) in before.items():
        new_total, new_count = _new_summary(raw, uid)
        assert round(new_total, 2) == round(total, 2) and new_count == count
    assert raw.execute("SELECT COUNT(*) FROM transactions").fetchone()[0] == 4  # legacy table kept as backup
    rows = raw.execute(
        "SELECT source, quantity, unit_price, amount, sold_at FROM sales WHERE legacy_transaction_id=1"
    ).fetchone()
    assert rows[0] == "voice" and rows[1] == 3 and round(rows[2], 2) == 16.67 and rows[3] == 50.0
    assert rows[4].startswith("2026-06-08 22:11:32")
    # NULL quantity becomes 1
    assert raw.execute("SELECT quantity FROM sales WHERE legacy_transaction_id=3").fetchone()[0] == 1

    users = dict(raw.execute("SELECT id, email FROM users").fetchall())
    flags = dict(raw.execute("SELECT id, needs_review FROM users").fetchall())
    assert users[1] == "amina@example.com" and flags[1] == 0  # older account keeps the address
    assert users[2].startswith("amina@example.com#duplicate-of-user-1") and flags[2] == 1
    assert all(raw.execute("SELECT public_id FROM users").fetchall())
    assert raw.execute("SELECT COUNT(*) FROM business_profiles").fetchone()[0] == 3
    raw.close()


@pytest.mark.skipif(not settings.is_sqlite, reason="legacy transactions → sales migration only exists for SQLite")
def test_summary_endpoint_matches_legacy_numbers(client, owner):
    """Same assertion through the API for a user whose data came from transactions."""
    import asyncio  # noqa: F401
    from tests.conftest import main  # noqa: F401
    from core.database import engine
    from sqlalchemy import text

    async def seed():
        async with engine.begin() as conn:
            uid = (await conn.execute(text("SELECT id FROM users WHERE email='owner@test.com'"))).scalar_one()
            await conn.execute(text(
                "INSERT INTO transactions (id, user_id, product_name, quantity, amount, created_at) VALUES "
                "(100, :u, 'keyboards', 3, 50.0, '2026-06-08 22:11:32'), (101, :u, 'Mouse', 1, 20.0, '2026-06-09 10:00:00')"
            ), {"u": uid})
            await conn.run_sync(run_migrations)

    client.portal.call(seed)
    s = client.get("/analytics/summary", headers=owner).json()
    assert s["total_revenue"] == 70.0 and s["total_transactions"] == 2
    assert {p["product_name"]: p["total_quantity"] for p in s["top_products"]} == {"keyboards": 3, "Mouse": 1}
