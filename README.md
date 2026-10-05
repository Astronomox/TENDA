# Tenda

**Customer retention platform for Nigerian merchants.**

Tenda helps small business owners understand who their customers are, when they are likely to lapse, and what to do about it. Merchants log sales by typing or by voice; Tenda learns how often each customer buys, tells them who to message today, and hands them a WhatsApp message that's already written.

Live: [tenda-delta.vercel.app](https://tenda-delta.vercel.app)

---

## The problem

Most Nigerian merchants track customers in their heads or on paper. They lose repeat buyers not because of bad products but because no one followed up. A customer who bought soap every three weeks stopped coming, and the merchant never noticed until it was too late.

Tenda fixes the follow-up problem.

---

## What it does

### Dashboard
Sales this month vs last month, sales this week, total customers, follow-ups due today and the best-selling product, with quick actions to log a sale, add a customer, ask the AI or talk to it.

### Follow-ups
The core of Tenda. The backend learns each customer's repurchase rhythm per product and lists who is **overdue** or **due soon**, with when they last bought, when they were expected back, and a ready-to-send WhatsApp message (greeted by first name, titles like "Mr." or "Alhaji" skipped). Message, call, snooze or mark done in one tap.

### Customers and sales
Customer list with search and sorting, and a page per customer: spending by month, top products, recent activity and quick actions. Sales history with totals, and a Log Sale screen where a sale can be typed or spoken.

### AI chat
Ask about the business in plain English or Pidgin. Answers come from the merchant's own sales data; general questions and calculations are answered too, worked out step by step.

### Voice assistant
Tap the orb and talk. Questions are answered aloud in a natural Gemini voice that streams as it is generated; spoken sales ("I sold two shea butter to Peter for nine thousand") are recorded straight into the books. Silent recordings are never sent.

### Insights
Key changes in revenue, products and customers, a 30-day deep dive, and AI recommendations, with 7/30/90-day ranges.

### Message templates
The merchant's own WhatsApp follow-up messages with placeholders (customer name, product, business name).

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, Framer Motion, Lucide icons |
| Backend | TENDA API: FastAPI on Render ([Tolu8459/TENDA-api](https://github.com/Tolu8459/TENDA-api)) |
| Database | PostgreSQL on Neon (through the backend) |
| Auth | Backend-issued JWT access + refresh tokens |
| AI | Google Gemini (chat, voice understanding, speech) through the backend |
| Deployment | Vercel |

The browser talks to the backend directly over CORS; this repo has no database or server code of its own.

---

## Project structure

```
app/
  page.tsx            Landing page
  (auth)/             Login, signup
  (dashboard)/        Signed-in app (shared layout: sidebar on desktop, bottom bar on phones)
    dashboard/        Home: revenue, stats, quick actions, AI briefing
    customers/        Customer list, customer page, add customer
    follow-up/        Who to contact today
    sales/            Sales history, Log Sale (type or speak)
    ai-assistant/     AI chat with saved conversations
    voice-assistant/  Voice assistant and saved voice sessions
    insights/         Trends, deep analysis, recommendations
    templates/        WhatsApp message templates
    settings/         Account, password, business setup
  icon.png, apple-icon.png, favicon.ico, opengraph-image.png   Brand icons (picked up by Next.js)

components/
  AuthGate.tsx        Browser-side session check for the app
  ConfirmDialog.tsx   In-app confirmation dialog (useConfirm) instead of browser pop-ups
  MobileNav.tsx       Phone bottom bar (raised Log sale button) and "More" sheet
  Logo.tsx            Brand mark + wordmark
  landing/            Landing page sections
  ...                 Autocompletes, notifications, rich text, shared UI

lib/
  api.ts              Typed client for every backend endpoint (errors, retries, idempotency, streaming)
  auth.ts             Tokens, the "signed in" cookie, redirect to login
  hooks.ts            useResource data loading with an in-memory cache
  format.ts           Naira, Lagos dates, phone and WhatsApp helpers
  useRecorder.ts      Microphone recording with voice detection
  pcmPlayer.ts        Plays streamed speech as it arrives
  types/              Shared API types

proxy.ts              Sends signed-out visitors to /login before an app page renders
public/brand, public/videos   Logo files, app icons and the landing tour video
```

---

## Running locally

Requirements: Node 22 and npm.

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the TENDA backend, e.g. `https://tenda-api.onrender.com` or `http://127.0.0.1:8000` for a local one (it must allow this site in CORS) |

Useful scripts: `npm run typecheck`, `npm run lint`, `npm run build`.

---

## How follow-ups are predicted

The backend does the prediction (so web and voice always agree). For each customer and product:

1. Look at the gaps between their purchases of that product.
2. Use their own buying rhythm when there is enough history; otherwise fall back to the product's repurchase time, then to the business's usual sales rhythm.
3. Add that interval to the last purchase to get the expected date.
4. Flag the customer as **overdue** once that date has passed, or **due soon** as it approaches, and sort by how urgent it is.

---

## Security notes

- Every request is checked by the backend against the merchant's token; the site never sees other merchants' data.
- `proxy.ts` uses a "signed in" cookie only to decide which page to show; it holds no secret.
- Logging out (or a session expiring) clears the tokens and replaces the page, so Back can't return to the app.

The full backend contract is in [BACKEND_README.md](BACKEND_README.md); deeper notes are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

Built by [Abdullahi Oriola](https://abdullahioriola.vercel.app), Lagos, Nigeria.
