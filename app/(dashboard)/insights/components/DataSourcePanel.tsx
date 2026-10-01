"use client";

import React from "react";
import { Database, Clock, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { relative } from "@/lib/format";
import type { InsightsResponse } from "@/lib/types";

export default function DataSourcePanel({
  sources,
  quality,
}: {
  sources: InsightsResponse["data_sources"];
  quality: InsightsResponse["data_quality"];
}) {
  const score = Math.max(0, Math.min(100, Math.round(quality.score)));
  const verdict =
    score >= 80 ? "Your data is in great shape." : score >= 50 ? "Good — a few gaps are limiting your insights." : "Insights are limited until more details are filled in.";

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0] mb-3">Data Sources</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        <div className="bg-white border border-[#E8E8E4] rounded-2xl p-4 lg:p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-[#E85D04]" />
            <p className="text-xs font-semibold text-[#4A5568]">Data quality</p>
          </div>

          <div className="flex items-center justify-center my-4">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90" aria-hidden>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F0F0EC" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#E85D04" strokeWidth="3"
                  strokeDasharray={`${score} ${100 - score}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-[#1A1A1A]">{score}%</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#718096] text-center leading-relaxed">{verdict}</p>
          {quality.issues.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {quality.issues.map((issue) => (
                <li key={issue} className="flex items-start gap-1.5 text-[11px] text-[#718096] leading-snug">
                  <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-[#E8E8E4] rounded-2xl p-4 lg:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-[#A0AEC0]" />
            <p className="text-xs font-semibold text-[#4A5568]">What TENDA is analysing</p>
          </div>

          {sources.length === 0 ? (
            <p className="text-sm text-[#A0AEC0]">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {sources.map((src) => {
                const ok = src.status === "ok" || src.status === "synced";
                return (
                  <div key={src.name} className="flex items-center gap-3 py-2.5 border-b border-[#F8F8F6] last:border-0">
                    {ok ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#2D3748] truncate">{src.name}</p>
                      <p className="text-xs text-[#A0AEC0]">{src.record_count.toLocaleString()} records</p>
                    </div>
                    {src.last_updated_at && (
                      <div className="flex items-center justify-end gap-1 text-[10px] text-[#A0AEC0] flex-shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {relative(src.last_updated_at)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
