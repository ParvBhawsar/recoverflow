import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Evaluation dataset",
  description: "Versioned labelled payment-failure scenarios for reproducible recovery-strategy evaluation.",
};

export default function EvaluationLayout({ children }: { children: ReactNode }) {
  return children;
}
