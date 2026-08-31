"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Scenario = {
  id: string;
  name: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  method: string;
  expected_behavior: string;
  why_it_matters: string;
};

type SimulationResult = {
  status: string;
  case_id: number;
  razorpay_payment_id: string;
  scenario_id: string;
  scenario_name: string;
  expected_behavior: string;
  planner_source: string;
  planner_model: string | null;
  ai_action: string;
  confidence: number;
  policy_guard_allowed: boolean;
  policy_guard_reason: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);

const pretty = (value?: string | null) =>
  value
    ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";

function categoryStyle(category: string) {
  if (category === "customer_fixable") return "bg-blue-50 text-blue-700 border-blue-100";
  if (category === "transient") return "bg-amber-50 text-amber-700 border-amber-100";
  if (category === "high_value") return "bg-red-50 text-red-700 border-red-100";
  return "bg-violet-50 text-violet-700 border-violet-100";
}

function actionStyle(action: string) {
  if (action === "CREATE_RECOVERY_LINK") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (action === "WAIT_AND_VERIFY") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-red-50 text-red-700 border-red-100";
}

export default function SimulatorPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedId, setSelectedId] = useState<string>("incorrect_otp");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading scenarios…");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);

  const selected = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedId) || scenarios[0],
    [scenarios, selectedId],
  );

  async function loadScenarios() {
    try {
      const res = await fetch(`${API_BASE}/recovery/demo/scenarios`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load simulator scenarios");
      const data = (await res.json()) as Scenario[];
      setScenarios(data);
      if (data.length && !data.some((item) => item.id === selectedId)) setSelectedId(data[0].id);
      setMessage(`${data.length} recovery scenarios ready`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach backend");
    }
  }

  async function runScenario() {
    if (!selected) return;
    setBusy(true);
    setResult(null);
    setMessage(`Gemini is evaluating ${selected.name}…`);
    try {
      const res = await fetch(`${API_BASE}/recovery/demo/failure/${selected.id}`, { method: "POST" });
      const data = (await res.json()) as SimulationResult & { detail?: string };
      if (!res.ok) throw new Error(data.detail || "Scenario simulation failed");
      setResult(data);
      setHistory((current) => [data, ...current].slice(0, 8));
      setMessage(`Case #${data.case_id} created and evaluated`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Scenario simulation failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadScenarios();
  }, []);

  const matched = result ? result.ai_action === result.expected_behavior : false;

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#0b1638]">
      <header className="border-b border-[#e8ebf3] bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-[#2f5bff] text-lg font-black text-white">
              R
              <span className="absolute -bottom-2 -right-2 h-5 w-5 rounded-full bg-[#89a3ff]/50" />
            </div>
            <div>
              <p className="text-[17px] font-extrabold tracking-tight">RecoverFlow</p>
              <p className="text-[10px] font-medium text-[#697391]">Simulation Lab · Razorpay Test Mode</p>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-[#dfe4ee] bg-white px-4 py-2 text-xs font-extrabold text-[#35405f] shadow-sm hover:bg-[#f8f9fc]"
          >
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-6 py-7">
        <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <div>
            <div className="inline-flex rounded-md bg-[#edf2ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2f5bff]">
              Recovery Decision Lab
            </div>
            <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-[#0b1638]">
              Test the agent against different payment failures.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#697391]">
              Each scenario changes the amount, failure source and payment context. Gemini proposes a bounded response, then the deterministic policy layer decides whether autonomous execution is safe.
            </p>
          </div>

          <div className="rounded-2xl border border-[#dbe4ff] bg-gradient-to-br from-[#eef3ff] to-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#5e6c91]">Lab status</p>
                <p className="mt-1 text-lg font-extrabold">{message}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700">AI + policy</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <MiniStat label="Scenarios" value={String(scenarios.length)} />
              <MiniStat label="Run now" value={String(history.length)} />
              <MiniStat label="Provider" value="Gemini" />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-2xl border border-[#e4e8f1] bg-white shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
            <div className="border-b border-[#edf0f5] px-5 py-4">
              <h2 className="text-base font-extrabold">Choose a failure scenario</h2>
              <p className="mt-1 text-xs text-[#7b849e]">Purpose-built cases for recovery strategy and safety testing</p>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-2">
              {scenarios.map((scenario) => {
                const active = scenario.id === selectedId;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => { setSelectedId(scenario.id); setResult(null); }}
                    className={`rounded-xl border p-4 text-left transition ${
                      active
                        ? "border-[#2f5bff] bg-[#f5f7ff] shadow-[0_0_0_2px_rgba(47,91,255,0.08)]"
                        : "border-[#e4e8f1] bg-white hover:border-[#cdd6ef] hover:bg-[#fafbfe]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-extrabold text-[#17213f]">{scenario.name}</p>
                        <p className="mt-1 text-xs leading-5 text-[#6f7894]">{scenario.description}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase ${categoryStyle(scenario.category)}`}>
                        {pretty(scenario.category)}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#eef1f6] pt-3 text-xs">
                      <div>
                        <span className="text-[#8a93aa]">Amount </span>
                        <span className="font-extrabold">{money(scenario.amount)}</span>
                      </div>
                      <div>
                        <span className="text-[#8a93aa]">Expected </span>
                        <span className="font-extrabold text-[#35405f]">{pretty(scenario.expected_behavior)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-[#e4e8f1] bg-white p-5 shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
            {!selected ? (
              <p className="text-sm text-[#697391]">Waiting for scenarios…</p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2f5bff]">Selected scenario</p>
                    <h2 className="mt-2 text-2xl font-extrabold">{selected.name}</h2>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${categoryStyle(selected.category)}`}>
                    {pretty(selected.category)}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Detail label="Amount" value={money(selected.amount)} />
                  <Detail label="Method" value={pretty(selected.method)} />
                  <Detail label="Expected action" value={pretty(selected.expected_behavior)} />
                  <Detail label="Mode" value="Synthetic test" />
                </div>

                <div className="mt-4 rounded-xl bg-[#f7f9fd] p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#7c86a0]">Why this scenario matters</p>
                  <p className="mt-2 text-sm leading-6 text-[#4f5a77]">{selected.why_it_matters}</p>
                </div>

                <button
                  type="button"
                  onClick={runScenario}
                  disabled={busy}
                  className="mt-5 w-full rounded-lg bg-[#2f5bff] px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(47,91,255,0.2)] hover:bg-[#244de3] disabled:opacity-50"
                >
                  {busy ? "Evaluating…" : `Run ${selected.name}`}
                </button>
              </>
            )}
          </aside>
        </section>

        {result && (
          <section className="mt-5 rounded-2xl border border-[#e4e8f1] bg-white p-5 shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2f5bff]">Simulation result · Case #{result.case_id}</p>
                <h2 className="mt-2 text-2xl font-extrabold">{result.scenario_name}</h2>
                <p className="mt-1 font-mono text-xs text-[#7b849e]">{result.razorpay_payment_id}</p>
              </div>
              <span className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${matched ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
                {matched ? "✓ Strategy matched expectation" : "Review strategy variance"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <ResultCard label="AI action" value={pretty(result.ai_action)} className={actionStyle(result.ai_action)} />
              <ResultCard label="Expected" value={pretty(result.expected_behavior)} />
              <ResultCard label="Confidence" value={`${Math.round(result.confidence * 100)}%`} />
              <ResultCard label="Planner" value={result.planner_model || pretty(result.planner_source)} />
              <ResultCard label="Policy execution" value={result.policy_guard_allowed ? "Allowed" : "Blocked"} />
            </div>

            <div className="mt-4 rounded-xl border border-[#e7eaf2] bg-[#fafbfe] px-4 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#7c86a0]">Deterministic policy guard</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#44506c]">{result.policy_guard_reason}</p>
            </div>
          </section>
        )}

        <section className="mt-5 rounded-2xl border border-[#e4e8f1] bg-white shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
          <div className="flex items-center justify-between border-b border-[#edf0f5] px-5 py-4">
            <div>
              <h2 className="text-base font-extrabold">Session results</h2>
              <p className="mt-1 text-xs text-[#7b849e]">These runs become the foundation for the benchmark dataset</p>
            </div>
            <span className="rounded-full bg-[#edf2ff] px-2.5 py-1 text-[10px] font-extrabold text-[#2f5bff]">{history.length} runs</span>
          </div>

          {history.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#7b849e]">Run a scenario to populate this table.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="border-b border-[#edf0f5] bg-[#fafbfe] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#7d86a0]">
                  <tr>
                    <th className="px-5 py-3">Scenario</th>
                    <th className="px-5 py-3">AI action</th>
                    <th className="px-5 py-3">Expected</th>
                    <th className="px-5 py-3">Confidence</th>
                    <th className="px-5 py-3">Policy</th>
                    <th className="px-5 py-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1f6]">
                  {history.map((item) => {
                    const rowMatch = item.ai_action === item.expected_behavior;
                    return (
                      <tr key={`${item.case_id}-${item.scenario_id}`} className="text-[#44506c]">
                        <td className="px-5 py-3 font-extrabold text-[#18213f]">{item.scenario_name}</td>
                        <td className="px-5 py-3">{pretty(item.ai_action)}</td>
                        <td className="px-5 py-3">{pretty(item.expected_behavior)}</td>
                        <td className="px-5 py-3 font-bold">{Math.round(item.confidence * 100)}%</td>
                        <td className="px-5 py-3">{item.policy_guard_allowed ? "Allowed" : "Blocked"}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${rowMatch ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {rowMatch ? "Matched" : "Variance"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e4e9f5] bg-white px-3 py-3">
      <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#8a93aa]">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-[#1a2442]">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e8ebf2] px-3 py-3">
      <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#8a93aa]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#26314f]">{value}</p>
    </div>
  );
}

function ResultCard({ label, value, className = "bg-[#fafbfe] text-[#26314f] border-[#e7eaf2]" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-xl border p-4 ${className}`}>
      <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] opacity-60">{label}</p>
      <p className="mt-2 text-sm font-extrabold">{value}</p>
    </div>
  );
}
