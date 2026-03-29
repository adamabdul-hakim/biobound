import time
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.metrics import metrics_collector
from app.core.rate_limit import analyze_rate_limiter
from app.main import app


def test_metrics_endpoint_exports_dashboard_fields() -> None:
    client = TestClient(app)
    metrics_collector.clear()

    client.get("/health")
    response = client.get("/metrics")

    assert response.status_code == 200
    body = response.json()
    assert "requests_total" in body
    assert "errors_total" in body
    assert "error_rate" in body
    assert "latency_ms_avg" in body
    assert "latency_ms_p95" in body
    assert "by_path" in body
    assert "by_status" in body


def test_analyze_rate_limit_returns_429() -> None:
    client = TestClient(app)
    analyze_rate_limiter.clear()

    with patch("app.routes.analyze.settings.analyze_rate_limit_per_minute", 2):
        first = client.post("/analyze", json={"product_name_hint": "A"})
        second = client.post("/analyze", json={"product_name_hint": "B"})
        third = client.post("/analyze", json={"product_name_hint": "C"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert third.status_code == 429
    payload = third.json()
    assert payload["error"]["code"] == "RATE_LIMITED"
    assert "request_id" in payload["error"]


def test_analyze_timeout_path_returns_500_envelope() -> None:
    client = TestClient(app)

    with patch(
        "app.routes.analyze.extract_text_from_image",
        side_effect=RuntimeError("OCR timed out after 0.01s"),
    ):
        response = client.post("/analyze", json={"product_name_hint": "Slow OCR"})

    assert response.status_code == 500
    body = response.json()
    assert body["error"]["code"] == "INTERNAL_ERROR"
    assert body["error"]["message"] == "OCR processing failed"


def test_load_smoke_analyze_multiple_requests() -> None:
    client = TestClient(app)
    analyze_rate_limiter.clear()

    with patch("app.routes.analyze.settings.analyze_rate_limit_per_minute", 1000):
        start = time.perf_counter()
        statuses = []
        for i in range(30):
            response = client.post("/analyze", json={"product_name_hint": f"Product-{i}"})
            statuses.append(response.status_code)
        elapsed_ms = (time.perf_counter() - start) * 1000

    assert all(code == 200 for code in statuses)
    # Basic smoke threshold; keeps this stable in CI without being brittle.
    assert elapsed_ms < 5000
