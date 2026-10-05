"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ArrowRight, Mic, Receipt, Trash2 } from "lucide-react";
import { analytics, ApiError, sales as salesApi } from "@/lib/api";
import { invalidate, useResource } from "@/lib/hooks";
import { dateTime, initials, naira, number, pct } from "@/lib/format";
import type { AnalyticsSummary, DashboardAnalytics, Sale } from "@/lib/types";
import { EmptyState, ErrorState, PendingBackend, Skeleton, SkeletonList } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";

type Overview = { kind: "full"; data: DashboardAnalytics } | { kind: "summary"; data: AnalyticsSummary };

async function loadOverview(): Promise<Overview> {
  try {
    return { kind: "full", data: await analytics.dashboard() };
  } catch (err) {
    if (err instanceof ApiError && err.isNotImplemented) return { kind: "summary", data: await analytics.summary() };
    throw err;
  }
}

const PAGE = 20;

function SaleRow({ sale, onDelete }: { sale: Sale; onDelete: (s: Sale) => void }) {
  const who = sale.customer_name || "Walk-in customer";
  return (
    <div className="bg-white p-4 rounded-xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex justify-between items-center gap-3 group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-semibold bg-gradient-to-br from-[#FFF0E6] to-[#FFD4B3] text-[#E85D04]">
          {sale.customer_name ? initials(sale.customer_name) : <Receipt className="w-4 h-4" />}
        </div>
        <div className="flex flex-col min-w-0">
          {sale.customer_id ? (
            <Link href={`/customers/${encodeURIComponent(sale.customer_id)}`} className="font-semibold text-[#1A1A1A] text-sm truncate hover:text-[#E85D04]">
              {who}
            </Link>
          ) : (
            <span className="font-semibold text-[#1A1A1A] text-sm truncate">{who}</span>
          )}
          <span className="text-xs text-[#4A5568] truncate">
            {number(sale.quantity)} × {sale.product_name}
          </span>
          <span className="text-[11px] text-[#A0AEC0] flex items-center gap-1">
            {sale.source === "voice" && <Mic className="w-3 h-3" />}
            {dateTime(sale.sold_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-mono font-bold text-[#1A1A1A]">{naira(sale.amount)}</span>
        <button
          onClick={() => onDelete(sale)}
          className="p-1.5 rounded-lg text-[#A0AEC0] hover:text-[#DC2626] hover:bg-red-50 lg:opacity-0 lg:group-hover:opacity-100 transition-all"
          aria-label={`Delete sale of ${sale.product_name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function SalesPage() {
  const overview = useResource("analytics:dashboard", loadOverview);
  const [limit, setLimit] = useState(PAGE);
  const list = useResource(`sales:list:${limit}`, () => salesApi.list({ limit, sort: "-sold_at" }));
  const [actionError, setActionError] = useState<string | null>(null);
  const confirm = useConfirm();

  async function handleDelete(sale: Sale) {
    if (!(await confirm({ title: "Delete this sale?", message: `${sale.product_name} (${naira(sale.amount)}) will be removed from your totals.`, confirmLabel: "Delete sale" }))) return;
    setActionError(null);
    const prev = list.data;
    list.setData((p) => (p ? { ...p, items: p.items.filter((s) => s.id !== sale.id), total: p.total - 1 } : p!));
    try {
      await salesApi.remove(sale.id);
      invalidate("analytics:");
      invalidate("customers:");
      invalidate("followups:");
      invalidate("insights:");
      void overview.reload();
    } catch (err) {
      if (prev) list.setData(prev);
      setActionError(err instanceof Error ? err.message : "Couldn't delete the sale.");
    }
  }

  const o = overview.data;
  const full = o?.kind === "full" ? o.data : null;
  const summary = o?.kind === "summary" ? o.data : null;
  const growth = full ? pct(full.growth.month_over_month_pct) : null;

  const cards: { label: string; value: string; sub?: React.ReactNode }[] = full
    ? [
        {
          label: "This Month",
          value: naira(full.revenue.this_month),
          sub: growth ? (
            <span className={(full.growth.month_over_month_pct ?? 0) >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}>
              {growth} vs last month
            </span>
          ) : (
            <span className="text-[#A0AEC0]">First month of sales</span>
          ),
        },
        { label: "This Week", value: naira(full.revenue.this_week), sub: `${number(full.transactions.this_week)} sales` },
        { label: "Today", value: naira(full.revenue.today), sub: `${number(full.transactions.today)} sales` },
        { label: "All Time", value: naira(full.revenue.all_time), sub: `${number(full.transactions.all_time)} sales` },
      ]
    : summary
      ? [
          { label: "Total Revenue", value: naira(summary.total_revenue), sub: "All time" },
          { label: "Total Sales", value: number(summary.total_transactions), sub: "Transactions logged" },
        ]
      : [];

  return (
    <div className="px-4 py-6 lg:px-0 lg:py-0 space-y-5">
      <h1 className="font-display font-extrabold text-3xl lg:text-4xl text-[#1A1A1A] leading-none tracking-tight">Sales</h1>

      {/* Overview Cards */}
      {overview.error && !o ? (
        <ErrorState error={overview.error} onRetry={() => void overview.reload()} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {o
            ? cards.map((c) => (
                <div key={c.label} className="bg-white p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E8E8E4] flex flex-col justify-between h-28">
                  <span className="text-xs text-[#A0AEC0] font-semibold uppercase tracking-widest">{c.label}</span>
                  <div>
                    <span className="font-mono font-bold text-xl lg:text-2xl text-[#1A1A1A]">{c.value}</span>
                    {c.sub && <div className="text-[11px] mt-1 font-medium text-[#A0AEC0]">{c.sub}</div>}
                  </div>
                </div>
              ))
            : Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      )}

      {/* Top products (from analytics summary) */}
      {summary && summary.top_products.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-4">
          <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-2">Top products</p>
          {summary.top_products.slice(0, 5).map((p) => (
            <div key={p.product_name} className="flex justify-between py-2 border-b border-[#F0F0EC] last:border-0 text-sm">
              <span className="text-[#1A1A1A]">{p.product_name} <span className="text-[#A0AEC0]">· {number(p.total_quantity)} units</span></span>
              <span className="font-mono font-bold">{naira(p.total_revenue)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Log new sale */}
      <div className="flex flex-col sm:flex-row gap-3 lg:max-w-lg">
        <Link
          href="/sales/add-sales"
          className="flex-1 bg-[#E85D04] hover:bg-[#FF8C42] text-white font-semibold h-14 rounded-xl shadow-[0_4px_20px_rgba(232,93,4,0.25)] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Log New Sale
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/sales/add-sales?mode=voice"
          className="sm:w-auto px-5 bg-white border border-[#E8E8E4] hover:border-[#E85D04] text-[#1A1A1A] font-semibold h-14 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Mic className="w-4 h-4 text-[#E85D04]" /> Speak a sale
        </Link>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3">Recent Transactions</h3>
        {actionError && <div className="mb-3"><ErrorState error={actionError} compact /></div>}

        {list.data ? (
          list.data.items.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No sales recorded yet"
              body="Log your first sale by typing it or just saying it out loud."
              action={
                <Link href="/sales/add-sales" className="inline-flex items-center gap-1.5 rounded-full bg-[#E85D04] px-5 py-2.5 text-sm font-semibold text-white">
                  Log your first sale
                </Link>
              }
            />
          ) : (
            <>
              <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                {list.data.items.map((s) => (
                  <SaleRow key={s.id} sale={s} onDelete={(x) => void handleDelete(x)} />
                ))}
              </div>
              {list.data.total > list.data.items.length && (
                <button
                  onClick={() => setLimit((l) => l + PAGE)}
                  disabled={list.loading}
                  className="mt-4 w-full h-11 rounded-xl border border-[#E8E8E4] text-sm font-semibold text-[#4A5568] hover:border-[#E85D04] disabled:opacity-60"
                >
                  {list.loading ? "Loading…" : `Show more (${list.data.total - list.data.items.length} more)`}
                </button>
              )}
            </>
          )
        ) : list.notImplemented ? (
          <PendingBackend feature="The sales list" endpoint="GET /sales" />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={() => void list.reload()} />
        ) : (
          <SkeletonList rows={4} />
        )}
      </div>
    </div>
  );
}
