"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3, CheckCircle2, Maximize2, MessageCircle, Pause, Play, Sparkles, TrendingUp, Users,
} from "lucide-react";
import { CHAPTERS, VIDEO, chapterAt, chapterEnd } from "./chapters";
import { EASE, usePrefersReducedMotion } from "./primitives";

/* Chapter-synced callout that floats off the frame edge (decorative; caption carries the info). */
function Callout({ index }: { index: number }) {
  const base =
    "flex items-center gap-3 rounded-2xl border border-[#F0EBE4] bg-white/95 px-4 py-3 shadow-[0_24px_50px_-20px_rgba(60,30,10,0.45)] backdrop-blur";
  const icon = "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl";
  switch (CHAPTERS[index].id) {
    case "overview":
      return (
        <div className={base}>
          <span className={`${icon} bg-[#FFF0E6] text-[#E85D04]`}><TrendingUp className="h-[18px] w-[18px]" /></span>
          <div>
            <p className="font-mono text-[15px] font-bold text-[#1A1A1A]">₦284,500</p>
            <p className="text-[12px] font-semibold text-[#6B6158]">this month · <span className="text-[#15803D]">+12.4%</span></p>
          </div>
        </div>
      );
    case "customers":
      return (
        <div className={base}>
          <span className={`${icon} bg-[#FFF0E6] text-[#E85D04]`}><Users className="h-[18px] w-[18px]" /></span>
          <div>
            <p className="text-[14px] font-bold text-[#1A1A1A]">Amina Yusuf</p>
            <p className="text-[12px] font-semibold text-[#6B6158]">spend, rhythm &amp; top products</p>
          </div>
        </div>
      );
    case "sale":
      return (
        <div className={base}>
          <span className={`${icon} bg-[#DCFCE7] text-[#15803D]`}><CheckCircle2 className="h-[18px] w-[18px]" /></span>
          <div>
            <p className="text-[14px] font-bold text-[#1A1A1A]">Sale recorded</p>
            <p className="font-mono text-[12px] font-bold text-[#15803D]">₦9,000 · 2 × Shea Butter</p>
          </div>
        </div>
      );
    case "followups":
      return (
        <div className={base}>
          <span className={`${icon} bg-[#15803D] text-white`}><MessageCircle className="h-[18px] w-[18px]" /></span>
          <div>
            <p className="text-[14px] font-bold text-[#1A1A1A]">5 follow-ups today</p>
            <p className="text-[12px] font-semibold text-[#6B6158]">messages ready to send</p>
          </div>
        </div>
      );
    case "ai":
      return (
        <div className={base}>
          <span className={`${icon} bg-[#1A1A1A] text-[#FF8C42]`}><Sparkles className="h-[18px] w-[18px]" /></span>
          <p className="max-w-[220px] text-[13px] font-semibold leading-snug text-[#1A1A1A]">“Who are my best customers this month?”</p>
        </div>
      );
    default:
      return (
        <div className={base}>
          <span className={`${icon} bg-[#FFF0E6] text-[#E85D04]`}><BarChart3 className="h-[18px] w-[18px]" /></span>
          <div>
            <p className="text-[12px] font-semibold text-[#6B6158]">Best seller</p>
            <p className="text-[14px] font-bold text-[#1A1A1A]">Shea Butter 250g</p>
          </div>
        </div>
      );
  }
}

export default function ProductVideo({ onExpand, suspended }: { onExpand: () => void; suspended: boolean }) {
  const reduce = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeRef = useRef(0);
  const inViewRef = useRef(false);
  /** Whether the visitor (or autoplay) wants the video running. Reduced motion: only after a tap. */
  const wantPlayRef = useRef(true);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [blocked, setBlocked] = useState(false);

  /* Paint chapter progress straight to the DOM — no React re-render per frame. */
  const sync = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const idx = chapterAt(t);
    CHAPTERS.forEach((c, i) => {
      const el = fillRefs.current[i];
      if (!el) return;
      const p = i < idx ? 1 : i > idx ? 0 : Math.min(1, Math.max(0, (t - c.start) / (chapterEnd(i) - c.start)));
      el.style.transform = `scaleX(${p})`;
    });
    if (idx !== activeRef.current) {
      activeRef.current = idx;
      setActive(idx);
    }
  }, []);

  const tryPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().then(
      () => setBlocked(false),
      // autoplay refused (e.g. data saver / low-power mode): show the big play button.
      // AbortError just means a pause interrupted play() — not a block.
      (err: DOMException) => err?.name === "NotAllowedError" && setBlocked(true),
    );
  }, []);

  // Wire up media events + rAF progress loop.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    let raf = 0;
    const loop = () => {
      sync();
      raf = requestAnimationFrame(loop);
    };
    const setRate = () => {
      v.defaultPlaybackRate = VIDEO.rate;
      v.playbackRate = VIDEO.rate;
    };
    const onPlay = () => {
      setPlaying(true);
      setStarted(true);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(raf);
      sync();
    };
    if (v.readyState >= 1) setRate();
    v.addEventListener("loadedmetadata", setRate);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("seeked", sync);
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("loadedmetadata", setRate);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("seeked", sync);
    };
  }, [sync]);

  // Reduced motion → never autoplay; otherwise autoplay while on screen.
  useEffect(() => {
    wantPlayRef.current = !reduce;
    if (reduce) videoRef.current?.pause();
    else if (inViewRef.current && !suspended) tryPlay();
  }, [reduce, suspended, tryPlay]);

  // Pause when scrolled away (battery/CPU), resume when back.
  useEffect(() => {
    const el = frameRef.current;
    const v = videoRef.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting && wantPlayRef.current && !suspended) tryPlay();
        else if (!entry.isIntersecting) v.pause();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [suspended, tryPlay]);

  // Modal open → pause the hero copy.
  useEffect(() => {
    if (suspended) videoRef.current?.pause();
  }, [suspended]);

  // Keep the active chip visible in the horizontal (mobile) rail without moving the page.
  useEffect(() => {
    const rail = railRef.current;
    const chip = chipRefs.current[active];
    if (!rail || !chip || rail.scrollWidth <= rail.clientWidth + 2) return;
    rail.scrollTo({
      left: chip.offsetLeft - (rail.clientWidth - chip.offsetWidth) / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [active, reduce]);

  const seek = (i: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = CHAPTERS[i].start + 0.05;
    activeRef.current = i;
    setActive(i);
    sync();
    wantPlayRef.current = true;
    tryPlay();
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      wantPlayRef.current = true;
      tryPlay();
    } else {
      wantPlayRef.current = false;
      v.pause();
    }
  };

  return (
    <div className="relative">
      {/* chapter-synced callout, floats off the right edge on wide screens */}
      <div aria-hidden className="pointer-events-none absolute -right-4 top-[22%] z-20 hidden xl:block 2xl:-right-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, x: reduce ? 0 : 16, scale: reduce ? 1 : 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: reduce ? 0 : -8 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <Callout index={active} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        ref={frameRef}
        className="relative overflow-hidden rounded-[18px] border border-[#E9DFD4] bg-white shadow-[0_2px_0_rgba(255,255,255,0.8)_inset,0_50px_100px_-40px_rgba(90,40,5,0.45),0_30px_60px_-30px_rgba(0,0,0,0.25)] sm:rounded-[22px]"
      >
        {/* window chrome */}
        <div className="flex h-11 items-center gap-3 border-b border-[#F0EBE4] bg-[#FFFBF7] pl-3 pr-0.5 sm:pl-4 sm:pr-1">
          <div aria-hidden className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F3B8A0]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#F6D3A8]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#CFE3C6]" />
          </div>
          <div className="mx-auto hidden min-w-0 items-center gap-2 rounded-lg border border-[#F0EBE4] bg-white px-3 py-1 sm:flex">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
            <span className="truncate font-mono text-[11px] font-medium text-[#6B6158]">TENDA · sample shop “Amina Beauty”</span>
          </div>
          <p className="truncate font-mono text-[10.5px] font-medium text-[#6B6158] sm:hidden">Sample shop · Amina Beauty</p>
          <div className="ml-auto flex items-center sm:ml-0">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause product video" : "Play product video"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#4A4038] transition hover:bg-[#FFF0E6] hover:text-[#1A1A1A]"
            >
              {playing ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onExpand}
              aria-label="Watch the full demo in a larger player"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#4A4038] transition hover:bg-[#FFF0E6] hover:text-[#1A1A1A]"
            >
              <Maximize2 aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
          {/* video */}
          <div
            className="relative order-1 bg-[#FAF7F3] max-md:aspect-[5/4] max-md:overflow-hidden lg:order-2"
            style={
              {
                "--fx": `${(-CHAPTERS[active].focus[0] / 1280) * 100}%`,
                "--fy": `${(-CHAPTERS[active].focus[1] / 800) * 100}%`,
              } as React.CSSProperties
            }
          >
            <video
              ref={videoRef}
              className="block aspect-[16/10] w-full bg-[#FAF7F3] object-cover max-md:absolute max-md:left-0 max-md:top-0 max-md:w-[160%] max-md:max-w-none max-md:[transform:translate(var(--fx),var(--fy))] max-md:transition-transform max-md:duration-700 max-md:ease-out motion-reduce:transition-none"
              muted
              loop
              playsInline
              preload="metadata"
              poster={VIDEO.poster}
              aria-label="Silent screen recording of the TENDA dashboard for a sample shop: monthly overview, a customer profile, logging a ₦9,000 sale, WhatsApp follow-ups, an AI answer and insights"
            >
              <source src={VIDEO.mp4} type="video/mp4" />
              <source src={VIDEO.webm} type="video/webm" />
            </video>
            {!playing && !started && (reduce || blocked) && (
              <button
                type="button"
                onClick={togglePlay}
                aria-label="Play product video"
                className="group absolute inset-0 flex items-center justify-center bg-gradient-to-t from-[#1A1A1A]/25 to-transparent"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C94B00] text-white shadow-[0_20px_40px_-12px_rgba(201,75,0,0.8)] ring-8 ring-white/40 transition-transform group-hover:scale-105 sm:h-20 sm:w-20">
                  <Play aria-hidden className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" />
                </span>
              </button>
            )}
          </div>

          {/* chapter rail — vertical inside the window on desktop, horizontal snap row on mobile */}
          <nav aria-label="Video chapters" className="order-2 border-t border-[#F0EBE4] bg-[#FFFBF7] lg:order-1 lg:border-r lg:border-t-0">
            <p className="hidden px-5 pb-2 pt-5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#6B6158] lg:block">
              Tour · tap to jump
            </p>
            <ol
              ref={railRef}
              className="no-scrollbar flex snap-x snap-mandatory gap-1.5 overflow-x-auto scroll-px-2.5 px-2.5 py-2 sm:gap-2 sm:px-3 sm:py-3 lg:snap-none lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-2.5 lg:pb-4 lg:pt-0"
            >
              {CHAPTERS.map((c, i) => {
                const isActive = i === active;
                return (
                  <li key={c.id} className="shrink-0 snap-start lg:shrink">
                    <button
                      ref={(el) => {
                        chipRefs.current[i] = el;
                      }}
                      type="button"
                      onClick={() => seek(i)}
                      aria-current={isActive ? "step" : undefined}
                      aria-label={`Jump to chapter ${i + 1}: ${c.label}`}
                      className={`group relative flex min-h-11 w-full flex-col justify-center overflow-hidden rounded-xl border px-3 py-2 text-left sm:px-3.5 sm:py-2.5 transition-colors duration-300 lg:px-3 ${
                        isActive
                          ? "border-[#FFD4B3] bg-white shadow-[0_6px_18px_-10px_rgba(232,93,4,0.5)]"
                          : "border-[#F0EBE4] bg-white/60 hover:bg-white lg:border-transparent lg:bg-transparent lg:hover:bg-white/70"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className={`font-mono text-[11px] font-bold transition-colors ${isActive ? "text-[#C2410C]" : "text-[#6B6158]"}`}
                        >
                          0{i + 1}
                        </span>
                        <span
                          className={`whitespace-nowrap text-[13.5px] font-bold transition-colors ${isActive ? "text-[#1A1A1A]" : "text-[#4A4038]"}`}
                        >
                          {c.label}
                        </span>
                      </span>
                      <span
                        className={`hidden overflow-hidden text-[12.5px] font-medium leading-snug text-[#5E554C] transition-[max-height,opacity,margin] duration-500 lg:block ${
                          isActive ? "mt-1.5 max-h-24 opacity-100" : "max-h-0 opacity-0"
                        }`}
                      >
                        {c.caption}
                      </span>
                      {/* progress */}
                      <span aria-hidden className="mt-1.5 block h-[3px] w-full sm:mt-2 overflow-hidden rounded-full bg-[#F3E9DF]">
                        <span
                          ref={(el) => {
                            fillRefs.current[i] = el;
                          }}
                          className="block h-full w-full origin-left rounded-full bg-gradient-to-r from-[#E85D04] to-[#FF8C42]"
                          style={{ transform: "scaleX(0)" }}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* caption (mobile/tablet — desktop shows it inside the rail) */}
        <p className="border-t border-[#F0EBE4] bg-white px-3.5 py-2 text-[12.5px] font-medium leading-snug text-[#4A4038] sm:px-4 sm:py-3 sm:text-[13.5px] lg:hidden">
          <span className="mr-1.5 font-mono text-[11px] font-bold text-[#C2410C]">0{active + 1}</span>
          {CHAPTERS[active].caption}
        </p>
      </div>
    </div>
  );
}
