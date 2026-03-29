from fastapi.testclient import TestClient

from app.main import app
from app.routes import analyze as analyze_route
from app.services.ocr import OCRResult


def _fake_ocr_result(text: str) -> OCRResult:
    return OCRResult(
        raw_text=text,
        text_blocks=[],
        labels=[],
        confidence=0.95,
        provider="google",
    )


def test_analyze_ocr_high_signal_increases_scanner_and_composite(monkeypatch) -> None:
    client = TestClient(app)

    def fake_extract_text_from_image(*args, **kwargs) -> OCRResult:
        _ = args, kwargs
        return _fake_ocr_result("PFOA PFOS PFHxS per-and-poly-fluoro-alkyl substances")

    monkeypatch.setattr(analyze_route, "extract_text_from_image", fake_extract_text_from_image)

    baseline = client.post("/analyze", json={"product_name_hint": "Unknown"})
    with_ocr = client.post(
        "/analyze",
        json={
            "product_name_hint": "Unknown",
            "image_base64": "fake-base64-data",
        },
    )

    assert baseline.status_code == 200
    assert with_ocr.status_code == 200

    baseline_body = baseline.json()
    ocr_body = with_ocr.json()

    assert ocr_body["module_scores"]["scanner"] > baseline_body["module_scores"]["scanner"]
    assert ocr_body["module_scores"]["composite"] > baseline_body["module_scores"]["composite"]
    assert "PFAS" in ocr_body["detected_chemicals"]


def test_analyze_ocr_non_pfas_text_keeps_scanner_low(monkeypatch) -> None:
    client = TestClient(app)

    def fake_extract_text_from_image(*args, **kwargs) -> OCRResult:
        _ = args, kwargs
        return _fake_ocr_result("Ceramic pan stainless steel lid dishwasher safe")

    monkeypatch.setattr(analyze_route, "extract_text_from_image", fake_extract_text_from_image)

    response = client.post(
        "/analyze",
        json={
            "image_base64": "fake-base64-data",
            "product_name_hint": "Unknown",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["module_scores"]["scanner"] == 0
    assert body["detected_chemicals"] == []


def test_analyze_ocr_trade_name_maps_to_ptfe(monkeypatch) -> None:
    client = TestClient(app)

    def fake_extract_text_from_image(*args, **kwargs) -> OCRResult:
        _ = args, kwargs
        return _fake_ocr_result("Gore-Tex liner and Tefal non-stick cookware")

    monkeypatch.setattr(analyze_route, "extract_text_from_image", fake_extract_text_from_image)

    response = client.post(
        "/analyze",
        json={
            "image_base64": "fake-base64-data",
            "product_name_hint": "Unknown",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert "PTFE" in body["detected_chemicals"]
    assert body["module_scores"]["scanner"] > 0
