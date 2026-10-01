"use client";

import React from "react";
import { Mic, MicOff, Square, Volume2, VolumeX } from "lucide-react";
import VoiceOrb from "./VoiceOrb";
import VoiceWaveform from "./VoiceWaveform";
import VoiceStateIndicator, { VoiceState } from "./VoiceStateIndicator";

interface VoiceHeroProps {
  state: VoiceState;
  onStart: () => void;
  onStop: () => void;
  onMute: () => void;
  isMuted: boolean;
  isActive: boolean; // recording in progress
  /** Seconds recorded so far. */
  elapsed: number;
  maxSeconds: number;
  /** Read answers aloud. */
  speakerOn: boolean;
  onToggleSpeaker: () => void;
  busy?: boolean;
}

function formatTimer(seconds: number) {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const STATE_LABEL: Record<VoiceState, string> = {
  idle:       "Tap the orb and ask about your business",
  listening:  "Listening… tap again when you're done",
  processing: "Thinking…",
  speaking:   "Tenda is responding…",
};

export default function VoiceHero({
  state,
  onStart,
  onStop,
  onMute,
  isMuted,
  isActive,
  elapsed,
  maxSeconds,
  speakerOn,
  onToggleSpeaker,
  busy,
}: VoiceHeroProps) {
  const timer = `${formatTimer(elapsed)} / ${formatTimer(maxSeconds)}`;

  return (
    // No padding override — sits naturally inside layout.tsx <main>
    <div className="flex flex-col items-center text-center pt-4 pb-6 lg:pt-8 lg:pb-10">
      {/* Page title row */}
      <div className="flex items-center gap-3 mb-1">
        <h1 className="font-display font-extrabold text-xl lg:text-2xl text-[#1A1A1A] tracking-tight">
          Voice Assistant
        </h1>
        <VoiceStateIndicator state={state} size="sm" />
      </div>
      <p className="text-sm text-[#718096] mb-8">
        {STATE_LABEL[state]}
      </p>

      {/* Orb — tappable when idle */}
      <button
        onClick={isActive ? onStop : onStart}
        disabled={busy}
        aria-label={isActive ? "Stop and send" : "Start speaking"}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D04] focus-visible:ring-offset-4 rounded-full"
      >
        <VoiceOrb state={state} size={168} />
      </button>

      {/* Waveform */}
      <div className="mt-6 w-full max-w-[240px]">
        <VoiceWaveform state={state} />
      </div>

      {/* Timer */}
      {isActive && (
        <p className="mt-3 text-sm font-semibold tabular-nums text-[#4A5568]">
          {timer}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mt-6">
        {isActive ? (
          <>
            {/* Mute */}
            <button
              onClick={onMute}
              aria-label={isMuted ? "Resume recording" : "Pause recording"}
              className={`
                w-12 h-12 rounded-2xl border flex items-center justify-center transition-all
                ${isMuted
                  ? "bg-[#FFF0E6] border-[#F4C9A4] text-[#E85D04]"
                  : "bg-white border-[#E8E8E4] text-[#A0AEC0] hover:border-[#E85D04] hover:text-[#E85D04]"
                }
              `}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Stop — primary danger */}
            <button
              onClick={onStop}
              aria-label="End session"
              className="
                h-12 px-6 rounded-2xl bg-[#1A1A1A] hover:bg-[#2D3748]
                text-white text-sm font-semibold
                flex items-center gap-2 transition-colors
                shadow-[0_4px_16px_rgba(0,0,0,0.12)]
              "
            >
              <Square className="w-4 h-4 fill-white" />
              Stop &amp; send
            </button>

            {/* Speaker — read answers aloud */}
            <button
              onClick={onToggleSpeaker}
              aria-label={speakerOn ? "Stop reading answers aloud" : "Read answers aloud"}
              aria-pressed={speakerOn}
              className={`
                w-12 h-12 rounded-2xl border flex items-center justify-center transition-all
                ${speakerOn
                  ? "bg-[#FFF0E6] border-[#F4C9A4] text-[#E85D04]"
                  : "bg-white border-[#E8E8E4] text-[#A0AEC0] hover:border-[#E85D04] hover:text-[#E85D04]"
                }
              `}
            >
              {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </>
        ) : (
          /* Start CTA */
          <div className="flex items-center gap-3">
          <button
            onClick={onStart}
            disabled={busy}
            className="
              h-12 px-8 rounded-2xl
              bg-[#E85D04] hover:bg-[#FF8C42] active:bg-[#C94E00]
              text-white text-sm font-semibold
              flex items-center gap-2 transition-colors
              shadow-[0_4px_20px_rgba(232,93,4,0.25)]
            "
          >
            <Mic className="w-4 h-4" />
            Ask by voice
          </button>
          <button
            onClick={onToggleSpeaker}
            aria-label={speakerOn ? "Stop reading answers aloud" : "Read answers aloud"}
            aria-pressed={speakerOn}
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${
              speakerOn ? "bg-[#FFF0E6] border-[#F4C9A4] text-[#E85D04]" : "bg-white border-[#E8E8E4] text-[#A0AEC0]"
            }`}
          >
            {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          </div>
        )}
      </div>
    </div>
  );
}
