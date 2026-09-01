"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type ReadyResponse = {
  status?: string;
  database?: string;
  policy?: string;
};

type Summary = {
  total_cases?: number;
  recovered_cases?: number;
  recovered_revenue?: number;
  revenue_at_risk?: number;
  late_success_protected_cases?: number;
  late_success_protected_value?: number;
};

type Benchmark = {
  run_id?: number;
  planner_model?: string;
  recoverflow?: { metrics?: { action_accuracy_pct?: number; unsafe_collection_attempts?: number; duplicate_risk_exposures?: number } };
  blind_retry?: { metrics?: { action_accuracy_pct?: number; unsafe_collection_attempts?: number; duplicate_risk_exposures?: number } };
  comparison?: { unsafe_collection_attempts_avoided?: number; duplicate_risk_exposures_avoided?: number };
};

const money = (paise = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);

export default function DemoPage() {
  const [ready, setReady] = useState<ReadyResponse | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [message, setMessage] = useState("Loading live production proof…");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [readyRes, summaryRes, benchmarkRes] = await Promise.all([
          fetch(`${API_BASE}/health/ready`, { cache: "no-store" }),
          fetch(`${API_BASE}/recovery/summary`, { cache: "no-store" }),
          fetch(`${API_BASE}/recovery/evaluation/benchmark/latest`, { cache: "no-store" }),
        ]);

        if (!readyRes.ok || !summaryRes.ok) throw new Error("Production API is not fully reachable");

        const nextReady = (await readyRes.json()) as ReadyResponse;
        const nextSummary = (await summaryRes.json()) as Summary;
        const nextBenchmark = benchmarkRes.ok ? ((await benchmarkRes.json()) as Benchmark) : null;

        if (!cancelled) {
          setReady(nextReady);
          setSummary(nextSummary);
          setBenchmark(nextBenchmark);
          setMessage("Live production evidence loaded");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Could not load live proof");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const systemReady = ready?.status === "ready";
  const accuracy = benchmark?.recoverflow?.metrics?.action_accuracy_pct;
  const blindAccuracy = benchmark?.blind_retry?.metrics?.action_accuracy_pct;

  const steps = useMemo(
    () => [
      {
        n: "01",
        title: "Trigger a failed payment",
        body: "Use the simulator or dashboard to create a Razorpay-style payment failure with realistic failure context.",
        href: "/simulator",
        cta: "Open Simulation Lab",
      },
      {
        n: "02",
        title: "Inspect the AI decision",
        body: "Gemini diagnoses the failure and proposes one bounded action: recover, wait-and-verify, or escalate.",
        href: "/",
        cta: "Open Recovery Queue",
      },
      {
        n: "03",
        title: "Show merchant guardrails",
        body: "The AI cannot move money directly. Merchant policy controls amount, confidence and retry limits before Razorpay execution.",
        href: "/settings/policy",
        cta: "Open Safety Rules",
      },
      {
        n: "04",
        title: "Execute through Razorpay",
        body: "A real Razorpay Test Mode Payment Link is created. Successful payment returns through a signed webhook and marks the case RECOVERED.",
        href: "/",
        cta: "Open Live Dashboard",
      },
      {
        n: "05",
        title: "Demonstrate duplicate protection",
        body: "If the original payment succeeds late, RecoverFlow cancels the open recovery path and records the protection in the audit timeline.",
        href: "/",
        cta: "Open Audit Trail",
      },
      {
        n: "06",
        title: "Prove it beats blind retry",
        body: "Run the blinded synthetic benchmark and compare contextual recovery against retrying every failure.",
        href: "/analytics/evaluation",
        cta: "Open Evaluation Analytics",
      },
    ],
    [],
  );

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#0b1638]">
      <header className="border-b border-[#e8ebf3] bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2f5bff] text-lg font-black text-white">R</div>
            <div>
              <p className="text-[17px] font-extrabold">RecoverFlow</p>
              <p className="text-[10px] font-semibold text-[#697391]">Judge Demo Mode · live production</p>
            </div>
          </div>
          <Link href="/" className="rounded-lg border border-[#dfe4ee] bg-white px-4 py-2 text-xs font-extrabold text-[#35405f]">Dashboard</Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-6 py-7">
        <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-[#e4e8f1] bg-white p-7 shadow-[0_10px_32px_rgba(31,45,94,0.05)]">
            <span className="rounded-md bg-[#edf2ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2f5bff]">6-minute judge flow</span>
            <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-[-0.04em] md:text-5xl">Revenue recovery without blind retries.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#68738f]">
              RecoverFlow investigates failed Razorpay payments, lets Gemini propose a bounded next action, enforces merchant-configured safety policy, executes through Razorpay, and stops duplicate collection when the original payment succeeds late.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/simulator" className="rounded-lg bg-[#2f5bff] px-5 py-3 text-sm font-extrabold text-white">Start live demo</Link>
              <Link href="/analytics/evaluation" className="rounded-lg border border-[#dce2ef] bg-white px-5 py-3 text-sm font-extrabold text-[#35405f]">Show benchmark evidence</Link>
            </div>
            <p className="mt-4 text-xs font-bold text-[#67718b]">{message}</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#244de3] via-[#2f5bff] to-[#6a60ff] p-6 text-white shadow-[0_14px_36px_rgba(47,91,255,0.22)]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-blue-100">Core architecture</p>
            <h2 className="mt-2 text-2xl font-extrabold">AI proposes. Policy decides. Razorpay executes.</h2>
            <div className="mt-6 space-y-3 text-xs leading-5 text-blue-50">
              <Proof text="Signed Razorpay webhooks + event-id idempotency" />
              <Proof text="Gemini structured planner with deterministic fallback" />
              <Proof text="Merchant-configured amount, confidence and attempt limits" />
              <Proof text="Late-success cancellation to prevent duplicate collection" />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Production system" value={systemReady ? "READY" : "CHECKING"} note="Render + Supabase" positive={systemReady} />
          <Metric label="Recovered revenue" value={money(summary?.recovered_revenue || 0)} note={`${summary?.recovered_cases || 0} confirmed cases`} />
          <Metric label="Late-success protected" value={String(summary?.late_success_protected_cases || 0)} note={`${money(summary?.late_success_protected_value || 0)} protected`} />
          <Metric label="Benchmark accuracy" value={accuracy == null ? "—" : `${accuracy}%`} note={blindAccuracy == null ? "Run benchmark to populate" : `blind retry: ${blindAccuracy}%`} />
        </section>

        <section className="mt-5 rounded-2xl border border-[#e4e8f1] bg-white p-6 shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7b849e]">Walkthrough</p>
              <h2 className="mt-1 text-2xl font-extrabold">What to show, in order.</h2>
            </div>
            <p className="text-xs font-semibold text-[#7b849e]">Keep the whole demo under 6 minutes.</p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {steps.map((step) => (
              <div key={step.n} className="rounded-xl border border-[#e8ebf2] bg-[#fbfcfe] p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-black text-[#2f5bff]">{step.n}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#8a93aa]">Live proof</span>
                </div>
                <h3 className="mt-3 text-base font-extrabold">{step.title}</h3>
                <p className="mt-2 min-h-16 text-xs leading-5 text-[#6b7591]">{step.body}</p>
                <Link href={step.href} className="mt-4 inline-flex text-xs font-extrabold text-[#2f5bff] hover:underline">{step.cta} →</Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <Callout title="Problem" body="Retrying every failed payment treats customer errors, bank outages and ambiguous final states as if they were identical." />
          <Callout title="RecoverFlow" body="Diagnose first, choose a bounded action, enforce policy, then execute — with auditability at every step." />
          <Callout title="Evidence" body="Real Razorpay Test Mode payment recovery + signed webhooks + synthetic blinded benchmark against blind retry." />
        </section>
      </div>
    </main>
  );
}

function Proof({ text }: { text: string }) {
  return <div className="flex items-start gap-2"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/15 text-[9px] font-black">✓</span><span>{text}</span></div>;
}

function Metric({ label, value, note, positive = false }: { label: string; value: string; note: string; positive?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#e4e8f1] bg-white p-5 shadow-[0_6px_22px_rgba(31,45,94,0.04)]">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#7b849e]">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${positive ? "text-emerald-600" : "text-[#152249]"}`}>{value}</p>
      <p className="mt-2 text-[11px] text-[#8a93aa]">{note}</p>
    </div>
  );
}

function Callout({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[#e4e8f1] bg-white p-5">
      <p className="text-sm font-extrabold">{title}</p>
      <p className="mt-2 text-xs leading-5 text-[#6b7591]">{body}</p>
    </div>
  );
}
