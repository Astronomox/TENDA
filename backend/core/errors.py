"""One error envelope for the whole API (§2.6): {"detail": ..., "code": ...}."""
import logging
import re

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("tenda")

STATUS_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    503: "AI_UNAVAILABLE",
}


class AppError(Exception):
    """Raise from anywhere to return {"detail", "code", **extra}."""

    def __init__(self, status_code: int, code: str, detail, headers: dict | None = None, extra: dict | None = None):
        self.status_code = status_code
        self.code = code
        self.detail = detail
        self.headers = headers
        self.extra = extra or {}


def not_found(what: str = "Resource") -> AppError:
    return AppError(404, "NOT_FOUND", f"{what} not found")


def field_error(loc: list, msg: str) -> AppError:
    """A 422 shaped exactly like FastAPI's validation errors."""
    return AppError(422, "VALIDATION_ERROR", [{"loc": loc, "msg": msg, "type": "value_error"}])


def unauthenticated(detail: str = "Could not validate credentials") -> AppError:
    return AppError(401, "UNAUTHENTICATED", detail, headers={"WWW-Authenticate": "Bearer"})


# --- human-readable validation messages ----------------------------------

def _field_label(loc) -> str:
    for part in reversed(loc):
        if isinstance(part, str) and part not in ("body", "query", "path", "form", "header"):
            return part.replace("_", " ").capitalize()
    return "Value"


def _humanize(err: dict) -> str:
    etype = err.get("type", "")
    loc = err.get("loc", ())
    ctx = err.get("ctx") or {}
    label = _field_label(loc)
    msg = err.get("msg", "Invalid value")

    if etype == "missing":
        return f"{label} is required"
    if etype == "value_error":
        if "email" in label.lower():
            return "Enter a valid email address"
        return re.sub(r"^Value error, ", "", msg)
    if etype == "assertion_error":
        return re.sub(r"^Assertion failed, ", "", msg)
    if etype in ("greater_than_equal", "greater_than"):
        bound = ctx.get("ge", ctx.get("gt"))
        if bound in (0, 0.0) and etype == "greater_than_equal":
            return f"{label} can't be negative"
        word = "at least" if etype == "greater_than_equal" else "greater than"
        return f"{label} must be {word} {bound}"
    if etype in ("less_than_equal", "less_than"):
        bound = ctx.get("le", ctx.get("lt"))
        word = "at most" if etype == "less_than_equal" else "less than"
        return f"{label} must be {word} {bound}"
    if etype == "string_too_short":
        if ctx.get("min_length") == 1:
            return f"{label} can't be empty"
        return f"{label} must be at least {ctx.get('min_length')} characters"
    if etype == "string_too_long":
        return f"{label} must be at most {ctx.get('max_length')} characters"
    if etype == "too_short":
        return f"Add at least {ctx.get('min_length')} item(s)"
    if etype == "too_long":
        return f"No more than {ctx.get('max_length')} items are allowed"
    if etype in ("int_type", "int_parsing", "int_from_float"):
        return f"{label} must be a whole number"
    if etype in ("float_type", "float_parsing", "finite_number", "decimal_type", "decimal_parsing"):
        return f"{label} must be a number"
    if etype in ("bool_type", "bool_parsing"):
        return f"{label} must be true or false"
    if etype in ("string_type",):
        return f"{label} must be text"
    if etype in ("literal_error", "enum"):
        return f"{label} must be one of: {ctx.get('expected', '')}".rstrip(": ")
    if etype in ("datetime_type", "datetime_parsing", "datetime_from_date_parsing"):
        return f"{label} must be a valid date and time (ISO-8601)"
    if etype in ("date_type", "date_parsing", "date_from_datetime_parsing"):
        return f"{label} must be a date in YYYY-MM-DD format"
    if etype == "json_invalid":
        return "Request body is not valid JSON"
    if etype == "extra_forbidden":
        return f"Unknown field: {label}"
    return msg


def _clean_validation_errors(errors) -> list[dict]:
    out = []
    for err in errors:
        out.append({"loc": list(err.get("loc", [])), "msg": _humanize(err), "type": err.get("type", "value_error")})
    return out


# --- handlers --------------------------------------------------------------

def _json(status_code: int, body: dict, headers: dict | None = None) -> JSONResponse:
    return JSONResponse(status_code=status_code, content=body, headers=headers)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        body = {"detail": exc.detail, "code": exc.code, **exc.extra}
        return _json(exc.status_code, body, exc.headers)

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(request: Request, exc: StarletteHTTPException):
        code = STATUS_CODES.get(exc.status_code, "BAD_REQUEST" if exc.status_code < 500 else "INTERNAL")
        detail = exc.detail
        if exc.status_code == 401 and detail == "Not authenticated":
            detail = "Not authenticated. Please log in."
        return _json(exc.status_code, {"detail": detail, "code": code}, getattr(exc, "headers", None))

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return _json(422, {"detail": _clean_validation_errors(exc.errors()), "code": "VALIDATION_ERROR"})


INTERNAL_ERROR_BODY = {"detail": "Something went wrong on our side. Please try again.", "code": "INTERNAL"}
