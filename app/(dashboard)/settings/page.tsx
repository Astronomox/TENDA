import Link from "next/link"
import { ArrowRight, User, Target, Building2, Package } from "lucide-react"
export default function Settings(){
    const links = [
        { href: "/settings/business-intent", label: "Intent", icon: Target },
        { href: "/settings/business-structure", label: "Business structure", icon: Building2 },
        { href: "/settings/business-info", label: "Business info", icon: User },
        { href: "/settings/products-offered", label: "Products", icon: Package },
    ];
    return(
        <div className="w-full flex flex-col min-h-full px-4 py-6 lg:px-0 lg:py-0">

            <header className="font-display font-extrabold text-3xl lg:text-4xl text-[#1A1A1A] leading-none mb-6 lg:mb-8 tracking-tight">Settings</header>

            <div className="lg:grid lg:grid-cols-2 lg:gap-8"><section className="w-full mb-8 lg:mb-0">
                <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3">Account &amp; Identity</p>

                <div className="bg-white rounded-2xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-[#E8E8E4]">
                    <div className="flex justify-between px-4 py-3 text-sm"><span className="text-[#A0AEC0]">Name</span><span className="text-[#1A1A1A] font-medium">Toluwani Arogundade</span></div>
                    <div className="flex justify-between px-4 py-3 text-sm"><span className="text-[#A0AEC0]">Email</span><span className="text-[#1A1A1A] font-medium">tolu@example.com</span></div>
                    <div className="flex justify-between px-4 py-3 text-sm"><span className="text-[#A0AEC0]">Password</span><span className="text-[#1A1A1A] font-medium">••••••••</span></div>
                    <div className="flex justify-between px-4 py-3 text-sm"><span className="text-[#A0AEC0]">Business name</span><span className="text-[#1A1A1A] font-medium">Tenda Bags</span></div>
                </div>
            </section>

            <section className="flex flex-col">
                <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3">Business Info</p>

                <div className="bg-white rounded-2xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-[#E8E8E4] overflow-hidden">
                    {links.map(({ href, label, icon: Icon }) => (
                        <Link key={href} href={href} className="flex items-center justify-between px-4 py-4 text-[#1A1A1A] hover:bg-[#FAFAF8] transition-colors group">
                            <span className="flex items-center gap-3 text-sm font-medium">
                                <Icon size={18} className="text-[#4A5568]" />
                                {label}
                            </span>
                            <ArrowRight size={18} className="text-[#A0AEC0] group-hover:text-[#E85D04] transition-colors" />
                        </Link>
                    ))}
                </div>
            </section>
            </div>
        </div>
    )
}
