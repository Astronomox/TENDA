"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, ChevronRight, Users } from "lucide-react";
import { customers as customersApi } from "@/lib/api";
import { useDebounced, useResource } from "@/lib/hooks";
import { initials, naira, phone, relative } from "@/lib/format";
import type { CustomerStatus } from "@/lib/types";
import { EmptyState, ResourceView, SkeletonList } from "@/components/ui";

export const STATUS_BADGE: Record<CustomerStatus, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-blue-50 text-blue-600" },
  active: { label: "Active", cls: "bg-green-50 text-[#16A34A]" },
  at_risk: { label: "At risk", cls: "bg-amber-50 text-[#D97706]" },
  lapsed: { label: "Lapsed", cls: "bg-red-50 text-[#DC2626]" },
};

export default function CustomersClient() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const q = useDebounced(query.trim(), 300);
  const res = useResource(`customers:list:${q}:${sort}`, () => customersApi.list({ q, limit: 200, sort }));

  return (
    <div className="w-full px-4 py-6 lg:px-0 lg:py-0">
      {/* HEADER ROW */}
      <div className="flex items-center justify-between mb-5 lg:mb-8">
        <div>
          <h1 className="font-display font-extrabold text-3xl lg:text-4xl text-[#1A1A1A] leading-none tracking-tight">Customers</h1>
          {res.data && (
            <p className="text-xs lg:text-sm text-[#4A5568] mt-1 lg:mt-2">
              {res.data.total} {q ? "matching" : "total"} customer{res.data.total === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <Link href="/customers/add-customer"
          className="flex items-center gap-1.5 bg-[#E85D04] hover:bg-[#FF8C42] text-white text-sm font-semibold px-4 py-2.5 lg:px-5 lg:py-3 rounded-full transition-colors shadow-[0_4px_20px_rgba(232,93,4,0.25)]">
          <Plus className="w-4 h-4" /> Add customer
        </Link>
      </div>

      {/* SEARCH + SORT */}
      <div className="mb-2 flex gap-2 lg:mb-6">
      <div className="relative flex-1 lg:max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0AEC0]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl pl-11 pr-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
          placeholder="Search by name, phone or email…"
          aria-label="Search customers"
        />
      </div>
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        aria-label="Sort customers"
        className="h-12 rounded-xl border border-[#E8E8E4] bg-white px-3 text-sm text-[#1A1A1A] focus:border-[#E85D04] focus:outline-none"
      >
        <option value="name">A–Z</option>
        <option value="-last_purchase_at">Recent</option>
        <option value="-total_spent">Top spend</option>
      </select>
      </div>

      <ResourceView resource={res} feature="Customers" endpoint="GET /customers" loading={<SkeletonList rows={6} />}>
        {(page) =>
          page.items.length === 0 ? (
            q ? (
              <p className="text-center text-[#A0AEC0] py-12">No customers match &ldquo;{q}&rdquo;.</p>
            ) : (
              <EmptyState
                icon={Users}
                title="No customers yet"
                body="Add the people who buy from you so TENDA can remind you when they're due to buy again."
                action={
                  <Link href="/customers/add-customer" className="inline-flex items-center gap-1.5 bg-[#E85D04] text-white text-sm font-semibold px-5 py-2.5 rounded-full">
                    <Plus className="w-4 h-4" /> Add your first customer
                  </Link>
                }
              />
            )
          ) : (
            <div className={`lg:grid lg:grid-cols-3 lg:gap-4 transition-opacity ${res.loading ? "opacity-60" : ""}`}>
              {page.items.map((c) => {
                const badge = c.status ? STATUS_BADGE[c.status] : null;
                return (
                  <Link
                    key={c.id}
                    href={`/customers/${encodeURIComponent(c.id)}`}
                    className="flex items-center justify-between py-4 border-b border-[#E8E8E4] lg:border-b-0 lg:bg-white lg:border lg:rounded-2xl lg:p-5 lg:hover:border-[#FFD4B3] lg:hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] lg:transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-full w-12 h-12 flex-shrink-0 bg-gradient-to-br from-[#FFF0E6] to-[#FFD4B3] flex items-center justify-center text-sm font-bold text-[#E85D04]">
                        {initials(c.name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-semibold text-[#1A1A1A] group-hover:text-[#E85D04] lg:transition-colors truncate">{c.name}</p>
                          {badge && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
                          )}
                        </div>
                        <p className="text-xs text-[#4A5568] truncate">
                          {phone(c.phone) || c.email || "No contact details"}
                        </p>
                        {c.purchase_count !== undefined && (
                          <p className="text-[11px] text-[#A0AEC0] mt-0.5">
                            {c.purchase_count > 0
                              ? `${naira(c.total_spent)} · ${c.purchase_count} purchase${c.purchase_count === 1 ? "" : "s"}${c.last_purchase_at ? ` · last ${relative(c.last_purchase_at)}` : ""}`
                              : "No purchases yet"}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 flex-shrink-0 text-[#A0AEC0] group-hover:text-[#E85D04] transition-colors" />
                  </Link>
                );
              })}
              {page.total > page.items.length && (
                <p className="text-center text-xs text-[#A0AEC0] py-4 lg:col-span-3">
                  Showing {page.items.length} of {page.total}. Search to find others.
                </p>
              )}
            </div>
          )
        }
      </ResourceView>
    </div>
  );
}
