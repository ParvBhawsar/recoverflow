from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog
from app.services.merchant_policy import get_or_create_policy, policy_payload
from app.services.policy_runtime import apply_policy_to_runtime


router = APIRouter()


class PolicyUpdate(BaseModel):
    max_autonomous_amount: int = Field(ge=0, le=100_000_000)
    min_autonomous_confidence: float = Field(ge=0.5, le=1.0)
    max_recovery_attempts: int = Field(ge=1, le=5)
    allow_create_recovery_link: bool = True
    allow_wait_and_verify: bool = True
    allow_escalate: bool = True


@router.get("")
def get_merchant_policy(db: Session = Depends(get_db)):
    policy = get_or_create_policy(db)
    apply_policy_to_runtime(policy)
    return policy_payload(policy)


@router.put("")
def update_merchant_policy(payload: PolicyUpdate, db: Session = Depends(get_db)):
    # WAIT_AND_VERIFY and ESCALATE are safety exits, not money-moving actions. They
    # remain mandatory so a merchant cannot configure the system into blind retry.
    if not payload.allow_wait_and_verify:
        raise HTTPException(
            status_code=422,
            detail="WAIT_AND_VERIFY is a mandatory safety action and cannot be disabled.",
        )
    if not payload.allow_escalate:
        raise HTTPException(
            status_code=422,
            detail="ESCALATE is a mandatory safety action and cannot be disabled.",
        )

    policy = get_or_create_policy(db)
    before = policy_payload(policy)

    policy.max_autonomous_amount = payload.max_autonomous_amount
    policy.min_autonomous_confidence = payload.min_autonomous_confidence
    policy.max_recovery_attempts = payload.max_recovery_attempts
    policy.allow_create_recovery_link = payload.allow_create_recovery_link
    policy.allow_wait_and_verify = True
    policy.allow_escalate = True
    policy.duplicate_charge_protection_enabled = True

    db.add(policy)
    db.flush()

    after = policy_payload(policy)
    db.add(
        AuditLog(
            recovery_case_id=None,
            event_type="MERCHANT_POLICY_UPDATED",
            message="Merchant recovery safety policy updated.",
            details={
                "before": before,
                "after": after,
                "mandatory_invariants": [
                    "WAIT_AND_VERIFY remains enabled",
                    "ESCALATE remains enabled",
                    "duplicate-charge protection remains enabled",
                ],
            },
        )
    )
    db.commit()
    db.refresh(policy)

    apply_policy_to_runtime(policy)
    return policy_payload(policy)


@router.post("/reset")
def reset_merchant_policy(db: Session = Depends(get_db)):
    policy = get_or_create_policy(db)

    policy.max_autonomous_amount = 2_500_000
    policy.min_autonomous_confidence = 0.75
    policy.max_recovery_attempts = 2
    policy.allow_create_recovery_link = True
    policy.allow_wait_and_verify = True
    policy.allow_escalate = True
    policy.duplicate_charge_protection_enabled = True

    db.add(policy)
    db.add(
        AuditLog(
            recovery_case_id=None,
            event_type="MERCHANT_POLICY_RESET",
            message="Merchant recovery safety policy reset to RecoverFlow defaults.",
            details={"policy": "default"},
        )
    )
    db.commit()
    db.refresh(policy)

    apply_policy_to_runtime(policy)
    return policy_payload(policy)
