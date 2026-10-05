"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft, LayoutTemplate, Plus, Pencil, Trash2, Star } from "lucide-react";
import { templates as api } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import type { MessageTemplate } from "@/lib/types";
import { EmptyState, ErrorState, FieldLabel, ResourceView, SkeletonList, Spinner, inputClass } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";

const PLACEHOLDERS = ["{customer_first_name}", "{customer_name}", "{product_name}", "{business_name}", "{days_since_last_purchase}"];

function Editor({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: MessageTemplate;
  onCancel: () => void;
  onSaved: (t: MessageTemplate) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim().length > 60) return setError("Give the template a name (up to 60 characters).");
    if (!body.trim() || body.length > 1000) return setError("Write the message (up to 1,000 characters).");
    setSaving(true);
    setError(null);
    try {
      const input = { name: name.trim(), body: body.trim(), is_default: isDefault };
      onSaved(initial ? await api.update(initial.id, input) : await api.create(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the template.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="bg-white border border-[#E8E8E4] rounded-2xl p-5 space-y-4" noValidate>
      {error && <ErrorState error={error} compact />}
      <div>
        <FieldLabel htmlFor="tpl-name">Name</FieldLabel>
        <input id="tpl-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Friendly restock reminder" className={inputClass} />
      </div>
      <div>
        <FieldLabel htmlFor="tpl-body">Message</FieldLabel>
        <textarea id="tpl-body" rows={4} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Hi {customer_first_name}! Your {product_name} should be running low…"
          className="w-full bg-white border border-[#E8E8E4] rounded-xl px-4 py-3 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition resize-none" />
        {body.trim() && (
          <p className="mt-2 rounded-lg bg-[#FAFAF8] px-3 py-2 text-xs text-[#4A5568]">
            <span className="font-semibold">Preview: </span>
            {body
              .replaceAll("{customer_first_name}", "Amina")
              .replaceAll("{customer_name}", "Amina Yusuf")
              .replaceAll("{product_name}", "Shea Butter")
              .replaceAll("{business_name}", "your shop")
              .replaceAll("{days_since_last_purchase}", "21")}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {PLACEHOLDERS.map((p) => (
            <button key={p} type="button" onClick={() => setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}${p}`)}
              className="text-[11px] font-mono px-2 py-1 rounded-md bg-[#FAFAF8] border border-[#E8E8E4] text-[#4A5568] hover:border-[#E85D04] hover:text-[#E85D04]">
              {p}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-[#4A5568]">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="accent-[#E85D04]" />
        Use for follow-up messages by default
      </label>
      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="flex-1 h-11 rounded-xl bg-[#E85D04] hover:bg-[#FF8C42] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2">
          {saving ? <><Spinner /> Saving…</> : "Save template"}
        </button>
        <button type="button" onClick={onCancel} className="h-11 px-5 rounded-xl border border-[#E8E8E4] text-sm font-semibold text-[#4A5568]">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function TemplatesPage() {
  const res = useResource("templates:list", async () => {
    const data = await api.list();
    return Array.isArray(data) ? data : data.items;
  });
  const [editing, setEditing] = useState<MessageTemplate | "new" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const confirm = useConfirm();

  async function remove(t: MessageTemplate) {
    if (!(await confirm({ title: `Delete the template "${t.name}"?`, confirmLabel: "Delete template" }))) return;
    const prev = res.data;
    res.setData((list) => (list ?? []).filter((x) => x.id !== t.id));
    try {
      await api.remove(t.id);
    } catch (err) {
      if (prev) res.setData(prev);
      setActionError(err instanceof Error ? err.message : "Couldn't delete the template.");
    }
  }

  function onSaved(t: MessageTemplate) {
    setEditing(null);
    res.setData((list) => {
      const others = (list ?? []).filter((x) => x.id !== t.id).map((x) => (t.is_default ? { ...x, is_default: false } : x));
      return [t, ...others];
    });
  }

  return (
    <div className="px-4 py-6 lg:px-0 lg:py-0 lg:max-w-2xl">
      <Link href="/settings" className="flex items-center gap-1 text-sm font-medium text-[#4A5568] hover:text-[#1A1A1A] transition-colors w-fit mb-5">
        <ChevronLeft className="w-4 h-4" /> Settings
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-extrabold text-3xl text-[#1A1A1A] leading-none tracking-tight">Templates</h1>
        {res.data && editing === null && (
          <button onClick={() => setEditing("new")}
            className="flex items-center gap-1.5 bg-[#E85D04] hover:bg-[#FF8C42] text-white text-sm font-semibold px-4 py-2.5 rounded-full">
            <Plus className="w-4 h-4" /> New
          </button>
        )}
      </div>

      {actionError && <div className="mb-4"><ErrorState error={actionError} compact /></div>}
      {editing === "new" && <div className="mb-4"><Editor onCancel={() => setEditing(null)} onSaved={onSaved} /></div>}

      <ResourceView resource={res} feature="Message templates" endpoint="GET /templates" loading={<SkeletonList rows={3} />}>
        {(list) =>
          list.length === 0 && editing !== "new" ? (
            <EmptyState
              icon={LayoutTemplate}
              title="No templates yet"
              body="Save the messages you send customers so follow-ups take one tap."
              action={
                <button onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 bg-[#E85D04] text-white text-sm font-semibold px-5 py-2.5 rounded-full">
                  <Plus className="w-4 h-4" /> Create a template
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {list.map((t) =>
                editing !== "new" && editing?.id === t.id ? (
                  <Editor key={t.id} initial={t} onCancel={() => setEditing(null)} onSaved={onSaved} />
                ) : (
                  <div key={t.id} className="bg-white border border-[#E8E8E4] rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-[#1A1A1A] flex items-center gap-2">
                        {t.name}
                        {t.is_default && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#E85D04] bg-[#FFF0E6] rounded-full px-2 py-0.5">
                            <Star className="w-3 h-3" /> Default
                          </span>
                        )}
                      </p>
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(t)} className="p-1.5 rounded-lg text-[#A0AEC0] hover:text-[#E85D04]" aria-label={`Edit ${t.name}`}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => void remove(t)} className="p-1.5 rounded-lg text-[#A0AEC0] hover:text-[#DC2626]" aria-label={`Delete ${t.name}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-[#4A5568] mt-2 whitespace-pre-wrap leading-relaxed">{t.body}</p>
                  </div>
                )
              )}
            </div>
          )
        }
      </ResourceView>
    </div>
  );
}
