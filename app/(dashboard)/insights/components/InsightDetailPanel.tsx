"use client";

import React from "react";
import { X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Insight } from "./InsightCard";

interface InsightDetailPanelProps {
  insight: Insight | null;
  onClose: () => void;
}

// Supporting data points keyed by insight id (seed data)
const SUPPORTING_DATA: Record<string, { label: string; value: string; sub?: string }[]> = {
  "revenue-1": [
    { label: "Total revenue", value: "₦450,000", sub: "+12% vs last month" },
    { label: "Highest day", value: "Friday", sub: "₦81,000 avg" },
    { label: "Transactions", value: "143", sub: "this period" },
    { label: "Avg order value", value: "₦3,147", sub: "+8% vs last month" },
  ],
  "customer-1": [
    { label: "At-risk customers", value: "47", sub: "no purchase in 14+ days" },
    { label: "Churn probability", value: "68%", sub: "if not engaged this week" },
    { label: "Avg lifetime value", value: "₦28,400", sub: "for this segment" },
    { label: "Last contacted", value: "Never", sub: "via Tenda" },
  ],
};

const TREND_ICONS = {
  up:      <TrendingUp  className="w-4 h-4 text-green-500" />,
  down:    <TrendingDown className="w-4 h-4 text-red-500" />,
  neutral: <Minus        className="w-4 h-4 text-[#A0AEC0]" />,
};

export default function InsightDetailPanel({ insight, onClose }: InsightDetailPanelProps) {
  if (!insight) return null;

  const supporting = SUPPORTING_DATA[insight.id] ?? [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className="
          fixed bottom-0 left-0 right-0 z-50
          lg:static lg:z-auto lg:h-full
          bg-white border-t border-[#E8E8E4] rounded-t-2xl
          lg:border-t-0 lg:border-l lg:rounded-t-none
          max-h-[80dvh] lg:max-h-none overflow-y-auto
          flex flex-col
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-5 border-b border-[#E8E8E4] flex-shrink-0">
          <p className="text-sm font-bold text-[#1A1A1A]">Insight detail</p>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A0AEC0] hover:text-[#4A5568] transition-colors rounded-lg hover:bg-[#FAFAF8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 p-4 lg:p-5 overflow-y-auto space-y-5">
          {/* Insight title + trend */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              {TREND_ICONS[insight.trend]}
              <span className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest">
                {insight.category}
              </span>
            </div>
            <h3 className="text-base font-extrabold text-[#1A1A1A] leading-snug mb-2">
              {insight.title}
            </h3>
            <p className="text-sm text-[#718096] leading-relaxed">{insight.summary}</p>
          </div>

          {/* Confidence */}
          <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[#4A5568]">AI confidence</p>
              <span className="text-xs font-bold text-[#1A1A1A]">{insight.confidence}%</span>
            </div>
            <div className="h-2 bg-[#F0F0EC] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#E85D04] transition-all"
                style={{ width: `${insight.confidence}%` }}
              />
            </div>
            <p className="text-[10px] text-[#A0AEC0] mt-2">
              Based on {(insight.confidence > 75 ? "strong" : "moderate")} signal strength from your last 30 days of data.
            </p>
          </div>

          {/* Supporting data */}
          {supporting.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0] mb-2">
                Supporting data
              </p>
              <div className="grid grid-cols-2 gap-2">
                {supporting.map((item) => (
                  <div
                    key={item.label}
                    className="bg-white border border-[#E8E8E4] rounded-xl p-3"
                  >
                    <p className="text-[10px] text-[#A0AEC0] font-medium mb-0.5">{item.label}</p>
                    <p className="text-sm font-extrabold text-[#1A1A1A]">{item.value}</p>
                    {item.sub && (
                      <p className="text-[10px] text-[#A0AEC0] mt-0.5">{item.sub}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          {insight.ctaLabel && (
            <button
              onClick={insight.onCta}
              className="
                w-full h-11 rounded-xl bg-[#E85D04] hover:bg-[#FF8C42] active:bg-[#C94E00]
                text-white text-sm font-semibold
                transition-colors shadow-[0_4px_16px_rgba(232,93,4,0.20)]
              "
            >
              {insight.ctaLabel}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
