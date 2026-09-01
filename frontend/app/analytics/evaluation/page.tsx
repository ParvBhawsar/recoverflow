"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell, Metric, SectionCard, StatusPill } from "@/components/app-shell";
import { API_BASE, pretty, shortDate } from "@/lib/product";

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

type HistoryResponse = { synthetic: boolean; dataset_version: string; runs: BenchmarkRun[] };

type CategorySummary = { category: string; total: number; correct: number; accuracy: number; unsafe: number };

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

function Bar({ label, value, max = 100, note }: { label: string; value: number; max?: number; note?: string }) {
  const width = Math.max(4, Math.min(100, max ? (value / max) * 100 : 0));
  return (
    <div>
      <div className="flex items-center justify-between gap-4"><div><p className="text-[9px] font-bold text-[#59647a]">{label}</p>{note && <p className="mt-0.5 text-[7px] text-[#9ca3b0]">{note}</p>}</div><span className="text-[9px] font-extrabold text-[#2f3b58]">{value}%</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0f5]"><div className="h-full rounded-full bg-[#2f5bff] transition-all duration-700" style={{ width: `${width}%` }} /></div>
    </div>
  );
}

export default function EvaluationAnalyticsPage() {
  const [latest, setLatest] = useState<BenchmarkRun | null>(null);
  const [history, setHistory] = useState<BenchmarkRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading evaluation evidence…");

  async function loadEvidence() {
    try {
      const [latestResponse, historyResponse] = await Promise.all([
        fetch(`${API_BASE}/recovery/evaluation/benchmark/latest`, { cache: "no-store" }),
        fetch(`${API_BASE}/recovery/evaluation/benchmark/history`, { cache: "no-store" }),
      ]);
      if (historyResponse.ok) {
        const payload = (await historyResponse.json()) as HistoryResponse;
        setHistory(payload.runs || []);
      }
      if (latestResponse.status === 404) {
        setLatest(null);
        setMessage("No stored benchmark yet");
        return;
      }
      if (!latestResponse.ok) throw new Error("Could not load latest benchmark");
      const payload = (await latestResponse.json()) as BenchmarkRun;
      setLatest(payload);
      setMessage(`Latest run #${payload.run_id} · ${payload.planner_model || pretty(payload.planner_source)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load benchmark evidence");
    }
  }

  async function runBenchmark() {
    setBusy(true);
    setMessage("Running blinded 30-case evaluation…");
    try {
      const response = await fetch(`${API_BASE}/recovery/evaluation/benchmark`, { method: "POST", cache: "no-store" });
      const payload = (await response.json()) as BenchmarkRun & { detail?: string };
      if (!response.ok) throw new Error(payload.detail || "Benchmark failed");
      setLatest(payload);
      setMessage(`Run #${payload.run_id} saved · ${payload.recoverflow.metrics.action_accuracy_pct}% accuracy`);
      await loadEvidence();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Benchmark failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadEvidence();
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
    return Array.from(map.entries()).map(([category, stats]) => ({ category, total: stats.total, correct: stats.correct, accuracy: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0, unsafe: stats.unsafe })).sort((a, b) => b.total - a.total);
  }, [latest]);

  const variances = useMemo(() => (latest?.recoverflow.rows || []).filter((row) => row.action !== row.expected_action), [latest]);
  const rf = latest?.recoverflow.metrics;
  const blind = latest?.blind_retry.metrics;

  return (
    <AppShell
      title="Evaluation analytics"
      description="Measure decision quality and safety against a blind-retry baseline."
      actions={<button onClick={() => void runBenchmark()} disabled={busy} className="inline-flex items-center gap-2 rounded-[9px] bg-[#2f5bff] px-3.5 py-2 text-[10px] font-bold text-white shadow-[0_6px_16px_rgba(47,91,255,.20)] transition hover:-translate-y-0.5 hover:bg-[#244fe0] disabled:opacity-50">{busy && <Spinner/>}{busy ? "Running…" : "Run benchmark"}</button>}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[11px] border border-[#e4e9f1] bg-white px-4 py-3">
          <div className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-violet-500"/><span className="text-[10px] font-semibold text-[#657087]">{message}</span></div>
          <div className="flex items-center gap-3"><StatusPill label="Synthetic evaluation" tone="warning"/><span className="text-[8px] font-semibold text-[#9aa2b0]">Ground truth hidden from model</span></div>
        </div>

        {!latest || !rf || !blind ? (
          <SectionCard className="grid min-h-[420px] place-items-center p-8 text-center">
            <div><div className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] bg-[#eef3ff] text-[#2f5bff]"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20V8"/></svg></div><h2 className="mt-4 text-[16px] font-[760] text-[#26314d]">No benchmark evidence yet</h2><p className="mx-auto mt-2 max-w-[420px] text-[10px] leading-5 text-[#8790a4]">Run the blinded 30-case evaluation once to persist a measurable comparison between RecoverFlow and a naive recover-every-failure baseline.</p><button onClick={() => void runBenchmark()} disabled={busy} className="mt-5 rounded-[9px] bg-[#2f5bff] px-4 py-2.5 text-[10px] font-extrabold text-white">Run first benchmark</button></div>
          </SectionCard>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Decision accuracy" value={`${rf.action_accuracy_pct}%`} detail={`Blind retry ${blind.action_accuracy_pct}%`} accent="blue" />
              <Metric label="Autonomous precision" value={`${rf.autonomous_precision_pct}%`} detail={`${rf.unsafe_collection_attempts} unsafe attempts`} accent="green" />
              <Metric label="Duplicate-risk exposure" value={String(rf.duplicate_risk_exposures)} detail={`Blind retry ${blind.duplicate_risk_exposures}`} accent="amber" />
              <Metric label="Opportunity capture" value={`${rf.recovery_opportunity_capture_pct}%`} detail="recoverable failures identified" accent="violet" />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
              <SectionCard className="p-5">
                <div className="flex items-start justify-between gap-3"><div><h2 className="text-[12px] font-[760] text-[#1d2845]">RecoverFlow vs blind retry</h2><p className="mt-1 text-[9px] text-[#9098aa]">Decision quality across the same labelled synthetic dataset.</p></div><StatusPill label={`Run #${latest.run_id}`} tone="info"/></div>
                <div className="mt-6 space-y-5">
                  <Bar label="Action accuracy" value={rf.action_accuracy_pct} note={`Blind retry: ${blind.action_accuracy_pct}%`} />
                  <Bar label="Safe deferral accuracy" value={rf.safe_deferral_accuracy_pct} note={`Blind retry: ${blind.safe_deferral_accuracy_pct}%`} />
                  <Bar label="Recovery opportunity capture" value={rf.recovery_opportunity_capture_pct} note={`Blind retry: ${blind.recovery_opportunity_capture_pct}%`} />
                  <Bar label="Autonomous precision" value={rf.autonomous_precision_pct} note={`Blind retry: ${blind.autonomous_precision_pct}%`} />
                </div>
              </SectionCard>

              <SectionCard className="overflow-hidden">
                <div className="border-b border-[#edf0f5] px-5 py-4"><h2 className="text-[12px] font-[760] text-[#1d2845]">Safety delta</h2><p className="mt-1 text-[9px] text-[#9098aa]">Unsafe actions avoided compared with blind retry.</p></div>
                <div className="divide-y divide-[#eef1f5]">
                  {[
                    ["Unsafe collection attempts avoided", latest.comparison.unsafe_collection_attempts_avoided],
                    ["Duplicate-risk exposures avoided", latest.comparison.duplicate_risk_exposures_avoided],
                    ["High-value autonomous attempts avoided", latest.comparison.high_value_autonomous_attempts_avoided],
                  ].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-emerald-50 text-emerald-600"><svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m5 10 3 3 7-7"/></svg></span><span className="text-[9px] font-semibold text-[#5e6980]">{label}</span></div><span className="text-[18px] font-[780] tracking-[-0.04em] text-[#1d2845]">{value}</span></div>)}
                </div>
              </SectionCard>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
              <SectionCard className="overflow-hidden">
                <div className="border-b border-[#edf0f5] px-5 py-4"><h2 className="text-[12px] font-[760] text-[#1d2845]">Accuracy by failure category</h2><p className="mt-1 text-[9px] text-[#9098aa]">Where the recovery strategy is strongest and where review is useful.</p></div>
                <div className="divide-y divide-[#eef1f5]">{categorySummary.map((item) => <div key={item.category} className="grid grid-cols-[1fr_90px_75px] items-center gap-4 px-5 py-3.5"><div><p className="text-[9px] font-bold text-[#455168]">{pretty(item.category)}</p><p className="mt-1 text-[7px] text-[#9ba2b0]">{item.correct}/{item.total} correct · {item.unsafe} unsafe</p></div><div className="h-1.5 overflow-hidden rounded-full bg-[#edf0f5]"><div className="h-full rounded-full bg-[#2f5bff]" style={{ width: `${item.accuracy}%` }}/></div><span className="text-right text-[9px] font-extrabold text-[#34405b]">{item.accuracy}%</span></div>)}</div>
              </SectionCard>

              <SectionCard className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#edf0f5] px-5 py-4"><div><h2 className="text-[12px] font-[760] text-[#1d2845]">Decision variances</h2><p className="mt-1 text-[9px] text-[#9098aa]">Cases where the live recommendation differs from the labelled expectation.</p></div><StatusPill label={`${variances.length} cases`} tone={variances.length ? "warning" : "success"}/></div>
                {variances.length === 0 ? <div className="px-5 py-10 text-center text-[9px] text-[#9098aa]">No strategy variances in the latest run.</div> : <div className="divide-y divide-[#eef1f5]">{variances.slice(0, 6).map((row) => <div key={row.id} className="px-5 py-3.5"><div className="flex items-center justify-between gap-3"><p className="text-[9px] font-bold text-[#465169]">{row.name}</p><span className="text-[8px] font-extrabold text-[#2f5bff]">{Math.round(row.confidence * 100)}%</span></div><p className="mt-1.5 text-[8px] text-[#8b94a5]">Expected {pretty(row.expected_action)} · chose {pretty(row.action)}</p></div>)}</div>}
              </SectionCard>
            </div>

            <SectionCard className="mt-5 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#edf0f5] px-5 py-4"><div><h2 className="text-[12px] font-[760] text-[#1d2845]">Benchmark history</h2><p className="mt-1 text-[9px] text-[#9098aa]">Recent persisted evaluation snapshots.</p></div><span className="text-[8px] font-bold text-[#9aa2b0]">{latest.dataset_version}</span></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#fafbfe] text-[8px] font-extrabold uppercase tracking-[.08em] text-[#9aa2b1]"><tr><th className="px-5 py-2.5">Run</th><th className="px-4 py-2.5">Planner</th><th className="px-4 py-2.5">Accuracy</th><th className="px-4 py-2.5">Unsafe attempts</th><th className="px-4 py-2.5">Created</th></tr></thead><tbody className="divide-y divide-[#eef1f5]">{history.slice(0, 10).map((run) => <tr key={run.run_id}><td className="px-5 py-3 text-[9px] font-extrabold text-[#35405b]">#{run.run_id}</td><td className="px-4 py-3 text-[9px] font-semibold text-[#687389]">{run.planner_model || pretty(run.planner_source)}</td><td className="px-4 py-3 text-[9px] font-extrabold text-[#2f5bff]">{run.recoverflow.metrics.action_accuracy_pct}%</td><td className="px-4 py-3 text-[9px] font-semibold text-[#687389]">{run.recoverflow.metrics.unsafe_collection_attempts}</td><td className="px-4 py-3 text-[8px] font-semibold text-[#929aad]">{shortDate(run.created_at)}</td></tr>)}</tbody></table></div>
            </SectionCard>
          </>
        )}
      </div>
    </AppShell>
  );
}
