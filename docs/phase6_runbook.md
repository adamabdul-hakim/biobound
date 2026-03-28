# Phase 6 Runbook

## Deployment Steps
1. Ensure branch is green in CI (`ruff` + `pytest`).
2. Build and publish container/image artifact for target environment.
3. Set environment variables:
   - `OCR_PROVIDER`
   - `OCR_TIMEOUT_SECONDS`
   - `OCR_RETRY_ATTEMPTS`
   - `ANALYZE_RATE_LIMIT_PER_MINUTE`
4. Deploy service and verify `/health` returns `status=ok`.
5. Validate `/metrics` reports request counters and latency fields.

## Rollback Steps
1. Re-deploy previous known-good artifact tag.
2. Verify `/health` and `/analyze` response schema.
3. Compare `/metrics` error rate before/after rollback.
4. Notify Team A that rollback completed and API behavior is restored.

## Incident Triage Guide
1. Confirm symptom:
   - Elevated 5xx
   - Elevated 429
   - OCR timeout spikes
2. Check `/metrics`:
   - `error_rate`
   - `latency_ms_p95`
   - `by_status`
3. Correlate by `x-request-id` header and application logs.
4. Mitigate:
   - Reduce OCR timeout/retries if saturation occurs.
   - Temporarily increase `ANALYZE_RATE_LIMIT_PER_MINUTE` if quota allows.
   - Switch OCR provider fallback strategy as needed.
5. Recover and document incident with timeline and root cause.
