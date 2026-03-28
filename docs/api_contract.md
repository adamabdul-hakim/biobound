# Team B API Contract and Versioning Policy

## Current Contract

- Endpoint: `POST /analyze`
- Contract version: `v1`
- Response includes:
  - `product_name`
  - `detected_chemicals`
  - `risk_score`
  - `confidence_interval`
  - `decay_data`
  - `medical_warnings`
  - `meta.contract_version`
  - `meta.request_id`

## Versioning Policy

- Contract version is declared in `meta.contract_version`.
- Backward-compatible additions within `v1` are allowed:
  - adding optional fields
  - improving field descriptions
- Breaking changes require a new contract version (`v2`) and Team A sign-off:
  - removing or renaming existing fields
  - changing data types
  - changing required/optional status incompatibly

## Change Process

1. Update schema definitions in `app/models/schemas.py`.
2. Update contract tests in `tests/test_analyze_contract.py`.
3. Update this document with behavior details.
4. Mark API impact in PR template and request Team A review.

## Error Envelope (Planned)

Phase 0 provides baseline success payloads.
Standardized error envelope and stable error codes are planned for later phases.
