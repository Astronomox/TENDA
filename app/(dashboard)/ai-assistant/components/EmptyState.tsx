"use client";

import React from "react";
import { Users, TrendingDown, RefreshCw, DollarSign, AlertTriangle, BarChart2 } from "lucide-react";

const EXAMPLE_PROMPTS = [
  { icon: Users,         label: "Who are my best customers this month?" },
  { icon: TrendingDown,  label: "Which customers haven't returned in 2+ weeks?" },
  { icon: RefreshCw,     label: "What products drive the most repeat purchases?" },
  { icon: DollarSign,    label: "Summarise my revenue trend for this week" },
  { icon: AlertTriangle, label: "Which sales categories are declining?" },
  { icon: BarChart2,     label: "Show me customer retention insights" },
];

interface EmptyStateProps {
  onPromptClick: (text: string) => void;
}

export default function EmptyState({ onPromptClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-[#FFF0E6] border-2 border-[#F4C9A4] flex items-center justify-center mb-5 shadow-[0_4px_24px_rgba(232,93,4,0.12)]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#E85D04" strokeWidth="2" />
          <path
            d="M8 12 C8 9.5 16 9.5 16 12 C16 14.5 8 14.5 8 12Z"
            fill="#E85D04"
            opacity="0.5"
          />
          <circle cx="12" cy="12" r="2.5" fill="#E85D04" />
        </svg>
      </div>

      <h2 className="font-display font-extrabold text-xl text-[#1A1A1A] mb-2">
        What would you like to know?
      </h2>
      <p className="text-sm text-[#718096] max-w-sm leading-relaxed mb-8">
        Ask anything about your customers, sales trends, product performance,
        or retention risks. I&apos;m analyzing your last 30 days of data.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
        {EXAMPLE_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => onPromptClick(p.label)}
            className="
              flex items-center gap-3 text-left
              bg-white border border-[#E8E8E4] rounded-xl px-4 py-3
              hover:border-[#E85D04] hover:bg-[#FFF7F0]
              transition-all group shadow-sm
            "
          >
            <p.icon className="w-4 h-4 flex-shrink-0 text-[#E85D04]" />
            <span className="text-sm text-[#4A5568] group-hover:text-[#E85D04] font-medium leading-snug transition-colors">
              {p.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
