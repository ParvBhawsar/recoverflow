"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell, Metric, SectionCard, StatusPill } from "@/components/app-shell";
import { API_BASE, money, pretty } from "@/lib/product";

type EvalRow = {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  method: string;
  error_code: string;
  error_source: string;
  error_step: string;
  error_reason: string;
  expected_action: string;
  late_success_risk: string;
  expected_autonomous_execution: boolean;
  rationale: string;
};

type DatasetResponse = {
  version: string;
  description: string;
  synthetic: boolean;
  summary: {
    total_cases: number;
    autonomous_cases: number;
    action_distribution: Record<string, number>;
    category_distribution: Record<string, number>;
    late_success_risk_distribution: Record<string, number>;
  };
  records: EvalRow[];
};

function actionTone(action: string): "success" | "warning" | "danger" | "neutral" {
  if (action === "CREATE_RECOVERY_LINK") return "success";
  if (action === "WAIT_AND_VERIFY") return "warning";
  if (action === "ESCALATE") return "danger";
  return "neutral";
}

export default function EvaluationDatasetPage() {
  const [data, setData] = useState<DatasetResponse | null>(null);
  const [message, setMessage] = useState("Loading labelled dataset…");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("ALL");

  async function loadDataset() {
    try {
      const response = await fetch(`${API_BASE}/recovery/evaluation/dataset`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load evaluation dataset");
      const payload = (await response.json()) as DatasetResponse;
      setData(payload);
      setMessage(`${payload.summary.total_cases} labelled synthetic cases available`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach recovery service");
    }
  }

  useEffect(() => {
    void loadDataset();
  }, []);

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (data?.records || []).filter((row) => {
      const matchesQuery = !normalized || [row.id, row.name, row.category, row.error_reason].some((field) => field.toLowerCase().includes(normalized));
      const matchesAction = action === "ALL" || row.expected_action === action;
      return matchesQuery && matchesAction;
    });
  }, [data, query, action]);

  return (
    <AppShell
      title="Evaluation dataset"
      description="Versioned labelled scenarios used to evaluate recovery strategy and safety."
      actions={<button onClick={() => void loadDataset()} className="rounded-[9px] border border-[#dfe4ed] bg-white px-3.5 py-2 text-[10px] font-bold text-[#57627a] transition hover:bg-[#f8f9fb]">Refresh dataset</button>}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[11px] border border-[#e4e9f1] bg-white px-4 py-3"><div className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-violet-500"/><span className="text-[10px] font-semibold text-[#657087]">{message}</span></div><div className="flex items-center gap-2"><StatusPill label={data?.version || "rf-synth-v1"} tone="info"/><StatusPill label="Synthetic" tone="warning"/></div></div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Labelled cases" value={String(data?.summary.total_cases || 0)} detail="versioned synthetic records" accent="blue" />
          <Metric label="Autonomous labels" value={String(data?.summary.autonomous_cases || 0)} detail="expected safe collection" accent="green" />
          <Metric label="Wait & verify" value={String(data?.summary.action_distribution.WAIT_AND_VERIFY || 0)} detail="uncertain final-state cases" accent="amber" />
          <Metric label="Escalations" value={String(data?.summary.action_distribution.ESCALATE || 0)} detail="ambiguous / high-value cases" accent="violet" />
        </div>

        <SectionCard className="mt-5 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f5] px-5 py-4"><div><h2 className="text-[12px] font-[760] text-[#1d2845]">Labelled payment failures</h2><p className="mt-1 text-[9px] text-[#9098aa]">Ground truth used for reproducible strategy evaluation.</p></div><div className="flex flex-wrap gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search case or failure reason" className="w-[210px] rounded-[9px] border border-[#e1e5ed] bg-[#fafbfe] px-3 py-2 text-[9px] font-medium text-[#45516a] placeholder:text-[#a4abb8] focus:bg-white"/><select value={action} onChange={(event) => setAction(event.target.value)} className="rounded-[9px] border border-[#e1e5ed] bg-white px-3 py-2 text-[9px] font-bold text-[#59647a]"><option value="ALL">All expected actions</option><option value="CREATE_RECOVERY_LINK">Create recovery link</option><option value="WAIT_AND_VERIFY">Wait & verify</option><option value="ESCALATE">Escalate</option></select></div></div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left"><thead className="bg-[#fafbfe] text-[8px] font-extrabold uppercase tracking-[.08em] text-[#9aa2b1]"><tr><th className="px-5 py-2.5">Scenario</th><th className="px-4 py-2.5">Amount</th><th className="px-4 py-2.5">Method</th><th className="px-4 py-2.5">Failure context</th><th className="px-4 py-2.5">Late-success risk</th><th className="px-4 py-2.5">Expected action</th><th className="px-4 py-2.5">Autonomous</th></tr></thead><tbody className="divide-y divide-[#eef1f5]">{rows.map((row) => <tr key={row.id} className="bg-white transition hover:bg-[#fafbfe]"><td className="px-5 py-3.5"><p className="text-[9px] font-bold text-[#3b4760]">{row.name}</p><p className="mt-1 font-mono text-[7px] text-[#9aa2b0]">{row.id} · {pretty(row.category)}</p><p className="mt-1.5 max-w-[360px] text-[8px] leading-4 text-[#7d8799]">{row.rationale}</p></td><td className="px-4 py-3.5 text-[9px] font-extrabold text-[#36415b]">{money(row.amount)}</td><td className="px-4 py-3.5 text-[9px] font-semibold text-[#677287]">{pretty(row.method)}</td><td className="px-4 py-3.5"><p className="text-[9px] font-semibold text-[#59647a]">{pretty(row.error_reason)}</p><p className="mt-1 text-[7px] text-[#9ba2b0]">{pretty(row.error_source)} · {pretty(row.error_step)}</p></td><td className="px-4 py-3.5"><StatusPill label={pretty(row.late_success_risk)} tone={row.late_success_risk === "high" ? "danger" : row.late_success_risk === "medium" ? "warning" : "neutral"}/></td><td className="px-4 py-3.5"><StatusPill label={pretty(row.expected_action)} tone={actionTone(row.expected_action)}/></td><td className="px-4 py-3.5 text-[8px] font-extrabold text-[#59647a]">{row.expected_autonomous_execution ? "Allowed" : "No"}</td></tr>)}</tbody></table>
          </div>
          <div className="flex items-center justify-between border-t border-[#edf0f5] px-5 py-3"><span className="text-[8px] font-semibold text-[#929aad]">Showing {rows.length} of {data?.summary.total_cases || 0} records</span><span className="text-[8px] text-[#a0a7b4]">Synthetic evaluation data · not production performance</span></div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
