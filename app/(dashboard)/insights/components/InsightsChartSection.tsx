"use client";

import React, { useMemo } from "react";

interface DataPoint {
  label: string;
  value: number;
}

interface SparklineProps {
  data: DataPoint[];
  color?: string;
  height?: number;
}

// Pure SVG sparkline — no external dependency
function Sparkline({ data, color = "#E85D04", height = 60 }: SparklineProps) {
  const width = 300;
  const pad = 4;

  const points = useMemo(() => {
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return data.map((d, i) => ({
      x: pad + (i / (data.length - 1)) * (width - pad * 2),
      y: pad + ((max - d.value) / range) * (height - pad * 2),
      label: d.label,
      value: d.value,
    }));
  }, [data, height]);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD =
    pathD +
    ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)" />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
}

// ─── Mini bar chart ────────────────────────────────────────────────────────────
function BarMini({ data, color = "#E85D04" }: { data: DataPoint[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-sm transition-all"
            style={{
              height: `${(d.value / max) * 100}%`,
              background: color,
              opacity: i === data.length - 1 ? 1 : 0.35,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
const REVENUE_DATA: DataPoint[] = [
  { label: "Mon", value: 28000 },
  { label: "Tue", value: 32000 },
  { label: "Wed", value: 22000 },
  { label: "Thu", value: 38000 },
  { label: "Fri", value: 55000 },
  { label: "Sat", value: 48000 },
  { label: "Sun", value: 51000 },
];

const CATEGORY_DATA: DataPoint[] = [
  { label: "Food", value: 42 },
  { label: "Apparel", value: 28 },
  { label: "Electronics", value: 18 },
  { label: "Beauty", value: 12 },
];

interface InsightsChartSectionProps {
  timeRange: string;
}

export default function InsightsChartSection({ timeRange }: InsightsChartSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0] mb-3">
        Deep Analysis
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        {/* Revenue trend — spans 2 cols */}
        <div className="lg:col-span-2 bg-white border border-[#E8E8E4] rounded-2xl p-4 lg:p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0]">
                Revenue trend
              </p>
              <p className="text-2xl font-extrabold text-[#1A1A1A] mt-1">
                ₦450,000
              </p>
              <p className="text-xs text-green-500 font-semibold mt-0.5">
                +12% vs last {timeRange}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#A0AEC0]">Avg daily</p>
              <p className="text-sm font-bold text-[#4A5568] mt-0.5">₦64,285</p>
            </div>
          </div>

          {/* Sparkline */}
          <Sparkline data={REVENUE_DATA} />

          {/* X labels */}
          <div className="flex justify-between mt-1.5">
            {REVENUE_DATA.map((d) => (
              <span key={d.label} className="text-[10px] text-[#C0C0B8] font-medium">
                {d.label}
              </span>
            ))}
          </div>

          {/* Key findings */}
          <div className="mt-4 pt-4 border-t border-[#F0F0EC]">
            <p className="text-xs font-semibold text-[#4A5568] mb-2">Key findings</p>
            <ul className="space-y-1.5">
              {[
                "Friday is consistently your highest-revenue day (+45% above weekly average)",
                "Weekend sales show strong retention — 63% of Sat buyers return on Sun",
                "Wednesday dip is driven by 40% lower foot traffic in the electronics category",
              ].map((finding, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#718096] leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-[#E85D04] mt-1.5 flex-shrink-0" />
                  {finding}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-white border border-[#E8E8E4] rounded-2xl p-4 lg:p-5 flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0] mb-4">
            Sales by category
          </p>

          <div className="space-y-3 flex-1">
            {CATEGORY_DATA.map((d, i) => {
              const colors = ["#E85D04", "#3B82F6", "#8B5CF6", "#10B981"];
              return (
                <div key={d.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#2D3748]">{d.label}</span>
                    <span className="text-xs font-bold text-[#4A5568]">{d.value}%</span>
                  </div>
                  <div className="h-1.5 bg-[#F0F0EC] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${d.value}%`, background: colors[i] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mini bars */}
          <div className="mt-4 pt-4 border-t border-[#F0F0EC]">
            <p className="text-[10px] text-[#A0AEC0] mb-2 font-medium">Daily units sold</p>
            <BarMini
              data={[
                { label: "M", value: 34 },
                { label: "T", value: 41 },
                { label: "W", value: 27 },
                { label: "T", value: 58 },
                { label: "F", value: 72 },
                { label: "S", value: 65 },
                { label: "S", value: 61 },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
