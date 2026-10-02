"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Class for each direct child of a SwipeRow: ~84% wide card with the next one peeking on phones;
 * from `md` up the child sizes itself again (desktop layout is the caller's own md:/lg: classes).
 */
export const SWIPE_ITEM = "w-[84%] max-w-[380px] shrink-0 snap-start md:w-auto md:max-w-none md:shrink";

/**
 * Below `md`: a horizontal scroll-snap carousel (scrolls inside itself only) with small position dots.
 * From `md` up: just a container — pass the desktop layout via `className` (e.g. "md:grid md:grid-cols-2").
 */
export default function SwipeRow({
  as = "ul",
  label,
  className = "",
  dark = false,
  rowRef,
  onIndexChange,
  children,
}: {
  as?: "ul" | "ol" | "div";
  label: string;
  className?: string;
  dark?: boolean;
  rowRef?: React.RefObject<HTMLElement | null>;
  onIndexChange?: (i: number) => void;
  children: React.ReactNode;
}) {
  const ownRef = useRef<HTMLElement | null>(null);
  const elRef = rowRef ?? ownRef;
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const count = React.Children.toArray(children).filter(Boolean).length;
  const cbRef = useRef(onIndexChange);
  useEffect(() => {
    cbRef.current = onIndexChange;
  }, [onIndexChange]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      if (el.scrollWidth <= el.clientWidth + 2) return;
      const kids = Array.from(el.children) as HTMLElement[];
      const start = el.scrollLeft + parseFloat(getComputedStyle(el).paddingLeft || "0");
      // at the far end, the last card counts as active even if it can't snap to the start
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      let best = 0;
      let dist = Infinity;
      kids.forEach((k, i) => {
        const d = Math.abs(k.offsetLeft - start);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      if (atEnd) best = kids.length - 1;
      if (best !== indexRef.current) {
        indexRef.current = best;
        setIndex(best);
        cbRef.current?.(best);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [elRef]);

  const Tag = as as React.ElementType;

  return (
    <>
      <Tag
        ref={elRef}
        aria-label={label}
        className={`no-scrollbar relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:snap-none md:overflow-visible md:px-0 md:pb-0 ${className}`}
      >
        {children}
      </Tag>
      {count > 1 && (
        <div aria-hidden className="mt-3 flex justify-center gap-1.5 md:hidden">
          {Array.from({ length: count }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? `w-5 ${dark ? "bg-[#FF8C42]" : "bg-[#E85D04]"}` : `w-1.5 ${dark ? "bg-white/25" : "bg-[#E2D5C8]"}`
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
