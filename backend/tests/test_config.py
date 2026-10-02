import asyncio

import pytest

from core.config import Settings


def make(**kw) -> Settings:
    return Settings(_env_file=None, **kw)


def test_render_postgres_url_gets_async_driver():
    assert make(database_url="postgres://u:p@h:5432/db").database_url == "postgresql+asyncpg://u:p@h:5432/db"
    assert make(database_url="postgresql://u:p@h/db").database_url == "postgresql+asyncpg://u:p@h/db"
    assert make(database_url="sqlite+aiosqlite:///./x.db").is_sqlite
    # Neon / Supabase connection strings work as pasted
    neon = "postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    assert make(database_url=neon).database_url == "postgresql+asyncpg://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?ssl=require"
    assert make(database_url="postgres://u:p@h/db?channel_binding=require").database_url == "postgresql+asyncpg://u:p@h/db"


def test_startup_problems():
    strong = "x" * 40
    assert make(secret_key="change-me", database_url="postgresql://h/db").startup_problems() == [
        "SECRET_KEY is missing, a placeholder, or shorter than 32 bytes"]
    assert len(make(secret_key="short", database_url="postgresql://h/db").startup_problems()) == 1
    assert "SQLite" in make(secret_key=strong, database_url="sqlite+aiosqlite:///./tenda.db").startup_problems()[0]
    assert make(secret_key=strong, database_url="sqlite+aiosqlite:////var/data/tenda.db").startup_problems() == []
    assert make(secret_key=strong, database_url="postgresql://h/db").startup_problems() == []


def test_production_refuses_to_start_with_unsafe_config(monkeypatch):
    import main

    monkeypatch.setattr(main, "settings", make(environment="production", secret_key="change-me"))

    async def start():
        async with main.lifespan(main.app):
            pass

    with pytest.raises(RuntimeError, match="Unsafe production configuration"):
        asyncio.run(start())
