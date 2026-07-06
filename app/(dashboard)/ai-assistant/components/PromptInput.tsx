"use client";

import React, { useRef, useEffect } from "react";
import { SendHorizonal } from "lucide-react";

interface PromptInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export default function PromptInput({
  value,
  onChange,
  onSend,
  disabled,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSend();
    }
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="px-4 pt-3 pb-4 bg-white border-t border-[#E8E8E4]">
      <div
        className={`
          flex items-end gap-3 bg-[#FAFAF8] border rounded-2xl px-4 py-3
          transition-colors
          ${canSend ? "border-[#E85D04] shadow-[0_0_0_3px_rgba(232,93,4,0.08)]" : "border-[#E8E8E4]"}
        `}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Ask about your customers, sales trends, churn risks…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="
            flex-1 bg-transparent resize-none outline-none
            text-sm text-[#1A1A1A] placeholder:text-[#A0AEC0]
            leading-relaxed min-h-[22px] max-h-[140px]
            font-sans
          "
        />
        <button
          disabled={!canSend}
          onClick={onSend}
          className={`
            w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center
            transition-all
            ${
              canSend
                ? "bg-[#E85D04] hover:bg-[#FF8C42] active:bg-[#C94E00] text-white shadow-[0_4px_16px_rgba(232,93,4,0.25)]"
                : "bg-[#E8E8E4] text-[#A0AEC0] cursor-not-allowed"
            }
          `}
          aria-label="Send message"
        >
          <SendHorizonal className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] text-[#C0C0B8] text-center mt-2">
        Tenda AI uses your live transaction data · Not financial advice
      </p>
    </div>
  );
}
