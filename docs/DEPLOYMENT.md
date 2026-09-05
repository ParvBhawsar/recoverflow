# RecoverFlow deployment

RecoverFlow uses a split deployment:

- **Frontend:** Vercel (`frontend/`)
- **Backend:** Render (`backend/`, configured by root `render.yaml`)
- **Database:** Supabase PostgreSQL

No secret values belong in GitHub. The publicly deployed workspace uses Razorpay Test Mode; deployment to a production hosting environment does not enable real-money payments.

## 1. Local validation

For an existing checkout, save editor files and stop existing RecoverFlow development servers. Run `git status --short` and resolve or safely set aside local edits before pulling:

```powershell
git switch main
git pull --ff-only origin main
```

Stop if either command fails. Do not use a hard reset or delete local changes to bypass a conflict. Keep existing `backend/.env` and `frontend/.env.local`; example templates contain placeholders, not working credentials.

From the repository root:

```powershell
.\scripts\setup.ps1
.\scripts\check.ps1
```

The check script validates Python compilation/imports, backend unit tests, frontend lint/build, and database reachability. Database reachability is intentionally resilient:

1. Supabase shared session pooler on port `5432`
2. Supabase shared transaction pooler on port `6543`
3. if neither local PostgreSQL route works, verify the deployed Render Test Mode backend and continue code/build validation

Supabase connections use `sslmode=require` and explicitly disable unnecessary GSS encryption negotiation with `gssencmode=disable`. This avoids a known Supavisor/libpq negotiation compatibility issue on some clients.

Start the local application with:

```powershell
.\scripts\dev.ps1
```

`dev.ps1` uses the same connection resolution strategy. If local PostgreSQL is available it starts the full local FastAPI + Next.js stack. If neither pooler port can establish a local database session, it starts the local Next.js frontend against the deployed Render Test Mode API instead. This fallback does not change `backend/.env`, Render settings, or Supabase credentials. Test actions in fallback mode affect the shared deployed Test Mode database.

Useful local URLs:

- Product: `http://localhost:3000`
- Merchant overview: `http://localhost:3000/dashboard`
- Recovery cases: `http://localhost:3000/cases`
- Recovery insights: `http://localhost:3000/analytics`
- Merchant safeguards: `http://localhost:3000/settings/policy`
- Test sandbox: `http://localhost:3000/simulator`
- API docs when full local backend is active: `http://127.0.0.1:8000/docs`
- Liveness when full local backend is active: `http://127.0.0.1:8000/health`
- Readiness + database when full local backend is active: `http://127.0.0.1:8000/health/ready`

## 2. Backend on Render

Create a **Blueprint** from the `ParvBhawsar/recoverflow` GitHub repository. Render reads the root `render.yaml` and manages the `recoverflow-api` Python web service.

Provide the variables marked `sync: false`, checking the existing service's Environment page when associating an older service:

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
- `DB_GSSENCMODE=disable`
- `GEMINI_MODEL=gemini-3.5-flash-lite`
- `OPENAI_FALLBACK_ENABLED=false`
- readiness health check `/health/ready`
- Singapore region

After deployment, verify:

- `https://<render-service>/health`
- `https://<render-service>/health/ready`
- `https://<render-service>/health/db`
- `https://<render-service>/docs`

Do not continue until `/health/ready` returns `status: ready`. Health responses confirm readiness, not the deployed Git commit; check the live deployment's commit in Render separately.

## 3. Frontend on Vercel

Import the same GitHub repository into Vercel.

Use:

- **Framework:** Next.js
- **Root Directory:** `frontend`
- **Production branch:** `main`
- **Build Command:** framework default
- **Output Directory:** framework default

Set:

```text
NEXT_PUBLIC_API_URL=https://<render-service>
```

Verify merchant routes:

- `/`
- `/dashboard`
- `/cases`
- `/analytics`
- `/settings/policy`
- `/simulator`

Also verify the secondary technical-validation routes:

- `/analytics/evaluation`
- `/benchmark`
- `/evaluation`

Technical-route `noindex` metadata and removal from primary navigation do not restrict access. Do not treat these as authentication controls.

## 4. CORS and environment separation

For the deployed backend, set Render:

```text
FRONTEND_ORIGINS=https://recoverflow-kohl.vercel.app
```

Use an origin without a trailing slash. Multiple origins can be comma-separated. Localhost remains enabled by application defaults for development.

Local secret files, Render environment variables and Vercel environment variables are separate; Git does not synchronize secret values between them.

## 5. Production smoke test

```powershell
.\scripts\smoke-prod.ps1 `
  -BackendUrl "https://recoverflow-api-ul43.onrender.com" `
  -FrontendUrl "https://recoverflow-kohl.vercel.app"
```

The smoke test checks backend readiness, Supabase, merchant safety policy, evaluation data, frontend routes, and production CORS.

## 6. Razorpay Test Mode webhook

Configure Razorpay Test Mode to send signed events to:

```text
https://recoverflow-api-ul43.onrender.com/webhooks/razorpay
```

Relevant events:

- `payment.failed`
- `payment.authorized`
- `payment.captured`
- `payment_link.paid`

The backend verifies raw-body HMAC signatures and uses the Razorpay event ID for idempotency.

## 7. End-to-end validation

1. Open the deployed merchant overview or test sandbox.
2. Create a synthetic failed-payment case and confirm a recovery plan is recorded.
3. Execute an approved recovery and confirm a Razorpay Test Mode Payment Link is created.
4. Complete the Test Mode payment and verify the signed webhook marks the case `RECOVERED`.
5. Test late original success on a separate synthetic case and confirm the open recovery link is cancelled.
6. Run the synthetic benchmark and confirm the result is persisted.
7. Verify any intentional merchant-safeguard change survives a refresh; restore the intended policy after testing.

## 8. Keeping releases aligned

GitHub `main` is the shared source of code and documentation. The intended update flow is:

```text
Reviewed code and documentation -> GitHub main
                                  |-> Vercel frontend build -> production alias
                                  |-> Render backend build -> live service
                                  |-> git pull -> local VS Code checkout
```

Vercel and Render deployments finish independently, so release alignment is verified rather than assumed.

For each release:

1. Update affected code and documentation together.
2. Confirm GitHub CI passes for the intended commit.
3. Confirm Vercel's production alias points to a READY deployment for that commit.
4. Confirm Render's live deployment uses the intended backend revision and passes readiness.
5. Run the production smoke test and appropriate interactive Test Mode checks.
6. Pull into the local checkout, install changed dependencies, and restart local development servers.

A README edit is an ordinary source change; documentation is not rewritten automatically by Git or hosting platforms. Supabase records/schema, Razorpay dashboard configuration and hosting secrets also do not update merely because code was pulled or deployed.

To compare local source revisions after a successful pull:

```powershell
git rev-parse HEAD
git rev-parse origin/main
```

The hashes should match for a checkout aligned to the fetched `main`.

## Free-tier note

Render free web services can spin down after inactivity, so the first request after an idle period can be slow. The production smoke script and local fallback use retry windows for this case.
