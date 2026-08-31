# RecoverFlow Project Roadmap

This is the persistent build checklist for RecoverFlow. Update it as milestones are completed so the repository, dashboard, and project discussions stay aligned.

## Current progress

**13 / 23 major milestones complete — 57%**

## Completed

- [x] Core frontend + FastAPI + Supabase foundation
- [x] Razorpay webhook signature verification and idempotency
- [x] Failed-payment ingestion and RecoveryCase state model
- [x] Razorpay Test Mode API integration
- [x] Real Razorpay Payment Link recovery execution
- [x] Paid recovery reconciliation for local demo
- [x] Gemini structured AI recovery planner
- [x] Deterministic fallback and policy guard
- [x] Late-success detection
- [x] Automatic Razorpay Payment Link cancellation on late original success
- [x] Per-case audit timeline
- [x] Razorpay-inspired dashboard information architecture and UI redesign
- [x] Persistent product blueprint and progress tracking

## Next up

- [ ] Multi-scenario failed-payment simulator
- [ ] Synthetic evaluation dataset
- [ ] RecoverFlow vs blind-retry baseline benchmark
- [ ] Evaluation metrics and analytics views
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

## Immediate focus

Build evaluation evidence before adding more product surface area. The next engineering task is the **multi-scenario failure simulator**, followed by a synthetic benchmark comparing RecoverFlow against a naive blind-retry strategy.
