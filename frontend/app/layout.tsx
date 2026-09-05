import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import LandingExperience from "@/components/landing-experience";
import "./globals.css";
import "./landing-performance.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <LandingExperience />
      </body>
    </html>
  );
}
