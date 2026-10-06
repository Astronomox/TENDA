"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ApiError } from "@/lib/api";
import { CACHE_PREFIX, clearStoredCache, getClaims } from "@/lib/auth";

export interface Resource<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  /** True when the backend doesn't have this endpoint yet. */
  notImplemented: boolean;
  reload: () => Promise<void>;
  setData: (updater: T | ((prev: T | undefined) => T)) => void;
}

// Cache so moving between pages - and coming back to the app later - shows the
// last data instantly while a fresh copy loads in the background. Kept in memory
// and, per user, in localStorage (cleared on logout/expiry by lib/auth).
const cache = new Map<string, unknown>();

// Conversations and voice sessions are private and change constantly: memory only.
const NOT_STORED = /^(ai:|voice:)/;
const MAX_STORED_CHARS = 250_000;

function storageKey(key: string): string | null {
  const who = getClaims()?.email;
  return who && !NOT_STORED.test(key) ? `${CACHE_PREFIX}${who}:${key}` : null;
}

function readCached<T>(key: string): T | undefined {
  if (cache.has(key)) return cache.get(key) as T;
  const sk = storageKey(key);
  if (!sk) return undefined;
  try {
    const raw = window.localStorage.getItem(sk);
    if (raw === null) return undefined;
    const value = JSON.parse(raw) as T;
    cache.set(key, value);
    return value;
  } catch {
    return undefined;
  }
}

function writeCached(key: string, value: unknown) {
  cache.set(key, value);
  const sk = storageKey(key);
  if (!sk) return;
  try {
    const raw = JSON.stringify(value);
    if (raw.length <= MAX_STORED_CHARS) window.localStorage.setItem(sk, raw);
  } catch {
    // storage full or blocked: memory cache still works
  }
}

export function invalidate(prefix: string) {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
  const who = getClaims()?.email;
  if (!who) return;
  try {
    const store = window.localStorage;
    const start = `${CACHE_PREFIX}${who}:${prefix}`;
    for (let i = store.length - 1; i >= 0; i--) {
      const k = store.key(i);
      if (k?.startsWith(start)) store.removeItem(k);
    }
  } catch {}
}

export function clearCache() {
  cache.clear();
  clearStoredCache();
}

// How many screens are showing remembered data while a fresh copy loads
// (drives the "Updating..." hint in the top bar).
let refreshing = 0;
const refreshListeners = new Set<() => void>();

function changeRefreshing(delta: number) {
  refreshing = Math.max(0, refreshing + delta);
  refreshListeners.forEach((l) => l());
}

/** True while any screen is quietly refreshing data it is already showing. */
export function useRefreshing(): boolean {
  return useSyncExternalStore(
    (listener) => {
      refreshListeners.add(listener);
      return () => refreshListeners.delete(listener);
    },
    () => refreshing > 0,
    () => false
  );
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  return new ApiError(err instanceof Error ? err.message : "Something went wrong.", 0);
}

/**
 * Loads data from the backend.
 * @param key cache key; pass null to skip loading (e.g. missing id).
 */
export function useResource<T>(key: string | null, fetcher: () => Promise<T>): Resource<T> {
  const [data, setDataState] = useState<T | undefined>(() => (key ? readCached<T>(key) : undefined));
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(!!key);
  const fetcherRef = useRef(fetcher);
  const runRef = useRef(0);
  const loadedAtRef = useRef(0);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const load = useCallback(async () => {
    if (!key) return;
    const run = ++runRef.current;
    setLoading(true);
    setError(null);
    // Already showing something for this key? Then this is a background refresh.
    const background = readCached(key) !== undefined;
    if (background) changeRefreshing(1);
    try {
      const result = await fetcherRef.current();
      if (run !== runRef.current) return;
      writeCached(key, result);
      loadedAtRef.current = Date.now();
      setDataState(result);
    } catch (err) {
      if (run !== runRef.current) return;
      setError(toApiError(err));
    } finally {
      if (background) changeRefreshing(-1);
      if (run === runRef.current) setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    // Show cached data for this key immediately, then refresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to a changed cache key
    setDataState(key ? readCached<T>(key) : undefined);
    void load();
  }, [key, load]);

  // Coming back to the tab after a while? Quietly fetch fresh data.
  useEffect(() => {
    if (!key) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - loadedAtRef.current > 60_000) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [key, load]);

  const setData = useCallback(
    (updater: T | ((prev: T | undefined) => T)) => {
      setDataState((prev) => {
        const next = typeof updater === "function" ? (updater as (p: T | undefined) => T)(prev) : updater;
        if (key) writeCached(key, next);
        return next;
      });
    },
    [key]
  );

  return {
    data,
    error,
    loading,
    notImplemented: !!error?.isNotImplemented,
    reload: load,
    setData,
  };
}

/** Debounces a fast-changing value (search boxes). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}
