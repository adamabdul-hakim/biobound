# BioBound Team B Implementation Plan

## 1. Team Charter

Team B owns the core analysis engine for product PFAS risk detection and biological modeling. This document defines an incremental, production-style delivery plan that can be executed in small, testable slices while staying aligned with Team A integration needs.

## 2. Scope and Outcomes

### In Scope
- Image intake and OCR processing.
- Chemical term extraction and PFAS risk scoring.
- Biological decay simulation and medical warning logic.
- API contract consumed by Team A frontend.

### Out of Scope (for Team B)
- Frontend UI/UX implementation.
- Public policy letter generation.
- Zip code water map visualization.

### Success Criteria
- Team A can call `/analyze` with stable request/response schema.
- Risk scoring is deterministic and test-covered.
- Core endpoints meet reliability and latency goals.
- Safety warnings are surfaced when intervention logic applies.

## 3. Engineering Standards

### Branching and Change Management
- Use short-lived feature branches from `teamb`.
- PR required for every merge into `teamb`.
- Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`.

### Code Quality
- Lint and formatting enforced in CI.
- Type hints required for Python functions.
- No direct commits to protected shared branches.

### Testing Standards
- Unit tests for pure logic modules.
- Contract tests for `/analyze` schema.
- Integration tests for OCR + parser pipeline.
- Minimum target: 80% coverage for Team B-owned logic modules.

### Security and Privacy
- Validate file size, file type, and request payload limits.
- Do not persist raw images unless explicitly required.
- Keep API keys in environment variables only.

### Observability
- Structured logs with request IDs.
- Standard error envelope with stable error codes.
- Basic endpoint metrics: request count, latency, error rate.

## 4. Milestones and Incremental Phases

Each phase must end in a releasable state and include a demo to Team A.

## Phase 0: Project Setup and Contracts (Day 1)

### Goals
- Establish repository conventions and baseline service skeleton.
- Lock API handshake contract early.

### Tasks
1. Create service structure:
	- `app/main.py` (API entry)
	- `app/routes/analyze.py`
	- `app/core/config.py`
	- `app/models/schemas.py`
	- `app/services/` modules for OCR, parser, risk, decay
2. Define request/response schemas and versioning policy.
3. Add lint/test tooling and CI pipeline (run lint + tests on PR).
4. Add seed fixtures for ingredient labels and expected parse outputs.

### Deliverables
- Running service with health endpoint (`GET /health`).
- Stub `/analyze` endpoint returning schema-compliant placeholder data.
- CI checks passing.

### Exit Criteria
- Team A validates schema shape against frontend mock.
- PR template + contribution rules documented.

## Phase 1: Scanner Pipeline MVP (Day 2-3)

### Goals
- Ingest image input and return extracted raw text reliably.

### Tasks
1. Implement `POST /process-image`.
2. Add request validation:
	- max payload size
	- allowed mime types
	- base64 sanity checks
3. Integrate OCR provider adapter:
	- primary: Google Cloud Vision
	- fallback: Tesseract adapter interface (optional toggle)
4. Return normalized OCR text blocks with confidence metadata.
5. Add timeout and retry policy for OCR external calls.

### Deliverables
- OCR pipeline with unit tests (mock provider).
- Integration test with sample image fixture.

### Exit Criteria
- P95 OCR endpoint latency target met for test payloads.
- Graceful error response for unreadable/invalid images.

## Phase 2: PFAS Detection Engine v1 (Day 4-5)

### Goals
- Detect PFAS and PFAS-adjacent terms from OCR text.

### Tasks
1. Implement `pfas_hunter.py` with pattern modules:
	- direct PFAS terms
	- suffix/prefix heuristics
	- trade-name mapping dictionary
2. Build normalization pipeline:
	- lowercase, punctuation cleanup, OCR artifact correction
3. Produce scored matches with rationale:
	- matched term
	- rule source (regex/trade map)
	- confidence weight
4. Add deterministic ranking for top risk contributors.

### Deliverables
- `detect_chemicals(text)` returning structured match list.
- Unit test matrix with true positives/false positives/edge cases.

### Exit Criteria
- All baseline fixture cases pass.
- False positive regression suite added and green.

## Phase 3: Risk Scoring and REI Model (Day 6-7)

### Goals
- Convert detections into stable 0-100 risk scoring and REI.

### Tasks
1. Implement risk scoring formula with weighted components.
2. Add REI computation using frequency and exposure assumptions.
3. Create calibration config (`risk_weights.json`) to tune without code edits.
4. Implement confidence interval computation from OCR confidence + rule strength.
5. Add boundary conditions (min/max clamp, missing data behavior).

### Deliverables
- `calculate_risk_score()` with deterministic outputs.
- Config-driven weighting and calibration docs.

### Exit Criteria
- Score invariants validated in tests:
  - Score always between 0 and 100.
  - Same input yields same score.
  - Missing optional fields do not crash processing.

## Phase 4: Biological Decay Simulator (Day 8-9)

### Goals
- Provide exposure reduction projections with intervention logic.

### Tasks
1. Implement baseline model: `C(t) = C0 * e^(-k*t)`.
2. Add fixed assumptions document for `k` and half-life conversion.
3. Add dietary intervention flag behavior:
	- if enabled and safe, apply acceleration factor to `k`
4. Build medication interaction gate:
	- if interaction risk exists, include warning and suppress recommendation flag
5. Generate `decay_data` timeseries for standard horizons (e.g., year 0/4/8).

### Deliverables
- `simulate_decay()` and `evaluate_medical_warnings()` modules.
- Test cases for intervention/no-intervention/contraindication.

### Exit Criteria
- Medical warning behavior verified by contract tests.
- Decay curve output format stable and consumed by Team A mock.

## Phase 5: Unified `/analyze` Endpoint (Day 10)

### Goals
- Orchestrate end-to-end pipeline behind one stable endpoint.

### Tasks
1. Compose modules in order:
	- OCR -> Chemical Detection -> Risk Score -> Decay Simulation
2. Implement request correlation IDs and structured logs.
3. Add standardized error responses (4xx and 5xx).
4. Add contract version field in response metadata.

### Deliverables
- Production-like `/analyze` endpoint with full schema.
- End-to-end integration test hitting real route.

### Exit Criteria
- Team A integration smoke test passes.
- No P1 defects in combined path.

## Phase 6: Hardening and Release Readiness (Day 11-12)

### Goals
- Improve reliability, maintainability, and release confidence.

### Tasks
1. Add load smoke tests and timeout behavior verification.
2. Add basic rate limiting to protect OCR provider quota.
3. Improve logs and add dashboard-ready metrics export.
4. Finalize runbooks:
	- deployment steps
	- rollback steps
	- incident triage guide

### Deliverables
- Release checklist completed.
- Tagged release candidate for Team A UAT.

### Exit Criteria
- SLO checks pass in staging.
- Team B sign-off + Team A acceptance for API behavior.

## 5. API Contract (Team A Handshake)

`POST /analyze` response shape:

```json
{
  "product_name": "string",
  "detected_chemicals": ["string"],
  "risk_score": 0,
  "confidence_interval": 0.0,
  "decay_data": [
	 {"year": 2026, "level": 100},
	 {"year": 2030, "level": 70},
	 {"year": 2034, "level": 50}
  ],
  "medical_warnings": ["string"],
  "meta": {
	 "contract_version": "v1",
	 "request_id": "uuid"
  }
}
```

### Contract Rules
- `risk_score` is integer `0..100`.
- `confidence_interval` is float `0.0..1.0`.
- `detected_chemicals` may be empty but must be present.
- `medical_warnings` may be empty but must be present.

## 6. Definition of Done by Feature

For any Team B feature, DoD is met only when all are true:
- Code merged via PR with at least one review.
- Unit tests and CI checks pass.
- API/schema docs updated if behavior changes.
- Logs and error handling implemented.
- Demoed to Team A if interface-facing.

## 7. Risk Register and Mitigations

### Risk: OCR noise causes false detections
- Mitigation: normalization stage + confidence thresholds + curated false-positive tests.

### Risk: Third-party OCR outages or quota limits
- Mitigation: retry/backoff, rate limiting, fallback adapter strategy.

### Risk: Medical logic interpreted as personalized advice
- Mitigation: warning language + recommendation gating + disclaimers in response metadata/docs.

### Risk: Frontend/backend schema drift
- Mitigation: versioned contract tests run on each PR.

## 8. Team Cadence and Operating Model

### Daily Rhythm
- 15-minute standup: blockers, owner, next increment.
- End-of-day integration check on `teamb`.

### Weekly Rhythm
- Mid-week demo to Team A with latest endpoint behavior.
- Retro focused on defect leakage and cycle time.

### Suggested Roles
- API lead: route design, schema governance.
- Detection lead: PFAS parser and pattern tuning.
- Modeling lead: REI and decay simulator.
- QA lead: test fixtures, contract testing, regression.

## 9. Immediate Next Steps (Actionable)

1. Approve this plan and lock the Phase 0 contract section.
2. Create the baseline service skeleton and CI in `teamb`.
3. Implement `/health` and `/analyze` stub with contract tests.
4. Schedule Team A handshake review before Phase 1 OCR work begins.
