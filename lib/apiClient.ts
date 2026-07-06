/**
 * lib/apiClient.ts
 *
 * Central client for all calls to the Tenda FastAPI backend on Render.
 * Auth uses the Supabase JWT — we grab it from the Supabase session and
 * pass it as a Bearer token so FastAPI's get_current_user dependency works.
 */

import { supabase } from "@/lib/supabaseClient";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://tenda-api.onrender.com";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = await getAuthHeader();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ─── Types (mirrors backend schemas) ─────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface ChatResponse {
  answer: string;
}

export interface SummaryResponse {
  summary: string;
}

export interface TopProduct {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

export interface BusinessSummary {
  total_revenue: number;
  total_transactions: number;
  top_products: TopProduct[];
}

// ─── AI endpoints ─────────────────────────────────────────────────────────────

/** POST /ai/chat — send a text question with optional history */
export async function aiChat(
  question: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ question, history }),
  });
}

/** POST /ai/generate-summary — send business data, get an AI summary paragraph */
export async function aiGenerateSummary(
  businessData: Record<string, unknown>
): Promise<SummaryResponse> {
  return apiFetch<SummaryResponse>("/ai/generate-summary", {
    method: "POST",
    body: JSON.stringify({ business_data: businessData }),
  });
}

// ─── Analytics endpoint ───────────────────────────────────────────────────────

/** GET /analytics/summary — get real revenue & product stats for this user */
export async function getAnalyticsSummary(): Promise<BusinessSummary> {
  return apiFetch<BusinessSummary>("/analytics/summary");
}

// ─── Voice endpoints ──────────────────────────────────────────────────────────

/** POST /voice/ask — send an audio blob, get a text answer */
export async function voiceAsk(audioBlob: Blob): Promise<ChatResponse> {
  const authHeader = await getAuthHeader();
  const form = new FormData();
  form.append("audio", audioBlob, "recording.webm");

  const res = await fetch(`${BASE_URL}/voice/ask`, {
    method: "POST",
    headers: authHeader,
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voice API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<ChatResponse>;
}

/** POST /voice/log-sale — send an audio blob, auto-log the sale */
export async function voiceLogSale(audioBlob: Blob): Promise<unknown> {
  const authHeader = await getAuthHeader();
  const form = new FormData();
  form.append("audio", audioBlob, "recording.webm");

  const res = await fetch(`${BASE_URL}/voice/log-sale`, {
    method: "POST",
    headers: authHeader,
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voice log-sale error ${res.status}: ${body}`);
  }

  return res.json();
}
