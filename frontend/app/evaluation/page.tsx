"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);

const pretty = (value: string) =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function actionTone(action: string) {
  if (action === "CREATE_RECOVERY_LINK") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (action === "WAIT_AND_VERIFY") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-red-100 bg-red-50 text-red-700";
}

export default function EvaluationDatasetPage() {
  const [data, setData] = useState<DatasetResponse | null>(null);
  const [message, setMessage] = useState("Loading labelled dataset…");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("ALL");

  useEffect(() => {
    fetch(`${API_BASE}/recovery/evaluation/dataset`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load evaluation dataset");
        return (await res.json()) as DatasetResponse;
      })
      .then((payload) => {
        setData(payload);
        setMessage(`${payload.summary.total_cases} labelled synthetic cases ready`);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not reach backend"));
  }, []);

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (data?.records || []).filter((row) => {
      const matchesQuery =
        !normalized ||
        row.id.toLowerCase().includes(normalized) ||
        row.name.toLowerCase().includes(normalized) ||
        row.category.toLowerCase().includes(normalized) ||
        row.error_reason.toLowerCase().includes(normalized);
      const matchesAction = action === "ALL" || row.expected_action === action;
      return matchesQuery && matchesAction;
    });
  }, [data, query, action]);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#0b1638]">
      <header className="border-b border-[#e8ebf3] bg-white">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2f5bff] text-lg font-black text-white">R</div>
            <div>
              <p className="text-[17px] font-extrabold">RecoverFlow</p>
              <p className="text-[10px] font-medium text-[#697391]">Evaluation Lab · Synthetic dataset</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/simulator" className="rounded-lg border border-[#dfe4ee] bg-white px-4 py-2 text-xs font-extrabold text-[#35405f]">Simulation Lab</Link>
            <Link href="/" className="rounded-lg bg-[#2f5bff] px-4 py-2 text-xs font-extrabold text-white">Dashboard</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1540px] px-6 py-7">
        <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <div>
            <span className="rounded-md bg-[#edf2ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2f5bff]">Benchmark Dataset</span>
            <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">A labelled test set for recovery decisions.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#697391]">
              This versioned dataset covers customer-fixable failures, transient bank/gateway ambiguity, high-value guardrails, risky patterns and boundary cases. It is explicitly synthetic and exists to make evaluation reproducible.
            </p>
            <p className="mt-3 text-xs font-bold text-[#44506c]">{message}</p>
          </div>

          <div className="rounded-2xl border border-[#dbe4ff] bg-white p-5 shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7b849e]">Dataset version</p>
                <p className="mt-1 text-xl font-extrabold">{data?.version || "—"}</p>
              </div>
              <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-[10px] font-extrabold text-amber-700">Synthetic data</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Cases" value={String(data?.summary.total_cases || 0)} />
              <Metric label="Autonomous" value={String(data?.summary.autonomous_cases || 0)} />
              <Metric label="Labels" value="3 actions" />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <ActionCard label="Create recovery link" count={data?.summary.action_distribution.CREATE_RECOVERY_LINK || 0} note="customer-fixable cases" />
          <ActionCard label="Wait & verify" count={data?.summary.action_distribution.WAIT_AND_VERIFY || 0} note="late-success-sensitive cases" />
          <ActionCard label="Escalate" count={data?.summary.action_distribution.ESCALATE || 0} note="ambiguous, risky or high-value" />
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-[#e4e8f1] bg-white shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f5] px-5 py-4">
            <div>
              <h2 className="text-base font-extrabold">Labelled cases</h2>
              <p className="mt-1 text-xs text-[#7b849e]">Ground truth for the upcoming RecoverFlow vs blind-retry benchmark</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search case / reason"
                className="rounded-lg border border-[#dfe4ee] px-3 py-2 text-xs outline-none focus:border-[#2f5bff]"
              />
              <select value={action} onChange={(event) => setAction(event.target.value)} className="rounded-lg border border-[#dfe4ee] bg-white px-3 py-2 text-xs font-bold">
                <option value="ALL">All labels</option>
                <option value="CREATE_RECOVERY_LINK">Create Recovery Link</option>
                <option value="WAIT_AND_VERIFY">Wait & Verify</option>
                <option value="ESCALATE">Escalate</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="border-b border-[#edf0f5] bg-[#fafbfe] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#7b849e]">
                <tr>
                  <th className="px-5 py-3">Case</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Failure</th>
                  <th className="px-4 py-3">Late-success risk</th>
                  <th className="px-4 py-3">Expected action</th>
                  <th className="px-4 py-3">Autonomous?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f5]">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#fafbfe]">
                    <td className="px-5 py-4">
                      <p className="font-extrabold text-[#17213f]">{row.name}</p>
                      <p className="mt-1 font-mono text-[10px] text-[#8a93aa]">{row.id} · {pretty(row.category)}</p>
                      <p className="mt-1 max-w-md text-[11px] leading-4 text-[#6f7894]">{row.rationale}</p>
                    </td>
                    <td className="px-4 py-4 font-extrabold">{money(row.amount)}</td>
                    <td className="px-4 py-4">{pretty(row.method)}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{pretty(row.error_reason)}</p>
                      <p className="mt-1 text-[10px] text-[#8a93aa]">{pretty(row.error_source)}</p>
                    </td>
                    <td className="px-4 py-4"><span className="rounded-full bg-[#f2f4f8] px-2 py-1 font-bold">{pretty(row.late_success_risk)}</span></td>
                    <td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 font-extrabold ${actionTone(row.expected_action)}`}>{pretty(row.expected_action)}</span></td>
                    <td className="px-4 py-4 font-extrabold">{row.expected_autonomous_execution ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#edf0f5] px-5 py-3 text-[11px] font-semibold text-[#7b849e]">Showing {rows.length} of {data?.summary.total_cases || 0} synthetic records.</div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f7f9fd] p-3 text-center"><p className="text-[10px] font-bold uppercase text-[#8a93aa]">{label}</p><p className="mt-1 text-xl font-extrabold">{value}</p></div>;
}

function ActionCard({ label, count, note }: { label: string; count: number; note: string }) {
  return <div className="rounded-2xl border border-[#e4e8f1] bg-white p-5"><p className="text-xs font-bold text-[#697391]">{label}</p><div className="mt-2 flex items-end justify-between"><p className="text-3xl font-extrabold">{count}</p><p className="text-[11px] text-[#8a93aa]">{note}</p></div></div>;
}
