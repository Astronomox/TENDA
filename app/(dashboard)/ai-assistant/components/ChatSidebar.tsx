"use client";

import React from "react";
import { Plus, Search, MessageSquare } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ChatHistoryItem {
  id: number;
  title: string;
  date: "Today" | "Yesterday" | string;
}

interface ChatSidebarProps {
  history: ChatHistoryItem[];
  activeId: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectChat: (id: number) => void;
  onNewChat: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
// This component owns NO layout shell of its own.
// It is rendered INSIDE layout.tsx's <aside> column on desktop,
// or as a drawer panel on mobile — the parent controls positioning.
export default function ChatSidebar({
  history,
  activeId,
  searchQuery,
  onSearchChange,
  onSelectChat,
  onNewChat,
}: ChatSidebarProps) {
  const DATE_GROUPS = ["Today", "Yesterday", "Earlier"];

  const grouped = DATE_GROUPS.reduce<Record<string, ChatHistoryItem[]>>(
    (acc, group) => {
      const matches = history.filter((h) => {
        const q = searchQuery.toLowerCase();
        if (!h.title.toLowerCase().includes(q)) return false;
        if (group === "Earlier")
          return h.date !== "Today" && h.date !== "Yesterday";
        return h.date === group;
      });
      if (matches.length) acc[group] = matches;
      return acc;
    },
    {}
  );

  return (
    // Full height flex column — parent must constrain height
    <div className="flex flex-col h-full bg-[#FAFAF8]">
      {/* New chat */}
      <div className="px-4 pt-4 pb-3">
        <button
          onClick={onNewChat}
          className="
            w-full flex items-center justify-center gap-2
            bg-[#E85D04] hover:bg-[#FF8C42] active:bg-[#C94E00]
            text-white text-sm font-semibold
            rounded-xl h-10
            transition-colors shadow-[0_4px_16px_rgba(232,93,4,0.20)]
          "
        >
          <Plus className="w-4 h-4" />
          New conversation
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 bg-white border border-[#E8E8E4] rounded-xl px-3 py-2 focus-within:border-[#E85D04] transition-colors">
          <Search className="w-4 h-4 text-[#A0AEC0] flex-shrink-0" />
          <input
            type="text"
            placeholder="Search chats…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#1A1A1A] placeholder:text-[#A0AEC0] outline-none"
          />
        </div>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {Object.keys(grouped).length === 0 ? (
          <p className="text-xs text-[#A0AEC0] text-center mt-8 px-4">
            No conversations match your search.
          </p>
        ) : (
          Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A0AEC0] px-3 mb-1">
                {group}
              </p>
              {items.map((item) => {
                const active = item.id === activeId;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectChat(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                      transition-all group
                      ${
                        active
                          ? "bg-[#FFF0E6] text-[#E85D04]"
                          : "text-[#4A5568] hover:bg-white hover:text-[#1A1A1A]"
                      }
                    `}
                  >
                    <MessageSquare
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        active ? "text-[#E85D04]" : "text-[#A0AEC0] group-hover:text-[#4A5568]"
                      }`}
                    />
                    <span className="text-sm font-medium truncate">
                      {item.title}
                    </span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#E85D04] flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
