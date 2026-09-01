import json

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models.audit_log import AuditLog
from app.models.payment import Payment
from app.models.recovery_action import RecoveryAction
from app.models.recovery_case import RecoveryCase
from app.models.webhook_event import WebhookEvent
from app.services.ai_planner import apply_ai_plan
from app.services.recovery_executor import stop_recovery_for_original_success
from app.services.webhook_security import verify_webhook_signature


router = APIRouter()


def extract_payment_entity(payload: dict) -> dict:
    return payload.get("payload", {}).get("payment", {}).get("entity", {})


def extract_payment_link_entity(payload: dict) -> dict:
    return payload.get("payload", {}).get("payment_link", {}).get("entity", {})


def _process_payment_failed(db: Session, payload: dict) -> None:
    payment_entity = extract_payment_entity(payload)
    razorpay_payment_id = payment_entity.get("id")
    if not razorpay_payment_id:
        return

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

    if recovery_case:
        return

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


def _process_original_payment_success(db: Session, payload: dict, event_type: str) -> None:
    payment_entity = extract_payment_entity(payload)
    razorpay_payment_id = payment_entity.get("id")
    if not razorpay_payment_id:
        return

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
        # This can call the Razorpay API to cancel an open recovery link, so it must
        # never run on the request/acknowledgement path.
        stop_recovery_for_original_success(
            db,
            recovery_case,
            source_event=event_type,
        )


def _process_payment_link_paid(db: Session, payload: dict) -> None:
    payment_entity = extract_payment_entity(payload)
    razorpay_payment_id = payment_entity.get("id")
    payment_link_entity = extract_payment_link_entity(payload)
    payment_link_id = payment_link_entity.get("id")
    if not payment_link_id:
        return

    action = (
        db.query(RecoveryAction)
        .filter(RecoveryAction.external_id == payment_link_id)
        .first()
    )
    if not action:
        return

    recovery_case = (
        db.query(RecoveryCase)
        .filter(RecoveryCase.id == action.recovery_case_id)
        .first()
    )
    if not recovery_case or recovery_case.status in {
        "ORIGINAL_PAYMENT_CAPTURED",
        "STOPPED",
        "PROTECTION_ATTENTION_REQUIRED",
    }:
        return

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


def process_webhook_event(event_id: str) -> None:
    """Process a persisted Razorpay event after the HTTP acknowledgement is sent.

    Razorpay expects a 2xx response quickly. AI planning and Razorpay API calls can
    take several seconds, so all business processing happens in this background task
    with its own database session.
    """

    db = SessionLocal()
    try:
        webhook_event = (
            db.query(WebhookEvent)
            .filter(WebhookEvent.event_id == event_id)
            .first()
        )
        if not webhook_event or webhook_event.processed:
            return

        payload = webhook_event.payload
        event_type = webhook_event.event_type

        if event_type == "payment.failed":
            _process_payment_failed(db, payload)
        elif event_type in {"payment.authorized", "payment.captured"}:
            _process_original_payment_success(db, payload, event_type)
        elif event_type == "payment_link.paid":
            _process_payment_link_paid(db, payload)

        webhook_event.processed = True
        db.commit()
    except Exception as exc:
        db.rollback()
        try:
            db.add(
                AuditLog(
                    recovery_case_id=None,
                    event_type="WEBHOOK_PROCESSING_FAILED",
                    message="A persisted Razorpay webhook could not be processed.",
                    details={
                        "event_id": event_id,
                        "error": str(exc)[:1000],
                    },
                )
            )
            db.commit()
        except Exception:
            db.rollback()
        # Keep the WebhookEvent as processed=False so the failure is visible and can
        # be retried/replayed without losing idempotency state.
    finally:
        db.close()


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
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
        return {
            "status": "duplicate",
            "event_id": x_razorpay_event_id,
            "processed": existing_event.processed,
        }

    event_type = payload.get("event", "unknown")
    webhook_event = WebhookEvent(
        event_id=x_razorpay_event_id,
        event_type=event_type,
        payload=payload,
        processed=False,
    )
    db.add(webhook_event)

    try:
        # Persist the unique event ID before acknowledging. This makes retry handling
        # deterministic even if Razorpay delivers the same event again immediately.
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"status": "duplicate", "event_id": x_razorpay_event_id}

    background_tasks.add_task(process_webhook_event, x_razorpay_event_id)

    return {
        "status": "accepted",
        "event_id": x_razorpay_event_id,
        "event_type": event_type,
        "processing": "background",
    }
