"use client";

import React, { useRef } from "react";
import { motion, useMotionTemplate, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";

/**
 * A living Lagos sky driven by a 0→1 "time of day" progress value:
 * sky colours shift dawn → noon → golden hour → dusk, the sun travels an arc and sets behind
 * the skyline, clouds drift and blush, windows light up, the moon and stars come out.
 * Purely decorative (aria-hidden) — the story cards carry the content.
 */

export const DAY_START = 6.25; // 6:15am
export const DAY_END = 19.75; // 7:45pm
const SUNRISE = 6.6;
const SUNSET = 18.85;
export const hourAt = (p: number) => DAY_START + p * (DAY_END - DAY_START);
export const pAt = (h: number) => (h - DAY_START) / (DAY_END - DAY_START);

export function formatClock(h: number) {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const ampm = hh >= 12 ? "pm" : "am";
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

/* p keyframes for colour ramps */
const P = [0, 0.1, 0.32, 0.6, 0.8, 0.9, 1];
const SKY_TOP = ["#6E5E93", "#F7B48E", "#FFDDB0", "#FFD38C", "#FF9A55", "#7B3A6B", "#1C1A3A"];
const SKY_MID = ["#E9A08C", "#FFD3AE", "#FFF0D2", "#FFEBC0", "#FFB574", "#E0606A", "#3D2A55"];
const SKY_LOW = ["#FFC9A0", "#FFEAD2", "#FFF8EA", "#FFF4DD", "#FFD29E", "#FF8C42", "#7A3E52"];
const FAR = ["#D9B9A8", "#EBCDB5", "#F0D9C2", "#EED3B4", "#E8B48C", "#8E4B5A", "#2A2244"];
const NEAR = ["#B98F7A", "#D2A98C", "#DDB89A", "#D9AF8B", "#C98A63", "#5B2F45", "#15122A"];
const WATER = ["#E7B8A4", "#F6D9C2", "#FBE9D6", "#F8E2C2", "#F4B98C", "#B5536A", "#2B2547"];
const CLOUD = ["#FBD8C9", "#FFFFFF", "#FFFFFF", "#FFFBF2", "#FFE1C6", "#F6A3A0", "#4B4068"];

const STARS = [
  [8, 14, 1.6], [16, 32, 1.2], [23, 9, 1], [31, 24, 1.4], [42, 12, 1], [49, 30, 1.2], [57, 7, 1.5],
  [64, 21, 1], [71, 11, 1.3], [78, 28, 1], [86, 9, 1.6], [92, 22, 1.1], [36, 38, 0.9], [68, 36, 0.9],
] as const;

/* ── skyline (viewBox 1200×140, base at y=112, lagoon below) ── */
const FAR_BLDGS: [number, number, number][] = [
  [0, 46, 64], [44, 30, 78], [70, 52, 58], [260, 40, 70], [296, 28, 84], [330, 60, 62], [450, 34, 74], [490, 48, 60],
  [560, 30, 88], [700, 44, 66], [742, 26, 80], [770, 58, 64], [940, 40, 72], [978, 32, 90], [1015, 56, 60], [1120, 44, 76], [1160, 40, 62],
];
const NEAR_BLDGS: [number, number, number][] = [
  [380, 44, 44], [420, 26, 58], [600, 34, 62], [632, 22, 96], [656, 40, 70], [800, 52, 40], [1050, 30, 66], [1078, 44, 48],
];
const WINDOWS: [number, number][] = [];
for (const [x, w, h] of NEAR_BLDGS)
  for (let yy = 112 - h + 8; yy < 106; yy += 9)
    for (let xx = x + 5; xx < x + w - 4; xx += 8) if ((xx * 7 + yy * 3) % 5 !== 0) WINDOWS.push([xx, yy]);

function Skyline({ far, near, water, lit }: { far: MotionValue<string>; near: MotionValue<string>; water: MotionValue<string>; lit: MotionValue<number> }) {
  return (
    <svg viewBox="0 0 1200 140" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[52%] w-full">
      {/* far layer */}
      <motion.g style={{ fill: far }}>
        {FAR_BLDGS.map(([x, w, h], i) => (
          <rect key={i} x={x} y={112 - h} width={w} height={h} />
        ))}
        <rect x="0" y="100" width="1200" height="12" />
      </motion.g>
      {/* near layer: markets, Lekki-style cable-stayed pylon, towers, mosque dome, palms */}
      <motion.g style={{ fill: near, stroke: near }}>
        {/* market sheds */}
        <path d="M0 112 V96 L22 84 L44 96 V112 Z M40 112 V98 L62 86 L84 98 V112 Z M84 112 V100 L104 90 L124 100 V112 Z" strokeWidth="0" />
        {/* bridge deck + pylon + cables */}
        <rect x="120" y="103" width="250" height="4" strokeWidth="0" />
        <path d="M236 103 L242 22 L248 103 Z" strokeWidth="0" />
        <g fill="none" strokeWidth="1.1">
          {[130, 150, 170, 190, 210, 225, 262, 280, 300, 320, 340, 360].map((x) => (
            <line key={x} x1="242" y1={x < 242 ? 30 : 32} x2={x} y2="103" />
          ))}
        </g>
        {NEAR_BLDGS.map(([x, w, h], i) => (
          <rect key={i} x={x} y={112 - h} width={w} height={h} strokeWidth="0" />
        ))}
        {/* tall tower antenna */}
        <rect x="642" y="4" width="2" height="14" strokeWidth="0" />
        {/* mosque: dome + minarets */}
        <path d="M880 112 V92 Q 880 66 906 62 Q 932 66 932 92 V112 Z" strokeWidth="0" />
        <rect x="904" y="54" width="4" height="9" strokeWidth="0" />
        <rect x="866" y="58" width="7" height="54" strokeWidth="0" />
        <path d="M865 58 L869.5 46 L874 58 Z" strokeWidth="0" />
        <rect x="939" y="58" width="7" height="54" strokeWidth="0" />
        <path d="M938 58 L942.5 46 L947 58 Z" strokeWidth="0" />
        {/* palms */}
        {[[540, 112], [1150, 112], [720, 112]].map(([x, y], i) => (
          <g key={i} fill="none" strokeWidth="3" strokeLinecap="round">
            <path d={`M${x} ${y} Q ${x + 4} ${y - 22} ${x - 2} ${y - 42}`} />
            <path d={`M${x - 2} ${y - 42} q -16 -2 -24 10 M${x - 2} ${y - 42} q 14 -6 24 6 M${x - 2} ${y - 42} q -6 -12 -20 -12 M${x - 2} ${y - 42} q 8 -12 20 -10`} strokeWidth="2.4" />
          </g>
        ))}
        <rect x="0" y="108" width="1200" height="4" strokeWidth="0" />
      </motion.g>
      {/* windows light up at dusk */}
      <motion.g style={{ opacity: lit }} fill="#FFD27A">
        {WINDOWS.map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="3" height="4" />
        ))}
      </motion.g>
      {/* lagoon */}
      <motion.rect x="0" y="112" width="1200" height="28" style={{ fill: water }} />
      <g stroke="#FFFFFF" strokeOpacity=".45" strokeWidth="1.2" strokeLinecap="round">
        <path d="M60 120 h40 M180 127 h70 M330 121 h30 M470 131 h60 M610 122 h44 M760 128 h66 M900 121 h36 M1010 130 h58 M1120 123 h40" />
      </g>
    </svg>
  );
}

function Cloud({ className, color, opacity }: { className: string; color: MotionValue<string>; opacity: MotionValue<number> }) {
  return (
    <motion.div style={{ color, opacity }} className={`absolute ${className}`}>
      <span className="absolute bottom-0 left-0 h-[46%] w-full rounded-full bg-current" />
      <span className="absolute bottom-[18%] left-[16%] h-[62%] w-[38%] rounded-full bg-current" />
      <span className="absolute bottom-[22%] left-[44%] h-[86%] w-[40%] rounded-full bg-current" />
    </motion.div>
  );
}

export default function DaySky({
  progress,
  moments,
  active,
  compact = false,
}: {
  progress: MotionValue<number>;
  moments: { h: number; label: string }[];
  active: number;
  compact?: boolean;
}) {
  const clockRef = useRef<HTMLSpanElement>(null);

  const top = useTransform(progress, P, SKY_TOP);
  const mid = useTransform(progress, P, SKY_MID);
  const low = useTransform(progress, P, SKY_LOW);
  const sky = useMotionTemplate`linear-gradient(180deg, ${top} 0%, ${mid} 58%, ${low} 100%)`;
  const far = useTransform(progress, P, FAR);
  const near = useTransform(progress, P, NEAR);
  const water = useTransform(progress, P, WATER);
  const cloud = useTransform(progress, P, CLOUD);
  const cloudOpacity = useTransform(progress, [0, 0.9, 1], [0.85, 0.9, 0.45]);
  const lit = useTransform(progress, [0, 0.06, 0.82, 0.95], [0.7, 0, 0, 1]);
  const stars = useTransform(progress, [0, 0.07, 0.87, 1], [0.7, 0, 0, 1]);
  const moon = useTransform(progress, [0.86, 1], [0, 1]);
  const moonY = useTransform(progress, [0.86, 1], [18, 0]);

  // sun: x follows the clock, height follows the arc between sunrise and sunset
  const sunS = useTransform(progress, (p) => (hourAt(p) - SUNRISE) / (SUNSET - SUNRISE));
  const sunLeft = useTransform(progress, (p) => `${3 + p * 94}%`);
  const sunTop = useTransform(sunS, (s) => {
    if (s < 0) return `${76 - s * 120}%`;
    if (s > 1) return `${76 + (s - 1) * 120}%`;
    return `${76 - Math.sin(Math.PI * s) * 56}%`;
  });
  const sunCore = useTransform(progress, [0, 0.3, 0.6, 0.85, 0.93], ["#FFD0A8", "#FFF7E0", "#FFF4D2", "#FFD6A0", "#FFB37A"]);
  const sunEdge = useTransform(progress, [0, 0.3, 0.6, 0.85, 0.93], ["#FF7A3D", "#FFC94D", "#FFB938", "#FF7A2E", "#E8452A"]);
  const sunBg = useMotionTemplate`radial-gradient(circle at 38% 36%, ${sunCore}, ${sunEdge} 72%)`;
  const glow = useTransform(progress, [0, 0.3, 0.6, 0.85, 0.93], [
    "0 0 30px 8px rgba(255,140,66,.55)",
    "0 0 46px 14px rgba(255,214,120,.65)",
    "0 0 50px 16px rgba(255,200,90,.6)",
    "0 0 60px 20px rgba(255,120,50,.65)",
    "0 0 40px 12px rgba(232,69,42,.5)",
  ]);
  const rays = useTransform(sunS, [-0.05, 0.12, 0.85, 1.02], [0, 0.85, 0.85, 0]);

  useMotionValueEvent(progress, "change", (p) => {
    if (clockRef.current) clockRef.current.textContent = formatClock(hourAt(Math.min(1, Math.max(0, p))));
  });

  return (
    <div aria-hidden className="select-none">
      <motion.div
        style={{ backgroundImage: sky }}
        className={`relative overflow-hidden rounded-[22px] border border-black/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_30px_60px_-36px_rgba(90,40,5,0.45)] sm:rounded-[28px] ${
          compact ? "h-[150px]" : "h-[150px] md:h-[210px]"
        }`}
      >
        {/* stars + moon */}
        <motion.div style={{ opacity: stars }} className="absolute inset-0">
          {STARS.map(([x, y, s], i) => (
            <span
              key={i}
              className="twinkle absolute rounded-full bg-white"
              style={{ left: `${x}%`, top: `${y}%`, width: s * 2, height: s * 2, animationDelay: `${(i % 5) * 0.6}s` }}
            />
          ))}
        </motion.div>
        <motion.span
          style={{ opacity: moon, y: moonY }}
          className="absolute left-[14%] top-[14%] h-5 w-5 rounded-full shadow-[inset_-5px_2px_0_0_#F7EBD3] md:h-7 md:w-7 md:shadow-[inset_-7px_3px_0_0_#F7EBD3]"
        />

        {/* sun arc guide */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path d="M3 76 Q 50 -36 97 76" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* sun */}
        <motion.div style={{ left: sunLeft, top: sunTop }} className="absolute">
          <motion.span
            style={{ opacity: rays }}
            className="sun-rays absolute left-0 top-0 block h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[repeating-conic-gradient(rgba(255,226,170,0.55)_0deg_7deg,transparent_7deg_20deg)] [mask-image:radial-gradient(closest-side,black_35%,transparent)] md:h-[220px] md:w-[220px]"
          />
          <motion.span
            style={{ backgroundImage: sunBg, boxShadow: glow }}
            className="absolute left-0 top-0 block h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full md:h-11 md:w-11"
          />
        </motion.div>

        {/* drifting clouds */}
        <div className="cloud-drift absolute inset-0" style={{ animationDuration: "70s", animationDelay: "-20s" }}>
          <Cloud className="left-[30%] top-[16%] h-7 w-24 md:h-9 md:w-32" color={cloud} opacity={cloudOpacity} />
        </div>
        <div className="cloud-drift absolute inset-0" style={{ animationDuration: "95s", animationDelay: "-60s" }}>
          <Cloud className="left-[62%] top-[30%] h-5 w-16 md:h-7 md:w-24" color={cloud} opacity={cloudOpacity} />
        </div>
        <div className="cloud-drift absolute inset-0" style={{ animationDuration: "120s", animationDelay: "-5s" }}>
          <Cloud className="left-[8%] top-[34%] h-4 w-12 md:h-6 md:w-20" color={cloud} opacity={cloudOpacity} />
        </div>

        <Skyline far={far} near={near} water={water} lit={lit} />

        {/* live clock */}
        <span className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1 font-mono text-[11px] font-bold text-[#1A1A1A] shadow-sm backdrop-blur md:right-4 md:top-4 md:text-[12px]">
          <span className="text-[#6B6158]">Tue</span>
          <span ref={clockRef}>{formatClock(hourAt(progress.get()))}</span>
        </span>
      </motion.div>

      {/* moment chips under the sky, lit as the sun passes */}
      <div className="mt-2.5 grid grid-cols-4 gap-1.5 md:relative md:mt-3.5 md:block md:h-8">
        {moments.map((m, i) => {
          const x = 3 + pAt(m.h) * 94;
          const on = i <= active;
          return (
            <span
              key={m.label}
              style={{ "--x": `${x}%` } as React.CSSProperties}
              className={`flex items-center justify-center gap-1 rounded-full border px-1.5 py-1 font-mono text-[10.5px] font-bold transition-colors duration-500 md:absolute md:left-[var(--x)] md:top-0 md:px-2.5 md:text-[12px] md:[transform:translateX(calc(var(--x)*-1))] ${
                i === active
                  ? "border-[#E85D04] bg-[#E85D04] text-white shadow-[0_6px_16px_-6px_rgba(232,93,4,0.8)]"
                  : on
                    ? "border-[#FFD4B3] bg-[#FFF0E6] text-[#B03D00]"
                    : "border-[#EADFD3] bg-white text-[#6B6158]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${i === active ? "bg-white" : on ? "bg-[#E85D04]" : "bg-[#D8CCC0]"}`} />
              {m.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
