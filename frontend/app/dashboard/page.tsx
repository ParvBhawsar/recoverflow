"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell, Metric, SectionCard, StatusPill } from "@/components/app-shell";
import {
  API_BASE,
  CaseDetail,
  RecoveryCase,
  RecoverySummary,
  confidenceLabel,
  isModelPlanner,
  money,
  pretty,
  shortDate,
  statusTone,
} from "@/lib/product";

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

function DecisionIcon({ action }: { action?: string | null }) {
  if (action === "CREATE_RECOVERY_LINK") return <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-emerald-50 text-emerald-600"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 12h8"/><path d="M12 8v8"/><rect x="4" y="4" width="16" height="16" rx="5"/></svg></span>;
  if (action === "WAIT_AND_VERIFY") return <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-amber-50 text-amber-600"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg></span>;
  return <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-rose-50 text-rose-600"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 4 3.5 19h17L12 4Z"/><path d="M12 9v4"/><path d="M12 16h.01"/></svg></span>;
}

function EmptyState() {
  return (
    <div className="grid min-h-[260px] place-items-center px-6 text-center">
      <div>
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-[12px] border border-[#e3e8f1] bg-[#fafbfe] text-[#7e889c]"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 5h14v14H5z"/><path d="M8 9h8M8 13h5"/></svg></div>
        <p className="mt-4 text-[12px] font-bold text-[#34405a]">No recovery cases yet</p>
        <p className="mx-auto mt-1 max-w-[260px] text-[10px] leading-5 text-[#8c95a8]">Create a sandbox case to see how RecoverFlow diagnoses and handles a payment failure.</p>
      </div>
    </div>
  );
}

function QueueLoading() {
  return <div className="divide-y divide-[#eef1f5]">{[0,1,2,3].map((row) => <div key={row} className="grid grid-cols-[1.2fr_1fr_.6fr_.8fr] gap-5 px-5 py-4"><div><div className="skeleton h-3 w-32 rounded"/><div className="skeleton mt-2 h-2 w-16 rounded"/></div><div className="skeleton h-3 w-28 rounded"/><div className="skeleton h-3 w-16 rounded"/><div className="skeleton h-7 w-24 rounded-full"/></div>)}</div>;
}

function InspectorLoading() {
  return <div className="p-1"><div className="skeleton h-2.5 w-20 rounded"/><div className="skeleton mt-3 h-5 w-44 rounded"/><div className="mt-5 grid grid-cols-2 gap-2.5"><div className="skeleton h-16 rounded-[10px]"/><div className="skeleton h-16 rounded-[10px]"/></div><div className="skeleton mt-4 h-28 rounded-[11px]"/><div className="skeleton mt-3 h-16 rounded-[10px]"/></div>;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<RecoverySummary | null>(null);
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [selected, setSelected] = useState<RecoveryCase | null>(null);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [message, setMessage] = useState("Connecting to recovery engine…");
  const [recoveryUrl, setRecoveryUrl] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function loadDetail(id: number) {
    try {
      const response = await fetch(`${API_BASE}/recovery/cases/${id}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load case details");
      setDetail((await response.json()) as CaseDetail);
    } catch {
      setDetail(null);
    }
  }

  async function refresh() {
    setMessage("Syncing live recovery data…");
    try {
      const [summaryResponse, casesResponse] = await Promise.all([
        fetch(`${API_BASE}/recovery/summary`, { cache: "no-store" }),
        fetch(`${API_BASE}/recovery/cases`, { cache: "no-store" }),
      ]);
      if (!summaryResponse.ok || !casesResponse.ok) throw new Error("Recovery service unavailable");
      const nextSummary = (await summaryResponse.json()) as RecoverySummary;
      const nextCases = (await casesResponse.json()) as RecoveryCase[];
      setSummary(nextSummary);
      setCases(nextCases);
      const nextSelected = nextCases.find((item) => item.id === selected?.id) || nextCases[0] || null;
      setSelected(nextSelected);
      if (nextSelected) await loadDetail(nextSelected.id);
      else setDetail(null);
      setMessage("Live data synced");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach recovery service");
    } finally {
      setHasLoaded(true);
    }
  }

  async function createTestCase() {
    setBusy(true);
    setRecoveryUrl(null);
    setMessage("Creating payment-failure case…");
    try {
      const response = await fetch(`${API_BASE}/recovery/demo/failure`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not create test case");
      setMessage(`Case #${data.case_id} created · ${data.planner_model || pretty(data.planner_source)}`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test case failed");
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
      const response = await fetch(`${API_BASE}/recovery/cases/${selected.id}/execute`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Execution failed");
      setRecoveryUrl(data.payment_link_url || null);
      setMessage("Recovery link created · awaiting customer payment");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution failed");
    } finally {
      setBusy(false);
    }
  }

  async function simulateOriginalSuccess() {
    if (!selected) return;
    setBusy(true);
    setMessage("Processing late original success…");
    try {
      const response = await fetch(`${API_BASE}/recovery/cases/${selected.id}/demo/original-success`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not process late success");
      setMessage(data.needs_attention ? "Late success needs manual attention" : "Recovery stopped · duplicate collection prevented");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Late-success handling failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filteredCases = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return cases;
    return cases.filter((item) => [item.razorpay_payment_id, item.diagnosis || "", item.status, item.recommended_action || ""].some((field) => field.toLowerCase().includes(normalized)));
  }, [cases, query]);

  const recoveredCount = cases.filter((item) => item.status === "RECOVERED").length;
  const canExecute = selected?.status === "ACTION_PROPOSED" && selected.recommended_action === "CREATE_RECOVERY_LINK" && detail?.policy_guard.allowed;
  const canSimulateLate = selected?.status === "WAITING_FOR_CUSTOMER" && selected.razorpay_payment_id.startsWith("pay_demo_");
  const recentLogs = detail?.audit_logs?.slice(-5).reverse() || [];
  const hasError = message.toLowerCase().includes("unavailable") || message.toLowerCase().includes("could not") || message.toLowerCase().includes("failed");

  return (
    <AppShell
      title="Recovery overview"
      description="Monitor failed-payment recovery, decision quality and duplicate-charge protection."
      actions={
        <>
          <button onClick={() => void refresh()} disabled={busy} className="hidden rounded-[9px] border border-[#dfe4ed] bg-white px-3.5 py-2 text-[10px] font-bold text-[#57627a] transition hover:bg-[#f8f9fb] sm:inline-flex">Refresh</button>
          <button onClick={() => void createTestCase()} disabled={busy} className="inline-flex items-center gap-2 rounded-[9px] bg-[#2f5bff] px-3.5 py-2 text-[10px] font-bold text-white shadow-[0_6px_16px_rgba(47,91,255,.20)] transition hover:-translate-y-0.5 hover:bg-[#244fe0] disabled:opacity-50">{busy && <Spinner/>} Create test case</button>
        </>
      }
    >
      <div className="mx-auto max-w-[1380px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[11px] border border-[#e4e9f1] bg-white px-4 py-3 shadow-[0_3px_12px_rgba(19,30,60,.025)]">
          <div className="flex items-center gap-2.5"><span className={`h-2 w-2 rounded-full ${!hasLoaded ? "animate-pulse bg-[#2f5bff]" : hasError ? "bg-rose-500" : "bg-emerald-500"}`}/><span className="text-[10px] font-semibold text-[#657087]">{message}</span></div>
          <div className="flex items-center gap-4 text-[9px] font-semibold text-[#9aa2b0]"><span>Razorpay Test Mode</span><span className="hidden sm:inline">Signed webhooks</span><span className="hidden md:inline">Supabase persistence</span></div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric loading={!hasLoaded} label="Revenue at risk" value={money(summary?.revenue_at_risk || 0)} detail={`${summary?.active_cases || 0} active cases`} accent="blue" />
          <Metric loading={!hasLoaded} label="Recovered revenue" value={money(summary?.recovered_revenue || 0)} detail={`${recoveredCount} confirmed recoveries`} accent="green" />
          <Metric loading={!hasLoaded} label="Recovery rate" value={`${summary?.recovery_rate || 0}%`} detail="recovered / total case value" accent="violet" />
          <Metric loading={!hasLoaded} label="Late-success protected" value={money(summary?.late_success_protected_value || 0)} detail={`${summary?.late_success_protected_cases || 0} duplicate risks stopped`} accent="amber" />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
          <SectionCard className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f5] px-4 py-3.5 md:px-5">
              <div><h2 className="text-[12px] font-[760] text-[#18233f]">Recovery queue</h2><p className="mt-0.5 text-[9px] text-[#9098aa]">Payment failures ordered by latest activity</p></div>
              <div className="relative w-full sm:w-[240px]"><svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ba3b1]" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payment, diagnosis, status…" className="w-full rounded-[9px] border border-[#e1e5ed] bg-[#fafbfe] py-2 pl-9 pr-3 text-[9px] font-medium text-[#34405c] placeholder:text-[#a9b0bd] focus:bg-white"/></div>
            </div>

            {!hasLoaded ? <QueueLoading/> : filteredCases.length === 0 ? <EmptyState/> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-[#fafbfe] text-[8px] font-extrabold uppercase tracking-[0.08em] text-[#9aa2b1]"><tr><th className="px-5 py-2.5">Payment</th><th className="px-4 py-2.5">Diagnosis</th><th className="px-4 py-2.5">Amount</th><th className="px-4 py-2.5">Decision</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Updated</th></tr></thead>
                  <tbody className="divide-y divide-[#eef1f5]">
                    {filteredCases.map((item) => (
                      <tr key={item.id} onClick={() => { setSelected(item); setRecoveryUrl(null); void loadDetail(item.id); }} className={`cursor-pointer transition ${selected?.id === item.id ? "bg-[#f5f7ff]" : "bg-white hover:bg-[#fafbfe]"}`}>
                        <td className="px-5 py-3.5"><p className="font-mono text-[9px] font-bold text-[#34405b]">{item.razorpay_payment_id}</p><p className="mt-1 text-[8px] text-[#9aa2b1]">Case #{item.id}</p></td>
                        <td className="px-4 py-3.5"><p className="max-w-[170px] truncate text-[9px] font-semibold text-[#59647b]">{pretty(item.diagnosis)}</p></td>
                        <td className="px-4 py-3.5 text-[9px] font-extrabold text-[#25314d]">{money(item.amount)}</td>
                        <td className="px-4 py-3.5"><div className="flex items-center gap-2"><DecisionIcon action={item.recommended_action}/><span className="max-w-[125px] text-[8px] font-bold text-[#58647b]">{pretty(item.recommended_action)}</span></div></td>
                        <td className="px-4 py-3.5"><StatusPill label={pretty(item.status)} tone={statusTone(item.status)} /></td>
                        <td className="px-4 py-3.5 text-[8px] font-semibold text-[#929aad]">{shortDate(item.updated_at || item.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <div className="space-y-5">
            <SectionCard className="p-5">
              {!hasLoaded ? <InspectorLoading/> : !selected ? <EmptyState/> : (
                <>
                  <div className="flex items-start justify-between gap-3"><div><p className="text-[8px] font-extrabold uppercase tracking-[0.13em] text-[#2f5bff]">Case inspector</p><h2 className="mt-1.5 text-[16px] font-[760] tracking-[-0.03em] text-[#17213f]">{pretty(selected.diagnosis)}</h2><p className="mt-1 font-mono text-[8px] text-[#9aa2b0]">{selected.razorpay_payment_id}</p></div><StatusPill label={pretty(selected.status)} tone={statusTone(selected.status)} /></div>

                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <div className="rounded-[10px] bg-[#f8f9fc] p-3"><p className="text-[7px] font-extrabold uppercase tracking-[.09em] text-[#9ba2b0]">Amount</p><p className="mt-1.5 text-[13px] font-extrabold text-[#25314c]">{money(selected.amount)}</p></div>
                    <div className="rounded-[10px] bg-[#f8f9fc] p-3"><p className="text-[7px] font-extrabold uppercase tracking-[.09em] text-[#9ba2b0]">Confidence</p><p className="mt-1.5 text-[13px] font-extrabold text-[#25314c]">{confidenceLabel(selected.confidence)}</p></div>
                  </div>

                  <div className="mt-4 rounded-[11px] border border-[#e7ebf2] p-3.5"><div className="flex items-center gap-3"><DecisionIcon action={selected.recommended_action}/><div><p className="text-[7px] font-extrabold uppercase tracking-[.1em] text-[#9aa2b0]">Recommended action</p><p className="mt-1 text-[11px] font-extrabold text-[#2b3651]">{pretty(selected.recommended_action)}</p></div></div><p className="mt-3 text-[10px] leading-5 text-[#727d92]">{selected.reason || "No recovery explanation available."}</p></div>

                  <div className={`mt-3 rounded-[10px] border p-3 ${detail?.policy_guard.allowed ? "border-emerald-100 bg-emerald-50/55" : "border-[#e7eaf0] bg-[#fafbfc]"}`}><p className={`text-[8px] font-extrabold uppercase tracking-[.1em] ${detail?.policy_guard.allowed ? "text-emerald-700" : "text-[#8992a3]"}`}>{detail?.policy_guard.allowed ? "Policy approved" : "Policy state"}</p><p className="mt-1.5 text-[9px] leading-4 text-[#687389]">{detail?.policy_guard.reason || "Loading policy decision…"}</p></div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {canExecute && <button onClick={() => void executeRecovery()} disabled={busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-[9px] bg-[#2f5bff] px-3 py-2.5 text-[9px] font-extrabold text-white transition hover:bg-[#244fe0] disabled:opacity-50">{busy && <Spinner/>} Create recovery link</button>}
                    {canSimulateLate && <button onClick={() => void simulateOriginalSuccess()} disabled={busy} className="flex-1 rounded-[9px] border border-[#dfe4ed] bg-white px-3 py-2.5 text-[9px] font-extrabold text-[#536078] transition hover:bg-[#f8f9fb]">Simulate late success</button>}
                    {recoveryUrl && <a href={recoveryUrl} target="_blank" rel="noreferrer" className="w-full rounded-[9px] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center text-[9px] font-extrabold text-emerald-700">Open Razorpay Payment Link ↗</a>}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#eef0f4] pt-3 text-[8px] text-[#969ead]"><span>{isModelPlanner(selected.planner_source) ? `Planned by ${selected.planner_model || pretty(selected.planner_source)}` : "Deterministic safety fallback"}</span><span>{selected.attempt_count} attempt{selected.attempt_count === 1 ? "" : "s"}</span></div>
                </>
              )}
            </SectionCard>

            <SectionCard className="overflow-hidden">
              <div className="border-b border-[#edf0f5] px-4 py-3"><p className="text-[10px] font-extrabold text-[#28334f]">Recent activity</p></div>
              {!hasLoaded ? <div className="space-y-3 px-4 py-5"><div className="skeleton h-10 rounded-lg"/><div className="skeleton h-10 rounded-lg"/><div className="skeleton h-10 rounded-lg"/></div> : recentLogs.length === 0 ? <div className="px-4 py-6 text-[9px] text-[#969ead]">Select a case to inspect its audit trail.</div> : <div className="divide-y divide-[#eef1f5]">{recentLogs.map((log) => <div key={log.id} className="flex gap-3 px-4 py-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#2f5bff] shadow-[0_0_0_4px_rgba(47,91,255,.08)]"/><div><p className="text-[8px] font-extrabold uppercase tracking-[.07em] text-[#59647b]">{pretty(log.event_type)}</p><p className="mt-1 text-[9px] leading-4 text-[#7e8799]">{log.message}</p><p className="mt-1 text-[7px] font-medium text-[#a1a8b5]">{shortDate(log.created_at)}</p></div></div>)}</div>}
            </SectionCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
