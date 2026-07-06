"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, TrendingUp, Users, AlertTriangle, ShoppingBag, X, CheckCheck } from "lucide-react";

interface Notification {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const SEED: Notification[] = [
  {
    id: "1",
    icon: AlertTriangle,
    iconColor: "text-red-500",
    title: "47 customers at churn risk",
    body: "These customers haven't purchased in 14+ days.",
    time: "2 min ago",
    read: false,
  },
  {
    id: "2",
    icon: TrendingUp,
    iconColor: "text-green-500",
    title: "Revenue up 12% this month",
    body: "Your sales are trending above last month's total.",
    time: "1 hr ago",
    read: false,
  },
  {
    id: "3",
    icon: Users,
    iconColor: "text-blue-500",
    title: "New customer added",
    body: "Emeka Okafor was added to your customer list.",
    time: "3 hr ago",
    read: false,
  },
  {
    id: "4",
    icon: ShoppingBag,
    iconColor: "text-[#E85D04]",
    title: "Top product: Indomie Noodles",
    body: "This item accounts for 18% of this week's sales.",
    time: "Yesterday",
    read: true,
  },
];

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(SEED);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 text-[#4A5568] hover:text-[#1A1A1A] relative transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-[#E85D04] border-2 border-white" />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-[#E8E8E4] rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E4]">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[#1A1A1A]">Notifications</p>
              {unread > 0 && (
                <span className="text-[10px] font-bold bg-[#E85D04] text-white rounded-full px-1.5 py-0.5">
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[#E85D04] font-semibold hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F0F0EC]">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#A0AEC0]">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                    n.read ? "bg-white" : "bg-[#FFF7F0]"
                  }`}
                >
                  <div className={`mt-0.5 flex-shrink-0 ${n.iconColor}`}>
                    <n.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold text-[#1A1A1A] ${!n.read ? "font-bold" : ""}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-[#718096] mt-0.5 leading-snug">{n.body}</p>
                    <p className="text-[10px] text-[#A0AEC0] mt-1">{n.time}</p>
                  </div>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="flex-shrink-0 text-[#A0AEC0] hover:text-[#4A5568] transition-colors mt-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
