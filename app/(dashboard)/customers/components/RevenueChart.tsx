import { naira } from "@/lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(ym: string) {
  const m = Number(ym.split("-")[1]);
  return MONTHS[m - 1] ?? ym;
}

export default function RevenueChart({ months }: { months: { month: string; revenue: number }[] }) {
  const max = Math.max(0, ...months.map((m) => m.revenue));
  const total = months.reduce((s, m) => s + m.revenue, 0);

  return (
    <div className="w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E8E8E4] p-4">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest">Spending by month</p>
        <p className="text-xs text-[#4A5568] font-mono">{naira(total)} in {months.length} months</p>
      </div>
      {months.length === 0 || max === 0 ? (
        <p className="text-sm text-[#A0AEC0] py-6 text-center">No purchases in the last 6 months.</p>
      ) : (
        <div className="flex items-end justify-between gap-2 h-28">
          {months.map((m, i) => {
            const h = (m.revenue / max) * 100;
            const last = i === months.length - 1;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group" title={`${monthLabel(m.month)}: ${naira(m.revenue)}`}>
                <div
                  className={`w-full rounded-t-md ${last ? "bg-[#E85D04]" : "bg-[#FFD4B3] group-hover:bg-[#FF8C42]"} transition-colors`}
                  style={{ height: `${Math.max(h, m.revenue > 0 ? 4 : 1)}%` }}
                />
                <span className="text-[10px] text-[#A0AEC0] font-medium">{monthLabel(m.month)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
