"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, warmUp } from "@/lib/api";
import { getToken, safeNext } from "@/lib/auth";
import { Spinner } from "@/components/ui";
import { Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const expired = params.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    warmUp();
    if (getToken()) router.replace(next);
  }, [router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await auth.login(email, password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-4xl text-[#1A1A1A] mb-2 leading-tight">Welcome back</h1>
      <p className="text-[#4A5568] text-sm mb-8">Sign in to your account to continue</p>

      {expired && !error && (
        <div className="bg-[#FFF7F0] border border-[#F4C9A4] text-[#C94E00] text-sm rounded-xl px-4 py-3 mb-5">
          Your session ended. Please sign in again.
        </div>
      )}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-[#4A5568] mb-1.5 block">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium text-[#4A5568] mb-1.5 block">Password</label>
          <div className="relative">
          <input
            id="password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-[#A0AEC0] hover:text-[#4A5568]"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 bg-[#E85D04] hover:bg-[#FF8C42] active:scale-95 disabled:opacity-60 text-white font-semibold rounded-xl h-14 w-full transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)] text-base flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Spinner /> Signing in…
            </>
          ) : (
            "Sign in →"
          )}
        </button>
      </form>

      <p className="text-sm text-[#4A5568] text-center mt-8">
        Don&apos;t have an account?{" "}
        <Link
          href={next !== "/dashboard" ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-semibold text-[#E85D04] hover:underline"
        >
          Create one free
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full">

      {/* LEFT, Hero Panel (desktop only) */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(160deg, rgba(26,10,0,0.82) 0%, rgba(232,93,4,0.55) 60%, rgba(26,10,0,0.90) 100%)",
          }}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #FF8C42, transparent)", filter: "blur(80px)" }} />

        <div className="relative z-10">
          <span className="font-display text-3xl text-white">TENDA</span>
        </div>

        <div className="relative z-10">
          <h2 className="font-display text-5xl text-white leading-tight mb-6">
            Know your<br />
            customers.<br />
            <span className="text-orange-300">Grow your money.</span>
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-xs">
            Track every sale, every customer, every naira, and know exactly who to reach out to next.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-white/50 text-sm leading-relaxed">
            Log sales by voice, see who&apos;s due to buy again, and ask TENDA AI about your business.
          </p>
        </div>
      </div>

      {/* RIGHT, Form Panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-[#FAFAF8] px-6 py-16 min-h-screen">
        <div className="lg:hidden mb-10 text-center">
          <span className="font-display text-4xl text-[#E85D04]">TENDA</span>
          <p className="text-sm text-[#4A5568] mt-2">Know your customers. Grow your money.</p>
        </div>
        <Suspense fallback={<Spinner className="w-6 h-6 text-[#E85D04]" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
