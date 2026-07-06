export const revalidate = 0;

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";
import { getSales } from "@/lib/data/sales";
import { getCustomers } from "@/lib/data/customers";
import {
  Wallet, Users, Clock, TrendingUp, Plus, ChevronRight, ShoppingBag,
} from "lucide-react";

export default async function Dashboard() {
  const sales = await getSales();
  const customers = await getCustomers();
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Merchant";
  const today = new Date().toLocaleDateString("en-NG", {
    weekday: "short", day: "numeric", month: "short",
    timeZone: "Africa/Lagos",
  });
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  let monthlyRevenue = 0;
  let lastMonthRevenue = 0;
  let weeklyRevenue = 0;
  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - now.getDay());

  sales.forEach((sale: any) => {
    const date = new Date(sale.createdAt);
    const saleTotal = sale.items.reduce(
      (sum: number, item: any) => sum + (item.price || 0) * item.quantity, 0
    );
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) monthlyRevenue += saleTotal;
    if (date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear) lastMonthRevenue += saleTotal;
    if (date >= startOfWeek) weeklyRevenue += saleTotal;
  });

  const growth = lastMonthRevenue === 0 ? 100 : ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
  const totalCustomers = customers.length;
  const followUpsToday = 0;
  const totalSales = sales.length;

  return (
    <div className="px-4 py-6 lg:px-0 lg:py-0">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-6 lg:mb-8">
        <div>
          <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-1">{today}</p>
          <h1 className="font-display font-extrabold text-3xl lg:text-4xl text-[#1A1A1A] leading-none tracking-tight">
            Hello, {userName.split(" ")[0]}
          </h1>
        </div>
        <div className="h-11 w-11 lg:h-14 lg:w-14 bg-gradient-to-br from-[#FFF0E6] to-[#FFD4B3] rounded-full flex items-center justify-center font-bold text-[#E85D04] lg:text-xl">
          {userName.charAt(0)}
        </div>
      </header>

      <main className="space-y-5 lg:space-y-6">
        {/* Top row: revenue hero + desktop side stats */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-5 lg:space-y-0">
          {/* SIGNATURE ORANGE REVENUE CARD */}
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
                <span className="text-xs uppercase tracking-widest font-semibold">Sales This Month</span>
              </div>
              <div className="font-mono font-bold text-4xl lg:text-6xl mb-2 tracking-tight">
                ₦{monthlyRevenue.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-sm text-white/90 font-medium">
                <TrendingUp className="w-4 h-4" />
                {growth >= 0 ? "+" : ""}{growth.toFixed(1)}% vs last month
              </div>
            </div>
          </div>

          {/* Desktop-only side column: week + sales count stacked */}
          <div className="hidden lg:flex lg:flex-col lg:gap-6">
            <div className="flex-1 bg-white p-6 rounded-2xl border border-[#E8E8E4] flex flex-col justify-center">
              <div className="p-2 bg-[#FFF0E6] text-[#E85D04] rounded-lg w-fit mb-3"><TrendingUp className="w-5 h-5" /></div>
              <p className="font-mono font-bold text-2xl text-[#1A1A1A]">₦{weeklyRevenue.toLocaleString()}</p>
              <p className="text-xs text-[#4A5568] mt-1">Sales This Week</p>
            </div>
            <div className="flex-1 bg-white p-6 rounded-2xl border border-[#E8E8E4] flex flex-col justify-center">
              <div className="p-2 bg-[#F0F4FF] text-[#4A5568] rounded-lg w-fit mb-3"><ShoppingBag className="w-5 h-5" /></div>
              <p className="font-mono font-bold text-2xl text-[#1A1A1A]">{totalSales}</p>
              <p className="text-xs text-[#4A5568] mt-1">Total Transactions</p>
            </div>
          </div>
        </div>

        {/* MOBILE + tablet stat grid (hidden on desktop where side column covers it) */}
        <div className="grid grid-cols-2 gap-3 lg:hidden">
          <div className="bg-white p-4 rounded-xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="p-2 bg-[#FFF0E6] text-[#E85D04] rounded-lg w-fit mb-3"><TrendingUp className="w-5 h-5" /></div>
            <p className="font-mono font-bold text-2xl text-[#1A1A1A]">₦{weeklyRevenue.toLocaleString()}</p>
            <p className="text-xs text-[#4A5568] mt-1">Sales This Week</p>
          </div>
          <Link href="/follow-up">
            <div className="bg-white p-4 rounded-xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative h-full">
              {followUpsToday > 0 && <div className="absolute top-4 right-4 h-2 w-2 bg-[#E85D04] rounded-full" />}
              <div className="p-2 bg-amber-50 text-[#D97706] rounded-lg w-fit mb-3"><Clock className="w-5 h-5" /></div>
              <p className="font-mono font-bold text-2xl text-[#1A1A1A]">{followUpsToday}</p>
              <p className="text-xs text-[#4A5568] mt-1">Follow-ups Today</p>
            </div>
          </Link>
        </div>

        {/* Customers + Follow-ups row (desktop gets 2-col, mobile full) */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-3 lg:space-y-0">
          <Link href="/customers">
            <div className="bg-white p-4 lg:p-6 rounded-xl lg:rounded-2xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex justify-between items-center hover:border-[#FFD4B3] transition-all">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-[#FAFAF8] text-[#4A5568] rounded-lg border border-[#E8E8E4]"><Users className="w-5 h-5" /></div>
                <div>
                  <p className="font-mono font-bold text-2xl text-[#1A1A1A]">{totalCustomers}</p>
                  <p className="text-xs text-[#4A5568]">Total Customers</p>
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
                  <p className="font-mono font-bold text-2xl text-[#1A1A1A]">{followUpsToday}</p>
                  <p className="text-xs text-[#4A5568]">Follow-ups Today</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#A0AEC0]" />
            </div>
          </Link>
        </div>

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
