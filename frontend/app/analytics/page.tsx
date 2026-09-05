"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell, Metric, SectionCard, SubtleLink } from "@/components/app-shell";
import { API_BASE, RecoveryCase, RecoverySummary, money, pretty } from "@/lib/product";

function Bar({ label, value, total, note }: { label: string; value: number; total: number; note?: string }) {
  const pct = total ? Math.max(4, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-bold text-[#4d5870]">{label}</p>{note && <p className="mt-0.5 text-[7px] text-[#9aa2b1]">{note}</p>}</div><p className="text-[9px] font-extrabold text-[#28344f]">{value}</p></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0f5]"><div className="h-full rounded-full bg-[#2f5bff] transition-[width] duration-700" style={{ width: `${pct}%` }}/></div>
    </div>
  );
}

function Donut({ value, label }: { value: number; label: string }) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div className="relative grid h-32 w-32 place-items-center rounded-full" style={{ background: `conic-gradient(#2f5bff ${safe * 3.6}deg, #edf0f5 0deg)` }}>
      <div className="grid h-[98px] w-[98px] place-items-center rounded-full bg-white text-center"><div><p className="text-[24px] font-[780] tracking-[-.04em] text-[#17213e]">{safe}%</p><p className="mt-0.5 text-[7px] font-extrabold uppercase tracking-[.1em] text-[#9aa2b0]">{label}</p></div></div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<RecoverySummary | null>(null);
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading merchant insights…");

  async function refresh() {
    setLoading(true);
    setMessage("Syncing merchant insights…");
    try {
      const [summaryRes, casesRes] = await Promise.all([
        fetch(`${API_BASE}/recovery/summary`, { cache: "no-store" }),
        fetch(`${API_BASE}/recovery/cases`, { cache: "no-store" }),
      ]);
      if (!summaryRes.ok || !casesRes.ok) throw new Error("Recovery service unavailable");
      setSummary((await summaryRes.json()) as RecoverySummary);
      setCases((await casesRes.json()) as RecoveryCase[]);
      setMessage("Live recovery insights synced");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load recovery insights");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const status = useMemo(() => ({
    proposed: cases.filter((item) => item.status === "ACTION_PROPOSED").length,
    waiting: cases.filter((item) => item.status === "WAITING_FOR_CUSTOMER").length,
    recovered: cases.filter((item) => item.status === "RECOVERED").length,
    protected: cases.filter((item) => item.status === "ORIGINAL_PAYMENT_CAPTURED").length,
    attention: cases.filter((item) => item.status === "PROTECTION_ATTENTION_REQUIRED" || item.status === "DUPLICATE_COLLECTION_DETECTED").length,
  }), [cases]);

  const decisions = useMemo(() => ({
    recover: cases.filter((item) => item.recommended_action === "CREATE_RECOVERY_LINK").length,
    verify: cases.filter((item) => item.recommended_action === "WAIT_AND_VERIFY").length,
    escalate: cases.filter((item) => item.recommended_action === "ESCALATE").length,
  }), [cases]);

  const failureGroups = useMemo(() => {
    const groups = [
      { label: "Authentication / OTP", count: 0 },
      { label: "Insufficient funds", count: 0 },
      { label: "Gateway / bank", count: 0 },
      { label: "Other / ambiguous", count: 0 },
    ];
    for (const item of cases) {
      const diagnosis = (item.diagnosis || "").toLowerCase();
      if (diagnosis.includes("otp") || diagnosis.includes("auth")) groups[0].count += 1;
      else if (diagnosis.includes("fund")) groups[1].count += 1;
      else if (diagnosis.includes("gateway") || diagnosis.includes("bank") || diagnosis.includes("timeout")) groups[2].count += 1;
      else groups[3].count += 1;
    }
    return groups;
  }, [cases]);

  const recoverableValue = cases.filter((item) => item.status !== "RECOVERED" && item.recommended_action === "CREATE_RECOVERY_LINK").reduce((sum, item) => sum + item.amount, 0);
  const totalRecovered = summary?.recovered_revenue || 0;
  const totalCaseValue = cases.reduce((sum, item) => sum + item.amount, 0);
  const recoveredShare = totalCaseValue ? Math.round((totalRecovered / totalCaseValue) * 100) : 0;

  return (
    <AppShell
      title="Recovery insights"
      description="Understand recovery performance, failure mix and operational risk."
      actions={<button onClick={() => void refresh()} disabled={loading} className="rounded-[9px] border border-[#dfe4ed] bg-white px-3 py-2 text-[9px] font-bold text-[#59657c] transition hover:bg-[#f8f9fb] disabled:opacity-50">{loading ? "Syncing…" : "Refresh"}</button>}
    >
      <div className="mx-auto max-w-[1380px]">
        <div className="mb-5 flex flex-col gap-2 rounded-[12px] border border-[#e5e9f1] bg-white px-4 py-3 shadow-[0_3px_14px_rgba(21,32,65,.025)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${message.toLowerCase().includes("unavailable") || message.toLowerCase().includes("could not") ? "bg-rose-500" : loading ? "bg-amber-400" : "bg-emerald-500"}`}/><span className="text-[9px] font-semibold text-[#667188]">{message}</span></div>
          <p className="text-[8px] font-medium text-[#9aa2b0]">Operational metrics from current recovery cases</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[116px] rounded-[15px]"/>) : <>
            <Metric label="Recovered revenue" value={money(summary?.recovered_revenue || 0)} detail={`${status.recovered} confirmed recoveries`} accent="green" />
            <Metric label="Revenue at risk" value={money(summary?.revenue_at_risk || 0)} detail={`${summary?.active_cases || 0} active cases`} accent="blue" />
            <Metric label="Recoverable now" value={money(recoverableValue)} detail="eligible for bounded recovery" accent="violet" />
            <Metric label="Late-success protected" value={money(summary?.late_success_protected_value || 0)} detail={`${status.protected} duplicate risks stopped`} accent="amber" />
          </>}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <SectionCard className="p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#2f5bff]">Recovery performance</p><h2 className="mt-2 text-[17px] font-[760] tracking-[-.03em] text-[#17213f]">Where payment value is landing</h2></div><Donut value={recoveredShare} label="Recovered"/></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[12px] bg-[#f8f9fc] p-4"><p className="text-[8px] font-extrabold uppercase tracking-[.1em] text-[#98a0af]">Total case value</p><p className="mt-2 text-[20px] font-[780] tracking-[-.04em] text-[#17213e]">{money(totalCaseValue)}</p></div>
              <div className="rounded-[12px] bg-[#f8f9fc] p-4"><p className="text-[8px] font-extrabold uppercase tracking-[.1em] text-[#98a0af]">Recovery rate</p><p className="mt-2 text-[20px] font-[780] tracking-[-.04em] text-[#17213e]">{summary?.recovery_rate || 0}%</p></div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Needs action", status.proposed], ["Waiting", status.waiting], ["Recovered", status.recovered], ["Protected", status.protected]].map(([label, value]) => <div key={String(label)} className="rounded-[11px] border border-[#e8ebf2] bg-white p-3"><p className="text-[7px] font-extrabold uppercase tracking-[.1em] text-[#9aa2b1]">{label}</p><p className="mt-1.5 text-[17px] font-[760] text-[#25314c]">{value}</p></div>)}</div>
          </SectionCard>

          <SectionCard className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#2f5bff]">Failure mix</p><h2 className="mt-2 text-[17px] font-[760] tracking-[-.03em] text-[#17213f]">Why payments are failing</h2></div><span className="rounded-full border border-[#e3e7ee] bg-[#f8f9fb] px-2.5 py-1 text-[8px] font-bold text-[#748096]">{cases.length} cases</span></div>
            <div className="mt-6 space-y-5">{failureGroups.map((group) => <Bar key={group.label} label={group.label} value={group.count} total={cases.length}/>)}</div>
          </SectionCard>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <SectionCard className="p-5">
            <p className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#2f5bff]">Decision mix</p><h3 className="mt-2 text-[14px] font-[760] text-[#1e2945]">What RecoverFlow recommends</h3>
            <div className="mt-5 space-y-4"><Bar label="Create recovery link" value={decisions.recover} total={cases.length} note="customer-fixable failures"/><Bar label="Wait & verify" value={decisions.verify} total={cases.length} note="uncertain payment state"/><Bar label="Escalate" value={decisions.escalate} total={cases.length} note="ambiguous or policy-sensitive"/></div>
          </SectionCard>

          <SectionCard className="p-5">
            <p className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#2f5bff]">Safety signal</p><h3 className="mt-2 text-[14px] font-[760] text-[#1e2945]">Duplicate-risk protection</h3>
            <p className="mt-4 text-[28px] font-[790] tracking-[-.05em] text-[#17213e]">{money(summary?.late_success_protected_value || 0)}</p><p className="mt-1 text-[9px] leading-5 text-[#7f899c]">Payment value protected when the original transaction succeeded late and an additional collection path was stopped.</p>
            <div className="mt-5 flex items-center justify-between rounded-[11px] bg-[#f8f9fc] px-3 py-3"><span className="text-[8px] font-bold text-[#6c778c]">Attention required</span><span className={`text-[12px] font-extrabold ${status.attention ? "text-rose-600" : "text-emerald-600"}`}>{status.attention}</span></div>
          </SectionCard>

          <SectionCard className="p-5">
            <p className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#2f5bff]">Model assurance</p><h3 className="mt-2 text-[14px] font-[760] text-[#1e2945]">Technical validation</h3>
            <p className="mt-3 text-[9px] leading-5 text-[#7f899c]">Synthetic evaluation is intentionally separated from merchant performance. It is available for technical review without cluttering day-to-day operations.</p>
            <div className="mt-5 flex flex-col gap-3"><SubtleLink href="/analytics/evaluation">Open model validation</SubtleLink><SubtleLink href="/benchmark">Run strategy benchmark</SubtleLink><SubtleLink href="/evaluation">Inspect evaluation dataset</SubtleLink></div>
          </SectionCard>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-[14px] border border-[#dfe6f2] bg-[#101a34] px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between md:px-6"><div><p className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#8fa7f5]">Next action</p><p className="mt-1.5 text-[13px] font-bold">Review the cases that still need a recovery decision.</p></div><a href="/cases" className="inline-flex items-center justify-center rounded-[10px] bg-white px-4 py-2.5 text-[9px] font-extrabold text-[#17213e] transition hover:bg-[#f4f6fb]">Open recovery cases</a></div>
      </div>
    </AppShell>
  );
}
