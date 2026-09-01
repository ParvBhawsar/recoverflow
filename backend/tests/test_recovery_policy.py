from app.services.recovery_policy import decide_recovery_action


def test_customer_fixable_failure_creates_recovery_link():
    decision = decide_recovery_action(
        {
            "amount": 499900,
            "error_source": "customer",
            "error_reason": "incorrect_otp",
        }
    )
    assert decision.recommended_action == "CREATE_RECOVERY_LINK"


def test_exact_autonomous_limit_remains_eligible():
    decision = decide_recovery_action(
        {
            "amount": 2_500_000,
            "error_source": "customer",
            "error_reason": "incorrect_otp",
        }
    )
    assert decision.recommended_action == "CREATE_RECOVERY_LINK"


def test_above_autonomous_limit_escalates_customer_failure():
    decision = decide_recovery_action(
        {
            "amount": 2_500_100,
            "error_source": "customer",
            "error_reason": "incorrect_otp",
        }
    )
    assert decision.recommended_action == "ESCALATE"


def test_transient_uncertainty_takes_priority_over_high_value():
    decision = decide_recovery_action(
        {
            "amount": 7_500_000,
            "error_source": "gateway",
            "error_reason": "gateway_timeout",
        }
    )
    assert decision.recommended_action == "WAIT_AND_VERIFY"


def test_unknown_failure_escalates():
    decision = decide_recovery_action(
        {
            "amount": 99900,
            "error_source": "unknown",
            "error_reason": "unknown",
        }
    )
    assert decision.recommended_action == "ESCALATE"
