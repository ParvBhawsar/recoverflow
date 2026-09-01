"""Manual localhost smoke test for the Razorpay webhook endpoint.

Run only while the RecoverFlow backend is already running locally:
    python scripts/manual_webhook_test.py

This is intentionally outside pytest test discovery.
"""

import hashlib
import hmac
import json
import os
import time

import httpx
from dotenv import load_dotenv


load_dotenv()

secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
if not secret:
    raise RuntimeError("RAZORPAY_WEBHOOK_SECRET is not configured")

suffix = int(time.time())
payment_id = f"pay_recoverflow_test_{suffix}"
event_id = f"evt_recoverflow_test_{suffix}"

payload = {
    "entity": "event",
    "event": "payment.failed",
    "contains": ["payment"],
    "payload": {
        "payment": {
            "entity": {
                "id": payment_id,
                "entity": "payment",
                "amount": 499900,
                "currency": "INR",
                "status": "failed",
                "method": "card",
                "error_code": "BAD_REQUEST_ERROR",
                "error_source": "customer",
                "error_step": "payment_authentication",
                "error_reason": "incorrect_otp",
            }
        }
    },
}

body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
signature = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()

response = httpx.post(
    "http://127.0.0.1:8000/webhooks/razorpay",
    content=body,
    headers={
        "Content-Type": "application/json",
        "X-Razorpay-Signature": signature,
        "X-Razorpay-Event-Id": event_id,
    },
    timeout=10.0,
)

print("payment_id:", payment_id)
print("event_id:", event_id)
print("status_code:", response.status_code)
print("response:", response.json())
