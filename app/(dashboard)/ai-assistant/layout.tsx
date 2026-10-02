import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Chat",
  description: "Ask TENDA AI about your business.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
