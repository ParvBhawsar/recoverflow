"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell, SectionCard, StatusPill } from "@/components/app-shell";
import { API_BASE, money, pretty } from "@/lib/product";

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

function categoryTone(category: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (category === "customer_fixable") return "info";
  if (category === "transient") return "warning";
  if (category === "high_value") return "danger";
  return "neutral";
}

function actionTone(action?: string | null): "success" | "warning" | "danger" | "info" | "neutral" {
  if (action === "CREATE_RECOVERY_LINK") return "success";
  if (action === "WAIT_AND_VERIFY") return "warning";
  if (action === "ESCALATE") return "danger";
  return "neutral";
}

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

export default function SimulatorPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedId, setSelectedId] = useState("incorrect_otp");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading recovery scenarios…");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);

  const selected = useMemo(() => scenarios.find((item) => item.id === selectedId) || scenarios[0], [scenarios, selectedId]);

  async function loadScenarios() {
    try {
      const response = await fetch(`${API_BASE}/recovery/demo/scenarios`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load scenarios");
      const data = (await response.json()) as Scenario[];
      setScenarios(data);
      if (data.length && !data.some((item) => item.id === selectedId)) setSelectedId(data[0].id);
      setMessage(`${data.length} scenarios available`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach recovery service");
    }
  }

  async function runScenario() {
    if (!selected) return;
    setBusy(true);
    setResult(null);
    setMessage(`Evaluating ${selected.name}…`);
    try {
      const response = await fetch(`${API_BASE}/recovery/demo/failure/${selected.id}`, { method: "POST" });
      const data = (await response.json()) as SimulationResult & { detail?: string };
      if (!response.ok) throw new Error(data.detail || "Scenario failed");
      setResult(data);
      setHistory((current) => [data, ...current].slice(0, 6));
      setMessage(`Case #${data.case_id} evaluated successfully`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Scenario failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadScenarios();
  }, []);

  const matched = result ? result.ai_action === result.expected_behavior : false;

  return (
    <AppShell
      title="Recovery sandbox"
      description="Test recovery strategy against realistic Razorpay-style payment failures."
      actions={<button onClick={() => void loadScenarios()} className="rounded-[9px] border border-[#dfe4ed] bg-white px-3.5 py-2 text-[10px] font-bold text-[#57627a] transition hover:bg-[#f8f9fb]">Refresh scenarios</button>}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[11px] border border-[#e4e9f1] bg-white px-4 py-3">
          <div className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-emerald-500"/><span className="text-[10px] font-semibold text-[#657087]">{message}</span></div>
          <div className="text-[9px] font-semibold text-[#9aa2b0]">Synthetic Razorpay-style test data · production AI + policy path</div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <SectionCard className="overflow-hidden">
            <div className="border-b border-[#edf0f5] px-5 py-4"><h2 className="text-[12px] font-[760] text-[#18233f]">Failure scenarios</h2><p className="mt-1 text-[9px] text-[#9098aa]">Choose a scenario to evaluate how the recovery agent responds.</p></div>
            <div className="grid gap-2.5 p-4 md:grid-cols-2">
              {scenarios.map((scenario) => {
                const active = selected?.id === scenario.id;
                return (
                  <button key={scenario.id} type="button" onClick={() => { setSelectedId(scenario.id); setResult(null); }} className={`rounded-[12px] border p-4 text-left transition-all duration-200 ${active ? "border-[#b9c8ff] bg-[#f5f7ff] shadow-[0_0_0_2px_rgba(47,91,255,.06)]" : "border-[#e5e9f1] bg-white hover:-translate-y-0.5 hover:border-[#d2daea] hover:shadow-[0_8px_20px_rgba(22,34,70,.05)]"}`}>
                    <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-[750] text-[#202b48]">{scenario.name}</p><p className="mt-1.5 text-[9px] leading-4 text-[#7c8699]">{scenario.description}</p></div><StatusPill label={pretty(scenario.category)} tone={categoryTone(scenario.category)} /></div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#eef1f5] pt-3"><div><p className="text-[7px] font-bold uppercase tracking-[.09em] text-[#9ba2b0]">Amount</p><p className="mt-1 text-[10px] font-extrabold text-[#36415b]">{money(scenario.amount)}</p></div><div className="text-right"><p className="text-[7px] font-bold uppercase tracking-[.09em] text-[#9ba2b0]">Expected</p><p className="mt-1 text-[9px] font-bold text-[#59647a]">{pretty(scenario.expected_behavior)}</p></div></div>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard className="p-5">
            {!selected ? <div className="py-16 text-center text-[10px] text-[#9098aa]">Loading scenarios…</div> : (
              <>
                <div className="flex items-start justify-between gap-3"><div><p className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#2f5bff]">Scenario details</p><h2 className="mt-2 text-[20px] font-[760] tracking-[-0.03em] text-[#17213f]">{selected.name}</h2></div><StatusPill label={pretty(selected.category)} tone={categoryTone(selected.category)} /></div>
                <div className="mt-5 grid grid-cols-2 gap-2.5"><div className="rounded-[10px] bg-[#f8f9fc] p-3"><p className="text-[7px] font-extrabold uppercase tracking-[.09em] text-[#9ba2b0]">Amount</p><p className="mt-1.5 text-[12px] font-extrabold text-[#2d3853]">{money(selected.amount)}</p></div><div className="rounded-[10px] bg-[#f8f9fc] p-3"><p className="text-[7px] font-extrabold uppercase tracking-[.09em] text-[#9ba2b0]">Method</p><p className="mt-1.5 text-[12px] font-extrabold text-[#2d3853]">{pretty(selected.method)}</p></div></div>
                <div className="mt-3 rounded-[11px] border border-[#e8ebf2] p-3.5"><p className="text-[7px] font-extrabold uppercase tracking-[.09em] text-[#9ba2b0]">Why it matters</p><p className="mt-2 text-[10px] leading-5 text-[#6f7a90]">{selected.why_it_matters}</p></div>
                <div className="mt-3 flex items-center justify-between rounded-[11px] bg-[#f7f9fd] px-3.5 py-3"><div><p className="text-[7px] font-extrabold uppercase tracking-[.09em] text-[#9ba2b0]">Expected decision</p><p className="mt-1 text-[10px] font-extrabold text-[#39455f]">{pretty(selected.expected_behavior)}</p></div><StatusPill label="Ground truth" tone="info" /></div>
                <button type="button" onClick={() => void runScenario()} disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#2f5bff] px-4 py-3 text-[10px] font-extrabold text-white shadow-[0_8px_20px_rgba(47,91,255,.20)] transition hover:-translate-y-0.5 hover:bg-[#244fe0] disabled:opacity-50">{busy && <Spinner/>}{busy ? "Evaluating…" : "Evaluate recovery strategy"}</button>
              </>
            )}
          </SectionCard>
        </div>

        {result && (
          <SectionCard className="mt-5 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f5] px-5 py-4"><div><p className="text-[8px] font-extrabold uppercase tracking-[.12em] text-[#2f5bff]">Decision result · Case #{result.case_id}</p><h2 className="mt-1 text-[15px] font-[760] text-[#1b2643]">{result.scenario_name}</h2></div><StatusPill label={matched ? "Strategy matched" : "Strategy variance"} tone={matched ? "success" : "warning"} /></div>
            <div className="grid gap-0 xl:grid-cols-4">
              <div className="border-b border-[#edf0f5] p-5 xl:border-b-0 xl:border-r"><p className="text-[8px] font-extrabold uppercase tracking-[.1em] text-[#9ba2b0]">Agent decision</p><div className="mt-3"><StatusPill label={pretty(result.ai_action)} tone={actionTone(result.ai_action)} /></div><p className="mt-3 text-[22px] font-[780] tracking-[-0.04em] text-[#1c2744]">{Math.round(result.confidence * 100)}%</p><p className="mt-1 text-[8px] text-[#949cab]">model confidence</p></div>
              <div className="border-b border-[#edf0f5] p-5 xl:border-b-0 xl:border-r"><p className="text-[8px] font-extrabold uppercase tracking-[.1em] text-[#9ba2b0]">Expected decision</p><div className="mt-3"><StatusPill label={pretty(result.expected_behavior)} tone={actionTone(result.expected_behavior)} /></div><p className="mt-4 text-[9px] leading-4 text-[#7b8498]">Compared against the labelled synthetic scenario, not exposed to the model during inference.</p></div>
              <div className="border-b border-[#edf0f5] p-5 xl:border-b-0 xl:border-r"><p className="text-[8px] font-extrabold uppercase tracking-[.1em] text-[#9ba2b0]">Policy guard</p><p className={`mt-3 text-[13px] font-extrabold ${result.policy_guard_allowed ? "text-emerald-700" : "text-[#4f5c74]"}`}>{result.policy_guard_allowed ? "Autonomous action allowed" : "Execution constrained"}</p><p className="mt-2 text-[9px] leading-4 text-[#7d8799]">{result.policy_guard_reason}</p></div>
              <div className="p-5"><p className="text-[8px] font-extrabold uppercase tracking-[.1em] text-[#9ba2b0]">Planner</p><p className="mt-3 text-[12px] font-extrabold text-[#35405b]">{result.planner_model || pretty(result.planner_source)}</p><p className="mt-2 font-mono text-[8px] text-[#9aa2b0]">{result.razorpay_payment_id}</p><a href="/dashboard" className="mt-4 inline-flex text-[9px] font-extrabold text-[#2f5bff] hover:underline">Open case in console →</a></div>
            </div>
          </SectionCard>
        )}

        {history.length > 0 && (
          <SectionCard className="mt-5 overflow-hidden">
            <div className="border-b border-[#edf0f5] px-5 py-3.5"><h2 className="text-[10px] font-extrabold text-[#2d3853]">Recent sandbox runs</h2></div>
            <div className="divide-y divide-[#eef1f5]">{history.map((item, index) => <div key={`${item.case_id}-${index}`} className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3 sm:grid-cols-[1fr_1fr_auto]"><div><p className="text-[9px] font-bold text-[#3a465f]">{item.scenario_name}</p><p className="mt-1 font-mono text-[7px] text-[#9aa2b0]">Case #{item.case_id}</p></div><div className="hidden items-center gap-2 sm:flex"><StatusPill label={pretty(item.ai_action)} tone={actionTone(item.ai_action)} /><span className="text-[8px] font-bold text-[#788196]">{Math.round(item.confidence * 100)}%</span></div><StatusPill label={item.ai_action === item.expected_behavior ? "Match" : "Review"} tone={item.ai_action === item.expected_behavior ? "success" : "warning"} /></div>)}</div>
          </SectionCard>
        )}
      </div>
    </AppShell>
  );
}
