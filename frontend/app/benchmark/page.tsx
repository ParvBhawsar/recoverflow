"use client";

import { useState } from "react";
import { AppShell, Metric, SectionCard, StatusPill } from "@/components/app-shell";
import { API_BASE, money, pretty } from "@/lib/product";

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

function actionTone(action: string): "success" | "warning" | "danger" | "neutral" {
  if (action === "CREATE_RECOVERY_LINK") return "success";
  if (action === "WAIT_AND_VERIFY") return "warning";
  if (action === "ESCALATE") return "danger";
  return "neutral";
}

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

export default function BenchmarkPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Ready to evaluate rf-synth-v1");
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [showOnlyVariance, setShowOnlyVariance] = useState(false);

  async function runBenchmark() {
    setBusy(true);
    setResult(null);
    setMessage("Evaluating all 30 cases in one blinded batch…");
    try {
      const response = await fetch(`${API_BASE}/recovery/evaluation/benchmark`, { method: "POST", cache: "no-store" });
      const data = (await response.json()) as BenchmarkResult & { detail?: string };
      if (!response.ok) throw new Error(data.detail || "Benchmark failed");
      setResult(data);
      setMessage(`Benchmark complete · ${data.planner_model} · ${data.recoverflow.metrics.total_cases} cases`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Benchmark failed");
    } finally {
      setBusy(false);
    }
  }

  const rows = result?.recoverflow.rows.filter((row) => !showOnlyVariance || row.action !== row.expected_action) || [];

  return (
    <AppShell
      title="Strategy benchmark"
      description="Compare contextual recovery against a deliberately naive blind-retry baseline."
      actions={<button onClick={() => void runBenchmark()} disabled={busy} className="inline-flex items-center gap-2 rounded-[9px] bg-[#2f5bff] px-3.5 py-2 text-[10px] font-bold text-white shadow-[0_6px_16px_rgba(47,91,255,.20)] transition hover:-translate-y-0.5 hover:bg-[#244fe0] disabled:opacity-50">{busy && <Spinner/>}{busy ? "Running…" : "Run benchmark"}</button>}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[11px] border border-[#e4e9f1] bg-white px-4 py-3"><div className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-violet-500"/><span className="text-[10px] font-semibold text-[#657087]">{message}</span></div><div className="flex items-center gap-2"><StatusPill label="Synthetic" tone="warning"/><StatusPill label="Blinded inference" tone="info"/></div></div>

        {!result ? (
          <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
            <SectionCard className="p-6"><p className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#2f5bff]">Validation methodology</p><h2 className="mt-3 max-w-[620px] text-[26px] font-[760] leading-tight tracking-[-0.04em] text-[#17213f]">Evaluate the recovery strategy against the same labelled payment failures.</h2><p className="mt-4 max-w-[640px] text-[10px] leading-5 text-[#788196]">RecoverFlow receives only payment context. Expected actions and rationales stay hidden during inference. The baseline always opens a fresh recovery path after every failure, which makes safety trade-offs directly measurable.</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{[["30", "payment scenarios"], ["3", "bounded actions"], ["7", "evaluation metrics"]].map(([value, label]) => <div key={label} className="rounded-[12px] bg-[#f8f9fc] p-4"><p className="text-[22px] font-[780] tracking-[-0.04em] text-[#22304e]">{value}</p><p className="mt-1 text-[8px] font-semibold text-[#9098aa]">{label}</p></div>)}</div></SectionCard>
            <SectionCard className="p-6"><p className="text-[10px] font-extrabold text-[#2f3a55]">Evaluation integrity</p><div className="mt-5 space-y-4">{["Ground-truth actions excluded from Gemini prompt", "Hard merchant policy applied after model recommendation", "Same dataset used for RecoverFlow and blind-retry baseline", "All outputs labelled synthetic, never production performance"].map((text) => <div key={text} className="flex items-start gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m5 10 3 3 7-7"/></svg></span><p className="text-[9px] leading-4 text-[#687389]">{text}</p></div>)}</div></SectionCard>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Accuracy lift" value={`+${result.comparison.accuracy_lift_percentage_points} pp`} detail={`${result.recoverflow.metrics.action_accuracy_pct}% vs ${result.blind_retry.metrics.action_accuracy_pct}%`} accent="blue" />
              <Metric label="Unsafe attempts avoided" value={String(result.comparison.unsafe_collection_attempts_avoided)} detail={`${result.blind_retry.metrics.unsafe_collection_attempts} baseline unsafe attempts`} accent="green" />
              <Metric label="Duplicate-risk avoided" value={String(result.comparison.duplicate_risk_exposures_avoided)} detail="late-success-sensitive cases" accent="amber" />
              <Metric label="High-value attempts avoided" value={String(result.comparison.high_value_autonomous_attempts_avoided)} detail="above autonomous ceiling" accent="violet" />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <SectionCard className="p-5"><div className="flex items-center justify-between"><div><p className="text-[8px] font-extrabold uppercase tracking-[.12em] text-[#2f5bff]">RecoverFlow</p><h2 className="mt-1 text-[16px] font-[760] text-[#1d2845]">Contextual recovery</h2></div><StatusPill label={result.planner_model} tone="info"/></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-[11px] bg-[#f8f9fc] p-4"><p className="text-[7px] font-extrabold uppercase tracking-[.09em] text-[#9ba2b0]">Action accuracy</p><p className="mt-1.5 text-[22px] font-[780] tracking-[-0.04em] text-[#22304d]">{result.recoverflow.metrics.action_accuracy_pct}%</p></div><div className="rounded-[11px] bg-[#f8f9fc] p-4"><p className="text-[7px] font-extrabold uppercase tracking-[.09em] text-[#9ba2b0]">Autonomous precision</p><p className="mt-1.5 text-[22px] font-[780] tracking-[-0.04em] text-[#22304d]">{result.recoverflow.metrics.autonomous_precision_pct}%</p></div></div></SectionCard>
              <SectionCard className="p-5"><div className="flex items-center justify-between"><div><p className="text-[8px] font-extrabold uppercase tracking-[.12em] text-[#9aa2b0]">Baseline</p><h2 className="mt-1 text-[16px] font-[760] text-[#1d2845]">Blind retry</h2></div><StatusPill label="Always recover" tone="warning"/></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-[11px] bg-[#f8f9fc] p-4"><p className="text-[7px] font-extrabold uppercase tracking-[.09em] text-[#9ba2b0]">Action accuracy</p><p className="mt-1.5 text-[22px] font-[780] tracking-[-0.04em] text-[#22304d]">{result.blind_retry.metrics.action_accuracy_pct}%</p></div><div className="rounded-[11px] bg-[#f8f9fc] p-4"><p className="text-[7px] font-extrabold uppercase tracking-[.09em] text-[#9ba2b0]">Unsafe attempts</p><p className="mt-1.5 text-[22px] font-[780] tracking-[-0.04em] text-[#22304d]">{result.blind_retry.metrics.unsafe_collection_attempts}</p></div></div></SectionCard>
            </div>

            <SectionCard className="mt-5 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f5] px-5 py-4"><div><h2 className="text-[12px] font-[760] text-[#1d2845]">Case-level trace</h2><p className="mt-1 text-[9px] text-[#9098aa]">Expected action vs live RecoverFlow decision.</p></div><label className="flex cursor-pointer items-center gap-2 text-[9px] font-bold text-[#647086]"><input type="checkbox" checked={showOnlyVariance} onChange={(event) => setShowOnlyVariance(event.target.checked)} className="accent-[#2f5bff]"/>Show only variances</label></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="bg-[#fafbfe] text-[8px] font-extrabold uppercase tracking-[.08em] text-[#9aa2b1]"><tr><th className="px-5 py-2.5">Case</th><th className="px-4 py-2.5">Amount</th><th className="px-4 py-2.5">Expected</th><th className="px-4 py-2.5">RecoverFlow</th><th className="px-4 py-2.5">Confidence</th><th className="px-4 py-2.5">Policy</th><th className="px-4 py-2.5">Result</th></tr></thead><tbody className="divide-y divide-[#eef1f5]">{rows.map((row) => { const matched = row.action === row.expected_action; return <tr key={row.id} className={matched ? "bg-white" : "bg-amber-50/25"}><td className="px-5 py-3.5"><p className="text-[9px] font-bold text-[#3d4861]">{row.name}</p><p className="mt-1 font-mono text-[7px] text-[#9aa2b0]">{row.id} · {pretty(row.category)}</p></td><td className="px-4 py-3.5 text-[9px] font-extrabold text-[#36415b]">{money(row.amount)}</td><td className="px-4 py-3.5"><StatusPill label={pretty(row.expected_action)} tone={actionTone(row.expected_action)}/></td><td className="px-4 py-3.5"><StatusPill label={pretty(row.action)} tone={actionTone(row.action)}/></td><td className="px-4 py-3.5 text-[9px] font-extrabold text-[#45516a]">{Math.round(row.confidence * 100)}%</td><td className="px-4 py-3.5 text-[8px] font-semibold text-[#687389]">{row.autonomous_execution ? "Autonomous" : "No collection"}</td><td className="px-4 py-3.5"><StatusPill label={matched ? "Match" : "Review"} tone={matched ? "success" : "warning"}/></td></tr>; })}</tbody></table></div>
            </SectionCard>
          </>
        )}
      </div>
    </AppShell>
  );
}
