# RecoverFlow frontend

Merchant-facing web application for RecoverFlow.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Vercel

## Routes

- `/` — product landing page
- `/dashboard` — recovery operations console
- `/simulator` — recovery sandbox
- `/analytics/evaluation` — evaluation analytics
- `/settings/policy` — merchant safeguards
- `/benchmark` — strategy benchmark
- `/evaluation` — labelled synthetic evaluation dataset

## Environment

Create `frontend/.env.local` for local development:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Production uses the deployed Render API URL through Vercel environment settings.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```
