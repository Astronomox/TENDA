import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customers",
  description: "Everyone who buys from you, with what they spend and how often.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
