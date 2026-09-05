import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Strategy benchmark · RecoverFlow",
  description: "Technical validation comparing contextual recovery against a deliberately naive blind-retry baseline.",
  robots: { index: false, follow: false },
};

export default function BenchmarkLayout({ children }: { children: ReactNode }) {
  return children;
}
