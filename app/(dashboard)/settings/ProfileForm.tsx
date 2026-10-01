"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ApiError, business } from "@/lib/api";
import { invalidate, useResource } from "@/lib/hooks";
import type { BusinessProfile } from "@/lib/types";
import { ErrorState, Notice, PendingBackend, Skeleton, Spinner } from "@/components/ui";

export function RadioGroup<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2 text-sm" role="radiogroup">
      {options.map((o) => (
        <label
          key={o.value}
          className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 cursor-pointer transition ${
            value === o.value ? "border-[#E85D04] bg-[#FFF7F0]" : "border-[#E8E8E4] hover:border-[#E85D04]"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="accent-[#E85D04]"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-widest text-[#A0AEC0] font-semibold">{title}</h2>
      {hint && <p className="text-xs text-[#4A5568] -mt-1">{hint}</p>}
      {children}
    </section>
  );
}

/**
 * Loads GET /business/profile, lets the page edit a draft, and saves with
 * PUT /business/profile. `extraSave` runs alongside (e.g. PATCH /auth/me).
 */
export default function ProfileForm({
  title,
  subtitle,
  next,
  validate,
  extraSave,
  children,
}: {
  title: string;
  subtitle?: string;
  next?: { href: string; label: string };
  validate?: (draft: BusinessProfile) => string | null;
  extraSave?: () => Promise<void>;
  children: (draft: BusinessProfile, set: (patch: Partial<BusinessProfile>) => void) => React.ReactNode;
}) {
  const res = useResource("business:profile", () => business.get());
  const [draft, setDraft] = useState<BusinessProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed the editable draft once data arrives
    if (res.data && !draft) setDraft(res.data);
  }, [res.data, draft]);

  const set = (patch: Partial<BusinessProfile>) => {
    setSaved(false);
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const problem = validate?.(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { updated_at, ...body } = draft;
      const [updated] = await Promise.all([business.update(body), extraSave?.()]);
      res.setData(updated);
      setDraft(updated);
      invalidate("insights:");
      invalidate("followups:");
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err : "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col w-full px-4 py-6 lg:px-0 lg:py-0 lg:max-w-lg">
      <Link href="/settings" className="flex items-center gap-1 text-sm font-medium text-[#4A5568] hover:text-[#1A1A1A] transition-colors w-fit mb-5">
        <ChevronLeft className="w-4 h-4" /> Settings
      </Link>

      <div className="space-y-1 mb-6">
        <h1 className="font-display font-extrabold tracking-tight text-2xl lg:text-3xl text-[#1A1A1A]">{title}</h1>
        {subtitle && <p className="text-sm text-[#4A5568]">{subtitle}</p>}
      </div>

      {!draft ? (
        res.notImplemented ? (
          <PendingBackend feature="Business settings" endpoint="GET /business/profile" />
        ) : res.error ? (
          <ErrorState error={res.error} onRetry={() => void res.reload()} />
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )
      ) : (
        <form onSubmit={save} className="bg-white border border-[#E8E8E4] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 lg:p-6 space-y-8" noValidate>
          {children(draft, set)}

          {error && <ErrorState error={error} compact />}
          {saved && <Notice>Saved.</Notice>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#E85D04] hover:bg-[#FF8C42] active:scale-95 disabled:opacity-60 text-white py-3.5 rounded-xl text-sm font-semibold transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)] flex items-center justify-center gap-2"
          >
            {saving ? <><Spinner /> Saving…</> : "Save Changes"}
          </button>

          {next && (
            <Link href={next.href} className="block text-center text-sm font-semibold text-[#E85D04] hover:text-[#FF8C42] transition-colors">
              {next.label} →
            </Link>
          )}
        </form>
      )}
    </div>
  );
}
