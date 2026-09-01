import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Merchant safeguards",
  description: "Configure deterministic limits around AI-assisted recovery execution.",
};

export default function SafeguardsLayout({ children }: { children: ReactNode }) {
  return children;
}
