"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ApiError, customers } from "@/lib/api";
import { invalidate } from "@/lib/hooks";
import { ErrorState, FieldLabel, PendingBackend, Spinner, inputClass, primaryButtonClass } from "@/components/ui";

export default function AddCustomer() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(new ApiError("Enter the customer's name.", 422));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await customers.create({
        name: name.trim(),
        phone: phoneNumber.trim() || null,
        email: email.trim() || null,
        note: note.trim() || null,
      });
      invalidate("customers:");
      invalidate("analytics:");
      router.push(`/customers/${encodeURIComponent(created.id)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Couldn't save the customer.", 0));
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col w-full px-4 py-6 lg:px-0 lg:py-0 lg:max-w-lg">
      <div className="relative flex items-center justify-center mb-8">
        <Link href="/customers" className="absolute left-0 flex items-center gap-1 text-sm font-medium text-[#4A5568] hover:text-[#1A1A1A] transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="font-display font-extrabold text-2xl lg:text-3xl text-[#1A1A1A] tracking-tight">Add Customer</h1>
      </div>

      {error?.isNotImplemented ? (
        <PendingBackend feature="Saving customers" endpoint="POST /customers" />
      ) : (
        error && (
          <div className="mb-5">
            <ErrorState error={error} compact />
          </div>
        )
      )}

      <form onSubmit={handleSubmit} className="flex flex-col w-full gap-5" noValidate>
        <div>
          <FieldLabel htmlFor="name">Customer name</FieldLabel>
          <input id="name" type="text" placeholder="e.g. Amina Bello" value={name} maxLength={80}
            onChange={(e) => setName(e.target.value)} className={inputClass} autoComplete="off" />
        </div>

        <div>
          <FieldLabel htmlFor="phone">Phone number <span className="text-[#A0AEC0] font-normal">(for WhatsApp &amp; calls)</span></FieldLabel>
          <input id="phone" type="tel" inputMode="tel" placeholder="e.g. 0803 123 4567" value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)} className={inputClass} autoComplete="off" />
        </div>

        <div>
          <FieldLabel htmlFor="email">Email <span className="text-[#A0AEC0] font-normal">(optional)</span></FieldLabel>
          <input id="email" type="email" inputMode="email" placeholder="customer@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="off" />
        </div>

        <div>
          <FieldLabel htmlFor="note">Note <span className="text-[#A0AEC0] font-normal">(optional)</span></FieldLabel>
          <textarea id="note" rows={3} maxLength={500} placeholder="e.g. Prefers delivery after 5pm" value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-white border border-[#E8E8E4] rounded-xl px-4 py-3 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition resize-none" />
        </div>

        <button type="submit" disabled={saving} className={`${primaryButtonClass} mt-2`}>
          {saving ? <><Spinner /> Saving…</> : "Add customer"}
        </button>
      </form>
    </div>
  );
}
