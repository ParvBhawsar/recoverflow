import json
import os
from urllib.parse import quote

import httpx

from app.services.evaluation_dataset import DATASET_VERSION, EVALUATION_DATASET


GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
GEMINI_BENCHMARK_MODEL = "gemini-3.5-flash-lite"
AUTONOMOUS_AMOUNT_LIMIT = 2_500_000
MIN_AUTONOMOUS_CONFIDENCE = 0.75
ALLOWED_ACTIONS = {"CREATE_RECOVERY_LINK", "WAIT_AND_VERIFY", "ESCALATE"}


def _clean_env(name: str) -> str:
    value = (os.getenv(name) or "").strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1].strip()
    return value


def _benchmark_input(records: list[dict]) -> list[dict]:
    """Return only inference-time fields. Ground-truth labels are deliberately excluded."""
    return [
        {
            "id": row["id"],
            "amount_paise": row["amount"],
            "currency": row["currency"],
            "method": row["method"],
            "error_code": row["error_code"],
            "error_source": row["error_source"],
            "error_step": row["error_step"],
            "error_reason": row["error_reason"],
        }
        for row in records
    ]


def _benchmark_schema() -> dict:
    return {
        "type": "object",
        "properties": {
            "decisions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "recommended_action": {
                            "type": "string",
                            "enum": ["CREATE_RECOVERY_LINK", "WAIT_AND_VERIFY", "ESCALATE"],
                        },
                        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                        "reason": {"type": "string"},
                    },
                    "required": ["id", "recommended_action", "confidence", "reason"],
                },
            }
        },
        "required": ["decisions"],
    }


def _benchmark_prompt(records: list[dict]) -> str:
    instructions = (
        "You are RecoverFlow's payment recovery planner. For every payment failure below, "
        "choose exactly one action: CREATE_RECOVERY_LINK, WAIT_AND_VERIFY, or ESCALATE. "
        "CREATE_RECOVERY_LINK is for clear customer-fixable failures where a fresh collection "
        "path is safe. WAIT_AND_VERIFY is for gateway, network, bank, or final-state uncertainty "
        "where delayed success may arrive and retrying could double-charge. ESCALATE is for "
        "ambiguous, suspicious, or high-value customer-recovery cases requiring review. "
        "The autonomous amount ceiling is INR 25,000 inclusive: exactly 2,500,000 paise is within "
        "the limit, above it is not. Transient/final-state uncertainty should still WAIT_AND_VERIFY "
        "even when the amount is high. Do not invent payment outcomes. Return one decision for every "
        "input id. Ground-truth labels are intentionally not provided."
    )
    return f"{instructions}\n\nPayment failures:\n{json.dumps(_benchmark_input(records), separators=(',', ':'))}"


def _call_gemini_batch(records: list[dict]) -> tuple[str, list[dict]]:
    api_key = _clean_env("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    model = GEMINI_BENCHMARK_MODEL
    url = f"{GEMINI_API_BASE}/{quote(model, safe='')}:generateContent"
    body = {
        "contents": [{"parts": [{"text": _benchmark_prompt(records)}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseJsonSchema": _benchmark_schema(),
            "thinkingConfig": {"thinkingLevel": "MINIMAL"},
        },
    }

    timeout = httpx.Timeout(45.0, connect=7.0)
    with httpx.Client(timeout=timeout) as client:
        response = client.post(
            url,
            headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
            json=body,
        )

    if not response.is_success:
        raise RuntimeError(f"Gemini benchmark HTTP {response.status_code}: {response.text[:700]}")

    payload = response.json()
    candidates = payload.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini benchmark returned no candidates")

    parts = candidates[0].get("content", {}).get("parts", [])
    text = next(
        (part.get("text") for part in parts if isinstance(part, dict) and part.get("text")),
        None,
    )
    if not text:
        raise RuntimeError("Gemini benchmark returned no structured output")

    parsed = json.loads(text)
    decisions = parsed.get("decisions") or []
    expected_ids = {row["id"] for row in records}
    decision_ids = {item.get("id") for item in decisions if isinstance(item, dict)}
    missing = sorted(expected_ids - decision_ids)
    if missing:
        raise RuntimeError(f"Gemini benchmark omitted {len(missing)} case(s): {', '.join(missing[:5])}")

    return model, decisions


def _normalize_ai_decisions(records: list[dict], decisions: list[dict]) -> list[dict]:
    decision_map = {item.get("id"): item for item in decisions if isinstance(item, dict)}
    rows: list[dict] = []

    for record in records:
        raw = decision_map[record["id"]]
        action = str(raw.get("recommended_action") or "").upper().strip()
        if action not in ALLOWED_ACTIONS:
            action = "ESCALATE"

        confidence = max(0.0, min(1.0, float(raw.get("confidence") or 0)))
        guard_override = False
        if record["amount"] > AUTONOMOUS_AMOUNT_LIMIT and action == "CREATE_RECOVERY_LINK":
            action = "ESCALATE"
            confidence = max(confidence, 0.99)
            guard_override = True

        autonomous_execution = (
            action == "CREATE_RECOVERY_LINK"
            and record["amount"] <= AUTONOMOUS_AMOUNT_LIMIT
            and confidence >= MIN_AUTONOMOUS_CONFIDENCE
        )

        rows.append(
            {
                "id": record["id"],
                "name": record["name"],
                "category": record["category"],
                "amount": record["amount"],
                "late_success_risk": record["late_success_risk"],
                "expected_action": record["expected_action"],
                "expected_autonomous_execution": record["expected_autonomous_execution"],
                "action": action,
                "confidence": confidence,
                "autonomous_execution": autonomous_execution,
                "guard_override": guard_override,
                "reason": str(raw.get("reason") or "")[:500],
            }
        )

    return rows


def _blind_retry_rows(records: list[dict]) -> list[dict]:
    return [
        {
            "id": record["id"],
            "name": record["name"],
            "category": record["category"],
            "amount": record["amount"],
            "late_success_risk": record["late_success_risk"],
            "expected_action": record["expected_action"],
            "expected_autonomous_execution": record["expected_autonomous_execution"],
            "action": "CREATE_RECOVERY_LINK",
            "confidence": 1.0,
            "autonomous_execution": True,
            "guard_override": False,
            "reason": "Blind-retry baseline launches a new collection path for every failed payment.",
        }
        for record in records
    ]


def _metrics(rows: list[dict]) -> dict:
    total = len(rows)
    correct = sum(1 for row in rows if row["action"] == row["expected_action"])
    autonomous = [row for row in rows if row["autonomous_execution"]]
    correct_autonomous = [
        row
        for row in autonomous
        if row["expected_autonomous_execution"] and row["expected_action"] == "CREATE_RECOVERY_LINK"
    ]
    unsafe_collection_attempts = sum(
        1
        for row in rows
        if row["autonomous_execution"] and not row["expected_autonomous_execution"]
    )
    duplicate_risk_exposures = sum(
        1
        for row in rows
        if row["autonomous_execution"] and row["late_success_risk"] in {"medium", "high"}
    )
    high_value_autonomous_attempts = sum(
        1
        for row in rows
        if row["autonomous_execution"] and row["amount"] > AUTONOMOUS_AMOUNT_LIMIT
    )
    expected_recovery_opportunities = [
        row for row in rows if row["expected_action"] == "CREATE_RECOVERY_LINK"
    ]
    captured_recovery_opportunities = sum(
        1
        for row in expected_recovery_opportunities
        if row["action"] == "CREATE_RECOVERY_LINK"
    )
    expected_deferrals = [
        row for row in rows if row["expected_action"] in {"WAIT_AND_VERIFY", "ESCALATE"}
    ]
    correct_deferrals = sum(
        1 for row in expected_deferrals if row["action"] == row["expected_action"]
    )

    return {
        "total_cases": total,
        "correct_actions": correct,
        "action_accuracy_pct": round((correct / total) * 100, 2) if total else 0.0,
        "autonomous_attempts": len(autonomous),
        "autonomous_precision_pct": round((len(correct_autonomous) / len(autonomous)) * 100, 2)
        if autonomous
        else 100.0,
        "unsafe_collection_attempts": unsafe_collection_attempts,
        "duplicate_risk_exposures": duplicate_risk_exposures,
        "high_value_autonomous_attempts": high_value_autonomous_attempts,
        "recovery_opportunity_capture_pct": round(
            (captured_recovery_opportunities / len(expected_recovery_opportunities)) * 100, 2
        )
        if expected_recovery_opportunities
        else 100.0,
        "safe_deferral_accuracy_pct": round((correct_deferrals / len(expected_deferrals)) * 100, 2)
        if expected_deferrals
        else 100.0,
    }


def run_benchmark() -> dict:
    records = EVALUATION_DATASET
    model, raw_decisions = _call_gemini_batch(records)
    recoverflow_rows = _normalize_ai_decisions(records, raw_decisions)
    blind_rows = _blind_retry_rows(records)

    recoverflow_metrics = _metrics(recoverflow_rows)
    blind_metrics = _metrics(blind_rows)

    comparison = {
        "accuracy_lift_percentage_points": round(
            recoverflow_metrics["action_accuracy_pct"] - blind_metrics["action_accuracy_pct"], 2
        ),
        "unsafe_collection_attempts_avoided": max(
            0,
            blind_metrics["unsafe_collection_attempts"]
            - recoverflow_metrics["unsafe_collection_attempts"],
        ),
        "duplicate_risk_exposures_avoided": max(
            0,
            blind_metrics["duplicate_risk_exposures"]
            - recoverflow_metrics["duplicate_risk_exposures"],
        ),
        "high_value_autonomous_attempts_avoided": max(
            0,
            blind_metrics["high_value_autonomous_attempts"]
            - recoverflow_metrics["high_value_autonomous_attempts"],
        ),
    }

    return {
        "dataset_version": DATASET_VERSION,
        "synthetic": True,
        "benchmark_type": "live_batch_ai_vs_blind_retry",
        "planner_source": "gemini",
        "planner_model": model,
        "ground_truth_hidden_from_model": True,
        "recoverflow": {
            "metrics": recoverflow_metrics,
            "rows": recoverflow_rows,
        },
        "blind_retry": {
            "metrics": blind_metrics,
            "rows": blind_rows,
        },
        "comparison": comparison,
    }
