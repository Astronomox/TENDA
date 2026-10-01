"""Idempotency-Key handling for money-bearing POSTs (§2.9)."""
import hashlib
import json
from datetime import timedelta

from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from core import clock
from core.errors import AppError, field_error
from models import IdempotencyKey

WINDOW = timedelta(hours=24)


def validate_key(key: str | None) -> str | None:
    if key is None:
        return None
    key = key.strip()
    if not key or len(key) > 64:
        raise field_error(["header", "Idempotency-Key"], "Idempotency-Key must be 1–64 characters")
    return key


def request_hash(payload) -> str:
    return hashlib.sha256(json.dumps(jsonable_encoder(payload), sort_keys=True).encode()).hexdigest()


async def lookup(db: AsyncSession, user_id: int, key: str, req_hash: str) -> tuple[int, dict] | None:
    """Returns the stored (status, body) for a replay, or None if the key is new."""
    row = (await db.execute(
        select(IdempotencyKey).where(IdempotencyKey.user_id == user_id, IdempotencyKey.key == key)
    )).scalar_one_or_none()
    if row is None:
        return None
    if row.created_at < clock.now() - WINDOW:
        await db.execute(delete(IdempotencyKey).where(IdempotencyKey.id == row.id))
        await db.flush()
        return None
    if row.request_hash != req_hash:
        raise AppError(409, "CONFLICT", "This Idempotency-Key was already used for a different request")
    return row.response_status, json.loads(row.response_body)


def store(db: AsyncSession, user_id: int, key: str, endpoint: str, req_hash: str, status: int, body: dict) -> None:
    db.add(IdempotencyKey(
        user_id=user_id, key=key, endpoint=endpoint, request_hash=req_hash,
        response_status=status, response_body=json.dumps(jsonable_encoder(body)),
    ))
