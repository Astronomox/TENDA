# Tenda

**Customer retention platform for Nigerian merchants.**

Tenda helps small business owners understand who their customers are, when they are likely to lapse, and what to do about it. Instead of guessing, merchants get data-driven follow-up recommendations, revenue trends, and AI-generated WhatsApp messages — all in one dashboard built for the way Nigerian merchants actually work.

Live: [tenda-delta.vercel.app](https://tenda-delta.vercel.app)

---

## The problem

Most Nigerian merchants track customers in their heads or on paper. They lose repeat buyers not because of bad products but because no one followed up. A customer who bought soap every three weeks stopped coming — the merchant never noticed until it was too late.

Tenda fixes the follow-up problem.

---

## What it does

### Dashboard
Real-time revenue snapshot: sales this month vs last month (with percentage growth), sales this week, total transactions, total customers, and follow-ups due today. Built on live Supabase data, no manual entry beyond logging a sale.

### Follow-up engine
The core of Tenda. A custom algorithm in `lib/algorithm/salesEngine.ts` analyses each customer's purchase history per product, calculates their average repurchase interval, and predicts when they are next expected to buy. Customers are flagged as:

- **Overdue** — past their predicted repurchase date, sorted by days overdue
- **Due soon** — approaching their next expected purchase window

The merchant sees exactly who to contact and why, with last purchase date and expected return date shown for each flag.

### Customers
Full customer list synced from Supabase, with individual customer pages showing purchase history, revenue contribution, product breakdown, risk signals, and recent activity. Falls back to mock data gracefully if the database is unreachable.

### AI assistant
Conversational interface powered by a FastAPI backend on Render. Merchants ask questions about their business in plain language and get answers grounded in their actual sales data. Uses the Supabase JWT for authentication so responses are scoped to each merchant's own data.

### Insights
Revenue trends, top customer analysis, product performance, and AI-generated recommendations with time range filtering and a detail panel for each insight.

### WhatsApp follow-up templates
Pre-written and AI-generated follow-up message templates. Pick a flagged customer, select a template, send directly via WhatsApp without leaving the app.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, Framer Motion |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| AI backend | FastAPI on Render |
| Icons | Lucide React |
| Deployment | Vercel |

---

## Project structure

```
app/
  (auth)/           Login, signup
  (dashboard)/
    dashboard/      Revenue overview, quick actions
    customers/      Customer list + individual customer pages
    follow-up/      Follow-up recommendations (overdue + due soon)
    insights/       Revenue trends and AI recommendations
    ai-assistant/   Conversational AI chat interface
    sales/          Log sales, sales history
    templates/      WhatsApp follow-up message templates
    voice-assistant/ Voice input interface
    settings/       Merchant account settings

lib/
  algorithm/
    salesEngine.ts  Core repurchase prediction algorithm
  data/             Supabase data fetchers (sales, customers, products)
  mock/             Mock data fallback for development
  apiClient.ts      FastAPI backend client (auth via Supabase JWT)
  supabaseClient.ts Supabase browser client
  supabaseServer.ts Supabase server client (RSC-safe)
```

---

## Running locally

```bash
# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env.local
# Add: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL

# Run dev server
pnpm dev
```

To use mock data instead of a live Supabase connection:
```bash
USE_MOCK=true pnpm dev
```

---

## How the follow-up algorithm works

For each customer-product pair with at least two purchases:

1. Sort purchase dates chronologically
2. Calculate the interval in days between each consecutive purchase
3. Average those intervals to get the expected repurchase cycle
4. Add the average interval to the last purchase date to predict the next expected purchase
5. Compare to today: flag as **overdue** if past due, **due soon** if within the coming window

The merchant always knows exactly who to contact and how long they have been waiting.

---

Built by [Abdullahi Oriola](https://abdullahioriola.vercel.app) — Lagos, Nigeria.
