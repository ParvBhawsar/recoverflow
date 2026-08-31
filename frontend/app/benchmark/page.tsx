"use client";

import Link from "next/link";
import { useState } from "react";

type Metrics = {
  total_cases: number;
  correct_actions: number;
  action_accuracy_pct: number;
  autonomous_attempts: number;
  autonomous_precision_pct: number;
  unsafe_collection_attempts: number;
  duplicate_risk_exposures: number;
  high_value_autonomous_attempts: number;
  recovery_opportunity_capture_pct: number;
  safe_deferral_accuracy_pct: number;
};

type BenchmarkRow = {
  id: string;
  name: string;
  category: string;
  amount: number;
  late_success_risk: string;
  expected_action: string;
  expected_autonomous_execution: boolean;
  action: string;
  confidence: number;
  autonomous_execution: boolean;
  guard_override: boolean;
  reason: string;
};

type BenchmarkResult = {
  dataset_version: string;
  synthetic: boolean;
  benchmark_type: string;
  planner_source: string;
  planner_model: string;
  ground_truth_hidden_from_model: boolean;
  recoverflow: { metrics: Metrics; rows: BenchmarkRow[] };
  blind_retry: { metrics: Metrics; rows: BenchmarkRow[] };
  comparison: {
    accuracy_lift_percentage_points: number;
    unsafe_collection_attempts_avoided: number;
    duplicate_risk_exposures_avoided: number;
    high_value_autonomous_attempts_avoided: number;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const pretty = (value: string) =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);

function actionTone(action: string) {
  if (action === "CREATE_RECOVERY_LINK") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (action === "WAIT_AND_VERIFY") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-red-100 bg-red-50 text-red-700";
}

export default function BenchmarkPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Ready to evaluate rf-synth-v1");
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [showOnlyVariance, setShowOnlyVariance] = useState(false);

  async function runBenchmark() {
    setBusy(true);
    setResult(null);
    setMessage("Gemini is evaluating all 30 cases in one blinded batch…");
    try {
      const res = await fetch(`${API_BASE}/recovery/evaluation/benchmark`, {
        method: "POST",
        cache: "no-store",
      });
      const data = (await res.json()) as BenchmarkResult & { detail?: string };
      if (!res.ok) throw new Error(data.detail || "Benchmark failed");
      setResult(data);
      setMessage(`Benchmark complete · ${data.planner_model} · ${data.recoverflow.metrics.total_cases} cases`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Benchmark failed");
    } finally {
      setBusy(false);
    }
  }

  const rows = result?.recoverflow.rows.filter(
    (row) => !showOnlyVariance || row.action !== row.expected_action,
  ) || [];

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#0b1638]">
      <header className="border-b border-[#e8ebf3] bg-white">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-[#2f5bff] text-lg font-black text-white">
              R
              <span className="absolute -bottom-2 -right-2 h-5 w-5 rounded-full bg-[#89a3ff]/50" />
            </div>
            <div>
              <p className="text-[17px] font-extrabold">RecoverFlow</p>
              <p className="text-[10px] font-medium text-[#697391]">Benchmark Lab · Synthetic evaluation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/evaluation" className="rounded-lg border border-[#dfe4ee] bg-white px-4 py-2 text-xs font-extrabold text-[#35405f]">Dataset</Link>
            <Link href="/" className="rounded-lg bg-[#2f5bff] px-4 py-2 text-xs font-extrabold text-white">Dashboard</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1540px] px-6 py-7">
        <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <div>
            <span className="rounded-md bg-[#edf2ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2f5bff]">Strategy Benchmark</span>
            <h1 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-[-0.04em]">RecoverFlow vs “retry every failure”.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#697391]">
              The same 30 synthetic failures are evaluated by RecoverFlow and a deliberately naive baseline that opens a new collection path after every failure. Ground-truth labels are withheld from Gemini during inference.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={runBenchmark}
                disabled={busy}
                className="rounded-lg bg-[#2f5bff] px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(47,91,255,0.2)] hover:bg-[#244de3] disabled:opacity-50"
              >
                {busy ? "Running benchmark…" : "Run live benchmark"}
              </button>
              <p className="text-xs font-semibold text-[#5f6987]">{message}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#dbe4ff] bg-gradient-to-br from-[#eef3ff] to-white p-5 shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7b849e]">Evaluation integrity</p>
                <p className="mt-1 text-lg font-extrabold">Blinded model inference</p>
              </div>
              <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-[10px] font-extrabold text-amber-700">Synthetic only</span>
            </div>
            <div className="mt-5 space-y-3 text-xs leading-5 text-[#596480]">
              <Check text="Ground-truth actions are excluded from the Gemini prompt" />
              <Check text="All 30 cases run in one batch to conserve free-tier quota" />
              <Check text="Hard policy guard is applied after the model recommendation" />
              <Check text="Results must not be presented as production merchant performance" />
            </div>
          </div>
        </section>

        {!result ? (
          <section className="mt-6 rounded-2xl border border-dashed border-[#cfd7e8] bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#edf2ff] text-xl font-black text-[#2f5bff]">↗</div>
            <h2 className="mt-4 text-xl font-extrabold">Benchmark results will appear here</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#77809a]">Run the benchmark once the backend is online. It usually needs only one Gemini request for the complete dataset.</p>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-4 xl:grid-cols-4">
              <ImpactCard
                label="Decision accuracy lift"
                value={`+${result.comparison.accuracy_lift_percentage_points} pp`}
                note={`${result.recoverflow.metrics.action_accuracy_pct}% vs ${result.blind_retry.metrics.action_accuracy_pct}%`}
              />
              <ImpactCard
                label="Unsafe attempts avoided"
                value={String(result.comparison.unsafe_collection_attempts_avoided)}
                note={`${result.blind_retry.metrics.unsafe_collection_attempts} blind-retry unsafe attempts`}
              />
              <ImpactCard
                label="Duplicate-risk exposures avoided"
                value={String(result.comparison.duplicate_risk_exposures_avoided)}
                note="medium/high late-success-risk cases"
              />
              <ImpactCard
                label="High-value attempts avoided"
                value={String(result.comparison.high_value_autonomous_attempts_avoided)}
                note="above ₹25,000 autonomous ceiling"
              />
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-2">
              <StrategyCard title="RecoverFlow" subtitle={`Gemini · ${result.planner_model}`} metrics={result.recoverflow.metrics} recommended />
              <StrategyCard title="Blind retry" subtitle="Always CREATE_RECOVERY_LINK" metrics={result.blind_retry.metrics} />
            </section>

            <section className="mt-5 overflow-hidden rounded-2xl border border-[#e4e8f1] bg-white shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f5] px-5 py-4">
                <div>
                  <h2 className="text-base font-extrabold">Case-level benchmark trace</h2>
                  <p className="mt-1 text-xs text-[#7b849e]">Expected label vs live RecoverFlow recommendation. Blind retry is always “Create Recovery Link”.</p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#58617d]">
                  <input type="checkbox" checked={showOnlyVariance} onChange={(event) => setShowOnlyVariance(event.target.checked)} />
                  Show only mismatches
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-xs">
                  <thead className="border-b border-[#edf0f5] bg-[#fafbfe] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#7b849e]">
                    <tr>
                      <th className="px-5 py-3">Case</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Late-success risk</th>
                      <th className="px-4 py-3">Expected</th>
                      <th className="px-4 py-3">RecoverFlow</th>
                      <th className="px-4 py-3">Confidence</th>
                      <th className="px-4 py-3">Policy</th>
                      <th className="px-4 py-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0f5]">
                    {rows.map((row) => {
                      const matched = row.action === row.expected_action;
                      return (
                        <tr key={row.id} className={matched ? "hover:bg-[#fafbfe]" : "bg-amber-50/35 hover:bg-amber-50/60"}>
                          <td className="px-5 py-4">
                            <p className="font-extrabold text-[#17213f]">{row.name}</p>
                            <p className="mt-1 font-mono text-[10px] text-[#8a93aa]">{row.id} · {pretty(row.category)}</p>
                          </td>
                          <td className="px-4 py-4 font-extrabold">{money(row.amount)}</td>
                          <td className="px-4 py-4"><span className="rounded-full bg-[#f2f4f8] px-2 py-1 font-bold">{pretty(row.late_success_risk)}</span></td>
                          <td className="px-4 py-4"><span className={`rounded-full border px-2 py-1 font-extrabold ${actionTone(row.expected_action)}`}>{pretty(row.expected_action)}</span></td>
                          <td className="px-4 py-4"><span className={`rounded-full border px-2 py-1 font-extrabold ${actionTone(row.action)}`}>{pretty(row.action)}</span></td>
                          <td className="px-4 py-4 font-extrabold">{Math.round(row.confidence * 100)}%</td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2 py-1 font-extrabold ${row.autonomous_execution ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                              {row.autonomous_execution ? "Autonomous" : "No collection"}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-extrabold">
                            <span className={matched ? "text-emerald-700" : "text-amber-700"}>{matched ? "✓ Match" : "Review"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-[#edf0f5] px-5 py-3 text-[11px] font-semibold text-[#7b849e]">
                Showing {rows.length} of {result.recoverflow.metrics.total_cases} synthetic benchmark cases · {result.dataset_version}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Check({ text }: { text: string }) {
  return <div className="flex items-start gap-2"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-black text-emerald-700">✓</span><span>{text}</span></div>;
}

function ImpactCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-[#e4e8f1] bg-white p-5 shadow-[0_7px_24px_rgba(31,45,94,0.04)]"><p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#7b849e]">{label}</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-[#152249]">{value}</p><p className="mt-2 text-[11px] leading-4 text-[#8891a8]">{note}</p></div>;
}

function StrategyCard({ title, subtitle, metrics, recommended = false }: { title: string; subtitle: string; metrics: Metrics; recommended?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-[0_8px_28px_rgba(31,45,94,0.05)] ${recommended ? "border-[#bfd0ff]" : "border-[#e4e8f1]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xl font-extrabold">{title}</p><p className="mt-1 text-xs text-[#7b849e]">{subtitle}</p></div>
        {recommended && <span className="rounded-full bg-[#edf2ff] px-3 py-1 text-[10px] font-extrabold text-[#2f5bff]">Context-aware</span>}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
        <Metric label="Action accuracy" value={`${metrics.action_accuracy_pct}%`} />
        <Metric label="Autonomous precision" value={`${metrics.autonomous_precision_pct}%`} />
        <Metric label="Unsafe attempts" value={String(metrics.unsafe_collection_attempts)} danger={metrics.unsafe_collection_attempts > 0} />
        <Metric label="Duplicate-risk exposure" value={String(metrics.duplicate_risk_exposures)} danger={metrics.duplicate_risk_exposures > 0} />
        <Metric label="Opportunity capture" value={`${metrics.recovery_opportunity_capture_pct}%`} />
        <Metric label="Safe deferral accuracy" value={`${metrics.safe_deferral_accuracy_pct}%`} />
      </div>
    </div>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a93aa]">{label}</p><p className={`mt-1 text-xl font-extrabold ${danger ? "text-red-600" : "text-[#182447]"}`}>{value}</p></div>;
}
