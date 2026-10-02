import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales",
  description: "Every sale you have logged, typed or spoken.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
