import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insights",
  description: "Trends, best sellers and recommendations from your sales.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
