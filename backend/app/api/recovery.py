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
    stop_recovery_for_original_success,
)


router = APIRouter()

NO_LONGER_AT_RISK_STATUSES = {
    "RECOVERED",
    "ORIGINAL_PAYMENT_CAPTURED",
    "STOPPED",
    "PROTECTION_ATTENTION_REQUIRED",
    "DUPLICATE_COLLECTION_DETECTED",
}

DEMO_SCENARIOS = {
    "incorrect_otp": {
        "name": "Incorrect OTP",
        "category": "customer_fixable",
        "description": "Customer entered the wrong OTP during card authentication.",
        "amount": 499900,
        "method": "card",
        "error_code": "BAD_REQUEST_ERROR",
        "error_source": "customer",
        "error_step": "payment_authentication",
        "error_reason": "incorrect_otp",
        "expected_behavior": "CREATE_RECOVERY_LINK",
        "why_it_matters": "Low-risk customer-fixable failures are good candidates for bounded recovery.",
    },
    "insufficient_funds": {
        "name": "Insufficient Funds",
        "category": "customer_fixable",
        "description": "Issuer declined the transaction because the account had insufficient balance.",
        "amount": 129900,
        "method": "card",
        "error_code": "BAD_REQUEST_ERROR",
        "error_source": "customer",
        "error_step": "payment_authorization",
        "error_reason": "insufficient_funds",
        "expected_behavior": "CREATE_RECOVERY_LINK",
        "why_it_matters": "The customer may be able to retry later or use another payment method.",
    },
    "gateway_timeout": {
        "name": "Gateway Timeout",
        "category": "transient",
        "description": "The payment gateway timed out while the transaction outcome was still uncertain.",
        "amount": 799900,
        "method": "card",
        "error_code": "GATEWAY_ERROR",
        "error_source": "gateway",
        "error_step": "payment_processing",
        "error_reason": "gateway_timeout",
        "expected_behavior": "WAIT_AND_VERIFY",
        "why_it_matters": "Blind retries can double-charge when a delayed success arrives after a timeout.",
    },
    "bank_processing_error": {
        "name": "Bank Processing Error",
        "category": "transient",
        "description": "The issuing bank returned a temporary processing failure.",
        "amount": 189900,
        "method": "netbanking",
        "error_code": "SERVER_ERROR",
        "error_source": "bank",
        "error_step": "payment_processing",
        "error_reason": "bank_processing_error",
        "expected_behavior": "WAIT_AND_VERIFY",
        "why_it_matters": "A temporary bank failure should be observed before launching another collection path.",
    },
    "high_value_auth_failure": {
        "name": "High-Value Authentication Failure",
        "category": "high_value",
        "description": "A ₹75,000 card payment failed during authentication.",
        "amount": 7500000,
        "method": "card",
        "error_code": "BAD_REQUEST_ERROR",
        "error_source": "customer",
        "error_step": "payment_authentication",
        "error_reason": "incorrect_otp",
        "expected_behavior": "ESCALATE",
        "why_it_matters": "Hard policy must override autonomous AI recovery above the merchant value threshold.",
    },
    "ambiguous_failure": {
        "name": "Ambiguous Failure",
        "category": "ambiguous",
        "description": "The payment failed without enough diagnostic context to safely automate recovery.",
        "amount": 349900,
        "method": "card",
        "error_code": "UNKNOWN_ERROR",
        "error_source": "unknown",
        "error_step": "unknown",
        "error_reason": "unknown",
        "expected_behavior": "ESCALATE",
        "why_it_matters": "Uncertain cases should prefer human review over confident-looking automation.",
    },
}


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
        "late_success_protected": case.status == "ORIGINAL_PAYMENT_CAPTURED",
        "created_at": case.created_at,
        "updated_at": case.updated_at,
    }


def _create_demo_case(db: Session, scenario_id: str) -> dict:
    scenario = DEMO_SCENARIOS.get(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Unknown demo scenario")

    suffix = uuid.uuid4().hex[:10]
    payment_id = f"pay_demo_{scenario_id[:10]}_{suffix}"
    payment_data = {
        "id": payment_id,
        "amount": scenario["amount"],
        "currency": "INR",
        "status": "failed",
        "method": scenario["method"],
        "error_code": scenario["error_code"],
        "error_source": scenario["error_source"],
        "error_step": scenario["error_step"],
        "error_reason": scenario["error_reason"],
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
    guard = policy_guard(recovery_case)

    db.add(
        AuditLog(
            recovery_case_id=recovery_case.id,
            event_type="DEMO_PAYMENT_FAILED",
            message=f"Simulation scenario '{scenario['name']}' created from the dashboard.",
            details={
                "razorpay_payment_id": payment_id,
                "scenario_id": scenario_id,
                "scenario_category": scenario["category"],
                "expected_behavior": scenario["expected_behavior"],
                "planner_source": plan.planner_source,
                "planner_model": plan.planner_model,
            },
        )
    )
    db.commit()

    return {
        "status": "created",
        "case_id": recovery_case.id,
        "razorpay_payment_id": payment_id,
        "scenario_id": scenario_id,
        "scenario_name": scenario["name"],
        "expected_behavior": scenario["expected_behavior"],
        "planner_source": plan.planner_source,
        "planner_model": plan.planner_model,
        "ai_action": plan.recommended_action,
        "confidence": plan.confidence,
        "policy_guard_allowed": guard.allowed,
        "policy_guard_reason": guard.reason,
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

    revenue_at_risk = (
        db.query(func.coalesce(func.sum(RecoveryCase.amount), 0))
        .filter(RecoveryCase.status.notin_(NO_LONGER_AT_RISK_STATUSES))
        .scalar()
    )
    total_case_value = db.query(func.coalesce(func.sum(RecoveryCase.amount), 0)).scalar()
    total_recovered = db.query(func.coalesce(func.sum(RecoveryCase.recovered_amount), 0)).scalar()
    protected_value = (
        db.query(func.coalesce(func.sum(RecoveryCase.amount), 0))
        .filter(RecoveryCase.status == "ORIGINAL_PAYMENT_CAPTURED")
        .scalar()
    )
    protected_cases = (
        db.query(func.count(RecoveryCase.id))
        .filter(RecoveryCase.status == "ORIGINAL_PAYMENT_CAPTURED")
        .scalar()
    )
    attention_cases = (
        db.query(func.count(RecoveryCase.id))
        .filter(RecoveryCase.status == "PROTECTION_ATTENTION_REQUIRED")
        .scalar()
    )
    active_cases = (
        db.query(func.count(RecoveryCase.id))
        .filter(RecoveryCase.status.notin_(NO_LONGER_AT_RISK_STATUSES))
        .scalar()
    )
    total_cases = db.query(func.count(RecoveryCase.id)).scalar()
    ai_plans = db.query(func.count(AIPlan.id)).scalar()
    model_plans = (
        db.query(func.count(AIPlan.id))
        .filter(AIPlan.planner_source.in_(["openai", "gemini"]))
        .scalar()
    )

    recovery_rate = 0.0
    if total_case_value:
        recovery_rate = round((total_recovered / total_case_value) * 100, 2)

    return {
        "revenue_at_risk": revenue_at_risk,
        "recovered_revenue": total_recovered,
        "active_cases": active_cases,
        "total_cases": total_cases,
        "recovery_rate": recovery_rate,
        "ai_plans": ai_plans,
        "model_plans": model_plans,
        "late_success_protected_cases": protected_cases,
        "late_success_protected_value": protected_value,
        "protection_attention_cases": attention_cases,
    }


@router.get("/demo/scenarios")
def list_demo_scenarios():
    return [
        {
            "id": scenario_id,
            "name": scenario["name"],
            "category": scenario["category"],
            "description": scenario["description"],
            "amount": scenario["amount"],
            "currency": "INR",
            "method": scenario["method"],
            "expected_behavior": scenario["expected_behavior"],
            "why_it_matters": scenario["why_it_matters"],
        }
        for scenario_id, scenario in DEMO_SCENARIOS.items()
    ]


@router.post("/demo/failure")
def create_demo_failure(db: Session = Depends(get_db)):
    return _create_demo_case(db, "incorrect_otp")


@router.post("/demo/failure/{scenario_id}")
def create_scenario_failure(scenario_id: str, db: Session = Depends(get_db)):
    return _create_demo_case(db, scenario_id)


@router.post("/cases/{case_id}/demo/original-success")
def simulate_original_payment_success(case_id: int, db: Session = Depends(get_db)):
    """Demo-only late-success event for a synthetic payment.

    Real production late-success handling is driven by signed Razorpay
    payment.authorized/payment.captured webhooks. This endpoint exists only so the
    localhost demo can prove the protection behavior without a public webhook URL.
    """

    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Recovery case not found")

    if not case.razorpay_payment_id.startswith("pay_demo_"):
        raise HTTPException(
            status_code=409,
            detail="Late-success simulation is restricted to synthetic demo payments.",
        )

    if case.status in {"RECOVERED", "DUPLICATE_COLLECTION_DETECTED"}:
        raise HTTPException(
            status_code=409,
            detail=(
                "This recovery has already been collected. Create a fresh demo case and "
                "simulate original success before paying the recovery link."
            ),
        )

    payment = (
        db.query(Payment)
        .filter(Payment.razorpay_payment_id == case.razorpay_payment_id)
        .first()
    )
    if payment:
        payment.status = "captured"

    result = stop_recovery_for_original_success(
        db,
        case,
        source_event="demo.payment.captured",
    )

    return {
        "status": "late_success_processed",
        "case_id": case.id,
        "case_status": result.case_status,
        "cancelled_recovery_links": result.cancelled_links,
        "already_stopped": result.already_stopped,
        "needs_attention": result.needs_attention,
        "reason": result.reason,
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
                "details": action.details,
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
