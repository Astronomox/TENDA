"use client";

import React from "react";
import { Sparkles, RefreshCw } from "lucide-react";

export type TimeRange = "7d" | "30d" | "90d";

interface InsightsHeaderProps {
  timeRange: TimeRange;
  onTimeRangeChange: (r: TimeRange) => void;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

export default function InsightsHeader({
  timeRange,
  onTimeRangeChange,
  lastUpdated,
  onRefresh,
  isRefreshing,
}: InsightsHeaderProps) {
  return (
    <div className="mb-6 lg:mb-8">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#FFF0E6] border border-[#F4C9A4] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#E85D04]" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-xl lg:text-2xl text-[#1A1A1A] tracking-tight leading-tight">
              AI Insights
            </h1>
            <p className="text-sm text-[#718096] mt-0.5 hidden sm:block">
              Intelligent analysis of your business data
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Time range pills */}
          <div className="flex items-center bg-[#F0F0EC] rounded-xl p-1 gap-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => onTimeRangeChange(r.value)}
                className={`
                  text-xs font-semibold px-3 py-1.5 rounded-lg transition-all
                  ${
                    timeRange === r.value
                      ? "bg-white text-[#E85D04] shadow-sm"
                      : "text-[#718096] hover:text-[#4A5568]"
                  }
                `}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 rounded-xl border border-[#E8E8E4] bg-white flex items-center justify-center text-[#A0AEC0] hover:text-[#4A5568] hover:border-[#D0D0C8] transition-all disabled:opacity-50"
            aria-label="Refresh insights"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Context summary bar */}
      <div className="mt-4 flex items-center gap-2 text-xs text-[#A0AEC0] flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          AI analysis up to date
        </span>
        <span className="text-[#E8E8E4]">·</span>
        <span>Last updated {lastUpdated}</span>
        <span className="text-[#E8E8E4]">·</span>
        <span>Based on 1,284 customers &amp; 143 transactions</span>
      </div>
    </div>
  );
}
