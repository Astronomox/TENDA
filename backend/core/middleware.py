"""Request context middleware (pure ASGI).

It sits *inside* CORSMiddleware, so even unhandled exceptions are turned into a
JSON 500 that still passes back through CORS (§3.2). Starlette's own
ServerErrorMiddleware sits outside CORS, which is why the default behaviour
makes browsers report a CORS error instead of the 500.
"""
import json
import logging
import re
import time
import uuid

from core import ratelimit
from core.errors import INTERNAL_ERROR_BODY

logger = logging.getLogger("tenda")
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,128}$")


class RequestContextMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
        incoming = headers.get("x-request-id", "")
        request_id = incoming if _SAFE_REQUEST_ID.match(incoming) else uuid.uuid4().hex
        scope.setdefault("state", {})["request_id"] = request_id
        method = scope["method"]
        started = time.perf_counter()
        response_started = False
        status_holder = {"status": 500}

        async def send_wrapper(message):
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
                status_holder["status"] = message["status"]
                extra = [(b"x-request-id", request_id.encode())]
                if method == "GET":
                    extra.append((b"cache-control", b"no-store"))
                message["headers"] = list(message.get("headers", [])) + extra
            await send(message)

        # §21.4 "everything else: 300 / min" — keyed by token if present, else IP.
        if method != "OPTIONS":
            key = headers.get("authorization") or ratelimit.client_ip_from_headers(headers, scope)
            retry = ratelimit.hit("global", key, limit=300, window=60)
            if retry is not None:
                await _send_json(send_wrapper, 429, {"detail": "Too many requests. Please slow down.", "code": "RATE_LIMITED"},
                                 [(b"retry-after", str(retry).encode())])
                return

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            logger.exception("unhandled error", extra={"request_id": request_id, "path": scope.get("path")})
            if response_started:
                raise
            await _send_json(send_wrapper, 500, INTERNAL_ERROR_BODY)
        finally:
            logger.info(
                "request",
                extra={
                    "request_id": request_id,
                    "method": method,
                    "path": scope.get("path"),
                    "status": status_holder["status"],
                    "latency_ms": round((time.perf_counter() - started) * 1000, 1),
                },
            )


async def _send_json(send, status: int, body: dict, extra_headers: list | None = None):
    payload = json.dumps(body).encode()
    await send({
        "type": "http.response.start",
        "status": status,
        "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(payload)).encode())] + (extra_headers or []),
    })
    await send({"type": "http.response.body", "body": payload})
