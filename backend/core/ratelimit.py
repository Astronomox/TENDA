"""In-memory sliding-window rate limiter (§21.4).

Good for a single server process (the current Render setup). If the API is ever
scaled to several instances, move this to Redis so the limits are shared.
"""
import math
import time
from collections import defaultdict, deque

from fastapi import Request

from core.config import settings
from core.errors import AppError

_hits: dict[tuple[str, str], deque] = defaultdict(deque)


def reset() -> None:
    _hits.clear()


def hit(bucket: str, key: str, limit: int, window: int, record: bool = True) -> int | None:
    """Register a hit. Returns None if allowed, else seconds until retry."""
    if not settings.rate_limit_enabled:
        return None
    now = time.monotonic()
    q = _hits[(bucket, key)]
    while q and q[0] <= now - window:
        q.popleft()
    if len(q) >= limit:
        return max(1, math.ceil(q[0] + window - now))
    if record:
        q.append(now)
    return None


def check(bucket: str, key: str, limit: int, window: int) -> int | None:
    """Like hit() but does not record (used for 'failed attempts' limits)."""
    return hit(bucket, key, limit, window, record=False)


def enforce(bucket: str, key: str, limit: int, window: int, record: bool = True) -> None:
    retry = hit(bucket, key, limit, window, record=record)
    if retry is not None:
        raise AppError(429, "RATE_LIMITED", "Too many requests. Please try again later.", headers={"Retry-After": str(retry)})


def client_ip_from_headers(headers: dict, scope) -> str:
    fwd = headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    client = scope.get("client")
    return client[0] if client else "unknown"


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
