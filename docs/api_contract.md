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

- Standardized error envelope for non-2xx:
  - `error.code`
  - `error.message`
  - `error.request_id`
  - `error.details` (optional)

- Observability endpoint:
  - `GET /metrics`
  - Returns request counts, error rate, latency aggregates, and status/path breakdown.

- Analyze endpoint protection:
  - `POST /analyze` has per-client in-memory rate limiting.
  - Exceeded requests return `429` with `error.code = RATE_LIMITED`.

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

## Error Envelope

Current non-2xx responses use this JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "request_id": "uuid",
    "details": []
  }
}
```

Known error codes:
- `INVALID_INPUT` (`400`)
- `VALIDATION_ERROR` (`422`)
- `RATE_LIMITED` (`429`)
- `INTERNAL_ERROR` (`500`)

Additional codes may be returned for other status classes (`401/403/404/409`).
