"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eyebrow, EASE, Reveal, usePrefersReducedMotion } from "./primitives";
import { FollowUpDemo, RhythmDemo, VoiceSaleDemo } from "./Illustrations";
import SwipeRow from "./SwipeRow";
import { PinProgress, useIsMobile, usePinTrack } from "./PinTrack";

// Full-width cards on phones (one step per screen); desktop sizes itself from md up.
const STEP_ITEM = "w-full shrink-0 snap-start md:w-auto md:shrink";

const STEPS = [
  {
    kicker: "Type it or say it",
    title: "Log a sale in seconds.",
    short: "Say “Sold two shea butter to Amina for nine thousand”. TENDA fills in the rest; you confirm.",
    body: (
      <>
        Tap the mic and say <q className="font-semibold text-[#1A1A1A]">Sold two shea butter to Amina for nine thousand</q>. TENDA fills in
        the customer, product, units and amount. You check it and confirm. Prefer typing? Product names autocomplete as you go.
      </>
    ),
    points: ["Voice in English or Pidgin", "Products autocomplete", "Amounts in Naira"],
    Visual: VoiceSaleDemo,
  },
  {
    kicker: "Automatically",
    title: "TENDA learns each customer’s rhythm.",
    short: "Every sale teaches TENDA how often each customer buys, and what they buy.",
    body: (
      <>
        Every sale teaches TENDA how often someone buys, what they buy and how much they spend. After a few purchases it knows that
        Tunde restocks roughly every two weeks, without you lifting a finger.
      </>
    ),
    points: ["Buying frequency", "Favourite products", "Spend over time"],
    Visual: RhythmDemo,
  },
  {
    kicker: "Every day",
    title: "You’re told who to message, with the message written.",
    short: "Each day: who’s due, with a WhatsApp message ready. One tap to send or call.",
    body: (
      <>
        Each day TENDA lists who is due or overdue to buy again, with a warm WhatsApp message ready to go. One tap to message, one tap to
        call. Edit it, send it, done.
      </>
    ),
    points: ["Due & overdue lists", "Ready-written WhatsApp", "One-tap Message / Call"],
    Visual: FollowUpDemo,
  },
];

export default function HowItWorks() {
  const reduce = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const [active, setActive] = useState(0);
  const { outerRef, stageRef, rowRef, enabled: pinned, outerStyle, stageClass, stageStyle } = usePinTrack(isMobile && !reduce);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  // The step crossing the middle band of the viewport drives the sticky visual.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const ActiveVisual = STEPS[active].Visual;

  return (
    <section id="how" aria-labelledby="how-title" className="relative bg-[#FFFDFB]">
      <div className="mx-auto max-w-[1240px] px-4 pb-6 pt-10 sm:px-6 sm:pb-10 sm:pt-32 lg:px-8">
        <div ref={outerRef} style={outerStyle}>
        <div
          ref={stageRef}
          style={stageStyle}
          className={`${stageClass} max-md:flex max-md:min-h-[calc(100svh-80px)] max-md:flex-col max-md:justify-center`}
        >
        <div className="grid gap-2.5 sm:gap-6 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <Eyebrow>How it works</Eyebrow>
            <h2 id="how-title" className="mt-2.5 font-display text-[28px] sm:mt-5 font-bold leading-[1.04] tracking-[-0.04em] sm:text-[52px] lg:text-[60px]">
              Three steps.
              <br />
              <span className="text-[#6B6158]">Zero spreadsheets.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-5">
            <p className="max-w-[440px] text-[15px] leading-[1.55] text-[#4A4038] sm:text-[17px] sm:leading-[1.65]">
              You keep selling the way you already do. TENDA does the remembering, the counting and the reminding.
            </p>
          </Reveal>
        </div>

        <div className="mt-5 sm:mt-14 lg:mt-20 lg:grid lg:grid-cols-12 lg:gap-12">
          {/* steps */}
          <SwipeRow as="ol" label="How TENDA works, in three steps" rowRef={rowRef} className="md:block lg:col-span-6">
            {STEPS.map((s, i) => {
              const Visual = s.Visual;
              return (
                <li
                  key={s.title}
                  ref={(el) => {
                    stepRefs.current[i] = el;
                  }}
                  data-step={i}
                  className={`${STEP_ITEM} relative flex flex-col md:block md:border-t md:border-[#F0EBE4] md:py-14 md:first:border-t-0 md:first:pt-0 lg:flex lg:min-h-[78vh] lg:flex-col lg:justify-center lg:border-t-0 lg:py-0`}
                >
                  <Reveal>
                    <div className="flex items-baseline gap-3 sm:gap-4">
                      <span
                        className={`font-mono text-[30px] font-bold leading-none tracking-[-0.04em] transition-colors duration-500 sm:text-[56px] ${
                          i === active ? "text-[#E85D04]" : "text-[#E2D5C8] max-md:text-[#E85D04]"
                        }`}
                        aria-hidden
                      >
                        0{i + 1}
                      </span>
                      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#C2410C]">{s.kicker}</span>
                    </div>
                    <h3 className="mt-2 max-w-[520px] font-display text-[20px] sm:mt-5 md:text-[34px] font-bold leading-[1.12] tracking-[-0.03em]">
                      <span className="sr-only">Step {i + 1}: </span>
                      {s.title}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-[1.5] text-[#4A4038] md:hidden">{s.short}</p>
                    <p className="mt-4 hidden max-w-[520px] text-[16.5px] leading-[1.7] text-[#4A4038] md:block">{s.body}</p>
                    <ul className="mt-6 hidden flex-wrap gap-2 md:flex">
                      {s.points.map((p) => (
                        <li key={p} className="rounded-lg border border-[#F0EBE4] bg-[#FFF6EE] px-3 py-1.5 text-[13px] font-semibold text-[#4A4038]">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                  {/* inline visual on phones/tablets */}
                  <Reveal delay={0.1} className="mx-auto mt-3.5 w-full max-w-[440px] md:mt-10 lg:hidden">
                    <Visual />
                  </Reveal>
                </li>
              );
            })}
          </SwipeRow>
          <PinProgress rowRef={rowRef} count={STEPS.length} hint={pinned ? "Keep scrolling" : "Swipe"} className="md:hidden" />

          {/* sticky visual on desktop */}
          <div className="hidden lg:col-span-6 lg:block">
            <div className="sticky top-[14vh] flex h-[72vh] items-center justify-center">
              <div aria-hidden className="adire absolute inset-[6%] rounded-[40px] opacity-[0.16] [mask-image:radial-gradient(closest-side,black,transparent)]" />
              <div aria-hidden className="absolute inset-[10%] rounded-full bg-[radial-gradient(closest-side,rgba(255,212,179,0.7),transparent)]" />
              <div className="relative w-full max-w-[440px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: reduce ? 0 : 24, rotate: reduce ? 0 : -1.5 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    exit={{ opacity: 0, y: reduce ? 0 : -16 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  >
                    <ActiveVisual />
                  </motion.div>
                </AnimatePresence>
                <div className="mt-6 flex justify-center gap-2" aria-hidden>
                  {STEPS.map((s, i) => (
                    <span
                      key={s.title}
                      className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? "w-8 bg-[#E85D04]" : "w-1.5 bg-[#E2D5C8]"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
        </div>
      </div>
    </section>
  );
}
