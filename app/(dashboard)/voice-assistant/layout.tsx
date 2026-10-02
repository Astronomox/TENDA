import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voice",
  description: "Ask TENDA about your business by voice.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
