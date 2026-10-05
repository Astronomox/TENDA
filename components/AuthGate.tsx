"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth as authApi, warmUp } from "@/lib/api";
import { getClaims, getToken, redirectToLogin, setSessionCookie, useToken } from "@/lib/auth";
import { clearCache } from "@/lib/hooks";
import type { User } from "@/lib/types";

interface CurrentUser {
  user: User;
  /** Best display name: full_name → part of the email before "@". */
  displayName: string;
  /** Re-fetch /auth/me (after editing the profile). */
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<CurrentUser | null>(null);

export function useCurrentUser(): CurrentUser {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useCurrentUser must be used inside <AuthGate>");
  return ctx;
}

function fallbackUser(): User {
  const claims = getClaims();
  return { id: "", email: claims?.email ?? "", full_name: null };
}

/**
 * Client-side route guard for the dashboard. The token lives in localStorage,
 * so this can't happen on the server. Redirects to /login when there's no
 * valid token, and logs out automatically when the token expires.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const token = useToken();
  // Start from the email in the token so pages can load immediately;
  // /auth/me fills in the full profile in the background.
  const [fetchedUser, setUser] = useState<User | null>(null);
  const tokenUser = useMemo(() => (token ? fallbackUser() : null), [token]);
  const user = fetchedUser ?? tokenUser;

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch {
      // /auth/me not built yet (or offline): fall back to the email in the token.
      setUser((prev) => prev ?? fallbackUser());
    }
  }, []);

  useEffect(() => {
    warmUp();
    // The Back button can restore a page from the browser's cache without
    // re-running this guard; check again so a signed-out user can't see it.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted && !getToken()) {
        document.body.style.visibility = "hidden";
        redirectToLogin();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    if (token === undefined) return; // still hydrating
    if (token === null) {
      redirectToLogin(true);
      return;
    }
    setSessionCookie(true); // keeps sessions from before the cookie existed working with proxy.ts
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is only set after the awaited fetch
    void refreshUser();

    // The backend token can't always be refreshed; leave cleanly at expiry.
    const claims = getClaims();
    if (!claims) return;
    const ms = claims.exp * 1000 - Date.now();
    const id = window.setTimeout(() => redirectToLogin(true), Math.max(0, Math.min(ms, 2_000_000_000)));
    return () => window.clearTimeout(id);
  }, [token, refreshUser]);

  const logout = useCallback(async () => {
    await authApi.logout();
    clearCache();
    // replace(): Back from the login page must not return to the dashboard
    window.location.replace("/login");
  }, []);

  const value = useMemo<CurrentUser | null>(() => {
    if (!user) return null;
    const displayName = user.full_name?.trim() || user.email.split("@")[0] || "there";
    return { user, displayName, refreshUser, logout };
  }, [user, refreshUser, logout]);

  if (!token || !value) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="flex flex-col items-center gap-3">
          <span className="font-display font-extrabold text-2xl text-[#E85D04]">TENDA</span>
          <span className="w-6 h-6 rounded-full border-2 border-[#FFD4B3] border-t-[#E85D04] animate-spin" />
        </div>
      </div>
    );
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
