"use client";

import { useEffect } from "react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-4 py-16 text-center lg:px-0">
      <h1 className="font-display text-2xl font-extrabold text-[#1A1A1A]">Something went wrong on this page.</h1>
      <p className="mt-2 text-sm text-[#4A5568]">Your data is safe. Try again, and if it keeps happening, reload the app.</p>
      <button onClick={reset} className="mt-6 rounded-xl bg-[#E85D04] px-5 py-3 text-sm font-semibold text-white">
        Try again
      </button>
    </div>
  );
}
