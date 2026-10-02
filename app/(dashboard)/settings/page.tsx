"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, User, Target, Building2, Package, LogOut, KeyRound, MessageSquareText } from "lucide-react";
import { useCurrentUser } from "@/components/AuthGate";
import { ApiError, auth, business } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { date } from "@/lib/format";
import pkg from "@/package.json";
import { ErrorState, Notice, Spinner, inputClass } from "@/components/ui";

function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (new TextEncoder().encode(next).length > 72) return setError("New password must be 72 characters or fewer.");
    setSaving(true);
    setError(null);
    try {
      await auth.changePassword(current, next);
      setDone(true);
      setCurrent("");
      setNext("");
    } catch (err) {
      setError(
        err instanceof ApiError && err.isNotImplemented
          ? "Changing your password isn't available yet."
          : err instanceof Error
            ? err.message
            : "Couldn't change your password."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[#E85D04] font-medium hover:underline">
        Change
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full space-y-3 mt-3" noValidate>
      {done && <Notice>Password changed.</Notice>}
      {error && <ErrorState error={error} compact />}
      <input type="password" autoComplete="current-password" placeholder="Current password" value={current}
        onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
      <input type="password" autoComplete="new-password" placeholder="New password (8+ characters)" value={next}
        onChange={(e) => setNext(e.target.value)} className={inputClass} />
      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="flex-1 h-11 rounded-xl bg-[#E85D04] hover:bg-[#FF8C42] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2">
          {saving ? <><Spinner /> Saving…</> : "Update password"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-11 px-4 rounded-xl border border-[#E8E8E4] text-sm font-semibold text-[#4A5568]">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Settings() {
  const { user, displayName, logout } = useCurrentUser();
  const profile = useResource("business:profile", () => business.get());
  const [loggingOut, setLoggingOut] = useState(false);

  const links = [
    { href: "/settings/business-info", label: "Business info", icon: User },
    { href: "/settings/business-intent", label: "Goals", icon: Target },
    { href: "/settings/business-structure", label: "Business structure", icon: Building2 },
    { href: "/settings/products-offered", label: "Products", icon: Package },
    { href: "/templates", label: "Message templates", icon: MessageSquareText },
  ];

  const businessName = profile.data?.business_name || (profile.notImplemented ? "—" : profile.data ? "Not set" : "…");

  return (
    <div className="w-full flex flex-col min-h-full px-4 py-6 lg:px-0 lg:py-0">
      <header className="font-display font-extrabold text-3xl lg:text-4xl text-[#1A1A1A] leading-none mb-6 lg:mb-8 tracking-tight">Settings</header>

      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <section className="w-full mb-8 lg:mb-0">
          <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3">Account &amp; Identity</p>

          <div className="bg-white rounded-2xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-[#E8E8E4]">
            <div className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="text-[#A0AEC0]">Name</span><span className="text-[#1A1A1A] font-medium truncate">{user.full_name || displayName}</span></div>
            <div className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="text-[#A0AEC0]">Email</span><span className="text-[#1A1A1A] font-medium truncate">{user.email}</span></div>
            <div className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="text-[#A0AEC0]">Business name</span><span className="text-[#1A1A1A] font-medium truncate">{businessName}</span></div>
            {user.created_at && (
              <div className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="text-[#A0AEC0]">Member since</span><span className="text-[#1A1A1A] font-medium">{date(user.created_at)}</span></div>
            )}
            <div className="px-4 py-3 text-sm">
              <div className="flex justify-between items-center gap-4">
                <span className="text-[#A0AEC0] flex items-center gap-2"><KeyRound className="w-4 h-4" /> Password</span>
                <span className="text-[#1A1A1A] font-medium">••••••••</span>
              </div>
              <div className="flex justify-end mt-1"><ChangePassword /></div>
            </div>
          </div>

          <button
            onClick={() => {
              setLoggingOut(true);
              void logout();
            }}
            disabled={loggingOut}
            className="mt-4 w-full h-12 rounded-xl border border-red-200 bg-white text-[#DC2626] font-semibold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loggingOut ? <Spinner /> : <LogOut className="w-4 h-4" />}
            Log out
          </button>
        </section>

        <section className="flex flex-col">
          <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3">Business Setup</p>

          <div className="bg-white rounded-2xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-[#E8E8E4] overflow-hidden">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center justify-between px-4 py-4 text-[#1A1A1A] hover:bg-[#FAFAF8] transition-colors group">
                <span className="flex items-center gap-3 text-sm font-medium">
                  <Icon size={18} className="text-[#4A5568]" />
                  {label}
                </span>
                <ArrowRight size={18} className="text-[#A0AEC0] group-hover:text-[#E85D04] transition-colors" />
              </Link>
            ))}
          </div>
          <p className="text-xs text-[#A0AEC0] mt-3 leading-relaxed">
            The more TENDA knows about how you sell, the better its follow-up reminders and insights get.
          </p>
          <p className="text-[11px] text-[#A0AEC0] mt-6 font-mono">TENDA web v{pkg.version}</p>
        </section>
      </div>
    </div>
  );
}
