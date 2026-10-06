"use client";

/**
 * lib/auth.ts
 *
 * Browser-side session for the TENDA backend (BACKEND_README.md §4).
 * The backend issues a JWT; we keep it in localStorage and attach it as
 * `Authorization: Bearer …`. The payload is decoded (not verified) only to
 * read `sub` (email) and `exp` for UX — the backend is the source of truth.
 */

import { useSyncExternalStore } from "react";
import { SESSION_COOKIE } from "@/lib/session";

export { SESSION_COOKIE };

const TOKEN_KEY = "tenda_token";
const REFRESH_KEY = "tenda_refresh_token";
/**
 * A "signed in" marker the server can see, so proxy.ts can send signed-out
 * visitors to /login before a dashboard page renders. It holds no secret:
 * the backend still checks the real token on every request. (Name in lib/session.ts.)
 */
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // matches the refresh token lifetime

export interface TokenClaims {
  email: string;
  /** Unix seconds */
  exp: number;
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private mode / storage blocked: the session just won't survive a reload.
  }
}

export function decodeToken(token: string | null): TokenClaims | null {
  if (!token) return null;
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
    if (typeof json.exp !== "number") return null;
    return { email: typeof json.sub === "string" ? json.sub : "", exp: json.exp };
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  const token = safeGet(TOKEN_KEY);
  const claims = decodeToken(token);
  if (!claims || claims.exp * 1000 <= Date.now()) return null;
  return token;
}

export function getRefreshToken(): string | null {
  return safeGet(REFRESH_KEY);
}

/** Set or clear the server-visible "signed in" marker. */
export function setSessionCookie(signedIn: boolean) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE}=${signedIn ? "1" : ""}; Path=/; Max-Age=${signedIn ? SESSION_MAX_AGE : 0}; SameSite=Lax${secure}`;
}

export function setTokens(access: string, refresh?: string | null) {
  safeSet(TOKEN_KEY, access);
  if (refresh !== undefined) safeSet(REFRESH_KEY, refresh ?? null);
  setSessionCookie(true);
  emit();
}

/**
 * Data remembered on this device for instant repeat visits (see lib/hooks.ts),
 * stored as `${CACHE_PREFIX}${email}:${key}`.
 */
export const CACHE_PREFIX = "tenda_cache:";

/** Forget everything remembered on this device (logout, expiry, account switch). */
export function clearStoredCache() {
  try {
    const store = window.localStorage;
    for (let i = store.length - 1; i >= 0; i--) {
      const k = store.key(i);
      if (k?.startsWith(CACHE_PREFIX)) store.removeItem(k);
    }
  } catch {
    // storage blocked: nothing was stored
  }
}

export function clearTokens() {
  safeSet(TOKEN_KEY, null);
  safeSet(REFRESH_KEY, null);
  setSessionCookie(false);
  clearStoredCache();
  emit();
}

export function getClaims(): TokenClaims | null {
  return decodeToken(getToken());
}

/**
 * Navigates to the login page, preserving where the user was. Uses replace()
 * so the Back button can't return to the protected page.
 */
export function redirectToLogin(expired = false) {
  if (typeof window === "undefined") return;
  setSessionCookie(false);
  if (window.location.pathname.startsWith("/login")) return;
  const params = new URLSearchParams({ next: window.location.pathname + window.location.search });
  if (expired) params.set("expired", "1");
  window.location.replace(`/login?${params}`);
}

/** Only allow same-site relative paths as post-login destinations. */
export function safeNext(next: string | null | undefined): string {
  // Browsers treat "\" like "/", so "/\evil.com" would leave the site just like "//evil.com".
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) {
    return "/dashboard";
  }
  return next;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Current token, reactive across tabs. `undefined` while hydrating (server and
 * first client render), `null` when signed out.
 */
export function useToken(): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getToken(),
    () => undefined
  );
}
