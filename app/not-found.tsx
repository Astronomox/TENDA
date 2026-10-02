import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#FFFDFB] px-6 text-center">
      <p className="font-mono text-sm font-bold text-[#E85D04]">404</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-[#1A1A1A]">This page went missing.</h1>
      <p className="mt-2 max-w-sm text-sm text-[#4A5568]">The link may be old or mistyped.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="rounded-xl border border-[#E8E8E4] px-5 py-3 text-sm font-semibold text-[#1A1A1A]">Home</Link>
        <Link href="/dashboard" className="rounded-xl bg-[#E85D04] px-5 py-3 text-sm font-semibold text-white">Go to dashboard</Link>
      </div>
    </main>
  );
}
