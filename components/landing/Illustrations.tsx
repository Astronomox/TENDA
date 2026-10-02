"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Check, CheckCheck, Mic, MessageCircle, Phone, Package, User, Hash } from "lucide-react";
import { Avatar, EASE, IllustrationTag, usePrefersReducedMotion } from "./primitives";

/**
 * A looping clock (ms) that only ticks while the element is on screen.
 * With reduced motion it returns the end of the loop, i.e. the finished state.
 */
function useLoopClock(ref: React.RefObject<HTMLElement | null>, period: number, step = 60) {
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = usePrefersReducedMotion();
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!inView || reduce) return;
    const start = performance.now();
    const id = window.setInterval(() => setT((performance.now() - start) % period), step);
    return () => window.clearInterval(id);
  }, [inView, reduce, period, step]);
  return reduce ? period - 1 : t;
}

const card =
  "relative w-full rounded-[26px] border border-[#F0EBE4] bg-white shadow-[0_40px_80px_-40px_rgba(90,40,5,0.35),0_2px_6px_rgba(0,0,0,0.03)]";

/* ───────────── 1. Voice → sale ───────────── */
const SPOKEN = "Sold two shea butter to Amina for nine thousand";

export function VoiceSaleDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const t = useLoopClock(ref, 9800);
  const listening = t < 2800;
  const typed = SPOKEN.slice(0, Math.round(Math.min(1, t / 2500) * SPOKEN.length));
  const fields = [
    { icon: User, label: "Customer", value: "Amina Yusuf", at: 3000 },
    { icon: Package, label: "Product", value: "Shea Butter 250g", at: 3400 },
    { icon: Hash, label: "Units", value: "2 × ₦4,500", at: 3800 },
  ];
  const showTotal = t >= 4200;
  const recorded = t >= 5900;

  return (
    <div ref={ref} className={`${card} p-5 sm:p-6`} role="img" aria-label="Illustration: saying “Sold two shea butter to Amina for nine thousand” fills in a sale for Amina Yusuf, 2 Shea Butter 250g, ₦9,000, which is then recorded.">
      <div className="flex items-center justify-between">
        <p className="font-display text-[15px] font-bold tracking-tight">Log a sale</p>
        <IllustrationTag />
      </div>

      <div className="mt-4 flex items-center gap-4 rounded-2xl bg-[#FFF6EE] p-3.5">
        <span
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition-colors duration-500 ${
            listening ? "bg-[#E85D04] soft-pulse" : "bg-[#1A1A1A]"
          }`}
        >
          <Mic aria-hidden className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div aria-hidden className="flex h-6 items-center gap-[3px]">
            {Array.from({ length: 22 }).map((_, i) => (
              <span
                key={i}
                className={`w-[3px] rounded-full bg-[#E85D04] ${listening ? "wave-bar" : ""}`}
                style={{
                  height: `${30 + ((i * 37) % 70)}%`,
                  animationDelay: `${(i % 7) * 0.09}s`,
                  opacity: listening ? 1 : 0.25,
                  transform: listening ? undefined : "scaleY(0.3)",
                }}
              />
            ))}
          </div>
          <p className="mt-1.5 min-h-[40px] text-[13.5px] font-medium leading-snug text-[#1A1A1A]">
            “{typed}
            {listening && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-[#E85D04]" />}”
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {fields.map((f) => {
          const on = t >= f.at;
          const Icon = f.icon;
          return (
            <li
              key={f.label}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-500 ${
                on ? "border-[#FFD4B3] bg-white opacity-100" : "border-dashed border-[#EADFD3] bg-[#FFFCF9] opacity-60"
              }`}
            >
              <Icon aria-hidden className={`h-4 w-4 ${on ? "text-[#E85D04]" : "text-[#B5AAA0]"}`} />
              <span className="w-[70px] text-[12px] font-semibold text-[#6B6158]">{f.label}</span>
              <span className={`text-[14px] font-bold transition-opacity duration-500 ${on ? "opacity-100" : "opacity-0"}`}>{f.value}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-[#F0EBE4] pt-4">
        <div>
          <p className="text-[12px] font-semibold text-[#6B6158]">Total</p>
          <p className={`font-mono text-[22px] font-bold transition-opacity duration-500 ${showTotal ? "opacity-100" : "opacity-0"}`}>₦9,000</p>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {recorded ? (
            <motion.span
              key="ok"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="flex items-center gap-1.5 rounded-xl bg-[#DCFCE7] px-3.5 py-2.5 text-[13.5px] font-bold text-[#166534]"
            >
              <Check aria-hidden className="h-4 w-4" strokeWidth={3} /> Sale recorded
            </motion.span>
          ) : (
            <motion.span
              key="confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: showTotal ? 1 : 0.4 }}
              exit={{ opacity: 0 }}
              className={`rounded-xl px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors ${
                t >= 5200 ? "bg-[#B04100]" : "bg-[#C94B00]"
              }`}
            >
              Confirm sale
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────────── 2. Buying rhythm ───────────── */
const BUYS = [0, 14, 27, 41, 55]; // days
const SPAN = 75;

export function RhythmDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const t = useLoopClock(ref, 7000);
  const shown = Math.min(BUYS.length, Math.floor(t / 520) + 1);
  const learned = t >= BUYS.length * 520 + 300;
  const pct = (d: number) => `${4 + (d / SPAN) * 92}%`;

  return (
    <div ref={ref} className={`${card} p-5 sm:p-6`} role="img" aria-label="Illustration: Tunde Okafor bought five times, roughly every 14 days, so TENDA expects his next purchase in 2 days.">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name="Tunde Okafor" tone="ink" size={40} />
          <div>
            <p className="text-[15px] font-bold">Tunde Okafor</p>
            <p className="text-[12.5px] font-semibold text-[#6B6158]">Shea Butter 250g · Black Soap</p>
          </div>
        </div>
        <IllustrationTag />
      </div>

      <div className="relative mt-8 h-[92px]">
        {/* track */}
        <div className="absolute inset-x-0 top-[46px] h-px bg-[#EADFD3]" />
        <div className="absolute inset-x-0 top-[40px] flex justify-between px-[4%]" aria-hidden>
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} className="h-3 w-px bg-[#EADFD3]" />
          ))}
        </div>
        {/* interval brackets */}
        {BUYS.slice(1).map((d, i) => {
          const prev = BUYS[i];
          const on = learned || shown > i + 1;
          return (
            <div
              key={d}
              className={`absolute top-[14px] h-4 border-x border-t border-[#FFB98A] rounded-t-md transition-opacity duration-500 ${on ? "opacity-100" : "opacity-0"}`}
              style={{ left: pct(prev), width: `calc(${pct(d)} - ${pct(prev)})` }}
            >
              <span className="absolute -top-[15px] left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold text-[#B03D00]">{d - prev}d</span>
            </div>
          );
        })}
        {/* purchases */}
        {BUYS.map((d, i) => (
          <span
            key={d}
            className={`absolute top-[39px] h-[15px] w-[15px] -translate-x-1/2 rounded-full border-[3px] border-white bg-[#E85D04] shadow-[0_0_0_1px_#E85D04] transition-all duration-500 ${
              i < shown ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
            style={{ left: pct(d) }}
          />
        ))}
        {/* expected */}
        <div
          className={`absolute top-[33px] -translate-x-1/2 transition-opacity duration-500 ${learned ? "opacity-100" : "opacity-0"}`}
          style={{ left: pct(69) }}
        >
          <span className="soft-pulse block h-[27px] w-[27px] rounded-full border-2 border-dashed border-[#E85D04] bg-[#FFF0E6]" />
        </div>
        <div className="absolute inset-x-0 top-[66px] flex justify-between font-mono text-[10px] font-medium text-[#6B6158]">
          <span>Jul</span>
          <span>Aug</span>
          <span>Sep</span>
          <span className="text-[#B03D00]">next</span>
        </div>
      </div>

      <div className={`mt-4 grid grid-cols-3 gap-2 transition-opacity duration-500 ${learned ? "opacity-100" : "opacity-40"}`}>
        {[
          ["Buys every", "~14 days"],
          ["Avg. order", "₦9,000"],
          ["Next buy", "in 2 days"],
        ].map(([k, v], i) => (
          <div key={k} className={`rounded-xl px-3 py-2.5 ${i === 2 ? "bg-[#1A1A1A] text-white" : "bg-[#FFF6EE]"}`}>
            <p className={`text-[11px] font-semibold ${i === 2 ? "text-[#C9C0B6]" : "text-[#6B6158]"}`}>{k}</p>
            <p className={`mt-0.5 font-mono text-[14px] font-bold ${i === 2 ? "text-[#FF8C42]" : ""}`}>{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── 3. WhatsApp follow-up ───────────── */
const MESSAGE =
  "Hi Amina! Hope you’re doing well. Your Shea Butter 250g should be running low by now. Should I keep two aside for you this week?";

export function FollowUpDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const t = useLoopClock(ref, 9000, 40);
  const typed = MESSAGE.slice(0, Math.round(Math.min(1, Math.max(0, (t - 500) / 3800)) * MESSAGE.length));
  const done = t >= 4500;
  const tapped = t >= 6200;

  return (
    <div ref={ref} className={`${card} overflow-hidden`} role="img" aria-label="Illustration: a follow-up for Amina Yusuf, 5 days overdue, with a friendly WhatsApp message already written and Message and Call buttons.">
      <div className="flex items-center justify-between gap-3 border-b border-[#F0EBE4] p-5">
        <div className="flex items-center gap-3">
          <Avatar name="Amina Yusuf" size={40} />
          <div>
            <p className="text-[15px] font-bold">Amina Yusuf</p>
            <p className="text-[12.5px] font-semibold text-[#6B6158]">Usually every 12 days · last 17 days ago</p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-[#FEE2E2] px-2 py-1 font-mono text-[10.5px] font-bold text-[#B91C1C]">5d overdue</span>
      </div>

      <div className="bg-[#EFE9E1] bg-[radial-gradient(rgba(26,26,26,0.05)_1px,transparent_1.2px)] [background-size:14px_14px] px-4 py-5">
        <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-md bg-[#D9FDD3] px-3.5 py-2.5 shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
          <p className="min-h-[60px] text-[13.5px] font-medium leading-snug text-[#111B21]">
            {typed}
            {!done && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-[#15803D]" />}
          </p>
          <p className="mt-1 flex items-center justify-end gap-1 font-mono text-[10px] text-[#54656F]">
            2:30 pm <CheckCheck aria-hidden className="h-3.5 w-3.5 text-[#53BDEB]" />
          </p>
        </div>
        <p className="mt-2 text-right font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#5E554C]">Written by TENDA · edit anything</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 p-4">
        <span
          className={`flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-white transition-all duration-300 ${
            tapped ? "scale-[0.97] bg-[#166534]" : "bg-[#15803D]"
          } ${done && !tapped ? "ring-4 ring-[#15803D]/20" : ""}`}
        >
          <MessageCircle aria-hidden className="h-4 w-4" /> Message
        </span>
        <span className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E9E1D8] text-[14px] font-bold text-[#1A1A1A]">
          <Phone aria-hidden className="h-4 w-4" /> Call
        </span>
      </div>
    </div>
  );
}
