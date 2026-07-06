"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Clock, Settings, Plus, Bot, Mic, Sparkles } from "lucide-react";
import NotificationPanel from "@/components/NotificationPanel";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/ai-assistant", label: "AI Chat", icon: Bot },
  { href: "/voice-assistant", label: "Voice", icon: Mic },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/follow-up", label: "Follow-ups", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] font-sans lg:flex">

      {/* ===== DESKTOP SIDEBAR (lg and up) ===== */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-[#E8E8E4] z-40">
        <div className="h-20 flex items-center px-7 border-b border-[#E8E8E4]">
          <span className="font-display font-extrabold text-2xl tracking-tight">TENDA</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-[#FFF0E6] text-[#E85D04]"
                    : "text-[#4A5568] hover:bg-[#FAFAF8] hover:text-[#1A1A1A]"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[#E8E8E4]">
          <Link
            href="/sales/add-sales"
            className="flex items-center justify-center gap-2 bg-[#E85D04] hover:bg-[#FF8C42] text-white font-semibold rounded-xl h-12 transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)]"
          >
            <Plus className="w-5 h-5" /> Log Sale
          </Link>
        </div>
      </aside>

      {/* ===== MOBILE HEADER (below lg) ===== */}
      <header className="lg:hidden fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[480px] h-16 bg-white/95 backdrop-blur-md border-b border-[#E8E8E4] flex items-center justify-between px-4">
        <span className="font-display font-extrabold text-2xl">TENDA</span>
        <NotificationPanel />
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 lg:pl-64">
        {/* Desktop top bar */}
        <div className="hidden lg:flex h-20 items-center justify-end px-8 border-b border-[#E8E8E4] bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <NotificationPanel />
        </div>

        <main className="pt-16 pb-24 w-full max-w-[480px] mx-auto lg:max-w-6xl lg:pt-8 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* ===== MOBILE BOTTOM NAV (below lg) ===== */}
      <footer className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[480px] bg-white border-t border-[#E8E8E4]">
        <div className="flex justify-around items-center h-16">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative"
              >
                {active && (
                  <span className="absolute top-0 h-1 w-8 rounded-b-full bg-[#E85D04]" />
                )}
                <item.icon
                  className={`w-6 h-6 transition-colors ${active ? "text-[#E85D04]" : "text-[#A0AEC0]"}`}
                />
                <span
                  className={`text-[10px] font-semibold transition-colors ${active ? "text-[#E85D04]" : "text-[#A0AEC0]"}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
