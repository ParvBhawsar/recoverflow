# RecoverFlow Project Roadmap

This is the persistent build checklist for RecoverFlow. Update it as milestones are completed so the repository, dashboard, and project discussions stay aligned.

## Current progress

**17 / 23 major milestones complete — 74%**

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

## Next up

- [ ] Merchant safety controls and configurable policy settings

## Later / submission readiness

- [ ] Public backend + frontend deployment
- [ ] Real public Razorpay webhook configuration and end-to-end verification
- [ ] Automated backend/frontend tests and CI
- [ ] Judge-facing demo walkthrough mode
- [ ] README, architecture diagram and API documentation
- [ ] Public-repository cleanup and security review
- [ ] Final pitch, demo video and buildathon submission polish

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
- Dataset API: `/recovery/evaluation/dataset`
- Benchmark API: `POST /recovery/evaluation/benchmark`
- Latest stored benchmark: `GET /recovery/evaluation/benchmark/latest`
- Benchmark history: `GET /recovery/evaluation/benchmark/history`
- Dataset version: `rf-synth-v1`
- Benchmark runs are persisted in Supabase.
- Ground-truth labels are withheld from Gemini during benchmark inference.
- All benchmark results are synthetic evaluation evidence and must never be represented as production merchant performance data.

## Immediate focus

Build **Merchant Safety Controls** so the ₹25,000 autonomous ceiling, minimum confidence, attempt limit, and allowed autonomous actions become visible and configurable merchant policy rather than hidden constants in backend code.
