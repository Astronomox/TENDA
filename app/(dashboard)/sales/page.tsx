"use client";


import Link from "next/link";
import React, { useMemo } from "react";
import { sales } from "@/lib/mock/sales";
import { ArrowRight } from "lucide-react";

// ---- Temporary price logic ----
const priceMap: Record<string, number> = {
  p1: 15000,
  p2: 8000,
  p3: 6000,
  p4: 12000,
};


export default function SalesPage() {
  const today = new Date();


  // ---- Calculations ----
  const {
    totalRevenue,
    monthlyRevenue,
    lastMonthRevenue,
    recentSales,
    totalCount,
  } = useMemo(() => {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear =
      currentMonth === 0 ? currentYear - 1 : currentYear;


    let total = 0;
    let monthly = 0;
    let lastMonthly = 0;


    sales.forEach((sale:any) => {
      const date = new Date(sale.createdAt);
      const amount = priceMap[sale.productId] * sale.quantity;


      total += amount;


      if (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      ) {
        monthly += amount;
      }


      if (
        date.getMonth() === lastMonth &&
        date.getFullYear() === lastMonthYear
      ) {
        lastMonthly += amount;
      }
    });


    const sortedRecent = [...sales]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )
      .slice(0, 5);


    return {
      totalRevenue: total,
      monthlyRevenue: monthly,
      lastMonthRevenue: lastMonthly,
      recentSales: sortedRecent,
      totalCount: sales.length,
    };
  }, []);


  const growth =
    lastMonthRevenue === 0
      ? 100
      : ((monthlyRevenue - lastMonthRevenue) /
          lastMonthRevenue) *
        100;


  return (
    <div className="px-4 py-6 lg:px-0 lg:py-0 space-y-5 animate-in fade-in duration-500">
      {/* Title */}
      <h1 className="font-display font-extrabold text-3xl lg:text-4xl text-[#1A1A1A] leading-none tracking-tight">Sales</h1>


      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:max-w-3xl">
        <div className="bg-white p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E8E8E4] flex flex-col justify-between h-28">
          <span className="text-xs text-[#A0AEC0] font-semibold uppercase tracking-widest">
            This Month
          </span>
          <div>
            <span className="font-mono font-bold text-2xl text-[#1A1A1A]">
              ₦{monthlyRevenue.toLocaleString()}
            </span>
            <div
              className={`text-[11px] flex items-center mt-1 font-medium ${
                growth >= 0
                  ? "text-[#16A34A]"
                  : "text-[#DC2626]"
              }`}
            >
              {growth >= 0 ? "+" : ""}
              {growth.toFixed(1)}% vs last month
            </div>
          </div>
        </div>


        <div className="bg-white p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E8E8E4] flex flex-col justify-between h-28">
          <span className="text-xs text-[#A0AEC0] font-semibold uppercase tracking-widest">
            Total Sales
          </span>
          <div>
            <span className="font-mono font-bold text-2xl text-[#1A1A1A]">
              {totalCount}
            </span>
            <div className="text-[11px] text-[#A0AEC0] mt-1">
              Transactions logged
            </div>
          </div>
        </div>
      </div>


      {/* Log new sale */}
      <Link
        href="/sales/add-sales"
        className="w-full lg:max-w-xs bg-[#E85D04] hover:bg-[#FF8C42] text-white font-semibold h-14 rounded-xl shadow-[0_4px_20px_rgba(232,93,4,0.25)] active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        Log New Sale
        <ArrowRight className="w-4 h-4" />
      </Link>


      {/* Recent Transactions */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest">
            Recent Transactions
          </h3>
        </div>


        {recentSales.length > 0 ? (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {recentSales.map((sale) => {
              const amount =
                priceMap[sale.productId] * sale.quantity;


              return (
                <div
                  key={sale.id}
                  className="bg-white p-4 rounded-xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-gradient-to-br from-[#FFF0E6] to-[#FFD4B3] text-[#E85D04]">
                      {sale.customerId.charAt(1)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#1A1A1A] text-sm">
                        Customer {sale.customerId}
                      </span>
                      <span className="text-xs text-[#A0AEC0]">
                        {sale.createdAt}
                      </span>
                    </div>
                  </div>


                  <div className="text-right">
                    <span className="block font-mono font-bold text-[#1A1A1A]">
                      ₦{amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#16A34A]">
                      completed
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 opacity-60">
            <p className="text-[#4A5568]">
              No sales recorded yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
