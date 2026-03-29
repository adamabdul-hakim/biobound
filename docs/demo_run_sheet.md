# Demo Run Sheet (Post-Integration)

Use this during hackathon demo to prove full stack integration quickly.

## Preconditions
- Branch: `planning/post-mock-next-steps` (merge target: `main`)
- Backend path: `apps/backend`
- Frontend path: `apps/frontend`

## Latest Rehearsal Snapshot (2026-03-28)

- Backend health check returned `200 OK`.
- Backend `/analyze` with full payload returned `200` and architecture outputs (`risk_score`, `module_scores`, `safety`, `decay_data`, `medical_warnings`).
- Frontend `/api/analyze` proxy returned `200` with the same response shape.
- Golden flow test passed: `pytest -q tests/test_analyze_e2e.py -k golden`.
- Image analyze path returned `503 SERVICE_UNAVAILABLE` as expected because real OCR provider credentials were not configured.

Real OCR prerequisite:
- Set `GOOGLE_APPLICATION_CREDENTIALS` to a valid service-account file and ensure OCR dependencies are installed before image demo path.

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

If readiness fails, this is currently expected in local environments without OCR setup:
- `FAIL: OCR provider 'google' is not ready: GOOGLE_APPLICATION_CREDENTIALS is not set`

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
  -d '{"zip_code":"10006","product_scan":"PTFE coated pan PFOA","cookware_use":{"brand":"80%","years_of_use":6},"filter_model":{"brand":"Brita Elite","type":"NSF-53"},"diet_habits":{"fiber_sources":["oats","beans","psyllium husk"],"foods":["organic produce","processed foods"],"medications":["statins"]},"make_up_use":{"frequency":"daily","product_types":["foundation"]},"product_name_hint":"Everyday Non-Stick Pan"}'
```

### Frontend proxy analyze
```bash
curl -X POST http://127.0.0.1:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"zipCode":"10006","productScan":"PTFE coated pan PFOA","cookwareUse":{"brand":"80%","yearsOfUse":6},"filterModel":{"brand":"Brita Elite","type":"NSF-53"},"dietHabits":{"fiberSources":["oats","beans","psyllium husk"],"foods":["organic produce","processed foods"],"medications":["statins"]},"makeUpUse":{"frequency":"daily","productTypes":["foundation"]},"productNameHint":"Everyday Non-Stick Pan"}'
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

## 4.5 Golden Flow Proof

```bash
cd apps/backend
python -m pytest -q tests/test_analyze_e2e.py -k golden
```

Expected:
- `1 passed`.

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
