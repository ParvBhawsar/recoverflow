"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function MerchantPolicyPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [form, setForm] = useState<FormState>({
    maxAutonomousAmountInr: 25000,
    minConfidencePct: 75,
    maxAttempts: 2,
    allowRecoveryLink: true,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading merchant policy…");

  async function loadPolicy() {
    try {
      const res = await fetch(`${API_BASE}/recovery/policy`, { cache: "no-store" });
      const data = (await res.json()) as Policy & { detail?: string };
      if (!res.ok) throw new Error(data.detail || "Could not load merchant policy");
      setPolicy(data);
      setForm({
        maxAutonomousAmountInr: Math.round(data.max_autonomous_amount / 100),
        minConfidencePct: Math.round(data.min_autonomous_confidence * 100),
        maxAttempts: data.max_recovery_attempts,
        allowRecoveryLink: data.allowed_actions.CREATE_RECOVERY_LINK,
      });
      setMessage("Live policy loaded from Supabase");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach backend");
    }
  }

  async function savePolicy() {
    setBusy(true);
    setMessage("Applying merchant guardrails…");
    try {
      const res = await fetch(`${API_BASE}/recovery/policy`, {
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
      const data = (await res.json()) as Policy & { detail?: string };
      if (!res.ok) throw new Error(data.detail || "Could not save merchant policy");
      setPolicy(data);
      setMessage("Policy saved and applied to the live recovery guard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save policy");
    } finally {
      setBusy(false);
    }
  }

  async function resetPolicy() {
    setBusy(true);
    setMessage("Restoring RecoverFlow defaults…");
    try {
      const res = await fetch(`${API_BASE}/recovery/policy/reset`, { method: "POST" });
      const data = (await res.json()) as Policy & { detail?: string };
      if (!res.ok) throw new Error(data.detail || "Could not reset merchant policy");
      setPolicy(data);
      setForm({
        maxAutonomousAmountInr: Math.round(data.max_autonomous_amount / 100),
        minConfidencePct: Math.round(data.min_autonomous_confidence * 100),
        maxAttempts: data.max_recovery_attempts,
        allowRecoveryLink: data.allowed_actions.CREATE_RECOVERY_LINK,
      });
      setMessage("RecoverFlow default safety policy restored");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reset policy");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadPolicy();
  }, []);

  const autonomySummary = useMemo(() => {
    if (!form.allowRecoveryLink) return "Human-controlled recovery only";
    return `Autonomous up to ${formatMoney(form.maxAutonomousAmountInr)} at ≥${form.minConfidencePct}% confidence`;
  }, [form]);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#0b1638]">
      <header className="border-b border-[#e8ebf3] bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-[#2f5bff] text-lg font-black text-white">
              R
              <span className="absolute -bottom-2 -right-2 h-5 w-5 rounded-full bg-[#89a3ff]/50" />
            </div>
            <div>
              <p className="text-[17px] font-extrabold tracking-tight">RecoverFlow</p>
              <p className="text-[10px] font-medium text-[#697391]">Merchant Controls · Safety Rules</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/analytics/evaluation" className="rounded-lg border border-[#dfe4ee] bg-white px-4 py-2 text-xs font-extrabold text-[#35405f]">Evaluation</Link>
            <Link href="/" className="rounded-lg bg-[#2f5bff] px-4 py-2 text-xs font-extrabold text-white">Dashboard</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-6 py-7">
        <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <div>
            <span className="rounded-md bg-[#edf2ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2f5bff]">Merchant Policy</span>
            <h1 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-[-0.04em]">Control how much autonomy the recovery agent gets.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#697391]">
              Tune money-moving autonomy without weakening RecoverFlow&apos;s safety exits. AI can recommend actions, but the merchant policy remains the final execution authority.
            </p>
            <p className="mt-3 text-xs font-bold text-[#46516f]">{message}</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#244de3] via-[#2f5bff] to-[#655dff] p-6 text-white shadow-[0_14px_36px_rgba(47,91,255,0.22)]">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/15" />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-100">Effective autonomy</p>
            <h2 className="mt-3 text-2xl font-extrabold">{autonomySummary}</h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-blue-100">
              WAIT & VERIFY, escalation, and duplicate-charge protection remain mandatory safety behavior regardless of merchant settings.
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-2xl border border-[#e4e8f1] bg-white shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
            <div className="border-b border-[#edf0f5] px-6 py-5">
              <h2 className="text-lg font-extrabold">Autonomous recovery guardrails</h2>
              <p className="mt-1 text-xs text-[#7b849e]">These controls are persisted and enforced before a Razorpay Payment Link can be created.</p>
            </div>

            <div className="space-y-7 p-6">
              <SettingBlock
                title="Maximum autonomous amount"
                description="Payments above this amount cannot create a recovery link autonomously."
                value={formatMoney(form.maxAutonomousAmountInr)}
              >
                <div className="mt-4 flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={100000}
                    step={1000}
                    value={form.maxAutonomousAmountInr}
                    onChange={(event) => setForm((current) => ({ ...current, maxAutonomousAmountInr: Number(event.target.value) }))}
                    className="w-full accent-[#2f5bff]"
                  />
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step={1000}
                    value={form.maxAutonomousAmountInr}
                    onChange={(event) => setForm((current) => ({ ...current, maxAutonomousAmountInr: Math.max(0, Number(event.target.value) || 0) }))}
                    className="w-32 rounded-lg border border-[#dfe4ee] px-3 py-2 text-sm font-bold outline-none focus:border-[#2f5bff]"
                  />
                </div>
              </SettingBlock>

              <SettingBlock
                title="Minimum AI confidence"
                description="Low-confidence model recommendations remain visible, but cannot move into autonomous collection."
                value={`${form.minConfidencePct}%`}
              >
                <div className="mt-4 flex items-center gap-4">
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={1}
                    value={form.minConfidencePct}
                    onChange={(event) => setForm((current) => ({ ...current, minConfidencePct: Number(event.target.value) }))}
                    className="w-full accent-[#2f5bff]"
                  />
                  <span className="w-16 rounded-lg bg-[#f4f6fb] px-3 py-2 text-center text-sm font-extrabold">{form.minConfidencePct}%</span>
                </div>
              </SettingBlock>

              <SettingBlock
                title="Maximum recovery attempts"
                description="Caps autonomous collection pressure for any single failed payment case."
                value={`${form.maxAttempts} attempt${form.maxAttempts === 1 ? "" : "s"}`}
              >
                <div className="mt-4 flex gap-2">
                  {[1, 2, 3, 4, 5].map((attempt) => (
                    <button
                      key={attempt}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, maxAttempts: attempt }))}
                      className={`h-10 w-10 rounded-lg border text-sm font-extrabold transition ${form.maxAttempts === attempt ? "border-[#2f5bff] bg-[#edf2ff] text-[#2f5bff]" : "border-[#dfe4ee] bg-white text-[#697391] hover:border-[#bdc9e8]"}`}
                    >
                      {attempt}
                    </button>
                  ))}
                </div>
              </SettingBlock>

              <SettingBlock
                title="Autonomous Payment Link creation"
                description="Disable this to keep AI analysis active while requiring humans to initiate every new collection path."
                value={form.allowRecoveryLink ? "Enabled" : "Disabled"}
              >
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, allowRecoveryLink: !current.allowRecoveryLink }))}
                  className={`mt-4 flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left transition ${form.allowRecoveryLink ? "border-emerald-200 bg-emerald-50" : "border-[#e2e6ef] bg-[#fafbfe]"}`}
                >
                  <div>
                    <p className="text-sm font-extrabold">{form.allowRecoveryLink ? "Autonomous collection allowed" : "Human approval required"}</p>
                    <p className="mt-1 text-xs text-[#697391]">AI recommendations and safety analysis continue in either mode.</p>
                  </div>
                  <span className={`relative h-6 w-11 rounded-full transition ${form.allowRecoveryLink ? "bg-emerald-500" : "bg-[#c7cddd]"}`}>
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${form.allowRecoveryLink ? "left-6" : "left-1"}`} />
                  </span>
                </button>
              </SettingBlock>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f5] bg-[#fafbfe] px-6 py-4">
              <button type="button" onClick={resetPolicy} disabled={busy} className="rounded-lg border border-[#dfe4ee] bg-white px-4 py-2.5 text-xs font-extrabold text-[#4c5774] hover:bg-[#f4f6fa] disabled:opacity-50">Reset defaults</button>
              <button type="button" onClick={savePolicy} disabled={busy} className="rounded-lg bg-[#2f5bff] px-5 py-2.5 text-xs font-extrabold text-white shadow-[0_8px_18px_rgba(47,91,255,0.18)] hover:bg-[#244de3] disabled:opacity-50">{busy ? "Applying…" : "Save & apply policy"}</button>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-[#d9e5ff] bg-white p-5 shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2f5bff]">Mandatory invariants</p>
              <h2 className="mt-2 text-xl font-extrabold">Safety cannot be configured away.</h2>
              <div className="mt-5 space-y-4">
                <Invariant title="Wait & verify" text="Bank/gateway ambiguity stays observable before any new collection path." />
                <Invariant title="Escalation" text="Unsafe, ambiguous, or blocked cases always retain a human-review path." />
                <Invariant title="Duplicate-charge protection" text="Late original success continues to stop recovery and cancel open links." />
              </div>
            </div>

            <div className="rounded-2xl border border-[#e4e8f1] bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold">Current policy snapshot</p>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold uppercase text-emerald-700">Live</span>
              </div>
              <div className="mt-4 divide-y divide-[#edf0f5]">
                <SnapshotRow label="Autonomous ceiling" value={policy ? formatMoney(policy.max_autonomous_amount_inr) : "—"} />
                <SnapshotRow label="Confidence threshold" value={policy ? `${Math.round(policy.min_autonomous_confidence * 100)}%` : "—"} />
                <SnapshotRow label="Attempt cap" value={policy ? String(policy.max_recovery_attempts) : "—"} />
                <SnapshotRow label="Payment Link autonomy" value={policy?.allowed_actions.CREATE_RECOVERY_LINK ? "Enabled" : "Disabled"} />
                <SnapshotRow label="Late-success protection" value={policy?.duplicate_charge_protection_enabled ? "Mandatory" : "—"} />
              </div>
            </div>

            <div className="rounded-2xl border border-[#e4e8f1] bg-[#10182e] p-5 text-white">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-300">Execution contract</p>
              <p className="mt-2 text-lg font-extrabold">AI proposes → merchant policy decides → Razorpay executes</p>
              <p className="mt-3 text-xs leading-5 text-white/60">This separation keeps the LLM out of the money-moving trust boundary.</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function SettingBlock({ title, description, value, children }: { title: string; description: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-5">
        <div><p className="text-sm font-extrabold text-[#17213f]">{title}</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#7b849e]">{description}</p></div>
        <span className="shrink-0 rounded-lg bg-[#f2f5fb] px-3 py-2 text-xs font-extrabold text-[#35405f]">{value}</span>
      </div>
      {children}
    </div>
  );
}

function Invariant({ title, text }: { title: string; text: string }) {
  return <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-700">✓</span><div><p className="text-sm font-extrabold">{title}</p><p className="mt-1 text-xs leading-5 text-[#737d99]">{text}</p></div></div>;
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 py-3 text-xs"><span className="text-[#7b849e]">{label}</span><span className="font-extrabold text-[#263150]">{value}</span></div>;
}
