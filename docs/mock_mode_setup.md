# Mock OCR Setup (Current Team Workflow)

Use this mode for local development and Team A integration when cloud APIs are not configured.

## Why mock mode
- No Google Cloud setup required.
- Deterministic local behavior for quick iteration.
- Full `/analyze` contract remains available.

## Environment
Set the following variables (or copy from `apps/backend/.env.example`):

- `OCR_PROVIDER=mock`
- `OCR_TIMEOUT_SECONDS=2.0`
- `OCR_RETRY_ATTEMPTS=2`
- `OCR_ENABLE_FALLBACK_TESSERACT=true`
- `ANALYZE_RATE_LIMIT_PER_MINUTE=60`

## Quick verification
1. Start the API.
2. Call `POST /process-image` with any base64 payload and `ocr_provider=mock`.
3. Confirm response contains `provider: "mock"`.
4. Call `POST /analyze` and verify:
   - success payload contains `meta.contract_version` and `meta.request_id`
   - errors (if any) use the `error` envelope
5. Call `GET /metrics` and confirm counters are present.

## Team A handoff note
Team A can integrate against mock mode now; switching to Google OCR later should not break response shape.
