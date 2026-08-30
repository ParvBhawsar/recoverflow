import hashlib
import hmac
import json
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.payment import Payment
from app.models.webhook_event import WebhookEvent


router = APIRouter()


def verify_webhook_signature(
    body: bytes,
    received_signature: str,
) -> bool:
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")

    if not webhook_secret:
        raise RuntimeError("RAZORPAY_WEBHOOK_SECRET is not configured")

    expected_signature = hmac.new(
        webhook_secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(
        expected_signature,
        received_signature,
    )


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(...),
    x_razorpay_event_id: str = Header(...),
    db: Session = Depends(get_db),
):
    # IMPORTANT:
    # Signature verification must use the RAW request body.
    raw_body = await request.body()

    if not verify_webhook_signature(
        raw_body,
        x_razorpay_signature,
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid Razorpay webhook signature",
        )

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON payload",
        )

    # Razorpay can send the same event more than once.
    existing_event = (
        db.query(WebhookEvent)
        .filter(
            WebhookEvent.event_id == x_razorpay_event_id
        )
        .first()
    )

    if existing_event:
        return {
            "status": "duplicate",
            "event_id": x_razorpay_event_id,
        }

    event_type = payload.get("event", "unknown")

    webhook_event = WebhookEvent(
        event_id=x_razorpay_event_id,
        event_type=event_type,
        payload=payload,
        processed=False,
    )

    db.add(webhook_event)

    # First RecoverFlow business event:
    # Store failed Razorpay payments.
    if event_type == "payment.failed":

        payment_entity = (
            payload
            .get("payload", {})
            .get("payment", {})
            .get("entity", {})
        )

        razorpay_payment_id = payment_entity.get("id")

        if razorpay_payment_id:

            payment = (
                db.query(Payment)
                .filter(
                    Payment.razorpay_payment_id
                    == razorpay_payment_id
                )
                .first()
            )

            if not payment:
                payment = Payment(
                    razorpay_payment_id=razorpay_payment_id,
                    amount=payment_entity.get("amount", 0),
                    currency=payment_entity.get(
                        "currency",
                        "INR",
                    ),
                    status=payment_entity.get(
                        "status",
                        "failed",
                    ),
                    method=payment_entity.get("method"),
                    error_code=payment_entity.get(
                        "error_code"
                    ),
                    error_source=payment_entity.get(
                        "error_source"
                    ),
                    error_step=payment_entity.get(
                        "error_step"
                    ),
                    error_reason=payment_entity.get(
                        "error_reason"
                    ),
                )

                db.add(payment)

        webhook_event.processed = True

    db.commit()

    return {
        "status": "received",
        "event_id": x_razorpay_event_id,
        "event_type": event_type,
    }