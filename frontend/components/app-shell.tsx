"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/simulator", label: "Recovery sandbox", icon: "bolt" },
  { href: "/analytics/evaluation", label: "Analytics", icon: "chart" },
  { href: "/settings/policy", label: "Safeguards", icon: "shield" },
];

const secondary = [
  { href: "/benchmark", label: "Benchmark", icon: "compare" },
  { href: "/evaluation", label: "Dataset", icon: "database" },
];

function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "home") return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-7h5v7"/></svg>;
  if (name === "bolt") return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M13.5 2 5 13h6l-1 9 8.5-12h-6l1-8Z"/></svg>;
  if (name === "chart") return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20V8"/></svg>;
  if (name === "shield") return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M12 3 5 6v5c0 4.8 2.8 8.1 7 10 4.2-1.9 7-5.2 7-10V6l-7-3Z"/><path d="m9.5 12 1.7 1.7 3.8-4"/></svg>;
  if (name === "compare") return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M8 7h12"/><path d="m16 3 4 4-4 4"/><path d="M16 17H4"/><path d="m8 13-4 4 4 4"/></svg>;
  if (name === "database") return <svg viewBox="0 0 24 24" className={className} {...common}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>;
  if (name === "external") return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M14 5h5v5"/><path d="m19 5-8 8"/><path d="M18 13v6H5V6h6"/></svg>;
  return null;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-[#2f5bff] shadow-[0_5px_15px_rgba(47,91,255,.24)]">
        <span className="relative z-10 text-[17px] font-black tracking-[-0.08em] text-white">RF</span>
        <span className="absolute -bottom-5 -right-5 h-10 w-10 rounded-full bg-white/15 transition-transform duration-500 group-hover:scale-125" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[15px] font-[760] tracking-[-0.03em] text-[#111a35]">RecoverFlow</span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-[#9aa3b7]">Revenue recovery</span>
        </span>
      )}
    </Link>
  );
}

export function AppShell({ children, title, description, actions }: { children: ReactNode; title: string; description?: string; actions?: ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-[#111a35]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] border-r border-[#e7eaf1] bg-white lg:flex lg:flex-col">
        <div className="px-5 py-5"><Brand /></div>
        <div className="mx-4 h-px bg-[#eef0f5]" />
        <nav className="flex-1 px-3 py-5">
          <p className="px-3 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#a0a8b8]">Operations</p>
          <div className="mt-2 space-y-1">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={`group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[12px] font-semibold transition-all duration-200 ${active(item.href) ? "bg-[#eef3ff] text-[#234fdc]" : "text-[#5f6980] hover:bg-[#f7f8fb] hover:text-[#1d2947]"}`}>
                <Icon name={item.icon} className={`h-[17px] w-[17px] ${active(item.href) ? "text-[#2f5bff]" : "text-[#8790a5] group-hover:text-[#5f6a83]"}`} />
                {item.label}
              </Link>
            ))}
          </div>

          <p className="mt-7 px-3 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#a0a8b8]">Validation</p>
          <div className="mt-2 space-y-1">
            {secondary.map((item) => (
              <Link key={item.href} href={item.href} className={`group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[12px] font-semibold transition-all duration-200 ${active(item.href) ? "bg-[#eef3ff] text-[#234fdc]" : "text-[#5f6980] hover:bg-[#f7f8fb] hover:text-[#1d2947]"}`}>
                <Icon name={item.icon} className={`h-[17px] w-[17px] ${active(item.href) ? "text-[#2f5bff]" : "text-[#8790a5]"}`} />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="m-3 rounded-xl border border-[#e5e9f2] bg-[#fafbfe] p-3.5">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#526078]"><span className="h-2 w-2 rounded-full bg-[#2f5bff] shadow-[0_0_0_3px_rgba(47,91,255,.10)]" />Razorpay integration</div>
          <p className="mt-2 text-[10px] leading-4 text-[#8b94a8]">Test Mode · signed webhooks · policy guarded</p>
          <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/docs`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-[#2f5bff] hover:underline">API reference <Icon name="external" className="h-3 w-3" /></a>
        </div>
      </aside>

      <div className="lg:pl-[236px]">
        <header className="sticky top-0 z-30 border-b border-[#e7eaf1] bg-white/90 backdrop-blur-xl">
          <div className="flex h-[68px] items-center gap-4 px-5 md:px-7 lg:px-8">
            <div className="lg:hidden"><Brand compact /></div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-[760] tracking-[-0.025em] text-[#16213f]">{title}</h1>
              {description && <p className="mt-0.5 hidden truncate text-[10px] font-medium text-[#8a93a8] sm:block">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          <nav className="flex overflow-x-auto border-t border-[#f0f2f6] px-3 lg:hidden">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[10px] font-bold ${active(item.href) ? "border-[#2f5bff] text-[#2f5bff]" : "border-transparent text-[#7d879c]"}`}>{item.label}</Link>
            ))}
          </nav>
        </header>
        <main className="animate-page-in px-4 py-5 md:px-7 md:py-7 lg:px-8">{children}</main>
      </div>
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
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.06em] ${tones[tone]}`}>{label}</span>;
}

export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[14px] border border-[#e5e9f1] bg-white shadow-[0_5px_18px_rgba(21,32,65,.035)] ${className}`}>{children}</section>;
}

export function Metric({ label, value, detail, accent = "blue", loading = false }: { label: string; value: string; detail?: string; accent?: "blue" | "green" | "violet" | "amber"; loading?: boolean }) {
  const accentClass = { blue: "bg-blue-50 text-[#2f5bff]", green: "bg-emerald-50 text-emerald-600", violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600" }[accent];
  return (
    <div className="rounded-[14px] border border-[#e5e9f1] bg-white p-4 shadow-[0_4px_16px_rgba(21,32,65,.03)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-3"><p className="text-[9px] font-extrabold uppercase tracking-[0.11em] text-[#8c95a8]">{label}</p><span className={`h-6 w-6 rounded-lg ${accentClass}`} /></div>
      {loading ? <div className="skeleton mt-3 h-7 w-28 rounded-lg" /> : <p className="mt-3 text-[24px] font-[780] tracking-[-0.04em] text-[#14203d]">{value}</p>}
      {loading ? <div className="skeleton mt-2 h-3 w-24 rounded" /> : detail && <p className="mt-1 text-[10px] font-medium text-[#929aad]">{detail}</p>}
    </div>
  );
}
