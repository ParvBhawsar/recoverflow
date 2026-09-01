import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Strategy benchmark",
  description: "Compare contextual recovery against a deliberately naive blind-retry baseline.",
};

export default function BenchmarkLayout({ children }: { children: ReactNode }) {
  return children;
}
