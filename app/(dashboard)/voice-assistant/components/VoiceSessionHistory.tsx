"use client";

import React, { useState } from "react";
import { Search, Play, Trash2, Clock, ChevronRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface VoiceSession {
  id: string;
  title: string;
  duration: string; // e.g. "4:32"
  date: string;
  dateGroup: "Today" | "Yesterday" | "Earlier";
  messageCount: number;
  preview: string;
}

interface VoiceSessionHistoryProps {
  sessions: VoiceSession[];
  onReplay: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  activeId?: string;
}

const DATE_GROUPS = ["Today", "Yesterday", "Earlier"] as const;

// ─── Component ────────────────────────────────────────────────────────────────
export default function VoiceSessionHistory({
  sessions,
  onReplay,
  onDelete,
  onSelect,
  activeId,
}: VoiceSessionHistoryProps) {
  const [searchQ, setSearchQ] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);

  const filtered = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQ.toLowerCase()) ||
      s.preview.toLowerCase().includes(searchQ.toLowerCase())
  );

  const grouped = DATE_GROUPS.reduce<Record<string, VoiceSession[]>>((acc, g) => {
    const items = filtered.filter((s) => s.dateGroup === g);
    if (items.length) acc[g] = items;
    return acc;
  }, {});

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0] mb-3">
        Session history
      </h2>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-[#E8E8E4] rounded-xl px-3 py-2.5 mb-3 focus-within:border-[#E85D04] transition-colors">
        <Search className="w-4 h-4 text-[#A0AEC0] flex-shrink-0" />
        <input
          type="text"
          placeholder="Search sessions…"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="flex-1 bg-transparent text-sm text-[#1A1A1A] placeholder:text-[#A0AEC0] outline-none"
        />
      </div>

      {/* Groups */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-10 text-sm text-[#A0AEC0]">
          No sessions found.
        </div>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A0AEC0] mb-1.5 px-1">
              {group}
            </p>
            <div className="space-y-2">
              {items.map((session) => {
                const isActive = session.id === activeId;
                const isHovered = hoverId === session.id;

                return (
                  <div
                    key={session.id}
                    className={`
                      bg-white border rounded-xl px-4 py-3 cursor-pointer
                      transition-all group
                      ${isActive
                        ? "border-[#E85D04] shadow-[0_2px_12px_rgba(232,93,4,0.08)]"
                        : "border-[#E8E8E4] hover:border-[#E85D04] hover:shadow-[0_2px_12px_rgba(232,93,4,0.06)]"
                      }
                    `}
                    onClick={() => onSelect(session.id)}
                    onMouseEnter={() => setHoverId(session.id)}
                    onMouseLeave={() => setHoverId(null)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`text-sm font-semibold truncate ${isActive ? "text-[#E85D04]" : "text-[#1A1A1A]"}`}>
                            {session.title}
                          </p>
                          {isActive && (
                            <span className="text-[10px] font-semibold text-[#E85D04] bg-[#FFF0E6] border border-[#F4C9A4] rounded-full px-1.5 py-0.5 flex-shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#718096] truncate mb-1.5">{session.preview}</p>
                        <div className="flex items-center gap-3 text-[10px] text-[#A0AEC0]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {session.duration}
                          </span>
                          <span>{session.messageCount} messages</span>
                          <span>{session.date}</span>
                        </div>
                      </div>

                      {/* Action buttons — reveal on hover */}
                      <div
                        className={`
                          flex items-center gap-1.5 flex-shrink-0
                          transition-opacity duration-150
                          ${isHovered || isActive ? "opacity-100" : "opacity-0"}
                        `}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); onReplay(session.id); }}
                          className="w-7 h-7 rounded-lg bg-[#FFF0E6] border border-[#F4C9A4] text-[#E85D04] flex items-center justify-center hover:bg-[#FFE5CC] transition-colors"
                          aria-label="Replay session"
                        >
                          <Play className="w-3 h-3 fill-[#E85D04]" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                          className="w-7 h-7 rounded-lg bg-[#FAFAF8] border border-[#E8E8E4] text-[#A0AEC0] flex items-center justify-center hover:bg-red-50 hover:border-red-100 hover:text-red-400 transition-colors"
                          aria-label="Delete session"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-[#A0AEC0]" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
