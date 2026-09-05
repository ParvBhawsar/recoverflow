import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Model validation · RecoverFlow",
  description: "Synthetic technical validation for RecoverFlow recovery strategy accuracy and safety.",
  robots: { index: false, follow: false },
};

export default function AnalyticsEvaluationLayout({ children }: { children: ReactNode }) {
  return children;
}
