"use client";

/**
 * AI Chat — POST /ai/chat, with conversation history from /ai/conversations
 * (BACKEND_README.md §15). If the backend doesn't persist conversations yet,
 * the chat still works for the current visit by sending `history` itself.
 *
 * Layout: escapes the dashboard <main> padding to fill the column (see layout.tsx).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Info, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import ChatSidebar, { ChatHistoryItem } from "./components/ChatSidebar";
import MessageBubble, { ChatMessage } from "./components/MessageBubble";
import TypingIndicator from "./components/TypingIndicator";
import PromptInput from "./components/PromptInput";
import SuggestionsBar from "./components/SuggestionsBar";
import EmptyState from "./components/EmptyState";
import { ai, analytics, ApiError } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { naira, number, time } from "@/lib/format";
import type { ChatTurn } from "@/lib/types";
import { useConfirm } from "@/components/ConfirmDialog";

const MAX_HISTORY_TURNS = 20;

let localSeq = 0;
const localId = () => `m${Date.now()}-${++localSeq}`;
const nowTime = () => time(new Date().toISOString());

function toTurns(messages: ChatMessage[]): ChatTurn[] {
  return messages
    .filter((m) => !m.error)
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ role: m.role === "user" ? "user" : "model", content: m.content }));
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [historyOpen, setHistoryOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const confirm = useConfirm();

  const conversations = useResource("ai:conversations", () => ai.conversations({ limit: 50 }));
  const context = useResource("analytics:summary", () => analytics.summary());

  // Which conversation the in-flight request belongs to, so a late answer
  // doesn't land in a chat the user has switched away from.
  const sessionRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll only the message list. scrollIntoView() would also scroll clipped
  // ancestors sideways when an answer contains a wide table.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const history: ChatHistoryItem[] =
    conversations.data?.items.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updated_at })) ?? [];

  const sidebarStatus = conversations.notImplemented
    ? "Saved conversations aren't available yet. This chat lasts until you leave the page."
    : conversations.error && !conversations.data
      ? conversations.error.message
      : conversations.loading && !conversations.data
        ? "Loading…"
        : sidebarError;

  const ask = useCallback(
    async (question: string, prior: ChatMessage[], regenerateServerId?: string) => {
      const session = sessionRef.current;
      setTyping(true);
      try {
        const res = await ai.chat({
          question,
          history: activeId ? [] : toTurns(prior),
          conversation_id: activeId,
          regenerate_message_id: regenerateServerId ?? null,
        });
        if (session !== sessionRef.current) return;
        setMessages((prev) => [
          ...prev,
          { id: localId(), serverId: res.message_id, role: "assistant", content: res.answer, time: nowTime() },
        ]);
        if (res.conversation_id) {
          const isNew = !activeId;
          setActiveId(res.conversation_id);
          if (isNew) {
            conversations.setData((prev) => {
              const item = {
                id: res.conversation_id!,
                title: question.slice(0, 60),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                message_count: 2,
              };
              return prev
                ? { ...prev, items: [item, ...prev.items.filter((c) => c.id !== item.id)], total: prev.total + 1 }
                : { items: [item], total: 1, limit: 50, offset: 0 };
            });
          }
        }
      } catch (err) {
        if (session !== sessionRef.current) return;
        const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
        setMessages((prev) => [...prev, { id: localId(), role: "assistant", content: message, time: nowTime(), error: true }]);
      } finally {
        if (session === sessionRef.current) setTyping(false);
      }
    },
    [activeId, conversations]
  );

  function sendMessage(text?: string) {
    // Only take `text` when it really is text (a click handler would pass its event).
    const q = (typeof text === "string" ? text : input).trim();
    if (!q || typing) return;
    if (q.length > 2000) {
      setMessages((prev) => [
        ...prev,
        { id: localId(), role: "assistant", content: "That question is too long. Please keep it under 2,000 characters.", time: nowTime(), error: true },
      ]);
      return;
    }
    setInput("");
    setDrawerOpen(false);
    const userMsg: ChatMessage = { id: localId(), role: "user", content: q, time: nowTime() };
    const prior = messages;
    setMessages((prev) => [...prev, userMsg]);
    void ask(q, prior);
  }

  function handleRegenerate(id: string) {
    if (typing) return;
    const idx = messages.findIndex((m) => m.id === id);
    if (idx < 1) return;
    const userMsg = messages[idx - 1];
    if (userMsg.role !== "user") return;
    const target = messages[idx];
    const prior = messages.slice(0, idx - 1);
    setMessages(messages.slice(0, idx));
    void ask(userMsg.content, prior, target.error ? undefined : target.serverId);
  }

  function handleNewChat() {
    sessionRef.current++;
    setMessages([]);
    setActiveId(null);
    setTyping(false);
    setDrawerOpen(false);
  }

  async function handleSelectChat(id: string) {
    if (id === activeId) {
      setDrawerOpen(false);
      return;
    }
    const session = ++sessionRef.current;
    setActiveId(id);
    setMessages([]);
    setTyping(false);
    setDrawerOpen(false);
    setLoadingChat(true);
    setSidebarError(null);
    try {
      const convo = await ai.conversation(id);
      if (session !== sessionRef.current) return;
      setMessages(
        convo.messages.map((m) => ({
          id: localId(),
          serverId: m.id,
          role: m.role,
          content: m.content,
          time: time(m.created_at),
        }))
      );
    } catch (err) {
      if (session !== sessionRef.current) return;
      setSidebarError(err instanceof Error ? err.message : "Couldn't open that conversation.");
      setActiveId(null);
    } finally {
      if (session === sessionRef.current) setLoadingChat(false);
    }
  }

  async function handleDeleteChat(id: string) {
    if (!(await confirm({ title: "Delete this conversation?", message: "Its messages will be removed for good.", confirmLabel: "Delete" }))) return;
    const prev = conversations.data;
    conversations.setData((p) => (p ? { ...p, items: p.items.filter((c) => c.id !== id), total: p.total - 1 } : p!));
    if (id === activeId) handleNewChat();
    try {
      await ai.removeConversation(id);
    } catch (err) {
      if (prev) conversations.setData(prev);
      setSidebarError(err instanceof Error ? err.message : "Couldn't delete that conversation.");
    }
  }

  const sidebarProps = {
    history,
    activeId,
    searchQuery: searchQ,
    onSearchChange: setSearchQ,
    onSelectChat: (id: string) => void handleSelectChat(id),
    onDeleteChat: (id: string) => void handleDeleteChat(id),
    onNewChat: handleNewChat,
    status: sidebarStatus,
  };

  const hasMessages = messages.length > 0 || loadingChat;
  const ctx = context.data;

  return (
    <div
      className="
        -mb-24
        h-[calc(100dvh-64px-64px-env(safe-area-inset-bottom))]
        lg:-mt-8 lg:-mb-12 lg:-mx-8
        lg:h-[calc(100dvh-80px)]
        flex overflow-hidden bg-[#FAFAF8] relative
      "
    >
      {/* Chat history sidebar — desktop */}
      <aside
        className={`hidden lg:flex flex-col border-r border-[#E8E8E4] bg-white transition-all duration-200 overflow-hidden ${
          historyOpen ? "w-64 min-w-[256px]" : "w-0 min-w-0"
        }`}
      >
        {historyOpen && <ChatSidebar {...sidebarProps} />}
      </aside>

      {/* Chat main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-shrink-0 flex items-center gap-3 px-4 lg:px-6 h-14 border-b border-[#E8E8E4] bg-white">
          <button
            className="lg:hidden p-1.5 -ml-1 text-[#A0AEC0] hover:text-[#4A5568] transition-colors"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open chat history"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
          <button
            className="hidden lg:flex p-1.5 -ml-1 text-[#A0AEC0] hover:text-[#4A5568] transition-colors"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-label={historyOpen ? "Collapse chat history" : "Expand chat history"}
          >
            {historyOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#FFF0E6] border border-[#F4C9A4] flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-[#E85D04]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1A1A1A] leading-tight truncate">Tenda AI Assistant</p>
              <p className="text-[10px] text-[#E85D04] font-medium">Customer intelligence</p>
            </div>
          </div>

          {ctx && (
            <div className="hidden lg:flex items-center gap-1.5 bg-[#FFF7F0] border border-[#F4C9A4] rounded-full px-3 py-1.5 text-xs text-[#C94E00] font-medium flex-shrink-0">
              <Info className="w-3.5 h-3.5" />
              Using <span className="font-bold">{number(ctx.total_transactions)} sales</span>
              <span className="text-[#F4C9A4]">·</span>
              {naira(ctx.total_revenue, { compact: true })} revenue
            </div>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          {hasMessages ? (
            <div className="px-4 lg:px-6 py-6 space-y-5 max-w-3xl mx-auto w-full">
              {loadingChat && <TypingIndicator />}
              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onRegenerate={
                    msg.role === "assistant" && i === messages.length - 1 && !typing ? handleRegenerate : undefined
                  }
                />
              ))}
              {typing && <TypingIndicator />}
            </div>
          ) : (
            <EmptyState onPromptClick={sendMessage} />
          )}
        </div>

        <div className="flex-shrink-0">
          {messages.length > 0 && <SuggestionsBar onSelect={sendMessage} />}
          <PromptInput value={input} onChange={setInput} onSend={sendMessage} disabled={typing || loadingChat} />
        </div>
      </div>

      {/* Mobile drawer — chat history */}
      {drawerOpen && (
        <div className="lg:hidden absolute inset-0 z-10 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E4]">
              <p className="text-sm font-bold text-[#1A1A1A]">Conversations</p>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 text-[#A0AEC0] hover:text-[#4A5568] transition-colors" aria-label="Close">
                <PanelLeftClose className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatSidebar {...sidebarProps} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
