# RecoverFlow — 5-Minute Pitch Script

## 0:00–0:30 — Problem

> A failed payment does not always mean the same thing. Sometimes the customer enters a wrong OTP. Sometimes the bank is temporarily unavailable. Sometimes the gateway times out and the original payment may still succeed late. But a naive recovery system often treats all of these as the same problem: retry again.
>
> RecoverFlow is an AI revenue-recovery agent that diagnoses the failure first, chooses the right bounded intervention, and recovers revenue without blind retries or unnecessary duplicate-charge risk.

On screen: `/demo` hero + architecture statement.

## 0:30–1:10 — Architecture

> The architecture is intentionally separated into three layers: **AI proposes, policy decides, Razorpay executes.**
>
> Razorpay sends signed payment events to our FastAPI backend. We verify the raw-body HMAC signature and event ID, persist the event in Supabase, and acknowledge the webhook quickly. Gemini then analyses the payment failure and returns a structured action: create a recovery link, wait and verify, or escalate.
>
> The model cannot move money directly. A deterministic merchant policy guard independently checks amount limits, confidence and retry count before any Razorpay action is executed.

On screen: `README.md` Mermaid diagram or `/demo` Core Architecture card.

## 1:10–2:20 — Live recovery flow

> Let me show the main path. I’ll create a customer-fixable payment failure — for example an incorrect OTP.
>
> RecoverFlow receives the payment context, Gemini diagnoses it, and proposes a bounded recovery link. The case inspector shows the model, diagnosis, confidence, recommended action and the reason behind it.
>
> I execute the recovery. RecoverFlow passes the case through the policy guard and creates a **real Razorpay Test Mode Payment Link**.
>
> When the test payment succeeds, Razorpay sends a signed `payment_link.paid` webhook to our public backend. The case moves to `RECOVERED`, recovered revenue is updated, and the full event is visible in the audit timeline.

On screen:
1. `/simulator` or dashboard → incorrect OTP
2. dashboard Case Inspector
3. Execute Recovery
4. Razorpay Test Mode payment
5. dashboard refresh → `RECOVERED`

## 2:20–3:10 — The safety differentiator

> The interesting case is when the original payment succeeds late.
>
> After a gateway timeout, blindly launching another collection path can double-charge the customer if the original payment later gets captured.
>
> RecoverFlow listens for Razorpay `payment.authorized` and `payment.captured` events. If the original payment succeeds while a recovery link is still open, the system cancels that link and marks the case `ORIGINAL_PAYMENT_CAPTURED`. If recovery had already been collected, it raises a duplicate-collection condition for human refund review.
>
> This is why RecoverFlow is not just a retry bot — it has explicit stopping rules.

On screen: fresh demo case → execute → simulate/real late success → audit timeline showing recovery stopped / duplicate charge prevented.

## 3:10–3:50 — Merchant-controlled autonomy

> Autonomy is configurable by the merchant. Here I can set the maximum autonomous amount, minimum AI confidence and maximum recovery attempts.
>
> Some safety exits cannot be disabled: wait-and-verify, escalation and duplicate-charge protection always remain available.
>
> So even if Gemini recommends a collection action, merchant policy can still block it.

On screen: `/settings/policy`.

## 3:50–4:30 — Measured evaluation

> We also wanted evidence beyond a single happy-path demo.
>
> RecoverFlow includes a versioned 30-case synthetic benchmark covering customer-fixable failures, gateway and bank uncertainty, high-value cases, suspicious patterns and boundary conditions.
>
> Ground-truth labels are hidden from Gemini during inference. We compare the same cases against a deliberately naive baseline that creates a recovery link after every failure.
>
> The dashboard reports decision accuracy, unsafe collection attempts, duplicate-risk exposure and recovery-opportunity capture. These results are explicitly labelled synthetic — we do not present them as production merchant metrics.

On screen: `/analytics/evaluation` and `/benchmark`.

## 4:30–5:00 — Close

> RecoverFlow closes the full revenue-recovery loop: detect a failed payment, diagnose the cause, choose the right intervention, enforce merchant policy, execute through Razorpay, stop when the original succeeds late, and keep every decision auditable.
>
> The product is live on Vercel, the FastAPI backend is live on Render, state is persisted in Supabase, and the Razorpay Test Mode webhook path has been verified end to end.
>
> RecoverFlow’s goal is simple: **recover revenue, without treating every failure like a retry button.**

End screen: `/demo` with live links.

---

## Recording checklist

Before recording:

- Open `/demo` first.
- Warm the Render backend by opening `/health/ready`.
- Have one fresh recoverable demo case ready.
- Keep Razorpay Test Mode logged in.
- Keep `/analytics/evaluation` loaded with the latest benchmark.
- Reset merchant safety policy to intended demo defaults.
- Hide browser bookmarks/personal tabs where possible.
- Never expose Render/Vercel environment variables or API secrets on screen.

## One-line answer if asked “what is the AI doing?”

> Gemini reasons over payment failure context and proposes a structured recovery action, while deterministic merchant policy independently gates any money-moving execution.

## One-line answer if asked “why not just retry?”

> Because gateway and bank failures can resolve late; a blind retry can create duplicate collection risk, while RecoverFlow verifies uncertain states and stops recovery when the original payment succeeds.

## One-line answer if asked “what did you actually integrate?”

> Real Razorpay Test Mode Payment Links, signed Razorpay webhooks, Gemini structured planning, Supabase PostgreSQL state, Render FastAPI deployment and Vercel Next.js deployment.
