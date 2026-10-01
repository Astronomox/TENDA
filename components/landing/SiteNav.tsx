"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import { StartLink, usePrefersReducedMotion } from "./primitives";

export const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "FAQ", href: "#faq" },
];

export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`font-display text-[22px] font-extrabold tracking-[-0.04em] ${dark ? "text-white" : "text-[#1A1A1A]"}`}>
      TENDA<span className="text-[#E85D04]">.</span>
    </span>
  );
}

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile sheet: Escape closes and returns focus; first link gets focus on open.
  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle?.focus();
      }
    };
    const onResize = () => window.innerWidth >= 768 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 border-b ${
        scrolled || open
          ? "bg-[#FFFDFB]/95 border-[#F0EBE4] shadow-[0_8px_30px_-18px_rgba(60,30,10,0.25)] backdrop-blur-xl"
          : "bg-[#FFF6EE]/60 border-transparent backdrop-blur-md"
      }`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-[#1A1A1A] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#top" aria-label="TENDA home" className="-mx-1 px-1">
          <Wordmark />
        </a>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="rounded-lg px-3.5 py-2 text-[14px] font-semibold text-[#4A4038] transition-colors hover:bg-[#FFF0E6] hover:text-[#1A1A1A]"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-3.5 py-2 text-[14px] font-semibold text-[#1A1A1A] transition-colors hover:bg-[#FFF0E6] sm:inline-flex"
          >
            Log in
          </Link>
          <span className="hidden sm:block">
            <StartLink size="sm" />
          </span>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E9E1D8] bg-white text-[#1A1A1A] transition active:scale-95 md:hidden"
          >
            {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* reading-progress hairline */}
      {!reduce && (
        <motion.div
          aria-hidden
          style={{ scaleX: progress }}
          className="absolute inset-x-0 bottom-[-1px] h-[2px] origin-left bg-gradient-to-r from-[#E85D04] to-[#FF8C42]"
        />
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={panelRef}
            initial={{ opacity: 0, y: reduce ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -8 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-x-0 top-full border-b border-[#F0EBE4] bg-[#FFFDFB] px-4 pb-5 pt-2 shadow-[0_24px_40px_-24px_rgba(60,30,10,0.35)] md:hidden"
          >
            <nav aria-label="Mobile">
              <ul className="flex flex-col">
                {NAV_LINKS.map((l, i) => (
                  <li key={l.href} className="border-b border-[#F0EBE4] last:border-0">
                    <a
                      href={l.href}
                      onClick={close}
                      className="flex items-center justify-between py-3.5 font-display text-[19px] font-semibold tracking-tight text-[#1A1A1A]"
                    >
                      {l.label}
                      <span aria-hidden className="font-mono text-[11px] text-[#6B6158]">0{i + 1}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Link
                href="/login"
                onClick={close}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#E9E1D8] bg-white text-[15px] font-bold text-[#1A1A1A]"
              >
                Log in
              </Link>
              <StartLink onClick={close} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
