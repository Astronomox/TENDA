"use client";

import React from "react";

function AIAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-[#FFF0E6] border border-[#F4C9A4] flex items-center justify-center flex-shrink-0">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#E85D04" strokeWidth="2" />
        <circle cx="12" cy="12" r="2.5" fill="#E85D04" />
      </svg>
    </div>
  );
}

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 items-center">
      <AIAvatar />
      <div className="bg-white border border-[#E8E8E4] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 h-5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-[#E85D04] opacity-40"
              style={{
                animation: "tendaBounce 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        {/* Keyframes injected once via a global style tag */}
        <style>{`
          @keyframes tendaBounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30% { transform: translateY(-5px); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
