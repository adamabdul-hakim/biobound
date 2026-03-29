# Post-Mock Execution Plan

Branch: `planning/post-mock-next-steps`

This plan is derived from:
- `designdoc_A.md`
- `designdoc_B.md`
- `REAMDE.md`
- existing docs under `docs/`

## Current Gap Summary

1. Frontend and backend are integrated, but input payload is still reduced before reaching Team B (`zip/filter/diet/cookware/makeup` are not fully used by backend scoring).
2. Hydrology Sentinel (EPA + NSF verification) is still effectively frontend-local/partial, not a robust backend module with contract-tested output.
3. OCR is currently mock-first; Google Vision production path is not operationally validated in this repo state.
4. Team A design includes `makeUpUse`, but current integrated payload/store contract does not fully implement it end-to-end.
5. External data ingestion flows (EPA UCMR5 refresh, NSF source sync) are not productionized.

## Priority 0 (Immediate, 2-4 hours)

### 1) Lock integrated request contract v2 (frontend + backend)
- Define canonical request schema that includes all design doc inputs:
  - `zipCode`
  - `productScan`
  - `cookwareUse`
  - `filterModel`
  - `dietHabits`
  - `makeUpUse`
- Files to update:
  - `apps/backend/app/models/schemas.py`
  - `apps/frontend/src/app/api/analyze/route.ts`
  - `apps/frontend/src/lib/analyzeIntegration.ts`
- Add contract tests for required/optional handling.

### 2) Stop dropping context in frontend proxy
- Current proxy sends mostly `product_name_hint` and optional `image_base64`.
- Map full frontend payload to backend analyze request fields.
- Add request validation and clear `422` errors for missing/invalid fields.

### 3) Add makeUpUse to Team A state and submit flow
- Add state + form capture + submit wiring.
- Files likely impacted:
  - `apps/frontend/src/store/appStore.ts`
  - `apps/frontend/src/components/inputs/InputForm.tsx`
  - add/update input component for makeup use.

## Priority 1 (Core Features, 4-8 hours)

### 4) Implement Hydrology Sentinel as backend module
- Create backend service for water/filter risk:
  - Input: `zipCode`, `filterModel`
  - Output: water risk contribution + filter warning
- Move scoring source of truth from frontend-only fallback to backend.
- Add endpoint if needed (`/water-risk`) or fully embed in `/analyze` orchestration.

### 5) EPA dataset pipeline hardening
- Keep static JSON for hackathon runtime reliability, but add explicit ingest/update script.
- Add script + docs:
  - source normalization
  - missing-zip behavior
  - deterministic mapping rules
- Validate with fixtures and regression tests.

### 6) NSF filter verification dataset integration
- Add local certification map or source sync job.
- Ensure filter warning logic is deterministic and tested.

## Priority 2 (Production Readiness, 3-6 hours)

### 7) Real OCR path operationalization
- Keep `mock` default for demos, but validate Google path in staging mode:
  - env var configuration
  - auth path check
  - timeout/retry behavior
- Add explicit smoke checklist for `OCR_PROVIDER=google`.

### 8) Observability completion
- Extend `/metrics` with stage-level counters if feasible.
- Ensure `request_id` is surfaced in frontend errors consistently.
- Add dashboard query cookbook in docs.

### 9) CI split for monorepo
- Keep backend CI current.
- Add frontend CI job (`apps/frontend` lint/build) to prevent drift.
- Add integration smoke script in CI for `/api/analyze` proxy contract.

## Priority 3 (Submission/Final Polish, 1-3 hours)

### 10) Submission-ready release closure
- Confirm demo script on latest main:
  - success path
  - 429 path
  - backend unreachable path
- Tag final release only after above gaps are resolved.
- Update:
  - `docs/teamA_handoff.md`
  - `docs/demo_run_sheet.md`
  - `docs/api_contract.md`

## Suggested Execution Order

1. Contract v2 schema + full payload wiring
2. makeUpUse end-to-end
3. Hydrology backend module + EPA/NSF contribution into `/analyze`
4. tests + CI updates
5. Google OCR operational smoke (non-blocking for demo)
6. final docs + release

## Definition of "Done" for Post-Mock Shift

- No critical scoring logic depends on frontend-only mock behavior.
- `/analyze` uses full user context from Team A input payload.
- EPA/NSF risk contributions are backend-owned and tested.
- Frontend/Backend CI both green.
- Demo run sheet validated on current `main`.
