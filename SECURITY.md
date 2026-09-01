# Security Policy

RecoverFlow is a buildathon prototype that uses **Razorpay Test Mode** only. It is not approved for live financial traffic.

## Secret handling

Real credentials must never be committed to Git.

Local secrets belong in:

```text
backend/.env
frontend/.env.local
```

Both are ignored by the repository.

Deployment secrets belong in Render/Vercel environment settings.

Sensitive values include:

- Supabase database host/user/password
- Razorpay Key ID / Key Secret
- Razorpay webhook secret
- Gemini API key
- optional OpenAI API key

If any credential is accidentally committed or exposed, rotate it immediately at the provider and remove it from repository history before making the repository public.

## Razorpay webhook security

RecoverFlow verifies webhook signatures using HMAC SHA-256 over the **exact raw request body** and the configured `RAZORPAY_WEBHOOK_SECRET`.

The service also persists `X-Razorpay-Event-Id` under a unique constraint to prevent duplicate processing.

Do not reuse the Razorpay API Key Secret as the webhook secret.

## Money-moving safety

AI output never executes a collection action directly.

The deterministic merchant policy guard independently checks:

- maximum autonomous amount
- minimum planner confidence
- maximum attempts
- whether autonomous collection is enabled
- terminal/protected case state

Late-success duplicate-charge protection is mandatory and cannot be disabled from the merchant settings UI.

## Data and logging

The prototype stores synthetic demo failures, recovery state, webhook payloads, audit logs, benchmark results and merchant policy in PostgreSQL.

Before handling real customer data, add:

- data minimization and retention rules
- PII redaction
- access control / tenant isolation
- encryption/key-management review
- structured log redaction
- audit retention policy

## Background processing

Production webhook acknowledgement is intentionally fast, while downstream work runs in a FastAPI background task. This is acceptable for the buildathon prototype but is not a durable queue.

For production, move asynchronous financial workflows to a durable queue with retries, dead-letter handling and replay tooling.

## Reporting a vulnerability

For this buildathon repository, report security issues privately to the repository owner rather than opening a public issue containing exploit details or secrets.
