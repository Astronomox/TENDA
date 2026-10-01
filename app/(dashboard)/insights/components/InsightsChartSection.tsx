"use client";

import React, { useId, useMemo } from "react";
import { naira, number, pct } from "@/lib/format";
import type { ProductBreakdown, Timeseries } from "@/lib/types";
import type { Resource } from "@/lib/hooks";
import { ErrorState, PendingBackend, Skeleton } from "@/components/ui";

interface DataPoint {
  label: string;
  value: number;
}

// Pure SVG sparkline — no external dependency
function Sparkline({ data, color = "#E85D04", height = 60 }: { data: DataPoint[]; color?: string; height?: number }) {
  const width = 300;
  const pad = 4;
  const gradientId = useId();

  const points = useMemo(() => {
    const values = data.map((d) => d.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0;
    return data.map((d, i) => ({
      x: data.length > 1 ? pad + i * step : width / 2,
      y: pad + ((max - d.value) / range) * (height - pad * 2),
    }));
  }, [data, height]);

  if (points.length === 0) return null;

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label="Revenue trend">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="3" fill={color} />
    </svg>
  );
}

function BarMini({ data, color = "#E85D04" }: { data: DataPoint[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((d, i) => (
        <div key={i} className="flex-1 h-full flex items-end" title={`${d.label}: ${d.value}`}>
          <div
            className="w-full rounded-sm transition-all"
            style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 6 : 2)}%`, background: color, opacity: i === data.length - 1 ? 1 : 0.35 }}
          />
        </div>
      ))}
    </div>
  );
}

const COLORS = ["#E85D04", "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899"];

/** Show only every nth x-label so long ranges stay readable. */
function sparseLabels(points: Timeseries["points"]) {
  const step = Math.ceil(points.length / 8);
  return points.map((p, i) => (i % step === 0 || i === points.length - 1 ? p.label : ""));
}

export default function InsightsChartSection({
  timeRangeLabel,
  series,
  products,
}: {
  timeRangeLabel: string;
  series: Resource<Timeseries>;
  products: Resource<ProductBreakdown>;
}) {
  const ts = series.data;
  const change = ts ? pct(ts.change_pct) : null;
  const hasRevenue = !!ts && ts.totals.revenue > 0;

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0] mb-3">Deep Analysis</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        {/* Revenue trend */}
        <div className="lg:col-span-2 bg-white border border-[#E8E8E4] rounded-2xl p-4 lg:p-5">
          {ts ? (
            <>
              <div className="flex items-start justify-between mb-4 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0]">Revenue · last {timeRangeLabel}</p>
                  <p className="text-2xl font-extrabold text-[#1A1A1A] mt-1">{naira(ts.totals.revenue)}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${(ts.change_pct ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {change ? `${change} vs previous ${timeRangeLabel}` : <span className="text-[#A0AEC0]">No earlier period to compare</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#A0AEC0]">Avg per {ts.interval}</p>
                  <p className="text-sm font-bold text-[#4A5568] mt-0.5">{naira(ts.average_per_interval)}</p>
                </div>
              </div>

              {hasRevenue ? (
                <>
                  <Sparkline data={ts.points.map((p) => ({ label: p.label, value: p.revenue }))} />
                  <div className="flex justify-between mt-1.5">
                    {sparseLabels(ts.points).map((l, i) => (
                      <span key={i} className="text-[10px] text-[#C0C0B8] font-medium">{l}</span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#A0AEC0] py-6 text-center">No sales in this period yet.</p>
              )}

              {hasRevenue && (
                <div className="mt-4 pt-4 border-t border-[#F0F0EC] grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A]">{number(ts.totals.transactions)}</p>
                    <p className="text-[10px] text-[#A0AEC0]">sales</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A]">{number(ts.totals.units)}</p>
                    <p className="text-[10px] text-[#A0AEC0]">units sold</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A]">{ts.best_interval?.label ?? "—"}</p>
                    <p className="text-[10px] text-[#A0AEC0]">
                      best {ts.interval}{ts.best_interval ? ` · ${naira(ts.best_interval.revenue, { compact: true })}` : ""}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : series.notImplemented ? (
            <PendingBackend feature="Revenue trend" endpoint="GET /analytics/timeseries" />
          ) : series.error ? (
            <ErrorState error={series.error} onRetry={() => void series.reload()} compact />
          ) : (
            <Skeleton className="h-48" />
          )}
        </div>

        {/* Sales by product */}
        <div className="bg-white border border-[#E8E8E4] rounded-2xl p-4 lg:p-5 flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0] mb-4">Sales by product</p>

          {products.data ? (
            products.data.items.length === 0 ? (
              <p className="text-sm text-[#A0AEC0]">No sales in this period yet.</p>
            ) : (
              <div className="space-y-3 flex-1">
                {products.data.items.slice(0, 6).map((d, i) => {
                  const share = Math.round(d.share_of_revenue * 100);
                  return (
                    <div key={`${d.product_id ?? d.product_name}-${i}`}>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-sm font-medium text-[#2D3748] truncate">{d.product_name}</span>
                        <span className="text-xs font-bold text-[#4A5568] flex-shrink-0">{share}%</span>
                      </div>
                      <div className="h-1.5 bg-[#F0F0EC] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${share}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : products.notImplemented ? (
            <PendingBackend feature="Product breakdown" endpoint="GET /analytics/products" />
          ) : products.error ? (
            <ErrorState error={products.error} onRetry={() => void products.reload()} compact />
          ) : (
            <Skeleton className="h-40" />
          )}

          {ts && hasRevenue && (
            <div className="mt-4 pt-4 border-t border-[#F0F0EC]">
              <p className="text-[10px] text-[#A0AEC0] mb-2 font-medium">Units sold per {ts.interval}</p>
              <BarMini data={ts.points.map((p) => ({ label: p.label, value: p.units }))} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
