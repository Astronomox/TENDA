"use client";

/**
 * Phone navigation: four tabs around a raised "Log sale" button, plus a
 * "More" sheet for everything else. (Desktop uses the sidebar in the layout.)
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot, ChevronRight, Clock, FileText, Home, LayoutGrid, LogOut, Mic, Plus, Receipt, Settings, Sparkles, Users, X,
} from "lucide-react";
import { useCurrentUser } from "@/components/AuthGate";
import { useOverlay } from "@/lib/useOverlay";
import { initials } from "@/lib/format";

const TABS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/follow-up", label: "Follow-ups", icon: Clock },
];

const MORE = [
  { href: "/ai-assistant", label: "AI Chat", hint: "Ask about your business", icon: Bot },
  { href: "/voice-assistant", label: "Voice", hint: "Talk to TENDA", icon: Mic },
  { href: "/insights", label: "Insights", hint: "Trends and advice", icon: Sparkles },
  { href: "/sales", label: "Sales", hint: "Every sale you've logged", icon: Receipt },
  { href: "/templates", label: "Templates", hint: "Your WhatsApp messages", icon: FileText },
  { href: "/settings", label: "Settings", hint: "Account and business", icon: Settings },
];

const LOG_SALE = "/sales/add-sales";

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
  const moreActive = !open && MORE.some((m) => isActive(m.href)) && !pathname.startsWith(LOG_SALE);

  // Close the sheet whenever the page changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  return (
    <>
      <nav
        aria-label="Main"
        className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[480px] bg-white/95 backdrop-blur-md border-t border-[#E8E8E4] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 items-end h-16">
          <Tab {...TABS[0]} active={isActive(TABS[0].href)} />
          <Tab {...TABS[1]} active={isActive(TABS[1].href)} />
          <div className="flex justify-center">
            <Link
              href={LOG_SALE}
              aria-label="Log a sale"
              className={`-mt-6 mb-2 flex flex-col items-center gap-1 ${pathname.startsWith(LOG_SALE) ? "text-[#E85D04]" : "text-[#4A5568]"}`}
            >
              <span className="w-14 h-14 rounded-full bg-[#E85D04] text-white flex items-center justify-center shadow-[0_6px_20px_rgba(232,93,4,0.4)] ring-4 ring-white active:scale-95 transition-transform">
                <Plus className="w-7 h-7" strokeWidth={2.5} />
              </span>
              <span className="text-[10px] font-semibold leading-none">Log sale</span>
            </Link>
          </div>
          <Tab {...TABS[2]} active={isActive(TABS[2].href)} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="relative flex flex-col items-center justify-center gap-1 h-16"
          >
            {moreActive && <span className="absolute top-0 h-1 w-8 rounded-b-full bg-[#E85D04]" />}
            <LayoutGrid className={`w-6 h-6 ${moreActive ? "text-[#E85D04]" : "text-[#A0AEC0]"}`} />
            <span className={`text-[10px] font-semibold ${moreActive ? "text-[#E85D04]" : "text-[#A0AEC0]"}`}>More</span>
          </button>
        </div>
      </nav>

      {open && <MoreSheet key="more" isActive={isActive} onClose={() => setOpen(false)} />}
    </>
  );
}

function Tab({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ElementType; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-col items-center justify-center gap-1 h-16"
    >
      {active && <span className="absolute top-0 h-1 w-8 rounded-b-full bg-[#E85D04]" />}
      <Icon className={`w-6 h-6 transition-colors ${active ? "text-[#E85D04]" : "text-[#A0AEC0]"}`} />
      <span className={`text-[10px] font-semibold transition-colors ${active ? "text-[#E85D04]" : "text-[#A0AEC0]"}`}>
        {label}
      </span>
    </Link>
  );
}

function MoreSheet({ isActive, onClose }: { isActive: (href: string) => boolean; onClose: () => void }) {
  const { user, displayName, logout } = useCurrentUser();
  useOverlay(onClose); // scroll lock + Escape closes

  return (
    <div className="lg:hidden fixed inset-0 z-[60] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-[#1A0A00]/40 animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More"
        className="animate-sheet-up relative w-full max-w-[480px] bg-white rounded-t-3xl px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(26,10,0,0.18)]"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E8E8E4]" aria-hidden />
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-base font-bold text-[#1A1A1A]">More</p>
          <button onClick={onClose} className="p-2 -mr-2 text-[#A0AEC0] hover:text-[#4A5568]" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {MORE.map(({ href, label, hint, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex flex-col gap-2 rounded-2xl border p-3.5 min-h-[92px] transition-colors ${
                  active ? "border-[#E85D04] bg-[#FFF7F0]" : "border-[#E8E8E4] bg-white active:bg-[#FAFAF8]"
                }`}
              >
                <span className="w-9 h-9 rounded-xl bg-[#FFF0E6] text-[#E85D04] flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#1A1A1A] leading-tight">{label}</span>
                  <span className="block text-[11px] text-[#A0AEC0] leading-snug mt-0.5">{hint}</span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#FAFAF8] border border-[#F0F0EC] px-3 py-2.5">
          <div className="h-9 w-9 flex-shrink-0 bg-gradient-to-br from-[#FFF0E6] to-[#FFD4B3] rounded-full flex items-center justify-center text-xs font-bold text-[#E85D04]">
            {initials(displayName)}
          </div>
          <Link href="/settings" onClick={onClose} className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1A1A] truncate">{displayName}</p>
            <p className="text-[11px] text-[#A0AEC0] truncate">{user.email}</p>
          </Link>
          <ChevronRight className="w-4 h-4 text-[#C0C0B8]" aria-hidden />
          <button
            onClick={() => void logout()}
            className="ml-1 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </div>
    </div>
  );
}
