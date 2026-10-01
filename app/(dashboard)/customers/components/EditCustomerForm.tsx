"use client";

import React, { useState } from "react";
import { customers } from "@/lib/api";
import { phone as formatPhone } from "@/lib/format";
import type { CustomerDetail } from "@/lib/types";
import { ErrorState, FieldLabel, Spinner, inputClass } from "@/components/ui";

export default function EditCustomerForm({
  customer,
  onCancel,
  onSaved,
}: {
  customer: CustomerDetail;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(customer.name);
  const [phoneNumber, setPhoneNumber] = useState(formatPhone(customer.phone));
  const [email, setEmail] = useState(customer.email ?? "");
  const [note, setNote] = useState(customer.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name can't be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await customers.update(customer.id, {
        name: name.trim(),
        phone: phoneNumber.trim() || null,
        email: email.trim() || null,
        note: note.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="bg-white border border-[#E8E8E4] rounded-2xl p-4 lg:p-5 space-y-4" noValidate>
      <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest">Edit customer</p>
      {error && <ErrorState error={error} compact />}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <FieldLabel htmlFor="edit-name">Name</FieldLabel>
          <input id="edit-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <FieldLabel htmlFor="edit-phone">Phone</FieldLabel>
          <input id="edit-phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={inputClass} />
        </div>
        <div className="lg:col-span-2">
          <FieldLabel htmlFor="edit-email">Email</FieldLabel>
          <input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div className="lg:col-span-2">
          <FieldLabel htmlFor="edit-note">Note</FieldLabel>
          <textarea id="edit-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full bg-white border border-[#E8E8E4] rounded-xl px-4 py-3 text-[#1A1A1A] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="flex-1 h-11 rounded-xl bg-[#E85D04] hover:bg-[#FF8C42] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2">
          {saving ? <><Spinner /> Saving…</> : "Save changes"}
        </button>
        <button type="button" onClick={onCancel}
          className="h-11 px-5 rounded-xl border border-[#E8E8E4] text-sm font-semibold text-[#4A5568] hover:border-[#A0AEC0]">
          Cancel
        </button>
      </div>
    </form>
  );
}
