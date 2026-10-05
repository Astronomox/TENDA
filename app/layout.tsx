import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="en-NG">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
