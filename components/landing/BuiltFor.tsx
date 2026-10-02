"use client";

import React from "react";
import { Languages, Lock, MessageCircle, Smartphone } from "lucide-react";
import { Eyebrow, Reveal } from "./primitives";

function NairaGlyph({ className }: { className?: string }) {
  return (
    <span aria-hidden className={`font-display font-extrabold leading-none ${className ?? ""}`}>
      ₦
    </span>
  );
}

const ITEMS = [
  { icon: Smartphone, title: "Works in your phone browser", body: "Nothing to install. Open it on any Android or iPhone, or a laptop." },
  { icon: NairaGlyph, title: "Naira-native", body: "Every amount in ₦, every date and time on Lagos time." },
  { icon: Languages, title: "English & Pidgin", body: "Talk to TENDA the same way you talk to your customers." },
  { icon: MessageCircle, title: "WhatsApp-first", body: "Follow-ups open straight in WhatsApp with the message written." },
  { icon: Lock, title: "Your data is yours", body: "Private to your account. Your customers never see your records." },
];

export default function BuiltFor() {
  return (
    <section aria-labelledby="built-title" className="relative border-y border-[#F0EBE4] bg-[#FFF6EE]">
      <div aria-hidden className="adire h-3 w-full opacity-40 sm:h-4" />
      <div className="mx-auto max-w-[1240px] px-4 py-9 sm:px-6 sm:py-20 lg:px-8">
        <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>Built for how you sell</Eyebrow>
            <h2 id="built-title" className="mt-2 font-display text-[22px] font-bold leading-[1.15] tracking-[-0.035em] sm:mt-4 sm:text-[36px]">
              Made for Nigerian shops, not Silicon Valley.
            </h2>
          </div>
        </Reveal>
        <ul className="mt-5 grid grid-cols-2 overflow-hidden rounded-[20px] border border-[#EADFD3] bg-white sm:mt-10 sm:rounded-[22px] lg:grid-cols-5">
          {ITEMS.map((it, i) => {
            const Icon = it.icon;
            return (
              <Reveal
                as="li"
                key={it.title}
                delay={i * 0.05}
                y={10}
                className="border-b border-[#F0EBE4] p-3.5 last:col-span-2 last:border-b-0 [&:nth-child(odd)]:border-r last:border-r-0 sm:p-6 lg:col-span-1 lg:border-b-0 lg:border-r lg:last:col-span-1 lg:last:border-r-0"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF0E6] text-[16px] text-[#E85D04] sm:h-10 sm:w-10 sm:rounded-xl sm:text-[20px]">
                  <Icon aria-hidden className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <h3 className="mt-2.5 text-[13.5px] font-bold leading-snug text-[#1A1A1A] sm:mt-4 sm:text-[15.5px]">{it.title}</h3>
                <p className="mt-1 text-[12.5px] leading-[1.45] text-[#5E554C] sm:mt-1.5 sm:text-[14px] sm:leading-[1.6]">{it.body}</p>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
