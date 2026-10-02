"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";

export interface Resource<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  /** True when the backend doesn't have this endpoint yet. */
  notImplemented: boolean;
  reload: () => Promise<void>;
  setData: (updater: T | ((prev: T | undefined) => T)) => void;
}

// Tiny in-memory cache so moving between pages shows the last data instantly
// while a fresh copy loads in the background.
const cache = new Map<string, unknown>();

export function invalidate(prefix: string) {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}

export function clearCache() {
  cache.clear();
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
  const [data, setDataState] = useState<T | undefined>(() => (key ? (cache.get(key) as T | undefined) : undefined));
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
    try {
      const result = await fetcherRef.current();
      if (run !== runRef.current) return;
      cache.set(key, result);
      loadedAtRef.current = Date.now();
      setDataState(result);
    } catch (err) {
      if (run !== runRef.current) return;
      setError(toApiError(err));
    } finally {
      if (run === runRef.current) setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    // Show cached data for this key immediately, then refresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to a changed cache key
    setDataState(key ? (cache.get(key) as T | undefined) : undefined);
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
        if (key) cache.set(key, next);
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
