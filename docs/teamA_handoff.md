# Team A Handoff (Team B API)

This document provides copy-paste request/response examples for frontend integration.

## Base Endpoints
- `GET /health`
- `GET /metrics`
- `POST /process-image`
- `POST /analyze`
- `POST /analyze/process-image` (alias)

## Success: Analyze

Request:
```json
{
  "product_name_hint": "Teflon Pan",
  "image_base64": null
}
```

Example response (`200`):
```json
{
  "product_name": "Teflon Pan",
  "detected_chemicals": ["PTFE"],
  "risk_score": 46,
  "confidence_interval": 0.74,
  "decay_data": [
    {"year": 2026, "level": 46},
    {"year": 2030, "level": 18},
    {"year": 2034, "level": 7}
  ],
  "medical_warnings": [
    "This analysis is informational only and not a medical recommendation. Consult your healthcare provider."
  ],
  "meta": {
    "contract_version": "v1",
    "request_id": "e7f6d1a5-6f5f-4f0a-a2bc-6fcf7ec6b0c4"
  }
}
```

## Success: Process Image (Mock OCR)

Request:
```json
{
  "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/8/wHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "ocr_provider": "mock"
}
```

Example response (`200`):
```json
{
  "raw_text": "mock_ocr_text",
  "normalized_text": "mock_ocr_text",
  "text_blocks": [
    {
      "text": "mock_ocr_text",
      "normalized_text": "mock_ocr_text",
      "confidence": 0.75
    }
  ],
  "labels": [],
  "confidence": 0.75,
  "provider": "mock"
}
```

## Error Envelope (All non-2xx)

Shape:
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

Common codes:
- `VALIDATION_ERROR` (`422`)
- `RATE_LIMITED` (`429`)
- `INTERNAL_ERROR` (`500`)
- `INVALID_INPUT` (`400`)

## Example Errors

Validation (`422`):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "request_id": "c0f3b31e-6ce9-4f95-a2c8-2b12eb5e9cab",
    "details": [
      {
        "type": "string_type",
        "loc": ["body", "image_base64"],
        "msg": "Input should be a valid string",
        "input": {"not": "a string"}
      }
    ]
  }
}
```

Rate limit (`429`):
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Please retry later.",
    "request_id": "8859abf8-30c0-4c30-8a5c-88f4aeb7ca35"
  }
}
```

Server failure (`500`):
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "OCR processing failed",
    "request_id": "6712344a-e8ef-47a1-9f6b-30248fca001e"
  }
}
```

## Frontend Integration Notes
- `meta.request_id` is always present on successful `/analyze` responses.
- `x-request-id` response header is included for correlation.
- `detected_chemicals` and `medical_warnings` can be empty arrays.
- `risk_score` is bounded `0..100`, `confidence_interval` is `0.0..1.0`.
