"use client";
import { useParams } from "next/navigation"
import { customers } from "@/lib/mock/customers";


export default function CustomerSnapshot(){
     const params = useParams();

    const id = params.id;
    const customer = customers.find(c => c.id === id);

    const customer_name = customer?.name

    const initials = (customer_name || "")
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return(
    <div
        className="relative overflow-hidden w-full rounded-2xl p-5 text-white shadow-[0_4px_20px_rgba(232,93,4,0.25)]"
        style={{ background: "#E85D04" }}
    >
        <div className="relative flex items-center gap-4">
            <span className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-lg font-semibold text-[#E85D04]">{initials}</span>
            <div className="flex flex-col">
                <h1 className="font-display text-2xl leading-none">{customer_name}</h1>
                <p className="text-xs text-white/70 mt-1 font-mono">ID: {id}</p>
            </div>
        </div>

        <span className="relative inline-flex mt-4 bg-white text-[#16A34A] text-xs font-semibold px-3 py-1 rounded-full">Active</span>
    </div>
    )
}
