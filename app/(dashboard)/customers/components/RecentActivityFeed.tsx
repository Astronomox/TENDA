export default function RecentActivity(){
    const items = [
        { label: "Purchased Perfume", time: "12d ago" },
        { label: "Purchased Lotion", time: "30d ago" },
        { label: "Refund issued", time: "45d ago" },
    ];
    return(
        <div className="w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E8E8E4] p-4">
            <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3">Recent activity</p>

            <div className="flex flex-col">
                {items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-[#E8E8E4] last:border-b-0">
                        <span className="flex items-center gap-2.5 text-sm text-[#1A1A1A]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E85D04]" />
                            {it.label}
                        </span>
                        <span className="text-xs text-[#A0AEC0] font-mono">{it.time}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
