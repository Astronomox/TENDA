

export default function RevenueChart(){
    const bars = [40, 65, 50, 80, 60, 95, 72];
    return(
         <div className="w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E8E8E4] p-4">
            <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-4">Revenue over time</p>
            <div className="flex items-end justify-between gap-2 h-24">
                {bars.map((h, i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-t-md bg-[#FFF0E6]"
                        style={{ height: `${h}%` }}
                    >
                        <div className="w-full rounded-t-md bg-[#E85D04]" style={{ height: i === bars.length - 1 ? "100%" : "0%" }} />
                    </div>
                ))}
            </div>
        </div>
    )
}
