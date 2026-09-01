# RecoverFlow Project Roadmap

This is the persistent build checklist for RecoverFlow. Update it as milestones are completed so the repository, dashboard, and project discussions stay aligned.

## Current progress

**21 / 23 major milestones complete — 91%**

## Completed

- [x] Core frontend + FastAPI + Supabase foundation
- [x] Razorpay webhook signature verification and idempotency
- [x] Failed-payment ingestion and RecoveryCase state model
- [x] Razorpay Test Mode API integration
- [x] Real Razorpay Payment Link recovery execution
- [x] Paid recovery reconciliation for local demo
- [x] Gemini structured AI recovery planner
- [x] Deterministic safety fallback and policy guard
- [x] Late-success detection
- [x] Automatic Razorpay Payment Link cancellation on late original success
- [x] Per-case audit timeline
- [x] Razorpay-inspired dashboard information architecture and UI redesign
- [x] Persistent product blueprint and progress tracking
- [x] Multi-scenario failed-payment simulator
- [x] Versioned synthetic evaluation dataset (`rf-synth-v1`)
- [x] RecoverFlow vs blind-retry benchmark engine and Benchmark Lab
- [x] Persistent evaluation analytics with benchmark history and category-level analysis
- [x] Merchant Safety Controls with persistent Supabase policy and live runtime enforcement
- [x] Automated backend unit tests, frontend lint/build validation, and GitHub Actions CI
- [x] Public Render backend + Vercel frontend + real Razorpay Test Mode signed webhook end-to-end verification
- [x] Judge-facing Demo Mode command center (`/demo`)

## Remaining / submission readiness

- [ ] README, architecture diagram, API documentation, and public-repository security cleanup
- [ ] Final pitch, demo video, and buildathon submission polish

## Final dashboard structure

1. Executive KPIs
2. Recovery Queue
3. AI Case Inspector
4. Audit Timeline
5. Recovery Funnel & Failure Analytics
6. Duplicate-Charge Protection Center
7. Merchant Controls / Safety Rules
8. Demo & Benchmark Insights

## Evaluation assets

- Simulation Lab: `/simulator`
- Synthetic dataset explorer: `/evaluation`
- Benchmark Lab: `/benchmark`
- Evaluation Analytics: `/analytics/evaluation`
- Judge Demo Mode: `/demo`
- Dataset API: `/recovery/evaluation/dataset`
- Benchmark API: `POST /recovery/evaluation/benchmark`
- Latest stored benchmark: `GET /recovery/evaluation/benchmark/latest`
- Benchmark history: `GET /recovery/evaluation/benchmark/history`
- Dataset version: `rf-synth-v1`
- Benchmark runs are persisted in Supabase.
- Ground-truth labels are withheld from Gemini during benchmark inference.
- All benchmark results are synthetic evaluation evidence and must never be represented as production merchant performance data.

## Merchant safety assets

- Safety Rules UI: `/settings/policy`
- Policy API: `GET/PUT /recovery/policy`
- Reset defaults: `POST /recovery/policy/reset`
- Configurable: autonomous amount ceiling, minimum AI confidence, attempt cap, autonomous Payment Link creation.
- Mandatory invariants: WAIT_AND_VERIFY, ESCALATE, and duplicate-charge protection cannot be disabled.
- Policy changes are persisted in Supabase, reapplied at backend startup, and audited.

## Quality assets

- Full local diagnostic: `.\scripts\check.ps1`
- Production smoke test: `.\scripts\smoke-prod.ps1`
- Backend tests: `backend/tests/`
- Pytest discovery is isolated to automated tests only.
- Manual webhook smoke test: `backend/scripts/manual_webhook_test.py`
- GitHub Actions workflow: `.github/workflows/ci.yml`
- CI validates backend compile + unit tests, frontend ESLint, and Next.js production build.
- Production webhook path uses signed HMAC verification, event-id idempotency, fast acknowledgement, and background processing.

## Immediate focus

Finish submission readiness: tighten the README and architecture/API documentation, run a public-repository security pass, then prepare the final pitch and demo video around the `/demo` judge flow.
