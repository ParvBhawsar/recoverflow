"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

type BenchmarkRun = {
  run_id: number;
  dataset_version: string;
  benchmark_type: string;
  planner_source: string;
  planner_model: string | null;
  synthetic: boolean;
  ground_truth_hidden_from_model: boolean;
  recoverflow: { metrics: Metrics; rows?: BenchmarkRow[] };
  blind_retry: { metrics: Metrics; rows?: BenchmarkRow[] };
  comparison: {
    accuracy_lift_percentage_points: number;
    unsafe_collection_attempts_avoided: number;
    duplicate_risk_exposures_avoided: number;
    high_value_autonomous_attempts_avoided: number;
  };
  created_at: string;
};

type HistoryResponse = {
  synthetic: boolean;
  dataset_version: string;
  runs: BenchmarkRun[];
};

type CategorySummary = {
  category: string;
  total: number;
  correct: number;
  accuracy: number;
  unsafe: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const pretty = (value: string) =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const runTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function EvaluationAnalyticsPage() {
  const [latest, setLatest] = useState<BenchmarkRun | null>(null);
  const [history, setHistory] = useState<BenchmarkRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading benchmark evidence…");

  async function loadEvidence() {
    try {
      const [latestRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/recovery/evaluation/benchmark/latest`, { cache: "no-store" }),
        fetch(`${API_BASE}/recovery/evaluation/benchmark/history`, { cache: "no-store" }),
      ]);

      if (historyRes.ok) {
        const historyPayload = (await historyRes.json()) as HistoryResponse;
        setHistory(historyPayload.runs || []);
      }

      if (latestRes.status === 404) {
        setLatest(null);
        setMessage("No stored benchmark yet. Run one to create the first evidence snapshot.");
        return;
      }
      if (!latestRes.ok) throw new Error("Could not load latest benchmark");

      const latestPayload = (await latestRes.json()) as BenchmarkRun;
      setLatest(latestPayload);
      setMessage(`Latest run #${latestPayload.run_id} loaded · ${latestPayload.planner_model || latestPayload.planner_source}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load benchmark evidence");
    }
  }

  async function runBenchmark() {
    setBusy(true);
    setMessage("Running blinded 30-case benchmark and saving results…");
    try {
      const res = await fetch(`${API_BASE}/recovery/evaluation/benchmark`, {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await res.json()) as BenchmarkRun & { detail?: string };
      if (!res.ok) throw new Error(payload.detail || "Benchmark failed");
      setLatest(payload);
      setMessage(`Run #${payload.run_id} saved · ${payload.recoverflow.metrics.action_accuracy_pct}% decision accuracy`);
      await loadEvidence();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Benchmark failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadEvidence();
  }, []);

  const categorySummary = useMemo<CategorySummary[]>(() => {
    const rows = latest?.recoverflow.rows || [];
    const map = new Map<string, { total: number; correct: number; unsafe: number }>();
    for (const row of rows) {
      const current = map.get(row.category) || { total: 0, correct: 0, unsafe: 0 };
      current.total += 1;
      if (row.action === row.expected_action) current.correct += 1;
      if (row.autonomous_execution && !row.expected_autonomous_execution) current.unsafe += 1;
      map.set(row.category, current);
    }
    return Array.from(map.entries())
      .map(([category, stats]) => ({
        category,
        total: stats.total,
        correct: stats.correct,
        accuracy: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0,
        unsafe: stats.unsafe,
      }))
      .sort((a, b) => b.total - a.total);
  }, [latest]);

  const variances = useMemo(
    () => (latest?.recoverflow.rows || []).filter((row) => row.action !== row.expected_action),
    [latest],
  );

  const rf = latest?.recoverflow.metrics;
  const blind = latest?.blind_retry.metrics;

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
              <p className="text-[10px] font-medium text-[#697391]">Evaluation Analytics · Synthetic benchmark evidence</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/benchmark" className="rounded-lg border border-[#dfe4ee] bg-white px-4 py-2 text-xs font-extrabold text-[#35405f]">Benchmark Lab</Link>
            <Link href="/" className="rounded-lg bg-[#2f5bff] px-4 py-2 text-xs font-extrabold text-white">Dashboard</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1540px] px-6 py-7">
        <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <div>
            <span className="rounded-md bg-[#edf2ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2f5bff]">Evaluation Evidence</span>
            <h1 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-[-0.04em]">Show what safer recovery actually changes.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#697391]">
              Persistent synthetic benchmark runs make RecoverFlow’s strategy measurable across decision quality, unsafe collection exposure, late-success risk, and autonomous recovery precision.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={runBenchmark}
                disabled={busy}
                className="rounded-lg bg-[#2f5bff] px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(47,91,255,0.2)] hover:bg-[#244de3] disabled:opacity-50"
              >
                {busy ? "Running evaluation…" : "Run & save new benchmark"}
              </button>
              <p className="text-xs font-semibold text-[#5f6987]">{message}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#dbe4ff] bg-white p-5 shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7b849e]">Evidence status</p>
                <p className="mt-1 text-xl font-extrabold">{latest ? `Run #${latest.run_id}` : "Awaiting first run"}</p>
              </div>
              <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-[10px] font-extrabold text-amber-700">Synthetic only</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat label="Dataset" value={latest?.dataset_version || "rf-synth-v1"} />
              <MiniStat label="Stored runs" value={String(history.length)} />
              <MiniStat label="Planner" value={latest?.planner_model || "—"} />
              <MiniStat label="Last run" value={latest ? runTime(latest.created_at) : "—"} />
            </div>
          </div>
        </section>

        {!latest || !rf || !blind ? (
          <section className="mt-6 rounded-2xl border border-dashed border-[#cfd7e8] bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#edf2ff] text-xl font-black text-[#2f5bff]">↗</div>
            <h2 className="mt-4 text-xl font-extrabold">Create the first persistent evaluation snapshot</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#77809a]">One blinded Gemini batch evaluates all 30 synthetic cases, compares them with blind retry, and stores the full result in Supabase.</p>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Decision accuracy" value={`${rf.action_accuracy_pct}%`} sub={`Blind retry ${blind.action_accuracy_pct}%`} positive />
              <Kpi label="Autonomous precision" value={`${rf.autonomous_precision_pct}%`} sub={`${rf.unsafe_collection_attempts} unsafe autonomous attempts`} positive={rf.unsafe_collection_attempts === 0} />
              <Kpi label="Duplicate-risk exposure" value={String(rf.duplicate_risk_exposures)} sub={`Blind retry ${blind.duplicate_risk_exposures}`} positive={rf.duplicate_risk_exposures < blind.duplicate_risk_exposures} />
              <Kpi label="Recovery opportunity capture" value={`${rf.recovery_opportunity_capture_pct}%`} sub="Correctly identified recoverable failures" positive />
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr_.8fr]">
              <ComparisonPanel
                title="Decision quality"
                rows={[
                  ["Action accuracy", rf.action_accuracy_pct, blind.action_accuracy_pct, "%"],
                  ["Safe deferral accuracy", rf.safe_deferral_accuracy_pct, blind.safe_deferral_accuracy_pct, "%"],
                  ["Recovery opportunity capture", rf.recovery_opportunity_capture_pct, blind.recovery_opportunity_capture_pct, "%"],
                ]}
              />
              <ComparisonPanel
                title="Safety exposure"
                lowerIsBetter
                rows={[
                  ["Unsafe collection attempts", rf.unsafe_collection_attempts, blind.unsafe_collection_attempts, ""],
                  ["Duplicate-risk exposures", rf.duplicate_risk_exposures, blind.duplicate_risk_exposures, ""],
                  ["High-value autonomous attempts", rf.high_value_autonomous_attempts, blind.high_value_autonomous_attempts, ""],
                ]}
              />
              <div className="rounded-2xl border border-[#dbe4ff] bg-gradient-to-br from-[#eef3ff] to-white p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#66708d]">Net safety impact</p>
                <p className="mt-2 text-4xl font-extrabold text-[#152249]">{latest.comparison.unsafe_collection_attempts_avoided}</p>
                <p className="mt-1 text-sm font-bold text-[#44506c]">unsafe collection attempts avoided</p>
                <div className="mt-5 space-y-3 border-t border-[#dce5fb] pt-4 text-xs text-[#5f6987]">
                  <ImpactLine label="Duplicate-risk exposures avoided" value={latest.comparison.duplicate_risk_exposures_avoided} />
                  <ImpactLine label="High-value attempts avoided" value={latest.comparison.high_value_autonomous_attempts_avoided} />
                  <ImpactLine label="Accuracy lift" value={`+${latest.comparison.accuracy_lift_percentage_points} pp`} />
                </div>
              </div>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
              <div className="rounded-2xl border border-[#e4e8f1] bg-white p-5 shadow-[0_8px_28px_rgba(31,45,94,0.04)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold">Accuracy by failure category</h2>
                    <p className="mt-1 text-xs text-[#7b849e]">Where the current planner is strong—and where it still needs tuning.</p>
                  </div>
                  <span className="rounded-full bg-[#edf2ff] px-2.5 py-1 text-[10px] font-extrabold text-[#2f5bff]">{categorySummary.length} categories</span>
                </div>
                <div className="mt-5 space-y-4">
                  {categorySummary.map((item) => (
                    <div key={item.category}>
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-extrabold text-[#273351]">{pretty(item.category)}</span>
                          <span className="ml-2 text-[#8a93aa]">{item.correct}/{item.total} correct</span>
                        </div>
                        <span className="font-extrabold text-[#35405f]">{item.accuracy}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf0f6]">
                        <div className="h-full rounded-full bg-[#2f5bff]" style={{ width: `${item.accuracy}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#e4e8f1] bg-white p-5 shadow-[0_8px_28px_rgba(31,45,94,0.04)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold">Strategy variances</h2>
                    <p className="mt-1 text-xs text-[#7b849e]">Cases where live RecoverFlow did not match the synthetic ground-truth label.</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${variances.length === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {variances.length} review
                  </span>
                </div>
                <div className="mt-4 max-h-[340px] space-y-3 overflow-auto pr-1">
                  {variances.length === 0 ? (
                    <div className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">All 30 decisions matched the labelled strategy in this run.</div>
                  ) : (
                    variances.map((row) => (
                      <div key={row.id} className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-extrabold text-[#273351]">{row.name}</p>
                            <p className="mt-1 font-mono text-[10px] text-[#8a93aa]">{row.id}</p>
                          </div>
                          <span className="text-[10px] font-extrabold text-amber-700">{Math.round(row.confidence * 100)}%</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                          <Tag label="Expected" value={pretty(row.expected_action)} />
                          <Tag label="RecoverFlow" value={pretty(row.action)} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-[#e4e8f1] bg-white p-5 shadow-[0_8px_28px_rgba(31,45,94,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold">Benchmark history</h2>
                  <p className="mt-1 text-xs text-[#7b849e]">Stored runs let us track whether planner changes improve accuracy without sacrificing safety.</p>
                </div>
                <span className="text-[10px] font-bold text-[#8a93aa]">Last {Math.min(history.length, 20)} runs</span>
              </div>
              {history.length === 0 ? (
                <p className="mt-4 text-sm text-[#7b849e]">No history yet.</p>
              ) : (
                <div className="mt-5 flex min-h-[170px] items-end gap-3 overflow-x-auto pb-2">
                  {[...history].reverse().map((run) => {
                    const accuracy = run.recoverflow.metrics.action_accuracy_pct;
                    const unsafe = run.recoverflow.metrics.unsafe_collection_attempts;
                    return (
                      <div key={run.run_id} className="flex min-w-[72px] flex-col items-center gap-2">
                        <div className="flex h-28 w-10 items-end rounded-lg bg-[#f0f3f9] p-1">
                          <div className="w-full rounded-md bg-[#2f5bff]" style={{ height: `${Math.max(8, accuracy)}%` }} />
                        </div>
                        <p className="text-[10px] font-extrabold">{accuracy}%</p>
                        <p className={`text-[9px] font-bold ${unsafe === 0 ? "text-emerald-600" : "text-amber-600"}`}>{unsafe} unsafe</p>
                        <p className="text-[9px] text-[#929ab0]">#{run.run_id}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[11px] leading-5 text-amber-800">
              Evaluation note: all metrics on this page come from the versioned synthetic dataset {latest.dataset_version}. They are useful for controlled strategy comparison and must not be represented as real merchant recovery performance.
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f7f9fd] p-3"><p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#8a93aa]">{label}</p><p className="mt-1 truncate text-sm font-extrabold">{value}</p></div>;
}

function Kpi({ label, value, sub, positive = false }: { label: string; value: string; sub: string; positive?: boolean }) {
  return <div className="rounded-2xl border border-[#e4e8f1] bg-white p-5"><p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#7b849e]">{label}</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-[#152249]">{value}</p><p className={`mt-2 text-[11px] font-semibold ${positive ? "text-emerald-700" : "text-[#8891a8]"}`}>{sub}</p></div>;
}

function ComparisonPanel({ title, rows, lowerIsBetter = false }: { title: string; rows: [string, number, number, string][]; lowerIsBetter?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#e4e8f1] bg-white p-5">
      <h2 className="text-base font-extrabold">{title}</h2>
      <div className="mt-4 space-y-4">
        {rows.map(([label, rf, blind, suffix]) => {
          const max = Math.max(rf, blind, 1);
          const rfWidth = lowerIsBetter ? Math.max(4, (rf / max) * 100) : Math.max(4, rf);
          const blindWidth = lowerIsBetter ? Math.max(4, (blind / max) * 100) : Math.max(4, blind);
          return (
            <div key={label}>
              <div className="mb-2 flex justify-between text-[11px]"><span className="font-bold text-[#5f6987]">{label}</span><span className="font-extrabold">{rf}{suffix} vs {blind}{suffix}</span></div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><span className="w-20 text-[9px] font-bold text-[#2f5bff]">RecoverFlow</span><div className="h-2 flex-1 rounded-full bg-[#edf0f6]"><div className="h-full rounded-full bg-[#2f5bff]" style={{ width: `${Math.min(100, rfWidth)}%` }} /></div></div>
                <div className="flex items-center gap-2"><span className="w-20 text-[9px] font-bold text-[#8a93aa]">Blind retry</span><div className="h-2 flex-1 rounded-full bg-[#edf0f6]"><div className="h-full rounded-full bg-[#aab2c6]" style={{ width: `${Math.min(100, blindWidth)}%` }} /></div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImpactLine({ label, value }: { label: string; value: string | number }) {
  return <div className="flex items-center justify-between gap-3"><span>{label}</span><span className="font-extrabold text-[#273351]">{value}</span></div>;
}

function Tag({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white p-2"><p className="font-bold uppercase text-[#8a93aa]">{label}</p><p className="mt-1 font-extrabold text-[#35405f]">{value}</p></div>;
}
