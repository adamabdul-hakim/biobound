# Demo Run Sheet (Post-Integration)

Use this during hackathon demo to prove full stack integration quickly.

## Preconditions
- Branch: `main`
- Backend path: `apps/backend`
- Frontend path: `apps/frontend`

## 1. Start Backend

```bash
cd apps/backend
python scripts/check_ocr_readiness.py
OCR_PROVIDER=google GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json ANALYZE_RATE_LIMIT_PER_MINUTE=60 python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Expected:
- `check_ocr_readiness.py` prints `OK`.
- Uvicorn starts without errors.
- `http://127.0.0.1:8000/health` returns status `ok`.
- `/analyze` image requests fail fast with `503` if OCR provider is not ready.

## 2. Start Frontend

```bash
cd apps/frontend
TEAM_B_API_BASE_URL=http://127.0.0.1:8000 npm run dev -- --port 3000
```

Expected:
- Next.js starts.
- App available at `http://127.0.0.1:3000`.

## 3. Core Demo Flow

1. Open frontend at `http://127.0.0.1:3000`.
2. Fill required fields (zip, filter, cookware, diet, makeup).
3. Optionally set product name as `Teflon Pan`.
4. Click `View Results`.

Expected:
- Results page loads.
- Gauge, flags, decay chart, warnings, and mitigation sections render.
- No crash or blank page.

## 4. API Verification Calls (Optional, Fast)

### Backend health
```bash
curl http://127.0.0.1:8000/health
```

### Backend analyze success
```bash
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"product_name_hint":"Teflon Pan"}'
```

### Frontend proxy analyze
```bash
curl -X POST http://127.0.0.1:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"zipCode":"10001","productScan":"Teflon Pan","cookwareUse":{"brand":"Teflon","yearsOfUse":3},"filterModel":{"brand":"None","type":"none"},"dietHabits":{"fiberSources":["oats"],"foods":["rice"],"medications":[]},"makeUpUse":{"frequency":"weekly","productTypes":["mascara"]}}'
```

Expected:
- `200` success with Team B payload shape.
- On error, standardized envelope under `error` key.

### Backend analyze image path (real OCR required)
```bash
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"product_name_hint":"Bottle Label","image_base64":"dGVzdA=="}'
```

Expected:
- `503 SERVICE_UNAVAILABLE` with `OCR provider is not ready for analyze image processing` if OCR provider setup is missing.
- `200` when provider setup is valid.

## 5. Error Path Demo (Rate Limit)

Restart backend with low rate limit:

```bash
ANALYZE_RATE_LIMIT_PER_MINUTE=2 python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Call `/analyze` 3+ times quickly.

Expected:
- `429` response appears.
- `error.code` is `RATE_LIMITED`.

## 6. Metrics Proof

```bash
curl http://127.0.0.1:8000/metrics
```

Expected fields:
- `requests_total`
- `errors_total`
- `error_rate`
- `latency_ms_avg`
- `latency_ms_p95`

## 7. Recovery Script (If Demo Fails)

1. Restart backend.
2. Restart frontend.
3. Re-run `health` and one `analyze` call.
4. Show `request_id` from response/error to prove observability.
