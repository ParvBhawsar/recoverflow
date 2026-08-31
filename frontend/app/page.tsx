"use client";

import { useEffect, useMemo, useState } from "react";

type RecoverySummary = {
  revenue_at_risk: number;
  recovered_revenue: number;
  active_cases: number;
  total_cases: number;
  recovery_rate: number;
  ai_plans?: number;
  model_plans?: number;
  late_success_protected_cases?: number;
  late_success_protected_value?: number;
  protection_attention_cases?: number;
};

type RecoveryCase = {
  id: number;
  razorpay_payment_id: string;
  amount: number;
  currency: string;
  status: string;
  diagnosis: string | null;
  confidence: number | null;
  recommended_action: string | null;
  reason: string | null;
  attempt_count: number;
  recovered_amount: number;
  planner_source?: string | null;
  planner_model?: string | null;
  delay_minutes?: number | null;
  customer_tone?: string | null;
  late_success_protected?: boolean;
  created_at?: string;
  updated_at?: string;
};

type AuditLog = {
  id: number;
  event_type: string;
  message: string;
  details?: Record<string, unknown> | null;
  created_at: string;
};

type CaseDetail = {
  case: RecoveryCase;
  policy_guard: {
    allowed: boolean;
    reason: string;
  };
  audit_logs: AuditLog[];
};

type Tab = "overview" | "queue" | "analytics" | "audit" | "build";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);

const pretty = (value?: string | null) =>
  value
    ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";

const eventTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};

const eventDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const isModelPlanner = (source?: string | null) => source === "openai" || source === "gemini";

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "queue", label: "Recovery Queue" },
  { id: "analytics", label: "Analytics" },
  { id: "audit", label: "Audit Trail" },
  { id: "build", label: "Build Plan" },
];

const roadmap = {
  completed: [
    "Core frontend + FastAPI + Supabase foundation",
    "Razorpay webhook signature verification and idempotency",
    "Failed-payment ingestion and recovery case state",
    "Razorpay Test Mode API integration",
    "Real Payment Link recovery execution",
    "Paid recovery reconciliation",
    "Gemini structured AI recovery planner",
    "Deterministic safety fallback and policy guard",
    "Late-success detection",
    "Automatic Razorpay Payment Link cancellation",
    "Per-case audit trail",
    "Razorpay-inspired dashboard information architecture",
    "Persistent project roadmap and progress tracking",
  ],
  next: [
    "Multi-scenario failure simulator",
    "Synthetic evaluation dataset",
    "RecoverFlow vs blind-retry baseline benchmark",
    "Evaluation metrics and analytics views",
    "Merchant safety controls and policy settings",
  ],
  later: [
    "Public backend/frontend deployment",
    "Real public Razorpay webhook configuration",
    "Automated test suite and CI",
    "Demo walkthrough mode",
    "README, architecture diagram and API documentation",
    "Public-repo cleanup and security review",
    "Final pitch, demo video and buildathon submission polish",
  ],
};

const buildProgress = Math.round(
  (roadmap.completed.length /
    (roadmap.completed.length + roadmap.next.length + roadmap.later.length)) *
    100,
);

function statusClasses(status?: string | null) {
  switch (status) {
    case "RECOVERED":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "ORIGINAL_PAYMENT_CAPTURED":
      return "bg-cyan-50 text-cyan-700 border-cyan-100";
    case "WAITING_FOR_CUSTOMER":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "PROTECTION_ATTENTION_REQUIRED":
    case "DUPLICATE_COLLECTION_DETECTED":
      return "bg-red-50 text-red-700 border-red-100";
    default:
      return "bg-indigo-50 text-indigo-700 border-indigo-100";
  }
}

function eventDotClasses(eventType: string) {
  if (eventType.includes("STOP") || eventType.includes("PROTECT") || eventType.includes("CANCEL")) {
    return "bg-emerald-500 ring-emerald-100";
  }
  if (eventType.includes("AI_PLAN")) return "bg-violet-500 ring-violet-100";
  if (eventType.includes("FAIL") || eventType.includes("BLOCK")) return "bg-amber-500 ring-amber-100";
  if (eventType.includes("RECOVER")) return "bg-emerald-500 ring-emerald-100";
  return "bg-[#2f5bff] ring-blue-100";
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<RecoverySummary | null>(null);
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [selected, setSelected] = useState<RecoveryCase | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CaseDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Connecting to recovery engine…");
  const [recoveryUrl, setRecoveryUrl] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function loadCaseDetail(caseId: number) {
    try {
      const res = await fetch(`${API_BASE}/recovery/cases/${caseId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load case detail");
      const detail = (await res.json()) as CaseDetail;
      setSelectedDetail(detail);
    } catch {
      setSelectedDetail(null);
    }
  }

  async function refresh() {
    setMessage("Refreshing live recovery data…");
    try {
      const [summaryRes, casesRes] = await Promise.all([
        fetch(`${API_BASE}/recovery/summary`, { cache: "no-store" }),
        fetch(`${API_BASE}/recovery/cases`, { cache: "no-store" }),
      ]);
      if (!summaryRes.ok || !casesRes.ok) throw new Error("Backend request failed");
      const nextSummary = (await summaryRes.json()) as RecoverySummary;
      const nextCases = (await casesRes.json()) as RecoveryCase[];
      setSummary(nextSummary);
      setCases(nextCases);

      if (nextCases.length) {
        const target = nextCases.find((c) => c.id === selected?.id) || nextCases[0];
        setSelected(target);
        await loadCaseDetail(target.id);
      } else {
        setSelected(null);
        setSelectedDetail(null);
      }
      setMessage("Live data synced");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach backend");
    }
  }

  async function selectCase(item: RecoveryCase) {
    setSelected(item);
    setRecoveryUrl(null);
    await loadCaseDetail(item.id);
  }

  async function simulateFailure() {
    setBusy(true);
    setRecoveryUrl(null);
    setMessage("Gemini is planning the recovery action…");
    try {
      const res = await fetch(`${API_BASE}/recovery/demo/failure`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Simulation failed");
      const source = isModelPlanner(data.planner_source)
        ? `${pretty(data.planner_source)} · ${data.planner_model}`
        : "Safety fallback";
      setMessage(`Case #${data.case_id} planned by ${source}`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Simulation failed");
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
      const res = await fetch(`${API_BASE}/recovery/cases/${selected.id}/execute`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Execution failed");
      setRecoveryUrl(data.payment_link_url || null);
      setMessage("Recovery link created. Late-success protection is armed.");
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
    setMessage("Simulating late success of the original payment…");
    try {
      const res = await fetch(
        `${API_BASE}/recovery/cases/${selected.id}/demo/original-success`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Late-success simulation failed");

      if (data.needs_attention) {
        setMessage("Late success detected; cancellation requires attention.");
      } else {
        const count = data.cancelled_recovery_links || 0;
        setMessage(
          `Duplicate charge prevented. ${count} recovery link${count === 1 ? " was" : "s were"} cancelled.`,
        );
      }
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Late-success simulation failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  const filteredCases = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cases.filter((item) => {
      const matchesQuery =
        !normalized ||
        item.razorpay_payment_id.toLowerCase().includes(normalized) ||
        (item.diagnosis || "").toLowerCase().includes(normalized) ||
        (item.recommended_action || "").toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [cases, query, statusFilter]);

  const aiBadge = isModelPlanner(selected?.planner_source)
    ? `AI · ${selected?.planner_model || pretty(selected?.planner_source)}`
    : selected?.planner_source
      ? "Safety fallback"
      : "Legacy case";

  const canExecute =
    selected?.recommended_action === "CREATE_RECOVERY_LINK" && selected?.status === "ACTION_PROPOSED";
  const canSimulateLateSuccess =
    selected?.status === "WAITING_FOR_CUSTOMER" && selected?.razorpay_payment_id.startsWith("pay_demo_");

  const recoveredCount = cases.filter((item) => item.status === "RECOVERED").length;
  const protectedCount = cases.filter((item) => item.status === "ORIGINAL_PAYMENT_CAPTURED").length;
  const waitingCount = cases.filter((item) => item.status === "WAITING_FOR_CUSTOMER").length;
  const proposedCount = cases.filter((item) => item.status === "ACTION_PROPOSED").length;
  const modelPlanCount = summary?.model_plans || 0;
  const totalPlanCount = summary?.ai_plans || 0;

  const failureGroups = useMemo(() => {
    const groups = [
      { label: "Authentication / OTP", count: 0 },
      { label: "Insufficient funds", count: 0 },
      { label: "Network / gateway", count: 0 },
      { label: "Other", count: 0 },
    ];
    for (const item of cases) {
      const diagnosis = (item.diagnosis || "").toLowerCase();
      if (diagnosis.includes("otp") || diagnosis.includes("auth")) groups[0].count += 1;
      else if (diagnosis.includes("fund")) groups[1].count += 1;
      else if (diagnosis.includes("network") || diagnosis.includes("gateway") || diagnosis.includes("transient")) groups[2].count += 1;
      else groups[3].count += 1;
    }
    return groups;
  }, [cases]);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#0b1638]">
      <header className="sticky top-0 z-40 border-b border-[#e8ebf3] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1560px] items-center gap-8 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className="flex min-w-fit items-center gap-3 py-4 text-left"
          >
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-[#2f5bff] text-lg font-black text-white shadow-sm">
              R
              <span className="absolute -bottom-2 -right-2 h-5 w-5 rounded-full bg-[#89a3ff]/50" />
            </div>
            <div>
              <p className="text-[17px] font-extrabold tracking-tight">RecoverFlow</p>
              <p className="text-[10px] font-medium text-[#697391]">Built on Razorpay APIs</p>
            </div>
          </button>

          <nav className="hidden flex-1 items-stretch justify-center gap-1 lg:flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-5 text-sm font-semibold transition ${
                  activeTab === tab.id ? "text-[#2f5bff]" : "text-[#58617d] hover:text-[#192444]"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#2f5bff]" />
                )}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex min-w-fit items-center gap-3 py-3">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 sm:inline-flex">
              <span className="mr-1.5 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {mounted ? "System healthy" : "Starting"}
            </span>
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg border border-[#dfe4ee] bg-white px-3 py-2 text-xs font-bold text-[#35405f] shadow-sm hover:bg-[#f8f9fc]"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="flex overflow-x-auto border-t border-[#f0f2f7] px-4 lg:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-3 text-xs font-bold ${
                activeTab === tab.id ? "text-[#2f5bff]" : "text-[#697391]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-[1560px] px-6 py-6">
        {activeTab === "overview" && (
          <Overview
            message={message}
            busy={busy}
            summary={summary}
            cases={cases}
            selected={selected}
            selectedDetail={selectedDetail}
            recoveryUrl={recoveryUrl}
            aiBadge={aiBadge}
            canExecute={canExecute}
            canSimulateLateSuccess={canSimulateLateSuccess}
            modelPlanCount={modelPlanCount}
            totalPlanCount={totalPlanCount}
            onSimulateFailure={simulateFailure}
            onExecuteRecovery={executeRecovery}
            onSimulateLateSuccess={simulateOriginalSuccess}
            onSelectCase={selectCase}
            onOpenQueue={() => setActiveTab("queue")}
            onOpenAudit={() => setActiveTab("audit")}
            onOpenAnalytics={() => setActiveTab("analytics")}
          />
        )}

        {activeTab === "queue" && (
          <QueueView
            cases={filteredCases}
            selected={selected}
            selectedDetail={selectedDetail}
            recoveryUrl={recoveryUrl}
            aiBadge={aiBadge}
            busy={busy}
            query={query}
            statusFilter={statusFilter}
            canExecute={canExecute}
            canSimulateLateSuccess={canSimulateLateSuccess}
            onQueryChange={setQuery}
            onFilterChange={setStatusFilter}
            onSelectCase={selectCase}
            onExecuteRecovery={executeRecovery}
            onSimulateLateSuccess={simulateOriginalSuccess}
            onOpenAudit={() => setActiveTab("audit")}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsView
            cases={cases}
            summary={summary}
            recoveredCount={recoveredCount}
            protectedCount={protectedCount}
            waitingCount={waitingCount}
            proposedCount={proposedCount}
            failureGroups={failureGroups}
          />
        )}

        {activeTab === "audit" && (
          <AuditView
            cases={cases}
            selected={selected}
            detail={selectedDetail}
            onSelectCase={selectCase}
          />
        )}

        {activeTab === "build" && <BuildPlanView />}
      </div>
    </main>
  );
}

function Overview({
  message,
  busy,
  summary,
  cases,
  selected,
  selectedDetail,
  recoveryUrl,
  aiBadge,
  canExecute,
  canSimulateLateSuccess,
  modelPlanCount,
  totalPlanCount,
  onSimulateFailure,
  onExecuteRecovery,
  onSimulateLateSuccess,
  onSelectCase,
  onOpenQueue,
  onOpenAudit,
  onOpenAnalytics,
}: {
  message: string;
  busy: boolean;
  summary: RecoverySummary | null;
  cases: RecoveryCase[];
  selected: RecoveryCase | null;
  selectedDetail: CaseDetail | null;
  recoveryUrl: string | null;
  aiBadge: string;
  canExecute: boolean;
  canSimulateLateSuccess: boolean;
  modelPlanCount: number;
  totalPlanCount: number;
  onSimulateFailure: () => void;
  onExecuteRecovery: () => void;
  onSimulateLateSuccess: () => void;
  onSelectCase: (item: RecoveryCase) => void;
  onOpenQueue: () => void;
  onOpenAudit: () => void;
  onOpenAnalytics: () => void;
}) {
  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-2xl border border-[#e6e9f1] bg-white px-7 py-7 shadow-[0_10px_35px_rgba(31,45,94,0.05)]">
          <div className="mb-4 inline-flex items-center rounded-md bg-[#edf2ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2f5bff]">
            AI Revenue Recovery
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-[#0b1638] md:text-[40px] md:leading-[1.08]">
                Recover revenue without blind retries.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#697391]">
                RecoverFlow investigates failed Razorpay payments, proposes bounded actions, and stops recovery when the original payment succeeds late.
              </p>
              <p className="mt-4 text-xs font-semibold text-[#44506c]">{message}</p>
            </div>
            <button
              type="button"
              onClick={onSimulateFailure}
              disabled={busy}
              className="rounded-lg bg-[#2f5bff] px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(47,91,255,0.22)] transition hover:bg-[#244de3] disabled:opacity-50"
            >
              {busy ? "Working…" : "Simulate failed payment"}
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#244de3] via-[#2f5bff] to-[#6b63ff] p-6 text-white shadow-[0_14px_36px_rgba(47,91,255,0.24)]">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/15" />
          <div className="absolute -right-3 top-4 h-24 w-24 rounded-full border border-white/10" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-100">Safe by design</p>
          <h2 className="mt-3 text-xl font-extrabold">AI proposes. Policy decides.</h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-blue-100">
            Every autonomous recovery action is bounded by confidence, amount, attempt limits and duplicate-charge protection.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs font-bold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">✓</span>
            Late-success guard active
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Revenue at risk" value={money(summary?.revenue_at_risk || 0)} note={`${summary?.active_cases || 0} active cases`} accent="blue" />
        <MetricCard label="Recovered revenue" value={money(summary?.recovered_revenue || 0)} note="confirmed recoveries" accent="green" />
        <MetricCard label="Recovery rate" value={`${summary?.recovery_rate || 0}%`} note="recovered / at-risk value" accent="violet" />
        <MetricCard label="Late-success protected" value={money(summary?.late_success_protected_value || 0)} note={`${summary?.late_success_protected_cases || 0} duplicate risks stopped`} accent="cyan" />
        <MetricCard label="AI-planned cases" value={`${modelPlanCount}/${totalPlanCount}`} note="model-generated decisions" accent="orange" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
        <div className="overflow-hidden rounded-2xl border border-[#e6e9f1] bg-white shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
          <div className="flex items-center justify-between border-b border-[#edf0f5] px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold">Recovery Queue</h2>
                <span className="rounded-full bg-[#edf2ff] px-2 py-0.5 text-[10px] font-extrabold text-[#2f5bff]">{cases.length}</span>
              </div>
              <p className="mt-1 text-xs text-[#7b849e]">AI-inspected failures awaiting action or resolution</p>
            </div>
            <button type="button" onClick={onOpenQueue} className="text-xs font-extrabold text-[#2f5bff] hover:underline">View all</button>
          </div>
          <QueueTable cases={cases.slice(0, 6)} selected={selected} onSelectCase={onSelectCase} compact />
        </div>

        <CaseInspector
          selected={selected}
          detail={selectedDetail}
          recoveryUrl={recoveryUrl}
          aiBadge={aiBadge}
          busy={busy}
          canExecute={canExecute}
          canSimulateLateSuccess={canSimulateLateSuccess}
          onExecuteRecovery={onExecuteRecovery}
          onSimulateLateSuccess={onSimulateLateSuccess}
          onOpenAudit={onOpenAudit}
        />
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <InsightCard title="Recovery funnel" eyebrow="Last 7 days" onClick={onOpenAnalytics}>
          <div className="space-y-3">
            <MiniBar label="Failures detected" value={cases.length} max={Math.max(cases.length, 1)} />
            <MiniBar label="AI planned" value={modelPlanCount} max={Math.max(cases.length, 1)} />
            <MiniBar label="Recovered" value={cases.filter((c) => c.status === "RECOVERED").length} max={Math.max(cases.length, 1)} />
          </div>
        </InsightCard>
        <InsightCard title="Safety guard" eyebrow="Duplicate-charge prevention" onClick={onOpenAnalytics}>
          <p className="text-3xl font-extrabold text-[#0b1638]">{summary?.late_success_protected_cases || 0}</p>
          <p className="mt-1 text-xs leading-5 text-[#697391]">cases protected after an original payment succeeded late.</p>
          <p className="mt-4 text-sm font-extrabold text-emerald-600">{money(summary?.late_success_protected_value || 0)} protected</p>
        </InsightCard>
        <InsightCard title="Build progress" eyebrow="Buildathon roadmap" onClick={() => {}}>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-extrabold">{buildProgress}%</p>
            <span className="rounded-full bg-[#edf2ff] px-2.5 py-1 text-[10px] font-extrabold text-[#2f5bff]">Judge-ready path</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf0f7]">
            <div className="h-full rounded-full bg-[#2f5bff]" style={{ width: `${buildProgress}%` }} />
          </div>
          <p className="mt-3 text-xs text-[#697391]">Next: multi-scenario evaluation and benchmark evidence.</p>
        </InsightCard>
      </section>
    </>
  );
}

function QueueView({
  cases,
  selected,
  selectedDetail,
  recoveryUrl,
  aiBadge,
  busy,
  query,
  statusFilter,
  canExecute,
  canSimulateLateSuccess,
  onQueryChange,
  onFilterChange,
  onSelectCase,
  onExecuteRecovery,
  onSimulateLateSuccess,
  onOpenAudit,
}: {
  cases: RecoveryCase[];
  selected: RecoveryCase | null;
  selectedDetail: CaseDetail | null;
  recoveryUrl: string | null;
  aiBadge: string;
  busy: boolean;
  query: string;
  statusFilter: string;
  canExecute: boolean;
  canSimulateLateSuccess: boolean;
  onQueryChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onSelectCase: (item: RecoveryCase) => void;
  onExecuteRecovery: () => void;
  onSimulateLateSuccess: () => void;
  onOpenAudit: () => void;
}) {
  return (
    <>
      <PageHeading eyebrow="Recovery operations" title="Recovery Queue" description="Inspect, search and act on failed-payment cases without losing the decision context." />
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
        <div className="overflow-hidden rounded-2xl border border-[#e6e9f1] bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#edf0f5] px-5 py-4">
            <div className="min-w-[220px] flex-1">
              <input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search payment ID, diagnosis or action"
                className="w-full rounded-lg border border-[#dfe4ee] bg-[#fbfcfe] px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9bb0ff] focus:ring-2 focus:ring-[#edf2ff]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => onFilterChange(e.target.value)}
              className="rounded-lg border border-[#dfe4ee] bg-white px-3 py-2.5 text-sm font-semibold text-[#44506c] outline-none"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTION_PROPOSED">Action proposed</option>
              <option value="WAITING_FOR_CUSTOMER">Waiting for customer</option>
              <option value="RECOVERED">Recovered</option>
              <option value="ORIGINAL_PAYMENT_CAPTURED">Original captured</option>
            </select>
          </div>
          <QueueTable cases={cases} selected={selected} onSelectCase={onSelectCase} />
        </div>
        <CaseInspector
          selected={selected}
          detail={selectedDetail}
          recoveryUrl={recoveryUrl}
          aiBadge={aiBadge}
          busy={busy}
          canExecute={canExecute}
          canSimulateLateSuccess={canSimulateLateSuccess}
          onExecuteRecovery={onExecuteRecovery}
          onSimulateLateSuccess={onSimulateLateSuccess}
          onOpenAudit={onOpenAudit}
        />
      </div>
    </>
  );
}

function AnalyticsView({
  cases,
  summary,
  recoveredCount,
  protectedCount,
  waitingCount,
  proposedCount,
  failureGroups,
}: {
  cases: RecoveryCase[];
  summary: RecoverySummary | null;
  recoveredCount: number;
  protectedCount: number;
  waitingCount: number;
  proposedCount: number;
  failureGroups: { label: string; count: number }[];
}) {
  const total = Math.max(cases.length, 1);
  return (
    <>
      <PageHeading eyebrow="Merchant intelligence" title="Recovery Analytics" description="A compact operating view of recovery outcomes, failure patterns and safety-guard activity." />
      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tracked failures" value={`${cases.length}`} note="all recovery cases" accent="blue" />
        <MetricCard label="Recovered" value={`${recoveredCount}`} note={money(summary?.recovered_revenue || 0)} accent="green" />
        <MetricCard label="Protected" value={`${protectedCount}`} note={money(summary?.late_success_protected_value || 0)} accent="cyan" />
        <MetricCard label="AI coverage" value={`${summary?.model_plans || 0}/${summary?.ai_plans || 0}`} note="model-generated plans" accent="violet" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-2xl border border-[#e6e9f1] bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-extrabold">Recovery funnel</h2>
              <p className="mt-1 text-xs text-[#7b849e]">Current prototype dataset</p>
            </div>
            <span className="rounded-full bg-[#f2f5ff] px-2.5 py-1 text-[10px] font-extrabold text-[#2f5bff]">Live</span>
          </div>
          <div className="mt-7 space-y-5">
            <FunnelRow label="Failures detected" value={cases.length} percent={100} />
            <FunnelRow label="Action proposed" value={proposedCount} percent={(proposedCount / total) * 100} />
            <FunnelRow label="Waiting for customer" value={waitingCount} percent={(waitingCount / total) * 100} />
            <FunnelRow label="Recovered" value={recoveredCount} percent={(recoveredCount / total) * 100} />
            <FunnelRow label="Late-success protected" value={protectedCount} percent={(protectedCount / total) * 100} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#e6e9f1] bg-white p-6">
          <h2 className="text-base font-extrabold">Failure type breakdown</h2>
          <p className="mt-1 text-xs text-[#7b849e]">Derived from case diagnoses</p>
          <div className="mt-6 space-y-4">
            {failureGroups.map((group) => {
              const pct = cases.length ? Math.round((group.count / cases.length) * 100) : 0;
              return (
                <div key={group.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#44506c]">{group.label}</span>
                    <span className="font-extrabold text-[#0b1638]">{group.count} <span className="font-medium text-[#9aa2b5]">({pct}%)</span></span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#eef1f7]">
                    <div className="h-2 rounded-full bg-gradient-to-r from-[#2f5bff] to-[#7a6cff]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-3">
        <AnalyticsCallout title="Duplicate-charge protection" value={money(summary?.late_success_protected_value || 0)} description="Value protected when original payments succeeded after a failed-payment recovery had already begun." tone="green" />
        <AnalyticsCallout title="Active recovery exposure" value={money(summary?.revenue_at_risk || 0)} description="Current value still represented by non-terminal recovery cases." tone="blue" />
        <AnalyticsCallout title="Next benchmark" value="Blind retry vs RecoverFlow" description="The next milestone will quantify recovery lift and duplicate-risk reduction across synthetic scenarios." tone="violet" />
      </section>
    </>
  );
}

function AuditView({
  cases,
  selected,
  detail,
  onSelectCase,
}: {
  cases: RecoveryCase[];
  selected: RecoveryCase | null;
  detail: CaseDetail | null;
  onSelectCase: (item: RecoveryCase) => void;
}) {
  return (
    <>
      <PageHeading eyebrow="Traceability" title="Audit Trail" description="Every payment event, AI plan, policy decision and recovery action remains inspectable." />
      <section className="mt-5 grid gap-5 xl:grid-cols-[.62fr_1.38fr]">
        <div className="overflow-hidden rounded-2xl border border-[#e6e9f1] bg-white">
          <div className="border-b border-[#edf0f5] px-5 py-4">
            <h2 className="text-sm font-extrabold">Cases</h2>
            <p className="mt-1 text-xs text-[#7b849e]">Select a payment to inspect its complete trace</p>
          </div>
          <div className="max-h-[680px] overflow-y-auto">
            {cases.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onSelectCase(item)}
                className={`w-full border-b border-[#f0f2f6] px-5 py-4 text-left transition hover:bg-[#f8faff] ${selected?.id === item.id ? "bg-[#f3f6ff]" : "bg-white"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-extrabold text-[#24304f]">{item.razorpay_payment_id}</p>
                    <p className="mt-1 text-xs text-[#7b849e]">{pretty(item.diagnosis)}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e6e9f1] bg-white p-6">
          {!selected ? (
            <EmptyState text="Select a case to inspect its audit trail." />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#edf0f5] pb-5">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#7b849e]">Payment</p>
                  <h2 className="mt-1 font-mono text-lg font-extrabold">{selected.razorpay_payment_id}</h2>
                  <p className="mt-2 text-xs text-[#7b849e]">{eventDate(selected.created_at)} · {money(selected.amount)}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <AuditTimeline logs={detail?.audit_logs || []} light />
            </>
          )}
        </div>
      </section>
    </>
  );
}

function BuildPlanView() {
  const targetBlocks = [
    ["1", "Executive KPIs", "High-level recovery outcomes"],
    ["2", "Recovery Queue", "Prioritized failed-payment cases"],
    ["3", "AI Case Inspector", "Diagnosis, plan and guarded action"],
    ["4", "Audit Timeline", "Full event and decision trace"],
    ["5", "Recovery Analytics", "Funnel, failure reasons and benchmarks"],
    ["6", "Protection Center", "Late-success and duplicate prevention"],
    ["7", "Merchant Controls", "Rules, guardrails and policy settings"],
    ["8", "Demo & Benchmark", "Evaluation evidence and walkthrough"],
  ];

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div>
          <PageHeading eyebrow="Product blueprint" title="Build with clarity, ship with confidence" description="The target RecoverFlow experience and the implementation path from prototype to buildathon submission." />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MiniMeta label="Project" value="RecoverFlow" />
            <MiniMeta label="Objective" value="Recover more, prevent duplicates" />
            <MiniMeta label="Target" value="Judge-ready buildathon demo" />
          </div>
        </div>
        <div className="rounded-2xl border border-[#dfe5ff] bg-gradient-to-br from-[#244de3] to-[#5d66f6] p-6 text-white shadow-[0_12px_30px_rgba(47,91,255,0.18)]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Overall progress</p>
          <div className="mt-4 flex items-end gap-2">
            <p className="text-5xl font-extrabold">{buildProgress}%</p>
            <p className="pb-1 text-sm font-semibold text-blue-100">complete</p>
          </div>
          <div className="mt-5 h-2 rounded-full bg-white/20">
            <div className="h-2 rounded-full bg-white" style={{ width: `${buildProgress}%` }} />
          </div>
          <p className="mt-4 text-sm leading-6 text-blue-100">Core recovery loop and duplicate protection are proven. Evaluation and deployment come next.</p>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-[#e6e9f1] bg-white p-5">
        <div>
          <h2 className="text-base font-extrabold">Target dashboard structure</h2>
          <p className="mt-1 text-xs text-[#7b849e]">The final product should feel like a coherent merchant operations platform, not a collection of demo cards.</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {targetBlocks.map(([number, title, description]) => (
            <div key={number} className="rounded-xl border border-[#e9ecf3] bg-[#fbfcfe] p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#edf2ff] text-xs font-extrabold text-[#2f5bff]">{number}</span>
              <h3 className="mt-3 text-sm font-extrabold">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-[#697391]">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-3">
        <RoadmapColumn title="Completed" tone="green" items={roadmap.completed} checked />
        <RoadmapColumn title="Next up" tone="blue" items={roadmap.next} />
        <RoadmapColumn title="Later / submission" tone="orange" items={roadmap.later} />
      </section>

      <section className="mt-5 rounded-2xl border border-[#dfe5ff] bg-[#f3f6ff] px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#2f5bff]">Immediate focus</p>
            <h3 className="mt-1 text-lg font-extrabold">Build evaluation evidence before adding more surface area.</h3>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-[#2f5bff] shadow-sm">Next: multi-scenario simulator</span>
        </div>
      </section>
    </>
  );
}

function QueueTable({
  cases,
  selected,
  onSelectCase,
  compact = false,
}: {
  cases: RecoveryCase[];
  selected: RecoveryCase | null;
  onSelectCase: (item: RecoveryCase) => void;
  compact?: boolean;
}) {
  if (!cases.length) return <EmptyState text="No recovery cases match this view." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead className="bg-[#fbfcfe] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#7b849e]">
          <tr>
            <th className="px-5 py-3">Payment ID</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Diagnosis</th>
            <th className="px-4 py-3">AI recommendation</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf0f5]">
          {cases.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelectCase(item)}
              className={`cursor-pointer transition hover:bg-[#f8faff] ${selected?.id === item.id ? "bg-[#f3f6ff]" : "bg-white"}`}
            >
              <td className="px-5 py-4">
                <p className="font-mono text-xs font-extrabold text-[#24304f]">{item.razorpay_payment_id}</p>
                {!compact && <p className="mt-1 text-[10px] text-[#9aa2b5]">{eventDate(item.created_at)}</p>}
              </td>
              <td className="px-4 py-4 text-sm font-extrabold">{money(item.amount)}</td>
              <td className="max-w-[220px] px-4 py-4 text-xs font-semibold leading-5 text-[#44506c]">{pretty(item.diagnosis)}</td>
              <td className="px-4 py-4">
                <p className="text-xs font-extrabold text-[#24304f]">{pretty(item.recommended_action)}</p>
                {isModelPlanner(item.planner_source) && (
                  <span className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-extrabold text-violet-700">AI planned</span>
                )}
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold">{item.confidence == null ? "—" : `${Math.round(item.confidence * 100)}%`}</span>
                  <div className="h-1.5 w-12 rounded-full bg-[#edf0f5]">
                    <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.round((item.confidence || 0) * 100)}%` }} />
                  </div>
                </div>
              </td>
              <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CaseInspector({
  selected,
  detail,
  recoveryUrl,
  aiBadge,
  busy,
  canExecute,
  canSimulateLateSuccess,
  onExecuteRecovery,
  onSimulateLateSuccess,
  onOpenAudit,
}: {
  selected: RecoveryCase | null;
  detail: CaseDetail | null;
  recoveryUrl: string | null;
  aiBadge: string;
  busy: boolean;
  canExecute: boolean;
  canSimulateLateSuccess: boolean;
  onExecuteRecovery: () => void;
  onSimulateLateSuccess: () => void;
  onOpenAudit: () => void;
}) {
  return (
    <aside className="rounded-2xl border border-[#e6e9f1] bg-white p-5 shadow-[0_8px_28px_rgba(31,45,94,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#2f5bff]">Case inspector</p>
          <h2 className="mt-1 text-lg font-extrabold">Decision trace</h2>
        </div>
        {selected && (
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-extrabold text-violet-700">{aiBadge}</span>
        )}
      </div>

      {!selected ? (
        <EmptyState text="Select a recovery case to inspect its decision." />
      ) : (
        <div className="mt-5">
          <div className="flex items-start justify-between gap-3 border-b border-[#edf0f5] pb-4">
            <div>
              <p className="font-mono text-xs font-extrabold text-[#24304f]">{selected.razorpay_payment_id}</p>
              <p className="mt-1 text-[10px] text-[#9aa2b5]">{eventDate(selected.created_at)}</p>
            </div>
            <StatusBadge status={selected.status} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-5 py-5">
            <InfoLight label="Amount" value={money(selected.amount)} />
            <InfoLight label="Confidence" value={selected.confidence == null ? "—" : `${Math.round(selected.confidence * 100)}%`} />
            <InfoLight label="Diagnosis" value={pretty(selected.diagnosis)} />
            <InfoLight label="Recommended action" value={pretty(selected.recommended_action)} />
            <InfoLight label="Delay" value={selected.delay_minutes == null ? "—" : `${selected.delay_minutes} min`} />
            <InfoLight label="Customer tone" value={pretty(selected.customer_tone)} />
          </div>

          <div className="rounded-xl bg-[#f8f9fc] p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7b849e]">Agent reasoning</p>
            <p className="mt-2 text-xs leading-5 text-[#44506c]">{selected.reason || "No reasoning recorded."}</p>
          </div>

          {selected.status === "ORIGINAL_PAYMENT_CAPTURED" && (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-extrabold text-emerald-700">✓ Duplicate charge prevented</p>
              <p className="mt-1 text-[11px] leading-5 text-emerald-700/80">The original payment succeeded late, so RecoverFlow stopped recovery and cancelled the open Payment Link.</p>
            </div>
          )}

          {selected.status === "WAITING_FOR_CUSTOMER" && (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-[11px] leading-5 text-amber-800">
              Recovery link is live. Late-success protection is monitoring the original payment.
            </div>
          )}

          {selected.status === "RECOVERED" && (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-extrabold text-emerald-700">Revenue recovered successfully.</div>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {canExecute && (
              <button type="button" onClick={onExecuteRecovery} disabled={busy} className="rounded-lg bg-[#2f5bff] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#244de3] disabled:opacity-50">Execute recovery</button>
            )}
            {canSimulateLateSuccess && (
              <button type="button" onClick={onSimulateLateSuccess} disabled={busy} className="rounded-lg bg-[#ffb020] px-4 py-2.5 text-xs font-extrabold text-[#2c2208] hover:bg-[#f5a711] disabled:opacity-50">Simulate late success</button>
            )}
            {recoveryUrl && (
              <a href={recoveryUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-[#dfe4ee] bg-white px-4 py-2.5 text-center text-xs font-extrabold text-[#2f5bff] hover:bg-[#f8faff]">Open Razorpay link</a>
            )}
            <button type="button" onClick={onOpenAudit} className="rounded-lg border border-[#dfe4ee] bg-white px-4 py-2.5 text-xs font-extrabold text-[#44506c] hover:bg-[#f8f9fc]">View audit trail</button>
          </div>

          {!!detail?.audit_logs?.length && (
            <div className="mt-5 border-t border-[#edf0f5] pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold">Recent activity</p>
                <button type="button" onClick={onOpenAudit} className="text-[10px] font-extrabold text-[#2f5bff]">Full trail</button>
              </div>
              <div className="mt-3 space-y-3">
                {detail.audit_logs.slice(-4).reverse().map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ring-4 ${eventDotClasses(log.event_type)}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-extrabold text-[#35405f]">{pretty(log.event_type)}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-[#7b849e]">{log.message}</p>
                    </div>
                    <span className="text-[9px] font-semibold text-[#a1a8b9]">{eventTime(log.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function AuditTimeline({ logs, light = false }: { logs: AuditLog[]; light?: boolean }) {
  if (!logs.length) return <EmptyState text="No audit events recorded for this case yet." />;
  return (
    <div className="mt-6 space-y-0">
      {logs.map((log, index) => (
        <div key={log.id} className="relative flex gap-4 pb-6">
          {index !== logs.length - 1 && <span className="absolute left-[7px] top-4 h-[calc(100%-4px)] w-px bg-[#e4e8f0]" />}
          <span className={`relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ${eventDotClasses(log.event_type)}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className={`text-xs font-extrabold ${light ? "text-[#24304f]" : "text-white"}`}>{pretty(log.event_type)}</p>
                <p className={`mt-1 text-xs leading-5 ${light ? "text-[#697391]" : "text-white/60"}`}>{log.message}</p>
              </div>
              <span className={`text-[10px] font-semibold ${light ? "text-[#9aa2b5]" : "text-white/35"}`}>{eventTime(log.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value, note, accent }: { label: string; value: string; note: string; accent: "blue" | "green" | "violet" | "cyan" | "orange" }) {
  const styles = {
    blue: "bg-blue-50 text-[#2f5bff]",
    green: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    cyan: "bg-cyan-50 text-cyan-600",
    orange: "bg-orange-50 text-orange-600",
  }[accent];
  return (
    <div className="rounded-xl border border-[#e6e9f1] bg-white p-4 shadow-[0_5px_18px_rgba(31,45,94,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#7b849e]">{label}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${styles}`}>•</span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-[#0b1638]">{value}</p>
      <p className="mt-1 text-[10px] font-medium text-[#8b94a9]">{note}</p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[9px] font-extrabold ${statusClasses(status)}`}>{pretty(status)}</span>;
}

function InfoLight({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-extrabold uppercase tracking-[0.09em] text-[#9aa2b5]">{label}</p>
      <p className="mt-1 break-words text-xs font-extrabold leading-5 text-[#24304f]">{value}</p>
    </div>
  );
}

function InsightCard({ title, eyebrow, children, onClick }: { title: string; eyebrow: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-[#e6e9f1] bg-white p-5 text-left shadow-[0_6px_22px_rgba(31,45,94,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(31,45,94,0.07)]">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8b94a9]">{eyebrow}</p>
      <h3 className="mt-1 text-sm font-extrabold">{title}</h3>
      <div className="mt-5">{children}</div>
    </button>
  );
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(6, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-[10px] font-semibold text-[#697391]"><span>{label}</span><span className="font-extrabold text-[#24304f]">{value}</span></div>
      <div className="mt-1.5 h-1.5 rounded-full bg-[#edf0f5]"><div className="h-1.5 rounded-full bg-[#2f5bff]" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function FunnelRow({ label, value, percent }: { label: string; value: number; percent: number }) {
  return (
    <div className="grid grid-cols-[150px_1fr_50px] items-center gap-3">
      <p className="text-xs font-semibold text-[#44506c]">{label}</p>
      <div className="h-7 overflow-hidden rounded-lg bg-[#eef1f7]">
        <div className="flex h-full min-w-[34px] items-center rounded-lg bg-gradient-to-r from-[#244de3] to-[#6b63ff] px-2 text-[9px] font-extrabold text-white" style={{ width: `${Math.max(percent, 5)}%` }}>{value}</div>
      </div>
      <p className="text-right text-[10px] font-extrabold text-[#7b849e]">{Math.round(percent)}%</p>
    </div>
  );
}

function AnalyticsCallout({ title, value, description, tone }: { title: string; value: string; description: string; tone: "green" | "blue" | "violet" }) {
  const toneClasses = { green: "border-emerald-100 bg-emerald-50", blue: "border-blue-100 bg-blue-50", violet: "border-violet-100 bg-violet-50" }[tone];
  return (
    <div className={`rounded-2xl border p-5 ${toneClasses}`}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#697391]">{title}</p>
      <p className="mt-3 text-2xl font-extrabold text-[#0b1638]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#58617d]">{description}</p>
    </div>
  );
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2f5bff]">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[#0b1638]">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#697391]">{description}</p>
    </div>
  );
}

function MiniMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e6e9f1] bg-white px-4 py-3">
      <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#9aa2b5]">{label}</p>
      <p className="mt-1 text-xs font-extrabold text-[#24304f]">{value}</p>
    </div>
  );
}

function RoadmapColumn({ title, tone, items, checked = false }: { title: string; tone: "green" | "blue" | "orange"; items: string[]; checked?: boolean }) {
  const header = { green: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-[#2f5bff]", orange: "bg-orange-50 text-orange-700" }[tone];
  const dot = { green: "bg-emerald-500", blue: "border-2 border-[#2f5bff] bg-white", orange: "border-2 border-orange-400 bg-white" }[tone];
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e6e9f1] bg-white">
      <div className={`flex items-center justify-between px-5 py-4 ${header}`}>
        <h3 className="text-sm font-extrabold">{title}</h3>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-extrabold">{items.length}</span>
      </div>
      <div className="divide-y divide-[#f0f2f6] px-5">
        {items.map((item) => (
          <div key={item} className="flex gap-3 py-3.5">
            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${dot}`}>{checked && <span className="text-[9px] font-black text-white">✓</span>}</span>
            <p className="text-xs font-semibold leading-5 text-[#44506c]">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-6 py-12 text-center text-xs font-semibold text-[#8b94a9]">{text}</div>;
}
