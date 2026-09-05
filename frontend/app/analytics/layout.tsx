import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Recovery insights",
  description: "Merchant recovery performance, failure mix, decisions and operational safety signals.",
};

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return children;
}
