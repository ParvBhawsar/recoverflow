import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Recovery cases",
  description: "Review failed payments, recovery decisions, safeguards and audit activity.",
};

export default function CasesLayout({ children }: { children: ReactNode }) {
  return children;
}
