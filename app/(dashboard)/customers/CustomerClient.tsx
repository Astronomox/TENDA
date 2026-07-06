"use client";
import { useState } from "react";
import type { Customer } from "@/lib/types";
import { Search, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function CustomersClient({ customers = [] }: { customers?: Customer[] }) {
  const [query, setQuery] = useState("");

  const getInitials = (name: string = "") =>
    name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    (c.phone_number || "").includes(query)
  );

  return (
    <div className="w-full px-4 py-6 lg:px-0 lg:py-0">
      {/* HEADER ROW */}
      <div className="flex items-center justify-between mb-5 lg:mb-8">
        <div>
          <h1 className="font-display font-extrabold text-3xl lg:text-4xl text-[#1A1A1A] leading-none tracking-tight">Customers</h1>
          <p className="hidden lg:block text-sm text-[#4A5568] mt-2">{customers.length} total customers</p>
        </div>
        <Link href="/customers/add-customer"
          className="flex items-center gap-1.5 bg-[#E85D04] hover:bg-[#FF8C42] text-white text-sm font-semibold px-4 py-2.5 lg:px-5 lg:py-3 rounded-full transition-colors shadow-[0_4px_20px_rgba(232,93,4,0.25)]">
          <Plus className="w-4 h-4" /> Add customer
        </Link>
      </div>

      {/* SEARCH */}
      <div className="relative mb-2 lg:mb-6 lg:max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0AEC0]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl pl-11 pr-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
          placeholder="Search customers..."
        />
      </div>

      {/* MOBILE: rows / DESKTOP: card grid */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-4">
        {filtered.map((c) => (
          <Link
            key={c.id}
            href={`/customers/${c.id}`}
            className="flex items-center justify-between py-4 border-b border-[#E8E8E4] lg:border-b-0 lg:bg-white lg:border lg:rounded-2xl lg:p-5 lg:hover:border-[#FFD4B3] lg:hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] lg:transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full w-12 h-12 bg-gradient-to-br from-[#FFF0E6] to-[#FFD4B3] flex items-center justify-center text-sm font-bold text-[#E85D04]">
                {getInitials(c.name)}
              </div>
              <div className="flex flex-col">
                <p className="font-semibold text-[#1A1A1A] group-hover:text-[#E85D04] lg:transition-colors">{c.name}</p>
                <p className="text-xs text-[#4A5568]">{c.phone_number}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#A0AEC0] group-hover:text-[#E85D04] transition-colors" />
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-[#A0AEC0] py-12 lg:col-span-3">No customers found.</p>
        )}
      </div>
    </div>
  );
}
