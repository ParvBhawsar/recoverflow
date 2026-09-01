import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Evaluation analytics",
  description: "Measure recovery strategy accuracy and safety against a blind-retry baseline.",
};

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return children;
}
