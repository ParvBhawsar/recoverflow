"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const primaryNav = [
  { href: "/dashboard", label: "Overview", shortLabel: "Home", icon: "home" },
  { href: "/cases", label: "Recovery cases", shortLabel: "Cases", icon: "inbox" },
  { href: "/analytics", label: "Insights", shortLabel: "Insights", icon: "chart" },
  { href: "/settings/policy", label: "Safeguards", shortLabel: "Rules", icon: "shield" },
];

const toolNav = [
  { href: "/simulator", label: "Test sandbox", icon: "bolt" },
];

function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "home") return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-7h5v7"/></svg>;
  if (name === "inbox") return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M4 5h16v14H4z"/><path d="M4 14h4l2 3h4l2-3h4"/></svg>;
  if (name === "bolt") return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M13.5 2 5 13h6l-1 9 8.5-12h-6l1-8Z"/></svg>;
  if (name === "chart") return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20V8"/></svg>;
  if (name === "shield") return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M12 3 5 6v5c0 4.8 2.8 8.1 7 10 4.2-1.9 7-5.2 7-10V6l-7-3Z"/><path d="m9.5 12 1.7 1.7 3.8-4"/></svg>;
  if (name === "external") return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M14 5h5v5"/><path d="m19 5-8 8"/><path d="M18 13v6H5V6h6"/></svg>;
  if (name === "help") return <svg viewBox="0 0 24 24" className={className} {...common}><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.7 2c-.9.5-1.5 1-1.5 2"/><path d="M12 17h.01"/></svg>;
  if (name === "chevron") return <svg viewBox="0 0 24 24" className={className} {...common}><path d="m9 18 6-6-6-6"/></svg>;
  return null;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="RecoverFlow home">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[11px] bg-[#2f5bff] shadow-[0_6px_18px_rgba(47,91,255,.24)]">
        <span className="relative z-10 text-[16px] font-black tracking-[-0.08em] text-white">RF</span>
        <span className="absolute -bottom-5 -right-5 h-10 w-10 rounded-full bg-white/15 transition-transform duration-500 group-hover:scale-125" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[15px] font-[760] tracking-[-0.03em] text-[#111a35]">RecoverFlow</span>
          <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.15em] text-[#9aa3b7]">Payment recovery</span>
        </span>
      )}
    </Link>
  );
}

export function AppShell({
  children,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-[#111a35]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[228px] border-r border-[#e7eaf1] bg-white lg:flex lg:flex-col">
        <div className="px-5 pb-4 pt-5"><Brand /></div>

        <div className="mx-4 rounded-[10px] border border-[#e7ebf3] bg-[#fafbfe] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[9px] font-extrabold text-[#38445f]">Merchant workspace</p>
              <p className="mt-0.5 truncate text-[8px] font-medium text-[#9aa2b0]">Razorpay integration</p>
            </div>
            <span className="rounded-full border border-[#dfe5f1] bg-white px-2 py-1 text-[7px] font-extrabold uppercase tracking-[.08em] text-[#61708c]">Test</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5">
          <p className="px-3 text-[8px] font-extrabold uppercase tracking-[0.17em] text-[#a0a8b8]">Operations</p>
          <div className="mt-2 space-y-1">
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[11px] font-semibold transition-all duration-200 ${
                  active(item.href)
                    ? "bg-[#eef3ff] text-[#234fdc] shadow-[inset_0_0_0_1px_rgba(47,91,255,.05)]"
                    : "text-[#5f6980] hover:bg-[#f7f8fb] hover:text-[#1d2947]"
                }`}
              >
                <Icon
                  name={item.icon}
                  className={`h-[16px] w-[16px] ${active(item.href) ? "text-[#2f5bff]" : "text-[#8790a5] group-hover:text-[#5f6a83]"}`}
                />
                {item.label}
              </Link>
            ))}
          </div>

          <p className="mt-7 px-3 text-[8px] font-extrabold uppercase tracking-[0.17em] text-[#a0a8b8]">Testing</p>
          <div className="mt-2 space-y-1">
            {toolNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[11px] font-semibold transition-all duration-200 ${
                  active(item.href)
                    ? "bg-[#eef3ff] text-[#234fdc]"
                    : "text-[#5f6980] hover:bg-[#f7f8fb] hover:text-[#1d2947]"
                }`}
              >
                <Icon name={item.icon} className={`h-[16px] w-[16px] ${active(item.href) ? "text-[#2f5bff]" : "text-[#8790a5]"}`} />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="m-3 space-y-2">
          <a
            href={`${apiBase}/docs`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[10px] font-semibold text-[#748096] transition hover:bg-[#f7f8fb] hover:text-[#26334f]"
          >
            <span className="flex items-center gap-2"><Icon name="help" className="h-4 w-4"/>Developer docs</span>
            <Icon name="external" className="h-3 w-3"/>
          </a>
          <div className="rounded-[11px] border border-[#e7ebf2] bg-[#fafbfe] px-3 py-3">
            <div className="flex items-center gap-2 text-[9px] font-bold text-[#657087]"><span className="h-2 w-2 rounded-full bg-[#9da7ba]"/>Razorpay Test Mode</div>
            <p className="mt-1.5 text-[8px] leading-4 text-[#959dad]">Signed webhook integration enabled.</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[228px]">
        <header className="sticky top-0 z-30 border-b border-[#e7eaf1] bg-white/92 backdrop-blur-xl">
          <div className="flex min-h-[66px] items-center gap-3 px-4 py-2.5 sm:px-5 md:px-7 lg:px-8">
            <div className="lg:hidden"><Brand compact /></div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[14px] font-[760] tracking-[-0.025em] text-[#16213f] sm:text-[15px]">{title}</h1>
              {description && <p className="mt-0.5 hidden truncate text-[9px] font-medium text-[#8a93a8] sm:block">{description}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={`${apiBase}/docs`}
                target="_blank"
                rel="noreferrer"
                aria-label="Developer documentation"
                className="hidden h-8 w-8 place-items-center rounded-[9px] border border-[#e1e5ed] bg-white text-[#778196] transition hover:bg-[#f8f9fb] sm:grid lg:hidden"
              >
                <Icon name="help" className="h-4 w-4"/>
              </a>
              {actions}
            </div>
          </div>
        </header>

        <main className="animate-page-in px-4 pb-[88px] pt-5 sm:px-5 md:px-7 md:py-7 lg:px-8 lg:pb-7">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-[#e4e8f0] bg-white/96 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_28px_rgba(18,30,62,.06)] backdrop-blur-xl lg:hidden">
        {primaryNav.map((item) => (
          <Link key={item.href} href={item.href} className={`flex min-w-0 flex-col items-center gap-1 rounded-[10px] px-1 py-1.5 text-[8px] font-bold transition ${active(item.href) ? "text-[#2f5bff]" : "text-[#8992a4]"}`}>
            <span className={`grid h-7 w-9 place-items-center rounded-[9px] ${active(item.href) ? "bg-[#eef3ff]" : ""}`}><Icon name={item.icon} className="h-[16px] w-[16px]"/></span>
            <span className="truncate">{item.shortLabel}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  const tones = {
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
    warning: "border-amber-100 bg-amber-50 text-amber-700",
    danger: "border-rose-100 bg-rose-50 text-rose-700",
    info: "border-sky-100 bg-sky-50 text-sky-700",
    neutral: "border-[#e3e7ee] bg-[#f7f8fa] text-[#667086]",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.06em] ${tones[tone]}`}>{label}</span>;
}

export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[15px] border border-[#e5e9f1] bg-white shadow-[0_6px_22px_rgba(21,32,65,.032)] ${className}`}>{children}</section>;
}

export function Metric({ label, value, detail, accent = "blue" }: { label: string; value: string; detail?: string; accent?: "blue" | "green" | "violet" | "amber" }) {
  const accentClass = { blue: "bg-blue-50 text-[#2f5bff]", green: "bg-emerald-50 text-emerald-600", violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600" }[accent];
  return (
    <div className="rounded-[15px] border border-[#e5e9f1] bg-white p-4 shadow-[0_4px_18px_rgba(21,32,65,.03)] transition duration-200 hover:-translate-y-0.5 hover:border-[#dbe1ec] hover:shadow-[0_10px_28px_rgba(21,32,65,.055)]">
      <div className="flex items-center justify-between gap-3"><p className="text-[8px] font-extrabold uppercase tracking-[0.11em] text-[#8c95a8]">{label}</p><span className={`h-6 w-6 rounded-lg ${accentClass}`} /></div>
      <p className="mt-3 text-[23px] font-[780] tracking-[-0.04em] text-[#14203d]">{value}</p>
      {detail && <p className="mt-1 text-[9px] font-medium text-[#929aad]">{detail}</p>}
    </div>
  );
}

export function SubtleLink({ href, children, external = false }: { href: string; children: ReactNode; external?: boolean }) {
  const content = <span className="inline-flex items-center gap-1.5">{children}<Icon name={external ? "external" : "chevron"} className="h-3 w-3"/></span>;
  if (external) return <a href={href} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-[#2f5bff] hover:underline">{content}</a>;
  return <Link href={href} className="text-[9px] font-bold text-[#2f5bff] hover:underline">{content}</Link>;
}
