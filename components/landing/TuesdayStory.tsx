"use client";

import React, { useEffect, useRef, useState } from "react";
import { transform, useMotionValue, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { Check, ChevronRight, MessageCircle, Mic, Sparkles, Sun, Sunset, Coffee, Store } from "lucide-react";
import { Eyebrow, Reveal, usePrefersReducedMotion } from "./primitives";
import { SWIPE_ITEM } from "./SwipeRow";
import { PinProgress, useIsMobile, usePinTrack } from "./PinTrack";
import DaySky, { pAt } from "./DaySky";

const MOMENTS = [
  {
    time: "8:02", h: 8 + 2 / 60,
    ampm: "am",
    icon: Coffee,
    title: "The morning briefing",
    body: "Before opening the shop, Amina asks TENDA for a quick read on her week.",
    card: (
      <>
        <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#C2410C]">
          <Sparkles aria-hidden className="h-3.5 w-3.5" /> AI briefing
        </p>
        <p className="mt-2 text-[13.5px] font-medium leading-snug text-[#1A1A1A]">
          “3 customers are due to buy today. Shea Butter 250g is your best seller this month.”
        </p>
      </>
    ),
  },
  {
    time: "10:15", h: 10.25,
    ampm: "am",
    icon: Store,
    title: "A sale, said out loud",
    body: "Hands full of stock, she taps the mic and says the sale instead of writing it down.",
    card: (
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E85D04] text-white">
          <Mic aria-hidden className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[13.5px] font-bold text-[#166534]">
            <Check aria-hidden className="h-4 w-4" strokeWidth={3} /> Sale recorded
          </p>
          <p className="truncate font-mono text-[12px] font-bold text-[#1A1A1A]">Amina Yusuf · ₦9,000</p>
        </div>
      </div>
    ),
  },
  {
    time: "2:30", h: 14.5,
    ampm: "pm",
    icon: Sun,
    title: "The nudge",
    body: "Quiet afternoon. TENDA flags that Tunde usually restocks about now.",
    card: (
      <>
        <p className="text-[13.5px] font-bold text-[#1A1A1A]">Tunde Okafor is due</p>
        <p className="text-[12px] font-semibold text-[#6B6158]">Buys every ~14 days · message ready</p>
        <span className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#15803D] px-3 text-[12.5px] font-bold text-white">
          <MessageCircle aria-hidden className="h-3.5 w-3.5" /> Message
        </span>
      </>
    ),
  },
  {
    time: "7:00", h: 19,
    ampm: "pm",
    icon: Sunset,
    title: "The evening read",
    body: "Shop closed. One glance at Insights shows what to stock before the weekend.",
    card: (
      <>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#C2410C]">Insight</p>
        <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-[#1A1A1A]">
          “Saturday is your best day. Restock Shea Butter by Friday.”
        </p>
      </>
    ),
  },
];

const MOMENT_P = MOMENTS.map((m) => pAt(m.h));
const SKY_MOMENTS = MOMENTS.map((m) => ({ h: m.h, label: `${m.time}${m.ampm}` }));
/** card position (0..3, fractional) → time of day, so each snapped card shows exactly its own hour */
const fromCard = transform([0, 1, 2, 3], MOMENT_P);
/** fractional index of the card at the start of the swipe row (last card counts once the row hits its end) */
function swipeProgress(el: HTMLElement | null) {
  if (!el || el.children.length < 2) return MOMENT_P[0];
  const kids = el.children as HTMLCollectionOf<HTMLElement>;
  const n = kids.length;
  const step = kids[1].offsetLeft - kids[0].offsetLeft || 1;
  const max = Math.max(1, el.scrollWidth - el.clientWidth);
  const lastSnap = (n - 2) * step;
  const x = el.scrollLeft;
  // several cards visible at once (desktop): the day advances evenly across the whole travel
  const f =
    max <= lastSnap ? (x / max) * (n - 1) : x <= lastSnap ? x / step : n - 2 + (x - lastSnap) / (max - lastSnap);
  return fromCard(Math.min(n - 1, Math.max(0, f)));
}
const momentAt = (p: number) => {
  let idx = 0;
  MOMENT_P.forEach((mp, i) => {
    if (p >= mp - 0.025) idx = i;
  });
  return idx;
};

export default function TuesdayStory() {
  const reduce = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const skyRef = useRef<HTMLDivElement>(null);
  // pin & slide on every size (reduced motion: swipe row on phones, static grid on desktop)
  const wantPin = !reduce;
  const { outerRef, stageRef, rowRef, enabled: pinned, outerStyle, stageClass, stageStyle } = usePinTrack(wantPin);
  const [active, setActive] = useState(0);
  // the cards' horizontal position drives the day whenever they can move sideways
  const rowDriven = isMobile || pinned;

  // Row-driven: sliding the cards (pinned scroll or swipe) moves the sun. Static desktop grid: page scroll does.
  const { scrollYProgress } = useScroll({ target: skyRef, offset: ["start 0.85", "start 0.12"] });
  const { scrollXProgress } = useScroll({ container: rowRef });
  const raw = useMotionValue(MOMENT_P[0]);
  const smooth = useSpring(raw, { stiffness: 80, damping: 20, mass: 0.7 });
  const progress = reduce ? raw : smooth;

  // reduced motion: no gliding — the sky holds still at the current moment
  const feed = (v: number) => raw.set(reduce ? MOMENT_P[momentAt(v)] : v);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!rowDriven) feed(v);
  });
  useMotionValueEvent(scrollXProgress, "change", () => {
    if (rowDriven) feed(swipeProgress(rowRef.current));
  });
  useEffect(() => {
    feed(rowDriven ? swipeProgress(rowRef.current) : scrollYProgress.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowDriven, reduce]);

  useMotionValueEvent(progress, "change", (v) => {
    const i = momentAt(v);
    setActive((prev) => (prev === i ? prev : i));
  });

  return (
    <section aria-labelledby="tuesday-title" className="relative overflow-x-clip bg-[#FFFDFB]">
      <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-32 lg:px-8">
        <div className="grid gap-2.5 sm:gap-6 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <Eyebrow>An example day</Eyebrow>
            <h2 id="tuesday-title" className="mt-2.5 font-display text-[28px] font-bold leading-[1.04] tracking-[-0.04em] sm:mt-5 sm:text-[52px] lg:text-[60px]">
              A Tuesday with TENDA.
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-5">
            <p className="max-w-[460px] text-[15px] leading-[1.55] text-[#4A4038] sm:text-[17px] sm:leading-[1.65]">
              Picture this: Amina runs a small beauty shop. Here’s how an ordinary Tuesday looks once TENDA is keeping track.
            </p>
            <p className="mt-1.5 font-mono text-[11px] font-medium text-[#6B6158] sm:mt-2">Illustrative scenario, not a customer story.</p>
          </Reveal>
        </div>

        <div ref={outerRef} style={outerStyle} className="mt-5 sm:mt-14 md:mt-12">
        <div ref={stageRef} className={stageClass} style={stageStyle}>
        <div ref={skyRef}>
          <DaySky progress={progress} moments={SKY_MOMENTS} active={active} />
        </div>

        {!pinned && (
          <p className="mt-2 flex items-center gap-1 font-mono text-[11px] font-bold text-[#6B6158] md:hidden" aria-hidden>
            Swipe through the day <ChevronRight className="h-3.5 w-3.5" />
          </p>
        )}

        <div className="mt-2 md:mt-5">
          <ol
            ref={rowRef as React.RefObject<HTMLOListElement>}
            tabIndex={rowDriven ? 0 : undefined}
            aria-label="Amina’s Tuesday, moment by moment"
            className={`no-scrollbar relative -mx-4 flex gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 pt-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 ${
              pinned ? "" : "snap-x snap-mandatory"
            } ${
              wantPin
                ? "md:gap-5 md:[mask-image:linear-gradient(90deg,transparent,black_3%,black_97%,transparent)] lg:-mx-8 lg:scroll-px-8 lg:px-8"
                : "md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-4"
            }`}
          >
            {MOMENTS.map((m, i) => {
              const Icon = m.icon;
              const on = i === active;
              return (
                <li
                  key={m.time}
                  aria-current={on ? "time" : undefined}
                  className={`${
                    wantPin ? "w-[84%] max-w-[380px] shrink-0 snap-start md:w-[400px] md:max-w-none" : SWIPE_ITEM
                  } relative rounded-[22px] border p-4 transition-all duration-500 md:p-5 ${
                    on
                      ? "border-[#FFC9A0] bg-white shadow-[0_24px_50px_-28px_rgba(232,93,4,0.55)] md:-translate-y-1.5"
                      : "border-[#F0EBE4] bg-[#FFFCF9]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-500 ${
                        on ? "border-[#E85D04] bg-[#E85D04] text-white" : "border-[#F0EBE4] bg-white text-[#E85D04]"
                      }`}
                    >
                      <Icon aria-hidden className="h-[18px] w-[18px]" />
                    </span>
                    <p className="font-mono text-[26px] font-bold leading-none tracking-[-0.04em] text-[#1A1A1A] md:text-[32px]">
                      {m.time}
                      <span className="ml-1 text-[13px] font-bold tracking-normal text-[#6B6158]">{m.ampm}</span>
                    </p>
                  </div>
                  <h3 className="mt-3 font-display text-[17px] font-bold tracking-[-0.02em] md:text-[19px]">{m.title}</h3>
                  <p className="mt-1 text-[14px] leading-[1.5] text-[#4A4038] md:mt-1.5 md:text-[15px] md:leading-[1.6]">{m.body}</p>
                  <div className="mt-3 rounded-2xl border border-[#F0EBE4] bg-white p-3 shadow-[0_18px_40px_-26px_rgba(90,40,5,0.45)] md:mt-4 md:p-3.5">
                    {m.card}
                  </div>
                </li>
              );
            })}
          </ol>
          <PinProgress
            rowRef={rowRef}
            count={MOMENTS.length}
            hint={pinned ? "Keep scrolling" : "Swipe"}
            className={pinned ? "" : "md:hidden"}
          />
        </div>
        </div>
        </div>
      </div>
    </section>
  );
}
