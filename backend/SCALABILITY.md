# TENDA — Scalability & Enterprise-Readiness Plan

> What it takes to go from "works on my machine" to "safe for thousands of businesses' money and customer data".
> Written 2 October 2026 after an audit of this codebase. Each item says **why it matters**, **what to do**, and its **status**.

**Status key:** ✅ done · 🟡 done in code, needs an action from you · ⛔ blocked on a decision/account · ⬜ not started

---

## Contents

1. [Where the system stands today](#1-where-the-system-stands-today)
2. [Tier 1 — Launch blockers](#2-tier-1--launch-blockers-before-any-real-user)
3. [Tier 2 — Before growth](#3-tier-2--before-growth-hundreds-of-active-businesses)
4. [Tier 3 — Enterprise](#4-tier-3--enterprise-customers)
5. [Smaller gaps found in the audit](#5-smaller-gaps-found-in-the-audit)
6. [Go-live checklist](#6-go-live-checklist)
7. [Runbook: common operations](#7-runbook-common-operations)

---

## 1. Where the system stands today

| Area | State |
|---|---|
| API surface | All 58 endpoints of `BACKEND_README.md` implemented |
| Tests | 75 automated tests, passing on **SQLite and PostgreSQL 17**; §24 acceptance script 15 pass / 0 fail / 2 skipped (AI) |
| Database | SQLite locally; **PostgreSQL-ready** (Alembic, connection pool, copy script, Render blueprint) |
| Deployment | Single process on Render; in-memory rate limits & caches |
| AI | Gemini via one service with retry + fallback model; **never exercised with a real key yet** |

### Rough capacity of the current design

| Bottleneck | Comfortable up to | Why |
|---|---|---|
| SQLite (if kept) | ~1 writer at a time | One write lock for the whole file; concurrent sales can hit "database is locked" |
| Per-request "load all sales" (see T2-1) | ~5–10k sales per business | Dashboard, customers, follow-ups, insights and AI load every sale of the user on each call |
| One Render instance | a few hundred concurrent users | Rate limits & caches live in process memory, so you can't add a 2nd instance yet |

---

## 2. Tier 1 — Launch blockers (before any real user)

### T1-1 · Data stored on a disk that is wiped — 🟡

**Why:** `tenda.db` is a file. Render erases the server disk on every deploy and restart → every account, customer and sale is lost. SQLite also allows only one writer at a time.

**Done:**
- App runs on PostgreSQL (`asyncpg`), with a connection pool (`pool_pre_ping`, recycle).
- **Alembic** versioned migrations (`alembic/versions/0001_baseline_schema.py`), applied automatically at startup on Postgres.
- Render's `postgres://` URLs are auto-converted to the async driver.
- Partial unique indexes defined for both SQLite and Postgres.
- `scripts/copy_sqlite_to_postgres.py` copies an existing SQLite file into an empty Postgres in one transaction and prints row counts from both sides.
- Whole test suite and acceptance script run green against a real PostgreSQL 17.
- `render.yaml` blueprint creates the API **and** a managed Postgres and wires `DATABASE_URL`.

**You do (free setup, current stage):** create a free **Neon** Postgres (doesn't expire), apply the blueprint (Render → New → Blueprint, free web plan), and paste the Neon URL as `DATABASE_URL`. Neon's `sslmode`/`channel_binding` params are converted for asyncpg automatically. Don't use Render's free Postgres for customer data — it is deleted after 30 days.

**Free-tier limits to know:** the web service sleeps after 15 min idle (~1 min cold start; mitigate with an uptime ping to `/health`); Neon free has 0.5 GB storage and its compute pauses when idle (first query after a pause takes a second or two); free Neon backups are short-retention point-in-time history only — take a weekly `pg_dump` (see Runbook) until you upgrade.

### T1-2 · No backups / restore plan — 🟡

**Why:** one bad migration or a mistaken delete is permanent.

**On the free setup:** Neon keeps a short restore window only. Run the weekly `pg_dump` from the Runbook and keep the file somewhere safe (Google Drive is fine).
**When on a paid database:**
1. Confirm automatic backups are listed (Neon → *Restore*, or Render → database → *Recovery*).
2. Do one **restore drill** before launch (restore to a new database, point a staging copy at it, log in).
3. For point-in-time recovery (undo "5 minutes ago"), use a higher Postgres plan.
4. Optional extra safety: a weekly `pg_dump` to cloud storage (see [Runbook](#7-runbook-common-operations)).

### T1-3 · Production could start with an insecure secret — ✅

**Why:** with no `SECRET_KEY` the app used `change-me` → anyone could forge a login.

**Done:** with `ENVIRONMENT=production` the app **refuses to start** if `SECRET_KEY` is missing/short/a placeholder, or if `DATABASE_URL` is a local SQLite file (unless on a persistent disk at `/var/data`). Tested in `tests/test_config.py`. The blueprint generates a strong `SECRET_KEY` automatically.

### T1-4 · Unpinned dependencies — ✅

**Why:** `pip install` pulled "latest" of everything; any upstream release could break production on the next deploy.

**Done:** every top-level package pinned to the exact version that passed the tests (`requirements.txt`), and the full dependency tree locked in `constraints.txt`. `runtime.txt` and the blueprint pin Python 3.12.3.

### T1-5 · Customer data sent to Gemini's free tier — ⛔ needs your decision

**Why:** the AI prompt contains customer names and sales. On Google's **free** Gemini API tier, Google may use prompts to improve its products. Under the Nigeria Data Protection Act (NDPA) that needs a lawful basis and disclosure.

**What is already minimised:** phone numbers and emails are **not** sent to the AI; each prompt contains only the current user's data.
**You do:**
1. Use a **billed** Gemini API project (paid tier data isn't used for training) or Vertex AI.
2. Publish a privacy policy that names Google as an AI processor.
3. Keep the key only in Render's environment, never in the repo.

### T1-6 · No error tracking or alerting — ⬜ (Sentry removed by decision)

**Why:** without it, failures are discovered by customers.

**Today:** unhandled errors are written to the structured JSON logs with a request ID (visible in Render → Logs) and the client gets a clean `500 INTERNAL`. Nobody is alerted. A Sentry integration was built and then removed at the owner's request.
**You do (minimum):**
1. Use Render's log alerts, or add any error tracker later (Sentry, Better Stack, Rollbar) — the hook point is the `except` block in `core/middleware.py`.
2. Create an uptime monitor (UptimeRobot / Better Stack, free) on `https://<your-api>/health` every 5 min with email/WhatsApp alerts. This also keeps a sleeping instance warm.

### T1-7 · AI path never run for real — ⛔ needs your Gemini key

**Why:** chat, voice sales, voice questions, briefings and the insights narrative have only been tested with a fake Gemini. Browsers send WebM (Chrome/Android) and M4A (Safari/iOS); if Gemini rejects either, the server needs `ffmpeg` to convert audio.
**You do:** set `GEMINI_API_KEY`, then run `python scripts/run_acceptance.py` (step 6 will run) and record one real sale on Chrome and one on an iPhone.

### T1-8 · Database file tracked in git — ✅

**Done:** `tenda.db` removed from git tracking (`git rm --cached`; the file stays on disk) and `*.db` is in `.gitignore`.
**Note:** older commits still contain the old `tenda.db` (one test account). If that matters, rewrite history with `git filter-repo` — destructive, coordinate with everyone who has cloned the repo.

---

## 3. Tier 2 — Before growth (hundreds of active businesses)

### T2-1 · Every request loads the user's entire sales history — ⬜ (most important)

**Why:** `services/userdata.py` loads **all** non-deleted sales of a user and the dashboard, customer list, follow-ups, insights, notifications and AI context compute in Python. Correct and fast at 1k sales; slow at 50k+.
**Do:**
1. Move totals/periods/top-products to SQL `SUM … GROUP BY` with date bounds (indexes `(user_id, sold_at)` already exist).
2. Store follow-up predictions in a `follow_up_predictions` table, recomputed per `(customer, product)` when a sale is created/edited/deleted, instead of recomputing everything per request.
3. Add a short per-user cache (Redis, invalidated on write) for the dashboard and AI context.

### T2-2 · Money summed as floats — ⬜

**Why:** amounts are stored as `NUMERIC(14,2)` but read as floats and summed in Python; results are rounded so they're right today, but finance-grade code uses `Decimal` end-to-end.
**Do:** switch `Money` to `asdecimal=True`, use `Decimal` in services, serialise to JSON numbers at the edge. Add property tests for rounding.

### T2-3 · No audit trail — ⬜

**Why:** a sale can be edited or deleted with no record of the old value, who, or when. Accountants, disputes and staff accounts all need this.
**Do:** `audit_log(id, user_id, actor_id, entity, entity_id, action, before jsonb, after jsonb, request_id, at)` written in the same transaction as every create/update/delete on sales, customers and products. Read-only endpoint for the owner.

### T2-4 · No CI pipeline — ⬜

**Do:** GitHub Actions on every PR: `pytest` on SQLite **and** a Postgres service container, `ruff` (lint), `mypy` (types), `pip-audit` (known vulnerabilities), and an Alembic check that models and migrations match (`alembic check`). Protect `main` so red builds can't merge. Turn on Dependabot.

### T2-5 · No staging environment — ⬜

**Do:** a second Render service + database (`ENVIRONMENT=staging`) deploying from a `staging` branch, with its own Gemini key. Every migration runs on staging first.

### T2-6 · No email verification / no email at all — ⛔ pick a provider

**Why:** anyone can register someone else's email; "forgot password" can't send its link.
**Do:** integrate Resend / SendGrid / Mailgun; send verify-email on signup (limit features until verified) and the reset link. Configure SPF/DKIM on your domain.

### T2-7 · Housekeeping only at startup; no background worker — ⬜

**Why:** `idempotency_keys` and `refresh_tokens` grow forever; notifications are generated on read; AI calls (up to 15 s) run inside the web request.
**Do:** a Render cron job (or worker) that: purges idempotency keys > 24 h, expired/revoked tokens, notifications > 60 days; generates the 08:00 Lagos notifications; precomputes follow-ups. Later, move AI calls to a queue.

### T2-8 · Security hardening — ⬜

- Response headers: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`.
- Enforce the 256 KB JSON body limit (§2.10) — not enforced today.
- Hide or password-protect `/docs` in production.
- Request timeouts at the proxy; max upload enforced before reading (already 10 MB for audio).
- Lock down `ALLOWED_ORIGINS` per environment.

### T2-9 · In-memory rate limits & caches — ⬜

**Why:** they reset on restart and are not shared between instances, so you can't scale horizontally.
**Do:** Redis (Render Key Value) for rate limits, the AI briefing cache and the insights narrative cache. Then run 2+ instances.

### T2-10 · Database operations — ⬜

- Connection pooling via PgBouncer when instances × pool size approaches the plan's connection limit.
- Slow-query logging (`log_min_duration_statement`) and a monthly index review.
- Read replica for analytics if dashboards dominate load.

---

## 4. Tier 3 — Enterprise customers

| # | Item | Notes |
|---|---|---|
| T3-1 | **Staff accounts & roles** (owner, manager, cashier) | Today one login = one business. Needs `businesses` + `memberships` tables and `business_id` on every row — a contract change; plan early. |
| T3-2 | **Data export** ("download all my data") | NDPA right of access. Account deletion already exists. CSV/JSON export job + email link. |
| T3-3 | **httpOnly cookie sessions** | The frontend contract stores tokens in `localStorage`; any XSS bug can steal them. Cookies + CSRF protection are safer. |
| T3-4 | **Generated TypeScript client** | Publish `openapi.json` per release; generate the frontend client so the two can't drift. Add contract tests. |
| T3-5 | **Load testing** | k6/Locust scenarios: login storm, 50 concurrent sale posts, dashboard at 50k sales. Set SLOs (p95 < 300 ms non-AI). |
| T3-6 | **Runbook, on-call, incident process** | Who gets paged, how to roll back, how to restore, how to tell customers. |
| T3-7 | **2FA** | TOTP for owners. |
| T3-8 | **Refunds & returns** | Out of scope in v1 (§22.9); needs negative-amount or `refunds` table and reporting changes. |
| T3-9 | **Multi-currency** | Only NGN today. |
| T3-10 | **Metrics & tracing** | Request latency/error rate per route, AI failure rate, voice confidence distribution (§21.7); OpenTelemetry or a hosted APM. |
| T3-11 | **API versioning** | Introduce `/v1` while keeping unversioned routes alive. |

---

## 5. Smaller gaps found in the audit

| Item | Status |
|---|---|
| Phonetic name matching for voice ("Aminat" ≈ "Amina") — only spelling distance ≤ 2 + first name today | ⬜ |
| Login rate limit counts **failed** attempts only (spec says 10 attempts / 15 min) | ⬜ decide |
| Dead code: `services/transaction_service.py`, `schemas/transaction.py` | ⬜ delete |
| WebM duration comes from Gemini (no ffmpeg) | ⬜ add ffmpeg if Gemini rejects WebM |
| Password-reset email not sent (no provider) | ⛔ T2-6 |
| Per-user timezone column exists but no endpoint to change it | ⬜ |

---

## 6. Go-live checklist

- [ ] Blueprint applied; API healthy at `/health` with `"db": "ok"`
- [ ] `ENVIRONMENT=production` (app refuses to start with unsafe config)
- [ ] `GEMINI_API_KEY` set on a **billed** project; privacy policy published
- [ ] Acceptance script passes against staging with **0 skipped**
- [ ] Real voice sale recorded on Chrome **and** iPhone
- [ ] Someone checks Render logs / log alerts for `unhandled error`
- [ ] Uptime monitor on `/health` with alerts
- [ ] Backups visible; one restore drill done
- [ ] Old SQLite data copied with `scripts/copy_sqlite_to_postgres.py` (if any)
- [ ] Frontend `NEXT_PUBLIC_API_URL` points at the new service; CORS origin list correct

---

## 7. Runbook: common operations

**Create a new migration after changing a model**
```bash
alembic revision --autogenerate -m "describe the change"   # with DATABASE_URL pointing at a dev Postgres
# review the generated file in alembic/versions/, then commit; it runs on next deploy
```

**Copy SQLite data into Postgres**
```bash
python scripts/copy_sqlite_to_postgres.py tenda.db "postgresql://USER:PASS@HOST:5432/DB"
```

**Manual backup / restore**
```bash
pg_dump  "$DATABASE_URL" -Fc -f tenda-$(date +%F).dump
pg_restore --clean --no-owner -d "$TARGET_DATABASE_URL" tenda-YYYY-MM-DD.dump
```

**Run the test suite against Postgres** (the database is wiped)
```bash
TEST_DATABASE_URL=postgresql+asyncpg://user@localhost:5432/tenda_test python -m pytest
```

**Acceptance test against a fresh database**
```bash
python scripts/run_acceptance.py                              # throwaway SQLite
ACCEPTANCE_DATABASE_URL=postgresql://... python scripts/run_acceptance.py   # empty Postgres
```
