import os
from dataclasses import dataclass

import httpx
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.recovery_action import RecoveryAction
from app.models.recovery_case import RecoveryCase


RAZORPAY_API_BASE = "https://api.razorpay.com/v1"
MAX_AUTONOMOUS_AMOUNT = 2_500_000  # INR 25,000 in paise
MAX_RECOVERY_ATTEMPTS = 2
MIN_AUTONOMOUS_CONFIDENCE = 0.75


@dataclass(frozen=True)
class GuardResult:
    allowed: bool
    reason: str


def policy_guard(case: RecoveryCase) -> GuardResult:
    if case.status in {"RECOVERED", "ORIGINAL_PAYMENT_CAPTURED", "STOPPED"}:
        return GuardResult(False, f"Case is already terminal: {case.status}.")

    if case.recommended_action != "CREATE_RECOVERY_LINK":
        return GuardResult(
            False,
            f"Policy did not approve autonomous recovery link creation: {case.recommended_action}.",
        )

    if case.amount > MAX_AUTONOMOUS_AMOUNT:
        return GuardResult(False, "High-value payment requires human review.")

    if (case.confidence or 0.0) < MIN_AUTONOMOUS_CONFIDENCE:
        return GuardResult(False, "Decision confidence is below the autonomous-action threshold.")

    if case.attempt_count >= MAX_RECOVERY_ATTEMPTS:
        return GuardResult(False, "Maximum autonomous recovery attempts reached.")

    return GuardResult(True, "Bounded recovery policy approved execution.")


def _credentials() -> tuple[str, str]:
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        raise RuntimeError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured")
    return key_id, key_secret


def create_recovery_link(db: Session, case: RecoveryCase) -> RecoveryAction:
    guard = policy_guard(case)
    if not guard.allowed:
        db.add(
            AuditLog(
                recovery_case_id=case.id,
                event_type="POLICY_BLOCKED",
                message=guard.reason,
                details={"recommended_action": case.recommended_action},
            )
        )
        db.commit()
        raise ValueError(guard.reason)

    existing = (
        db.query(RecoveryAction)
        .filter(
            RecoveryAction.recovery_case_id == case.id,
            RecoveryAction.action_type == "CREATE_RECOVERY_LINK",
            RecoveryAction.status.in_(["CREATED", "PAID"]),
        )
        .order_by(RecoveryAction.created_at.desc())
        .first()
    )
    if existing:
        return existing

    key_id, key_secret = _credentials()
    reference_id = f"recoverflow_case_{case.id}_attempt_{case.attempt_count + 1}"
    request_body = {
        "amount": case.amount,
        "currency": case.currency,
        "accept_partial": False,
        "description": f"RecoverFlow payment recovery for {case.razorpay_payment_id}",
        "reference_id": reference_id,
        "notify": {"sms": False, "email": False},
        "notes": {
            "recoverflow_case_id": str(case.id),
            "original_payment_id": case.razorpay_payment_id,
        },
    }

    action = RecoveryAction(
        recovery_case_id=case.id,
        action_type="CREATE_RECOVERY_LINK",
        status="EXECUTING",
        details={"reference_id": reference_id},
    )
    db.add(action)
    db.flush()

    db.add(
        AuditLog(
            recovery_case_id=case.id,
            event_type="EXECUTION_STARTED",
            message="Policy guard approved Razorpay recovery link creation.",
            details={"reference_id": reference_id},
        )
    )

    try:
        with httpx.Client(timeout=12.0) as client:
            response = client.post(
                f"{RAZORPAY_API_BASE}/payment_links",
                auth=(key_id, key_secret),
                json=request_body,
            )
            response.raise_for_status()
            data = response.json()

        action.status = "CREATED"
        action.external_id = data.get("id")
        action.external_url = data.get("short_url")
        action.details = {
            "reference_id": reference_id,
            "razorpay_status": data.get("status"),
        }

        case.status = "WAITING_FOR_CUSTOMER"
        case.attempt_count += 1

        db.add(
            AuditLog(
                recovery_case_id=case.id,
                event_type="RECOVERY_LINK_CREATED",
                message="Razorpay recovery Payment Link created successfully.",
                details={
                    "payment_link_id": action.external_id,
                    "reference_id": reference_id,
                },
            )
        )
        db.commit()
        db.refresh(action)
        return action

    except (httpx.HTTPError, ValueError) as exc:
        action.status = "FAILED"
        action.error_message = str(exc)
        case.status = "ACTION_PROPOSED"
        db.add(
            AuditLog(
                recovery_case_id=case.id,
                event_type="EXECUTION_FAILED",
                message="Razorpay recovery link creation failed.",
                details={"error": str(exc)},
            )
        )
        db.commit()
        raise
