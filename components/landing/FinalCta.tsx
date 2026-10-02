"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./primitives";
import { NAV_LINKS, Wordmark } from "./SiteNav";

export default function FinalCta() {
  return (
    <div className="on-dark grain grain-dark relative overflow-hidden bg-[#111111] text-white">
      {/* orange horizon glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[38%] h-[560px] w-[min(1200px,160%)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(232,93,4,0.55),rgba(232,93,4,0.14)_55%,transparent)] blur-2xl"
      />
      <div aria-hidden className="dot-grid-dark pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]" />

      <section aria-labelledby="cta-title" className="relative z-[1] mx-auto max-w-[1240px] px-4 pb-12 pt-14 text-center sm:px-6 sm:pb-32 sm:pt-36 lg:px-8">
        <Reveal>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF8C42]">Your next repeat sale is waiting</p>
          <h2 id="cta-title" className="mx-auto mt-4 max-w-[980px] font-display text-[40px] sm:mt-6 font-extrabold leading-[0.98] tracking-[-0.05em] sm:text-[72px] lg:text-[96px]">
            Stop guessing.
            <br />
            <span className="bg-gradient-to-r from-[#FF8C42] via-[#FFB27A] to-[#FF8C42] bg-clip-text text-transparent">Start following up.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[15.5px] leading-[1.55] text-[#C9C0B6] sm:mt-6 sm:text-[17px] sm:leading-[1.65]">
            Set up in minutes on the phone you already have. Free to start, no card needed.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:mt-10 sm:flex-row sm:gap-4">
            <Link
              href="/signup"
              className="group inline-flex h-16 items-center gap-2.5 rounded-2xl bg-[#E85D04] px-8 text-[19px] font-extrabold text-white shadow-[0_0_0_1px_rgba(255,140,66,0.5),0_20px_60px_-10px_rgba(232,93,4,0.8)] transition-[transform,background-color] duration-200 hover:bg-[#F06A12] active:scale-[0.98]"
            >
              Start for free
              <ArrowRight aria-hidden className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-[16px] font-semibold text-[#EDE6DE] underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-[#FF8C42]">
              I already have an account · Log in
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-[1] border-t border-white/10">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 md:flex-row md:items-start md:justify-between lg:px-8">
          <div className="max-w-[320px]">
            <Wordmark dark />
            <p className="mt-3 text-[14px] leading-[1.6] text-[#A39B92]">
              Customer intelligence for Nigerian small businesses. Know your customers, sell to them again.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-14 gap-y-2.5 text-[14px] sm:grid-cols-[auto_auto]">
            <div>
              <p className="mb-1 font-mono text-[10.5px] sm:mb-3 font-bold uppercase tracking-[0.16em] text-[#8C8279]">Product</p>
              <ul className="sm:space-y-2">
                {NAV_LINKS.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="inline-flex min-h-11 items-center font-semibold text-[#EDE6DE] transition-colors hover:text-[#FF8C42] sm:min-h-0">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-mono text-[10.5px] sm:mb-3 font-bold uppercase tracking-[0.16em] text-[#8C8279]">Account</p>
              <ul className="sm:space-y-2">
                <li><Link href="/signup" className="inline-flex min-h-11 items-center font-semibold text-[#EDE6DE] transition-colors hover:text-[#FF8C42] sm:min-h-0">Sign up</Link></li>
                <li><Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-[#EDE6DE] transition-colors hover:text-[#FF8C42] sm:min-h-0">Log in</Link></li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="mx-auto max-w-[1240px] px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8">
          <p className="border-t border-white/10 pt-6 font-mono text-[11.5px] text-[#8C8279]">© 2026 TENDA · Made for merchants in Nigeria</p>
        </div>
      </footer>
    </div>
  );
}
