"use client";

import { useEffect, useMemo, useState } from "react";

type RecoverySummary = {
  revenue_at_risk: number;
  recovered_revenue: number;
  active_cases: number;
  total_cases: number;
  recovery_rate: number;
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
  created_at: string;
  updated_at: string;
};

type ExecutionResult = {
  status: string;
  payment_link_url?: string | null;
  payment_link_id?: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function money(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function prettify(value?: string | null) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusTone(status: string) {
  if (status === "RECOVERED") return "success";
  if (status === "ESCALATED" || status === "FAILED") return "danger";
  if (status === "ORIGINAL_PAYMENT_CAPTURED" || status === "STOPPED") return "neutral";
  return "warning";
}

export default function Home() {
  const [summary, setSummary] = useState<RecoverySummary | null>(null);
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [selected, setSelected] = useState<RecoveryCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [execution, setExecution] = useState<ExecutionResult | null>(null);

  async function loadDashboard(showFeedback = false) {
    try {
      if (showFeedback) setRefreshing(true);
      setError(null);
      const [summaryResponse, casesResponse] = await Promise.all([
        fetch(`${API_BASE}/recovery/summary`, { cache: "no-store" }),
        fetch(`${API_BASE}/recovery/cases`, { cache: "no-store" }),
      ]);

      if (!summaryResponse.ok || !casesResponse.ok) {
        throw new Error("RecoverFlow API returned an error.");
      }

      const nextSummary: RecoverySummary = await summaryResponse.json();
      const nextCases: RecoveryCase[] = await casesResponse.json();
      setSummary(nextSummary);
      setCases(nextCases);
      setSelected((current) => {
        if (!nextCases.length) return null;
        if (!current) return nextCases[0];
        return nextCases.find((item) => item.id === current.id) ?? nextCases[0];
      });
      if (showFeedback) {
        setNotice("Dashboard refreshed");
        window.setTimeout(() => setNotice(null), 1800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reach the RecoverFlow API.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function simulateFailure() {
    setSimulating(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`${API_BASE}/recovery/demo/failure`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || "Unable to create demo failure.");
      }
      await loadDashboard();
      setNotice("Demo failed payment created");
      window.setTimeout(() => setNotice(null), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create demo failure.");
    } finally {
      setSimulating(false);
    }
  }

  async function executeRecovery() {
    if (!selected) return;
    setExecuting(true);
    setExecutionError(null);
    setExecution(null);

    try {
      const response = await fetch(`${API_BASE}/recovery/cases/${selected.id}/execute`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail || "Recovery execution failed.");
      }

      setExecution(payload);
      await loadDashboard();
    } catch (err) {
      setExecutionError(err instanceof Error ? err.message : "Unable to execute recovery.");
    } finally {
      setExecuting(false);
    }
  }

  function chooseCase(item: RecoveryCase) {
    setSelected(item);
    setExecution(null);
    setExecutionError(null);
  }

  useEffect(() => {
    loadDashboard();
    const timer = window.setInterval(() => loadDashboard(), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const recoveredCases = useMemo(
    () => cases.filter((item) => item.status === "RECOVERED").length,
    [cases],
  );

  const canExecute =
    selected?.recommended_action === "CREATE_RECOVERY_LINK" &&
    !["RECOVERED", "STOPPED", "ORIGINAL_PAYMENT_CAPTURED"].includes(selected.status);

  return (
    <main className="relative min-h-screen bg-[#f6f7fb] text-[#15171c]">
      <header className="relative z-10 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2f54eb] text-lg font-black text-white">R</div>
            <div>
              <div className="text-lg font-bold tracking-tight">RecoverFlow</div>
              <div className="text-xs text-[#737986]">AI Revenue Recovery Control Center</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-[#dfe4f0] bg-[#f8faff] px-3 py-1.5 text-xs font-medium text-[#4e596e] sm:inline-flex">Razorpay Test Mode</span>
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              className="cursor-pointer rounded-lg border border-[#dfe3eb] bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-[#f8f9fb] active:scale-[0.98]"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
        <section className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#2f54eb]">Merchant intelligence</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Revenue recovery, without blind retries.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#697080] sm:text-base">RecoverFlow turns failed payments into bounded recovery actions, while stopping automatically when the original payment succeeds.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={simulateFailure}
              disabled={simulating}
              className="cursor-pointer rounded-xl bg-[#2f54eb] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#2446cf] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {simulating ? "Creating demo case…" : "+ Simulate Failed Payment"}
            </button>
            <div className="flex items-center gap-2 text-sm text-[#6d7480]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1fb981]" />
              Auto-refreshing every 10 seconds
            </div>
          </div>
        </section>

        {notice && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-[#ffd7d2] bg-[#fff5f3] px-4 py-3 text-sm text-[#a63b31]">
            <span className="font-semibold">Backend issue:</span> {error} Make sure FastAPI is running at {API_BASE}.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Revenue at Risk" value={summary ? money(summary.revenue_at_risk) : "—"} note={`${summary?.active_cases ?? 0} active recovery cases`} />
          <MetricCard label="Recovered Revenue" value={summary ? money(summary.recovered_revenue) : "—"} note={`${recoveredCases} completed recoveries`} positive />
          <MetricCard label="Recovery Rate" value={summary ? `${summary.recovery_rate.toFixed(1)}%` : "—"} note="Recovered value / at-risk value" />
          <MetricCard label="Total Cases" value={summary ? String(summary.total_cases) : "—"} note="Tracked by recovery engine" />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_8px_35px_rgba(18,26,55,0.05)]">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-bold">Recovery Queue</h2>
                <p className="mt-1 text-xs text-[#7a8190]">Agent decisions across failed-payment cases</p>
              </div>
              <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-bold text-[#3556d8]">{cases.length} cases</span>
            </div>

            {loading ? (
              <div className="p-8 text-sm text-[#7a8190]">Loading recovery cases…</div>
            ) : cases.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-lg font-bold">No recovery cases yet</div>
                <p className="mt-2 text-sm text-[#7a8190]">Use “Simulate Failed Payment” above to create one instantly.</p>
                <button
                  type="button"
                  onClick={simulateFailure}
                  disabled={simulating}
                  className="mt-5 cursor-pointer rounded-xl bg-[#2f54eb] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2446cf] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {simulating ? "Creating…" : "Create Demo Case"}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-[#fafbfc] text-[11px] uppercase tracking-wider text-[#89909d]">
                    <tr>
                      <th className="px-6 py-3 font-bold">Payment</th>
                      <th className="px-4 py-3 font-bold">Amount</th>
                      <th className="px-4 py-3 font-bold">Diagnosis</th>
                      <th className="px-4 py-3 font-bold">Agent Action</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((item) => (
                      <tr key={item.id} onClick={() => chooseCase(item)} className={`cursor-pointer border-t border-black/[0.05] transition hover:bg-[#f8faff] ${selected?.id === item.id ? "bg-[#f5f7ff]" : ""}`}>
                        <td className="px-6 py-4">
                          <div className="max-w-[190px] truncate font-mono text-xs font-semibold text-[#3d4552]">{item.razorpay_payment_id}</div>
                          <div className="mt-1 text-xs text-[#9aa0aa]">Attempt {item.attempt_count + 1}</div>
                        </td>
                        <td className="px-4 py-4 font-bold">{money(item.amount, item.currency)}</td>
                        <td className="px-4 py-4 text-sm text-[#596170]">{prettify(item.diagnosis)}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-[#36445c]">{prettify(item.recommended_action)}</td>
                        <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-black/[0.06] bg-[#141923] p-6 text-white shadow-[0_8px_35px_rgba(18,26,55,0.09)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8294c8]">Agent Inspector</p>
                <h2 className="mt-2 text-xl font-bold">Decision trace</h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg">✦</div>
            </div>

            {!selected ? (
              <p className="mt-8 text-sm leading-6 text-white/55">Create or select a recovery case to inspect the agent decision.</p>
            ) : (
              <div className="mt-7 space-y-5">
                <Detail label="Payment" value={selected.razorpay_payment_id} mono />
                <div className="grid grid-cols-2 gap-3">
                  <Detail label="Amount" value={money(selected.amount, selected.currency)} />
                  <Detail label="Confidence" value={selected.confidence == null ? "—" : `${Math.round(selected.confidence * 100)}%`} />
                </div>
                <Detail label="Diagnosis" value={prettify(selected.diagnosis)} />
                <Detail label="Recommended action" value={prettify(selected.recommended_action)} />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Reasoning</p>
                  <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.05] p-4 text-sm leading-6 text-white/75">{selected.reason || "No reasoning recorded yet."}</p>
                </div>

                {canExecute && (
                  <button
                    type="button"
                    onClick={executeRecovery}
                    disabled={executing}
                    className="w-full cursor-pointer rounded-xl bg-[#5c78ff] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6b84ff] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {executing ? "Creating Razorpay recovery link…" : "Execute Recovery"}
                  </button>
                )}

                {executionError && (
                  <div className="rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-xs leading-5 text-red-100">{executionError}</div>
                )}

                {execution?.payment_link_url && (
                  <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-200/70">Recovery link created</p>
                    <a href={execution.payment_link_url} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm font-semibold text-emerald-100 underline underline-offset-4">{execution.payment_link_url}</a>
                  </div>
                )}

                <div className="border-t border-white/10 pt-5">
                  <div className="flex items-center justify-between text-xs text-white/45"><span>Current state</span><StatusBadge status={selected.status} dark /></div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#6f8cff]" style={{ width: `${Math.max(8, Math.min(100, (selected.confidence ?? 0.5) * 100))}%` }} /></div>
                </div>
              </div>
            )}
          </aside>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <Feature title="Bounded Actions" text="AI proposes; deterministic policy decides whether execution is allowed." />
          <Feature title="Late-Capture Protection" text="Recovery stops when the original transaction later becomes authorized or captured." />
          <Feature title="Audit-First" text="Every payment event, decision and state transition is designed to remain traceable." />
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, note, positive = false }: { label: string; value: string; note: string; positive?: boolean }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_30px_rgba(18,26,55,0.04)]">
      <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#8b919d]">{label}</p>
      <div className={`mt-3 text-3xl font-bold tracking-tight ${positive ? "text-[#119969]" : "text-[#171a20]"}`}>{value}</div>
      <p className="mt-2 text-xs text-[#8d94a0]">{note}</p>
    </div>
  );
}

function StatusBadge({ status, dark = false }: { status: string; dark?: boolean }) {
  const tone = statusTone(status);
  const styles = dark
    ? "border-white/10 bg-white/10 text-white/80"
    : tone === "success"
      ? "bg-[#e9fbf3] text-[#11855f]"
      : tone === "danger"
        ? "bg-[#fff0ef] text-[#bd4038]"
        : tone === "neutral"
          ? "bg-[#eff1f4] text-[#606875]"
          : "bg-[#fff7e6] text-[#a76500]";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${styles}`}>{prettify(status)}</span>;
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-1.5 text-sm font-semibold text-white/85 ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-black/[0.05] bg-white px-5 py-4">
      <div className="font-bold">{title}</div>
      <p className="mt-1.5 text-sm leading-6 text-[#767d89]">{text}</p>
    </div>
  );
}
