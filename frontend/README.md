# RecoverFlow frontend

Merchant-facing web application for RecoverFlow. Payments in the deployed workspace use Razorpay Test Mode.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Vercel

## Merchant routes

| Route | Purpose |
| --- | --- |
| `/` | Product landing page |
| `/dashboard` | Merchant recovery overview |
| `/cases` | Recovery-case workspace |
| `/analytics` | Recovery performance and failure insights |
| `/settings/policy` | Merchant safeguards |
| `/simulator` | Test-mode recovery sandbox |

## Technical validation

These routes remain available for technical review, separate from the primary merchant workflow:

- `/analytics/evaluation` — synthetic model-validation analytics
- `/benchmark` — strategy benchmark against a blind-retry baseline
- `/evaluation` — labelled synthetic evaluation dataset

Synthetic benchmark results are not production merchant performance. Navigation placement and `noindex` metadata are not access controls.

## Visual assets

The landing page combines product UI with illustrative real-world business photography sourced from Pexels. The selected photos are used under the Pexels license, are optimized through Next.js Image, and are not presented as actual RecoverFlow customers or endorsements.

Remote image delivery is restricted in `next.config.ts` to `images.pexels.com/photos/**`.

## Environment

Create `frontend/.env.local` for local development:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

The repository's `scripts/dev.ps1` explicitly selects this local API URL when starting the frontend. For local development, configure `backend/.env` with `APP_ENV=development` and `FRONTEND_ORIGINS=http://localhost:3000`.

The deployed frontend receives its API URL from Vercel environment settings:

```text
NEXT_PUBLIC_API_URL=https://recoverflow-api-ul43.onrender.com
```

Only the API base URL belongs in this public frontend variable. Razorpay secrets, Gemini keys and database credentials belong exclusively in the backend environment. Never overwrite working secret files with the example templates.

## Sync an existing checkout

Save your editor files and stop existing RecoverFlow development servers first. From the repository root, run `git status --short` and resolve or safely set aside local edits before updating:

```powershell
git switch main
git pull --ff-only origin main
```

Do not force-reset a checkout or delete local changes to bypass a pull conflict. A pull updates the local checkout; it does not deploy the website.

## Local commands

From the repository root:

```powershell
.\scripts\setup.ps1
.\scripts\check.ps1
.\scripts\dev.ps1
```

The dev script starts backend and frontend processes. Keep their terminal windows open while using localhost. It currently stops listeners on ports 3000 and 8000 before starting; ensure those ports are not being used by unrelated applications.

For frontend-only work, from `frontend/`:

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Deployment source

The existing Vercel project deploys `frontend/` from this repository's `main` branch. A GitHub update triggers a build; production changes only after a successful deployment. Confirm the deployed Git commit matches the intended `main` commit rather than assuming a push completed deployment.

See [deployment and synchronization guidance](../docs/DEPLOYMENT.md).
