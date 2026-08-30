# RecoverFlow Checkpoint — 31 Aug 2026

## Current state

RecoverFlow's core local demo is working end-to-end.

### Working flow

1. Create/simulate a failed payment.
2. AI planner analyzes failure context and returns structured output.
3. Deterministic policy guard validates whether autonomous action is allowed.
4. RecoverFlow creates a real Razorpay Test Mode Payment Link.
5. Customer completes a Razorpay test payment.
6. Local reconciliation checks Razorpay Payment Link status.
7. Case moves to `RECOVERED` and recovered-revenue metrics update.

### AI planner

- Primary: Gemini free-tier planner.
- Fast model currently used first: `gemini-3.5-flash-lite`.
- Optional secondary provider: OpenAI if API credits exist.
- Final fallback: deterministic recovery policy.
- AI output is persisted in `ai_plans` with:
  - diagnosis
  - confidence
  - recommended_action
  - delay_minutes
  - reason
  - customer_tone
  - planner_source
  - planner_model
- AI can only propose. Deterministic safety policy remains the execution authority.

### Razorpay integration

- Test API credentials loaded from `backend/.env`.
- Real Razorpay Payment Links are created from approved recovery cases.
- Local development cannot receive Razorpay webhooks directly because localhost is private.
- For local demos, RecoverFlow reconciles Payment Link status through Razorpay's API.
- Production webhook handler already exists for:
  - `payment.failed`
  - `payment.authorized`
  - `payment.captured`
  - `payment_link.paid`
- Webhook verification uses HMAC SHA-256, event IDs, and duplicate protection.

### Key differentiator already designed

Late-success protection: if an original failed payment later becomes authorized/captured, RecoverFlow stops recovery to avoid duplicate collection.

## Current dashboard

- AI Planner v0.6
- Live recovery queue
- Revenue at Risk
- Recovered Revenue
- Recovery Rate
- AI-Planned Cases
- Agent Inspector with diagnosis, action, confidence, delay, customer tone, reasoning, provider/model
- Execute Recovery button
- Recovered-state display

## Tested successfully

- Frontend hydration/interactivity
- FastAPI + Supabase connectivity
- Demo failed-payment creation
- Razorpay Test Mode Payment Link creation
- Successful Razorpay test payment
- Paid-link reconciliation
- Case status changing to `RECOVERED`
- Recovered revenue metric increasing
- Gemini AI planner producing a structured recommendation
- Deterministic fallback when AI provider fails

## Environment / secrets

Secrets stay in `backend/.env` and must never be committed.

Expected env variables include:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional)
- `OPENAI_API_KEY` (optional)
- `OPENAI_MODEL` (optional)

## Resume tomorrow from here

Priority order:

1. Build and test the **late-success protection demo**.
   - Create failed case.
   - AI proposes recovery.
   - Simulate original payment later succeeding.
   - Verify RecoverFlow changes case to `ORIGINAL_PAYMENT_CAPTURED` / stops recovery.
   - Show clearly in dashboard that duplicate collection was prevented.

2. Improve the demo dashboard UX around the decision/audit timeline.

3. Add evaluation harness + synthetic failure scenarios.
   - Compare naive retry baseline vs context-aware recovery.
   - Clearly label synthetic metrics as simulated.

4. Deploy backend publicly.
   - Then configure real Razorpay webhook URL.
   - Re-test `payment_link.paid` and late-success events through actual webhook delivery.

5. Deploy frontend and set `NEXT_PUBLIC_API_URL`.

6. Finalize README, architecture diagram, demo script, pitch, and submission requirements.

7. Make repository public only when ready for submission.

## Local startup tomorrow

From repository root:

```powershell
git pull
.\scripts\dev.ps1
```

Then open:

- Frontend: `http://localhost:3000`
- Backend docs: `http://127.0.0.1:8000/docs`

Keep the backend and frontend terminal windows open while using the app.
