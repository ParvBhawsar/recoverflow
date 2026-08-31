from app.models.merchant_policy import MerchantPolicy


def apply_policy_to_runtime(policy: MerchantPolicy) -> None:
    """Apply the persisted merchant policy to the in-process recovery guard.

    RecoverFlow is currently a single-merchant buildathon prototype. The policy is
    persisted in Supabase, then applied as a runtime guard so every execution path
    uses the merchant's current limits without requiring a process restart.
    """

    from app.services import recovery_executor

    max_amount = int(policy.max_autonomous_amount)
    min_confidence = float(policy.min_autonomous_confidence)
    max_attempts = int(policy.max_recovery_attempts)
    allow_create = bool(policy.allow_create_recovery_link)

    def merchant_policy_guard(case):
        if case.status in {
            "RECOVERED",
            "ORIGINAL_PAYMENT_CAPTURED",
            "STOPPED",
            "PROTECTION_ATTENTION_REQUIRED",
            "DUPLICATE_COLLECTION_DETECTED",
        }:
            return recovery_executor.GuardResult(
                False,
                f"Case is already terminal: {case.status}.",
            )

        if case.recommended_action != "CREATE_RECOVERY_LINK":
            return recovery_executor.GuardResult(
                False,
                f"Policy did not approve autonomous recovery link creation: {case.recommended_action}.",
            )

        if not allow_create:
            return recovery_executor.GuardResult(
                False,
                "Merchant policy has disabled autonomous recovery-link creation.",
            )

        if case.amount > max_amount:
            return recovery_executor.GuardResult(
                False,
                f"Amount exceeds merchant autonomous limit of ₹{max_amount / 100:,.2f}.",
            )

        if (case.confidence or 0.0) < min_confidence:
            return recovery_executor.GuardResult(
                False,
                f"AI confidence is below merchant threshold of {min_confidence:.0%}.",
            )

        if case.attempt_count >= max_attempts:
            return recovery_executor.GuardResult(
                False,
                f"Merchant maximum of {max_attempts} autonomous recovery attempt(s) reached.",
            )

        return recovery_executor.GuardResult(
            True,
            "Merchant-configured bounded recovery policy approved execution.",
        )

    # create_recovery_link resolves this module global at call time.
    recovery_executor.policy_guard = merchant_policy_guard
    recovery_executor.MAX_AUTONOMOUS_AMOUNT = max_amount
    recovery_executor.MIN_AUTONOMOUS_CONFIDENCE = min_confidence
    recovery_executor.MAX_RECOVERY_ATTEMPTS = max_attempts

    # recovery.py imported policy_guard by value, so keep the inspector/simulator
    # trace aligned with the executor's live guard too.
    try:
        from app.api import recovery as recovery_api

        recovery_api.policy_guard = merchant_policy_guard
    except Exception:
        # Safe during unusual import-order situations; execution remains protected.
        pass
