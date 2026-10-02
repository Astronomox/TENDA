"use client";

/**
 * lib/api.ts
 *
 * Typed client for the TENDA backend. One function per endpoint in
 * BACKEND_README.md. The browser talks to the backend directly, so the backend
 * must allow this origin via CORS (§3).
 *
 * Behaviour implemented here (§21.2):
 *  - Bearer token on every authenticated call; 401 → sign out + go to /login.
 *  - Errors normalised to ApiError { message, status, code } using `detail`.
 *  - Generous timeouts for Render cold starts; retries only where safe.
 *  - Idempotency-Key on money-bearing POSTs so a retry can't double-log a sale.
 */

import { clearTokens, getRefreshToken, getToken, redirectToLogin, setTokens } from "@/lib/auth";
import type {
  AnalyticsSummary,
  AppNotification,
  BusinessProfile,
  ChatResponse,
  ChatTurn,
  ConversationDetail,
  ConversationSummary,
  Customer,
  CustomerDetail,
  CustomerInput,
  DashboardAnalytics,
  FollowUpList,
  FollowUpStatus,
  InsightsResponse,
  MessageTemplate,
  Page,
  Product,
  ProductBreakdown,
  ProductInput,
  Sale,
  SaleInput,
  TimeRange,
  Timeseries,
  TokenResponse,
  User,
  VoiceAskResponse,
  VoiceLogSaleResponse,
  VoiceSessionDetail,
  VoiceSessionSummary,
} from "@/lib/types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://tenda-api.onrender.com").replace(/\/+$/, "");

// ─── Errors ──────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string | null = null,
    public body: unknown = null,
    public requestId: string | null = null
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The endpoint doesn't exist on the backend yet (see BACKEND_README.md). */
  get isNotImplemented() {
    return this.status === 404 && (this.code === null || this.code === "") && isFastApiNotFound(this.body);
  }
}

function isFastApiNotFound(body: unknown) {
  return !!body && typeof body === "object" && (body as { detail?: unknown }).detail === "Not Found";
}

function messageFrom(body: unknown, status: number): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return humanise(detail, status);
    if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object") {
      const first = detail[0] as { msg?: string; loc?: unknown[] };
      if (first.msg) {
        const msg = first.msg.replace(/^Value error, /, "");
        const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : null;
        return typeof field === "string" && !msg.toLowerCase().includes(field.replace(/_/g, " "))
          ? `${field.replace(/_/g, " ")}: ${msg}`
          : msg;
      }
    }
  }
  return fallbackMessage(status);
}

/** Hide raw provider dumps (README §1.2 A8) behind a readable sentence. */
function humanise(detail: string, status: number) {
  if (/UNAVAILABLE|high demand|overloaded|RESOURCE_EXHAUSTED/i.test(detail)) {
    return "TENDA AI is very busy right now. Please try again in a few seconds.";
  }
  if (detail.length > 240 || /\{'error'|Traceback/.test(detail)) return fallbackMessage(status);
  return detail;
}

function fallbackMessage(status: number) {
  if (status === 0) return "Can't reach the TENDA server right now. Please try again in a moment.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 404) return "Not found.";
  if (status === 413) return "That recording is too long. Keep it under 2 minutes.";
  if (status === 429) return "You're going a bit fast. Please wait a moment and try again.";
  if (status === 503) return "TENDA AI is busy right now. Please try again in a moment.";
  if (status >= 500) return "The TENDA server had a problem. Please try again.";
  return "Something went wrong. Please try again.";
}

// ─── Core request ────────────────────────────────────────────────────────────

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Query;
  json?: unknown;
  form?: FormData | URLSearchParams;
  auth?: boolean;
  timeoutMs?: number;
  /** Retries on network errors / 502 / 503 / 504. Only set for safe calls. */
  retries?: number;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildUrl(path: string, query?: Query) {
  const url = new URL(API_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

let refreshing: Promise<boolean> | null = null;

/** Try a refresh token (README §4.6) once; resolves true if a new access token was stored. */
async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  if (!refreshing) {
    refreshing = fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = (await res.json()) as TokenResponse;
        if (!data.access_token) return false;
        setTokens(data.access_token, data.refresh_token ?? refresh);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    query,
    json,
    form,
    auth = true,
    timeoutMs = 60_000,
    retries = method === "GET" ? 1 : 0,
    idempotencyKey,
    signal,
  } = opts;

  const url = buildUrl(path, query);
  let attempt = 0;
  let refreshed = false;

  for (;;) {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (auth) {
      const token = getToken();
      if (!token) {
        if (!refreshed && (await tryRefresh())) {
          refreshed = true;
          continue;
        }
        clearTokens();
        redirectToLogin(true);
        throw new ApiError(fallbackMessage(401), 401, "UNAUTHENTICATED");
      }
      headers.Authorization = `Bearer ${token}`;
    }
    if (json !== undefined) headers["Content-Type"] = "application/json";
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    const timeout = AbortSignal.timeout(timeoutMs);
    const combined =
      signal && typeof AbortSignal.any === "function" ? AbortSignal.any([signal, timeout]) : signal ?? timeout;

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: json !== undefined ? JSON.stringify(json) : form,
        signal: combined,
        cache: "no-store",
      });
    } catch (err) {
      if (signal?.aborted) throw err;
      if (attempt < retries) {
        attempt++;
        await sleep(1500 * attempt);
        continue;
      }
      const timedOut = err instanceof DOMException && err.name === "TimeoutError";
      throw new ApiError(
        timedOut
          ? "The TENDA server is taking too long. It may be waking up. Please try again."
          : fallbackMessage(0),
        0,
        timedOut ? "TIMEOUT" : "NETWORK"
      );
    }

    if (res.status === 204) return undefined as T;

    let body: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { detail: text.slice(0, 200) };
      }
    }

    if (res.ok) return body as T;

    const code =
      body && typeof body === "object" && typeof (body as { code?: unknown }).code === "string"
        ? (body as { code: string }).code
        : null;

    if (res.status === 401 && auth) {
      if (!refreshed && (await tryRefresh())) {
        refreshed = true;
        continue;
      }
      clearTokens();
      redirectToLogin(true);
      throw new ApiError(fallbackMessage(401), 401, code ?? "UNAUTHENTICATED", body);
    }

    const transient = res.status === 502 || res.status === 503 || res.status === 504;
    if (transient && attempt < retries) {
      attempt++;
      const retryAfter = Number(res.headers.get("Retry-After"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 15) * 1000 : 1500 * attempt);
      continue;
    }

    throw new ApiError(messageFrom(body, res.status), res.status, code, body, res.headers.get("x-request-id"));
  }
}

export const newIdempotencyKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function audioForm(audio: Blob, extra?: Record<string, string>) {
  const type = audio.type || "audio/webm";
  const ext = type.includes("mp4") || type.includes("aac") ? "m4a" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
  const form = new FormData();
  form.append("audio", audio, `recording.${ext}`);
  if (extra) for (const [k, v] of Object.entries(extra)) form.append(k, v);
  return form;
}

const AI_TIMEOUT = 120_000;

// ─── Auth (§4) ───────────────────────────────────────────────────────────────

export const auth = {
  async login(email: string, password: string): Promise<TokenResponse> {
    const form = new URLSearchParams({ grant_type: "password", username: email.trim(), password });
    const data = await request<TokenResponse>("/auth/login", { method: "POST", form, auth: false, retries: 1 });
    setTokens(data.access_token, data.refresh_token ?? null);
    return data;
  },

  /** Registers, then signs in (the current backend returns no token on register). */
  async register(input: { email: string; password: string; full_name?: string; business_name?: string }) {
    const data = await request<Partial<TokenResponse> & { message?: string }>("/auth/register", {
      method: "POST",
      json: input,
      auth: false,
    });
    if (data?.access_token) {
      setTokens(data.access_token, data.refresh_token ?? null);
      return data as TokenResponse;
    }
    return auth.login(input.email, input.password);
  },

  async logout() {
    const refresh = getRefreshToken();
    if (getToken()) {
      await request("/auth/logout", {
        method: "POST",
        json: refresh ? { refresh_token: refresh } : undefined,
        timeoutMs: 10_000,
      }).catch(() => {});
    }
    clearTokens();
  },

  me: () => request<User>("/auth/me"),
  updateMe: (patch: { full_name: string | null }) => request<User>("/auth/me", { method: "PATCH", json: patch }),
  changePassword: (current_password: string, new_password: string) =>
    request<void>("/auth/change-password", { method: "POST", json: { current_password, new_password } }),
};

// ─── Business profile (§7) ───────────────────────────────────────────────────

export const business = {
  get: () => request<BusinessProfile>("/business/profile"),
  update: (patch: Partial<BusinessProfile>) =>
    request<BusinessProfile>("/business/profile", { method: "PUT", json: patch }),
};

// ─── Products (§8) ───────────────────────────────────────────────────────────

export const products = {
  list: (q: { q?: string; limit?: number; offset?: number; sort?: string } = {}, signal?: AbortSignal) =>
    request<Page<Product>>("/products", { query: q, signal }),
  get: (id: string) => request<Product>(`/products/${encodeURIComponent(id)}`),
  create: (input: ProductInput) => request<Product>("/products", { method: "POST", json: input }),
  bulkCreate: (items: ProductInput[]) =>
    request<{ items: Product[] }>("/products/bulk", { method: "POST", json: { products: items } }),
  update: (id: string, patch: Partial<ProductInput>) =>
    request<Product>(`/products/${encodeURIComponent(id)}`, { method: "PATCH", json: patch }),
  remove: (id: string) => request<void>(`/products/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// ─── Customers (§9) ──────────────────────────────────────────────────────────

export const customers = {
  list: (
    q: { q?: string; status?: string; sort?: string; limit?: number; offset?: number } = {},
    signal?: AbortSignal
  ) => request<Page<Customer>>("/customers", { query: q, signal }),
  get: (id: string) => request<CustomerDetail>(`/customers/${encodeURIComponent(id)}`),
  create: (input: CustomerInput) => request<Customer>("/customers", { method: "POST", json: input }),
  update: (id: string, patch: Partial<CustomerInput>) =>
    request<Customer>(`/customers/${encodeURIComponent(id)}`, { method: "PATCH", json: patch }),
  remove: (id: string) => request<void>(`/customers/${encodeURIComponent(id)}`, { method: "DELETE" }),
  sales: (id: string, q: { limit?: number; offset?: number } = {}) =>
    request<Page<Sale>>(`/customers/${encodeURIComponent(id)}/sales`, { query: q }),
};

// ─── Sales (§10) ─────────────────────────────────────────────────────────────

export const sales = {
  list: (
    q: {
      from?: string;
      to?: string;
      customer_id?: string;
      product_id?: string;
      source?: string;
      q?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) => request<Page<Sale>>("/sales", { query: q }),
  get: (id: string) => request<Sale>(`/sales/${encodeURIComponent(id)}`),
  /** Pass the same idempotencyKey when retrying the same submission. */
  create: (input: SaleInput, idempotencyKey: string) =>
    request<Sale>("/sales", { method: "POST", json: input, idempotencyKey, retries: 1 }),
  update: (id: string, patch: Partial<SaleInput>) =>
    request<Sale>(`/sales/${encodeURIComponent(id)}`, { method: "PATCH", json: patch }),
  remove: (id: string) => request<void>(`/sales/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// ─── Voice (§11) ─────────────────────────────────────────────────────────────

export const voice = {
  ask: (audio: Blob, sessionId?: string | null) =>
    request<VoiceAskResponse>("/voice/ask", {
      method: "POST",
      form: audioForm(audio, sessionId ? { session_id: sessionId } : undefined),
      timeoutMs: AI_TIMEOUT,
      retries: 1,
    }),
  /** Parse only — nothing is saved. Confirm with sales.create(). */
  parseSale: (audio: Blob) =>
    request<VoiceLogSaleResponse>("/voice/log-sale", {
      method: "POST",
      query: { dry_run: true },
      form: audioForm(audio),
      timeoutMs: AI_TIMEOUT,
      retries: 1,
    }),
  sessions: (q: { q?: string; limit?: number; offset?: number } = {}) =>
    request<Page<VoiceSessionSummary>>("/voice/sessions", { query: q }),
  session: (id: string) => request<VoiceSessionDetail>(`/voice/sessions/${encodeURIComponent(id)}`),
  removeSession: (id: string) =>
    request<void>(`/voice/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// ─── Analytics (§12) ─────────────────────────────────────────────────────────

export const analytics = {
  summary: (q: { from?: string; to?: string } = {}) => request<AnalyticsSummary>("/analytics/summary", { query: q }),
  dashboard: () => request<DashboardAnalytics>("/analytics/dashboard"),
  timeseries: (q: { range: TimeRange | "12m"; interval?: string; customer_id?: string; product_id?: string }) =>
    request<Timeseries>("/analytics/timeseries", { query: q }),
  products: (range: TimeRange) => request<ProductBreakdown>("/analytics/products", { query: { range } }),
};

// ─── Follow-ups (§13) ────────────────────────────────────────────────────────

export const followUps = {
  list: (q: { status?: FollowUpStatus | "all"; limit?: number; offset?: number } = {}) =>
    request<FollowUpList>("/follow-ups", { query: q }),
  done: (key: string, channel: "whatsapp" | "phone" | "in_person" | "other") =>
    request<void>(`/follow-ups/${encodeURIComponent(key)}/done`, { method: "POST", json: { channel } }),
  snooze: (key: string, days: number) =>
    request<void>(`/follow-ups/${encodeURIComponent(key)}/snooze`, { method: "POST", json: { days } }),
  dismiss: (key: string) => request<void>(`/follow-ups/${encodeURIComponent(key)}/dismiss`, { method: "POST" }),
};

// ─── Insights (§14) ──────────────────────────────────────────────────────────

export const insights = {
  get: (range: TimeRange) => request<InsightsResponse>("/insights", { query: { range }, timeoutMs: AI_TIMEOUT }),
  refresh: (range: TimeRange) =>
    request<InsightsResponse>("/insights/refresh", { method: "POST", query: { range }, timeoutMs: AI_TIMEOUT }),
};

// ─── AI (§15) ────────────────────────────────────────────────────────────────

export const ai = {
  chat: (input: {
    question: string;
    history?: ChatTurn[];
    conversation_id?: string | null;
    regenerate_message_id?: string | null;
  }) =>
    request<ChatResponse>("/ai/chat", {
      method: "POST",
      json: {
        question: input.question,
        history: input.history ?? [],
        ...(input.conversation_id ? { conversation_id: input.conversation_id } : {}),
        ...(input.regenerate_message_id ? { regenerate_message_id: input.regenerate_message_id } : {}),
      },
      timeoutMs: AI_TIMEOUT,
      retries: 2,
    }),
  summary: (focus: "today" | "week" | "month" = "week") =>
    request<{ summary: string; generated_at?: string }>("/ai/generate-summary", {
      method: "POST",
      json: { focus },
      timeoutMs: AI_TIMEOUT,
      retries: 2,
    }),
  conversations: (q: { q?: string; limit?: number; offset?: number } = {}) =>
    request<Page<ConversationSummary>>("/ai/conversations", { query: q }),
  conversation: (id: string) => request<ConversationDetail>(`/ai/conversations/${encodeURIComponent(id)}`),
  renameConversation: (id: string, title: string) =>
    request<ConversationSummary>(`/ai/conversations/${encodeURIComponent(id)}`, { method: "PATCH", json: { title } }),
  removeConversation: (id: string) =>
    request<void>(`/ai/conversations/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// ─── Notifications (§16) ─────────────────────────────────────────────────────

export const notifications = {
  list: (q: { unread_only?: boolean; limit?: number } = {}) =>
    request<{ items: AppNotification[]; unread_count: number }>("/notifications", { query: q }),
  markRead: (ids: string[] | "all") =>
    request<void>("/notifications/read", { method: "POST", json: ids === "all" ? { all: true } : { ids } }),
  dismiss: (id: string) => request<void>(`/notifications/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// ─── Templates (§17) ─────────────────────────────────────────────────────────

export const templates = {
  list: () => request<Page<MessageTemplate> | MessageTemplate[]>("/templates"),
  create: (input: { name: string; body: string; is_default?: boolean }) =>
    request<MessageTemplate>("/templates", { method: "POST", json: input }),
  update: (id: string, patch: Partial<{ name: string; body: string; is_default: boolean }>) =>
    request<MessageTemplate>(`/templates/${encodeURIComponent(id)}`, { method: "PATCH", json: patch }),
  remove: (id: string) => request<void>(`/templates/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// ─── Health (§18) ────────────────────────────────────────────────────────────

/** Fire-and-forget ping to wake a sleeping Render instance early. */
export function warmUp() {
  fetch(buildUrl("/health"), { cache: "no-store" }).catch(() => {});
}
