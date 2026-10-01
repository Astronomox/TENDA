import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path

import pytest

# Configure BEFORE the app is imported: isolated database, no real AI key.
_TMP = Path(tempfile.mkdtemp(prefix="tenda_tests_"))
# TEST_DATABASE_URL lets the same suite run against Postgres (it is wiped!).
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite+aiosqlite:///{(_TMP / 'test.db').as_posix()}"
os.environ["GEMINI_API_KEY"] = ""
os.environ["SECRET_KEY"] = "test-secret-key-that-is-at-least-32-bytes-long"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from core import clock, ratelimit  # noqa: E402
from core.database import Base, engine  # noqa: E402
from services import ai_service, insight_service  # noqa: E402


@pytest.fixture(scope="session")
def _app_client():
    with TestClient(main.app, raise_server_exceptions=False) as c:
        yield c


async def _reset_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest.fixture
def client(_app_client):
    _app_client.portal.call(_reset_db)
    ratelimit.reset()
    ai_service.clear_caches()
    insight_service.clear_caches()
    _app_client.headers.clear()
    yield _app_client


@pytest.fixture
def freeze(monkeypatch):
    """freeze("2026-10-01T10:00:00") pins core.clock.now (naive UTC)."""
    def _freeze(value: str | datetime):
        dt = datetime.fromisoformat(value) if isinstance(value, str) else value
        monkeypatch.setattr(clock, "now", lambda: dt)
        return dt
    return _freeze


def register(client, email="owner@test.com", password="Passw0rd!", **extra) -> dict:
    r = client.post("/auth/register", json={"email": email, "password": password, **extra})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def owner(client):
    return register(client, full_name="Ada Owner", business_name="Ada Store")


class FakeAI:
    """Records what would have been sent to Gemini and returns canned output."""

    def __init__(self):
        self.calls: list[dict] = []
        self.text = "Here is your answer."
        self.extraction = None
        self.voice_answer = None

    async def generate_text(self, system_instruction, contents, purpose, user_id=None):
        self.calls.append({"system": system_instruction, "contents": contents, "purpose": purpose})
        return self.text

    async def extract_sale_from_audio(self, audio, mime_type, suffix, prompt, user_id=None):
        self.calls.append({"prompt": prompt, "mime_type": mime_type, "purpose": "voice_log_sale"})
        return self.extraction

    async def answer_from_audio(self, audio, mime_type, suffix, system_instruction, prompt, user_id=None):
        self.calls.append({"prompt": prompt, "system": system_instruction, "purpose": "voice_ask"})
        return self.voice_answer


@pytest.fixture
def fake_ai(monkeypatch):
    from services.gemini import gemini_service

    fake = FakeAI()
    for name in ("generate_text", "extract_sale_from_audio", "answer_from_audio"):
        monkeypatch.setattr(gemini_service, name, getattr(fake, name))
    return fake
