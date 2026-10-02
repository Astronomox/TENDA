# Frontend architecture

- **Framework**: Next.js App Router, React 19, Tailwind CSS v4.
- **Backend**: the TENDA FastAPI service. The browser calls it directly (CORS),
  with a Bearer token stored in `localStorage`.

## Key modules

| Path | Responsibility |
|---|---|
| `lib/api.ts` | Typed client for every backend endpoint, errors, retries, idempotency keys |
| `lib/auth.ts` | Token storage, expiry, redirect to login |
| `lib/hooks.ts` | `useResource` data loading with an in-memory cache |
| `lib/format.ts` | Naira, Lagos dates, phone and WhatsApp link helpers |
| `components/AuthGate.tsx` | Client-side route guard for the dashboard |
| `components/landing/*` | Marketing landing page |

## Pending-backend states

If an endpoint returns FastAPI's default `404 Not Found`, screens show a
"coming soon" card instead of an error, so the UI degrades gracefully while
the backend catches up.
