"use client";
import { TotalPurchased } from "@/lib/calculations/customer_calculations";
import { sales } from "@/lib/mock/sales";
import { useParams } from "next/navigation";

export default function CustomerTopProducts() {
  const params = useParams();
  const customer_id = params.id as string;
  const totalProducts = TotalPurchased(customer_id, sales);

  return (
    <div className="w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E8E8E4] p-4">
      <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-2">Top products purchased</p>
      <p className="font-mono font-bold text-2xl text-[#1A1A1A]">{totalProducts}</p>
    </div>
  );
}
