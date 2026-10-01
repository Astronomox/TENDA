import uuid

from sqlalchemy import Numeric

from core import clock


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow():
    # Wrapped so tests can freeze time via core.clock.now
    return clock.now()


# NUMERIC(14,2). asdecimal=False returns floats (SQLite has no native decimal
# type); values are rounded half-up to 2 dp before they are written.
Money = Numeric(14, 2, asdecimal=False)
