"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, warmUp } from "@/lib/api";
import { getToken, safeNext } from "@/lib/auth";
import { Spinner } from "@/components/ui";
import { Eye, EyeOff } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    warmUp();
    if (getToken()) router.replace(next);
  }, [router, next]);

  function validate(): string | null {
    if (!EMAIL_RE.test(email.trim())) return "Enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    // bcrypt on the backend caps passwords at 72 bytes (README §4.1).
    if (new TextEncoder().encode(password).length > 72) return "Password must be 72 characters or fewer.";
    if (name.trim().length > 80) return "Name must be 80 characters or fewer.";
    if (businessName.trim().length > 80) return "Business name must be 80 characters or fewer.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await auth.register({
        email: email.trim(),
        password,
        ...(name.trim() ? { full_name: name.trim() } : {}),
        ...(businessName.trim() ? { business_name: businessName.trim() } : {}),
      });
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
      setLoading(false);
    }
  }

  const input =
    "w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition";

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-4xl text-[#1A1A1A] mb-2 leading-tight">Create your account</h1>
      <p className="text-[#4A5568] text-sm mb-8">Free to start. No card needed.</p>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div>
          <label htmlFor="name" className="text-sm font-medium text-[#4A5568] mb-1.5 block">Your name</label>
          <input id="name" type="text" autoComplete="name" placeholder="e.g. Amina Bello" value={name}
            onChange={(e) => setName(e.target.value)} className={input} />
        </div>

        <div>
          <label htmlFor="business" className="text-sm font-medium text-[#4A5568] mb-1.5 block">
            Business name <span className="text-[#A0AEC0] font-normal">(optional)</span>
          </label>
          <input id="business" type="text" autoComplete="organization" placeholder="e.g. Amina Beauty" value={businessName}
            onChange={(e) => setBusinessName(e.target.value)} className={input} />
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium text-[#4A5568] mb-1.5 block">Email address</label>
          <input id="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} className={input} />
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium text-[#4A5568] mb-1.5 block">Password</label>
          <div className="relative">
          <input id="password" type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" value={password}
            onChange={(e) => setPassword(e.target.value)} className={`${input} pr-12`} />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-[#A0AEC0] hover:text-[#4A5568]"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          </div>
          <p className="mt-1.5 text-xs text-[#A0AEC0]">8 to 72 characters.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 bg-[#E85D04] hover:bg-[#FF8C42] active:scale-95 disabled:opacity-60 text-white font-semibold rounded-xl h-14 w-full transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)] text-base flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Spinner /> Creating account…
            </>
          ) : (
            "Create free account →"
          )}
        </button>
      </form>

      <p className="text-sm text-[#4A5568] text-center mt-8">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#E85D04] hover:underline">Sign in</Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen w-full">

      {/* LEFT, Form Panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-[#FAFAF8] px-6 py-16 min-h-screen">
        <div className="lg:hidden mb-10 text-center">
          <span className="font-display text-4xl text-[#E85D04]">TENDA</span>
          <p className="text-sm text-[#4A5568] mt-2">Built for Nigerian merchants</p>
        </div>
        <Suspense fallback={<Spinner className="w-6 h-6 text-[#E85D04]" />}>
          <SignupForm />
        </Suspense>
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
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(160deg, rgba(26,10,0,0.88) 0%, rgba(232,93,4,0.45) 55%, rgba(26,10,0,0.85) 100%)",
          }}
        />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #FF8C42, transparent)", filter: "blur(80px)" }} />

        <div className="relative z-10">
          <span className="font-display text-3xl text-white">TENDA</span>
        </div>

        <div className="relative z-10">
          <h2 className="font-display text-5xl text-white leading-tight mb-6">
            Every sale<br />
            tells a story.<br />
            <span className="text-orange-300">Read yours.</span>
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-xs">
            See which customers are loyal, which products move, and who needs a follow-up, all in one place.
          </p>

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

        <div className="relative z-10" />
      </div>
    </div>
  );
}
