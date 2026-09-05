"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell, SectionCard, StatusPill } from "@/components/app-shell";
import { API_BASE, CaseDetail, RecoveryCase, money, pretty, shortDate, statusTone, confidenceLabel, isModelPlanner } from "@/lib/product";

const filters = [
  ["ALL", "All"],
  ["ACTION_PROPOSED", "Needs action"],
  ["WAITING_FOR_CUSTOMER", "Waiting"],
  ["RECOVERED", "Recovered"],
  ["ORIGINAL_PAYMENT_CAPTURED", "Protected"],
] as const;

function Spinner() {
  return <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

function DecisionMark({ action }: { action?: string | null }) {
  const tone = action === "CREATE_RECOVERY_LINK" ? "bg-emerald-50 text-emerald-600" : action === "WAIT_AND_VERIFY" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600";
  return <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${tone}`}><span className="h-2 w-2 rounded-full bg-current"/></span>;
}

function DetailSkeleton() {
  return <div className="space-y-3"><div className="skeleton h-4 w-28 rounded"/><div className="skeleton h-7 w-52 rounded"/><div className="grid grid-cols-2 gap-2"><div className="skeleton h-16 rounded-xl"/><div className="skeleton h-16 rounded-xl"/></div><div className="skeleton h-28 rounded-xl"/><div className="skeleton h-11 rounded-xl"/></div>;
}

export default function RecoveryCasesPage() {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [selected, setSelected] = useState<RecoveryCase | null>(null);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading recovery cases…");
  const [recoveryUrl, setRecoveryUrl] = useState<string | null>(null);

  async function loadDetail(id: number) {
    setDetail(null);
    const res = await fetch(`${API_BASE}/recovery/cases/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load recovery case");
    setDetail((await res.json()) as CaseDetail);
  }

  async function refresh() {
    setLoading(true);
    setMessage("Syncing recovery cases…");
    try {
      const res = await fetch(`${API_BASE}/recovery/cases`, { cache: "no-store" });
      if (!res.ok) throw new Error("Recovery service unavailable");
      const nextCases = (await res.json()) as RecoveryCase[];
      setCases(nextCases);
      const target = nextCases.find((item) => item.id === selected?.id) || nextCases[0] || null;
      setSelected(target);
      if (target) await loadDetail(target.id);
      else setDetail(null);
      setMessage(`${nextCases.length} case${nextCases.length === 1 ? "" : "s"} synced`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load recovery cases");
    } finally {
      setLoading(false);
    }
  }

  async function executeRecovery() {
    if (!selected) return;
    setBusy(true);
    setRecoveryUrl(null);
    setMessage("Creating Razorpay recovery link…");
    try {
      const res = await fetch(`${API_BASE}/recovery/cases/${selected.id}/execute`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Execution failed");
      setRecoveryUrl(data.payment_link_url || null);
      setMessage("Recovery link created · awaiting customer payment");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution failed");
    } finally {
      setBusy(false);
    }
  }

  async function simulateLateSuccess() {
    if (!selected) return;
    setBusy(true);
    setMessage("Processing late original success…");
    try {
      const res = await fetch(`${API_BASE}/recovery/cases/${selected.id}/demo/original-success`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Late-success handling failed");
      setMessage(data.needs_attention ? "Protection requires attention" : "Duplicate collection prevented");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Late-success handling failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cases.filter((item) => {
      const statusMatch = filter === "ALL" || item.status === filter;
      const textMatch = !needle || [item.razorpay_payment_id, item.diagnosis || "", item.status, item.recommended_action || ""].some((field) => field.toLowerCase().includes(needle));
      return statusMatch && textMatch;
    });
  }, [cases, query, filter]);

  const counts = useMemo(() => ({
    all: cases.length,
    action: cases.filter((item) => item.status === "ACTION_PROPOSED").length,
    waiting: cases.filter((item) => item.status === "WAITING_FOR_CUSTOMER").length,
    recovered: cases.filter((item) => item.status === "RECOVERED").length,
  }), [cases]);

  const canExecute = selected?.status === "ACTION_PROPOSED" && selected.recommended_action === "CREATE_RECOVERY_LINK" && Boolean(detail?.policy_guard.allowed);
  const canSimulateLate = selected?.status === "WAITING_FOR_CUSTOMER" && selected.razorpay_payment_id.startsWith("pay_demo_");

  return (
    <AppShell
      title="Recovery cases"
      description="Review failed payments, decisions, policy state and recovery actions."
      actions={<button onClick={() => void refresh()} disabled={loading || busy} className="rounded-[9px] border border-[#dfe4ed] bg-white px-3 py-2 text-[9px] font-bold text-[#59657c] transition hover:bg-[#f8f9fb] disabled:opacity-50">{loading ? "Syncing…" : "Refresh"}</button>}
    >
      <div className="mx-auto max-w-[1420px]">
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["All cases", counts.all], ["Needs action", counts.action], ["Waiting", counts.waiting], ["Recovered", counts.recovered]].map(([label, value]) => (
            <div key={String(label)} className="rounded-[13px] border border-[#e5e9f1] bg-white px-4 py-3 shadow-[0_3px_14px_rgba(21,32,65,.025)]">
              <p className="text-[8px] font-extrabold uppercase tracking-[.1em] text-[#98a0af]">{label}</p>
              <p className="mt-1.5 text-[21px] font-[780] tracking-[-.04em] text-[#17213e]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-[13px] border border-[#e5e9f1] bg-white p-3 shadow-[0_3px_14px_rgba(21,32,65,.025)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            {filters.map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)} className={`whitespace-nowrap rounded-[9px] px-3 py-2 text-[9px] font-bold transition ${filter === id ? "bg-[#eef3ff] text-[#2f5bff]" : "text-[#768095] hover:bg-[#f7f8fb]"}`}>{label}</button>
            ))}
          </div>
          <div className="relative w-full sm:w-[290px]"><svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ba3b1]" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search payment or diagnosis" className="w-full rounded-[9px] border border-[#e1e5ed] bg-[#fafbfe] py-2.5 pl-9 pr-3 text-[9px] font-medium text-[#34405c] placeholder:text-[#a9b0bd] focus:bg-white"/></div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
          <SectionCard className="overflow-hidden">
            {loading ? (
              <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-[66px] rounded-[10px]"/>)}</div>
            ) : filtered.length === 0 ? (
              <div className="grid min-h-[360px] place-items-center p-8 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] border border-[#e3e8f1] bg-[#fafbfe] text-[#7e889c]">0</div><p className="mt-4 text-[12px] font-bold text-[#34405a]">No cases match this view</p><p className="mt-1 text-[9px] text-[#8c95a8]">Try another filter or clear the search.</p></div></div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[780px] text-left">
                    <thead className="border-b border-[#edf0f5] bg-[#fafbfe] text-[8px] font-extrabold uppercase tracking-[.08em] text-[#9aa2b1]"><tr><th className="px-5 py-3">Payment</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Diagnosis</th><th className="px-4 py-3">Decision</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th></tr></thead>
                    <tbody className="divide-y divide-[#eef1f5]">{filtered.map((item) => <tr key={item.id} onClick={() => { setSelected(item); setRecoveryUrl(null); void loadDetail(item.id); }} className={`cursor-pointer transition ${selected?.id === item.id ? "bg-[#f5f7ff]" : "hover:bg-[#fafbfe]"}`}><td className="px-5 py-3.5"><p className="font-mono text-[9px] font-bold text-[#34405b]">{item.razorpay_payment_id}</p><p className="mt-1 text-[8px] text-[#9aa2b1]">Case #{item.id}</p></td><td className="px-4 py-3.5 text-[9px] font-extrabold text-[#25314d]">{money(item.amount)}</td><td className="px-4 py-3.5 text-[9px] font-semibold text-[#626d83]">{pretty(item.diagnosis)}</td><td className="px-4 py-3.5"><div className="flex items-center gap-2"><DecisionMark action={item.recommended_action}/><span className="text-[8px] font-bold text-[#59647b]">{pretty(item.recommended_action)}</span></div></td><td className="px-4 py-3.5"><StatusPill label={pretty(item.status)} tone={statusTone(item.status)}/></td><td className="px-4 py-3.5 text-[8px] font-semibold text-[#929aad]">{shortDate(item.updated_at || item.created_at)}</td></tr>)}</tbody>
                  </table>
                </div>

                <div className="divide-y divide-[#eef1f5] md:hidden">{filtered.map((item) => <button key={item.id} onClick={() => { setSelected(item); setRecoveryUrl(null); void loadDetail(item.id); }} className={`w-full p-4 text-left transition ${selected?.id === item.id ? "bg-[#f5f7ff]" : "bg-white"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-mono text-[9px] font-bold text-[#34405b]">{item.razorpay_payment_id}</p><p className="mt-1 text-[11px] font-extrabold text-[#27324d]">{money(item.amount)}</p></div><StatusPill label={pretty(item.status)} tone={statusTone(item.status)}/></div><p className="mt-2 text-[9px] font-semibold text-[#6e788d]">{pretty(item.diagnosis)} · {pretty(item.recommended_action)}</p><p className="mt-2 text-[8px] text-[#9aa2b1]">{shortDate(item.updated_at || item.created_at)}</p></button>)}</div>
              </>
            )}
          </SectionCard>

          <SectionCard className="p-5 xl:sticky xl:top-[90px] xl:self-start">
            {!selected ? <div className="grid min-h-[360px] place-items-center text-center text-[10px] text-[#8d96a8]">Select a recovery case</div> : !detail ? <DetailSkeleton/> : (
              <>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#2f5bff]">Case #{selected.id}</p><h2 className="mt-2 text-[18px] font-[760] tracking-[-.03em] text-[#17213f]">{pretty(selected.diagnosis)}</h2><p className="mt-1 truncate font-mono text-[8px] text-[#99a1af]">{selected.razorpay_payment_id}</p></div><StatusPill label={pretty(selected.status)} tone={statusTone(selected.status)}/></div>

                <div className="mt-5 grid grid-cols-2 gap-2.5"><div className="rounded-[11px] bg-[#f8f9fc] p-3"><p className="text-[7px] font-extrabold uppercase tracking-[.1em] text-[#9ba2b0]">Amount</p><p className="mt-1.5 text-[14px] font-extrabold text-[#25314c]">{money(selected.amount)}</p></div><div className="rounded-[11px] bg-[#f8f9fc] p-3"><p className="text-[7px] font-extrabold uppercase tracking-[.1em] text-[#9ba2b0]">Confidence</p><p className="mt-1.5 text-[14px] font-extrabold text-[#25314c]">{confidenceLabel(selected.confidence)}</p></div></div>

                <div className="mt-4 rounded-[12px] border border-[#e7ebf2] p-4"><div className="flex items-center gap-3"><DecisionMark action={selected.recommended_action}/><div><p className="text-[7px] font-extrabold uppercase tracking-[.1em] text-[#9aa2b0]">Recovery decision</p><p className="mt-1 text-[11px] font-extrabold text-[#2b3651]">{pretty(selected.recommended_action)}</p></div></div><p className="mt-3 text-[10px] leading-5 text-[#727d92]">{selected.reason || "No explanation available."}</p></div>

                <div className={`mt-3 rounded-[11px] border p-3.5 ${detail.policy_guard.allowed ? "border-emerald-100 bg-emerald-50/55" : "border-[#e7eaf0] bg-[#fafbfc]"}`}><p className={`text-[8px] font-extrabold uppercase tracking-[.1em] ${detail.policy_guard.allowed ? "text-emerald-700" : "text-[#8992a3]"}`}>{detail.policy_guard.allowed ? "Policy approved" : "Policy restricted"}</p><p className="mt-1.5 text-[9px] leading-4 text-[#687389]">{detail.policy_guard.reason}</p></div>

                <div className="mt-4 flex flex-col gap-2">{canExecute && <button onClick={() => void executeRecovery()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#2f5bff] px-4 py-3 text-[9px] font-extrabold text-white shadow-[0_7px_18px_rgba(47,91,255,.18)] transition hover:bg-[#244fe0] disabled:opacity-50">{busy && <Spinner/>}Create recovery link</button>}{canSimulateLate && <button onClick={() => void simulateLateSuccess()} disabled={busy} className="rounded-[10px] border border-[#dfe4ed] bg-white px-4 py-3 text-[9px] font-extrabold text-[#536078] transition hover:bg-[#f8f9fb]">Simulate late success</button>}{recoveryUrl && <a href={recoveryUrl} target="_blank" rel="noreferrer" className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-[9px] font-extrabold text-emerald-700">Open Razorpay Payment Link ↗</a>}</div>

                <div className="mt-5 border-t border-[#eef1f5] pt-4"><div className="flex items-center justify-between"><p className="text-[9px] font-extrabold text-[#34405a]">Audit activity</p><p className="text-[8px] text-[#9aa2b1]">{detail.audit_logs.length} events</p></div><div className="mt-3 space-y-3">{detail.audit_logs.slice(-4).reverse().map((log) => <div key={log.id} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2f5bff] shadow-[0_0_0_4px_rgba(47,91,255,.08)]"/><div><p className="text-[8px] font-extrabold uppercase tracking-[.07em] text-[#59647b]">{pretty(log.event_type)}</p><p className="mt-1 text-[9px] leading-4 text-[#7e8799]">{log.message}</p><p className="mt-1 text-[7px] text-[#a1a8b5]">{shortDate(log.created_at)}</p></div></div>)}</div></div>

                <div className="mt-4 flex items-center justify-between border-t border-[#eef1f5] pt-3 text-[8px] text-[#969ead]"><span>{isModelPlanner(selected.planner_source) ? `Planned by ${selected.planner_model || pretty(selected.planner_source)}` : "Safety fallback"}</span><span>{message}</span></div>
              </>
            )}
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
