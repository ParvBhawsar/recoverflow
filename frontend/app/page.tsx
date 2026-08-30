"use client";

import { useEffect, useState } from "react";

type RecoverySummary = {
  revenue_at_risk: number;
  recovered_revenue: number;
  active_cases: number;
  total_cases: number;
  recovery_rate: number;
  ai_plans?: number;
  model_plans?: number;
};

type RecoveryCase = {
  id: number;
  razorpay_payment_id: string;
  amount: number;
  currency: string;
  status: string;
  diagnosis: string | null;
  confidence: number | null;
  recommended_action: string | null;
  reason: string | null;
  attempt_count: number;
  recovered_amount: number;
  planner_source?: string | null;
  planner_model?: string | null;
  delay_minutes?: number | null;
  customer_tone?: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);

const pretty = (value?: string | null) =>
  value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

const isModelPlanner = (source?: string | null) => source === "openai" || source === "gemini";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [summary, setSummary] = useState<RecoverySummary | null>(null);
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [selected, setSelected] = useState<RecoveryCase | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Ready");
  const [recoveryUrl, setRecoveryUrl] = useState<string | null>(null);

  async function refresh() {
    setMessage("Refreshing…");
    try {
      const [summaryRes, casesRes] = await Promise.all([
        fetch(`${API_BASE}/recovery/summary`, { cache: "no-store" }),
        fetch(`${API_BASE}/recovery/cases`, { cache: "no-store" }),
      ]);
      if (!summaryRes.ok || !casesRes.ok) throw new Error("Backend request failed");
      const nextSummary = await summaryRes.json();
      const nextCases = await casesRes.json();
      setSummary(nextSummary);
      setCases(nextCases);
      if (nextCases.length) {
        setSelected((current) => nextCases.find((c: RecoveryCase) => c.id === current?.id) || nextCases[0]);
      } else {
        setSelected(null);
      }
      setMessage("Live data loaded");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach backend");
    }
  }

  async function simulateFailure() {
    setBusy(true);
    setRecoveryUrl(null);
    setMessage("Generating AI recovery plan…");
    try {
      const res = await fetch(`${API_BASE}/recovery/demo/failure`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Simulation failed");
      const source = isModelPlanner(data.planner_source)
        ? `${pretty(data.planner_source)} · ${data.planner_model}`
        : "Safety fallback";
      setMessage(`Demo case #${data.case_id} planned by ${source}`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Simulation failed");
    } finally {
      setBusy(false);
    }
  }

  async function executeRecovery() {
    if (!selected) return;
    setBusy(true);
    setRecoveryUrl(null);
    setMessage("Creating Razorpay recovery link…");
    try {
      const res = await fetch(`${API_BASE}/recovery/cases/${selected.id}/execute`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Execution failed");
      setRecoveryUrl(data.payment_link_url || null);
      setMessage("Recovery link created successfully");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  const aiBadge = isModelPlanner(selected?.planner_source)
    ? `AI · ${selected?.planner_model || pretty(selected?.planner_source)}`
    : selected?.planner_source
      ? "Safety Fallback"
      : "Legacy Case";

  return (
    <main className="relative z-10 min-h-screen bg-[#f5f7fb] text-[#16181d] pointer-events-auto">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3157e8] font-black text-white">R</div>
            <div>
              <h1 className="text-xl font-bold">RecoverFlow</h1>
              <p className="text-xs text-slate-500">AI Revenue Recovery Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              {mounted ? "JS ACTIVE" : "JS STARTING"}
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">AI Planner v0.6</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Merchant Intelligence</p>
            <h2 className="mt-2 text-4xl font-bold tracking-tight">Revenue recovery, without blind retries.</h2>
            <p className="mt-2 text-slate-600">{message}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setClicks((v) => v + 1)}
              className="relative z-20 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold shadow-sm hover:bg-slate-50"
            >
              Test Click: {clicks}
            </button>
            <button
              type="button"
              onClick={refresh}
              className="relative z-20 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold shadow-sm hover:bg-slate-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={simulateFailure}
              disabled={busy}
              className="relative z-20 cursor-pointer rounded-xl bg-[#3157e8] px-5 py-3 font-bold text-white shadow-sm hover:bg-[#2448cc] disabled:opacity-50"
            >
              {busy ? "Planning…" : "+ Simulate Failed Payment"}
            </button>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <Card label="Revenue at Risk" value={money(summary?.revenue_at_risk || 0)} />
          <Card label="Recovered Revenue" value={money(summary?.recovered_revenue || 0)} />
          <Card label="Recovery Rate" value={`${summary?.recovery_rate || 0}%`} />
          <Card label="AI-Planned Cases" value={`${summary?.model_plans || 0}/${summary?.ai_plans || 0}`} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h3 className="font-bold">Recovery Queue</h3>
              <p className="text-sm text-slate-500">Click any row to inspect the agent decision.</p>
            </div>
            {cases.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-lg font-bold">No recovery cases yet</p>
                <p className="mt-2 text-sm text-slate-500">Use “Simulate Failed Payment” above.</p>
              </div>
            ) : (
              <div className="divide-y">
                {cases.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setSelected(item); setRecoveryUrl(null); }}
                    className={`relative z-20 grid w-full cursor-pointer grid-cols-[1.3fr_.7fr_1fr] gap-4 px-6 py-4 text-left hover:bg-blue-50 ${selected?.id === item.id ? "bg-blue-50" : "bg-white"}`}
                  >
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-700">{item.razorpay_payment_id}</p>
                      <p className="mt-1 text-xs text-slate-500">{pretty(item.diagnosis)}</p>
                      {item.planner_source && (
                        <p className="mt-1 text-[11px] font-semibold text-blue-600">
                          {isModelPlanner(item.planner_source)
                            ? `AI · ${item.planner_model || pretty(item.planner_source)}`
                            : "Deterministic safety fallback"}
                        </p>
                      )}
                    </div>
                    <p className="font-bold">{money(item.amount)}</p>
                    <p className="text-sm font-semibold">{pretty(item.status)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-2xl bg-[#151a24] p-6 text-white shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Agent Inspector</p>
                <h3 className="mt-2 text-2xl font-bold">Decision trace</h3>
              </div>
              {selected && (
                <span className={`rounded-full px-3 py-2 text-[11px] font-bold ${isModelPlanner(selected.planner_source) ? "bg-violet-400/15 text-violet-200" : "bg-amber-400/15 text-amber-200"}`}>
                  {aiBadge}
                </span>
              )}
            </div>
            {!selected ? (
              <p className="mt-8 text-sm text-white/60">Create or select a recovery case.</p>
            ) : (
              <div className="mt-6 space-y-4">
                <Info label="Payment" value={selected.razorpay_payment_id} />
                <Info label="Amount" value={money(selected.amount)} />
                <Info label="Diagnosis" value={pretty(selected.diagnosis)} />
                <Info label="Action" value={pretty(selected.recommended_action)} />
                <Info label="Confidence" value={selected.confidence == null ? "—" : `${Math.round(selected.confidence * 100)}%`} />
                <div className="grid grid-cols-2 gap-3">
                  <Info label="Delay" value={selected.delay_minutes == null ? "—" : `${selected.delay_minutes} min`} />
                  <Info label="Customer Tone" value={pretty(selected.customer_tone)} />
                </div>
                <p className="rounded-xl bg-white/5 p-4 text-sm leading-6 text-white/70">{selected.reason || "No reasoning recorded."}</p>
                <p className="text-xs leading-5 text-white/45">AI proposes the next step. Deterministic policy still decides whether execution is allowed.</p>

                {selected.recommended_action === "CREATE_RECOVERY_LINK" && selected.status !== "RECOVERED" && (
                  <button
                    type="button"
                    onClick={executeRecovery}
                    disabled={busy}
                    className="relative z-20 w-full cursor-pointer rounded-xl bg-[#5c78ff] px-4 py-3 font-bold hover:bg-[#6e87ff] disabled:opacity-50"
                  >
                    Execute Recovery
                  </button>
                )}

                {selected.status === "RECOVERED" && (
                  <div className="rounded-xl bg-emerald-500/15 p-4 text-sm font-bold text-emerald-200">Revenue recovered successfully.</div>
                )}

                {recoveryUrl && (
                  <a
                    href={recoveryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="relative z-20 block break-all rounded-xl bg-emerald-500/15 p-4 text-sm font-bold text-emerald-200 underline"
                  >
                    Open Razorpay Payment Link
                  </a>
                )}
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-white/85">{value}</p>
    </div>
  );
}
