import hashlib
import hmac

import pytest

from app.services.webhook_security import sign_webhook_body, verify_webhook_signature


def test_sign_webhook_body_matches_hmac_sha256():
    body = b'{"event":"payment.failed"}'
    secret = "test_webhook_secret"
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    assert sign_webhook_body(body, secret) == expected


def test_verify_webhook_signature_accepts_valid_signature(monkeypatch):
    body = b'{"event":"payment.captured"}'
    secret = "test_webhook_secret"
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", secret)
    signature = sign_webhook_body(body, secret)
    assert verify_webhook_signature(body, signature) is True


def test_verify_webhook_signature_rejects_invalid_signature(monkeypatch):
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "test_webhook_secret")
    assert verify_webhook_signature(b"payload", "not-a-valid-signature") is False


def test_verify_webhook_signature_requires_secret(monkeypatch):
    monkeypatch.delenv("RAZORPAY_WEBHOOK_SECRET", raising=False)
    with pytest.raises(RuntimeError, match="RAZORPAY_WEBHOOK_SECRET"):
        verify_webhook_signature(b"payload", "signature")
