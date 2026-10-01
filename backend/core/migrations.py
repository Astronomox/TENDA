"""Idempotent schema/data migrations, run at startup after create_all.

Why not Alembic: this project is a single SQLite file with no migration history
yet. Every step below checks the current state first, so running it on every
start is safe. Switch to Alembic when moving to Postgres (see Readme).

Steps:
  1. users: add public_id / full_name / timezone / needs_review columns.
  2. users.email: trim + lowercase. On a collision the older account keeps the
     address; the newer one is flagged (needs_review=1) and its email is
     suffixed so the unique index holds. No row is deleted.
  3. Every user gets a business_profiles row.
  4. Copy legacy `transactions` rows into `sales` (source='voice',
     unit_price=amount/quantity, sold_at=created_at). The `transactions` table
     itself is left untouched as a backup.
"""
import logging
import uuid
from datetime import datetime

from core import clock

logger = logging.getLogger("tenda.migrations")


def _columns(conn, table: str) -> set[str]:
    return {row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()}


def _table_exists(conn, table: str) -> bool:
    return conn.exec_driver_sql(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).first() is not None


def _parse_dt(value) -> datetime | None:
    if value is None or isinstance(value, datetime):
        return value
    text = str(value).replace("T", " ").rstrip("Z")
    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def _fmt(dt: datetime) -> str:
    # Same text format SQLAlchemy's SQLite DateTime type writes.
    return dt.strftime("%Y-%m-%d %H:%M:%S.%f")


def run_migrations(conn) -> None:
    if conn.dialect.name != "sqlite":
        logger.warning("Startup migrations are written for SQLite; skipping on %s", conn.dialect.name)
        return

    # 1. users columns ------------------------------------------------------
    cols = _columns(conn, "users")
    if "public_id" not in cols:
        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN public_id VARCHAR(36)")
    if "full_name" not in cols:
        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN full_name VARCHAR")
    if "timezone" not in cols:
        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN timezone VARCHAR NOT NULL DEFAULT 'Africa/Lagos'")
    if "needs_review" not in cols:
        conn.exec_driver_sql("ALTER TABLE users ADD COLUMN needs_review BOOLEAN NOT NULL DEFAULT 0")
    for (user_id,) in conn.exec_driver_sql("SELECT id FROM users WHERE public_id IS NULL").fetchall():
        conn.exec_driver_sql("UPDATE users SET public_id=? WHERE id=?", (str(uuid.uuid4()), user_id))
    conn.exec_driver_sql("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_public_id ON users (public_id)")

    # 2. lowercase emails ---------------------------------------------------
    rows = conn.exec_driver_sql(
        "SELECT id, email FROM users WHERE needs_review = 0 ORDER BY created_at IS NULL, created_at, id"
    ).fetchall()
    keepers: dict[str, int] = {}
    losers: list[tuple[int, str, int]] = []
    for user_id, email in rows:
        key = (email or "").strip().lower()
        if key in keepers:
            losers.append((user_id, email, keepers[key]))
        else:
            keepers[key] = user_id
    for user_id, email, keeper_id in losers:
        # Move the loser out of the way first so the keeper can take the lowercase address.
        conn.exec_driver_sql(
            "UPDATE users SET email=?, needs_review=1 WHERE id=?",
            (f"{email}#duplicate-of-user-{keeper_id}", user_id),
        )
        logger.warning("User %s collides with user %s after lowercasing; flagged needs_review", user_id, keeper_id)
    for key, user_id in keepers.items():
        conn.exec_driver_sql("UPDATE users SET email=? WHERE id=? AND email<>?", (key, user_id, key))

    # 3. business profiles ----------------------------------------------------
    now = _fmt(clock.now())
    conn.exec_driver_sql(
        "INSERT INTO business_profiles (user_id, currency, updated_at) "
        "SELECT id, 'NGN', ? FROM users WHERE id NOT IN (SELECT user_id FROM business_profiles)",
        (now,),
    )

    # 4. transactions -> sales -------------------------------------------------
    if _table_exists(conn, "transactions"):
        legacy = conn.exec_driver_sql(
            "SELECT t.id, t.user_id, t.product_name, t.quantity, t.amount, t.created_at FROM transactions t "
            "WHERE t.id NOT IN (SELECT legacy_transaction_id FROM sales WHERE legacy_transaction_id IS NOT NULL)"
        ).fetchall()
        copied = 0
        for tx_id, user_id, product_name, quantity, amount, created_at in legacy:
            quantity = quantity if quantity and quantity >= 1 else 1
            if amount is None or amount < 0 or quantity > 100000:
                logger.warning("Legacy transaction %s has invalid values; left in transactions only", tx_id)
                continue
            amount = clock.money(amount)
            sold_at = _fmt(_parse_dt(created_at) or clock.now())
            name = (product_name or "Unknown product").strip()[:80] or "Unknown product"
            conn.exec_driver_sql(
                "INSERT INTO sales (id, user_id, customer_id, product_id, product_name, quantity, unit_price, amount, "
                "source, transcript, note, sold_at, created_at, updated_at, deleted_at, idempotency_key, legacy_transaction_id) "
                "VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, 'voice', NULL, NULL, ?, ?, ?, NULL, NULL, ?)",
                (str(uuid.uuid4()), user_id, name, quantity, clock.money(amount / quantity), amount,
                 sold_at, sold_at, sold_at, tx_id),
            )
            copied += 1
        if copied:
            logger.info("Copied %s legacy transactions into sales", copied)

    # housekeeping
    conn.exec_driver_sql("DELETE FROM revoked_tokens WHERE expires_at < ?", (now,))
