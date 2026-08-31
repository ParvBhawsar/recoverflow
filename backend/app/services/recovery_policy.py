from dataclasses import dataclass


@dataclass(frozen=True)
class RecoveryDecision:
    diagnosis: str
    confidence: float
    recommended_action: str
    reason: str


TRANSIENT_REASONS = {
    "bank_technical_error",
    "gateway_error",
    "payment_failed",
    "server_error",
    "gateway_timeout",
    "network_timeout",
    "bank_processing_error",
    "issuer_unavailable",
    "state_unknown",
}

CUSTOMER_FIXABLE_REASONS = {
    "incorrect_otp",
    "card_declined",
    "insufficient_funds",
    "authentication_failed",
}


def decide_recovery_action(payment: dict) -> RecoveryDecision:
    """Deterministic safety baseline for bounded recovery decisions."""

    reason = (payment.get("error_reason") or "unknown").lower()
    source = (payment.get("error_source") or "unknown").lower()
    amount = int(payment.get("amount") or 0)

    # Final-state uncertainty takes priority: verify before creating any new collection path.
    if reason in TRANSIENT_REASONS or source in {"bank", "gateway"}:
        return RecoveryDecision(
            diagnosis="transient_payment_failure",
            confidence=0.86,
            recommended_action="WAIT_AND_VERIFY",
            reason="The failure may be transient; verify final payment state before collecting again.",
        )

    if amount > 2_500_000:  # Above INR 25,000 in paise
        return RecoveryDecision(
            diagnosis="high_value_failure",
            confidence=0.99,
            recommended_action="ESCALATE",
            reason="High-value transaction requires human review before recovery action.",
        )

    if reason in CUSTOMER_FIXABLE_REASONS:
        return RecoveryDecision(
            diagnosis="customer_fixable_failure",
            confidence=0.90,
            recommended_action="CREATE_RECOVERY_LINK",
            reason=(
                "The failure is customer-fixable and falls within bounded autonomous "
                "recovery limits, so a new Razorpay Payment Link can be offered safely."
            ),
        )

    return RecoveryDecision(
        diagnosis="uncertain_failure",
        confidence=0.55,
        recommended_action="ESCALATE",
        reason="Failure context is insufficient for safe autonomous recovery.",
    )
