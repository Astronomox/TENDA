"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus, ArrowRight, AlertTriangle, Lightbulb, Users, DollarSign, BarChart2, ShieldAlert } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type InsightCategory = "revenue" | "customers" | "sales" | "risk" | "growth";
export type TrendDirection = "up" | "down" | "neutral";
export type InsightPriority = "high" | "medium" | "low";

export interface Insight {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  summary: string;
  trend: TrendDirection;
  trendValue: string; // e.g. "+12%" or "-3 customers"
  confidence: number; // 0–100
  ctaLabel?: string;
  onCta?: () => void;
}

interface InsightCardProps {
  insight: Insight;
  featured?: boolean; // spans 2 cols on desktop
}

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<
  InsightCategory,
  { icon: React.ElementType; bg: string; text: string; border: string }
> = {
  revenue:   { icon: DollarSign,    bg: "bg-green-50",   text: "text-green-600",  border: "border-green-100" },
  customers: { icon: Users,         bg: "bg-blue-50",    text: "text-blue-600",   border: "border-blue-100"  },
  sales:     { icon: BarChart2,     bg: "bg-purple-50",  text: "text-purple-600", border: "border-purple-100"},
  risk:      { icon: ShieldAlert,   bg: "bg-red-50",     text: "text-red-500",    border: "border-red-100"   },
  growth:    { icon: Lightbulb,     bg: "bg-[#FFF0E6]",  text: "text-[#E85D04]",  border: "border-[#F4C9A4]" },
};

const PRIORITY_DOT: Record<InsightPriority, string> = {
  high:   "bg-red-400",
  medium: "bg-amber-400",
  low:    "bg-green-400",
};

// ─── Confidence bar ───────────────────────────────────────────────────────────
function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 80 ? "bg-green-400" : value >= 60 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 mt-3">
      <div className="flex-1 h-1 bg-[#F0F0EC] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] font-semibold text-[#A0AEC0] whitespace-nowrap">
        {value}% confidence
      </span>
    </div>
  );
}

// ─── Trend badge ──────────────────────────────────────────────────────────────
function TrendBadge({ direction, value }: { direction: TrendDirection; value: string }) {
  const config = {
    up:      { Icon: TrendingUp,   cls: "text-green-600 bg-green-50 border-green-100" },
    down:    { Icon: TrendingDown, cls: "text-red-500   bg-red-50   border-red-100"   },
    neutral: { Icon: Minus,        cls: "text-[#A0AEC0] bg-[#F8F8F6] border-[#E8E8E4]"},
  }[direction];

  return (
    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg border ${config.cls}`}>
      <config.Icon className="w-3 h-3" />
      {value}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function InsightCard({ insight, featured }: InsightCardProps) {
  const cat = CATEGORY_CONFIG[insight.category];
  const CatIcon = cat.icon;

  return (
    <div
      className={`
        group bg-white border border-[#E8E8E4] rounded-2xl p-4 lg:p-5
        hover:border-[#E85D04] hover:shadow-[0_4px_20px_rgba(232,93,4,0.08)]
        transition-all duration-200 flex flex-col
        ${featured ? "lg:col-span-2" : ""}
      `}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl ${cat.bg} border ${cat.border} flex items-center justify-center flex-shrink-0`}>
            <CatIcon className={`w-4 h-4 ${cat.text}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[insight.priority]}`} />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#A0AEC0]">
                {insight.category}
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#1A1A1A] leading-snug truncate">
              {insight.title}
            </h3>
          </div>
        </div>
        <TrendBadge direction={insight.trend} value={insight.trendValue} />
      </div>

      {/* Summary */}
      <p className="text-sm text-[#4A5568] leading-relaxed flex-1">
        {insight.summary}
      </p>

      {/* Confidence */}
      <ConfidenceBar value={insight.confidence} />

      {/* CTA */}
      {insight.ctaLabel && (
        <button
          onClick={insight.onCta}
          className="
            mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#E85D04]
            hover:gap-2.5 transition-all self-start
          "
        >
          {insight.ctaLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
