import { login } from "@/lib/actions/auth";
import Link from "next/link";

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
        {/* Dark warm overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(160deg, rgba(26,10,0,0.82) 0%, rgba(232,93,4,0.55) 60%, rgba(26,10,0,0.90) 100%)",
          }}
        />

        {/* Floating glow blobs */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #FF8C42, transparent)", filter: "blur(80px)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <span className="font-display text-3xl text-white">TENDA</span>
        </div>

        {/* Main message */}
        <div className="relative z-10">
          <h2 className="font-display text-5xl text-white leading-tight mb-6">
            Know your<br />
            customers.<br />
            <span className="text-orange-300">Grow your money.</span>
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-xs">
            Track every sale, every customer, every naira, and know exactly who to reach out to next.
          </p>

          <div className="flex gap-8 mt-10 pt-10 border-t border-white/10">
            {[
              { num: "2x", label: "More repeat buyers" },
              { num: "₦0", label: "To get started" },
              { num: "5min", label: "Setup time" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-mono font-bold text-2xl text-white">{s.num}</p>
                <p className="text-white/40 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom testimonial */}
        <div className="relative z-10">
          <p className="text-white/50 text-sm italic leading-relaxed">
            &ldquo;Before Tenda, I lost customers and didn&apos;t even know it. Now I follow up before they forget me.&rdquo;
          </p>
          <p className="text-white/30 text-xs mt-2">- Blessing U., Skincare Vendor, Lagos</p>
        </div>
      </div>

      {/* RIGHT, Form Panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-[#FAFAF8] px-6 py-16 min-h-screen">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10 text-center">
          <span className="font-display text-4xl text-[#E85D04]">TENDA</span>
          <p className="text-sm text-[#4A5568] mt-2">Know your customers. Grow your money.</p>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="font-display text-4xl text-[#1A1A1A] mb-2 leading-tight">Welcome back</h1>
          <p className="text-[#4A5568] text-sm mb-8">Sign in to your account to continue</p>

          <form action={login} className="flex flex-col gap-5">
            <div>
              <label className="text-sm font-medium text-[#4A5568] mb-1.5 block">Email address</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-[#4A5568]">Password</label>
                <Link href="#" className="text-xs font-medium text-[#E85D04] hover:underline">Forgot password?</Link>
              </div>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
              />
            </div>

            <button
              type="submit"
              className="mt-1 bg-[#E85D04] hover:bg-[#FF8C42] active:scale-95 text-white font-semibold rounded-xl h-14 w-full transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)] text-base"
            >
              Sign in →
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#E8E8E4]" />
            <span className="text-xs text-[#A0AEC0] font-medium">OR</span>
            <div className="flex-1 h-px bg-[#E8E8E4]" />
          </div>

          <p className="text-sm text-[#4A5568] text-center">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-[#E85D04] hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
