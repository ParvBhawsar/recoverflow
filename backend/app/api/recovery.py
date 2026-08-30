from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.recovery_case import RecoveryCase


router = APIRouter()


@router.get("/cases")
def list_recovery_cases(db: Session = Depends(get_db)):
    cases = (
        db.query(RecoveryCase)
        .order_by(RecoveryCase.created_at.desc())
        .limit(100)
        .all()
    )

    return [
        {
            "id": case.id,
            "razorpay_payment_id": case.razorpay_payment_id,
            "amount": case.amount,
            "currency": case.currency,
            "status": case.status,
            "diagnosis": case.diagnosis,
            "confidence": case.confidence,
            "recommended_action": case.recommended_action,
            "reason": case.reason,
            "attempt_count": case.attempt_count,
            "recovered_amount": case.recovered_amount,
            "created_at": case.created_at,
            "updated_at": case.updated_at,
        }
        for case in cases
    ]


@router.get("/summary")
def recovery_summary(db: Session = Depends(get_db)):
    total_at_risk = db.query(func.coalesce(func.sum(RecoveryCase.amount), 0)).scalar()
    total_recovered = db.query(func.coalesce(func.sum(RecoveryCase.recovered_amount), 0)).scalar()
    active_cases = (
        db.query(func.count(RecoveryCase.id))
        .filter(
            RecoveryCase.status.notin_(
                ["RECOVERED", "ORIGINAL_PAYMENT_CAPTURED", "STOPPED"]
            )
        )
        .scalar()
    )
    total_cases = db.query(func.count(RecoveryCase.id)).scalar()

    recovery_rate = 0.0
    if total_at_risk:
        recovery_rate = round((total_recovered / total_at_risk) * 100, 2)

    return {
        "revenue_at_risk": total_at_risk,
        "recovered_revenue": total_recovered,
        "active_cases": active_cases,
        "total_cases": total_cases,
        "recovery_rate": recovery_rate,
    }
