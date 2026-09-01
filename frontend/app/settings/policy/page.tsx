"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell, SectionCard, StatusPill } from "@/components/app-shell";
import { API_BASE } from "@/lib/product";

type Policy = {
  id: number;
  max_autonomous_amount: number;
  max_autonomous_amount_inr: number;
  min_autonomous_confidence: number;
  max_recovery_attempts: number;
  allowed_actions: {
    CREATE_RECOVERY_LINK: boolean;
    WAIT_AND_VERIFY: boolean;
    ESCALATE: boolean;
  };
  duplicate_charge_protection_enabled: boolean;
  updated_at: string | null;
};

type FormState = {
  maxAutonomousAmountInr: number;
  minConfidencePct: number;
  maxAttempts: number;
  allowRecoveryLink: boolean;
};

const formatMoney = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

function SliderBlock({ title, description, value, children }: { title: string; description: string; value: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#edf0f5] pb-6 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-5"><div><h3 className="text-[11px] font-[760] text-[#28334f]">{title}</h3><p className="mt-1 max-w-[560px] text-[9px] leading-4 text-[#8a93a6]">{description}</p></div><span className="shrink-0 rounded-[9px] bg-[#f4f6fa] px-3 py-2 text-[10px] font-extrabold text-[#35405b]">{value}</span></div>{children}
    </div>
  );
}

function Invariant({ title, body }: { title: string; body: string }) {
  return <div className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[8px] bg-emerald-50 text-emerald-600"><svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m5 10 3 3 7-7"/></svg></span><div><p className="text-[10px] font-extrabold text-[#3f4b65]">{title}</p><p className="mt-1 text-[9px] leading-4 text-[#8790a3]">{body}</p></div></div>;
}

export default function MerchantPolicyPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [form, setForm] = useState<FormState>({ maxAutonomousAmountInr: 25000, minConfidencePct: 75, maxAttempts: 2, allowRecoveryLink: true });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading merchant policy…");

  function applyLoadedPolicy(data: Policy) {
    setPolicy(data);
    setForm({
      maxAutonomousAmountInr: Math.round(data.max_autonomous_amount / 100),
      minConfidencePct: Math.round(data.min_autonomous_confidence * 100),
      maxAttempts: data.max_recovery_attempts,
      allowRecoveryLink: data.allowed_actions.CREATE_RECOVERY_LINK,
    });
  }

  async function loadPolicy() {
    try {
      const response = await fetch(`${API_BASE}/recovery/policy`, { cache: "no-store" });
      const data = (await response.json()) as Policy & { detail?: string };
      if (!response.ok) throw new Error(data.detail || "Could not load policy");
      applyLoadedPolicy(data);
      setMessage("Live policy loaded from Supabase");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach recovery service");
    }
  }

  async function savePolicy() {
    setBusy(true);
    setMessage("Applying merchant safeguards…");
    try {
      const response = await fetch(`${API_BASE}/recovery/policy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_autonomous_amount: Math.round(form.maxAutonomousAmountInr * 100),
          min_autonomous_confidence: form.minConfidencePct / 100,
          max_recovery_attempts: form.maxAttempts,
          allow_create_recovery_link: form.allowRecoveryLink,
          allow_wait_and_verify: true,
          allow_escalate: true,
        }),
      });
      const data = (await response.json()) as Policy & { detail?: string };
      if (!response.ok) throw new Error(data.detail || "Could not save policy");
      applyLoadedPolicy(data);
      setMessage("Policy saved and applied to live recovery execution");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save policy");
    } finally {
      setBusy(false);
    }
  }

  async function resetPolicy() {
    setBusy(true);
    setMessage("Restoring default safeguards…");
    try {
      const response = await fetch(`${API_BASE}/recovery/policy/reset`, { method: "POST" });
      const data = (await response.json()) as Policy & { detail?: string };
      if (!response.ok) throw new Error(data.detail || "Could not reset policy");
      applyLoadedPolicy(data);
      setMessage("Default safeguards restored");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reset policy");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadPolicy();
  }, []);

  const autonomySummary = useMemo(() => form.allowRecoveryLink ? `Up to ${formatMoney(form.maxAutonomousAmountInr)} at ≥${form.minConfidencePct}% confidence` : "Human-controlled collection only", [form]);

  return (
    <AppShell
      title="Merchant safeguards"
      description="Set deterministic limits around AI-assisted recovery execution."
      actions={<><button onClick={() => void resetPolicy()} disabled={busy} className="hidden rounded-[9px] border border-[#dfe4ed] bg-white px-3.5 py-2 text-[10px] font-bold text-[#57627a] transition hover:bg-[#f8f9fb] sm:inline-flex">Reset defaults</button><button onClick={() => void savePolicy()} disabled={busy} className="inline-flex items-center gap-2 rounded-[9px] bg-[#2f5bff] px-3.5 py-2 text-[10px] font-bold text-white shadow-[0_6px_16px_rgba(47,91,255,.20)] transition hover:-translate-y-0.5 hover:bg-[#244fe0] disabled:opacity-50">{busy && <Spinner/>}{busy ? "Applying…" : "Save policy"}</button></>}
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[11px] border border-[#e4e9f1] bg-white px-4 py-3"><div className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-emerald-500"/><span className="text-[10px] font-semibold text-[#657087]">{message}</span></div><StatusPill label="Live execution policy" tone="success"/></div>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <SectionCard className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#edf0f5] pb-5"><div><p className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#2f5bff]">Autonomous recovery policy</p><h2 className="mt-2 text-[19px] font-[760] tracking-[-0.035em] text-[#17213f]">Control when RecoverFlow is allowed to create a new collection path.</h2><p className="mt-2 max-w-[650px] text-[9px] leading-5 text-[#80899d]">AI recommendations stay visible regardless of these settings. Money-moving execution remains gated by deterministic merchant policy.</p></div></div>

            <div className="mt-6 space-y-6">
              <SliderBlock title="Maximum autonomous amount" description="Cases above this value remain visible but require a non-autonomous path before collection can continue." value={formatMoney(form.maxAutonomousAmountInr)}>
                <div className="mt-4 flex items-center gap-4"><input type="range" min={0} max={100000} step={1000} value={form.maxAutonomousAmountInr} onChange={(event) => setForm((current) => ({ ...current, maxAutonomousAmountInr: Number(event.target.value) }))} className="w-full accent-[#2f5bff]"/><input type="number" min={0} step={1000} value={form.maxAutonomousAmountInr} onChange={(event) => setForm((current) => ({ ...current, maxAutonomousAmountInr: Math.max(0, Number(event.target.value) || 0) }))} className="w-28 rounded-[9px] border border-[#e1e5ed] bg-[#fafbfe] px-3 py-2 text-[9px] font-bold text-[#45516a]"/></div>
              </SliderBlock>

              <SliderBlock title="Minimum AI confidence" description="Recommendations below this threshold cannot proceed into autonomous recovery execution." value={`${form.minConfidencePct}%`}>
                <div className="mt-4 flex items-center gap-4"><input type="range" min={50} max={100} step={1} value={form.minConfidencePct} onChange={(event) => setForm((current) => ({ ...current, minConfidencePct: Number(event.target.value) }))} className="w-full accent-[#2f5bff]"/><span className="w-16 rounded-[9px] bg-[#f4f6fa] px-3 py-2 text-center text-[9px] font-extrabold text-[#45516a]">{form.minConfidencePct}%</span></div>
              </SliderBlock>

              <SliderBlock title="Maximum recovery attempts" description="Caps autonomous collection pressure for a single failed-payment case." value={`${form.maxAttempts} attempt${form.maxAttempts === 1 ? "" : "s"}`}>
                <div className="mt-4 flex gap-2">{[1,2,3,4,5].map((attempt) => <button key={attempt} type="button" onClick={() => setForm((current) => ({ ...current, maxAttempts: attempt }))} className={`h-9 w-9 rounded-[9px] border text-[9px] font-extrabold transition ${form.maxAttempts === attempt ? "border-[#b8c7ff] bg-[#eef3ff] text-[#2f5bff]" : "border-[#e1e5ed] bg-white text-[#737d91] hover:border-[#cad3e5]"}`}>{attempt}</button>)}</div>
              </SliderBlock>

              <div>
                <div className="flex items-start justify-between gap-5"><div><h3 className="text-[11px] font-[760] text-[#28334f]">Autonomous Payment Link creation</h3><p className="mt-1 max-w-[560px] text-[9px] leading-4 text-[#8a93a6]">Disable this to keep AI analysis active while requiring humans to initiate every new collection path.</p></div><span className={`rounded-full border px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[.06em] ${form.allowRecoveryLink ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-[#e3e7ee] bg-[#f7f8fa] text-[#667086]"}`}>{form.allowRecoveryLink ? "Enabled" : "Disabled"}</span></div>
                <button type="button" onClick={() => setForm((current) => ({ ...current, allowRecoveryLink: !current.allowRecoveryLink }))} className={`mt-4 flex w-full items-center justify-between rounded-[12px] border px-4 py-4 text-left transition ${form.allowRecoveryLink ? "border-emerald-100 bg-emerald-50/55" : "border-[#e3e7ee] bg-[#fafbfe]"}`}><div><p className="text-[10px] font-extrabold text-[#34405b]">{form.allowRecoveryLink ? "Bounded autonomous recovery enabled" : "Human-controlled collection mode"}</p><p className="mt-1 text-[8px] text-[#8b94a6]">Recommendations, verification and escalation remain active in either mode.</p></div><span className={`relative h-6 w-11 rounded-full transition ${form.allowRecoveryLink ? "bg-emerald-500" : "bg-[#c7cddd]"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${form.allowRecoveryLink ? "left-6" : "left-1"}`}/></span></button>
              </div>
            </div>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard className="overflow-hidden">
              <div className="bg-[#111a35] p-5 text-white"><p className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#8fa8ff]">Effective autonomy</p><p className="mt-2 text-[21px] font-[760] leading-tight tracking-[-0.04em]">{autonomySummary}</p><p className="mt-3 text-[9px] leading-5 text-[#c8d1e7]">This is the maximum scope available to autonomous recovery. Every case is still checked against terminal state, attempt count and action type at execution time.</p></div>
              <div className="grid grid-cols-2 gap-px bg-[#edf0f5]"><div className="bg-white p-4"><p className="text-[7px] font-extrabold uppercase tracking-[.09em] text-[#9ba2b0]">Amount ceiling</p><p className="mt-1.5 text-[13px] font-extrabold text-[#2c3853]">{formatMoney(form.maxAutonomousAmountInr)}</p></div><div className="bg-white p-4"><p className="text-[7px] font-extrabold uppercase tracking-[.09em] text-[#9ba2b0]">Min confidence</p><p className="mt-1.5 text-[13px] font-extrabold text-[#2c3853]">{form.minConfidencePct}%</p></div></div>
            </SectionCard>

            <SectionCard className="p-5"><div className="flex items-center justify-between"><div><p className="text-[8px] font-extrabold uppercase tracking-[.12em] text-[#2f5bff]">Mandatory invariants</p><h2 className="mt-1.5 text-[14px] font-[760] text-[#202b47]">Safety cannot be configured away.</h2></div><StatusPill label="Always on" tone="success"/></div><div className="mt-5 space-y-4"><Invariant title="Wait & verify" body="Bank and gateway uncertainty remains observable before another collection path is opened."/><Invariant title="Escalation" body="Unsafe, ambiguous and blocked cases always retain a human-review path."/><Invariant title="Duplicate-charge protection" body="Late original success continues to stop recovery and cancel any open recovery link."/></div></SectionCard>

            <SectionCard className="p-5"><div className="flex items-center justify-between"><p className="text-[10px] font-extrabold text-[#34405b]">Policy snapshot</p><StatusPill label={policy ? "Persisted" : "Loading"} tone={policy ? "success" : "neutral"}/></div><div className="mt-4 space-y-3 text-[9px]"><div className="flex justify-between"><span className="text-[#8b94a6]">Recovery link</span><span className="font-bold text-[#4c5870]">{form.allowRecoveryLink ? "Allowed" : "Blocked"}</span></div><div className="flex justify-between"><span className="text-[#8b94a6]">Wait & verify</span><span className="font-bold text-emerald-700">Required</span></div><div className="flex justify-between"><span className="text-[#8b94a6]">Escalation</span><span className="font-bold text-emerald-700">Required</span></div><div className="flex justify-between"><span className="text-[#8b94a6]">Duplicate protection</span><span className="font-bold text-emerald-700">Required</span></div></div></SectionCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
