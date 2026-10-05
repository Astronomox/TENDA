# Frontend architecture

- **Framework**: Next.js App Router, React 19, Tailwind CSS v4.
- **Backend**: the TENDA FastAPI service (Render, Postgres on Neon). The browser
  calls it directly (CORS), with a Bearer token stored in `localStorage`.

## Key modules

| Path | Responsibility |
|---|---|
| `lib/api.ts` | Typed client for every backend endpoint, errors, retries, idempotency keys; `requestStream` for streamed responses |
| `lib/auth.ts` | Token storage, expiry, the `tenda_session` cookie, redirect to login (`location.replace`) |
| `lib/hooks.ts` | `useResource` data loading with an in-memory cache; `invalidate(prefix)` after writes |
| `lib/format.ts` | Naira, Lagos dates, phone and WhatsApp link helpers |
| `lib/useRecorder.ts` | MediaRecorder wrapper; measures mic level so silent recordings are not sent |
| `lib/pcmPlayer.ts` | Plays raw PCM from `/voice/speak/stream` chunk by chunk (Web Audio) |
| `proxy.ts` | Redirects signed-out visitors from app URLs to `/login?next=…` before render |
| `components/AuthGate.tsx` | Browser-side session check; re-checks pages restored by the Back button |
| `components/ConfirmDialog.tsx` | `ConfirmProvider` + `useConfirm()`: in-app confirmations (no `window.confirm`) |
| `components/MobileNav.tsx` | Phone bottom bar and "More" sheet (desktop uses the sidebar in the dashboard layout) |
| `components/Logo.tsx` | Brand mark + wordmark; images in `public/brand` |
| `components/landing/*` | Marketing landing page |

## Signing in and out

1. Login/signup store the access and refresh tokens and set a `tenda_session` cookie.
2. `proxy.ts` lets app URLs through only with that cookie; `AuthGate` then checks the real token.
3. Logout or expiry clears both and replaces the page, so Back can't show the app again.

## Voice

1. `useRecorder` records; recordings with no voice are dropped in the browser.
2. `POST /voice/ask` transcribes and either answers or records the spoken sale
   (`intent: "log_sale"`); after a saved sale the sales/analytics caches are invalidated.
3. The answer is spoken with `POST /voice/speak/stream` (Gemini voice, raw 24 kHz PCM)
   played by `PcmStreamPlayer`; if that fails, the browser's own voice is used.

## Pending-backend states

If an endpoint returns FastAPI's default `404 Not Found`, screens show a
"coming soon" card instead of an error, so the UI degrades gracefully while
the backend catches up.
