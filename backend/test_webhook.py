import hashlib
import hmac
import json
import os

import httpx
from dotenv import load_dotenv


load_dotenv()

secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")


payload = {
    "entity": "event",
    "event": "payment.failed",
    "contains": [
        "payment"
    ],
    "payload": {
        "payment": {
            "entity": {
                "id": "pay_recoverflow_test_001",
                "entity": "payment",
                "amount": 499900,
                "currency": "INR",
                "status": "failed",
                "method": "card",
                "error_code": "BAD_REQUEST_ERROR",
                "error_source": "bank",
                "error_step": "payment_authentication",
                "error_reason": "payment_failed"
            }
        }
    }
}


body = json.dumps(
    payload,
    separators=(",", ":"),
).encode("utf-8")


signature = hmac.new(
    secret.encode("utf-8"),
    body,
    hashlib.sha256,
).hexdigest()


response = httpx.post(
    "http://127.0.0.1:8000/webhooks/razorpay",
    content=body,
    headers={
        "Content-Type": "application/json",
        "X-Razorpay-Signature": signature,
        "X-Razorpay-Event-Id": "evt_recoverflow_test_001",
    },
)


print(response.status_code)
print(response.json())