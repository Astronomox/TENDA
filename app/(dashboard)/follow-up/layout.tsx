import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Follow-ups",
  description: "Customers who are due to buy again.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
