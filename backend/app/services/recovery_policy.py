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
}

CUSTOMER_FIXABLE_REASONS = {
    "incorrect_otp",
    "card_declined",
    "insufficient_funds",
    "authentication_failed",
}


def decide_recovery_action(payment: dict) -> RecoveryDecision:
    """Deterministic baseline used before the LLM planner is introduced.

    Keeping this policy explicit gives RecoverFlow a safe fallback and a
    measurable baseline for later AI evaluation.
    """

    reason = (payment.get("error_reason") or "unknown").lower()
    source = (payment.get("error_source") or "unknown").lower()
    amount = int(payment.get("amount") or 0)

    # High-value payments should not be autonomously retried.
    if amount >= 2_500_000:  # INR 25,000 in paise
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
            recommended_action="RETRY_PROMPT",
            reason="The failure appears fixable by the customer with another payment attempt.",
        )

    if reason in TRANSIENT_REASONS or source in {"bank", "gateway"}:
        return RecoveryDecision(
            diagnosis="transient_payment_failure",
            confidence=0.86,
            recommended_action="WAIT_AND_VERIFY",
            reason="The failure may be transient; verify final payment state before collecting again.",
        )

    return RecoveryDecision(
        diagnosis="uncertain_failure",
        confidence=0.55,
        recommended_action="ESCALATE",
        reason="Failure context is insufficient for safe autonomous recovery.",
    )
