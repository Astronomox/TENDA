"use client";

import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Check, CirclePlay } from "lucide-react";
import ProductVideo from "./ProductVideo";
import DemoModal from "./DemoModal";
import { EASE, StartLink, usePrefersReducedMotion } from "./primitives";

const TRUST = ["Free to start", "No card needed", "Works on any phone"];

export default function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);
  const reduce = usePrefersReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);

  // Frame starts gently tilted back and settles flat as you scroll into it.
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ["start end", "start 0.25"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [11, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.94, 1]);
  const glowY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [60, 0]);

  const enter = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.2 : 0.8, delay: reduce ? 0 : delay, ease: EASE },
  });

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="grain relative bg-[linear-gradient(180deg,#FFF3E8_0%,#FFF8F1_38%,#FFFDFB_70%)] pt-4 sm:pt-16 lg:pt-20"
    >
      {/* dotted field, faded toward the edges */}
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_20%,black,transparent)]"
      />

      <div className="relative z-[1] mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3.5 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,486px)] lg:items-end lg:gap-10">
          <div>
            <motion.p
              {...enter(0)}
              className="inline-flex items-center gap-2 rounded-full border border-[#F2D9C4] bg-white/80 py-1 pl-1.5 pr-3 text-[11.5px] sm:py-1.5 sm:pl-2 sm:pr-3.5 font-semibold text-[#4A4038] shadow-[0_4px_14px_-8px_rgba(232,93,4,0.35)] sm:text-[13px]"
            >
              <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-[#FFF0E6]">
                <span className="soft-pulse h-2 w-2 rounded-full bg-[#E85D04]" />
              </span>
              Customer intelligence for Nigerian businesses
            </motion.p>

            <motion.h1
              {...enter(0.08)}
              id="hero-title"
              className="mt-3 font-display text-[40px] font-extrabold leading-[1.04] sm:mt-6 sm:leading-[1.02] tracking-[-0.045em] text-[#1A1A1A] min-[400px]:text-[43px] sm:text-[64px] lg:text-[66px] xl:text-[84px] 2xl:text-[88px]"
            >
              Turn one‑time buyers into{" "}
              <span className="relative inline-block whitespace-nowrap text-[#E85D04]">
                regulars.
                <svg
                  aria-hidden
                  viewBox="0 0 300 24"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1 left-0 h-[0.18em] w-[96%] overflow-visible sm:-bottom-2"
                >
                  <motion.path
                    d="M3 16 C 60 6, 140 4, 297 12"
                    fill="none"
                    stroke="#FF8C42"
                    strokeWidth="7"
                    strokeLinecap="round"
                    initial={{ pathLength: reduce ? 1 : 0, opacity: 0.85 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: reduce ? 0 : 0.9, delay: 0.7, ease: EASE }}
                  />
                </svg>
              </span>
            </motion.h1>
          </div>

          <div className="lg:pb-3">
            <motion.p {...enter(0.18)} className="max-w-[520px] text-[15px] leading-[1.5] text-[#4A4038] sm:hidden">
              Log sales by voice or text. TENDA tells you who to message next, message already written.
            </motion.p>
            <motion.p {...enter(0.18)} className="hidden max-w-[520px] text-[17px] leading-[1.6] text-[#4A4038] sm:block sm:text-[18px]">
              Log every sale in seconds — typed or just <em className="font-semibold not-italic text-[#1A1A1A]">said out loud</em>.
              TENDA learns how often each customer buys and tells you who to message today, with the WhatsApp message already written.
            </motion.p>

            <motion.div {...enter(0.26)} className="mt-3.5 grid grid-cols-[1.1fr_1fr] gap-2 sm:mt-7 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <StartLink size="lg" className="whitespace-nowrap max-sm:h-12 max-sm:gap-1.5 max-sm:rounded-xl max-sm:px-3 max-sm:text-[15px]" />
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                aria-label="Watch the 50-second demo"
                className="group inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#E9DFD4] bg-white/80 px-3 text-[15px] font-bold sm:h-14 sm:gap-2.5 sm:rounded-2xl sm:px-5 sm:text-[16px] text-[#1A1A1A] transition-colors hover:border-[#FFD4B3] hover:bg-white"
              >
                <CirclePlay aria-hidden className="h-5 w-5 text-[#E85D04] transition-transform group-hover:scale-110" />
                <span className="sm:hidden">Watch demo</span>
                <span className="hidden sm:inline">Watch the 50-second demo</span>
              </button>
            </motion.div>

            <motion.ul {...enter(0.34)} className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1 sm:mt-6 sm:gap-x-5 sm:gap-y-2" aria-label="What you get">
              {TRUST.map((t) => (
                <li key={t} className="flex items-center gap-1 text-[12px] font-semibold text-[#5E554C] sm:gap-1.5 sm:text-[13.5px]">
                  <Check aria-hidden className="h-3.5 w-3.5 text-[#15803D] sm:h-4 sm:w-4" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </motion.ul>
          </div>
        </div>
      </div>

      {/* ── the stage: framed, interactive product video bleeding into the dark section ── */}
      <div id="product" ref={stageRef} className="relative mt-4 hidden sm:mt-16 md:block lg:mt-20">
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[38%] bg-[#111111]" />
        {/* sunrise glow behind the frame */}
        <motion.div
          aria-hidden
          style={{ y: glowY }}
          className="pointer-events-none absolute left-1/2 top-[-12%] h-[70%] w-[min(1100px,120%)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,140,66,0.55),rgba(232,93,4,0.18)_55%,transparent)] blur-2xl"
        />
        <div className="relative z-10 mx-auto max-w-[1240px] px-3 sm:px-6 lg:px-8 [perspective:1600px]">
          <motion.div
            style={{ rotateX, scale, transformOrigin: "50% 0%" }}
            initial={{ opacity: 0, y: reduce ? 0 : 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0.2 : 1, delay: reduce ? 0 : 0.35, ease: EASE }}
          >
            <ProductVideo onExpand={() => setDemoOpen(true)} suspended={demoOpen} />
          </motion.div>
        </div>
      </div>

      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}
