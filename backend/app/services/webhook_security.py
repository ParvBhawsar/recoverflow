import hashlib
import hmac
import os


def webhook_secret() -> str:
    secret = (os.getenv("RAZORPAY_WEBHOOK_SECRET") or "").strip()
    if not secret:
        raise RuntimeError("RAZORPAY_WEBHOOK_SECRET is not configured")
    return secret


def sign_webhook_body(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def verify_webhook_signature(body: bytes, received_signature: str) -> bool:
    expected_signature = sign_webhook_body(body, webhook_secret())
    return hmac.compare_digest(expected_signature, received_signature)
