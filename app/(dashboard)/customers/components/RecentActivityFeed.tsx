import { naira, relative } from "@/lib/format";
import type { CustomerActivity } from "@/lib/types";

const DOT: Record<string, string> = {
  sale: "bg-[#E85D04]",
  follow_up_done: "bg-[#16A34A]",
  customer_created: "bg-[#A0AEC0]",
};

export default function RecentActivity({ items }: { items: CustomerActivity[] }) {
  return (
    <div className="w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E8E8E4] p-4">
      <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3">Recent activity</p>
      {items.length === 0 ? (
        <p className="text-sm text-[#A0AEC0]">Nothing yet.</p>
      ) : (
        <div className="flex flex-col">
          {items.map((it, i) => (
            <div key={`${it.at}-${i}`} className="flex items-center justify-between py-2.5 border-b border-[#E8E8E4] last:border-b-0 gap-3">
              <span className="flex items-center gap-2.5 text-sm text-[#1A1A1A] min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT[it.type] ?? "bg-[#E85D04]"}`} />
                <span className="truncate">{it.label}</span>
              </span>
              <span className="flex items-center gap-2 flex-shrink-0">
                {it.amount !== undefined && it.amount !== null && (
                  <span className="text-xs font-mono font-semibold text-[#1A1A1A]">{naira(it.amount)}</span>
                )}
                <span className="text-xs text-[#A0AEC0] font-mono">{relative(it.at)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
