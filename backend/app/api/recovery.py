import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ai_plan import AIPlan
from app.models.audit_log import AuditLog
from app.models.payment import Payment
from app.models.recovery_action import RecoveryAction
from app.models.recovery_case import RecoveryCase
from app.services.ai_planner import apply_ai_plan
from app.services.recovery_executor import (
    create_recovery_link,
    policy_guard,
    reconcile_recovery_case,
)


router = APIRouter()


def _reconcile_waiting_cases(db: Session) -> None:
    waiting_cases = (
        db.query(RecoveryCase)
        .filter(RecoveryCase.status == "WAITING_FOR_CUSTOMER")
        .limit(50)
        .all()
    )
    for case in waiting_cases:
        try:
            reconcile_recovery_case(db, case)
        except Exception:
            db.rollback()


def _plan_for_case(db: Session, case_id: int) -> AIPlan | None:
    return db.query(AIPlan).filter(AIPlan.recovery_case_id == case_id).first()


def _case_payload(case: RecoveryCase, plan: AIPlan | None = None) -> dict:
    return {
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
        "planner_source": plan.planner_source if plan else None,
        "planner_model": plan.planner_model if plan else None,
        "delay_minutes": plan.delay_minutes if plan else None,
        "customer_tone": plan.customer_tone if plan else None,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
    }


@router.get("/cases")
def list_recovery_cases(db: Session = Depends(get_db)):
    _reconcile_waiting_cases(db)
    cases = (
        db.query(RecoveryCase)
        .order_by(RecoveryCase.created_at.desc())
        .limit(100)
        .all()
    )
    plan_map = {
        plan.recovery_case_id: plan
        for plan in db.query(AIPlan)
        .filter(AIPlan.recovery_case_id.in_([case.id for case in cases] or [-1]))
        .all()
    }
    return [_case_payload(case, plan_map.get(case.id)) for case in cases]


@router.get("/summary")
def recovery_summary(db: Session = Depends(get_db)):
    _reconcile_waiting_cases(db)
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
    ai_plans = db.query(func.count(AIPlan.id)).scalar()
    openai_plans = (
        db.query(func.count(AIPlan.id))
        .filter(AIPlan.planner_source == "openai")
        .scalar()
    )

    recovery_rate = 0.0
    if total_at_risk:
        recovery_rate = round((total_recovered / total_at_risk) * 100, 2)

    return {
        "revenue_at_risk": total_at_risk,
        "recovered_revenue": total_recovered,
        "active_cases": active_cases,
        "total_cases": total_cases,
        "recovery_rate": recovery_rate,
        "ai_plans": ai_plans,
        "openai_plans": openai_plans,
    }


@router.post("/demo/failure")
def create_demo_failure(db: Session = Depends(get_db)):
    suffix = uuid.uuid4().hex[:10]
    payment_id = f"pay_demo_{suffix}"
    payment_data = {
        "id": payment_id,
        "amount": 499900,
        "currency": "INR",
        "status": "failed",
        "method": "card",
        "error_code": "BAD_REQUEST_ERROR",
        "error_source": "customer",
        "error_step": "payment_authentication",
        "error_reason": "incorrect_otp",
    }

    payment = Payment(
        razorpay_payment_id=payment_id,
        amount=payment_data["amount"],
        currency=payment_data["currency"],
        status=payment_data["status"],
        method=payment_data["method"],
        error_code=payment_data["error_code"],
        error_source=payment_data["error_source"],
        error_step=payment_data["error_step"],
        error_reason=payment_data["error_reason"],
    )
    db.add(payment)

    recovery_case = RecoveryCase(
        razorpay_payment_id=payment_id,
        amount=payment_data["amount"],
        currency=payment_data["currency"],
        status="ACTION_PROPOSED",
        diagnosis="planning",
        confidence=0.0,
        recommended_action="ESCALATE",
        reason="Recovery plan is being generated.",
    )
    db.add(recovery_case)
    db.flush()

    plan = apply_ai_plan(db, recovery_case, payment_data)
    db.add(
        AuditLog(
            recovery_case_id=recovery_case.id,
            event_type="DEMO_PAYMENT_FAILED",
            message="Demo failed payment created from dashboard.",
            details={
                "razorpay_payment_id": payment_id,
                "planner_source": plan.planner_source,
            },
        )
    )
    db.commit()

    return {
        "status": "created",
        "case_id": recovery_case.id,
        "razorpay_payment_id": payment_id,
        "planner_source": plan.planner_source,
        "planner_model": plan.planner_model,
    }


@router.get("/cases/{case_id}")
def get_recovery_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Recovery case not found")

    if case.status == "WAITING_FOR_CUSTOMER":
        try:
            reconcile_recovery_case(db, case)
            db.refresh(case)
        except Exception:
            db.rollback()
            case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()

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
    plan = _plan_for_case(db, case.id)
    guard = policy_guard(case)

    return {
        "case": _case_payload(case, plan),
        "ai_plan": None if not plan else {
            "diagnosis": plan.diagnosis,
            "confidence": plan.confidence,
            "recommended_action": plan.recommended_action,
            "delay_minutes": plan.delay_minutes,
            "reason": plan.reason,
            "customer_tone": plan.customer_tone,
            "planner_source": plan.planner_source,
            "planner_model": plan.planner_model,
            "provider_error": plan.provider_error,
        },
        "policy_guard": {
            "allowed": guard.allowed,
            "reason": guard.reason,
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
