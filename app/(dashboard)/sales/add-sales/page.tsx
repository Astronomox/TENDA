"use client";

import React, { Suspense, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Keyboard, Mic, Square, Pause, Play, CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react";
import CustomerAutocomplete from "@/components/CustomerAutocomplete";
import ProductAutocomplete from "@/components/ProductAutocomplete";
import { ApiError, newIdempotencyKey, sales, voice } from "@/lib/api";
import { invalidate } from "@/lib/hooks";
import { duration, lagosDay, naira } from "@/lib/format";
import { MAX_RECORDING_SEC, useRecorder } from "@/lib/useRecorder";
import type { Customer, Product, Sale, SaleInput, VoiceLogSaleResponse } from "@/lib/types";
import { ErrorState, FieldLabel, Notice, PendingBackend, Spinner, inputClass, primaryButtonClass } from "@/components/ui";

// ─── Shared form state ───────────────────────────────────────────────────────

interface SaleForm {
  customerText: string;
  customer: Pick<Customer, "id" | "name"> | null;
  productText: string;
  product: Product | null;
  quantity: string;
  unitPrice: string;
  amountOverride: string;
  day: string; // YYYY-MM-DD (Lagos); "" = now
}

const emptyForm = (customer?: { id: string; name: string } | null): SaleForm => ({
  customerText: customer?.name ?? "",
  customer: customer ?? null,
  productText: "",
  product: null,
  quantity: "1",
  unitPrice: "",
  amountOverride: "",
  day: "",
});

function toNumber(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function validate(f: SaleForm): string | null {
  if (!f.product && !f.productText.trim()) return "Enter the product that was sold.";
  const qty = toNumber(f.quantity);
  if (qty === null || Number.isNaN(qty) || !Number.isInteger(qty) || qty < 1) return "Units must be a whole number of 1 or more.";
  if (qty > 100_000) return "Units can't be more than 100,000.";
  const price = toNumber(f.unitPrice);
  if (!f.product && price === null) return "Enter the price per unit.";
  if (price !== null && (Number.isNaN(price) || price < 0)) return "Price must be 0 or more.";
  const amount = toNumber(f.amountOverride);
  if (amount !== null && (Number.isNaN(amount) || amount < 0)) return "Total must be 0 or more.";
  if (f.day && f.day > lagosDay()) return "The sale date can't be in the future.";
  return null;
}

function toInput(f: SaleForm, extra: Partial<SaleInput> = {}): SaleInput {
  const qty = Number(f.quantity);
  const price = toNumber(f.unitPrice);
  const amount = toNumber(f.amountOverride);
  // A back-dated sale is stamped at midday Lagos time so it lands on the right day.
  const soldAt = f.day && f.day !== lagosDay() ? `${f.day}T11:00:00Z` : null;
  return {
    customer_id: f.customer?.id ?? null,
    customer_name: f.customer ? null : f.customerText.trim() || null,
    product_id: f.product?.id ?? null,
    product_name: f.product ? f.product.name : f.productText.trim(),
    quantity: qty,
    unit_price: price,
    amount,
    sold_at: soldAt,
    ...extra,
  };
}

// ─── Sale fields (used by both tabs) ─────────────────────────────────────────

function SaleFields({ form, setForm }: { form: SaleForm; setForm: React.Dispatch<React.SetStateAction<SaleForm>> }) {
  const qty = Number(form.quantity) || 0;
  const price = toNumber(form.unitPrice) ?? form.product?.price ?? 0;
  const computed = Number.isNaN(price) ? 0 : qty * price;
  const override = toNumber(form.amountOverride);

  return (
    <>
      <div>
        <FieldLabel htmlFor="customer">Customer <span className="text-[#A0AEC0] font-normal">(optional)</span></FieldLabel>
        <CustomerAutocomplete
          id="customer"
          text={form.customerText}
          selected={form.customer as Customer | null}
          onTextChange={(t) => setForm((f) => ({ ...f, customerText: t, customer: null }))}
          onSelect={(c) => setForm((f) => ({ ...f, customerText: c.name, customer: c }))}
        />
        <p className="text-[11px] text-[#A0AEC0] mt-1.5">
          {form.customer
            ? "✓ Linked to an existing customer"
            : form.customerText.trim()
              ? `"${form.customerText.trim()}" will be added as a new customer`
              : "Leave empty for a walk-in sale (won't appear in follow-ups)"}
        </p>
      </div>

      <div>
        <FieldLabel htmlFor="product">Product</FieldLabel>
        <ProductAutocomplete
          id="product"
          text={form.productText}
          selected={form.product}
          onTextChange={(t) => setForm((f) => ({ ...f, productText: t, product: null }))}
          onSelect={(p) =>
            setForm((f) => ({ ...f, productText: p.name, product: p, unitPrice: String(p.price ?? "") }))
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="qty">Units</FieldLabel>
          <input id="qty" type="number" inputMode="numeric" min={1} step={1} value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <FieldLabel htmlFor="price">Price per unit (₦)</FieldLabel>
          <input id="price" type="number" inputMode="decimal" min={0} step="0.01" value={form.unitPrice}
            placeholder={form.product ? String(form.product.price) : "0"}
            onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="total">Total (₦) <span className="text-[#A0AEC0] font-normal">— discount?</span></FieldLabel>
          <input id="total" type="number" inputMode="decimal" min={0} step="0.01" value={form.amountOverride}
            placeholder={String(computed || 0)}
            onChange={(e) => setForm((f) => ({ ...f, amountOverride: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <FieldLabel htmlFor="day">Date</FieldLabel>
          <input id="day" type="date" max={lagosDay()} value={form.day || lagosDay()}
            onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))} className={inputClass} />
        </div>
      </div>

      <div className="flex items-center justify-between bg-[#FFF7F0] border border-[#F4C9A4] rounded-xl px-4 py-3">
        <span className="text-sm text-[#C94E00] font-medium">Sale total</span>
        <span className="font-mono font-bold text-lg text-[#1A1A1A]">
          {naira(override !== null && !Number.isNaN(override) ? override : computed)}
        </span>
      </div>
    </>
  );
}

function SavedBanner({ sale, onAnother }: { sale: Sale; onAnother: () => void }) {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded-2xl p-5 text-center space-y-3">
      <CheckCircle2 className="w-10 h-10 text-[#16A34A] mx-auto" />
      <p className="font-semibold text-[#1A1A1A]">Sale recorded</p>
      <p className="text-sm text-[#4A5568]">
        {sale.quantity} × {sale.product_name}
        {sale.customer_name ? ` to ${sale.customer_name}` : ""} — <span className="font-mono font-bold">{naira(sale.amount)}</span>
      </p>
      <div className="flex gap-3 justify-center pt-1">
        <button onClick={onAnother} className="h-11 px-5 rounded-xl bg-[#E85D04] hover:bg-[#FF8C42] text-white text-sm font-semibold">
          Log another
        </button>
        <Link href="/sales" className="h-11 px-5 rounded-xl border border-[#E8E8E4] text-sm font-semibold text-[#4A5568] flex items-center">
          View sales
        </Link>
      </div>
    </div>
  );
}

function invalidateAfterSale() {
  invalidate("analytics:");
  invalidate("sales:");
  invalidate("customers:");
  invalidate("followups:");
  invalidate("insights:");
}

// ─── Type it ────────────────────────────────────────────────────────────────

function TypeSale({ initialCustomer }: { initialCustomer: { id: string; name: string } | null }) {
  const [form, setForm] = useState<SaleForm>(() => emptyForm(initialCustomer));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState<Sale | null>(null);
  // One key per submission attempt-set; reused if the user retries after a timeout.
  const keyRef = useRef(newIdempotencyKey());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate(form);
    if (problem) {
      setError(new ApiError(problem, 422));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const sale = await sales.create(toInput(form, { source: "manual" }), keyRef.current);
      invalidateAfterSale();
      setSaved(sale);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Couldn't save the sale.", 0));
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <SavedBanner
        sale={saved}
        onAnother={() => {
          keyRef.current = newIdempotencyKey();
          setForm(emptyForm(null));
          setSaved(null);
        }}
      />
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col w-full gap-5" noValidate>
      {error?.isNotImplemented ? (
        <PendingBackend feature="Typing in sales" endpoint="POST /sales" />
      ) : (
        error && <ErrorState error={error} compact />
      )}
      <SaleFields form={form} setForm={setForm} />
      <button type="submit" disabled={saving} className={`${primaryButtonClass} mt-1`}>
        {saving ? <><Spinner /> Saving…</> : "Record Sale"}
      </button>
    </form>
  );
}

// ─── Speak it ───────────────────────────────────────────────────────────────

function SpeakSale() {
  const rec = useRecorder();
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<VoiceLogSaleResponse | null>(null);
  const [form, setForm] = useState<SaleForm>(() => emptyForm(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState<Sale | null>(null);
  const keyRef = useRef(newIdempotencyKey());

  async function finishRecording() {
    const recording = await rec.stop();
    if (!recording || recording.durationSec < 0.5) {
      setError(new ApiError("That was too short. Hold the button and say the sale, e.g. “Sold two shea butter to Amina for nine thousand”.", 422));
      return;
    }
    setParsing(true);
    setError(null);
    try {
      const res = await voice.parseSale(recording.blob);
      const d = res.draft;
      setParsed(res);
      setForm({
        customerText: d.customer_name ?? "",
        customer: d.customer_id && d.customer_name ? { id: d.customer_id, name: d.customer_name } : null,
        productText: d.product_name ?? "",
        product:
          d.product_id && d.product_name
            ? { id: d.product_id, name: d.product_name, price: d.unit_price ?? 0, repurchase_days: null, is_replenishable: null }
            : null,
        quantity: String(d.quantity ?? 1),
        unitPrice: d.unit_price !== null && d.unit_price !== undefined ? String(d.unit_price) : "",
        amountOverride:
          d.amount !== null && d.unit_price !== null && d.quantity !== null && Math.abs(d.amount - d.unit_price * d.quantity) > 0.01
            ? String(d.amount)
            : "",
        day: d.sold_at ? lagosDay(new Date(d.sold_at)) : "",
      });
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError("Couldn't understand that recording.", 0);
      // SALE_NOT_UNDERSTOOD may still carry a partial draft (README §11.3).
      const body = e.body as Partial<VoiceLogSaleResponse> | null;
      if (e.code === "SALE_NOT_UNDERSTOOD" && body?.draft) {
        setParsed(body as VoiceLogSaleResponse);
        setForm((f) => ({
          ...f,
          productText: body.draft?.product_name ?? "",
          quantity: String(body.draft?.quantity ?? 1),
          customerText: body.draft?.customer_name ?? "",
        }));
      }
      setError(e);
    } finally {
      setParsing(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate(form);
    if (problem) {
      setError(new ApiError(problem, 422));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const sale = await sales.create(
        toInput(form, { source: "voice", transcript: parsed?.transcript ?? null }),
        keyRef.current
      );
      invalidateAfterSale();
      setSaved(sale);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Couldn't save the sale.", 0));
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    keyRef.current = newIdempotencyKey();
    setParsed(null);
    setSaved(null);
    setError(null);
    setForm(emptyForm(null));
  }

  if (saved) return <SavedBanner sale={saved} onAnother={reset} />;

  const recording = rec.state !== "idle";

  // Step 2: review what TENDA heard
  if (parsed) {
    return (
      <form onSubmit={confirm} className="flex flex-col w-full gap-5" noValidate>
        <div className="bg-white border border-[#E8E8E4] rounded-2xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A0AEC0] mb-1">TENDA heard</p>
          <p className="text-sm text-[#1A1A1A] italic">&ldquo;{parsed.transcript || "…"}&rdquo;</p>
          {parsed.confidence < 0.6 && (
            <p className="mt-2 text-xs text-[#D97706] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Not fully sure — please check the details below.
            </p>
          )}
          {parsed.warnings?.map((w) => (
            <p key={w} className="mt-1 text-xs text-[#D97706]">{w}</p>
          ))}
        </div>

        {parsed.candidates && parsed.candidates.customers.length > 1 && !form.customer && (
          <div>
            <p className="text-sm font-medium text-[#4A5568] mb-2">Which customer did you mean?</p>
            <div className="flex flex-wrap gap-2">
              {parsed.candidates.customers.map((c) => (
                <button key={c.id} type="button" onClick={() => setForm((f) => ({ ...f, customer: c, customerText: c.name }))}
                  className="text-sm px-3 py-1.5 rounded-full border border-[#E8E8E4] hover:border-[#E85D04] hover:text-[#E85D04]">
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <ErrorState error={error} compact />}
        {parsed.missing_fields.length > 0 && (
          <Notice tone="info">Please fill in: {parsed.missing_fields.join(", ").replace(/_/g, " ")}.</Notice>
        )}

        <SaleFields form={form} setForm={setForm} />

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={`${primaryButtonClass} flex-1`}>
            {saving ? <><Spinner /> Saving…</> : "Confirm & save"}
          </button>
          <button type="button" onClick={reset}
            className="h-14 px-5 rounded-xl border border-[#E8E8E4] text-sm font-semibold text-[#4A5568] flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Redo
          </button>
        </div>
      </form>
    );
  }

  // Step 1: record
  return (
    <div className="flex flex-col items-center text-center gap-5 py-4">
      {error?.isNotImplemented ? (
        <PendingBackend feature="Voice sale review" endpoint="POST /voice/log-sale?dry_run=true" />
      ) : (
        (error || rec.error) && <div className="w-full"><ErrorState error={error ?? rec.error!} compact /></div>
      )}

      <p className="text-sm text-[#4A5568] max-w-xs leading-relaxed">
        Tap the mic and say the sale, for example:
        <br />
        <span className="italic text-[#1A1A1A]">&ldquo;Sold two shea butter to Amina for nine thousand&rdquo;</span>
      </p>

      <button
        type="button"
        disabled={parsing}
        onClick={() => (recording ? void finishRecording() : void rec.start())}
        className={`w-28 h-28 rounded-full flex items-center justify-center text-white transition-all shadow-[0_8px_30px_rgba(232,93,4,0.35)] disabled:opacity-60 ${
          recording ? "bg-[#1A1A1A] scale-105" : "bg-[#E85D04] hover:bg-[#FF8C42]"
        }`}
        aria-label={recording ? "Stop recording" : "Start recording"}
      >
        {parsing ? <Spinner className="w-8 h-8" /> : recording ? <Square className="w-9 h-9 fill-white" /> : <Mic className="w-10 h-10" />}
      </button>

      <div className="h-6 text-sm font-semibold tabular-nums text-[#4A5568]">
        {parsing
          ? "Understanding your sale…"
          : recording
            ? `${rec.state === "paused" ? "Paused · " : "Recording · "}${duration(rec.elapsed)} / ${duration(MAX_RECORDING_SEC)}`
            : "Tap to start"}
      </div>

      {recording && (
        <div className="flex gap-3">
          <button type="button" onClick={rec.togglePause}
            className="h-10 px-4 rounded-xl border border-[#E8E8E4] text-sm font-semibold text-[#4A5568] flex items-center gap-2">
            {rec.state === "paused" ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Pause</>}
          </button>
          <button type="button" onClick={rec.cancel}
            className="h-10 px-4 rounded-xl border border-[#E8E8E4] text-sm font-semibold text-[#A0AEC0] hover:text-[#DC2626]">
            Cancel
          </button>
        </div>
      )}

      <p className="text-[11px] text-[#A0AEC0]">You&apos;ll check the details before anything is saved.</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function AddSalesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = params.get("mode") === "voice" ? "voice" : "type";
  const initialCustomer = useMemo(() => {
    const id = params.get("customer");
    const name = params.get("name");
    return id && name ? { id, name } : null;
  }, [params]);

  const tab = (m: "type" | "voice") => {
    const next = new URLSearchParams(params);
    next.set("mode", m);
    router.replace(`/sales/add-sales?${next}`);
  };

  return (
    <div className="flex flex-col w-full px-4 py-6 lg:px-0 lg:py-0 lg:max-w-lg">
      <div className="relative flex items-center justify-center mb-6">
        <Link href="/sales" className="absolute left-0 flex items-center gap-1 text-sm font-medium text-[#4A5568] hover:text-[#1A1A1A] transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="font-display font-extrabold text-2xl lg:text-3xl text-[#1A1A1A] tracking-tight">Log Sale</h1>
      </div>

      <div className="flex bg-[#F0F0EC] rounded-xl p-1 mb-6" role="tablist">
        {([
          { m: "type" as const, label: "Type it", icon: Keyboard },
          { m: "voice" as const, label: "Speak it", icon: Mic },
        ]).map(({ m, label, icon: Icon }) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => tab(m)}
            className={`flex-1 h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              mode === m ? "bg-white text-[#E85D04] shadow-sm" : "text-[#718096]"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {mode === "type" ? <TypeSale key="type" initialCustomer={initialCustomer} /> : <SpeakSale key="voice" />}
    </div>
  );
}

export default function AddSales() {
  return (
    <Suspense fallback={null}>
      <AddSalesInner />
    </Suspense>
  );
}
