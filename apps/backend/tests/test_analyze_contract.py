from fastapi.testclient import TestClient

from app.main import app


def test_analyze_contract_shape() -> None:
    client = TestClient(app)
    response = client.post("/analyze", json={"product_name_hint": "Sample Pan"})

    body = response.json()
    assert response.status_code == 200
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

    assert body["product_name"] == "Sample Pan"
    assert isinstance(body["detected_chemicals"], list)
    assert 0 <= body["risk_score"] <= 100
    assert body["rei_formula_version"].startswith("v2-module-weighted")
    assert set(body["module_scores"].keys()) == {"hydrology", "scanner", "decay", "composite"}
    assert body["module_scores"]["composite"] == body["risk_score"]
    assert 0.0 <= body["confidence_interval"] <= 1.0
    assert 0 <= body["water_risk_score"] <= 100
    assert body["water_effective_ppt"] >= 0.0
    assert body["water_data_status"] in {"calculated", "no-data", "missing-zip"}
    assert isinstance(body["medical_warnings"], list)
    assert set(body["safety"].keys()) == {
        "contraindications",
        "recommendation_safe",
        "equity_adjustments_applied",
        "zero_cost_actions",
    }

    assert body["meta"]["contract_version"] == "v1"
    assert "request_id" in body["meta"]


def test_analyze_defaults_without_hint() -> None:
    client = TestClient(app)
    response = client.post("/analyze", json={})

    assert response.status_code == 200
    assert response.json()["product_name"] == "Unknown Product"


def test_analyze_accepts_contract_v2_payload() -> None:
    client = TestClient(app)
    response = client.post(
        "/analyze",
        json={
            "zip_code": "12345",
            "product_scan": "Acme Pan",
            "cookware_use": {"brand": "50%", "years_of_use": 3},
            "filter_model": {"brand": "Test", "type": "NSF-53"},
            "diet_habits": {
                "fiber_sources": ["oats"],
                "foods": ["processed foods"],
                "medications": ["none"],
            },
            "make_up_use": {
                "frequency": "weekly",
                "product_types": ["foundation"],
            },
            "product_name_hint": "Sample Pan",
        },
    )

    assert response.status_code == 200
    assert response.json()["product_name"] == "Sample Pan"


def test_analyze_rejects_invalid_zip_code_in_v2_payload() -> None:
    client = TestClient(app)
    response = client.post(
        "/analyze",
        json={
            "zip_code": "12",
            "product_name_hint": "Sample Pan",
        },
    )

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_analyze_sets_filter_warning_from_hydrology_module() -> None:
    client = TestClient(app)
    response = client.post(
        "/analyze",
        json={
            "zip_code": "10006",
            "filter_model": {"brand": "None", "type": "none"},
            "product_name_hint": "Sample Pan",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["filter_warning"] is not None
    assert body["water_data_status"] == "calculated"


def test_analyze_scanner_score_changes_with_product_scan_text() -> None:
    client = TestClient(app)

    without_scan = client.post(
        "/analyze",
        json={"product_name_hint": "Unknown"},
    )
    with_scan = client.post(
        "/analyze",
        json={"product_name_hint": "Unknown", "product_scan": "PTFE coated pan PFOA"},
    )

    assert without_scan.status_code == 200
    assert with_scan.status_code == 200
    assert with_scan.json()["module_scores"]["scanner"] >= without_scan.json()["module_scores"]["scanner"]


def test_analyze_scanner_score_changes_with_cookware_use() -> None:
    client = TestClient(app)

    low_exposure = client.post(
        "/analyze",
        json={
            "product_scan": "non-stick pan",
            "cookware_use": {"brand": "10%", "years_of_use": 1},
        },
    )
    high_exposure = client.post(
        "/analyze",
        json={
            "product_scan": "non-stick pan",
            "cookware_use": {"brand": "100%", "years_of_use": 10},
        },
    )

    assert low_exposure.status_code == 200
    assert high_exposure.status_code == 200
    assert high_exposure.json()["module_scores"]["scanner"] >= low_exposure.json()["module_scores"]["scanner"]
