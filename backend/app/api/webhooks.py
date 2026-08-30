import hashlib
import hmac
import json
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.payment import Payment
from app.models.recovery_action import RecoveryAction
from app.models.recovery_case import RecoveryCase
from app.models.webhook_event import WebhookEvent
from app.services.ai_planner import apply_ai_plan


router = APIRouter()


def verify_webhook_signature(body: bytes, received_signature: str) -> bool:
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    if not webhook_secret:
        raise RuntimeError("RAZORPAY_WEBHOOK_SECRET is not configured")

    expected_signature = hmac.new(
        webhook_secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected_signature, received_signature)


def extract_payment_entity(payload: dict) -> dict:
    return payload.get("payload", {}).get("payment", {}).get("entity", {})


def extract_payment_link_entity(payload: dict) -> dict:
    return payload.get("payload", {}).get("payment_link", {}).get("entity", {})


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(...),
    x_razorpay_event_id: str = Header(...),
    db: Session = Depends(get_db),
):
    raw_body = await request.body()

    if not verify_webhook_signature(raw_body, x_razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid Razorpay webhook signature")

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    existing_event = (
        db.query(WebhookEvent)
        .filter(WebhookEvent.event_id == x_razorpay_event_id)
        .first()
    )
    if existing_event:
        return {"status": "duplicate", "event_id": x_razorpay_event_id}

    event_type = payload.get("event", "unknown")
    webhook_event = WebhookEvent(
        event_id=x_razorpay_event_id,
        event_type=event_type,
        payload=payload,
        processed=False,
    )
    db.add(webhook_event)

    payment_entity = extract_payment_entity(payload)
    razorpay_payment_id = payment_entity.get("id")

    if event_type == "payment.failed" and razorpay_payment_id:
        payment = (
            db.query(Payment)
            .filter(Payment.razorpay_payment_id == razorpay_payment_id)
            .first()
        )

        if not payment:
            payment = Payment(
                razorpay_payment_id=razorpay_payment_id,
                amount=payment_entity.get("amount", 0),
                currency=payment_entity.get("currency", "INR"),
                status=payment_entity.get("status", "failed"),
                method=payment_entity.get("method"),
                error_code=payment_entity.get("error_code"),
                error_source=payment_entity.get("error_source"),
                error_step=payment_entity.get("error_step"),
                error_reason=payment_entity.get("error_reason"),
            )
            db.add(payment)
        else:
            payment.status = payment_entity.get("status", "failed")
            payment.error_code = payment_entity.get("error_code")
            payment.error_source = payment_entity.get("error_source")
            payment.error_step = payment_entity.get("error_step")
            payment.error_reason = payment_entity.get("error_reason")

        recovery_case = (
            db.query(RecoveryCase)
            .filter(RecoveryCase.razorpay_payment_id == razorpay_payment_id)
            .first()
        )

        if not recovery_case:
            recovery_case = RecoveryCase(
                razorpay_payment_id=razorpay_payment_id,
                amount=payment_entity.get("amount", 0),
                currency=payment_entity.get("currency", "INR"),
                status="ACTION_PROPOSED",
                diagnosis="planning",
                confidence=0.0,
                recommended_action="ESCALATE",
                reason="Recovery plan is being generated.",
            )
            db.add(recovery_case)
            db.flush()

            plan = apply_ai_plan(db, recovery_case, payment_entity)
            db.add(
                AuditLog(
                    recovery_case_id=recovery_case.id,
                    event_type="CASE_CREATED",
                    message="Failed payment created a RecoverFlow recovery case.",
                    details={
                        "payment_id": razorpay_payment_id,
                        "recommended_action": plan.recommended_action,
                        "confidence": plan.confidence,
                        "planner_source": plan.planner_source,
                        "planner_model": plan.planner_model,
                    },
                )
            )

        webhook_event.processed = True

    elif event_type in {"payment.authorized", "payment.captured"} and razorpay_payment_id:
        payment = (
            db.query(Payment)
            .filter(Payment.razorpay_payment_id == razorpay_payment_id)
            .first()
        )
        if payment:
            payment.status = payment_entity.get("status", event_type.split(".")[-1])

        recovery_case = (
            db.query(RecoveryCase)
            .filter(RecoveryCase.razorpay_payment_id == razorpay_payment_id)
            .first()
        )
        if recovery_case:
            recovery_case.status = "ORIGINAL_PAYMENT_CAPTURED"
            recovery_case.recommended_action = "STOP"
            recovery_case.reason = (
                "Original payment later succeeded; recovery stopped to prevent duplicate collection."
            )

            active_actions = (
                db.query(RecoveryAction)
                .filter(
                    RecoveryAction.recovery_case_id == recovery_case.id,
                    RecoveryAction.status.in_(["EXECUTING", "CREATED"]),
                )
                .all()
            )
            for action in active_actions:
                action.status = "STOPPED"

            db.add(
                AuditLog(
                    recovery_case_id=recovery_case.id,
                    event_type="RECOVERY_STOPPED",
                    message="Original payment succeeded; recovery stopped to prevent duplicate collection.",
                    details={"event_type": event_type},
                )
            )

        webhook_event.processed = True

    elif event_type == "payment_link.paid":
        payment_link_entity = extract_payment_link_entity(payload)
        payment_link_id = payment_link_entity.get("id")

        if payment_link_id:
            action = (
                db.query(RecoveryAction)
                .filter(RecoveryAction.external_id == payment_link_id)
                .first()
            )

            if action:
                recovery_case = (
                    db.query(RecoveryCase)
                    .filter(RecoveryCase.id == action.recovery_case_id)
                    .first()
                )

                if recovery_case and recovery_case.status not in {
                    "ORIGINAL_PAYMENT_CAPTURED",
                    "STOPPED",
                }:
                    action.status = "PAID"
                    action.recovery_payment_id = razorpay_payment_id
                    recovery_case.status = "RECOVERED"
                    recovery_case.recovered_amount = recovery_case.amount
                    recovery_case.reason = "Revenue successfully recovered through Razorpay Payment Link."

                    db.add(
                        AuditLog(
                            recovery_case_id=recovery_case.id,
                            event_type="REVENUE_RECOVERED",
                            message="Recovery Payment Link was paid successfully.",
                            details={
                                "payment_link_id": payment_link_id,
                                "recovery_payment_id": razorpay_payment_id,
                                "recovered_amount": recovery_case.amount,
                            },
                        )
                    )

                webhook_event.processed = True

    db.commit()

    return {
        "status": "received",
        "event_id": x_razorpay_event_id,
        "event_type": event_type,
    }
