"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  TrendingUp,
  Users,
  AlertTriangle,
  ShoppingBag,
  X,
  CheckCheck,
  Clock,
  Mic,
  Info,
} from "lucide-react";
import { ApiError, notifications as notificationsApi } from "@/lib/api";
import { relative } from "@/lib/format";
import type { AppNotification } from "@/lib/types";
import { Spinner } from "@/components/ui";

const POLL_MS = 120_000;

const TYPE_STYLE: Record<string, { icon: React.ElementType; color: string }> = {
  follow_up_overdue: { icon: AlertTriangle, color: "text-red-500" },
  follow_up_due_today: { icon: Clock, color: "text-amber-500" },
  weekly_summary: { icon: TrendingUp, color: "text-green-500" },
  revenue_milestone: { icon: TrendingUp, color: "text-green-500" },
  top_product_week: { icon: ShoppingBag, color: "text-[#E85D04]" },
  voice_sale_logged: { icon: Mic, color: "text-[#E85D04]" },
  new_customer: { icon: Users, color: "text-blue-500" },
};

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read).length;

  const load = useCallback(async () => {
    // The layout mounts one bell for mobile and one for desktop; only the
    // visible one should talk to the server.
    if (ref.current && ref.current.offsetParent === null) return;
    try {
      const res = await notificationsApi.list({ limit: 20 });
      setItems(res.items ?? []);
      setUnavailable(false);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.isNotImplemented) setUnavailable(true);
      else setError(err instanceof Error ? err.message : "Couldn't load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is only set after the awaited fetch
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // Close on outside click / Escape
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function markAllRead() {
    const prev = items;
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    try {
      await notificationsApi.markRead("all");
    } catch {
      setItems(prev);
    }
  }

  async function markRead(id: string) {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    notificationsApi.markRead([id]).catch(() => {});
  }

  async function dismiss(id: string) {
    const prev = items;
    setItems((list) => list.filter((n) => n.id !== id));
    try {
      await notificationsApi.dismiss(id);
    } catch {
      setItems(prev);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        className="p-2 text-[#4A5568] hover:text-[#1A1A1A] relative transition-colors"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-[#E85D04] border-2 border-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white border border-[#E8E8E4] rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E4]">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[#1A1A1A]">Notifications</p>
              {unread > 0 && (
                <span className="text-[10px] font-bold bg-[#E85D04] text-white rounded-full px-1.5 py-0.5">{unread}</span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => void markAllRead()}
                className="flex items-center gap-1 text-xs text-[#E85D04] font-semibold hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#F0F0EC]">
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 flex justify-center text-[#A0AEC0]">
                <Spinner />
              </div>
            ) : unavailable ? (
              <div className="px-4 py-8 text-center text-sm text-[#A0AEC0]">
                <Info className="w-5 h-5 mx-auto mb-2" />
                Notifications aren&apos;t available yet.
              </div>
            ) : error && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-red-500">{error}</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#A0AEC0]">You&apos;re all caught up.</div>
            ) : (
              items.map((n) => {
                const style = TYPE_STYLE[n.type] ?? { icon: Bell, color: "text-[#4A5568]" };
                const Icon = style.icon;
                const content = (
                  <>
                    <div className={`mt-0.5 flex-shrink-0 ${style.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs text-[#1A1A1A] ${n.read ? "font-semibold" : "font-bold"}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-[#718096] mt-0.5 leading-snug">{n.body}</p>}
                      <p className="text-[10px] text-[#A0AEC0] mt-1">{relative(n.created_at)}</p>
                    </div>
                  </>
                );
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${n.read ? "bg-white" : "bg-[#FFF7F0]"}`}
                  >
                    {n.link ? (
                      <Link
                        href={n.link}
                        className="flex items-start gap-3 flex-1 min-w-0"
                        onClick={() => {
                          void markRead(n.id);
                          setOpen(false);
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button className="flex items-start gap-3 flex-1 min-w-0 text-left" onClick={() => void markRead(n.id)}>
                        {content}
                      </button>
                    )}
                    <button
                      onClick={() => void dismiss(n.id)}
                      className="flex-shrink-0 text-[#A0AEC0] hover:text-[#4A5568] transition-colors mt-0.5"
                      aria-label="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
