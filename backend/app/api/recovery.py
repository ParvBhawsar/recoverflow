from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.recovery_action import RecoveryAction
from app.models.recovery_case import RecoveryCase
from app.services.recovery_executor import create_recovery_link, policy_guard


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


@router.get("/cases/{case_id}")
def get_recovery_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Recovery case not found")

    actions = (
        db.query(RecoveryAction)
        .filter(RecoveryAction.recovery_case_id == case.id)
        .order_by(RecoveryAction.created_at.desc())
        .all()
    )
    audit_logs = (
        db.query(AuditLog)
        .filter(AuditLog.recovery_case_id == case.id)
        .order_by(AuditLog.created_at.asc())
        .all()
    )

    return {
        "case": {
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
        },
        "policy_guard": {
            "allowed": policy_guard(case).allowed,
            "reason": policy_guard(case).reason,
        },
        "actions": [
            {
                "id": action.id,
                "action_type": action.action_type,
                "status": action.status,
                "external_id": action.external_id,
                "external_url": action.external_url,
                "recovery_payment_id": action.recovery_payment_id,
                "error_message": action.error_message,
                "created_at": action.created_at,
            }
            for action in actions
        ],
        "audit_logs": [
            {
                "id": log.id,
                "event_type": log.event_type,
                "message": log.message,
                "details": log.details,
                "created_at": log.created_at,
            }
            for log in audit_logs
        ],
    }


@router.post("/cases/{case_id}/execute")
def execute_recovery_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Recovery case not found")

    try:
        action = create_recovery_link(db, case)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Razorpay execution failed: {exc}") from exc

    return {
        "status": action.status,
        "action_id": action.id,
        "payment_link_id": action.external_id,
        "payment_link_url": action.external_url,
        "recovery_case_id": case.id,
    }
