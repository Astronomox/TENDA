import type { Metadata } from "next";

export const metadata: Metadata = { title: "Message templates", description: "Saved follow-up messages." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
