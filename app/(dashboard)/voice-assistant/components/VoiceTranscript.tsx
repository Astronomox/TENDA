"use client";

import React, { useRef, useEffect } from "react";
import { Bot, User } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TranscriptEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
}

// ─── TranscriptMessage ────────────────────────────────────────────────────────
// Deliberately mirrors MessageBubble.tsx from the AI Chat page —
// same radius, border, spacing, colour logic — so the two pages
// feel like they share a design system.
function TranscriptMessage({ entry }: { entry: TranscriptEntry }) {
  const isUser = entry.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] lg:max-w-[60%]">
          <div className="bg-[#E85D04] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed shadow-[0_2px_12px_rgba(232,93,4,0.18)]">
            {entry.text}
          </div>
          <p className="text-[10px] text-[#A0AEC0] mt-1 text-right pr-1 flex items-center justify-end gap-1">
            <User className="w-2.5 h-2.5" />
            You · {entry.time}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      {/* AI avatar — same style as AI Chat page */}
      <div className="w-8 h-8 rounded-full bg-[#FFF0E6] border border-[#F4C9A4] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-4 h-4 text-[#E85D04]" />
      </div>
      <div className="flex-1 min-w-0 max-w-[85%] lg:max-w-[75%]">
        <div className="bg-white border border-[#E8E8E4] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <p className="text-sm text-[#2D3748] leading-relaxed">{entry.text}</p>
        </div>
        <p className="text-[10px] text-[#A0AEC0] mt-1 pl-1 flex items-center gap-1">
          <Bot className="w-2.5 h-2.5" />
          Tenda AI · {entry.time}
        </p>
      </div>
    </div>
  );
}

// ─── VoiceTranscript ──────────────────────────────────────────────────────────
interface VoiceTranscriptProps {
  entries: TranscriptEntry[];
  isListening: boolean; // show live "typing" row
}

function LiveRow() {
  return (
    <div className="flex gap-3 items-center">
      <div className="w-8 h-8 rounded-full bg-[#FFF0E6] border border-[#F4C9A4] flex items-center justify-center flex-shrink-0">
        <User className="w-4 h-4 text-[#E85D04]" />
      </div>
      <div className="bg-white border border-[#E8E8E4] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#E85D04]"
              style={{
                animation: "tendaBounce 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
                opacity: 0.4,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VoiceTranscript({
  entries,
  isListening,
}: VoiceTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries, isListening]);

  if (entries.length === 0 && !isListening) return null;

  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0] mb-3">
        Live transcript
      </h2>
      <div className="bg-white border border-[#E8E8E4] rounded-2xl p-4 space-y-4 max-h-72 overflow-y-auto">
        {entries.map((entry) => (
          <TranscriptMessage key={entry.id} entry={entry} />
        ))}
        {isListening && <LiveRow />}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
