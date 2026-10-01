import { naira, number, relative } from "@/lib/format";
import type { CustomerDetail } from "@/lib/types";

export default function CustomerTopProducts({ products }: { products: CustomerDetail["top_products"] }) {
  return (
    <div className="w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E8E8E4] p-4">
      <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3">Top products purchased</p>
      {products.length === 0 ? (
        <p className="text-sm text-[#A0AEC0]">No purchases yet.</p>
      ) : (
        <div className="flex flex-col">
          {products.map((p, i) => (
            <div key={`${p.product_id ?? p.product_name}-${i}`} className="flex items-center justify-between py-2.5 border-b border-[#E8E8E4] last:border-b-0 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#1A1A1A] truncate">{p.product_name}</p>
                <p className="text-[11px] text-[#A0AEC0]">
                  {number(p.units)} unit{p.units === 1 ? "" : "s"}
                  {p.last_purchased_at ? ` · last ${relative(p.last_purchased_at)}` : ""}
                </p>
              </div>
              <span className="font-mono font-bold text-sm text-[#1A1A1A] flex-shrink-0">{naira(p.revenue)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
