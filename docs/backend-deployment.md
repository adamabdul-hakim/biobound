# Backend Deployment (Render) + Vercel Wiring

This project uses a Vercel frontend and a FastAPI backend.

Use Render for backend deployment, then configure Vercel to point to the deployed backend URL.

## 1) Deploy Backend to Render

1. Push this repo to GitHub.
2. In Render, create a **Blueprint** and select this repository.
3. Render will detect `render.yaml` at the repo root and create `biobound-backend`.
4. In Render service settings, set secret env vars:
   - `GEMINI_API_KEY` (optional but recommended for Gemini-powered features)
  - `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/google-vision-key.json`
5. In Render service settings, add a **Secret File**:
  - Filename: `google-vision-key.json`
  - Content: full JSON from your Google service account key file
5. Deploy and wait for `healthy` status.

Expected backend URL format:

- `https://biobound-backend.onrender.com`

Health checks:

- `GET /health`
- `GET /`

## 2) Connect Vercel Frontend to Backend

In your Vercel project settings, add environment variables:

- `TEAM_B_API_BASE_URL=https://biobound-backend.onrender.com`
- `NEXT_PUBLIC_API_URL=https://biobound-backend.onrender.com`

Why both are needed:

- `TEAM_B_API_BASE_URL` is used by Next.js server routes (e.g. `/api/analyze`, `/api/scan-receipt`).
- `NEXT_PUBLIC_API_URL` is used by browser-side PFAS estimation calls.

After setting env vars, redeploy Vercel.

## 3) Verify End-to-End

1. Open frontend on Vercel.
2. Run an analysis flow from the UI.
3. Confirm requests succeed in both places:
   - Vercel logs: `/api/analyze` and `/api/scan-receipt` route calls
   - Render logs: `POST /analyze`, `POST /estimate/scan-receipt`, `GET /estimate/pfas`

## 4) Common Failure Cases

- `502 BACKEND_UNREACHABLE` in frontend API routes:
  - `TEAM_B_API_BASE_URL` missing or incorrect in Vercel.
- CORS/browser errors for PFAS endpoint:
  - `NEXT_PUBLIC_API_URL` missing or backend URL typo.
- Backend boot fails on Render:
  - Check Render logs for missing env vars or startup command issues.

## 5) Alternative Providers

You can deploy the same FastAPI service to Railway/Fly.io with the same start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Use `apps/backend` as the service root.
