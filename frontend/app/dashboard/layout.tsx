import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Recovery console",
  description: "Live failed-payment recovery operations, decision traces and duplicate-charge protection.",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
