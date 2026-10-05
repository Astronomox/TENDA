import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Sora } from "next/font/google";
import "./globals.css";

// Self-hosted at build time (no request to Google, preloaded, size-matched fallbacks so text doesn't jump).
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-manrope", display: "swap" });
const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sora", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://tenda-delta.vercel.app"),
  title: { default: "TENDA", template: "%s · TENDA" },
  description: "Turn one-time buyers into loyal customers.",
  applicationName: "TENDA",
  // favicon.ico, icon.png, apple-icon.png and opengraph/twitter images in app/ are picked up automatically
  openGraph: {
    type: "website",
    siteName: "TENDA",
    title: "TENDA",
    description: "Turn one-time buyers into loyal customers.",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: "TENDA",
    description: "Turn one-time buyers into loyal customers.",
  },
};

export const viewport: Viewport = {
  themeColor: "#F28334",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG" className={`${manrope.variable} ${sora.variable} ${jetbrains.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
