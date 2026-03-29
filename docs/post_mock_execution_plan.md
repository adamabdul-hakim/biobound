# Post-Mock Execution Plan (Teammate Update)

Branch: `planning/post-mock-next-steps`  
Updated: 2026-03-28

## Objective

Ship a demo-ready build where `/analyze` is backend-owned and aligned with the architecture:
- Module 1 Hydrology (EPA + filter verification)
- Module 2 Forensic Scanner (scan + cookware)
- Module 3 Bio-Decay (diet + meds)
- REI Engine composition
- Safety layer outputs

## Completed So Far

1. Contract v2 input wiring is live end-to-end.
- Frontend proxy forwards `zipCode`, `productScan`, `cookwareUse`, `filterModel`, `dietHabits`, `makeUpUse`.
- Backend request schema accepts full payload.

2. Frontend no longer uses local preview scoring for primary REI.
- Score path is backend-driven.

3. Hydrology module is backend-owned.
- Added backend EPA dataset mapping and filter warning output.
- Added hydrology tests.

4. OCR path hardened for analyze image flow.
- No mock fallback for `/analyze` image processing.
- Readiness checks added for Google/Tesseract.
- Readiness helper script added: `apps/backend/scripts/check_ocr_readiness.py`.

5. REI transparency contract added.
- `/analyze` now returns `rei_formula_version`, `module_scores`, and `safety` object.

## Remaining Concrete Steps

### Step 2: Complete Module 2 Signal Ownership (Scanner + Cookware)
Owner: Backend  
ETA: 0.5 day

Tasks:
- Use `product_scan` and `cookware_use` directly in detection/scoring input assembly.
- Add cookware-derived exposure modifier (frequency/years) in scanner module score.
- Keep `product_name_hint` as optional fallback only.

Definition of done:
- Changing `cookware_use` materially changes `module_scores.scanner`.
- Contract and e2e tests cover no-scan, scan-only, cookware-only, and combined paths.

### Step 3: Complete Module 3 Signal Ownership (Diet + Meds)
Owner: Backend  
ETA: 0.5 day

Tasks:
- Move decay and intervention modifiers to explicit diet/medication inputs.
- Convert current placeholder contraindication logic into deterministic rules table.
- Ensure `safety.contraindications` and `medical_warnings` are consistent.

Definition of done:
- `diet_habits.fiber_sources` and `medications` change `module_scores.decay` and warnings.
- Unit tests for diet-only, meds-only, and conflicting scenarios.

### Step 4: NSF Data Integration (Hydrology completion)
Owner: Backend  
ETA: 0.5 day

Tasks:
- Add local `nsf_certifications.json` source file.
- Implement lookup service by `filterModel.brand/type`.
- Replace simple type-only check with dataset-backed determination.

Definition of done:
- Filter warning logic uses certification data lookup.
- Regression tests cover certified, uncertified, and unknown filters.

### Step 5: Golden Flow Test (Architecture Proof)
Owner: Backend + Frontend  
ETA: 0.25 day

Tasks:
- Add a single golden payload fixture that exercises all inputs.
- Assert architecture-level outputs are present:
  - `risk_score`
  - `filter_warning`
  - `detected_chemicals`
  - `decay_data`
  - `medical_warnings`
  - `module_scores`
  - `safety`

Definition of done:
- One integration test can be shown to judges as “full flow validation”.

### Step 6: CI Guardrails (prevent drift)
Owner: DevOps/Repo maintainer  
ETA: 0.25 day

Tasks:
- Ensure frontend lint+build runs in CI under `apps/frontend`.
- Add backend test command and optional smoke check in CI.

Definition of done:
- PRs fail if frontend or backend contract drifts.

## 48-Hour Execution Sequence

1. Finish Step 2 (Module 2 ownership).
2. Finish Step 3 (Module 3 ownership).
3. Finish Step 4 (NSF dataset-backed filter verification).
4. Add Step 5 golden flow test.
5. Add Step 6 CI guardrails.
6. Re-run demo script and update handoff docs.

## Validation Commands

Backend:
```bash
cd apps/backend
python -m pytest -q
python scripts/check_ocr_readiness.py
```

Frontend:
```bash
cd apps/frontend
npm run lint
npm run build
```

## Teammate Status Template

Use this in standup/Slack updates:

```text
Block: Step X - <name>
Owner: <name>
Status: <not started|in progress|done>
PR/Commit: <link>
Risk: <none|short description>
Next action: <single concrete action>
```
