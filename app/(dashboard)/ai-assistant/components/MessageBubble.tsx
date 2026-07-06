"use client";

import React, { useState } from "react";
import { Copy, RefreshCw, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type MessageBlock =
  | { type: "text"; content: string }
  | { type: "insight"; content: string }
  | { type: "table"; rows: string[][] };

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text?: string;
  blocks?: MessageBlock[];
  time: string;
}

interface MessageBubbleProps {
  msg: ChatMessage;
  onRegenerate?: (id: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseInline(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, "<strong class='text-[#E85D04] font-semibold'>$1</strong>");
}

// ─── AI Icon ──────────────────────────────────────────────────────────────────
function AIAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-[#FFF0E6] border border-[#F4C9A4] flex items-center justify-center flex-shrink-0 mt-0.5">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#E85D04" strokeWidth="2" />
        <path d="M8 12 C8 9.5 16 9.5 16 12 C16 14.5 8 14.5 8 12Z" fill="#E85D04" opacity="0.5" />
        <circle cx="12" cy="12" r="2.5" fill="#E85D04" />
      </svg>
    </div>
  );
}

// ─── Block renderers ──────────────────────────────────────────────────────────
function TextBlock({ content }: { content: string }) {
  return (
    <p
      className="text-sm text-[#2D3748] leading-relaxed"
      dangerouslySetInnerHTML={{ __html: parseInline(content) }}
    />
  );
}

function InsightBlock({ content }: { content: string }) {
  return (
    <div className="bg-[#FFF7F0] border border-[#F4C9A4] rounded-xl px-4 py-3 text-sm text-[#C94E00] font-medium leading-relaxed">
      {content}
    </div>
  );
}

function TableBlock({ rows }: { rows: string[][] }) {
  const [header, ...body] = rows;
  return (
    <div className="rounded-xl border border-[#E8E8E4] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#FFF0E6]">
              {header.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-[#E85D04] uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {body.map((row, i) => (
              <tr
                key={i}
                className="border-t border-[#E8E8E4] hover:bg-[#FAFAF8] transition-colors"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-4 py-2.5 text-[#2D3748] whitespace-nowrap"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MessageBubble({ msg, onRegenerate }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  function handleCopy() {
    const text =
      msg.text ??
      msg.blocks
        ?.filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; content: string }).content)
        .join("\n") ??
      "";
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] lg:max-w-[60%]">
          <div className="bg-[#E85D04] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed shadow-[0_2px_12px_rgba(232,93,4,0.18)]">
            {msg.text}
          </div>
          <p className="text-[10px] text-[#A0AEC0] mt-1 text-right pr-1">
            {msg.time}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start group">
      <AIAvatar />
      <div className="flex-1 min-w-0 max-w-[85%] lg:max-w-[75%]">
        <div className="bg-white border border-[#E8E8E4] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm space-y-3">
          {msg.blocks?.map((block, i) => {
            if (block.type === "text")
              return <TextBlock key={i} content={block.content} />;
            if (block.type === "insight")
              return <InsightBlock key={i} content={block.content} />;
            if (block.type === "table")
              return <TableBlock key={i} rows={block.rows} />;
            return null;
          })}

          {/* Message actions — visible on hover */}
          <div className="flex gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[10px] font-medium text-[#A0AEC0] hover:text-[#4A5568] bg-[#FAFAF8] hover:bg-[#F0F0EC] rounded-lg px-2.5 py-1.5 transition-all"
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(msg.id)}
                className="flex items-center gap-1.5 text-[10px] font-medium text-[#A0AEC0] hover:text-[#4A5568] bg-[#FAFAF8] hover:bg-[#F0F0EC] rounded-lg px-2.5 py-1.5 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-[#A0AEC0] mt-1 pl-1">{msg.time}</p>
      </div>
    </div>
  );
}
