"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Eyebrow, Reveal } from "./primitives";

const FAQS = [
  {
    q: "Is TENDA free to start?",
    a: "Yes. You can sign up and start logging sales for free. No card needed.",
  },
  {
    q: "Do I need to install an app?",
    a: "No. TENDA runs in your phone’s web browser, whether that’s Chrome, Safari or another one. It also works on a laptop.",
  },
  {
    q: "Can I speak Pidgin?",
    a: "Yes. You can talk or type to TENDA’s assistant in English or Pidgin, and log sales just by saying them.",
  },
  {
    q: "How does TENDA know who to follow up with?",
    a: "From the sales you log. Each sale teaches TENDA how often that customer usually buys. When someone goes past their usual gap, they show up in Follow-ups with a WhatsApp message ready to send.",
  },
  {
    q: "Can my customers see my data?",
    a: "No. Your sales and customer records are private to your account. A customer only hears from you when you choose to send a message.",
  },
  {
    q: "What do I need to get started?",
    a: "A phone (or any computer) with internet and an email address. Sign up, add a product or two, and log your first sale.",
  },
];

function Item({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <li className="border-b border-[#EADFD3]">
      <h3>
        <button
          type="button"
          id={`${id}-btn`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen((o) => !o)}
          className="group flex min-h-[52px] w-full items-center justify-between gap-4 py-3 text-left sm:gap-6 sm:py-6"
        >
          <span className="font-display text-[15.5px] font-semibold tracking-[-0.02em] text-[#1A1A1A] sm:text-[20px]">{q}</span>
          <span
            aria-hidden
            className={`flex h-8 w-8 shrink-0 items-center sm:h-9 sm:w-9 justify-center rounded-full border transition-all duration-300 ${
              open ? "rotate-45 border-[#E85D04] bg-[#E85D04] text-white" : "border-[#E2D5C8] text-[#1A1A1A] group-hover:border-[#E85D04]"
            }`}
          >
            <Plus className="h-4 w-4" />
          </span>
        </button>
      </h3>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-btn`}
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <p className="max-w-[640px] pb-4 pr-10 text-[14.5px] leading-[1.6] text-[#4A4038] sm:pb-6 sm:pr-12 sm:text-[16px] sm:leading-[1.7]">{a}</p>
        </div>
      </div>
    </li>
  );
}

export default function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="relative bg-[#FFFDFB]">
      <div className="mx-auto grid max-w-[1240px] gap-4 px-4 py-12 sm:gap-10 sm:px-6 sm:py-32 lg:grid-cols-12 lg:gap-12 lg:px-8">
        <Reveal className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <Eyebrow>FAQ</Eyebrow>
            <h2 id="faq-title" className="mt-2.5 font-display text-[28px] sm:mt-5 font-bold leading-[1.04] tracking-[-0.04em] sm:text-[48px]">
              Questions, answered.
            </h2>
            <p className="mt-4 hidden max-w-[340px] text-[16px] leading-[1.65] text-[#4A4038] sm:block">
              Still unsure? The fastest way to know is to try it. It’s free to start.
            </p>
            <Link
              href="/signup"
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[14.5px] font-bold text-[#C2410C] sm:mt-5 sm:min-h-0 sm:text-[15px] underline decoration-[#FFD4B3] decoration-2 underline-offset-4 transition-colors hover:decoration-[#E85D04]"
            >
              Create your free account
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.06} className="lg:col-span-8">
          <ul className="border-t border-[#EADFD3]">
            {FAQS.map((f, i) => (
              <Item key={f.q} q={f.q} a={f.a} defaultOpen={i === 0} />
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
