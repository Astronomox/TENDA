"use client";

import React from "react";
import { VoiceState } from "./VoiceStateIndicator";

interface VoiceOrbProps {
  state: VoiceState;
  size?: number; // px, default 160
}

/**
 * Pure CSS animated orb.
 * No canvas, no Web Audio API, no external animation library.
 *
 * States:
 *   idle       → slow breathing scale (3s ease-in-out loop)
 *   listening  → orange pulse ring expanding outward
 *   processing → rotating gradient arc
 *   speaking   → soft ripple rings, blue tint
 *
 * All animations are subtle and elegant — matching the existing
 * product motion language (no flashy neon, no aggressive scaling).
 */
export default function VoiceOrb({ state, size = 160 }: VoiceOrbProps) {
  const half = size / 2;

  const orbColors: Record<VoiceState, { core: string; glow: string; ring: string }> = {
    idle:       { core: "from-[#FFF0E6] to-[#F4C9A4]",  glow: "rgba(232,93,4,0.08)",  ring: "#F4C9A4" },
    listening:  { core: "from-[#FFF0E6] to-[#E85D04]",  glow: "rgba(232,93,4,0.18)",  ring: "#E85D04" },
    processing: { core: "from-amber-100 to-amber-300",   glow: "rgba(251,191,36,0.15)", ring: "#FCD34D" },
    speaking:   { core: "from-blue-50 to-blue-300",      glow: "rgba(96,165,250,0.15)", ring: "#93C5FD" },
  };

  const c = orbColors[state];

  return (
    <>
      <style>{`
        /* Breathing — idle */
        @keyframes orbBreathe {
          0%, 100% { transform: scale(1);    opacity: 1;    }
          50%       { transform: scale(1.04); opacity: 0.92; }
        }
        /* Listening pulse ring */
        @keyframes orbPulse {
          0%   { transform: scale(1);    opacity: 0.6; }
          100% { transform: scale(1.55); opacity: 0;   }
        }
        /* Processing spin */
        @keyframes orbSpin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
        /* Speaking ripple */
        @keyframes orbRipple {
          0%   { transform: scale(1);    opacity: 0.5; }
          100% { transform: scale(1.45); opacity: 0;   }
        }
        /* Inner icon gentle pulse */
        @keyframes iconPulse {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1;   }
        }
      `}</style>

      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Glow shadow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `0 0 ${size * 0.4}px ${size * 0.15}px ${c.glow}`,
            borderRadius: "50%",
            transition: "box-shadow 0.6s ease",
          }}
        />

        {/* Pulse / ripple rings */}
        {(state === "listening" || state === "speaking") && (
          <>
            <div
              className="absolute inset-0 rounded-full border-2"
              style={{
                borderColor: c.ring,
                opacity: 0,
                animation: `${state === "listening" ? "orbPulse" : "orbRipple"} 1.8s ease-out infinite`,
              }}
            />
            <div
              className="absolute inset-0 rounded-full border-2"
              style={{
                borderColor: c.ring,
                opacity: 0,
                animation: `${state === "listening" ? "orbPulse" : "orbRipple"} 1.8s ease-out infinite 0.6s`,
              }}
            />
          </>
        )}

        {/* Processing spin arc */}
        {state === "processing" && (
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent"
            style={{
              borderTopColor: "#FCD34D",
              borderRightColor: "#FCD34D",
              animation: "orbSpin 1.2s linear infinite",
            }}
          />
        )}

        {/* Core orb */}
        <div
          className={`
            relative rounded-full bg-gradient-to-br ${c.core}
            border-2 flex items-center justify-center
            transition-all duration-700
          `}
          style={{
            width: size * 0.7,
            height: size * 0.7,
            borderColor: c.ring,
            animation: state === "idle" ? "orbBreathe 3s ease-in-out infinite" : "none",
          }}
        >
          {/* Inner icon — microphone svg */}
          <svg
            width={size * 0.22}
            height={size * 0.22}
            viewBox="0 0 24 24"
            fill="none"
            stroke={state === "idle" ? "#E85D04" : state === "processing" ? "#92400E" : state === "speaking" ? "#1D4ED8" : "#fff"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: "iconPulse 2s ease-in-out infinite" }}
          >
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
          </svg>
        </div>
      </div>
    </>
  );
}
