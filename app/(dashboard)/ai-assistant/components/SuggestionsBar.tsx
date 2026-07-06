"use client";

import React from "react";
import { Users, TrendingDown, RefreshCw, DollarSign, AlertTriangle, BarChart2 } from "lucide-react";

const SUGGESTIONS = [
  { icon: Users,         label: "Best customers this month" },
  { icon: TrendingDown,  label: "Inactive customers (2+ weeks)" },
  { icon: RefreshCw,     label: "Top repeat-purchase products" },
  { icon: DollarSign,    label: "Revenue trend this week" },
  { icon: AlertTriangle, label: "Declining categories" },
  { icon: BarChart2,     label: "Retention insights" },
];

interface SuggestionsBarProps {
  onSelect: (text: string) => void;
}

export default function SuggestionsBar({ onSelect }: SuggestionsBarProps) {
  return (
    <div className="px-4 py-2 bg-white border-t border-[#E8E8E4]">
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s.label)}
            className="
              flex-shrink-0 flex items-center gap-1.5
              bg-[#FAFAF8] border border-[#E8E8E4]
              hover:border-[#E85D04] hover:bg-[#FFF0E6] hover:text-[#E85D04]
              text-[#4A5568] text-xs font-medium
              rounded-full px-3 py-1.5
              transition-all whitespace-nowrap
            "
          >
            <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
