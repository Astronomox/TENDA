"use client";

import React from "react";
import { VoiceState } from "./VoiceStateIndicator";

interface VoiceWaveformProps {
  state: VoiceState;
}

const BAR_COUNT = 24;

const STATE_COLOR: Record<VoiceState, string> = {
  idle:       "#E8E8E4",
  listening:  "#E85D04",
  processing: "#FCD34D",
  speaking:   "#60A5FA",
};

/**
 * Pure CSS waveform — 24 bars with staggered animation delays.
 * Heights are pseudo-randomised using a fixed seed so the
 * animation feels organic without needing JS audio data.
 */
const HEIGHTS = [
  30, 55, 70, 45, 85, 60, 40, 75, 50, 90, 35, 65,
  80, 45, 70, 55, 40, 85, 60, 50, 75, 35, 65, 45,
];

export default function VoiceWaveform({ state }: VoiceWaveformProps) {
  const active = state === "listening" || state === "speaking";
  const color = STATE_COLOR[state];

  return (
    <>
      <style>{`
        @keyframes waveBar {
          0%, 100% { transform: scaleY(0.2); }
          50%       { transform: scaleY(1);   }
        }
      `}</style>

      <div
        className="flex items-center justify-center gap-0.5"
        style={{ height: 40, width: "100%", maxWidth: 240 }}
        aria-hidden="true"
      >
        {HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="rounded-full flex-1 transition-colors duration-500"
            style={{
              height: h * 0.4,
              background: color,
              transformOrigin: "center",
              transform: active ? "scaleY(1)" : "scaleY(0.15)",
              animation: active
                ? `waveBar ${0.8 + (i % 5) * 0.12}s ease-in-out infinite`
                : "none",
              animationDelay: active ? `${(i * 0.04).toFixed(2)}s` : "0s",
              transition: "transform 0.4s ease, background 0.5s ease",
            }}
          />
        ))}
      </div>
    </>
  );
}
