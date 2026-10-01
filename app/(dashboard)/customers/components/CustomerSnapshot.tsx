import { initials, naira, number, phone, relative, date } from "@/lib/format";
import type { CustomerDetail } from "@/lib/types";
import { STATUS_BADGE } from "../CustomerClient";

export default function CustomerSnapshot({ customer }: { customer: CustomerDetail }) {
  const badge = STATUS_BADGE[customer.status] ?? STATUS_BADGE.active;
  const s = customer.stats;

  return (
    <div
      className="relative overflow-hidden w-full rounded-2xl p-5 text-white shadow-[0_4px_20px_rgba(232,93,4,0.25)]"
      style={{ background: "#E85D04" }}
    >
      <div className="relative flex items-center gap-4">
        <span className="w-14 h-14 flex-shrink-0 rounded-full bg-white flex items-center justify-center text-lg font-semibold text-[#E85D04]">
          {initials(customer.name)}
        </span>
        <div className="flex flex-col min-w-0">
          <h1 className="font-display text-2xl leading-none truncate">{customer.name}</h1>
          <p className="text-xs text-white/80 mt-1">
            {[phone(customer.phone), customer.email].filter(Boolean).join(" · ") || "No contact details"}
          </p>
          <p className="text-[11px] text-white/60 mt-0.5">Customer since {date(customer.created_at)}</p>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center gap-2 mt-4">
        <span className={`inline-flex bg-white text-xs font-semibold px-3 py-1 rounded-full ${badge.cls.split(" ").find((c) => c.startsWith("text-"))}`}>
          {badge.label}
        </span>
        {customer.next_follow_up && (
          <span className="inline-flex bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Next: {customer.next_follow_up.product_name} · {date(customer.next_follow_up.expected_at, "short")}
          </span>
        )}
      </div>

      <div className="relative grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/20">
        <div>
          <p className="font-mono font-bold text-lg leading-tight">{naira(s.total_spent, { compact: true })}</p>
          <p className="text-[10px] text-white/70 uppercase tracking-wider">Total spent</p>
        </div>
        <div>
          <p className="font-mono font-bold text-lg leading-tight">{number(s.purchase_count)}</p>
          <p className="text-[10px] text-white/70 uppercase tracking-wider">Purchases</p>
        </div>
        <div>
          <p className="font-mono font-bold text-lg leading-tight">{s.last_purchase_at ? relative(s.last_purchase_at) : "—"}</p>
          <p className="text-[10px] text-white/70 uppercase tracking-wider">Last bought</p>
        </div>
      </div>

      {customer.note && (
        <p className="relative mt-4 text-xs text-white/85 bg-white/10 rounded-lg px-3 py-2 leading-relaxed">{customer.note}</p>
      )}
    </div>
  );
}
