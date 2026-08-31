DATASET_VERSION = "rf-synth-v1"
DATASET_DESCRIPTION = (
    "Synthetic labelled Razorpay-style payment failure cases for evaluating recovery strategy. "
    "These records are not production transactions and must not be presented as real merchant data."
)


def _case(
    case_id: str,
    name: str,
    category: str,
    amount: int,
    method: str,
    error_code: str,
    error_source: str,
    error_step: str,
    error_reason: str,
    expected_action: str,
    late_success_risk: str,
    rationale: str,
) -> dict:
    return {
        "id": case_id,
        "name": name,
        "category": category,
        "amount": amount,
        "currency": "INR",
        "method": method,
        "error_code": error_code,
        "error_source": error_source,
        "error_step": error_step,
        "error_reason": error_reason,
        "expected_action": expected_action,
        "late_success_risk": late_success_risk,
        "expected_autonomous_execution": expected_action == "CREATE_RECOVERY_LINK" and amount <= 2_500_000,
        "rationale": rationale,
    }


EVALUATION_DATASET = [
    _case("otp_001", "Incorrect OTP · Low Value", "customer_fixable", 89900, "card", "BAD_REQUEST_ERROR", "customer", "payment_authentication", "incorrect_otp", "CREATE_RECOVERY_LINK", "low", "Customer can safely retry authentication or switch method."),
    _case("otp_002", "Incorrect OTP · Mid Value", "customer_fixable", 499900, "card", "BAD_REQUEST_ERROR", "customer", "payment_authentication", "incorrect_otp", "CREATE_RECOVERY_LINK", "low", "Clear customer-fixable authentication failure below autonomous value limit."),
    _case("otp_003", "Incorrect OTP · Near Limit", "customer_fixable", 2400000, "card", "BAD_REQUEST_ERROR", "customer", "payment_authentication", "incorrect_otp", "CREATE_RECOVERY_LINK", "low", "Still below the merchant autonomous amount threshold."),
    _case("otp_004", "Incorrect OTP · High Value", "high_value", 7500000, "card", "BAD_REQUEST_ERROR", "customer", "payment_authentication", "incorrect_otp", "ESCALATE", "low", "High-value recovery requires human review even when the failure itself is customer-fixable."),

    _case("funds_001", "Insufficient Funds · Card", "customer_fixable", 129900, "card", "BAD_REQUEST_ERROR", "customer", "payment_authorization", "insufficient_funds", "CREATE_RECOVERY_LINK", "low", "Customer can add funds or use another payment method."),
    _case("funds_002", "Insufficient Funds · UPI", "customer_fixable", 249900, "upi", "BAD_REQUEST_ERROR", "customer", "payment_authorization", "insufficient_funds", "CREATE_RECOVERY_LINK", "low", "A new bounded collection path can help the customer complete payment later."),
    _case("funds_003", "Insufficient Funds · High Value", "high_value", 4200000, "card", "BAD_REQUEST_ERROR", "customer", "payment_authorization", "insufficient_funds", "ESCALATE", "low", "Amount exceeds autonomous recovery policy despite a clear failure reason."),

    _case("auth_001", "Authentication Failed · Card", "customer_fixable", 189900, "card", "BAD_REQUEST_ERROR", "customer", "payment_authentication", "authentication_failed", "CREATE_RECOVERY_LINK", "low", "Authentication can be retried without assuming the original payment succeeded."),
    _case("decline_001", "Card Declined · Low Value", "customer_fixable", 99900, "card", "BAD_REQUEST_ERROR", "customer", "payment_authorization", "card_declined", "CREATE_RECOVERY_LINK", "low", "Customer may switch instrument; bounded recovery is appropriate."),
    _case("decline_002", "Card Declined · High Value", "high_value", 9000000, "card", "BAD_REQUEST_ERROR", "customer", "payment_authorization", "card_declined", "ESCALATE", "low", "High-value decline should not trigger autonomous collection."),

    _case("gateway_001", "Gateway Timeout · Card", "transient", 799900, "card", "GATEWAY_ERROR", "gateway", "payment_processing", "gateway_timeout", "WAIT_AND_VERIFY", "high", "Outcome is uncertain; retrying immediately can create duplicate collection."),
    _case("gateway_002", "Gateway Timeout · UPI", "transient", 199900, "upi", "GATEWAY_ERROR", "gateway", "payment_processing", "gateway_timeout", "WAIT_AND_VERIFY", "high", "UPI confirmation may arrive late after a timeout."),
    _case("gateway_003", "Gateway Timeout · High Value", "transient", 6500000, "card", "GATEWAY_ERROR", "gateway", "payment_processing", "gateway_timeout", "WAIT_AND_VERIFY", "high", "Late-success risk dominates; verification must happen before any new collection path."),
    _case("network_001", "Network Timeout", "transient", 349900, "card", "GATEWAY_ERROR", "gateway", "payment_processing", "network_timeout", "WAIT_AND_VERIFY", "high", "Network ambiguity means payment state should be verified before retrying."),
    _case("bank_001", "Bank Processing Error · Netbanking", "transient", 189900, "netbanking", "SERVER_ERROR", "bank", "payment_processing", "bank_processing_error", "WAIT_AND_VERIFY", "medium", "Temporary bank failures can settle asynchronously."),
    _case("bank_002", "Issuer Temporarily Unavailable", "transient", 559900, "card", "SERVER_ERROR", "bank", "payment_processing", "issuer_unavailable", "WAIT_AND_VERIFY", "medium", "Issuer availability can recover without customer intervention; observe first."),
    _case("bank_003", "Bank Processing Error · High Value", "transient", 5200000, "netbanking", "SERVER_ERROR", "bank", "payment_processing", "bank_processing_error", "WAIT_AND_VERIFY", "medium", "Verification remains safer than launching another payment path."),

    _case("unknown_001", "Unknown Failure · Card", "ambiguous", 349900, "card", "UNKNOWN_ERROR", "unknown", "unknown", "unknown", "ESCALATE", "unknown", "Insufficient diagnostic context for safe autonomous recovery."),
    _case("unknown_002", "Unknown Failure · UPI", "ambiguous", 149900, "upi", "UNKNOWN_ERROR", "unknown", "unknown", "unknown", "ESCALATE", "unknown", "Do not guess when both cause and final payment state are unclear."),
    _case("unknown_003", "Unknown Failure · High Value", "high_value", 8800000, "card", "UNKNOWN_ERROR", "unknown", "unknown", "unknown", "ESCALATE", "unknown", "Ambiguity plus high value requires human review."),

    _case("risk_001", "Repeated Authentication Mismatch", "risk_review", 899900, "card", "BAD_REQUEST_ERROR", "customer", "payment_authentication", "repeated_authentication_mismatch", "ESCALATE", "low", "Repeated mismatch can indicate abnormal behavior and should not be auto-recovered."),
    _case("risk_002", "Suspicious Retry Pattern", "risk_review", 399900, "card", "BAD_REQUEST_ERROR", "customer", "payment_authorization", "suspicious_retry_pattern", "ESCALATE", "low", "Potential abuse or compromised credentials require review."),
    _case("risk_003", "Velocity Limit Triggered", "risk_review", 699900, "card", "BAD_REQUEST_ERROR", "customer", "payment_authorization", "velocity_limit_exceeded", "ESCALATE", "low", "Repeated rapid attempts should not create more automated collection pressure."),

    _case("mixed_001", "Customer Error After Gateway Delay", "ambiguous", 279900, "card", "GATEWAY_ERROR", "gateway", "payment_authentication", "incorrect_otp_after_timeout", "WAIT_AND_VERIFY", "high", "Gateway uncertainty takes precedence over a customer-fixable symptom."),
    _case("mixed_002", "Bank Error With Missing Final State", "ambiguous", 119900, "upi", "SERVER_ERROR", "bank", "payment_processing", "state_unknown", "WAIT_AND_VERIFY", "high", "Final state is unresolved, so verification is safer than collection."),
    _case("mixed_003", "Low-Value Unclassified Decline", "ambiguous", 59900, "card", "BAD_REQUEST_ERROR", "unknown", "payment_authorization", "unclassified_decline", "ESCALATE", "unknown", "Low amount does not justify autonomous action when failure semantics are unknown."),

    _case("limit_001", "Exactly At Autonomous Limit", "customer_fixable", 2500000, "card", "BAD_REQUEST_ERROR", "customer", "payment_authentication", "incorrect_otp", "CREATE_RECOVERY_LINK", "low", "Boundary case verifies inclusive policy behavior at ₹25,000."),
    _case("limit_002", "One Rupee Above Limit", "high_value", 2500100, "card", "BAD_REQUEST_ERROR", "customer", "payment_authentication", "incorrect_otp", "ESCALATE", "low", "Boundary case verifies hard amount enforcement above ₹25,000."),
    _case("limit_003", "Tiny Customer-Fixable Payment", "customer_fixable", 9900, "upi", "BAD_REQUEST_ERROR", "customer", "payment_authorization", "insufficient_funds", "CREATE_RECOVERY_LINK", "low", "Very small payments should still follow the same bounded recovery semantics."),
    _case("limit_004", "Large Ambiguous Payment", "high_value", 15000000, "netbanking", "UNKNOWN_ERROR", "unknown", "unknown", "unknown", "ESCALATE", "unknown", "Maximum-risk combination validates conservative escalation behavior."),
]


def dataset_summary() -> dict:
    action_counts: dict[str, int] = {}
    category_counts: dict[str, int] = {}
    risk_counts: dict[str, int] = {}

    for row in EVALUATION_DATASET:
        action_counts[row["expected_action"]] = action_counts.get(row["expected_action"], 0) + 1
        category_counts[row["category"]] = category_counts.get(row["category"], 0) + 1
        risk_counts[row["late_success_risk"]] = risk_counts.get(row["late_success_risk"], 0) + 1

    return {
        "version": DATASET_VERSION,
        "description": DATASET_DESCRIPTION,
        "synthetic": True,
        "total_cases": len(EVALUATION_DATASET),
        "action_distribution": action_counts,
        "category_distribution": category_counts,
        "late_success_risk_distribution": risk_counts,
        "autonomous_cases": sum(1 for row in EVALUATION_DATASET if row["expected_autonomous_execution"]),
    }
