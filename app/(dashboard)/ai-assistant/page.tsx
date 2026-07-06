"use client";

/**
 * app/ai-assistant/page.tsx
 *
 * ── Layout Integration Notes ─────────────────────────────────────────────────
 *
 * DashboardLayout (layout.tsx) provides:
 *   • Desktop: fixed left sidebar (w-64) + right flex-1 column with sticky h-20 topbar
 *   • Mobile: fixed top header (h-16) + fixed bottom nav (h-16) + scrollable main
 *   • <main> constrains width: max-w-[480px] mx-auto on mobile, max-w-6xl on desktop
 *   • Main has: pt-16 pb-24 (mobile) | pt-8 px-8 pb-12 (lg+)
 *
 * This page MUST:
 *   ✓ NOT recreate a full-screen shell (no h-screen, no fixed sidebars)
 *   ✓ NOT add its own header or footer
 *   ✓ Use -mt-8 -mx-8 -mb-12 on desktop to escape main padding and fill the column
 *   ✓ Use -mt-16 -mx-0 -mb-24 on mobile to escape main padding and fill viewport
 *   ✓ Render its own inner chat sidebar (NOT the nav sidebar — chat history only)
 *   ✓ Keep the chat column scrollable with a fixed input bar at the bottom
 *
 * Layout contract:
 *   Mobile  → full-width, sits between fixed header (top-16) and bottom nav (bottom-16)
 *   Desktop → fills the flex-1 column to the right of the 256px nav sidebar
 */

import React, { useState, useRef, useEffect } from "react";
import { Bot, Info, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import ChatSidebar, { ChatHistoryItem } from "./components/ChatSidebar";
import MessageBubble, { ChatMessage } from "./components/MessageBubble";
import TypingIndicator from "./components/TypingIndicator";
import PromptInput from "./components/PromptInput";
import SuggestionsBar from "./components/SuggestionsBar";
import EmptyState from "./components/EmptyState";

// ─── Seed data ────────────────────────────────────────────────────────────────
const HISTORY: ChatHistoryItem[] = [
  { id: 1, title: "Revenue drop analysis", date: "Today" },
  { id: 2, title: "Top customers June", date: "Today" },
  { id: 3, title: "Product repeat rates", date: "Yesterday" },
  { id: 4, title: "Churn risk customers", date: "Yesterday" },
  { id: 5, title: "Weekly sales summary", date: "Earlier" },
  { id: 6, title: "Category performance Q2", date: "Earlier" },
];

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    role: "user",
    text: "Who are my best customers this month?",
    time: "10:42 AM",
  },
  {
    id: 2,
    role: "assistant",
    time: "10:42 AM",
    blocks: [
      {
        type: "text",
        content: "Here are your **top 5 customers** by revenue this month (June 2026):",
      },
      {
        type: "table",
        rows: [
          ["Customer", "Purchases", "Revenue"],
          ["Amara Osei", "12", "₦84,500"],
          ["Fatima Diallo", "9", "₦61,200"],
          ["Kofi Mensah", "7", "₦47,800"],
          ["Ngozi Eze", "6", "₦39,100"],
          ["Emeka Balogun", "5", "₦32,400"],
        ],
      },
      {
        type: "text",
        content:
          "Amara Osei stands out — her purchase frequency is **40% above average**. Consider reaching out with a loyalty offer to keep her engaged.",
      },
      {
        type: "insight",
        content:
          "Combined, your top 5 customers represent 29% of total monthly revenue.",
      },
    ],
  },
];

// ─── AI stub response ─────────────────────────────────────────────────────────
function generateAIResponse(query: string): ChatMessage["blocks"] {
  return [
    {
      type: "text",
      content: `I'm analyzing your business data for: **"${query}"**`,
    },
    {
      type: "insight",
      content: "This insight is based on your last 30 days of transactions.",
    },
    {
      type: "text",
      content:
        "Your data shows strong signals. I'd recommend reviewing your top customer segments and repeat-purchase categories to prioritize outreach this week.",
    },
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [activeChat, setActiveChat] = useState(2);
  const [searchQ, setSearchQ] = useState("");
  // Desktop: chat-history sidebar open/closed (independent of nav sidebar)
  const [historyOpen, setHistoryOpen] = useState(true);
  // Mobile: drawer state for chat history
  const [drawerOpen, setDrawerOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function sendMessage(text?: string) {
    const q = (text ?? input).trim();
    if (!q) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      text: q,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);
    setDrawerOpen(false);

    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          blocks: generateAIResponse(q),
        },
      ]);
    }, 1800);
  }

  function handleNewChat() {
    setMessages([]);
    setActiveChat(-1);
    setDrawerOpen(false);
  }

  function handleRegenerate(id: number) {
    // Find the user message before this one and re-run
    const idx = messages.findIndex((m) => m.id === id);
    if (idx < 1) return;
    const userMsg = messages[idx - 1];
    if (userMsg.role !== "user") return;
    setMessages((prev) => prev.slice(0, idx));
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          blocks: generateAIResponse(userMsg.text ?? ""),
        },
      ]);
    }, 1800);
  }

  return (
    /**
     * Negative-margin escape hatch:
     *   • On mobile  (below lg): DashboardLayout main has pt-16 pb-24.
     *     We undo that so our chat fills from just below the fixed header
     *     to just above the fixed bottom nav.
     *   • On desktop (lg+):      main has pt-8 px-8 pb-12.
     *     We undo those so our chat fills the entire flex-1 column.
     *
     * Then we use `h-[calc(...)]` to get the correct explicit height so
     * inner flex children can stretch to fill it without overflow.
     */
    <div
      className="
        /* ── Mobile escape (below lg) ── */
        -mt-16 -mb-24
        h-[calc(100dvh-64px-64px)]

        /* ── Desktop escape (lg+) ── */
        lg:-mt-8 lg:-mb-12 lg:-mx-8
        lg:h-[calc(100dvh-80px)]

        flex overflow-hidden bg-[#FAFAF8]
      "
    >
      {/* ══ CHAT HISTORY SIDEBAR — desktop ═══════════════════════════════════
          This is a *secondary* sidebar for chat history only.
          It is NOT the app nav sidebar (that lives in layout.tsx).
          Visible at lg+, togglable via historyOpen flag.
      ════════════════════════════════════════════════════════════════════════ */}
      <aside
        className={`
          hidden lg:flex flex-col
          border-r border-[#E8E8E4] bg-white
          transition-all duration-200 overflow-hidden
          ${historyOpen ? "w-64 min-w-[256px]" : "w-0 min-w-0"}
        `}
      >
        {historyOpen && (
          <ChatSidebar
            history={HISTORY}
            activeId={activeChat}
            searchQuery={searchQ}
            onSearchChange={setSearchQ}
            onSelectChat={(id) => { setActiveChat(id); setMessages(SEED_MESSAGES); }}
            onNewChat={handleNewChat}
          />
        )}
      </aside>

      {/* ══ CHAT MAIN COLUMN ═════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Chat topbar ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 lg:px-6 h-14 border-b border-[#E8E8E4] bg-white">
          {/* Mobile: open drawer */}
          <button
            className="lg:hidden p-1.5 -ml-1 text-[#A0AEC0] hover:text-[#4A5568] transition-colors"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open chat history"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>

          {/* Desktop: toggle history sidebar */}
          <button
            className="hidden lg:flex p-1.5 -ml-1 text-[#A0AEC0] hover:text-[#4A5568] transition-colors"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-label={historyOpen ? "Collapse chat history" : "Expand chat history"}
          >
            {historyOpen ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeftOpen className="w-5 h-5" />
            )}
          </button>

          {/* AI identity */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#FFF0E6] border border-[#F4C9A4] flex items-center justify-center">
                <Bot className="w-4 h-4 text-[#E85D04]" />
              </div>
              {/* Online dot */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1A1A1A] leading-tight truncate">
                Tenda AI Assistant
              </p>
              <p className="text-[10px] text-[#E85D04] font-medium">
                Customer intelligence · Active
              </p>
            </div>
          </div>

          {/* Context badge — desktop only */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#FFF7F0] border border-[#F4C9A4] rounded-full px-3 py-1.5 text-xs text-[#C94E00] font-medium flex-shrink-0">
            <Info className="w-3.5 h-3.5" />
            Analyzing <span className="font-bold ml-0.5">1,284 customers</span>
            <span className="text-[#F4C9A4]">·</span>
            Last 30 days
          </div>
        </div>

        {/* ── Messages area ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {hasMessages ? (
            <div className="px-4 lg:px-6 py-6 space-y-5 max-w-3xl mx-auto w-full">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onRegenerate={msg.role === "assistant" ? handleRegenerate : undefined}
                />
              ))}
              {typing && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          ) : (
            <EmptyState onPromptClick={sendMessage} />
          )}
        </div>

        {/* ── Suggestions + Input (fixed to bottom of column) ─────────────── */}
        <div className="flex-shrink-0">
          {hasMessages && <SuggestionsBar onSelect={sendMessage} />}
          <PromptInput
            value={input}
            onChange={setInput}
            onSend={sendMessage}
            disabled={typing}
          />
        </div>
      </div>

      {/* ══ MOBILE DRAWER — chat history ══════════════════════════════════════
          Sits inside the page, positioned relative to this container.
          Uses inset-0 so it covers only the chat area, not the app nav.
          z-10 keeps it above chat content but below the app's z-40/50 layers.
      ════════════════════════════════════════════════════════════════════════ */}
      {drawerOpen && (
        <div className="lg:hidden absolute inset-0 z-10 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E4]">
              <p className="text-sm font-bold text-[#1A1A1A]">Conversations</p>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 text-[#A0AEC0] hover:text-[#4A5568] transition-colors"
              >
                <PanelLeftClose className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatSidebar
                history={HISTORY}
                activeId={activeChat}
                searchQuery={searchQ}
                onSearchChange={setSearchQ}
                onSelectChat={(id) => {
                  setActiveChat(id);
                  setMessages(SEED_MESSAGES);
                  setDrawerOpen(false);
                }}
                onNewChat={handleNewChat}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
