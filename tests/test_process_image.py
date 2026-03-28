import base64
import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


def test_process_image_success_with_data_url_mock_provider() -> None:
    client = TestClient(app)
    sample = base64.b64encode(b"PTFE-coated pan label").decode("utf-8")

    response = client.post(
        "/process-image",
        json={
            "image_base64": f"data:image/png;base64,{sample}",
            "ocr_provider": "mock",
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body["provider"] == "mock"
    assert body["raw_text"]
    assert body["normalized_text"] == body["raw_text"].lower()
    assert isinstance(body["text_blocks"], list)
    assert 0.0 <= body["confidence"] <= 1.0


def test_process_image_rejects_invalid_base64() -> None:
    client = TestClient(app)
    response = client.post(
        "/process-image",
        json={
            "image_base64": "data:image/png;base64,not-valid-base64***",
            "ocr_provider": "mock",
        },
    )

    assert response.status_code == 422
    assert "Invalid base64" in response.json()["detail"]


def test_process_image_rejects_unsupported_mime_type() -> None:
    client = TestClient(app)
    sample = base64.b64encode(b"label").decode("utf-8")
    response = client.post(
        "/process-image",
        json={
            "image_base64": f"data:image/gif;base64,{sample}",
            "ocr_provider": "mock",
        },
    )

    assert response.status_code == 422
    assert "Unsupported mime_type" in response.json()["detail"]


def test_process_image_integration_fixture_payload() -> None:
    client = TestClient(app)
    fixture_path = Path("tests/fixtures/process_image_payload.json")
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))[0]

    response = client.post("/process-image", json=fixture["request"])
    body = response.json()

    assert response.status_code == 200
    assert fixture["expected"]["provider"] == body["provider"]
    assert fixture["expected"]["normalized_contains"] in body["normalized_text"]
