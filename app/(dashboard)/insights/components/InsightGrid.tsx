"use client";

import React from "react";
import InsightCard, { Insight } from "./InsightCard";

interface InsightGridProps {
  insights: Insight[];
  featuredId?: string; // which insight gets the 2-col treatment
}

export default function InsightGrid({ insights, featuredId }: InsightGridProps) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0] mb-3">
        Key Insights
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            featured={insight.id === featuredId}
          />
        ))}
      </div>
    </section>
  );
}
