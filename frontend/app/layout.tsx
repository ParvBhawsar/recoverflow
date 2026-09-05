import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import LandingExperience from "@/components/landing-experience";
import "./globals.css";
import "./landing-performance.css";
import "./production-polish.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RecoverFlow — Revenue recovery without blind retries",
    template: "%s · RecoverFlow",
  },
  description:
    "AI-assisted revenue recovery for failed Razorpay payments with merchant safeguards and duplicate-charge protection.",
  applicationName: "RecoverFlow",
  keywords: ["Razorpay", "payment recovery", "revenue recovery", "payment operations", "failed payments"],
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${jetBrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <LandingExperience />
      </body>
    </html>
  );
}
