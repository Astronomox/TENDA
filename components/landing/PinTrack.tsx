"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";

const NAV_H = 64;

const MOBILE_Q = "(max-width: 767px)";
const subscribeMobile = (cb: () => void) => {
  const mq = window.matchMedia(MOBILE_Q);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** Hydration-safe "is this a phone-width viewport" (false on the server). */
export function useIsMobile() {
  return useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_Q).matches, () => false);
}

/**
 * "Pin and slide": while the outer block scrolls past, its stage sticks under the nav and the page's
 * vertical scroll drives the row's horizontal scroll 1:1, so the cards slide sideways until the last one
 * is in view, then normal scrolling resumes. The row stays a real scroll container and the sync runs both
 * ways: touch swipes, arrow keys and Tab focus inside the row move the page to match (no scroll-jacking).
 *
 * Travel is measured from the real track (ResizeObserver). Pinning only switches on when `want` is true,
 * there is something to travel, and the stage fits in the viewport; otherwise the row is a plain swipe row.
 */
export function usePinTrack(want: boolean) {
  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLElement | null>(null);
  const [geo, setGeo] = useState({ travel: 0, top: NAV_H, fits: false, h: 0 });

  // measure travel + where the stage should rest (vertically centred below the nav)
  useEffect(() => {
    const row = rowRef.current;
    const stage = stageRef.current;
    if (!row || !stage) return;
    const measure = () => {
      const travel = Math.max(0, Math.round(row.scrollWidth - row.clientWidth));
      const vh = window.innerHeight;
      const h = stage.offsetHeight;
      const top = Math.round(Math.max(NAV_H + 8, (vh + NAV_H - h) / 2));
      const fits = h <= vh - NAV_H - 8;
      setGeo((g) => (g.travel === travel && g.top === top && g.fits === fits && g.h === h ? g : { travel, top, fits, h }));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    ro.observe(stage);
    Array.from(row.children).forEach((c) => ro.observe(c));
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [want]);

  const enabled = want && geo.fits && geo.travel > 8;

  // two-way sync: page scroll ⇄ row scroll
  useEffect(() => {
    const row = rowRef.current;
    const outer = outerRef.current;
    if (!enabled || !row || !outer) return;
    const { travel, top } = geo;
    let lastSet = -1;
    const start = () => outer.getBoundingClientRect().top + window.scrollY - top;
    const onWindow = () => {
      const x = Math.min(travel, Math.max(0, window.scrollY - start()));
      if (Math.abs(row.scrollLeft - x) > 0.5) {
        lastSet = x;
        row.scrollLeft = x;
      }
    };
    const onRow = () => {
      const x = row.scrollLeft;
      if (Math.abs(x - lastSet) <= 1.5) return; // our own write
      const s = start();
      const pinnedNow = window.scrollY >= s - 1 && window.scrollY <= s + travel + 1;
      if (!pinnedNow) return; // free swipe outside the pinned range
      lastSet = x;
      window.scrollTo({ top: s + x, behavior: "instant" as ScrollBehavior });
    };
    onWindow();
    window.addEventListener("scroll", onWindow, { passive: true });
    row.addEventListener("scroll", onRow, { passive: true });
    return () => {
      window.removeEventListener("scroll", onWindow);
      row.removeEventListener("scroll", onRow);
    };
  }, [enabled, geo]);

  return {
    outerRef,
    stageRef,
    rowRef,
    enabled,
    // sticky is bounded by the parent's content box, so the travel must be real height (not padding)
    outerStyle: enabled ? ({ height: geo.h + geo.travel } as React.CSSProperties) : undefined,
    stageClass: enabled ? "sticky" : "",
    stageStyle: enabled ? ({ top: geo.top } as React.CSSProperties) : undefined,
  };
}

/** Progress for a horizontal row: a thin bar + "2 / 4". Driven by the row's own scroll position. */
export function PinProgress({
  rowRef,
  count,
  dark = false,
  hint,
  className = "",
}: {
  rowRef: React.RefObject<HTMLElement | null>;
  count: number;
  dark?: boolean;
  hint?: string;
  className?: string;
}) {
  const { scrollXProgress } = useScroll({ container: rowRef });
  const [index, setIndex] = useState(0);
  useMotionValueEvent(scrollXProgress, "change", (v) => {
    const i = Math.min(count - 1, Math.max(0, Math.round(v * (count - 1))));
    setIndex((p) => (p === i ? p : i));
  });
  return (
    <div aria-hidden className={`mt-3 flex items-center gap-3 ${className}`}>
      {hint && (
        <span className={`hidden font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] min-[380px]:inline ${dark ? "text-[#A39B92]" : "text-[#6B6158]"}`}>
          {hint}
        </span>
      )}
      <span className={`relative h-[3px] flex-1 overflow-hidden rounded-full ${dark ? "bg-white/15" : "bg-[#EADFD3]"}`}>
        <motion.span
          style={{ scaleX: scrollXProgress }}
          className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-[#E85D04] to-[#FF8C42]"
        />
      </span>
      <span className={`font-mono text-[11px] font-bold tabular-nums ${dark ? "text-[#EDE6DE]" : "text-[#1A1A1A]"}`}>
        {index + 1} / {count}
      </span>
    </div>
  );
}
