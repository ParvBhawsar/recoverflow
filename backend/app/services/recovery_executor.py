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


def _clean_env(name: str) -> str:
    value = (os.getenv(name) or "").strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        value = value[1:-1].strip()
    return value


def _credentials() -> tuple[str, str]:
    key_id = _clean_env("RAZORPAY_KEY_ID")
    key_secret = _clean_env("RAZORPAY_KEY_SECRET")

    if not key_id or not key_secret:
        raise RuntimeError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured")

    if not key_id.startswith("rzp_test_") and not key_id.startswith("rzp_live_"):
        raise RuntimeError(
            "RAZORPAY_KEY_ID does not look like a Razorpay API key. "
            "For Test Mode it should begin with 'rzp_test_'."
        )

    return key_id, key_secret


def _razorpay_error(response: httpx.Response) -> str:
    try:
        payload = response.json()
        error = payload.get("error", {}) if isinstance(payload, dict) else {}
        description = error.get("description")
        if description:
            return str(description)
    except ValueError:
        pass

    return response.text.strip() or f"HTTP {response.status_code}"


def _extract_payment_id(data: dict) -> str | None:
    payments = data.get("payments")
    if not isinstance(payments, list) or not payments:
        return None

    payment = payments[0]
    if not isinstance(payment, dict):
        return None

    return payment.get("payment_id") or payment.get("id")


def reconcile_recovery_case(db: Session, case: RecoveryCase) -> bool:
    """Confirm a locally-created recovery link against Razorpay.

    Production remains webhook-first. This API reconciliation path keeps local demos
    accurate because Razorpay cannot deliver webhooks to 127.0.0.1/localhost.
    Returns True only when the case transitions to RECOVERED.
    """

    if case.status != "WAITING_FOR_CUSTOMER":
        return False

    action = (
        db.query(RecoveryAction)
        .filter(
            RecoveryAction.recovery_case_id == case.id,
            RecoveryAction.action_type == "CREATE_RECOVERY_LINK",
            RecoveryAction.status == "CREATED",
            RecoveryAction.external_id.isnot(None),
        )
        .order_by(RecoveryAction.created_at.desc())
        .first()
    )
    if not action or not action.external_id:
        return False

    key_id, key_secret = _credentials()
    with httpx.Client(timeout=12.0) as client:
        response = client.get(
            f"{RAZORPAY_API_BASE}/payment_links/{action.external_id}",
            auth=httpx.BasicAuth(key_id, key_secret),
        )

    if not response.is_success:
        description = _razorpay_error(response)
        raise RuntimeError(
            f"Razorpay Payment Link status check returned HTTP {response.status_code}: {description}"
        )

    data = response.json()
    razorpay_status = data.get("status")
    if razorpay_status != "paid":
        return False

    amount_paid = int(data.get("amount_paid") or case.amount)
    payment_id = _extract_payment_id(data)

    action.status = "PAID"
    action.recovery_payment_id = payment_id
    action.details = {
        **(action.details or {}),
        "razorpay_status": razorpay_status,
        "amount_paid": amount_paid,
        "confirmed_via": "razorpay_api_reconciliation",
    }

    case.status = "RECOVERED"
    case.recovered_amount = min(amount_paid, case.amount)

    db.add(
        AuditLog(
            recovery_case_id=case.id,
            event_type="RECOVERY_CONFIRMED",
            message="Recovery payment confirmed through Razorpay Payment Link reconciliation.",
            details={
                "payment_link_id": action.external_id,
                "recovery_payment_id": payment_id,
                "amount_paid": amount_paid,
                "source": "razorpay_api_reconciliation",
            },
        )
    )
    db.commit()
    return True


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
                auth=httpx.BasicAuth(key_id, key_secret),
                json=request_body,
            )

        if not response.is_success:
            description = _razorpay_error(response)
            if response.status_code == 401:
                raise RuntimeError(
                    "Razorpay rejected the API credentials (401). Regenerate/copy the Test Mode "
                    f"Key ID + Key Secret and restart the backend. Razorpay says: {description}"
                )
            raise RuntimeError(
                f"Razorpay Payment Links API returned HTTP {response.status_code}: {description}"
            )

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

    except (httpx.HTTPError, RuntimeError, ValueError) as exc:
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
