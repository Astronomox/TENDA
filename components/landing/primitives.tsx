"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export const EASE = [0.2, 0.8, 0.2, 1] as const;

const RM_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeRM = (cb: () => void) => {
  const mq = window.matchMedia(RM_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** Hydration-safe prefers-reduced-motion (false on the server, real value after hydration). */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeRM,
    () => window.matchMedia(RM_QUERY).matches,
    () => false,
  );
}

/** Fade/slide-up reveal on scroll. Collapses to a plain fade when reduced motion is on. */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "article" | "header";
}) {
  const reduce = usePrefersReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: reduce ? 0.2 : 0.7, delay: reduce ? 0 : delay, ease: EASE }}
    >
      {children}
    </Comp>
  );
}

/** Small mono "data label" used above section headings. */
export function Eyebrow({
  children,
  dark = false,
  className = "",
}: {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <p
      className={`font-mono text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] flex items-center ${
        dark ? "text-[#FF8C42]" : "text-[#C2410C]"
      } ${className}`}
    >
      {children}
    </p>
  );
}

/** Primary call to action → /signup */
export function StartLink({
  children = "Start for free",
  size = "md",
  className = "",
  onClick,
}: {
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href="/signup"
      onClick={onClick}
      className={`group inline-flex items-center justify-center gap-2 bg-[#C94B00] font-bold text-white shadow-[0_10px_30px_-10px_rgba(201,75,0,0.7),inset_0_1px_0_rgba(255,255,255,0.18)] transition-[background-color,transform,box-shadow] duration-200 hover:bg-[#B04100] hover:shadow-[0_14px_34px_-10px_rgba(201,75,0,0.8),inset_0_1px_0_rgba(255,255,255,0.18)] active:scale-[0.98] ${
        size === "lg"
          ? "h-14 rounded-2xl px-7 text-[17px]"
          : size === "sm"
            ? "h-10 rounded-xl px-4 text-[14px]"
            : "h-12 rounded-2xl px-5 text-[15px]"
      } ${className}`}
    >
      {children}
      <ArrowRight aria-hidden className="h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Naira formatting with the real ₦ glyph. */
export const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/** Initials avatar matching the app's soft-peach style. */
export function Avatar({ name, tone = "peach", size = 36 }: { name: string; tone?: "peach" | "ink" | "green"; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const tones = {
    peach: "bg-[#FFE3CC] text-[#B03D00]",
    ink: "bg-[#2A2622] text-[#FFD4B3]",
    green: "bg-[#DCFCE7] text-[#166534]",
  } as const;
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-mono font-bold tracking-[-0.04em] ${size < 32 ? "text-[10px]" : "text-[11px]"} ${tones[tone]}`}
    >
      {initials}
    </span>
  );
}

/** Tiny tag that marks UI recreations as illustrations, not data. */
export function IllustrationTag({ dark = false, children = "Illustration" }: { dark?: boolean; children?: React.ReactNode }) {
  return (
    <span
      className={`font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? "text-[#A39B92]" : "text-[#6B6158]"}`}
    >
      {children}
    </span>
  );
}
