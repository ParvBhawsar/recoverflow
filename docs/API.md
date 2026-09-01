# RecoverFlow API

Base production URL:

```text
https://recoverflow-api-ul43.onrender.com
```

Interactive Swagger documentation:

```text
GET /docs
```

## Health

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/` | Service identity/version |
| GET | `/health` | Liveness |
| GET | `/health/ready` | Readiness + database + policy |
| GET | `/health/db` | PostgreSQL connectivity |

## Recovery cases

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/recovery/cases` | List latest recovery cases |
| GET | `/recovery/cases/{case_id}` | Case detail, AI plan, policy guard, actions and audit timeline |
| GET | `/recovery/summary` | Recovery metrics |
| POST | `/recovery/cases/{case_id}/execute` | Execute an approved Razorpay recovery action |

### Execute recovery

`POST /recovery/cases/{case_id}/execute`

Possible success fields:

```json
{
  "status": "CREATED",
  "action_id": 1,
  "payment_link_id": "plink_...",
  "payment_link_url": "https://rzp.io/...",
  "recovery_case_id": 1
}
```

Execution can be rejected with a policy error if the case is unsafe, terminal, over the merchant limit, below the confidence threshold, or over the attempt cap.

## Recovery sandbox

The product sandbox uses synthetic Razorpay-style failures to exercise the same planner and deterministic policy path as the merchant console.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/recovery/demo/scenarios` | List supported sandbox scenarios |
| POST | `/recovery/demo/failure` | Create the default incorrect-OTP scenario |
| POST | `/recovery/demo/failure/{scenario_id}` | Create a named synthetic scenario |
| POST | `/recovery/cases/{case_id}/demo/original-success` | Simulate late original success for synthetic cases |

Supported scenario families include customer-fixable, transient, high-value and ambiguous failures.

## Merchant policy

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/recovery/policy` | Get persisted merchant safety policy |
| PUT | `/recovery/policy` | Update configurable limits |
| POST | `/recovery/policy/reset` | Reset RecoverFlow defaults |

Configurable fields:

- maximum autonomous amount
- minimum AI confidence
- maximum autonomous recovery attempts
- whether autonomous Payment Link creation is enabled

Mandatory invariants remain enabled:

- `WAIT_AND_VERIFY`
- `ESCALATE`
- duplicate-charge protection

## Evaluation

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/recovery/evaluation/dataset` | Full `rf-synth-v1` synthetic dataset |
| GET | `/recovery/evaluation/dataset/{case_id}` | One synthetic benchmark record |
| POST | `/recovery/evaluation/benchmark` | Run blinded AI-vs-blind-retry benchmark and persist result |
| GET | `/recovery/evaluation/benchmark/latest` | Latest persisted benchmark |
| GET | `/recovery/evaluation/benchmark/history` | Recent benchmark history |

All benchmark responses are synthetic evaluation evidence.

## Razorpay webhook

### Endpoint

```text
POST /webhooks/razorpay
```

Configured production URL:

```text
https://recoverflow-api-ul43.onrender.com/webhooks/razorpay
```

Required headers:

```text
X-Razorpay-Signature
X-Razorpay-Event-Id
```

Handled event types:

- `payment.failed`
- `payment.authorized`
- `payment.captured`
- `payment_link.paid`

### Webhook processing semantics

1. raw request body is read
2. HMAC signature is verified
3. JSON payload is parsed
4. event id is checked for idempotency
5. event record is persisted
6. request is acknowledged
7. event processing continues in the background

Duplicate event ids are acknowledged without creating duplicate recovery work.

## CORS

Production frontend origin:

```text
https://recoverflow-kohl.vercel.app
```

The backend accepts configured production origins plus localhost development origins.

## Money representation

Amounts are stored and transmitted as integer **paise** to avoid floating-point money errors.

Example:

```text
499900 paise = ₹4,999.00
```
