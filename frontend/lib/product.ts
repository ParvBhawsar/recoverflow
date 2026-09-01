export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type RecoverySummary = {
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

export type RecoveryCase = {
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

export type AuditLog = {
  id: number;
  event_type: string;
  message: string;
  details?: Record<string, unknown> | null;
  created_at: string;
};

export type RecoveryAction = {
  id: number;
  action_type: string;
  status: string;
  external_id?: string | null;
  external_url?: string | null;
  recovery_payment_id?: string | null;
  error_message?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
};

export type CaseDetail = {
  case: RecoveryCase;
  ai_plan?: {
    diagnosis?: string | null;
    confidence?: number | null;
    recommended_action?: string | null;
    delay_minutes?: number | null;
    reason?: string | null;
    customer_tone?: string | null;
    planner_source?: string | null;
    planner_model?: string | null;
    provider_error?: string | null;
  } | null;
  policy_guard: {
    allowed: boolean;
    reason: string;
  };
  actions?: RecoveryAction[];
  audit_logs: AuditLog[];
};

export const money = (paise = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);

export const pretty = (value?: string | null) =>
  value
    ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
    : "—";

export const shortDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const confidenceLabel = (value?: number | null) =>
  typeof value === "number" ? `${Math.round(value * 100)}%` : "—";

export const isModelPlanner = (source?: string | null) =>
  source === "gemini" || source === "openai";

export function statusTone(status?: string | null) {
  switch (status) {
    case "RECOVERED":
      return "success";
    case "ORIGINAL_PAYMENT_CAPTURED":
    case "STOPPED":
      return "info";
    case "WAITING_FOR_CUSTOMER":
      return "warning";
    case "PROTECTION_ATTENTION_REQUIRED":
    case "DUPLICATE_COLLECTION_DETECTED":
      return "danger";
    default:
      return "neutral";
  }
}
