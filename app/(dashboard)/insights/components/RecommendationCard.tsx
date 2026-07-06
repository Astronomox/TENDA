"use client";

import React from "react";
import { ArrowRight, Zap, Target, TrendingUp } from "lucide-react";

export type RecommendationPriority = "urgent" | "high" | "normal";
export type RecommendationImpact = "high" | "medium" | "low";

export interface Recommendation {
  id: string;
  priority: RecommendationPriority;
  impact: RecommendationImpact;
  title: string;
  description: string;
  action: string;
  estimatedGain?: string;
  onAction?: () => void;
}

interface RecommendationCardProps {
  rec: Recommendation;
  index: number;
}

const PRIORITY_CONFIG: Record<
  RecommendationPriority,
  { label: string; dot: string; ring: string }
> = {
  urgent: { label: "Urgent",  dot: "bg-red-400",   ring: "border-red-100 bg-red-50"    },
  high:   { label: "High",    dot: "bg-amber-400",  ring: "border-amber-100 bg-amber-50" },
  normal: { label: "Normal",  dot: "bg-green-400",  ring: "border-green-100 bg-green-50" },
};

const IMPACT_CONFIG: Record<RecommendationImpact, { icon: React.ElementType; color: string }> = {
  high:   { icon: Zap,        color: "text-[#E85D04]" },
  medium: { icon: Target,     color: "text-blue-500"  },
  low:    { icon: TrendingUp, color: "text-green-500" },
};

export default function RecommendationCard({ rec, index }: RecommendationCardProps) {
  const pri = PRIORITY_CONFIG[rec.priority];
  const imp = IMPACT_CONFIG[rec.impact];
  const ImpactIcon = imp.icon;

  return (
    <div className="bg-white border border-[#E8E8E4] rounded-2xl p-4 lg:p-5 hover:border-[#E85D04] hover:shadow-[0_4px_20px_rgba(232,93,4,0.06)] transition-all group">
      <div className="flex items-start gap-3 lg:gap-4">
        {/* Index number */}
        <div className="w-8 h-8 rounded-xl bg-[#FFF0E6] border border-[#F4C9A4] flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-extrabold text-[#E85D04]">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${pri.ring}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
              {pri.label}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-[#A0AEC0]">
              <ImpactIcon className={`w-3 h-3 ${imp.color}`} />
              {rec.impact} impact
            </div>
            {rec.estimatedGain && (
              <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-lg">
                {rec.estimatedGain}
              </span>
            )}
          </div>

          {/* Title + description */}
          <h3 className="text-sm font-bold text-[#1A1A1A] mb-1 leading-snug">
            {rec.title}
          </h3>
          <p className="text-sm text-[#718096] leading-relaxed mb-3">
            {rec.description}
          </p>

          {/* Action CTA */}
          <button
            onClick={rec.onAction}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#E85D04] hover:gap-2.5 transition-all"
          >
            {rec.action}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
