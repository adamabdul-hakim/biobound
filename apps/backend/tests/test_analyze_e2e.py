"""End-to-end integration tests for Phase 5 /analyze endpoint.

Tests the full pipeline: OCR -> Detection -> Risk -> Decay -> Warnings.
"""

import json
from pathlib import Path
from unittest.mock import patch
from uuid import UUID

from fastapi.testclient import TestClient

from app.main import app
from app.services.ocr import OCRResult, OCRTextLine


def _load_fixture(name: str) -> dict:
    fixtures_dir = Path(__file__).parent / "fixtures"
    with open(fixtures_dir / name, encoding="utf-8") as file:
        return json.load(file)


def test_analyze_with_valid_product_hint() -> None:
    """Test happy path: valid image + product hint -> full response."""
    client = TestClient(app)

    response = client.post(
        "/analyze",
        json={"product_name_hint": "Non-Stick Frying Pan"},
    )

    assert response.status_code == 200
    body = response.json()

    # Verify response structure
    assert set(body.keys()) == {
        "product_name",
        "detected_chemicals",
        "risk_score",
        "rei_formula_version",
        "module_scores",
        "confidence_interval",
        "water_risk_score",
        "water_effective_ppt",
        "water_data_status",
        "filter_warning",
        "decay_data",
        "medical_warnings",
        "safety",
        "meta",
    }

    # Verify product name
    assert body["product_name"] == "Non-Stick Frying Pan"

    # Verify chemical detection
    assert isinstance(body["detected_chemicals"], list)

    # Verify risk score bounds
    assert isinstance(body["risk_score"], int)
    assert 0 <= body["risk_score"] <= 100
    assert body["module_scores"]["composite"] == body["risk_score"]
    assert body["rei_formula_version"].startswith("v2-module-weighted")
    assert 0 <= body["water_risk_score"] <= 100
    assert body["water_effective_ppt"] >= 0.0
    assert body["water_data_status"] in {"calculated", "no-data", "missing-zip"}

    # Verify confidence interval bounds
    assert isinstance(body["confidence_interval"], float)
    assert 0.0 <= body["confidence_interval"] <= 1.0

    # Verify decay data
    assert isinstance(body["decay_data"], list)
    assert len(body["decay_data"]) > 0
    for point in body["decay_data"]:
        assert "year" in point
        assert "level" in point
        assert isinstance(point["year"], int)
        assert isinstance(point["level"], int)

    # Verify medical warnings
    assert isinstance(body["medical_warnings"], list)
    assert "zero_cost_actions" in body["safety"]

    # Verify metadata with request correlation
    assert body["meta"]["contract_version"] == "v1"
    assert "request_id" in body["meta"]

    # Verify request_id is a valid UUID string
    try:
        UUID(body["meta"]["request_id"])
    except ValueError:
        assert False, "request_id is not a valid UUID"


def test_analyze_without_product_hint() -> None:
    """Test default handling: no product hint -> 'Unknown Product'."""
    client = TestClient(app)

    response = client.post("/analyze", json={})

    assert response.status_code == 200
    body = response.json()
    assert body["product_name"] == "Unknown Product"
    assert "request_id" in body["meta"]


def test_analyze_with_base64_image() -> None:
    """Test with actual base64 image input."""
    client = TestClient(app)

    # Simple 1x1 white PNG as base64
    sample_png_b64 = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4"
        "2mP8/8/wHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    )

    with patch(
        "app.routes.analyze.extract_text_from_image",
        return_value=OCRResult(
            raw_text="PTFE label",
            text_blocks=[OCRTextLine(text="PTFE label", confidence=0.9)],
            labels=[],
            confidence=0.9,
            provider="google",
        ),
    ):
        response = client.post(
            "/analyze",
            json={
                "image_base64": sample_png_b64,
                "product_name_hint": "Test Product",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["product_name"] == "Test Product"
    assert isinstance(body["detected_chemicals"], list)


def test_analyze_response_contract_versioning() -> None:
    """Test contract versioning compliance."""
    client = TestClient(app)

    response = client.post(
        "/analyze",
        json={"product_name_hint": "Test"},
    )

    assert response.status_code == 200
    body = response.json()

    # Contract version must be v1
    assert body["meta"]["contract_version"] == "v1"

    # Request ID must exist and be UUID format
    assert "request_id" in body["meta"]
    request_id = body["meta"]["request_id"]
    assert len(request_id.replace("-", "")) == 32  # UUID without dashes


def test_analyze_deterministic_output() -> None:
    """Test determinism: same input -> same risk score."""
    client = TestClient(app)

    payload = {"product_name_hint": "Test Product"}

    response1 = client.post("/analyze", json=payload)
    response2 = client.post("/analyze", json=payload)

    body1 = response1.json()
    body2 = response2.json()

    # Risk scores should be identical for same input
    assert body1["risk_score"] == body2["risk_score"]
    assert body1["confidence_interval"] == body2["confidence_interval"]

    # Request IDs should differ (new UUID each time)
    assert body1["meta"]["request_id"] != body2["meta"]["request_id"]


def test_analyze_decay_simulates_years() -> None:
    """Test decay simulation produces multi-year projections."""
    client = TestClient(app)

    response = client.post(
        "/analyze",
        json={"product_name_hint": "Non-Stick Product"},
    )

    assert response.status_code == 200
    body = response.json()

    decay_data = body["decay_data"]
    assert len(decay_data) > 0

    # Verify years are in ascending order
    years = [point["year"] for point in decay_data]
    assert years == sorted(years)

    # Verify level decreases over time (exponential decay)
    levels = [point["level"] for point in decay_data]
    for i in range(1, len(levels)):
        assert (
            levels[i] <= levels[i - 1]
        ), "Decay levels should not increase over time"


def test_analyze_chemicals_from_ocr() -> None:
    """Test that chemicals are extracted from OCR content."""
    client = TestClient(app)

    # Request with product hint that should match known chemicals
    response = client.post(
        "/analyze",
        json={"product_name_hint": "Teflon Pan"},  # Teflon is PFAS-related
    )

    assert response.status_code == 200
    body = response.json()

    # Check that chemicals were detected (including from hint)
    chemicals = body["detected_chemicals"]
    assert isinstance(chemicals, list)


def test_analyze_multiple_requests_correlation_ids() -> None:
    """Test that request IDs are unique across concurrent requests."""
    client = TestClient(app)

    request_ids = []
    for _ in range(5):
        response = client.post(
            "/analyze",
            json={"product_name_hint": "Test"},
        )
        body = response.json()
        request_ids.append(body["meta"]["request_id"])

    # All request IDs should be unique
    assert len(request_ids) == len(set(request_ids))


def test_analyze_full_orchestration_sequence() -> None:
    """Test that all pipeline stages execute in order."""
    client = TestClient(app)

    response = client.post(
        "/analyze",
        json={
            "product_name_hint": "Non-Stick Cookware",
        },
    )

    assert response.status_code == 200
    body = response.json()

    # Verify all output components exist (indicates full orchestration)
    assert body["product_name"] == "Non-Stick Cookware"
    assert isinstance(body["detected_chemicals"], list)
    assert 0 <= body["risk_score"] <= 100
    assert body["module_scores"]["composite"] == body["risk_score"]
    assert 0.0 <= body["confidence_interval"] <= 1.0
    assert 0 <= body["water_risk_score"] <= 100
    assert body["water_effective_ppt"] >= 0.0
    assert isinstance(body["decay_data"], list) and len(body["decay_data"]) > 0
    assert isinstance(body["medical_warnings"], list)
    assert "contraindications" in body["safety"]
    assert "request_id" in body["meta"]
    assert "contract_version" in body["meta"]


def test_analyze_backwards_compatibility_alias() -> None:
    """Test /analyze/process-image alias endpoint."""
    client = TestClient(app)

    response = client.post(
        "/analyze/process-image",
        json={"product_name_hint": "Test"},
    )

    # Alias should return same response structure
    assert response.status_code == 200
    body = response.json()
    assert "meta" in body
    assert "request_id" in body["meta"]
    assert body["meta"]["contract_version"] == "v1"


def test_analyze_uses_phase4_warning_logic() -> None:
    """Test Phase 5 wiring to Phase 4 medical warning evaluator."""
    client = TestClient(app)

    response = client.post(
        "/analyze",
        json={"product_name_hint": "PFOA PFOS PTFE"},
    )

    assert response.status_code == 200
    warnings = response.json()["medical_warnings"]
    assert isinstance(warnings, list)
    assert any("informational" in warning.lower() for warning in warnings)


def test_analyze_returns_400_for_invalid_input_type() -> None:
    """Test 4xx validation response shape for malformed payload type."""
    client = TestClient(app)

    response = client.post(
        "/analyze",
        json={"image_base64": {"not": "a string"}},
    )

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["message"] == "Request validation failed"
    assert "request_id" in body["error"]


def test_analyze_returns_500_on_ocr_failure() -> None:
    """Test standardized 5xx response when OCR stage raises runtime error."""
    client = TestClient(app)

    with patch("app.routes.analyze.extract_text_from_image", side_effect=RuntimeError("boom")):
        response = client.post(
            "/analyze",
            json={
                "product_name_hint": "Test",
                "image_base64": "invalid-but-present",
            },
        )

    assert response.status_code == 500
    body = response.json()
    assert body["error"]["code"] == "INTERNAL_ERROR"
    assert body["error"]["message"] == "OCR processing failed"
    assert "request_id" in body["error"]


def test_analyze_skips_ocr_when_image_missing() -> None:
    client = TestClient(app)

    with patch("app.routes.analyze.extract_text_from_image") as mock_extract:
        response = client.post("/analyze", json={"product_name_hint": "Text Only"})

    assert response.status_code == 200
    assert response.json()["product_name"] == "Text Only"
    mock_extract.assert_not_called()


def test_module2_scenarios_scanner_score_ordering() -> None:
    client = TestClient(app)

    no_scan = client.post(
        "/analyze",
        json={"product_name_hint": "Unknown"},
    )
    scan_only = client.post(
        "/analyze",
        json={"product_scan": "PTFE PFOA coated product"},
    )
    cookware_only = client.post(
        "/analyze",
        json={"cookware_use": {"brand": "75%", "years_of_use": 8}},
    )
    combined = client.post(
        "/analyze",
        json={
            "product_scan": "PTFE PFOA coated product",
            "cookware_use": {"brand": "75%", "years_of_use": 8},
        },
    )

    assert no_scan.status_code == 200
    assert scan_only.status_code == 200
    assert cookware_only.status_code == 200
    assert combined.status_code == 200

    no_scan_score = no_scan.json()["module_scores"]["scanner"]
    scan_only_score = scan_only.json()["module_scores"]["scanner"]
    cookware_only_score = cookware_only.json()["module_scores"]["scanner"]
    combined_score = combined.json()["module_scores"]["scanner"]

    assert scan_only_score >= no_scan_score
    assert cookware_only_score >= no_scan_score
    assert combined_score >= scan_only_score
    assert combined_score >= cookware_only_score


def test_analyze_golden_full_flow_fixture() -> None:
    client = TestClient(app)
    payload = _load_fixture("analyze_golden_payload.json")

    response = client.post("/analyze", json=payload)

    assert response.status_code == 200
    body = response.json()

    assert "risk_score" in body
    assert "filter_warning" in body
    assert "detected_chemicals" in body
    assert "decay_data" in body
    assert "medical_warnings" in body
    assert "module_scores" in body
    assert "safety" in body

    assert body["product_name"] == "Everyday Non-Stick Pan"
    assert isinstance(body["detected_chemicals"], list)
    assert len(body["detected_chemicals"]) > 0
    assert isinstance(body["decay_data"], list)
    assert len(body["decay_data"]) > 0
    assert isinstance(body["medical_warnings"], list)
    assert len(body["medical_warnings"]) > 0

    assert set(body["module_scores"].keys()) == {"hydrology", "scanner", "decay", "composite"}
    assert body["module_scores"]["composite"] == body["risk_score"]

    assert isinstance(body["safety"]["contraindications"], list)
    assert len(body["safety"]["contraindications"]) > 0
    assert body["safety"]["recommendation_safe"] is False
