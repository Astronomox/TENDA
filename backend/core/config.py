from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_SECRETS = {"", "change-me", "secret", "changeme"}


class Settings(BaseSettings):
    # "production" turns on the startup safety checks (see validate_for_production)
    environment: str = "development"

    database_url: str = "sqlite+aiosqlite:///./tenda.db"
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    # §4.6 Option B: short access token + rotating refresh token
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    password_reset_expire_minutes: int = 30

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    # Used when the primary model is overloaded (§21.3). Empty = no fallback.
    gemini_fallback_model: str = "gemini-2.5-flash-lite"
    ai_timeout_seconds: int = 60

    # §3 CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://tenda-delta.vercel.app",
    ]
    cors_origin_regex: str = r"^https://tenda-[a-z0-9-]+\.vercel\.app$"

    # No email provider is wired up yet. When true, password-reset links are
    # written to the server log so they can be used in local development.
    log_password_reset_links: bool = False
    password_reset_url: str = "http://localhost:3000/reset-password"

    rate_limit_enabled: bool = True
    app_version: str = "1.4.0"

    # Reads from the .env file in the root directory
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("database_url")
    @classmethod
    def _async_driver(cls, v: str) -> str:
        """Accept the URL exactly as Render/Neon/Supabase print it.

        - postgres:// or postgresql:// -> postgresql+asyncpg://
        - asyncpg rejects libpq-only query params: `sslmode=X` becomes `ssl=X`,
          `channel_binding` is dropped (Neon adds both).
        """
        if v.startswith("postgres://"):
            v = "postgresql+asyncpg://" + v[len("postgres://"):]
        elif v.startswith("postgresql://"):
            v = "postgresql+asyncpg://" + v[len("postgresql://"):]
        if v.startswith("postgresql+asyncpg://") and "?" in v:
            base, query = v.split("?", 1)
            params = []
            for pair in query.split("&"):
                key, _, value = pair.partition("=")
                if key == "channel_binding" or not key:
                    continue
                params.append(f"ssl={value}" if key == "sslmode" else pair)
            v = base + ("?" + "&".join(params) if params else "")
        return v

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in ("production", "prod")

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    def startup_problems(self) -> list[str]:
        """Settings that are unsafe for real users. Fatal in production."""
        problems = []
        if self.secret_key in INSECURE_SECRETS or len(self.secret_key.encode()) < 32:
            problems.append("SECRET_KEY is missing, a placeholder, or shorter than 32 bytes")
        if self.is_sqlite and "/var/data/" not in self.database_url:
            problems.append(
                "DATABASE_URL points at a local SQLite file; on Render this is wiped on every deploy/restart "
                "(use Postgres, or a persistent disk mounted at /var/data)"
            )
        return problems

settings = Settings()
