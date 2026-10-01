"use client";

import Link from "next/link";
import { MessageCircle, Phone, Mail, Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { firstName, telUrl, whatsappUrl } from "@/lib/format";
import type { CustomerDetail } from "@/lib/types";

export default function QuickActions({
  customer,
  onEdit,
  onDelete,
}: {
  customer: CustomerDetail;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const wa = whatsappUrl(customer.phone, `Hi ${firstName(customer.name)}! `);
  const tel = telUrl(customer.phone);
  const mail = customer.email ? `mailto:${customer.email}` : null;

  const row =
    "flex items-center justify-between py-3 border-b border-[#E8E8E4] last:border-b-0 text-left group w-full";
  const label = "flex items-center gap-3 text-sm text-[#1A1A1A]";
  const disabled = "opacity-40 pointer-events-none";

  return (
    <div className="w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E8E8E4] p-4">
      <p className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-1">Quick actions</p>

      <div className="flex flex-col">
        <a href={wa ?? undefined} target="_blank" rel="noopener noreferrer" className={`${row} ${wa ? "" : disabled}`} aria-disabled={!wa}>
          <span className={label}><MessageCircle size={16} className="text-[#16A34A]" />Message on WhatsApp</span>
          <ChevronRight className="w-4 h-4 text-[#A0AEC0] group-hover:text-[#E85D04] transition-colors" />
        </a>
        <a href={tel ?? undefined} className={`${row} ${tel ? "" : disabled}`} aria-disabled={!tel}>
          <span className={label}><Phone size={16} className="text-[#4A5568]" />Call</span>
          <ChevronRight className="w-4 h-4 text-[#A0AEC0] group-hover:text-[#E85D04] transition-colors" />
        </a>
        <a href={mail ?? undefined} className={`${row} ${mail ? "" : disabled}`} aria-disabled={!mail}>
          <span className={label}><Mail size={16} className="text-[#4A5568]" />Send email</span>
          <ChevronRight className="w-4 h-4 text-[#A0AEC0] group-hover:text-[#E85D04] transition-colors" />
        </a>
        <Link
          href={`/sales/add-sales?customer=${encodeURIComponent(customer.id)}&name=${encodeURIComponent(customer.name)}`}
          className={row}
        >
          <span className={label}><Plus size={16} className="text-[#E85D04]" />Log a sale for {firstName(customer.name)}</span>
          <ChevronRight className="w-4 h-4 text-[#A0AEC0] group-hover:text-[#E85D04] transition-colors" />
        </Link>
        <button onClick={onEdit} className={row}>
          <span className={label}><Pencil size={16} className="text-[#4A5568]" />Edit details &amp; note</span>
          <ChevronRight className="w-4 h-4 text-[#A0AEC0] group-hover:text-[#E85D04] transition-colors" />
        </button>
        <button onClick={onDelete} className={row}>
          <span className={`${label} text-[#DC2626]`}><Trash2 size={16} />Delete customer</span>
          <ChevronRight className="w-4 h-4 text-[#A0AEC0] group-hover:text-[#DC2626] transition-colors" />
        </button>
      </div>
      {!customer.phone && (
        <p className="text-[11px] text-[#A0AEC0] mt-2">Add a phone number to message or call {firstName(customer.name)}.</p>
      )}
    </div>
  );
}
