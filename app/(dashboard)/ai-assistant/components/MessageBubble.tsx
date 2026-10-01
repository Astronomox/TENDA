"use client";

import React, { useState } from "react";
import { Copy, RefreshCw, Check, AlertTriangle } from "lucide-react";
import RichText, { toPlainText } from "@/components/RichText";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  /** Local id (stable for React keys). */
  id: string;
  /** Backend message id, when known. */
  serverId?: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  error?: boolean;
}

interface MessageBubbleProps {
  msg: ChatMessage;
  onRegenerate?: (id: string) => void;
}

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

export default function MessageBubble({ msg, onRegenerate }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(toPlainText(msg.content)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] lg:max-w-[60%]">
          <div className="bg-[#E85D04] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed shadow-[0_2px_12px_rgba(232,93,4,0.18)] whitespace-pre-wrap break-words">
            {msg.content}
          </div>
          <p className="text-[10px] text-[#A0AEC0] mt-1 text-right pr-1">{msg.time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start group">
      <AIAvatar />
      <div className="flex-1 min-w-0 max-w-[85%] lg:max-w-[75%]">
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm space-y-3 ${
            msg.error ? "bg-red-50 border border-red-200" : "bg-white border border-[#E8E8E4]"
          }`}
        >
          {msg.error ? (
            <p className="text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {msg.content}
            </p>
          ) : (
            <RichText text={msg.content} />
          )}

          <div className="flex gap-2 pt-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            {!msg.error && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-[10px] font-medium text-[#A0AEC0] hover:text-[#4A5568] bg-[#FAFAF8] hover:bg-[#F0F0EC] rounded-lg px-2.5 py-1.5 transition-all"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(msg.id)}
                className="flex items-center gap-1.5 text-[10px] font-medium text-[#A0AEC0] hover:text-[#4A5568] bg-[#FAFAF8] hover:bg-[#F0F0EC] rounded-lg px-2.5 py-1.5 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                {msg.error ? "Try again" : "Regenerate"}
              </button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-[#A0AEC0] mt-1 pl-1">{msg.time}</p>
      </div>
    </div>
  );
}
