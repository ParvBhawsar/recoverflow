import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Recovery sandbox",
  description: "Evaluate RecoverFlow against realistic Razorpay-style payment failures.",
};

export default function SimulatorLayout({ children }: { children: ReactNode }) {
  return children;
}
