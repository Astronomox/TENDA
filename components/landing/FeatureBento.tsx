"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Bell, Mic, MessageCircle, Phone, Smartphone, Sparkles, UserRound } from "lucide-react";
import { Avatar, EASE, Eyebrow, IllustrationTag, Reveal, usePrefersReducedMotion } from "./primitives";

function TileHead({
  icon: Icon,
  label,
  title,
  dark = false,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  title: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div>
      <p className={`flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] ${dark ? "text-[#FF8C42]" : "text-[#C2410C]"}`}>
        <Icon aria-hidden className="h-4 w-4" />
        {label}
      </p>
      <h3 className={`mt-2 font-display text-[20px] font-bold sm:mt-3 sm:text-[22px] leading-[1.15] tracking-[-0.03em] sm:text-[25px] ${dark ? "text-white" : "text-[#1A1A1A]"}`}>
        {title}
      </h3>
    </div>
  );
}

const tile = "relative overflow-hidden rounded-[22px] border p-4 sm:rounded-[26px] sm:p-7";

/* — follow-ups (dark) — */
const FOLLOWUPS = [
  { name: "Amina Yusuf", note: "5 days overdue", tone: "text-[#FCA5A5]" },
  { name: "Tunde Okafor", note: "Due in 2 days", tone: "text-[#FFB98A]" },
  { name: "Chioma Eze", note: "34 days quiet", tone: "text-[#FCA5A5]" },
];

function FollowUpsTile() {
  return (
    <Reveal as="article" delay={0} className={`${tile} on-dark grain grain-dark border-[#2A2622] bg-[#151311] md:order-1 md:col-span-2 lg:col-span-7 lg:row-span-2`}>
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(232,93,4,0.35),transparent)]" />
      <div className="relative z-[1] flex h-full flex-col">
        <TileHead dark icon={Bell} label="Follow-ups" title={<>Never miss a repeat sale.</>} />
        <p className="mt-2 max-w-[440px] text-[14.5px] leading-[1.55] text-[#C9C0B6] sm:mt-3 sm:text-[15.5px] sm:leading-[1.65]">
          TENDA tells you who’s due, who’s overdue and who’s gone quiet, then hands you a ready-written WhatsApp message for each.
        </p>
        <div className="mt-4 flex items-end gap-4 border-t border-white/10 pt-4 max-md:hidden sm:mt-8 sm:gap-5 sm:pt-6">
          <p className="font-mono text-[48px] font-bold leading-[0.85] tracking-[-0.06em] text-white sm:text-[76px]">5</p>
          <div className="pb-1">
            <p className="text-[15px] font-bold text-white">follow-ups today</p>
            <p className="mt-1 flex flex-wrap gap-x-3 font-mono text-[12px] font-bold">
              <span className="text-[#FCA5A5]">2 overdue</span>
              <span className="text-[#FFB98A]">3 due soon</span>
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-2 max-md:hidden sm:mt-6 sm:space-y-2.5 lg:mt-auto lg:pt-6">
          {FOLLOWUPS.map((f, i) => (
            <Reveal as="li" key={f.name} delay={0.08 * i} y={12} className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 sm:p-3.5 ${i === 2 ? "max-sm:hidden" : ""}`}>
              <Avatar name={f.name} tone={i === 1 ? "peach" : "ink"} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold text-white">{f.name}</p>
                <p className={`font-mono text-[11.5px] font-bold ${f.tone}`}>{f.note}</p>
              </div>
              <span className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/15 text-[#EDE6DE] min-[380px]:flex" aria-hidden>
                <Phone className="h-4 w-4" />
              </span>
              <span className="flex h-9 items-center gap-1.5 rounded-xl bg-[#15803D] px-3 text-[13px] font-bold text-white" aria-hidden>
                <MessageCircle className="h-4 w-4" /> <span className="hidden min-[380px]:inline">Message</span>
              </span>
            </Reveal>
          ))}
        </ul>
        <p className="mt-3 max-md:hidden sm:mt-4"><IllustrationTag dark>Illustration · sample customers</IllustrationTag></p>
      </div>
    </Reveal>
  );
}

/* — AI assistant — */
const AI_ROWS = [
  ["Amina Yusuf", "6", "₦54,000"],
  ["Tunde Okafor", "4", "₦36,000"],
  ["Chioma Eze", "3", "₦22,500"],
];

function AiTile() {
  return (
    <Reveal as="article" delay={0.06} className={`${tile} border-[#F0EBE4] bg-white md:order-2 lg:col-span-5`}>
      <TileHead icon={Sparkles} label="TENDA AI" title={<>Ask your business anything.</>} />
      <p className="mt-1.5 text-[14px] leading-[1.5] text-[#4A4038] sm:mt-2 sm:text-[15px] sm:leading-[1.6]">Chat or talk, in English or Pidgin. Answers come back as clear tables.</p>
      <div className="mt-4 space-y-2.5 max-md:hidden sm:mt-5">
        <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-[#1A1A1A] px-3.5 py-2 text-[13.5px] font-semibold text-white">
          Who are my best customers this month?
        </p>
        <div className="rounded-2xl rounded-bl-md border border-[#F0EBE4] bg-[#FFFCF9] p-3">
          <table className="w-full text-left text-[12.5px]">
            <caption className="sr-only">Example answer: top customers this month</caption>
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#6B6158]">
                <th scope="col" className="pb-1.5 font-bold">Customer</th>
                <th scope="col" className="pb-1.5 text-right font-bold">Orders</th>
                <th scope="col" className="pb-1.5 text-right font-bold">Spent</th>
              </tr>
            </thead>
            <tbody>
              {AI_ROWS.map(([n, o, s], i) => (
                <tr key={n} className="border-t border-[#F0EBE4]">
                  <td className="py-1.5 font-semibold">
                    {i === 0 && <span className="mr-1 text-[#E85D04]" aria-hidden>●</span>}
                    {n}
                  </td>
                  <td className="py-1.5 text-right font-mono">{o}</td>
                  <td className="py-1.5 text-right font-mono font-bold">{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Reveal>
  );
}

/* — customer profiles — */
function ProfileTile() {
  const pts = [8, 14, 11, 18, 15, 22, 19, 27];
  const max = 30;
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * 100} ${40 - (v / max) * 36}`).join(" ");
  return (
    <Reveal as="article" delay={0.12} className={`${tile} border-[#F0EBE4] bg-white md:order-3 lg:col-span-5`}>
      <TileHead icon={UserRound} label="Customer profiles" title={<>Know every customer by heart.</>} />
      <p className="mt-1.5 text-[14px] leading-[1.5] text-[#4A4038] md:hidden">What each customer spends, how often they buy and what they always come back for.</p>
      <div className="mt-5 max-md:hidden rounded-2xl border border-[#F0EBE4] bg-[#FFFCF9] p-4">
        <div className="flex items-center gap-3">
          <Avatar name="Amina Yusuf" size={38} />
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-bold">Amina Yusuf</p>
            <p className="text-[12px] font-semibold text-[#6B6158]">Customer since March</p>
          </div>
          <svg viewBox="0 0 100 42" className="h-10 w-24" aria-hidden>
            <path d={`${path} L100 42 L0 42 Z`} fill="#FFF0E6" />
            <path d={path} fill="none" stroke="#E85D04" strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[#F0EBE4] pt-3">
          {[
            ["Total spent", "₦54,000"],
            ["Buys every", "~12 days"],
            ["Last buy", "17d ago"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] font-semibold text-[#6B6158]">{k}</dt>
              <dd className="mt-0.5 font-mono text-[13px] font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Reveal>
  );
}

/* — voice — */
function VoiceTile() {
  return (
    <Reveal as="article" delay={0} className={`${tile} border-[#FFD4B3] bg-[#FFF0E6] max-md:p-4 md:order-4 lg:col-span-4`}>
      <TileHead icon={Mic} label="Voice logging" title={<>Just say the sale.</>} />
      <p className="mt-1.5 text-[14px] leading-[1.5] text-[#4A4038] md:mt-2 md:text-[15px] md:leading-[1.6]">Hands full? Speak it. TENDA fills the form for you to confirm.</p>
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white p-2 shadow max-md:hidden md:mt-5 md:gap-3 md:p-3-[0_10px_30px_-18px_rgba(232,93,4,0.6)]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E85D04] text-white md:h-10 md:w-10">
          <Mic aria-hidden className="h-[18px] w-[18px]" />
        </span>
        <div aria-hidden className="flex h-7 flex-1 items-center gap-[3px] overflow-hidden">
          {Array.from({ length: 26 }).map((_, i) => (
            <span
              key={i}
              className="wave-bar w-[3px] rounded-full bg-[#E85D04]/80"
              style={{ height: `${25 + ((i * 53) % 75)}%`, animationDelay: `${(i % 9) * 0.08}s` }}
            />
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/* — insights — */
const WEEKS = [42, 58, 51, 66, 61, 79, 72, 92];

function InsightsTile() {
  const reduce = usePrefersReducedMotion();
  return (
    <Reveal as="article" delay={0.06} className={`${tile} border-[#F0EBE4] bg-white md:order-5 lg:col-span-5`}>
      <TileHead icon={BarChart3} label="Insights" title={<>See what’s working.</>} />
      <p className="mt-1.5 text-[14px] leading-[1.5] text-[#4A4038] md:hidden">Your revenue trend, best sellers and best days, with plain-English tips on what to do next.</p>
      <div className="mt-5 flex items-end gap-1.5 max-md:hidden" role="img" aria-label="Illustration: weekly revenue bars trending upward">
        {WEEKS.map((h, i) => (
          <motion.span
            key={i}
            className={`block flex-1 origin-bottom rounded-t-md ${i === WEEKS.length - 1 ? "bg-[#E85D04]" : "bg-[#FFD4B3]"}`}
            style={{ height: `${h}px` }}
            initial={{ scaleY: reduce ? 1 : 0.1 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.7, delay: reduce ? 0 : i * 0.05, ease: EASE }}
          />
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#F0EBE4] pt-4 text-[13px] max-md:hidden">
        <div>
          <dt className="font-semibold text-[#6B6158]">Best seller</dt>
          <dd className="mt-0.5 font-bold">Shea Butter 250g</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#6B6158]">Best day</dt>
          <dd className="mt-0.5 font-bold">Saturday</dd>
        </div>
      </dl>
    </Reveal>
  );
}

/* — Naira / Lagos / any phone — with a live Lagos clock — */
function useLagosTime() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" });
    const tick = () => setNow(fmt.format(new Date()));
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 15_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return now;
}

function LocalTile() {
  const time = useLagosTime();
  return (
    <Reveal as="article" delay={0.12} className={`${tile} border-[#F0EBE4] bg-[#FFFDFB] max-md:p-4 md:order-6 md:col-span-2 lg:col-span-3`}>
      <p aria-hidden className="font-display text-[44px] font-extrabold leading-[0.9] md:text-[88px] tracking-[-0.06em] text-[#E85D04]">₦</p>
      <h3 className="mt-1.5 font-display text-[18px] font-bold leading-[1.2] tracking-[-0.03em] md:mt-3 md:text-[21px]">Made for here.</h3>
      <ul className="mt-2 space-y-1 text-[12.5px] font-semibold text-[#4A4038] md:mt-3 md:space-y-1.5 md:text-[14px]">
        <li>Naira amounts, always</li>
        <li className="flex items-center gap-1.5">
          Lagos time
          <span className="rounded-md bg-[#FFF0E6] px-1.5 py-0.5 font-mono text-[11.5px] font-bold text-[#B03D00]">
            {time ?? "--:--"} WAT
          </span>
        </li>
        <li className="flex items-center gap-1.5">
          <Smartphone aria-hidden className="h-4 w-4 text-[#6B6158]" /> Any phone browser
        </li>
      </ul>
    </Reveal>
  );
}

export default function FeatureBento() {
  return (
    <section id="features" aria-labelledby="features-title" className="grain relative bg-[#FFF6EE]">
      <div className="relative z-[1] mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-32 lg:px-8">
        <div className="grid gap-2.5 sm:gap-6 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <Eyebrow>Features</Eyebrow>
            <h2 id="features-title" className="mt-2.5 font-display text-[28px] sm:mt-5 font-bold leading-[1.04] tracking-[-0.04em] sm:text-[52px] lg:text-[60px]">
              Everything your notebook <span className="text-[#E85D04]">can’t</span> do.
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-5">
            <p className="max-w-[440px] text-[15px] leading-[1.55] text-[#4A4038] sm:text-[17px] sm:leading-[1.65]">
              One simple app that remembers every customer, spots who’s due and tells you what’s selling.
            </p>
          </Reveal>
        </div>

        <div className="mt-5 grid gap-3 sm:mt-16 sm:gap-4 md:grid-cols-2 lg:grid-cols-12">
          <FollowUpsTile />
          <div className="grid gap-3 md:contents">
            <AiTile />
            <ProfileTile />
            <InsightsTile />
          </div>
          <div className="grid grid-cols-2 gap-3 md:contents">
            <VoiceTile />
            <LocalTile />
          </div>
        </div>
      </div>
    </section>
  );
}
