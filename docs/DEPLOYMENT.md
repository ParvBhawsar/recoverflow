# RecoverFlow Deployment

RecoverFlow uses a split deployment:

- **Frontend:** Vercel (`frontend/`)
- **Backend:** Render (`backend/`, configured by root `render.yaml`)
- **Database:** existing Supabase PostgreSQL

No secret values belong in GitHub.

## 1. Deploy the backend on Render

Create a new **Blueprint** from the `ParvBhawsar/recoverflow` GitHub repository. Render reads the root `render.yaml` and creates the `recoverflow-api` Python web service on the free plan.

Provide the variables marked `sync: false` when Render asks for them:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `FRONTEND_ORIGINS` — initially leave empty or use the eventual Vercel production URL after frontend deployment
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY` — optional; Gemini is primary and OpenAI can be left blank

The Blueprint already supplies:

- `APP_ENV=production`
- `DB_PORT=5432`
- `DB_NAME=postgres`
- `GEMINI_MODEL=gemini-3.5-flash-lite`
- health check `/health`
- Singapore region
- free compute plan

After deployment, verify:

- `https://<render-service>/health`
- `https://<render-service>/health/db`
- `https://<render-service>/docs`

## 2. Deploy the frontend on Vercel

Import the same GitHub repository into Vercel as a new project.

Use:

- **Framework:** Next.js
- **Root Directory:** `frontend`
- **Build Command:** default (`next build`)
- **Output Directory:** default

Set this Production environment variable:

- `NEXT_PUBLIC_API_URL=https://<render-service>`

Deploy and verify the dashboard plus these routes:

- `/`
- `/simulator`
- `/evaluation`
- `/benchmark`
- `/analytics/evaluation`
- `/settings/policy`

## 3. Complete CORS

After Vercel gives the production URL, set Render:

`FRONTEND_ORIGINS=https://<vercel-production-domain>`

Multiple origins can be comma-separated. Localhost remains enabled for development.

Restart/redeploy the Render service after changing this value.

## 4. Configure the real Razorpay Test Mode webhook

Once the backend is public, configure Razorpay Test Mode to send signed events to:

`https://<render-service>/webhooks/razorpay`

Use the same secret value configured as `RAZORPAY_WEBHOOK_SECRET` on Render.

Relevant events for RecoverFlow include:

- `payment.failed`
- `payment.authorized`
- `payment.captured`
- `payment_link.paid`

The backend verifies the raw-body HMAC signature and uses the Razorpay event ID for idempotency.

## 5. Production smoke test

1. Open the deployed Vercel dashboard.
2. Simulate a failed payment and confirm Gemini creates a plan.
3. Execute a recovery and confirm a Razorpay Test Mode Payment Link is created.
4. Test late original success and confirm the link is cancelled.
5. Run the synthetic benchmark and confirm the result is persisted.
6. Change a merchant safety rule and confirm it survives a refresh/restart.
7. Send a real Test Mode Razorpay event and confirm it appears in the recovery/audit flow.

## Free-tier note

Render free web services can spin down after inactivity, so the first request after an idle period can be slow. This is acceptable for the buildathon demo but should be warmed shortly before judging.
