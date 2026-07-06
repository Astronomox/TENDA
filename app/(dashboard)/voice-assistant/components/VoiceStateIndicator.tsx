"use client";

import React from "react";

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface VoiceStateIndicatorProps {
  state: VoiceState;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const STATE_CONFIG: Record<
  VoiceState,
  { dot: string; label: string; textColor: string; bg: string; border: string }
> = {
  idle:       { dot: "bg-[#A0AEC0]",  label: "Ready",      textColor: "text-[#A0AEC0]", bg: "bg-[#FAFAF8]",  border: "border-[#E8E8E4]"  },
  listening:  { dot: "bg-[#E85D04]",  label: "Listening",  textColor: "text-[#E85D04]", bg: "bg-[#FFF0E6]",  border: "border-[#F4C9A4]"  },
  processing: { dot: "bg-amber-400",  label: "Thinking",   textColor: "text-amber-600", bg: "bg-amber-50",   border: "border-amber-100"   },
  speaking:   { dot: "bg-blue-400",   label: "Speaking",   textColor: "text-blue-600",  bg: "bg-blue-50",    border: "border-blue-100"    },
};

export default function VoiceStateIndicator({
  state,
  showLabel = true,
  size = "md",
}: VoiceStateIndicatorProps) {
  const c = STATE_CONFIG[state];
  const isAnimated = state === "listening" || state === "speaking";

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-semibold
        ${c.bg} ${c.border} ${c.textColor}
        ${size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"}
      `}
    >
      <span
        className={`
          rounded-full flex-shrink-0
          ${size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"}
          ${c.dot}
          ${isAnimated ? "animate-pulse" : ""}
        `}
      />
      {showLabel && c.label}
    </div>
  );
}
