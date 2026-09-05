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

The check script validates Python compilation/imports, backend unit tests, Supabase connectivity, ESLint, and the Next.js production build. Run each step only after the preceding step succeeds.

Start the local application with:

```powershell
.\scripts\dev.ps1
```

The dev script starts separate backend and frontend terminals. Keep them open while using localhost. It currently stops listeners on ports 3000 and 8000 first; make sure these ports are not being used by unrelated applications.

Useful local URLs:

- Product: `http://localhost:3000`
- Merchant overview: `http://localhost:3000/dashboard`
- Recovery cases: `http://localhost:3000/cases`
- Recovery insights: `http://localhost:3000/analytics`
- Merchant safeguards: `http://localhost:3000/settings/policy`
- Test sandbox: `http://localhost:3000/simulator`
- API docs: `http://127.0.0.1:8000/docs`
- Liveness: `http://127.0.0.1:8000/health`
- Readiness + database: `http://127.0.0.1:8000/health/ready`

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

- **Framework:** Next.js, not the multi-service preset
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

Use an origin without a trailing slash. Multiple origins can be comma-separated. For local development, use the local configuration rather than replacing it with production settings:

```text
APP_ENV=development
FRONTEND_ORIGINS=http://localhost:3000
```

Restart/redeploy the Render service after changing its environment. Local secret files, Render environment variables and Vercel environment variables are separate; Git does not synchronize secret values between them.

## 5. Production smoke test

```powershell
.\scripts\smoke-prod.ps1 `
  -BackendUrl "https://recoverflow-api-ul43.onrender.com" `
  -FrontendUrl "https://recoverflow-kohl.vercel.app"
```

The smoke test checks:

- backend root/version
- backend + database readiness
- Supabase connection
- merchant safety policy + mandatory duplicate protection
- `rf-synth-v1` evaluation dataset
- merchant and technical frontend routes
- production CORS from Vercel to Render

HTTP success is not a visual or interactive browser test. Also verify navigation, case selection, loading/error states and mobile layouts in a browser.

## 6. Razorpay Test Mode webhook

Configure Razorpay Test Mode to send signed events to:

```text
https://recoverflow-api-ul43.onrender.com/webhooks/razorpay
```

Use the same secret configured as `RAZORPAY_WEBHOOK_SECRET` on Render. This is separate from the Razorpay API key secret.

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

Vercel's Git integration builds production deployments from the production branch. Render auto-deployment must be enabled on the linked branch; its settings can deploy on commit or after CI checks pass. Builds complete independently, so this is not an instantaneous or atomic multi-service release.

For each release:

1. Update affected code and documentation together.
2. Confirm GitHub CI passes for the intended commit.
3. Confirm Vercel's production alias points to a READY deployment for that commit.
4. Confirm Render's live deployment uses the intended backend revision and passes readiness.
5. Run the production smoke test and appropriate interactive Test Mode checks.
6. Pull into the local checkout, install changed dependencies, and restart local development servers.

A README edit is an ordinary source change; documentation is not rewritten automatically by Git or hosting platforms. Supabase records/schema, Razorpay dashboard configuration and hosting secrets also do not update merely because code was pulled or deployed. Handle required schema/configuration changes explicitly without resetting existing data.

To compare local source revisions after a successful pull:

```powershell
git rev-parse HEAD
git rev-parse origin/main
```

The hashes should match for a checkout aligned to the fetched `main`. Uncommitted changes can still exist; also check `git status --short`.

## Free-tier note

Render free web services can spin down after inactivity, so the first request after an idle period can be slow. The production smoke script includes cold-start retries.

## Platform references

- Git pull: https://git-scm.com/docs/git-pull
- Vercel Git deployments: https://vercel.com/docs/git
- Render deploy behavior: https://render.com/docs/deploys
