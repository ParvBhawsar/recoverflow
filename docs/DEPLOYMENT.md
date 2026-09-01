# RecoverFlow deployment

RecoverFlow uses a split deployment:

- **Frontend:** Vercel (`frontend/`)
- **Backend:** Render (`backend/`, configured by root `render.yaml`)
- **Database:** Supabase PostgreSQL

No secret values belong in GitHub.

## 1. Local validation

From the repository root:

```powershell
git pull
.\scripts\check.ps1
```

This validates Python compilation/imports, the backend unit suite, Supabase connectivity, ESLint, and the Next.js production build.

Start the local application with:

```powershell
.\scripts\dev.ps1
```

Useful local URLs:

- Product: `http://localhost:3000`
- Merchant console: `http://localhost:3000/dashboard`
- API docs: `http://127.0.0.1:8000/docs`
- Liveness: `http://127.0.0.1:8000/health`
- Readiness + database: `http://127.0.0.1:8000/health/ready`

## 2. Backend on Render

Create a **Blueprint** from the `ParvBhawsar/recoverflow` GitHub repository. Render reads the root `render.yaml` and creates the `recoverflow-api` Python web service.

Provide the variables marked `sync: false`:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `FRONTEND_ORIGINS`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `GEMINI_API_KEY`

The Blueprint supplies:

- `APP_ENV=production`
- `DB_PORT=5432`
- `DB_NAME=postgres`
- `DB_SSLMODE=require`
- `GEMINI_MODEL=gemini-3.5-flash-lite`
- `OPENAI_FALLBACK_ENABLED=false`
- readiness health check `/health/ready`
- Singapore region

After deployment, verify:

- `https://<render-service>/health`
- `https://<render-service>/health/ready`
- `https://<render-service>/health/db`
- `https://<render-service>/docs`

Do not continue until `/health/ready` returns `status: ready`.

## 3. Frontend on Vercel

Import the same GitHub repository into Vercel.

Use:

- **Framework:** Next.js
- **Root Directory:** `frontend`
- **Build Command:** default (`next build`)
- **Output Directory:** default

Set:

```text
NEXT_PUBLIC_API_URL=https://<render-service>
```

Verify these routes:

- `/`
- `/dashboard`
- `/simulator`
- `/analytics/evaluation`
- `/settings/policy`
- `/benchmark`
- `/evaluation`

## 4. CORS

Set Render:

```text
FRONTEND_ORIGINS=https://<vercel-production-domain>
```

Multiple origins can be comma-separated. Localhost remains enabled for development.

Restart/redeploy the Render service after changing this value.

## 5. Production smoke test

```powershell
.\scripts\smoke-prod.ps1 `
  -BackendUrl "https://<render-service>" `
  -FrontendUrl "https://<vercel-production-domain>"
```

The smoke test checks:

- backend root/version
- backend + database readiness
- Supabase connection
- merchant safety policy + mandatory duplicate protection
- `rf-synth-v1` evaluation dataset
- public frontend routes
- production CORS from Vercel to Render

## 6. Razorpay Test Mode webhook

Configure Razorpay Test Mode to send signed events to:

```text
https://<render-service>/webhooks/razorpay
```

Use the same secret configured as `RAZORPAY_WEBHOOK_SECRET` on Render.

Relevant events:

- `payment.failed`
- `payment.authorized`
- `payment.captured`
- `payment_link.paid`

The backend verifies raw-body HMAC signatures and uses the Razorpay event ID for idempotency.

## 7. End-to-end validation

1. Open the deployed merchant console.
2. Create a synthetic failed-payment case and confirm Gemini creates a plan.
3. Execute an approved recovery and confirm a Razorpay Test Mode Payment Link is created.
4. Complete the Test Mode payment and verify the signed webhook marks the case `RECOVERED`.
5. Test late original success and confirm the open recovery link is cancelled.
6. Run the synthetic benchmark and confirm the result is persisted.
7. Change a merchant safeguard and confirm it survives a refresh/restart.

## Free-tier note

Render free web services can spin down after inactivity, so the first request after an idle period can be slow. The production smoke script includes cold-start retries.
