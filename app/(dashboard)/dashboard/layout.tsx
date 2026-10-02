import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description: "Your sales, customers and follow-ups at a glance.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
