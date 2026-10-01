"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { ApiError, products as productsApi } from "@/lib/api";
import { invalidate, useResource } from "@/lib/hooks";
import { naira } from "@/lib/format";
import type { Product, ProductInput } from "@/lib/types";
import { ErrorState, FieldLabel, Notice, PendingBackend, Skeleton, Spinner, inputClass } from "@/components/ui";

interface Row {
  key: string;
  /** Present for products that already exist on the server. */
  id?: string;
  name: string;
  price: string;
  repurchaseDays: string;
  replenishable: "" | "true" | "false";
  original?: Product;
}

let rowSeq = 0;
const newRow = (): Row => ({ key: `new-${++rowSeq}`, name: "", price: "", repurchaseDays: "", replenishable: "" });

const fromProduct = (p: Product): Row => ({
  key: p.id,
  id: p.id,
  name: p.name,
  price: String(p.price),
  repurchaseDays: p.repurchase_days ? String(p.repurchase_days) : "",
  replenishable: p.is_replenishable === null ? "" : p.is_replenishable ? "true" : "false",
  original: p,
});

function toInput(r: Row): ProductInput {
  return {
    name: r.name.trim(),
    price: Number(r.price),
    repurchase_days: r.repurchaseDays ? Number(r.repurchaseDays) : null,
    is_replenishable: r.replenishable === "" ? null : r.replenishable === "true",
  };
}

const isBlank = (r: Row) => !r.id && !r.name.trim() && !r.price.trim();

function rowError(r: Row, i: number): string | null {
  const label = r.name.trim() ? `"${r.name.trim()}"` : `Product ${i + 1}`;
  if (!r.name.trim()) return `${label}: enter a name.`;
  if (r.name.trim().length > 80) return `${label}: name must be 80 characters or fewer.`;
  const price = Number(r.price);
  if (r.price.trim() === "" || !Number.isFinite(price) || price < 0) return `${label}: enter a price of 0 or more.`;
  if (r.repurchaseDays) {
    const d = Number(r.repurchaseDays);
    if (!Number.isInteger(d) || d < 1 || d > 365) return `${label}: repurchase time must be 1–365 days.`;
  }
  return null;
}

function changed(r: Row): boolean {
  if (!r.original) return false;
  const a = toInput(r);
  const o = r.original;
  return a.name !== o.name || a.price !== o.price || a.repurchase_days !== o.repurchase_days || a.is_replenishable !== o.is_replenishable;
}

export default function ProductsInventory() {
  const res = useResource("products:all", () => productsApi.list({ limit: 200, sort: "name" }));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [removed, setRemoved] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (res.data && rows === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seed editable rows once data arrives
      setRows(res.data.items.length ? res.data.items.map(fromProduct) : [newRow()]);
    }
  }, [res.data, rows]);

  const update = (key: string, patch: Partial<Row>) => {
    setSaved(false);
    setRows((rs) => rs!.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const remove = (row: Row) => {
    setSaved(false);
    if (row.id) setRemoved((rm) => [...rm, row]);
    setRows((rs) => {
      const next = rs!.filter((r) => r.key !== row.key);
      return next.length ? next : [newRow()];
    });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!rows) return;
    const active = rows.filter((r) => !isBlank(r));
    const problem = active.map(rowError).find(Boolean);
    if (problem) {
      setError(problem);
      return;
    }
    const names = active.map((r) => r.name.trim().toLowerCase());
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) {
      setError(`You have two products called "${dup}".`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      for (const r of removed) await productsApi.remove(r.id!);
      for (const r of active.filter(changed)) await productsApi.update(r.id!, toInput(r));
      const created = active.filter((r) => !r.id);
      if (created.length) await productsApi.bulkCreate(created.map(toInput));

      invalidate("products:");
      invalidate("followups:");
      invalidate("insights:");
      const fresh = await productsApi.list({ limit: 200, sort: "name" });
      res.setData(fresh);
      setRows(fresh.items.length ? fresh.items.map(fromProduct) : [newRow()]);
      setRemoved([]);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiError && err.isNotImplemented
          ? "Saving products isn't available on the server yet."
          : err instanceof Error
            ? err.message
            : "Couldn't save your products."
      );
      // Re-sync with what actually got saved before the failure.
      void res.reload().then(() => undefined);
    } finally {
      setSaving(false);
    }
  }

  const active = rows?.filter((r) => !isBlank(r)) ?? [];
  const avgPrice = active.length ? active.reduce((s, r) => s + (Number(r.price) || 0), 0) / active.length : 0;

  return (
    <div className="w-full px-4 py-6 lg:px-0 lg:py-0">
      <div className="max-w-3xl">
        <Link href="/settings" className="flex items-center gap-1 text-sm font-medium text-[#4A5568] hover:text-[#1A1A1A] transition-colors w-fit mb-5">
          <ChevronLeft className="w-4 h-4" /> Settings
        </Link>
        <h1 className="font-display font-extrabold tracking-tight text-3xl lg:text-4xl text-[#1A1A1A] mb-2">Products</h1>
        <p className="text-[#4A5568] mb-8">What you sell, and how often customers buy it again.</p>

        {!rows ? (
          res.notImplemented ? (
            <PendingBackend feature="Your product list" endpoint="GET /products" />
          ) : res.error ? (
            <ErrorState error={res.error} onRetry={() => void res.reload()} />
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          )
        ) : (
          <form onSubmit={save} noValidate>
            <div className="space-y-6">
              {rows.map((row, i) => (
                <div
                  key={row.key}
                  className="bg-white rounded-2xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 relative"
                >
                  <button
                    type="button"
                    onClick={() => remove(row)}
                    className="absolute top-4 right-4 text-sm font-medium text-[#A0AEC0] hover:text-[#DC2626] transition-colors"
                  >
                    Remove
                  </button>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2 pr-16">
                      <FieldLabel htmlFor={`name-${row.key}`}>Product name</FieldLabel>
                      <input id={`name-${row.key}`} value={row.name} maxLength={80} placeholder={`Product ${i + 1}`}
                        onChange={(e) => update(row.key, { name: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <FieldLabel htmlFor={`price-${row.key}`}>Price (₦)</FieldLabel>
                      <input id={`price-${row.key}`} type="number" inputMode="decimal" min={0} step="0.01" value={row.price}
                        onChange={(e) => update(row.key, { price: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <FieldLabel htmlFor={`days-${row.key}`}>Bought again every (days)</FieldLabel>
                      <input id={`days-${row.key}`} type="number" inputMode="numeric" min={1} max={365} value={row.repurchaseDays}
                        placeholder="e.g. 30" disabled={row.replenishable === "false"}
                        onChange={(e) => update(row.key, { repurchaseDays: e.target.value })} className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel htmlFor={`rep-${row.key}`}>Do customers buy this again?</FieldLabel>
                      <select id={`rep-${row.key}`} value={row.replenishable}
                        onChange={(e) =>
                          update(row.key, {
                            replenishable: e.target.value as Row["replenishable"],
                            ...(e.target.value === "false" ? { repurchaseDays: "" } : {}),
                          })
                        }
                        className={inputClass}>
                        <option value="">Not sure</option>
                        <option value="true">Yes, customers buy it repeatedly</option>
                        <option value="false">No, it&apos;s a one-time purchase</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setRows((rs) => [...rs!, newRow()])}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#E8E8E4] bg-white text-sm font-semibold text-[#1A1A1A] hover:border-[#E85D04] hover:text-[#E85D04] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Another Product
              </button>
            </div>

            <div className="mt-10 bg-white rounded-2xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
              <h2 className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3">Summary</h2>
              <div className="flex justify-between py-1 text-sm"><span className="text-[#4A5568]">Products</span><span className="font-mono font-bold text-[#1A1A1A]">{active.length}</span></div>
              <div className="flex justify-between py-1 text-sm"><span className="text-[#4A5568]">Average price</span><span className="font-mono font-bold text-[#1A1A1A]">{naira(avgPrice)}</span></div>
              <div className="flex justify-between py-1 text-sm"><span className="text-[#4A5568]">With a repurchase time</span><span className="font-mono font-bold text-[#1A1A1A]">{active.filter((r) => r.repurchaseDays).length}</span></div>
            </div>

            <div className="mt-6 space-y-3">
              {error && <ErrorState error={error} compact />}
              {saved && <Notice>Products saved.</Notice>}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 bg-[#E85D04] hover:bg-[#FF8C42] active:scale-95 disabled:opacity-60 rounded-xl py-3.5 w-full text-white font-semibold transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)] flex items-center justify-center gap-2"
            >
              {saving ? <><Spinner /> Saving…</> : "Save Products"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
