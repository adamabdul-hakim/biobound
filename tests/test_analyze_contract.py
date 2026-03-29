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
        "confidence_interval",
        "decay_data",
        "medical_warnings",
        "meta",
    }

    assert body["product_name"] == "Sample Pan"
    assert isinstance(body["detected_chemicals"], list)
    assert 0 <= body["risk_score"] <= 100
    assert 0.0 <= body["confidence_interval"] <= 1.0
    assert isinstance(body["medical_warnings"], list)

    assert body["meta"]["contract_version"] == "v1"
    assert "request_id" in body["meta"]


def test_analyze_defaults_without_hint() -> None:
    client = TestClient(app)
    response = client.post("/analyze", json={})

    assert response.status_code == 200
    assert response.json()["product_name"] == "Unknown Product"
