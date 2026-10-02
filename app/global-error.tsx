"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#FFFDFB", color: "#1A1A1A", textAlign: "center", padding: "80px 24px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>TENDA hit an unexpected problem.</h1>
        <p style={{ color: "#4A5568" }}>Please try again.</p>
        <button onClick={reset} style={{ marginTop: 16, background: "#E85D04", color: "#fff", border: 0, borderRadius: 12, padding: "12px 20px", fontWeight: 600 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
