"use client";

import React from "react";
import { Database, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";

interface DataSource {
  name: string;
  recordCount: number;
  lastSynced: string;
  status: "synced" | "pending" | "error";
}

const SOURCES: DataSource[] = [
  { name: "Customer transactions",  recordCount: 1284, lastSynced: "2 min ago",   status: "synced"  },
  { name: "Sales records",          recordCount: 3847, lastSynced: "2 min ago",   status: "synced"  },
  { name: "Product catalog",        recordCount: 156,  lastSynced: "15 min ago",  status: "synced"  },
  { name: "Customer profiles",      recordCount: 1284, lastSynced: "1 hour ago",  status: "synced"  },
];

const STATUS_CONFIG = {
  synced:  { dot: "bg-green-400",  label: "Synced",  text: "text-green-600"  },
  pending: { dot: "bg-amber-400",  label: "Pending", text: "text-amber-600"  },
  error:   { dot: "bg-red-400",    label: "Error",   text: "text-red-500"    },
};

export default function DataSourcePanel() {
  const overallConfidence = 94;

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0] mb-3">
        Data Sources
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        {/* Overall confidence */}
        <div className="bg-white border border-[#E8E8E4] rounded-2xl p-4 lg:p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-[#E85D04]" />
            <p className="text-xs font-semibold text-[#4A5568]">Overall data confidence</p>
          </div>

          {/* Big ring-style indicator (pure CSS) */}
          <div className="flex items-center justify-center my-4">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F0F0EC" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#E85D04" strokeWidth="3"
                  strokeDasharray={`${overallConfidence} ${100 - overallConfidence}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-[#1A1A1A]">{overallConfidence}%</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#718096] text-center leading-relaxed">
            High confidence — all data sources are synced and complete.
          </p>
        </div>

        {/* Source list */}
        <div className="lg:col-span-2 bg-white border border-[#E8E8E4] rounded-2xl p-4 lg:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-[#A0AEC0]" />
            <p className="text-xs font-semibold text-[#4A5568]">Connected data sources</p>
          </div>

          <div className="space-y-3">
            {SOURCES.map((src) => {
              const s = STATUS_CONFIG[src.status];
              return (
                <div
                  key={src.name}
                  className="flex items-center gap-3 py-2.5 border-b border-[#F8F8F6] last:border-0"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2D3748] truncate">{src.name}</p>
                    <p className="text-xs text-[#A0AEC0]">
                      {src.recordCount.toLocaleString()} records
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`flex items-center gap-1 text-[10px] font-semibold ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] text-[#A0AEC0]">
                      <Clock className="w-2.5 h-2.5" />
                      {src.lastSynced}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
