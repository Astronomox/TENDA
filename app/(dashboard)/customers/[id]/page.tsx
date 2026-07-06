"use client";
import CustomerSnapshot from "../components/CustomerSnapshot";
import RevenueChart from "../components/RevenueChart";
import CustomerTopProducts from "../components/CustomerTopProducts";
import RecentActivity from "../components/RecentActivityFeed";
import QuickActions from "../components/QuickActions";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function IndividualCustomer() {
  return (
    <div className="flex flex-col w-full min-h-full px-4 py-6 lg:px-0 lg:py-0 space-y-5">
      <Link href="/customers" className="flex items-center gap-1 text-sm font-medium text-[#4A5568] hover:text-[#1A1A1A] transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" /> Back to customers
      </Link>

      <CustomerSnapshot />

      {/* Desktop: two columns. Mobile: stacked */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-5 lg:space-y-0">
        <div className="lg:col-span-2 space-y-5">
          <RevenueChart />
          <CustomerTopProducts />
          <RecentActivity />
        </div>
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
