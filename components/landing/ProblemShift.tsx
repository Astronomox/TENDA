"use client";

import React from "react";
import { motion } from "framer-motion";
import { CalendarClock, MessageCircle, Users } from "lucide-react";
import { Avatar, EASE, Eyebrow, Reveal, usePrefersReducedMotion } from "./primitives";
import { SWIPE_ITEM } from "./SwipeRow";
import { PinProgress, useIsMobile, usePinTrack } from "./PinTrack";

const ROWS = [
  {
    source: "Notebook, page 14",
    q: "Who bought from me last month?",
    answer: (
      <>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF0E6] text-[#E85D04]"><Users aria-hidden className="h-[18px] w-[18px]" /></span>
          <div>
            <p className="font-mono text-[15px] font-bold text-[#1A1A1A]">128 customers</p>
            <p className="text-[12.5px] font-semibold text-[#6B6158]">every sale, on record</p>
          </div>
        </div>
        <div className="mt-3 flex -space-x-1.5" aria-hidden>
          {["Amina Yusuf", "Tunde Okafor", "Chioma Eze", "Bola Ade", "Ngozi Obi"].map((n, i) => (
            <span key={n} className="rounded-full ring-2 ring-white">
              <Avatar name={n} tone={i === 1 ? "ink" : "peach"} size={30} />
            </span>
          ))}
          <span className="flex h-7 items-center rounded-full bg-[#F6F1EC] px-2 font-mono text-[10.5px] font-bold text-[#4A4038] ring-2 ring-white">+123</span>
        </div>
      </>
    ),
  },
  {
    source: "WhatsApp scroll",
    q: "Who’s due to restock this week?",
    answer: (
      <div className="flex items-center gap-3">
        <Avatar name="Tunde Okafor" tone="ink" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-[#1A1A1A]">Tunde Okafor</p>
          <p className="text-[12.5px] font-semibold text-[#6B6158]">buys about every 14 days</p>
        </div>
        <span className="flex items-center gap-1 rounded-lg bg-[#FFF0E6] px-2 py-1 font-mono text-[11px] font-bold text-[#B03D00]">
          <CalendarClock aria-hidden className="h-3.5 w-3.5" /> 2 days
        </span>
      </div>
    ),
  },
  {
    source: "Pure guesswork",
    q: "Who quietly stopped buying?",
    answer: (
      <div className="flex items-center gap-3">
        <Avatar name="Chioma Eze" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-[#1A1A1A]">Chioma Eze</p>
          <p className="text-[12.5px] font-semibold text-[#6B6158]">34 days quiet · usually 12</p>
        </div>
        <span className="flex items-center gap-1 rounded-lg bg-[#15803D] px-2 py-1 text-[11.5px] font-bold text-white">
          <MessageCircle aria-hidden className="h-3.5 w-3.5" /> Message
        </span>
      </div>
    ),
  },
];

function StruckQuestion({ text, delay }: { text: string; delay: number }) {
  const reduce = usePrefersReducedMotion();
  return (
    <motion.span
      className="[box-decoration-break:slice] bg-no-repeat"
      style={{
        backgroundImage: "linear-gradient(#E85D04, #E85D04)",
        backgroundPosition: "0 56%",
      }}
      initial={{ backgroundSize: reduce ? "100% 0.09em" : "0% 0.09em", color: "#F4EEE8" }}
      whileInView={{ backgroundSize: "100% 0.09em", color: "#8C8279" }}
      viewport={{ once: true, amount: 0.9, margin: "0px 0px -15% 0px" }}
      transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : delay, ease: EASE }}
    >
      {text}
    </motion.span>
  );
}

export default function ProblemShift() {
  const reduce = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  // phones: the three Q&A cards pin and slide sideways as you scroll
  const { outerRef, stageRef, rowRef, enabled: pinned, outerStyle, stageClass, stageStyle } = usePinTrack(isMobile && !reduce);

  return (
    <section aria-labelledby="problem-title" className="on-dark grain grain-dark relative bg-[#111111] text-white">
      <div aria-hidden className="dot-grid-dark pointer-events-none absolute inset-0 [mask-image:linear-gradient(180deg,transparent,black_30%,black_70%,transparent)]" />
      <div className="relative z-[1] mx-auto max-w-[1240px] px-4 pb-12 pt-10 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8">
        <div ref={outerRef} style={outerStyle}>
        <div ref={stageRef} className={stageClass} style={stageStyle}>
        <div className="grid gap-2.5 sm:gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <Eyebrow dark>The notebook problem</Eyebrow>
          </Reveal>
          <Reveal delay={0.05} className="lg:col-span-8">
            <h2 id="problem-title" className="font-display text-[28px] font-bold leading-[1.06] tracking-[-0.035em] sm:text-[48px] lg:text-[56px]">
              Your shop runs on memory.{" "}
              <span className="text-[#A39B92]">Memory forgets.</span>
            </h2>
            <p className="mt-2.5 max-w-[560px] text-[15px] leading-[1.55] text-[#C9C0B6] sm:mt-5 sm:text-[17px] sm:leading-[1.65]">
              Sales are scattered across a notebook, a WhatsApp chat and your head. So the three questions that decide your
              repeat sales never get a clear answer.
            </p>
          </Reveal>
        </div>

        <ol
          ref={rowRef as React.RefObject<HTMLOListElement>}
          tabIndex={isMobile ? 0 : undefined}
          aria-label="Three questions a notebook can’t answer"
          className={`no-scrollbar relative -mx-4 mt-6 flex gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 ${
            pinned ? "" : "snap-x snap-mandatory"
          } md:mx-0 md:mt-20 md:block md:overflow-visible md:border-t md:border-white/10 md:px-0 md:pb-0`}
        >
          {ROWS.map((r, i) => (
            <li
              key={r.q}
              className={`${SWIPE_ITEM} flex flex-col gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-4 md:grid md:gap-5 md:rounded-none md:border-0 md:border-b md:border-white/10 md:bg-transparent md:p-0 md:py-10 lg:grid-cols-12 lg:items-center lg:gap-10`}
            >
              <p className="font-mono text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-[#A39B92] lg:col-span-2">
                <span className="text-[#FF8C42]">0{i + 1}</span> · {r.source}
              </p>
              <p className="font-display text-[23px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[36px] md:text-[36px] lg:col-span-6 lg:text-[42px]">
                <StruckQuestion text={r.q} delay={0.1} />
              </p>
              <Reveal delay={0.55} y={14} className="max-md:mt-auto lg:col-span-4">
                <div className="relative rounded-2xl bg-white p-4 text-[#1A1A1A] shadow-[0_30px_60px_-30px_rgba(255,140,66,0.5)]">
                  <p className="mb-3 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#C2410C]">
                    TENDA knows
                    <span className="text-[#6B6158]">example</span>
                  </p>
                  {r.answer}
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
        <PinProgress rowRef={rowRef} count={ROWS.length} dark hint={pinned ? "Keep scrolling" : "Swipe"} className="md:hidden" />
        </div>
        </div>

        <Reveal className="mt-6 sm:mt-16">
          <p className="max-w-[820px] font-display text-[19px] font-semibold leading-[1.35] tracking-[-0.02em] text-[#EDE6DE] sm:text-[28px]">
            TENDA answers all three, automatically, from the sales you already make.{" "}
            <span className="text-[#FF8C42]">No spreadsheets. No wahala.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
