# Razorpay AI Buildathon — RecoverFlow Submission Checklist

## Required submission assets

- [ ] Public GitHub repository
- [ ] 5-minute pitch/demo video
- [ ] Live frontend URL
- [ ] Architecture walkthrough
- [ ] Clear explanation of AI usage
- [ ] Track selection: **AI Revenue Recovery**

## Final links

- Product: https://recoverflow-kohl.vercel.app
- Judge Demo Mode: https://recoverflow-kohl.vercel.app/demo
- Backend API: https://recoverflow-api-ul43.onrender.com
- Swagger: https://recoverflow-api-ul43.onrender.com/docs
- GitHub repository: https://github.com/ParvBhawsar/recoverflow

## Public-repo gate

Before changing the repository from private to public:

- [x] `.env` and `backend/.env` ignored
- [x] `frontend/.env.local` ignored
- [x] real Supabase credentials not committed
- [x] real Razorpay secrets not committed
- [x] real Gemini key not committed
- [x] environment templates contain placeholders only
- [x] security guidance exists in `SECURITY.md`
- [ ] one final GitHub code search for credential patterns immediately before public switch

## Product proof to show

- [x] Payment failure detection
- [x] Gemini diagnosis + structured recovery action
- [x] Merchant-configured safety guard
- [x] Real Razorpay Test Mode Payment Link creation
- [x] Signed `payment_link.paid` webhook → `RECOVERED`
- [x] Late original-success stopping rule
- [x] Duplicate-charge protection
- [x] Per-case audit trail
- [x] Multi-scenario simulator
- [x] 30-case synthetic benchmark
- [x] RecoverFlow vs blind-retry comparison
- [x] Persistent benchmark analytics

## Track-03 bar

The submission should make these four things obvious:

1. **Money recovered** — show a real Test Mode recovery and recovered revenue in the dashboard.
2. **Compliant escalation** — show high-value / ambiguous cases being escalated rather than autonomously collected.
3. **Stopping rules** — show `WAIT_AND_VERIFY` plus late-success link cancellation.
4. **Audit trail** — show model decision, policy reason, execution and recovery events.

## Demo-video order

Use `docs/PITCH.md` and keep the recording under five minutes:

1. Problem — failed payments are heterogeneous.
2. Architecture — AI proposes, policy decides, Razorpay executes.
3. Live recoverable failure → real Payment Link → recovered webhook.
4. Late-success / duplicate-charge protection.
5. Merchant safety controls.
6. Synthetic benchmark vs blind retry.
7. Close with live deployment and core differentiator.

## Before recording

- [ ] Warm Render by opening `/health/ready`
- [ ] Check Vercel homepage loads
- [ ] Confirm GitHub Actions is green
- [ ] Reset merchant policy to intended defaults
- [ ] Create a fresh demo case
- [ ] Ensure Razorpay is in **Test Mode**
- [ ] Hide all environment-variable / secret screens
- [ ] Close unrelated browser tabs
- [ ] Ensure benchmark page has the latest stored run
- [ ] Test screen recording + microphone levels

## Before final submit

- [ ] Make repository public
- [ ] Open README while logged out / incognito
- [ ] Verify `/demo` is live
- [ ] Verify all links in README work
- [ ] Verify Render `/health/ready`
- [ ] Run `scripts/smoke-prod.ps1`
- [ ] Confirm Razorpay webhook remains Enabled
- [ ] Confirm video link is publicly viewable
- [ ] Submit the public GitHub repo URL
- [ ] Submit live product URL if the form allows it
- [ ] Submit video URL
- [ ] Save a screenshot / confirmation page after submission

## Short project description

> RecoverFlow is an AI revenue-recovery agent for failed Razorpay payments. Gemini diagnoses payment failures and proposes a bounded action, while merchant-configured deterministic policy controls any money-moving execution. The system creates real Razorpay Test Mode recovery links, consumes signed webhooks, stops recovery when the original payment succeeds late, maintains a full audit trail, and benchmarks its strategy against blind retry on a versioned 30-case synthetic dataset.

## One-line tagline

> **Revenue recovery, without blind retries.**
