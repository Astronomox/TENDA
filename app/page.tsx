import type { Metadata, Viewport } from "next";
import SiteNav from "@/components/landing/SiteNav";
import Hero from "@/components/landing/Hero";
import ProblemShift from "@/components/landing/ProblemShift";
import HowItWorks from "@/components/landing/HowItWorks";
import FeatureBento from "@/components/landing/FeatureBento";
import TuesdayStory from "@/components/landing/TuesdayStory";
import BuiltFor from "@/components/landing/BuiltFor";
import Faq from "@/components/landing/Faq";
import FinalCta from "@/components/landing/FinalCta";

export const metadata: Metadata = {
  title: { absolute: "TENDA · Turn one-time buyers into regulars" },
  description:
    "Customer intelligence for Nigerian small businesses. Log sales by voice or text, learn each customer's buying rhythm, and get told who to follow up with on WhatsApp. Free to start.",
  openGraph: {
    title: "TENDA · Turn one-time buyers into regulars",
    description: "Log sales by voice, know who to follow up with, and grow repeat sales.",
    images: [{ url: "/videos/tenda-tour-poster.jpg", width: 1280, height: 800 }],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/videos/tenda-tour-poster.jpg"] },
};

// Phones lay the landing page out ~22% wider and scale it down to fit, so more fits on each screen.
// Desktop browsers ignore initial-scale. Users can still pinch-zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 0.82,
};

export default function LandingPage() {
  return (
    <div className="landing min-h-screen bg-[#FFFDFB] font-sans text-[#1A1A1A]">
      <SiteNav />
      <main id="main">
        <Hero />
        <ProblemShift />
        <HowItWorks />
        <FeatureBento />
        <TuesdayStory />
        <BuiltFor />
        <Faq />
      </main>
      <FinalCta />
    </div>
  );
}
