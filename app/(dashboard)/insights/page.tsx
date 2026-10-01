"use client";

/**
 * AI Insights — GET /insights, /analytics/timeseries, /analytics/products
 * (BACKEND_README.md §12–14). Every number on this page comes from the backend.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, Sparkles, Lightbulb } from "lucide-react";

import InsightsHeader from "./components/InsightsHeader";
import InsightGrid from "./components/InsightGrid";
import InsightsChartSection from "./components/InsightsChartSection";
import RecommendationCard from "./components/RecommendationCard";
import DataSourcePanel from "./components/DataSourcePanel";
import InsightDetailPanel from "./components/InsightDetailPanel";
import { Insight } from "./components/InsightCard";
import { analytics, insights as insightsApi } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { relative } from "@/lib/format";
import type { InsightData, InsightsResponse, TimeRange } from "@/lib/types";
import { EmptyState, ErrorState, PendingBackend, Skeleton } from "@/components/ui";

const CATEGORY_FILTERS = ["All", "Revenue", "Customers", "Sales", "Risk", "Growth"] as const;
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

const RANGE_LABEL: Record<TimeRange, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

export default function AIInsightsPage() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const res = useResource(`insights:${timeRange}`, () => insightsApi.get(timeRange));
  const series = useResource(`analytics:timeseries:${timeRange}`, () => analytics.timeseries({ range: timeRange }));
  const products = useResource(`analytics:products:${timeRange}`, () => analytics.products(timeRange));

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const fresh = await insightsApi.refresh(timeRange);
      res.setData(fresh);
      void series.reload();
      void products.reload();
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Couldn't refresh insights.");
    } finally {
      setRefreshing(false);
    }
  }

  const go = (route: string | null) => () => {
    if (route) router.push(route);
  };

  const toInsight = (i: InsightData): Insight => ({
    id: i.id,
    category: i.category,
    priority: i.priority,
    title: i.title,
    summary: i.summary,
    trend: i.trend,
    trendValue: i.trend_value,
    confidence: Math.round(i.confidence),
    ctaLabel: i.cta_label ?? undefined,
    onCta: i.cta_route ? go(i.cta_route) : undefined,
    supporting: i.supporting,
  });

  const data: InsightsResponse | undefined = res.data;
  const all = data?.insights.map(toInsight) ?? [];
  const filtered = all.filter((ins) => {
    const matchCat = categoryFilter === "All" || ins.category === categoryFilter.toLowerCase();
    const q = searchQ.toLowerCase();
    const matchSearch = !q || ins.title.toLowerCase().includes(q) || ins.summary.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
  const activeInsight = activeId ? all.find((i) => i.id === activeId) ?? null : null;

  return (
    <div className="px-4 lg:px-0">
      <InsightsHeader
        timeRange={timeRange}
        onTimeRangeChange={(r) => {
          setTimeRange(r);
          setActiveId(null);
        }}
        lastUpdated={data ? relative(data.generated_at) : "—"}
        onRefresh={() => void handleRefresh()}
        isRefreshing={refreshing || res.loading}
        basedOn={data?.based_on ?? null}
      />

      {refreshError && <div className="mb-4"><ErrorState error={refreshError} compact /></div>}

      {/* AI narrative */}
      {data?.ai_narrative && (
        <div className="mb-6 bg-[#FFF7F0] border border-[#F4C9A4] rounded-2xl p-4 lg:p-5 flex gap-3">
          <Sparkles className="w-5 h-5 text-[#E85D04] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#2D3748] leading-relaxed whitespace-pre-line">{data.ai_narrative.text}</p>
        </div>
      )}

      {/* Search + filter */}
      {all.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2">
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
            <button
              onClick={() => setShowFilters((v) => !v)}
              aria-label="Filter by category"
              aria-pressed={showFilters}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${
                showFilters ? "bg-[#FFF0E6] border-[#E85D04] text-[#E85D04]" : "bg-white border-[#E8E8E4] text-[#A0AEC0] hover:text-[#4A5568]"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
          {showFilters && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-0.5 scrollbar-none">
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    categoryFilter === cat
                      ? "bg-[#E85D04] border-[#E85D04] text-white"
                      : "bg-white border-[#E8E8E4] text-[#4A5568] hover:border-[#E85D04] hover:text-[#E85D04]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={activeInsight ? "lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 lg:items-start" : ""}>
        <div>
          {/* Key insights */}
          {data ? (
            all.length === 0 ? (
              <div className="mb-8 bg-white border border-[#E8E8E4] rounded-2xl">
                <EmptyState
                  icon={Lightbulb}
                  title="Not enough data for insights yet"
                  body={data.data_quality.issues[0] ?? "Keep logging sales with customers attached and insights will appear here."}
                />
              </div>
            ) : filtered.length > 0 ? (
              <InsightGrid
                insights={filtered.map((ins) => ({ ...ins, onCta: () => setActiveId(ins.id), ctaLabel: ins.ctaLabel ?? "See details" }))}
                featuredId={filtered[0]?.id}
              />
            ) : (
              <div className="text-center py-16">
                <p className="text-[#A0AEC0] text-sm">No insights match your search.</p>
                <button
                  onClick={() => {
                    setSearchQ("");
                    setCategoryFilter("All");
                  }}
                  className="mt-2 text-xs font-semibold text-[#E85D04] hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )
          ) : res.notImplemented ? (
            <div className="mb-8"><PendingBackend feature="AI insights" endpoint="GET /insights" /></div>
          ) : res.error ? (
            <div className="mb-8"><ErrorState error={res.error} onRetry={() => void res.reload()} /></div>
          ) : (
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
            </div>
          )}

          <InsightsChartSection timeRangeLabel={RANGE_LABEL[timeRange]} series={series} products={products} />

          {/* Recommendations */}
          {data && data.recommendations.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0]">AI Recommendations</h2>
                <span className="text-[10px] font-semibold text-[#E85D04] bg-[#FFF0E6] border border-[#F4C9A4] rounded-full px-2 py-0.5">
                  {data.recommendations.length} action{data.recommendations.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-3">
                {data.recommendations.map((rec, i) => (
                  <RecommendationCard
                    key={rec.id}
                    index={i}
                    rec={{
                      id: rec.id,
                      priority: rec.priority,
                      impact: rec.impact,
                      title: rec.title,
                      description: rec.description,
                      action: rec.action_label,
                      estimatedGain: rec.estimated_gain ?? undefined,
                      onAction: rec.action_route ? go(rec.action_route) : undefined,
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {data && <DataSourcePanel sources={data.data_sources} quality={data.data_quality} />}
        </div>

        {activeInsight && (
          <InsightDetailPanel
            insight={{
              ...activeInsight,
              onCta: data?.insights.find((i) => i.id === activeInsight.id)?.cta_route
                ? go(data!.insights.find((i) => i.id === activeInsight.id)!.cta_route)
                : undefined,
            }}
            onClose={() => setActiveId(null)}
          />
        )}
      </div>
    </div>
  );
}
