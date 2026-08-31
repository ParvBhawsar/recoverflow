import json
import os
from dataclasses import dataclass
from urllib.parse import quote

import httpx
from sqlalchemy.orm import Session

from app.models.ai_plan import AIPlan
from app.models.audit_log import AuditLog
from app.models.recovery_case import RecoveryCase
from app.services.recovery_policy import RecoveryDecision, decide_recovery_action


OPENAI_API_URL = "https://api.openai.com/v1/responses"
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
GEMINI_FAST_MODEL = "gemini-3.5-flash-lite"
ALLOWED_ACTIONS = {"CREATE_RECOVERY_LINK", "WAIT_AND_VERIFY", "ESCALATE"}
ALLOWED_TONES = {"supportive", "neutral", "urgent"}


@dataclass(frozen=True)
class PlannerDecision:
    diagnosis: str
    confidence: float
    recommended_action: str
    delay_minutes: int
    reason: str
    customer_tone: str
    planner_source: str
    planner_model: str | None
    provider_error: str | None = None
    raw_response: dict | None = None


def _clean_env(name: str) -> str:
    value = (os.getenv(name) or "").strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        value = value[1:-1].strip()
    return value


def _env_enabled(name: str, default: bool = False) -> bool:
    value = _clean_env(name).lower()
    if not value:
        return default
    return value in {"1", "true", "yes", "on"}


def _fallback(payment: dict, provider_error: str | None = None) -> PlannerDecision:
    baseline: RecoveryDecision = decide_recovery_action(payment)
    tone = "supportive" if baseline.recommended_action == "CREATE_RECOVERY_LINK" else "neutral"
    delay = 5 if baseline.recommended_action == "WAIT_AND_VERIFY" else 0
    return PlannerDecision(
        diagnosis=baseline.diagnosis,
        confidence=baseline.confidence,
        recommended_action=baseline.recommended_action,
        delay_minutes=delay,
        reason=baseline.reason,
        customer_tone=tone,
        planner_source="deterministic_fallback",
        planner_model=None,
        provider_error=provider_error,
    )


def _validate_plan(
    data: dict,
    payment: dict,
    model: str,
    source: str,
    raw: dict,
) -> PlannerDecision:
    action = str(data.get("recommended_action") or "").strip().upper()
    if action not in ALLOWED_ACTIONS:
        raise ValueError(f"Unsupported action from AI planner: {action}")

    tone = str(data.get("customer_tone") or "neutral").strip().lower()
    if tone not in ALLOWED_TONES:
        tone = "neutral"

    confidence = float(data.get("confidence") or 0)
    confidence = max(0.0, min(1.0, confidence))
    delay_minutes = max(0, min(1440, int(data.get("delay_minutes") or 0)))
    amount = int(payment.get("amount") or 0)

    if amount > 2_500_000 and action == "CREATE_RECOVERY_LINK":
        action = "ESCALATE"
        confidence = max(confidence, 0.99)
        reason = (
            "AI proposed autonomous recovery, but hard policy requires human review "
            "for transactions above the ₹25,000 autonomous limit."
        )
    else:
        reason = str(
            data.get("reason")
            or "AI recovery recommendation generated from payment failure context."
        )

    return PlannerDecision(
        diagnosis=str(data.get("diagnosis") or "uncertain_failure")[:120],
        confidence=confidence,
        recommended_action=action,
        delay_minutes=delay_minutes,
        reason=reason[:1200],
        customer_tone=tone,
        planner_source=source,
        planner_model=model,
        raw_response=raw,
    )


def _schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "diagnosis": {"type": "string"},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            "recommended_action": {
                "type": "string",
                "enum": ["CREATE_RECOVERY_LINK", "WAIT_AND_VERIFY", "ESCALATE"],
            },
            "delay_minutes": {"type": "integer", "minimum": 0, "maximum": 1440},
            "reason": {"type": "string"},
            "customer_tone": {
                "type": "string",
                "enum": ["supportive", "neutral", "urgent"],
            },
        },
        "required": [
            "diagnosis",
            "confidence",
            "recommended_action",
            "delay_minutes",
            "reason",
            "customer_tone",
        ],
    }


def _prompt(payment: dict) -> str:
    system_prompt = (
        "You are RecoverFlow's payment-recovery planner. Diagnose a failed Razorpay "
        "payment and propose exactly one bounded next action. Never claim money was moved. "
        "CREATE_RECOVERY_LINK is appropriate only for low-risk customer-fixable failures. "
        "WAIT_AND_VERIFY is appropriate for transient bank/gateway failures where late "
        "success is plausible. ESCALATE is required for high-value, ambiguous, suspicious, "
        "or unsafe cases. Keep reasons concise and operational."
    )
    input_payload = {
        "payment_id": payment.get("id"),
        "amount_paise": int(payment.get("amount") or 0),
        "currency": payment.get("currency", "INR"),
        "method": payment.get("method"),
        "error_code": payment.get("error_code"),
        "error_source": payment.get("error_source"),
        "error_step": payment.get("error_step"),
        "error_reason": payment.get("error_reason"),
    }
    return f"{system_prompt}\n\nPayment context:\n{json.dumps(input_payload)}"


def _call_gemini_model(payment: dict, api_key: str, model: str) -> PlannerDecision:
    url = f"{GEMINI_API_BASE}/{quote(model, safe='')}:generateContent"
    thinking_level = "LOW" if model == "gemini-3.7-flash" else "MINIMAL"
    request_body = {
        "contents": [{"parts": [{"text": _prompt(payment)}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseJsonSchema": _schema(),
            "thinkingConfig": {"thinkingLevel": thinking_level},
        },
    }

    timeout = httpx.Timeout(20.0, connect=5.0)
    with httpx.Client(timeout=timeout) as client:
        response = client.post(
            url,
            headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
            json=request_body,
        )

    if not response.is_success:
        raise RuntimeError(f"Gemini {model} HTTP {response.status_code}: {response.text[:500]}")

    raw = response.json()
    candidates = raw.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"Gemini {model} returned no candidates")

    parts = candidates[0].get("content", {}).get("parts", [])
    output_text = next(
        (part.get("text") for part in parts if isinstance(part, dict) and part.get("text")),
        None,
    )
    if not output_text:
        raise RuntimeError(f"Gemini {model} returned no structured output text")

    data = json.loads(output_text)
    return _validate_plan(data, payment, model, "gemini", raw)


def _plan_with_gemini(payment: dict, api_key: str) -> PlannerDecision:
    preferred = _clean_env("GEMINI_MODEL")
    models = [GEMINI_FAST_MODEL]
    if preferred and preferred not in models:
        models.append(preferred)

    errors: list[str] = []
    for model in models:
        try:
            return _call_gemini_model(payment, api_key, model)
        except Exception as exc:
            errors.append(str(exc))

    raise RuntimeError(" | ".join(errors))


def _plan_with_openai(payment: dict, api_key: str) -> PlannerDecision:
    model = _clean_env("OPENAI_MODEL") or "gpt-5.6-luna"
    request_body = {
        "model": model,
        "input": [{"role": "system", "content": _prompt(payment)}],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "recoverflow_plan",
                "strict": True,
                "schema": _schema(),
            }
        },
    }

    with httpx.Client(timeout=25.0) as client:
        response = client.post(
            OPENAI_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=request_body,
        )

    if not response.is_success:
        raise RuntimeError(f"OpenAI HTTP {response.status_code}: {response.text[:500]}")

    raw = response.json()
    output_text = raw.get("output_text")
    if not output_text:
        for item in raw.get("output", []):
            for content in item.get("content", []):
                if content.get("type") == "output_text" and content.get("text"):
                    output_text = content["text"]
                    break
            if output_text:
                break

    if not output_text:
        raise RuntimeError("OpenAI returned no structured output text")

    data = json.loads(output_text)
    return _validate_plan(data, payment, model, "openai", raw)


def plan_recovery(payment: dict) -> PlannerDecision:
    gemini_key = _clean_env("GEMINI_API_KEY")
    openai_enabled = _env_enabled("OPENAI_FALLBACK_ENABLED", default=False)
    openai_key = _clean_env("OPENAI_API_KEY") if openai_enabled else ""
    errors: list[str] = []

    if gemini_key:
        try:
            return _plan_with_gemini(payment, gemini_key)
        except Exception as exc:
            errors.append(str(exc))

    if openai_enabled and openai_key:
        try:
            return _plan_with_openai(payment, openai_key)
        except Exception as exc:
            errors.append(str(exc))

    if not gemini_key:
        errors.append("GEMINI_API_KEY is not configured")
    if openai_enabled and not openai_key:
        errors.append("OPENAI_FALLBACK_ENABLED is true but OPENAI_API_KEY is not configured")
    if not openai_enabled:
        errors.append("OpenAI fallback disabled")

    return _fallback(payment, " | ".join(errors))


def apply_ai_plan(db: Session, case: RecoveryCase, payment: dict) -> PlannerDecision:
    plan = plan_recovery(payment)

    case.diagnosis = plan.diagnosis
    case.confidence = plan.confidence
    case.recommended_action = plan.recommended_action
    case.reason = plan.reason

    existing = db.query(AIPlan).filter(AIPlan.recovery_case_id == case.id).first()
    if not existing:
        existing = AIPlan(recovery_case_id=case.id)
        db.add(existing)

    existing.diagnosis = plan.diagnosis
    existing.confidence = plan.confidence
    existing.recommended_action = plan.recommended_action
    existing.delay_minutes = plan.delay_minutes
    existing.reason = plan.reason
    existing.customer_tone = plan.customer_tone
    existing.planner_source = plan.planner_source
    existing.planner_model = plan.planner_model
    existing.provider_error = plan.provider_error
    existing.raw_response = plan.raw_response

    db.add(
        AuditLog(
            recovery_case_id=case.id,
            event_type="AI_PLAN_CREATED",
            message="Recovery plan generated and passed to deterministic policy enforcement.",
            details={
                "planner_source": plan.planner_source,
                "planner_model": plan.planner_model,
                "diagnosis": plan.diagnosis,
                "recommended_action": plan.recommended_action,
                "confidence": plan.confidence,
                "delay_minutes": plan.delay_minutes,
                "customer_tone": plan.customer_tone,
                "provider_error": plan.provider_error,
            },
        )
    )

    return plan
