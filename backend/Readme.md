# TENDA Backend

> **AI-Powered Business Intelligence API for Small Business Owners**

> 🆕 **New here or stuck?** Read **[FIXES-AND-SETUP.md](FIXES-AND-SETUP.md)** — a plain-English, step-by-step guide to running the app, plus a log of every change.
>
> 📜 **Building the frontend?** **[BACKEND_README.md](BACKEND_README.md)** is the API contract. This backend implements it; the differences are listed under [Deviations from the contract](#deviations-from-the-contract).
>
> 📈 **Going to production?** **[SCALABILITY.md](SCALABILITY.md)** lists every launch blocker, what's done, what's left, and the go-live checklist.

TENDA is a FastAPI backend that gives small business owners an AI assistant in their pocket: log sales by typing or by voice, keep a customer list, get told who is due to buy again, see dashboards and insights, and ask questions about the business in plain English or Pidgin.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Endpoints](#endpoints)
- [Conventions every endpoint follows](#conventions-every-endpoint-follows)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Database & migrations](#database--migrations)
- [⚠️ Deploying on Render: data loss risk](#️-deploying-on-render-data-loss-risk)
- [Deviations from the contract](#deviations-from-the-contract)
- [Contributing](#contributing)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12) |
| Database ORM | [SQLAlchemy 2.0](https://docs.sqlalchemy.org/) — fully async |
| Database | PostgreSQL via `asyncpg` + Alembic in production; SQLite via `aiosqlite` for local development |
| Data Validation | [Pydantic v2](https://docs.pydantic.dev/latest/) |
| AI / Multimodal | [Google GenAI SDK](https://ai.google.dev/) — `gemini-2.5-flash`, fallback `gemini-2.5-flash-lite` |
| Authentication | JWT (`pyjwt`) access tokens + rotating refresh tokens, `bcrypt` (cost 12) |
| Timezone | `zoneinfo` + `tzdata` — every "today / this week / this month" is computed in **Africa/Lagos** |
| Audio checks | Python `wave` + `mutagen` (size, duration, silence) before anything is sent to the AI |

### Native multimodal voice — one Gemini call per recording

Audio is uploaded to Gemini with `.files.upload()` and **one** `generate_content` call returns everything at once, as JSON enforced by a schema:

- the **transcript**,
- whether there was **any speech at all** (→ `422 NO_SPEECH`),
- the **sale draft** (product, quantity, price, customer, "yesterday"…) or the **answer** to a spoken question,
- a **confidence** score.

There is no separate speech-to-text step (no Whisper, no Google STT).

---

## Architecture

```
TENDA-api/
├── core/
│   ├── config.py          # Settings (reads .env)
│   ├── database.py        # Async engine + session dependency
│   ├── migrations.py      # Idempotent startup migrations (transactions → sales, emails, …)
│   ├── errors.py          # One error envelope: {"detail", "code"}
│   ├── middleware.py      # X-Request-ID, Cache-Control, JSON 500s that keep CORS headers
│   ├── ratelimit.py       # In-memory rate limits
│   ├── clock.py           # UTC storage + Africa/Lagos business-time helpers
│   ├── phone.py           # Nigerian phone numbers → E.164
│   └── security.py        # bcrypt, JWT, token hashing
├── models/                # SQLAlchemy tables (users, products, customers, sales, …)
├── schemas/               # Pydantic request/response shapes (the JSON contract)
├── services/
│   ├── userdata.py        # Loads ONE user's data — the single place tenant isolation lives
│   ├── followup_engine.py # Pure follow-up prediction + customer status (§19.3–19.4)
│   ├── analytics_service.py, insight_service.py, notification_service.py
│   ├── sale_service.py, customer_service.py, product_service.py, business_service.py
│   ├── ai_context.py      # Builds the per-user data block for every AI prompt
│   ├── ai_service.py      # Chat, conversations, daily briefing
│   ├── voice_service.py   # Voice sale drafts & voice questions
│   ├── audio.py           # Audio sniffing / size / duration / silence checks
│   └── gemini.py          # The only place that talks to Gemini (retries, fallback, 503s)
├── routers/               # Thin HTTP layer, one file per area
├── scripts/               # acceptance.py (§24) + run_acceptance.py
├── tests/                 # pytest suite
└── main.py                # App, CORS, middleware, routers
```

---

## Endpoints

Interactive docs: **http://127.0.0.1:8000/docs**. All routes except `/health`, `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password` need `Authorization: Bearer <token>`.

| Area | Endpoints |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/register` · `POST /auth/login` (form: `username`=email, `password`) · `POST /auth/logout` · `POST /auth/refresh` · `GET/PATCH/DELETE /auth/me` · `POST /auth/change-password` · `POST /auth/forgot-password` · `POST /auth/reset-password` |
| Business profile | `GET /business/profile` · `PUT /business/profile` |
| Products | `GET/POST /products` · `POST /products/bulk` · `GET/PATCH/DELETE /products/{id}` |
| Customers | `GET/POST /customers` · `GET/PATCH/DELETE /customers/{id}` · `GET /customers/{id}/sales` |
| Sales | `GET/POST /sales` · `GET/PATCH/DELETE /sales/{id}` |
| Voice | `POST /voice/log-sale` (`?dry_run=true`) · `POST /voice/ask` · `GET /voice/sessions` · `GET/DELETE /voice/sessions/{id}` |
| Analytics | `GET /analytics/summary` · `GET /analytics/dashboard` · `GET /analytics/timeseries` · `GET /analytics/products` |
| Follow-ups | `GET /follow-ups` · `POST /follow-ups/{key}/done` · `…/snooze` · `…/dismiss` |
| Insights | `GET /insights` · `POST /insights/refresh` |
| AI | `POST /ai/chat` · `POST /ai/generate-summary` · `GET /ai/conversations` · `GET/PATCH/DELETE /ai/conversations/{id}` |
| Notifications | `GET /notifications` · `POST /notifications/read` · `DELETE /notifications/{id}` |
| Templates | `GET/POST /templates` · `PATCH/DELETE /templates/{id}` |

Field names, enums, status codes and error codes are exactly those in [BACKEND_README.md](BACKEND_README.md).

### Backward compatibility

- `POST /auth/login` still takes the OAuth2 **form** body (Swagger's *Authorize* button works).
- `POST /auth/register` still includes `"message": "User created successfully"` alongside the new token + user.
- `POST /voice/log-sale` without `dry_run` still saves the sale and still returns `product_name`, `quantity`, `amount`, `created_at`, `id`, `user_id` at the top level — plus the new `transcript`, `draft`, `sale`, etc.
- `GET /analytics/summary` keeps `total_revenue`, `total_transactions`, `top_products[{product_name,total_quantity,total_revenue}]` and only adds fields.

---

## Conventions every endpoint follows

| | |
|---|---|
| **Errors** | `{"detail": "...", "code": "NOT_FOUND"}`. Validation errors keep FastAPI's list in `detail` with human-readable `msg`s, plus `"code": "VALIDATION_ERROR"`. Provider errors are never leaked. |
| **CORS** | `http://localhost:3000`, `http://127.0.0.1:3000`, `https://tenda-delta.vercel.app` and Vercel previews `^https://tenda-[a-z0-9-]+\.vercel\.app$`. **Every** response carries the headers — including 401s and 500s. |
| **Money** | NGN, `NUMERIC(14,2)`, rounded half-up to 2 dp, JSON numbers. |
| **Time** | Stored in UTC, returned as ISO-8601 with `Z`; business periods in Africa/Lagos, weeks start Monday. |
| **IDs** | Opaque UUID strings. |
| **Lists** | `{"items", "total", "limit", "offset"}`; `limit` clamped to 1–200; `q` is literal (`%` and `_` are escaped). |
| **Isolation** | Another user's resource → `404`, never `403`. |
| **Idempotency** | `Idempotency-Key` on `POST /sales` and `POST /voice/log-sale` → same key replays the original response for 24 h; same key + different body → `409`. |
| **Headers** | `X-Request-ID` on every response; `Cache-Control: no-store` on every GET. |

---

## Getting Started

```bash
git clone https://github.com/Tolu8459/TENDA-api.git
cd TENDA-api
python -m venv venv
venv\Scripts\activate            # Windows   (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
fastapi dev main.py              # http://127.0.0.1:8000/docs
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ENVIRONMENT` | In production | `development` | `production` makes the app **refuse to start** with a weak `SECRET_KEY` or a local SQLite file |
| `SECRET_KEY` | **Yes** | – | ≥ 32 random bytes. `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GEMINI_API_KEY` | For AI features | – | Without it the app runs; AI routes return `503 AI_UNAVAILABLE`. |
| `DATABASE_URL` | No | `sqlite+aiosqlite:///./tenda.db` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | Access token lifetime (refresh tokens last 30 days). |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `30` | |
| `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` | No | `gemini-2.5-flash` / `gemini-2.5-flash-lite` | Fallback is used when the primary is overloaded. Empty = no fallback. |
| `LOG_PASSWORD_RESET_LINKS` | No | `false` | No email provider is wired yet. `true` writes reset links to the server log (local dev only). |
| `RATE_LIMIT_ENABLED` | No | `true` | |

> Never commit `.env`. It is in `.gitignore`.

---

## Testing

```bash
pip install -r requirements-dev.txt
python -m pytest                      # unit + API tests (no network, AI is faked)
python scripts/run_acceptance.py      # §24 acceptance script against a real server on a throwaway DB

# Same suite against PostgreSQL (the database is wiped):
TEST_DATABASE_URL=postgresql+asyncpg://user@localhost:5432/tenda_test python -m pytest
```

AI-dependent acceptance steps print **SKIP** (not PASS) when the server has no `GEMINI_API_KEY`.
Dependencies are pinned in `requirements.txt` and fully locked in `constraints.txt`.

---

## Database & migrations

**PostgreSQL (production):** on startup the app runs `alembic upgrade head` (versioned migrations in `alembic/versions/`). After changing a model: `alembic revision --autogenerate -m "…"`, review the file, commit. To move existing SQLite data: `python scripts/copy_sqlite_to_postgres.py tenda.db "<postgres url>"`.

**SQLite (local development):** on startup the app creates any missing tables, then runs `core/migrations.py`, which is safe to run every time:

1. Adds the new `users` columns (`public_id`, `full_name`, `timezone`, `needs_review`).
2. Lowercases emails. If two accounts collide, the **older** keeps the address and the newer is flagged `needs_review = 1` (nothing is deleted).
3. Creates a business profile for every user.
4. Copies every row of the old `transactions` table into `sales` (`source='voice'`, `unit_price = amount / quantity`, `sold_at = created_at`). **The `transactions` table is left untouched as a backup.** `/analytics/summary` returns the same totals before and after (covered by `tests/test_migration.py`).

---

## ⚠️ Deploying on Render: data loss risk

A SQLite file on a Render web service is **wiped on every deploy and restart** — every account, customer and sale would be lost. Use Postgres.

**Free setup (current):**

1. Create a free Postgres at **[neon.tech](https://neon.tech)** (doesn't expire; Render's free Postgres is deleted after 30 days). Copy the connection string exactly as Neon shows it — `?sslmode=require&channel_binding=require` is handled automatically.
2. Render → **New → Blueprint** → pick this repo. `render.yaml` creates a **free** web service, generates `SECRET_KEY` and sets `ENVIRONMENT=production`.
3. In the Render dashboard set `DATABASE_URL` (the Neon string) and, optionally, `GEMINI_API_KEY` (without it the AI features return `503 AI_UNAVAILABLE` and everything else works).
4. Free services sleep after 15 min idle. Add a free uptime ping (e.g. UptimeRobot) to `/health` every 10 min during business hours.
5. Have data in an old SQLite file? Copy it with `scripts/copy_sqlite_to_postgres.py tenda.db "<neon url>"`.

When you can pay, switch the web service to `starter` (no sleeping) — nothing else changes.

With `ENVIRONMENT=production` the app refuses to start on a local SQLite file, so this can't silently happen. The full go-live checklist is in [SCALABILITY.md](SCALABILITY.md#6-go-live-checklist).

---

## Deviations from the contract

Deliberate differences from [BACKEND_README.md](BACKEND_README.md):

1. **SQLite for local development, PostgreSQL in production** — `citext` → lowercased text + unique index; partial unique indexes are defined for both databases *and* checked in code for friendly 409s.
2. **Alembic on Postgres; idempotent startup migrations on SQLite** (§21.8) — the SQLite path exists to upgrade the original `tenda.db` (transactions → sales).
3. **Users keep an internal integer key**; the API exposes the UUID `public_id` as `user.id`.
4. **`/voice/log-sale` saved response** returns the new envelope *plus* the legacy top-level fields; `id` is now a UUID string (was an integer).
5. **Growth percentages are rounded to 1 decimal** as §19.1 says (the §12.2 example shows `20.71`).
6. **Customer `lapsed`** = no purchase in more than `max(90, 3 × typical interval)` days, consistent with the follow-up rule §19.3.7.
7. **Notifications are generated on read** (allowed by §16.2) — there is no background job.
8. **Insight `ai_narrative`** is only produced by `POST /insights/refresh` (then cached); `GET /insights` never calls the AI.
9. **WebM duration** can't be read without ffmpeg, so for WebM the 120 s limit uses the duration Gemini reports in the same call. WAV/MP3/M4A/OGG/FLAC are checked before the AI call. Silence is detected locally for WAV and by Gemini for other formats.
10. **Password reset emails are not sent** (no email provider). The token flow works; enable `LOG_PASSWORD_RESET_LINKS` for local testing.
11. **Rate limits are in-memory** (one process). Move to Redis if you run more than one instance.
12. **Phone search** matches digits only when the query has ≥ 3 digits.

---

## Contributing

1. **Keep everything async.** No blocking DB calls in request handlers.
2. **Pydantic at every boundary.** Every route has a `response_model`; inputs are validated with human-readable messages.
3. **Native multimodal only.** Send audio straight to Gemini via `services/gemini.py`; never add a separate transcription step.
4. **Every query filters by `user_id`.** Load data through `services/userdata.py` when you need a user's whole business.
5. Run `python -m pytest` and `python scripts/run_acceptance.py` before opening a PR.

<div align="center">

Built by the [TENDA TEAM] · Powered by FastAPI & Google Gemini

</div>
