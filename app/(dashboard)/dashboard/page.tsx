"use client";

import Link from "next/link";
import React, { useState } from "react";
import {
  Wallet, Users, Clock, TrendingUp, TrendingDown, Plus, ChevronRight, ShoppingBag, Sparkles, RefreshCw, Award,
} from "lucide-react";
import { useCurrentUser } from "@/components/AuthGate";
import { analytics, ai, ApiError } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { firstName, initials, naira, number, pct, relative, todayLabel } from "@/lib/format";
import type { AnalyticsSummary, DashboardAnalytics } from "@/lib/types";
import { ErrorState, Skeleton, Spinner } from "@/components/ui";

type DashboardData =
  | { kind: "full"; data: DashboardAnalytics }
  | { kind: "summary"; data: AnalyticsSummary };

/**
 * GET /analytics/dashboard (README §12.2). Until the backend ships it, fall
 * back to GET /analytics/summary so the all-time figures still show.
 */
async function loadDashboard(): Promise<DashboardData> {
  try {
    return { kind: "full", data: await analytics.dashboard() };
  } catch (err) {
    if (err instanceof ApiError && err.isNotImplemented) {
      return { kind: "summary", data: await analytics.summary() };
    }
    throw err;
  }
}

function StatCard({
  icon: Icon,
  iconClass,
  value,
  label,
  href,
  dot,
}: {
  icon: React.ElementType;
  iconClass: string;
  value: React.ReactNode;
  label: string;
  href?: string;
  dot?: boolean;
}) {
  const body = (
    <div className="bg-white p-4 lg:p-6 rounded-xl lg:rounded-2xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative h-full hover:border-[#FFD4B3] transition-all">
      {dot && <div className="absolute top-4 right-4 h-2 w-2 bg-[#E85D04] rounded-full" />}
      <div className={`p-2 rounded-lg w-fit mb-3 ${iconClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-mono font-bold text-2xl text-[#1A1A1A]">{value}</p>
      <p className="text-xs text-[#4A5568] mt-1">{label}</p>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

function Briefing() {
  const [text, setText] = useState<string | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await ai.summary("week");
      setText(res.summary);
      setAt(res.generated_at ?? new Date().toISOString());
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Couldn't get your briefing.", 0));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-[#E8E8E4] rounded-2xl p-5 lg:p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFF0E6] border border-[#F4C9A4] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#E85D04]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1A1A1A]">AI briefing</p>
            <p className="text-[10px] text-[#A0AEC0]">
              {at ? `Generated ${relative(at)}` : "A quick read on your week"}
            </p>
          </div>
        </div>
        {text && (
          <button
            onClick={() => void generate()}
            disabled={loading}
            className="p-2 rounded-lg text-[#A0AEC0] hover:text-[#E85D04] disabled:opacity-50"
            aria-label="Regenerate briefing"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {text ? (
        <p className="text-sm text-[#4A5568] leading-relaxed whitespace-pre-line">{text}</p>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void generate()} compact />
      ) : (
        <button
          onClick={() => void generate()}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#E85D04] hover:underline disabled:opacity-60"
        >
          {loading ? <Spinner /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Reading your numbers…" : "Get my briefing"}
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { displayName } = useCurrentUser();
  const res = useResource("analytics:dashboard", loadDashboard);
  const d = res.data;

  const failed = !d && !!res.error;
  const full = d?.kind === "full" ? d.data : null;
  const summary = d?.kind === "summary" ? d.data : null;

  const growth = full ? pct(full.growth.month_over_month_pct) : null;
  const growthDown = (full?.growth.month_over_month_pct ?? 0) < 0;
  const followUpsToday = full ? full.follow_ups.overdue + full.follow_ups.due_today : null;

  return (
    <div className="px-4 py-6 lg:px-0 lg:py-0">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-6 lg:mb-8">
        <div>
          <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-1">{todayLabel()}</p>
          <h1 className="font-display font-extrabold text-3xl lg:text-4xl text-[#1A1A1A] leading-none tracking-tight">
            Hello, {firstName(displayName)}
          </h1>
        </div>
        <Link
          href="/settings"
          className="h-11 w-11 lg:h-14 lg:w-14 bg-gradient-to-br from-[#FFF0E6] to-[#FFD4B3] rounded-full flex items-center justify-center font-bold text-[#E85D04] lg:text-xl"
          aria-label="Account settings"
        >
          {initials(displayName)}
        </Link>
      </header>

      <main className="space-y-5 lg:space-y-6">
        {res.error && !d && <ErrorState error={res.error} onRetry={() => void res.reload()} />}

        {/* Top row: revenue hero + desktop side stats */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-5 lg:space-y-0">
          <div
            className="relative overflow-hidden rounded-2xl p-6 lg:p-8 text-white shadow-[0_8px_30px_rgba(232,93,4,0.25)] lg:col-span-2"
            style={{ background: "linear-gradient(135deg, #E85D04, #FF8C42)" }}
          >
            <div className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 11px)" }} />
            <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, #fff, transparent 70%)" }} />
            <div className="relative">
              <div className="flex items-center gap-2 text-white/80 mb-4">
                <Wallet className="w-4 h-4" />
                <span className="text-xs uppercase tracking-widest font-semibold">
                  {summary ? "Total Sales (all time)" : "Sales This Month"}
                </span>
              </div>
              {failed ? (
                <div className="font-mono font-bold text-4xl lg:text-6xl mb-2 tracking-tight">—</div>
              ) : !d ? (
                <div className="h-14 lg:h-16 w-48 rounded-xl bg-white/20 animate-pulse mb-2" />
              ) : (
                <div className="font-mono font-bold text-4xl lg:text-6xl mb-2 tracking-tight">
                  {naira(full ? full.revenue.this_month : summary!.total_revenue)}
                </div>
              )}
              <div className="flex items-center gap-1 text-sm text-white/90 font-medium min-h-5">
                {full && growth && (
                  <>
                    {growthDown ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    {growth} vs last month
                  </>
                )}
                {full && !growth && <span>{naira(full.revenue.last_month)} last month</span>}
                {summary && <span>{number(summary.total_transactions)} transactions recorded</span>}
              </div>
            </div>
          </div>

          {/* Desktop side column */}
          <div className="hidden lg:flex lg:flex-col lg:gap-6">
            {d || failed ? (
              <>
                <StatCard
                  icon={TrendingUp}
                  iconClass="bg-[#FFF0E6] text-[#E85D04]"
                  value={full ? naira(full.revenue.this_week) : "—"}
                  label="Sales This Week"
                />
                <StatCard
                  icon={ShoppingBag}
                  iconClass="bg-[#F0F4FF] text-[#4A5568]"
                  value={full ? number(full.transactions.all_time) : summary ? number(summary.total_transactions) : "—"}
                  label="Total Transactions"
                  href="/sales"
                />
              </>
            ) : (
              <>
                <Skeleton className="flex-1" />
                <Skeleton className="flex-1" />
              </>
            )}
          </div>
        </div>

        {/* Mobile stat grid */}
        <div className="grid grid-cols-2 gap-3 lg:hidden">
          {d || failed ? (
            <>
              <StatCard
                icon={TrendingUp}
                iconClass="bg-[#FFF0E6] text-[#E85D04]"
                value={full ? naira(full.revenue.this_week, { compact: true }) : summary ? number(summary.total_transactions) : "—"}
                label={full ? "Sales This Week" : "Transactions"}
              />
              <StatCard
                icon={Clock}
                iconClass="bg-amber-50 text-[#D97706]"
                value={followUpsToday ?? "—"}
                label="Follow-ups Today"
                href="/follow-up"
                dot={!!followUpsToday}
              />
            </>
          ) : (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          )}
        </div>

        {/* Customers + Follow-ups row */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-3 lg:space-y-0">
          <Link href="/customers" className="block">
            <div className="bg-white p-4 lg:p-6 rounded-xl lg:rounded-2xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex justify-between items-center hover:border-[#FFD4B3] transition-all">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-[#FAFAF8] text-[#4A5568] rounded-lg border border-[#E8E8E4]"><Users className="w-5 h-5" /></div>
                <div>
                  <p className="font-mono font-bold text-2xl text-[#1A1A1A]">
                    {full ? number(full.customers.total) : summary?.unique_customers !== undefined ? number(summary.unique_customers) : "—"}
                  </p>
                  <p className="text-xs text-[#4A5568]">
                    Total Customers
                    {full && full.customers.new_this_month > 0 && (
                      <span className="text-[#16A34A] font-semibold"> · +{full.customers.new_this_month} this month</span>
                    )}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#A0AEC0]" />
            </div>
          </Link>
          <Link href="/follow-up" className="hidden lg:block">
            <div className="bg-white p-6 rounded-2xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex justify-between items-center hover:border-[#FFD4B3] transition-all h-full">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-50 text-[#D97706] rounded-lg"><Clock className="w-5 h-5" /></div>
                <div>
                  <p className="font-mono font-bold text-2xl text-[#1A1A1A]">{followUpsToday ?? "—"}</p>
                  <p className="text-xs text-[#4A5568]">
                    Follow-ups Today
                    {full && full.follow_ups.due_soon > 0 && <span> · {full.follow_ups.due_soon} due soon</span>}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#A0AEC0]" />
            </div>
          </Link>
        </div>

        {/* Top product */}
        {(full?.top_product || summary?.top_products?.[0]) && (
          <Link href="/insights" className="bg-white p-4 lg:p-6 rounded-xl lg:rounded-2xl border border-[#E8E8E4] flex items-center gap-4 hover:border-[#FFD4B3] transition-all">
            <div className="p-2 bg-[#FFF0E6] text-[#E85D04] rounded-lg"><Award className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-xs text-[#A0AEC0] uppercase tracking-widest font-semibold">Best seller</p>
              <p className="font-semibold text-[#1A1A1A] truncate">
                {full?.top_product?.product_name ?? summary?.top_products[0].product_name}
              </p>
            </div>
            <p className="ml-auto font-mono font-bold text-[#1A1A1A]">
              {naira(full?.top_product?.total_revenue ?? summary?.top_products[0].total_revenue)}
            </p>
          </Link>
        )}

        <Briefing />

        {/* QUICK ACTIONS */}
        <div className="pt-1">
          <h3 className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3 lg:max-w-md">
            <Link href="/sales/add-sales"
              className="bg-white border border-[#E8E8E4] p-4 rounded-xl flex justify-center items-center gap-2 hover:border-[#E85D04] hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all text-[#1A1A1A]">
              <Plus className="w-5 h-5 text-[#E85D04]" />
              <span className="font-semibold text-sm">Log Sale</span>
            </Link>
            <Link href="/customers/add-customer"
              className="bg-white border border-[#E8E8E4] p-4 rounded-xl flex justify-center items-center gap-2 hover:border-[#E85D04] hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all text-[#1A1A1A]">
              <Users className="w-5 h-5 text-[#E85D04]" />
              <span className="font-semibold text-sm">Add Customer</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
