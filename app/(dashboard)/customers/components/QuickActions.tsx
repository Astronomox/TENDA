import { User, RotateCcw, Tag, StickyNote, Flag, ChevronRight } from "lucide-react"


export default function QuickActions(){
    const actions = [
        { icon: User, label: "Contact customer" },
        { icon: RotateCcw, label: "Issue refund" },
        { icon: Tag, label: "Apply discount" },
        { icon: StickyNote, label: "Add note" },
        { icon: Flag, label: "Flag account" },
    ];
    return(
        <div className="w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E8E8E4] p-4">
            <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-1">Quick actions</p>

            <div className="flex flex-col">
                {actions.map(({ icon: Icon, label }, i) => (
                    <button key={i} className="flex items-center justify-between py-3 border-b border-[#E8E8E4] last:border-b-0 text-left group">
                        <span className="flex items-center gap-3 text-sm text-[#1A1A1A]">
                            <Icon size={16} className="text-[#4A5568]" />
                            {label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#A0AEC0] group-hover:text-[#E85D04] transition-colors" />
                    </button>
                ))}
            </div>
        </div>
    )
}
