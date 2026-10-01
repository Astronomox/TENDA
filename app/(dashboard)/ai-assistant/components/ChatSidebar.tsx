"use client";

import React from "react";
import { Plus, Search, MessageSquare, Trash2 } from "lucide-react";
import { dayGroup } from "@/lib/format";

export interface ChatHistoryItem {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatSidebarProps {
  history: ChatHistoryItem[];
  activeId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onNewChat: () => void;
  /** Message to show instead of the list (loading / unavailable). */
  status?: string | null;
}

const DATE_GROUPS = ["Today", "Yesterday", "Earlier"] as const;

export default function ChatSidebar({
  history,
  activeId,
  searchQuery,
  onSearchChange,
  onSelectChat,
  onDeleteChat,
  onNewChat,
  status,
}: ChatSidebarProps) {
  const q = searchQuery.toLowerCase();
  const grouped = DATE_GROUPS.map((group) => ({
    group,
    items: history.filter((h) => h.title.toLowerCase().includes(q) && dayGroup(h.updatedAt) === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col h-full bg-[#FAFAF8]">
      <div className="px-4 pt-4 pb-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-[#E85D04] hover:bg-[#FF8C42] active:bg-[#C94E00] text-white text-sm font-semibold rounded-xl h-10 transition-colors shadow-[0_4px_16px_rgba(232,93,4,0.20)]"
        >
          <Plus className="w-4 h-4" />
          New conversation
        </button>
      </div>

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

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {status ? (
          <p className="text-xs text-[#A0AEC0] text-center mt-8 px-4 leading-relaxed">{status}</p>
        ) : grouped.length === 0 ? (
          <p className="text-xs text-[#A0AEC0] text-center mt-8 px-4">
            {history.length === 0 ? "Your conversations will appear here." : "No conversations match your search."}
          </p>
        ) : (
          grouped.map(({ group, items }) => (
            <div key={group} className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A0AEC0] px-3 mb-1">{group}</p>
              {items.map((item) => {
                const active = item.id === activeId;
                return (
                  <div
                    key={item.id}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all group ${
                      active ? "bg-[#FFF0E6] text-[#E85D04]" : "text-[#4A5568] hover:bg-white hover:text-[#1A1A1A]"
                    }`}
                  >
                    <button onClick={() => onSelectChat(item.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <MessageSquare
                        className={`w-4 h-4 flex-shrink-0 ${active ? "text-[#E85D04]" : "text-[#A0AEC0] group-hover:text-[#4A5568]"}`}
                      />
                      <span className="text-sm font-medium truncate">{item.title}</span>
                    </button>
                    <button
                      onClick={() => onDeleteChat(item.id)}
                      className="p-1 rounded-md text-[#A0AEC0] hover:text-[#DC2626] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      aria-label={`Delete conversation ${item.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
