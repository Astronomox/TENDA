"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
    } else {
      setError("Check your email to confirm your account.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">

      {/* LEFT, Form Panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-[#FAFAF8] px-6 py-16 min-h-screen">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10 text-center">
          <span className="font-display text-4xl text-[#E85D04]">TENDA</span>
          <p className="text-sm text-[#4A5568] mt-2">Built for Nigerian merchants</p>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="font-display text-4xl text-[#1A1A1A] mb-2 leading-tight">Create your account</h1>
          <p className="text-[#4A5568] text-sm mb-8">Free forever. No card needed. Start in 5 minutes.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="text-sm font-medium text-[#4A5568] mb-1.5 block">Your name</label>
              <input
                type="text"
                placeholder="Amina Bello"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#4A5568] mb-1.5 block">Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#4A5568] mb-1.5 block">Password</label>
              <input
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 bg-[#E85D04] hover:bg-[#FF8C42] active:scale-95 disabled:opacity-60 text-white font-semibold rounded-xl h-14 w-full transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)] text-base"
            >
              {loading ? "Creating account..." : "Create free account →"}
            </button>
          </form>

          <p className="text-xs text-[#A0AEC0] text-center mt-4 leading-relaxed">
            By signing up you agree to our{" "}
            <Link href="#" className="text-[#E85D04] hover:underline">Terms</Link> and{" "}
            <Link href="#" className="text-[#E85D04] hover:underline">Privacy Policy</Link>
          </p>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#E8E8E4]" />
            <span className="text-xs text-[#A0AEC0] font-medium">OR</span>
            <div className="flex-1 h-px bg-[#E8E8E4]" />
          </div>

          <p className="text-sm text-[#4A5568] text-center">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#E85D04] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>

      {/* RIGHT, Hero Panel (desktop only) */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Warm dark overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(160deg, rgba(26,10,0,0.88) 0%, rgba(232,93,4,0.45) 55%, rgba(26,10,0,0.85) 100%)",
          }}
        />

        {/* Glow blob */}
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #FF8C42, transparent)", filter: "blur(80px)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <span className="font-display text-3xl text-white">TENDA</span>
        </div>

        {/* Main message */}
        <div className="relative z-10">
          <h2 className="font-display text-5xl text-white leading-tight mb-6">
            Every sale<br />
            tells a story.<br />
            <span className="text-orange-300">Read yours.</span>
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-xs">
            See which customers are loyal, which products move, and who needs a follow-up, all in one place.
          </p>

          {/* Feature list */}
          <div className="flex flex-col gap-4 mt-10">
            {[
              "Customer profiles with full purchase history",
              "Smart follow-up recommendations",
              "Revenue trends and growth insights",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#E85D04] flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-white/70 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-white/50 text-sm italic leading-relaxed">
            &ldquo;Tenda helped me realize 3 of my best customers hadn&apos;t bought in 6 weeks. I followed up and made ₦45,000 that weekend.&rdquo;
          </p>
          <p className="text-white/30 text-xs mt-2">- Khadija S., Beauty Vendor, Abuja</p>
        </div>
      </div>
    </div>
  );
}
