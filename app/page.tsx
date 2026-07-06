"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, CirclePlay, Repeat, MessageSquare, TrendingUp, Smartphone,
  Users, Bell, BarChart2, ShieldCheck, Sparkles, Star, Menu, X,
  Clock, Target, Zap, Heart, CheckCircle2, Store, Phone,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Stories", href: "#stories" },
  { label: "Pricing", href: "#pricing" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

/* Animated living background - slow floating gradient orbs */
function LiveBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.22]"
        style={{ background: "radial-gradient(circle, #FF8C42, transparent 70%)", filter: "blur(70px)", top: "-10%", right: "-5%" }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full opacity-[0.14]"
        style={{ background: "radial-gradient(circle, #E85D04, transparent 70%)", filter: "blur(80px)", bottom: "-5%", left: "-8%" }}
        animate={{ x: [0, 50, 0], y: [0, -40, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full opacity-[0.10]"
        style={{ background: "radial-gradient(circle, #FFD4B3, transparent 70%)", filter: "blur(60px)", top: "40%", left: "45%" }}
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="relative w-full bg-[#FFFDFB] font-sans text-[#1A1A1A] antialiased">

      {/* ═══ NAVBAR - solid backdrop always, never transparent over content ═══ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FFFDFB]/95 backdrop-blur-xl border-b border-[#F0EBE4] shadow-[0_1px_12px_rgba(0,0,0,0.03)]">
        <div className="flex h-[68px] items-center justify-between px-5 sm:px-8 max-w-6xl mx-auto">
          <a href="#hero" className="font-display font-extrabold text-2xl tracking-tight text-[#1A1A1A]">TENDA</a>
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#4A5568]">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-[#E85D04] transition-colors">{l.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm font-semibold text-[#4A5568] hover:text-[#1A1A1A] transition-colors px-3 py-2">Log in</Link>
            <Link href="/signup" className="hidden sm:inline-flex rounded-full bg-[#1A1A1A] hover:bg-[#E85D04] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 active:scale-95">Get started</Link>
            <button onClick={() => setMenuOpen(true)} aria-label="Open menu"
              className="md:hidden w-11 h-11 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center active:scale-95 transition shadow-sm">
              <Menu className="w-5 h-5 text-[#1A1A1A]" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══ MOBILE MENU ═══ */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] md:hidden">
            <div className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm" onClick={closeMenu} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute top-0 right-0 bottom-0 w-[80%] max-w-sm bg-[#FFFDFB] shadow-2xl flex flex-col">
              <div className="flex items-center justify-between h-[68px] px-6 border-b border-[#F0EBE4]">
                <span className="font-display font-extrabold text-xl">TENDA</span>
                <button onClick={closeMenu} aria-label="Close menu" className="w-10 h-10 rounded-xl bg-white border border-[#E8E8E4] flex items-center justify-center active:scale-95">
                  <X className="w-5 h-5 text-[#1A1A1A]" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 p-6">
                {NAV_LINKS.map((l) => (
                  <a key={l.href} href={l.href} onClick={closeMenu}
                    className="text-lg font-semibold text-[#1A1A1A] py-3 px-4 rounded-xl hover:bg-[#FFF0E6] hover:text-[#E85D04] transition-colors">{l.label}</a>
                ))}
              </nav>
              <div className="mt-auto p-6 flex flex-col gap-3 border-t border-[#F0EBE4]">
                <Link href="/login" onClick={closeMenu} className="w-full text-center py-3.5 rounded-xl border border-[#E8E8E4] font-semibold text-[#1A1A1A] active:scale-95 transition">Log in</Link>
                <Link href="/signup" onClick={closeMenu} className="w-full text-center py-3.5 rounded-xl bg-[#E85D04] text-white font-semibold shadow-[0_4px_20px_rgba(232,93,4,0.3)] active:scale-95 transition">Get started free</Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ SECTIONS ═══ */}

        {/* ─── HERO ─── */}
        <section id="hero" className="snap-section relative flex items-center pt-[68px]" style={{ background: "linear-gradient(170deg, #FFF6EE 0%, #FFFDFB 60%)" }}>
          <LiveBackground />
          <div className="relative w-full max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-10 items-center">
            <motion.div variants={stagger} initial="hidden" animate="visible">
              <motion.h1 variants={fadeUp} className="font-display font-extrabold text-[38px] leading-[1.05] sm:text-5xl lg:text-[60px] lg:leading-[1.02] text-[#1A1A1A] mb-5 tracking-tight">
                Turn one-time buyers into <span className="text-[#E85D04]">loyal customers</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-base lg:text-lg text-[#6B6B6B] max-w-md mb-6 leading-relaxed">
                TENDA tracks every sale and customer, then tells you exactly who to follow up with and when, so you grow without the guessing.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link href="/signup" className="group flex items-center justify-center gap-2 bg-[#E85D04] hover:bg-[#FF8C42] text-white px-7 py-3.5 rounded-2xl font-semibold shadow-[0_10px_40px_rgba(232,93,4,0.30)] transition-all active:scale-95">
                  Start for free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button className="flex items-center justify-center gap-2 bg-white text-[#1A1A1A] px-6 py-3.5 rounded-2xl font-semibold border border-[#E8E8E4] hover:border-[#E85D04] transition-all">
                  <CirclePlay className="w-5 h-5 text-[#E85D04]" /> Watch demo
                </button>
              </motion.div>
              {/* Trust row with checks - fills space */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-x-5 gap-y-2 mb-6">
                {["No card required", "Free forever", "5-min setup"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 text-sm text-[#4A5568] font-medium">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> {t}
                  </span>
                ))}
              </motion.div>
              <motion.div variants={fadeUp} className="flex items-center gap-3 pt-5 border-t border-[#F0EBE4]">
                <div className="flex -space-x-2">
                  {["AB", "TK", "ZM", "IF"].map((init) => (
                    <div key={init} className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFF0E6] to-[#FFD4B3] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#E85D04]">{init}</div>
                  ))}
                </div>
                <p className="text-sm text-[#6B6B6B]"><span className="font-bold text-[#1A1A1A]">500+ merchants</span> growing with TENDA</p>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="relative hidden lg:block">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
                <div className="rounded-[22px] bg-white border border-[#F0EBE4] shadow-[0_30px_70px_rgba(26,10,0,0.13)] overflow-hidden">
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#E85D04] to-[#FF8C42]" />
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-[10px] text-[#A0AEC0] font-semibold uppercase tracking-widest">Today</p>
                        <p className="font-display font-bold text-base text-[#1A1A1A]">Hello, Amina</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FFF0E6] to-[#FFD4B3] flex items-center justify-center font-bold text-[#E85D04] text-sm">A</div>
                    </div>
                    <div className="rounded-xl p-4 mb-3 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #E85D04, #FF8C42)" }}>
                      <p className="text-[10px] text-white/80 uppercase tracking-widest mb-1">Sales this month</p>
                      <p className="font-mono font-bold text-2xl mb-0.5">&#8358;245,000</p>
                      <p className="text-xs text-white/90 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Up 12.4%</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-[#FAFAF8] rounded-lg p-3 border border-[#E8E8E4]">
                        <p className="font-mono font-bold text-base text-[#1A1A1A]">128</p>
                        <p className="text-[10px] text-[#A0AEC0]">Customers</p>
                      </div>
                      <div className="bg-[#FAFAF8] rounded-lg p-3 border border-[#E8E8E4]">
                        <p className="font-mono font-bold text-base text-[#E85D04]">3</p>
                        <p className="text-[10px] text-[#A0AEC0]">Follow-ups</p>
                      </div>
                    </div>
                    <div className="bg-[#FFF0E6] rounded-lg p-3 border border-[#FFD4B3]">
                      <p className="text-[10px] font-semibold text-[#E85D04] uppercase tracking-widest mb-1">Follow up</p>
                      <p className="text-xs font-medium text-[#1A1A1A]">Tunde hasn&apos;t bought in 15 days</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section id="features" className="snap-section relative flex items-center bg-[#FFFDFB] py-20">
          <LiveBackground />
          <div className="relative w-full max-w-6xl mx-auto px-5 sm:px-8">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center max-w-2xl mx-auto mb-10">
                <h2 className="font-display font-extrabold text-3xl lg:text-[44px] text-[#1A1A1A] leading-[1.08] mb-3 tracking-tight">Everything you need to keep customers coming back</h2>
              <p className="text-[#6B6B6B] text-base leading-relaxed">No spreadsheets. No analysts. Just clear answers about who matters and what to do next.</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="md:col-span-2 bg-gradient-to-br from-[#FFF6EE] to-[#FFEDDD] rounded-2xl p-7 border border-[#FFD4B3] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 translate-x-1/4 -translate-y-1/4" style={{ background: "radial-gradient(circle, #FF8C42, transparent)" }} />
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-[#E85D04] flex items-center justify-center mb-4"><Repeat className="w-5 h-5 text-white" /></div>
                  <h3 className="font-display font-bold text-xl lg:text-2xl text-[#1A1A1A] mb-2 max-w-md">Turn past customers into repeat buyers</h3>
                  <p className="text-[#6B6B6B] text-sm leading-relaxed max-w-lg">TENDA spots who bought last month but went quiet, and tells you who to reach before you lose them. Repeat sales are where the real money is.</p>
                </div>
              </motion.div>
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="bg-white rounded-2xl p-7 border border-[#F0EBE4] hover:border-[#FFD4B3] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
                <div className="w-11 h-11 rounded-xl bg-[#F0FFF4] flex items-center justify-center mb-4"><MessageSquare className="w-5 h-5 text-[#16A34A]" /></div>
                <h3 className="font-display font-bold text-lg text-[#1A1A1A] mb-2">Follow-ups that feel like care</h3>
                <p className="text-[#6B6B6B] text-sm leading-relaxed">Ready-to-send WhatsApp messages from each customer&apos;s history.</p>
              </motion.div>
              {[
                { icon: TrendingUp, color: "#FFF0E6", ic: "#E85D04", title: "See what makes money", desc: "Track which products drive profit and repeat purchases." },
                { icon: Users, color: "#F0F4FF", ic: "#4A5568", title: "Full customer profiles", desc: "Every purchase, every date, all in one place." },
                { icon: Bell, color: "#FFFBF0", ic: "#D97706", title: "Smart reminders", desc: "Get notified when a loyal customer goes quiet." },
                { icon: BarChart2, color: "#FFF0E6", ic: "#E85D04", title: "Revenue at a glance", desc: "Daily, weekly, monthly trends. Catch dips early." },
              ].map((f) => (
                <motion.div key={f.title} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  className="bg-white rounded-2xl p-6 border border-[#F0EBE4] hover:border-[#FFD4B3] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: f.color }}><f.icon className="w-5 h-5" style={{ color: f.ic }} /></div>
                  <h3 className="font-display font-bold text-lg text-[#1A1A1A] mb-2">{f.title}</h3>
                  <p className="text-[#6B6B6B] text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS (denser, with stat band) ─── */}
        <section id="how" className="snap-section relative flex items-center bg-[#FFF6EE] py-20">
          <LiveBackground />
          <div className="relative w-full max-w-6xl mx-auto px-5 sm:px-8">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center max-w-2xl mx-auto mb-10">
                <h2 className="font-display font-extrabold text-3xl lg:text-[44px] text-[#1A1A1A] tracking-tight">Running in 5 minutes</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { step: "1", icon: Smartphone, title: "Set up your business", desc: "Tell TENDA your products, sales rhythm, and how you talk to customers." },
                { step: "2", icon: Users, title: "Add your customers", desc: "Import contacts or add them as they buy. Profiles build automatically." },
                { step: "3", icon: Bell, title: "Let TENDA guide you", desc: "Get daily prompts on who to follow up with and how revenue is trending." },
              ].map((item) => (
                <motion.div key={item.step} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  className="bg-white rounded-2xl p-6 border border-[#FFD4B3]/60">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#E85D04] text-white font-display font-bold text-lg flex items-center justify-center">{item.step}</div>
                    <item.icon className="w-5 h-5 text-[#FFD4B3]" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-[#1A1A1A] mb-2">{item.title}</h3>
                  <p className="text-[#6B6B6B] text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
            {/* Stat band fills space */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#1A1A1A] rounded-2xl p-7">
              {[
                { num: "500+", label: "Active merchants", icon: Store },
                { num: "₦50M+", label: "Sales tracked", icon: TrendingUp },
                { num: "12k+", label: "Customers managed", icon: Users },
                { num: "4.9", label: "Merchant rating", icon: Star, star: true },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <s.icon className="w-5 h-5 text-[#FF8C42] mx-auto mb-2" />
                  <p className="font-mono font-bold text-2xl text-white flex items-center justify-center gap-1">{s.num}{s.star && <Star className="w-4 h-4 fill-[#FF8C42] text-[#FF8C42]" />}</p>
                  <p className="text-[11px] text-white/50 mt-1">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── STORIES (denser, why-it-matters strip added) ─── */}
        <section id="stories" className="snap-section relative flex items-center bg-[#FFFDFB] py-20">
          <LiveBackground />
          <div className="relative w-full max-w-6xl mx-auto px-5 sm:px-8">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center max-w-2xl mx-auto mb-10">
                <h2 className="font-display font-extrabold text-3xl lg:text-[44px] text-[#1A1A1A] tracking-tight">Stories from the market</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { name: "Amina Bello", role: "Skincare vendor, Lagos", initials: "AB", quote: "I used to forget which customers bought last month. Now TENDA tells me before I even ask. My repeat sales went up 60%." },
                { name: "Tunde Okafor", role: "Fashion retailer, Abuja", initials: "TO", quote: "The follow-up messages are the best part. My customers think I am paying extra attention. I am just listening to TENDA." },
                { name: "Khadija Sadiq", role: "Food vendor, Kano", initials: "KS", quote: "I finally know which products to restock. I stopped wasting money on dead stock nobody buys." },
              ].map((t) => (
                <motion.div key={t.name} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  className="bg-white rounded-2xl p-6 border border-[#F0EBE4] flex flex-col gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#FF8C42] text-[#FF8C42]" />)}</div>
                  <p className="text-[#1A1A1A] text-sm leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-[#F0EBE4]">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFF0E6] to-[#FFD4B3] flex items-center justify-center text-sm font-bold text-[#E85D04]">{t.initials}</div>
                    <div><p className="font-bold text-[#1A1A1A] text-sm">{t.name}</p><p className="text-xs text-[#A0AEC0]">{t.role}</p></div>
                  </div>
                </motion.div>
              ))}
            </div>
            {/* Value strip */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Clock, title: "Save hours weekly", desc: "Stop digging through notebooks and WhatsApp chats." },
                { icon: Target, title: "Never lose a customer", desc: "Know the moment someone goes quiet." },
                { icon: Heart, title: "Build real loyalty", desc: "Personal follow-ups that keep people coming back." },
              ].map((v) => (
                <div key={v.title} className="flex items-start gap-3 bg-[#FFF6EE] rounded-xl p-4 border border-[#FFD4B3]/50">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-[#FFD4B3]"><v.icon className="w-4 h-4 text-[#E85D04]" /></div>
                  <div><p className="font-bold text-sm text-[#1A1A1A]">{v.title}</p><p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">{v.desc}</p></div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── PRICING + CTA + FULL FOOTER ─── */}
        <section id="pricing" className="snap-section relative flex flex-col bg-[#FFFDFB]">
          <LiveBackground />
          <div className="relative flex-1 flex items-center px-5 sm:px-8 py-14">
            <div className="w-full max-w-6xl mx-auto">
              <div className="relative rounded-[28px] overflow-hidden bg-[#1A1A1A] px-7 py-12 lg:py-16 text-center">
                <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at 50% 120%, #E85D04, transparent 60%)" }} />
                <motion.div className="absolute top-0 left-1/4 w-72 h-72 rounded-full opacity-20 -translate-y-1/2" style={{ background: "radial-gradient(circle, #FF8C42, transparent)", filter: "blur(60px)" }}
                  animate={{ x: [0, 40, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} />
                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="relative max-w-2xl mx-auto">
                  <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-6">
                    <ShieldCheck className="w-4 h-4 text-[#FF8C42]" />
                    <span className="text-xs font-semibold text-orange-200 uppercase tracking-widest">Free forever for small businesses</span>
                  </div>
                  <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-white mb-4 leading-[1.05] tracking-tight">Ready to grow without <span className="text-[#FF8C42]">the stress?</span></h2>
                  <p className="text-white/60 text-base lg:text-lg mb-7 leading-relaxed">Join 500+ Nigerian merchants using TENDA to understand their customers and grow revenue.</p>
                  <Link href="/signup" className="group inline-flex items-center gap-2 bg-[#E85D04] hover:bg-[#FF8C42] text-white px-8 py-4 rounded-2xl font-bold text-base lg:text-lg transition-all shadow-[0_10px_50px_rgba(232,93,4,0.45)] active:scale-95">
                    Start for free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <p className="text-white/30 text-sm mt-4">No card. No setup fee. Cancel anytime.</p>
                </motion.div>
              </div>
            </div>
          </div>

          {/* FULL FOOTER restored */}
          <footer className="relative bg-[#111] pt-12 pb-8">
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                <div className="col-span-2 md:col-span-1">
                  <span className="font-display font-extrabold text-2xl text-white">TENDA</span>
                  <p className="text-white/40 text-sm mt-3 leading-relaxed max-w-xs">Customer intelligence for Nigerian small businesses. Know your customers. Grow without stress.</p>
                  <div className="flex items-center gap-2 mt-4 text-white/40 text-sm">
                    <Phone className="w-4 h-4" /> Lagos, Nigeria
                  </div>
                </div>
                <div>
                  <p className="text-white/30 font-semibold uppercase tracking-widest text-xs mb-4">Product</p>
                  <div className="flex flex-col gap-3 text-sm">
                    <a href="#features" className="text-white/60 hover:text-[#E85D04] transition-colors">Features</a>
                    <a href="#how" className="text-white/60 hover:text-[#E85D04] transition-colors">How it works</a>
                    <a href="#stories" className="text-white/60 hover:text-[#E85D04] transition-colors">Stories</a>
                    <Link href="/dashboard" className="text-white/60 hover:text-[#E85D04] transition-colors">Dashboard</Link>
                  </div>
                </div>
                <div>
                  <p className="text-white/30 font-semibold uppercase tracking-widest text-xs mb-4">Account</p>
                  <div className="flex flex-col gap-3 text-sm">
                    <Link href="/login" className="text-white/60 hover:text-[#E85D04] transition-colors">Log in</Link>
                    <Link href="/signup" className="text-white/60 hover:text-[#E85D04] transition-colors">Sign up</Link>
                    <Link href="/sales" className="text-white/60 hover:text-[#E85D04] transition-colors">Sales</Link>
                    <Link href="/customers" className="text-white/60 hover:text-[#E85D04] transition-colors">Customers</Link>
                  </div>
                </div>
                <div>
                  <p className="text-white/30 font-semibold uppercase tracking-widest text-xs mb-4">Company</p>
                  <div className="flex flex-col gap-3 text-sm">
                    <a href="#" className="text-white/60 hover:text-[#E85D04] transition-colors">About</a>
                    <a href="#" className="text-white/60 hover:text-[#E85D04] transition-colors">Contact</a>
                    <a href="#" className="text-white/60 hover:text-[#E85D04] transition-colors">Privacy</a>
                    <a href="#" className="text-white/60 hover:text-[#E85D04] transition-colors">Terms</a>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className="text-white/30 text-xs">&copy; 2026 TENDA. All rights reserved.</p>
                <div className="flex gap-5 text-xs text-white/30">
                  <a href="#hero" className="hover:text-[#E85D04] transition-colors">Back to top</a>
                  <a href="#" className="hover:text-[#E85D04] transition-colors">Privacy</a>
                  <a href="#" className="hover:text-[#E85D04] transition-colors">Terms</a>
                </div>
              </div>
            </div>
          </footer>
        </section>

    </div>
  );
}
