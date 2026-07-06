"use client";

/**
 * app/insights/page.tsx
 *
 * ── Layout Integration ────────────────────────────────────────────────────────
 * This page is a direct child of DashboardLayout (layout.tsx).
 * It does NOT recreate any shell, header, sidebar, or footer.
 *
 * layout.tsx <main> applies:
 *   Mobile  → pt-16 pb-24  (offsets for fixed header + bottom nav)
 *   Desktop → pt-8 px-8 pb-12 (inside flex-1 column, right of fixed w-64 nav)
 *
 * This page respects those paddings — it does NOT use the escape hatch
 * pattern (unlike the full-bleed chat page) because the Insights page
 * is a standard scrollable dashboard, not a full-viewport panel.
 * The layout.tsx max-width constraints (max-w-[480px] mobile / max-w-6xl lg)
 * are intentionally kept — they centre content correctly on all breakpoints.
 */

import React, { useState, useCallback } from "react";

import InsightsHeader, { TimeRange } from "./components/InsightsHeader";
import InsightGrid from "./components/InsightGrid";
import InsightsChartSection from "./components/InsightsChartSection";
import RecommendationCard, { Recommendation } from "./components/RecommendationCard";
import DataSourcePanel from "./components/DataSourcePanel";
import InsightDetailPanel from "./components/InsightDetailPanel";
import { Insight } from "./components/InsightCard";
import { Search, SlidersHorizontal } from "lucide-react";

// ─── Seed data ────────────────────────────────────────────────────────────────
const ALL_INSIGHTS: Insight[] = [
  {
    id: "revenue-1",
    category: "revenue",
    priority: "high",
    title: "Revenue up 12% vs last month",
    summary:
      "Total revenue reached ₦450,000 this period. Growth is driven by Friday purchases and a 29% contribution from your top 5 customers.",
    trend: "up",
    trendValue: "+12%",
    confidence: 94,
    ctaLabel: "View revenue breakdown",
  },
  {
    id: "customer-1",
    category: "customers",
    priority: "high",
    title: "47 customers at churn risk",
    summary:
      "These customers haven't made a purchase in 14+ days and show declining engagement patterns. Outreach now could recover ₦58,000 in at-risk revenue.",
    trend: "down",
    trendValue: "47 customers",
    confidence: 81,
    ctaLabel: "View at-risk list",
  },
  {
    id: "sales-1",
    category: "sales",
    priority: "medium",
    title: "Food & Beverage drives repeat purchases",
    summary:
      "42% of all transactions are in Food & Beverage. Customers who buy here are 3× more likely to return within 7 days.",
    trend: "up",
    trendValue: "+3× repeat rate",
    confidence: 88,
    ctaLabel: "Analyse category",
  },
  {
    id: "risk-1",
    category: "risk",
    priority: "high",
    title: "Electronics sales dropped 18% this week",
    summary:
      "Wednesday traffic in the Electronics category fell sharply. This pattern started 2 weeks ago and may indicate seasonal shift or competitor pricing.",
    trend: "down",
    trendValue: "-18%",
    confidence: 76,
    ctaLabel: "Investigate",
  },
  {
    id: "growth-1",
    category: "growth",
    priority: "medium",
    title: "Morning hours are an untapped window",
    summary:
      "Only 9% of transactions occur between 7–10 AM despite 31% of your customers being active in that window. A morning promotion could lift revenue by est. ₦35,000/month.",
    trend: "neutral",
    trendValue: "Opportunity",
    confidence: 71,
    ctaLabel: "Explore timing data",
  },
  {
    id: "customer-2",
    category: "customers",
    priority: "low",
    title: "Retention improved for repeat buyers",
    summary:
      "Customers who made 3+ purchases show 66% retention rate, up from 58% last month. Your loyalty segment is strengthening.",
    trend: "up",
    trendValue: "+8pts",
    confidence: 91,
  },
];

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec-1",
    priority: "urgent",
    impact: "high",
    title: "Re-engage your 47 at-risk customers this week",
    description:
      "Send a personalised WhatsApp or email message to the 47 customers who haven't returned in 14+ days. Based on past behaviour, a 20% discount offer typically converts 30–40% of this group.",
    action: "Go to Follow-ups",
    estimatedGain: "Est. ₦58K recovered",
  },
  {
    id: "rec-2",
    priority: "high",
    impact: "high",
    title: "Run a Friday evening flash promotion",
    description:
      "Friday is your highest-traffic day. Scheduling a 3-hour flash sale between 5–8 PM could amplify your best-performing window by an estimated 20–25%.",
    action: "Schedule promotion",
    estimatedGain: "+₦22K potential",
  },
  {
    id: "rec-3",
    priority: "high",
    impact: "medium",
    title: "Bundle Electronics with Food & Beverage",
    description:
      "Electronics sales are declining while Food & Beverage drives repeat traffic. A bundle offer (e.g. buy any snack pack, get 10% off a small appliance) could reverse the Electronics slump.",
    action: "Create bundle offer",
  },
  {
    id: "rec-4",
    priority: "normal",
    impact: "medium",
    title: "Introduce a morning loyalty incentive",
    description:
      "Only 9% of sales happen 7–10 AM despite high customer activity in that window. A morning-only stamp card or double-points offer could shift spending patterns.",
    action: "Design loyalty reward",
    estimatedGain: "+₦35K/month",
  },
];

const CATEGORY_FILTERS = ["All", "Revenue", "Customers", "Sales", "Risk", "Growth"] as const;
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AIInsightsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  }, []);

  // Filter insights
  const filteredInsights = ALL_INSIGHTS.filter((ins) => {
    const matchCat =
      categoryFilter === "All" ||
      ins.category === categoryFilter.toLowerCase();
    const matchSearch =
      !searchQ ||
      ins.title.toLowerCase().includes(searchQ.toLowerCase()) ||
      ins.summary.toLowerCase().includes(searchQ.toLowerCase());
    return matchCat && matchSearch;
  });

  const timeRangeLabel: Record<TimeRange, string> = {
    "7d": "7 days",
    "30d": "30 days",
    "90d": "90 days",
  };

  return (
    // No shell — layout.tsx provides all outer structure.
    // px-4 adds gutter on mobile (layout.tsx max-w-[480px] already centres);
    // on desktop layout.tsx provides px-8 via main wrapper.
    <div className="px-4 lg:px-0">
      {/* ── Header ────────────────────────────────────────────── */}
      <InsightsHeader
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        lastUpdated="2 minutes ago"
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* ── Insight Explorer (search + filter) ────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 bg-white border border-[#E8E8E4] rounded-xl px-3 py-2.5 focus-within:border-[#E85D04] transition-colors">
            <Search className="w-4 h-4 text-[#A0AEC0] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search insights…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[#1A1A1A] placeholder:text-[#A0AEC0] outline-none"
            />
          </div>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`
              w-10 h-10 rounded-xl border flex items-center justify-center transition-all flex-shrink-0
              ${showFilters
                ? "bg-[#FFF0E6] border-[#E85D04] text-[#E85D04]"
                : "bg-white border-[#E8E8E4] text-[#A0AEC0] hover:text-[#4A5568]"
              }
            `}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Category filter pills */}
        {showFilters && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-0.5 scrollbar-none">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`
                  flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all
                  ${
                    categoryFilter === cat
                      ? "bg-[#E85D04] border-[#E85D04] text-white"
                      : "bg-white border-[#E8E8E4] text-[#4A5568] hover:border-[#E85D04] hover:text-[#E85D04]"
                  }
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Two-column layout on desktop when detail panel is open ── */}
      <div className={`${activeInsight ? "lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 lg:items-start" : ""}`}>
        {/* ── Left / main column ────────────────────────────────── */}
        <div>
          {/* Key insights grid */}
          {filteredInsights.length > 0 ? (
            <InsightGrid
              insights={filteredInsights.map((ins) => ({
                ...ins,
                ctaLabel: ins.ctaLabel ?? undefined,
                onCta: () => setActiveInsight(ins),
              }))}
              featuredId="revenue-1"
            />
          ) : (
            <div className="text-center py-16">
              <p className="text-[#A0AEC0] text-sm">No insights match your search.</p>
              <button
                onClick={() => { setSearchQ(""); setCategoryFilter("All"); }}
                className="mt-2 text-xs font-semibold text-[#E85D04] hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Deep analysis / chart section */}
          <InsightsChartSection timeRange={timeRangeLabel[timeRange]} />

          {/* Recommendations */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0]">
                AI Recommendations
              </h2>
              <span className="text-[10px] font-semibold text-[#E85D04] bg-[#FFF0E6] border border-[#F4C9A4] rounded-full px-2 py-0.5">
                {RECOMMENDATIONS.length} actions
              </span>
            </div>
            <div className="space-y-3">
              {RECOMMENDATIONS.map((rec, i) => (
                <RecommendationCard key={rec.id} rec={rec} index={i} />
              ))}
            </div>
          </section>

          {/* Data sources */}
          <DataSourcePanel />
        </div>

        {/* ── Detail panel — desktop inline, mobile bottom sheet ── */}
        {activeInsight && (
          <InsightDetailPanel
            insight={activeInsight}
            onClose={() => setActiveInsight(null)}
          />
        )}
      </div>
    </div>
  );
}
