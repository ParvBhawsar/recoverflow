from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.merchant_policy import MerchantPolicy


DEFAULT_POLICY_ID = 1


@dataclass(frozen=True)
class PolicySnapshot:
    max_autonomous_amount: int
    min_autonomous_confidence: float
    max_recovery_attempts: int
    allow_create_recovery_link: bool
    allow_wait_and_verify: bool
    allow_escalate: bool
    duplicate_charge_protection_enabled: bool


def get_or_create_policy(db: Session) -> MerchantPolicy:
    policy = db.query(MerchantPolicy).filter(MerchantPolicy.id == DEFAULT_POLICY_ID).first()
    if policy:
        return policy

    policy = MerchantPolicy(id=DEFAULT_POLICY_ID)
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


def snapshot(policy: MerchantPolicy) -> PolicySnapshot:
    return PolicySnapshot(
        max_autonomous_amount=int(policy.max_autonomous_amount),
        min_autonomous_confidence=float(policy.min_autonomous_confidence),
        max_recovery_attempts=int(policy.max_recovery_attempts),
        allow_create_recovery_link=bool(policy.allow_create_recovery_link),
        allow_wait_and_verify=bool(policy.allow_wait_and_verify),
        allow_escalate=bool(policy.allow_escalate),
        duplicate_charge_protection_enabled=bool(policy.duplicate_charge_protection_enabled),
    )


def policy_payload(policy: MerchantPolicy) -> dict:
    return {
        "id": policy.id,
        "max_autonomous_amount": policy.max_autonomous_amount,
        "max_autonomous_amount_inr": round(policy.max_autonomous_amount / 100, 2),
        "min_autonomous_confidence": policy.min_autonomous_confidence,
        "max_recovery_attempts": policy.max_recovery_attempts,
        "allowed_actions": {
            "CREATE_RECOVERY_LINK": policy.allow_create_recovery_link,
            "WAIT_AND_VERIFY": policy.allow_wait_and_verify,
            "ESCALATE": policy.allow_escalate,
        },
        "duplicate_charge_protection_enabled": policy.duplicate_charge_protection_enabled,
        "updated_at": policy.updated_at,
    }
