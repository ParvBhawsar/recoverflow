# Security Policy

RecoverFlow currently runs exclusively against **Razorpay Test Mode**. The public deployment is intended for product evaluation and integration testing and is not approved for live financial traffic.

## Secret handling

Credentials must never be committed to Git.

Local secrets belong in:

```text
backend/.env
frontend/.env.local
```

Both are ignored by the repository. Deployment secrets belong in Render/Vercel environment settings.

Sensitive values include:

- Supabase database host/user/password
- Razorpay Key ID / Key Secret
- Razorpay webhook secret
- Gemini API key
- optional OpenAI API key

If a credential is accidentally exposed, rotate it immediately at the provider and remove it from repository history before continuing to use the environment.

## Razorpay webhook security

RecoverFlow verifies webhook signatures using HMAC SHA-256 over the **exact raw request body** and the configured `RAZORPAY_WEBHOOK_SECRET`.

`X-Razorpay-Event-Id` is persisted under a unique constraint to prevent duplicate processing.

The Razorpay API Key Secret and webhook secret should remain separate values.

## Money-moving safety

AI output never executes a collection action directly.

The deterministic merchant-policy guard independently checks:

- maximum autonomous amount
- minimum planner confidence
- maximum attempts
- whether autonomous collection is enabled
- terminal/protected case state

Late-success duplicate-charge protection is mandatory and cannot be disabled from the merchant settings UI.

## Data and logging

The current Test Mode deployment stores synthetic payment failures, recovery state, webhook payloads, audit logs, benchmark results and merchant policy in PostgreSQL.

Before handling real customer data, add and validate:

- merchant authentication and tenant isolation
- data minimization and retention rules
- PII redaction
- encryption/key-management review
- structured log redaction
- audit retention policy
- operational access controls

## Background processing

Webhook acknowledgement is intentionally fast, while downstream work runs in a FastAPI background task.

For live financial traffic, move asynchronous recovery workflows to a durable queue with retry policy, dead-letter handling, replay tooling, observability and operator controls.

## Reporting a vulnerability

Report suspected security issues privately to the repository owner. Do not open a public issue containing secrets, customer data or exploit details.
