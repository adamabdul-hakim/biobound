import base64
import binascii
import os
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Protocol

from app.core.config import settings


@dataclass
class OCRTextLine:
    text: str
    confidence: float


@dataclass
class OCRResult:
    raw_text: str
    text_blocks: list[OCRTextLine]
    labels: list[str]
    confidence: float
    provider: str


class OCRProvider(Protocol):
    name: str

    def extract(self, image_bytes: bytes, mime_type: str | None = None) -> OCRResult:
        ...


class MockOCRProvider:
    name = "mock"

    def extract(self, image_bytes: bytes, mime_type: str | None = None) -> OCRResult:
        _ = mime_type
        decoded = image_bytes.decode("utf-8", errors="ignore").strip() or "mock_ocr_text"
        line = OCRTextLine(text=decoded, confidence=0.75)
        return OCRResult(
            raw_text=decoded,
            text_blocks=[line],
            labels=[],
            confidence=0.75,
            provider=self.name,
        )


class GoogleVisionOCRProvider:
    name = "google"

    def extract(self, image_bytes: bytes, mime_type: str | None = None) -> OCRResult:
        _ = mime_type
        try:
            from google.cloud import vision  # type: ignore
        except Exception as exc:  # pragma: no cover - depends on optional dependency
            raise RuntimeError("google-cloud-vision is not installed") from exc

        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=image_bytes)

        text_response = client.text_detection(image=image)
        if text_response.error.message:
            raise RuntimeError(text_response.error.message)

        full_text = ""
        text_blocks: list[OCRTextLine] = []

        annotations = text_response.text_annotations or []
        if annotations:
            full_text = annotations[0].description or ""
            for item in annotations[1:]:
                text_blocks.append(
                    OCRTextLine(
                        text=item.description or "",
                        confidence=0.9,
                    )
                )

        label_response = client.label_detection(image=image)
        labels = [label.description for label in (label_response.label_annotations or [])]

        if not text_blocks and full_text:
            text_blocks = [OCRTextLine(text=full_text, confidence=0.9)]

        confidence = _average_confidence(text_blocks)
        return OCRResult(
            raw_text=full_text,
            text_blocks=text_blocks,
            labels=labels,
            confidence=confidence,
            provider=self.name,
        )


class TesseractOCRProvider:
    name = "tesseract"

    def extract(self, image_bytes: bytes, mime_type: str | None = None) -> OCRResult:
        _ = mime_type
        try:
            import pytesseract  # type: ignore
            from PIL import Image  # type: ignore
        except Exception as exc:  # pragma: no cover - depends on optional dependency
            raise RuntimeError("pytesseract and pillow are not installed") from exc

        image = Image.open(BytesIO(image_bytes))
        raw_text = pytesseract.image_to_string(image).strip()
        if raw_text:
            blocks = [
                OCRTextLine(text=line.strip(), confidence=0.65)
                for line in raw_text.splitlines()
                if line.strip()
            ]
        else:
            blocks = []

        return OCRResult(
            raw_text=raw_text,
            text_blocks=blocks,
            labels=[],
            confidence=_average_confidence(blocks),
            provider=self.name,
        )


def normalize_ocr_text(text: str) -> str:
    return " ".join(text.lower().split())


def extract_text_from_image(
    image_data: str | bytes | None,
    mime_type: str | None = None,
    provider_override: str | None = None,
    allow_mock_fallback: bool = True,
    strict_readiness: bool = False,
) -> OCRResult:
    image_bytes = _coerce_to_bytes(image_data)
    provider_names = _provider_order(provider_override, allow_mock_fallback)
    last_error: Exception | None = None

    for name in provider_names:
        if strict_readiness:
            try:
                assert_ocr_provider_ready(name)
            except Exception as exc:
                last_error = exc
                continue

        provider = _provider_by_name(name)
        try:
            return _run_with_retry_and_timeout(
                fn=lambda: provider.extract(image_bytes, mime_type),
                attempts=settings.ocr_retry_attempts,
                timeout_seconds=settings.ocr_timeout_seconds,
            )
        except Exception as exc:  # pragma: no cover - fallback path depends on env/provider
            last_error = exc

    error_message = f"Failed to run OCR with providers={provider_names}"
    if last_error is not None:
        error_message = f"{error_message}: {last_error}"
    raise RuntimeError(error_message)


def _provider_order(provider_override: str | None, allow_mock_fallback: bool) -> list[str]:
    selected = (provider_override or settings.ocr_provider or "google").lower()

    if selected == "mock" and not allow_mock_fallback:
        raise RuntimeError(
            "OCR provider 'mock' is not allowed for /analyze image processing. "
            "Set OCR_PROVIDER to 'google' or 'tesseract'."
        )

    order = [selected]
    if selected == "google" and settings.ocr_enable_fallback_tesseract:
        order.append("tesseract")
    if allow_mock_fallback:
        order.append("mock")
    # Remove duplicates while preserving order.
    return list(dict.fromkeys(order))


def assert_ocr_provider_ready(provider_name: str) -> None:
    name = provider_name.lower()

    if name == "google":
        _assert_google_ready()
        return

    if name == "tesseract":
        _assert_tesseract_ready()
        return

    if name == "mock":
        return

    raise RuntimeError(f"Unsupported OCR provider: {provider_name}")


def _assert_google_ready() -> None:
    try:
        from google.cloud import vision  # noqa: F401
    except Exception as exc:  # pragma: no cover - depends on optional dependency
        raise RuntimeError("google-cloud-vision is not installed") from exc

    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    if not credentials_path:
        raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS is not set")

    if not Path(credentials_path).exists():
        raise RuntimeError(
            f"GOOGLE_APPLICATION_CREDENTIALS file does not exist: {credentials_path}"
        )


def _assert_tesseract_ready() -> None:
    try:
        import pytesseract  # type: ignore
        from PIL import Image  # noqa: F401
    except Exception as exc:  # pragma: no cover - depends on optional dependency
        raise RuntimeError("pytesseract and pillow are not installed") from exc

    try:
        pytesseract.get_tesseract_version()
    except Exception as exc:  # pragma: no cover - depends on system installation
        raise RuntimeError("Tesseract binary is not available on PATH") from exc


def _provider_by_name(name: str) -> OCRProvider:
    providers: dict[str, OCRProvider] = {
        "google": GoogleVisionOCRProvider(),
        "tesseract": TesseractOCRProvider(),
        "mock": MockOCRProvider(),
    }
    if name not in providers:
        return providers["mock"]
    return providers[name]


def _run_with_retry_and_timeout(fn, attempts: int, timeout_seconds: float) -> OCRResult:
    attempts = max(1, attempts)
    timeout_seconds = max(0.1, timeout_seconds)
    last_error: Exception | None = None

    for _ in range(attempts):
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(fn)
            try:
                return future.result(timeout=timeout_seconds)
            except TimeoutError:
                last_error = TimeoutError(f"OCR timed out after {timeout_seconds}s")
                future.cancel()
            except Exception as exc:
                last_error = exc

    if last_error is None:
        raise RuntimeError("OCR failed with unknown error")
    raise RuntimeError(str(last_error))


def _average_confidence(lines: list[OCRTextLine]) -> float:
    if not lines:
        return 0.0
    return round(sum(line.confidence for line in lines) / len(lines), 3)


def _coerce_to_bytes(image_data: str | bytes | None) -> bytes:
    if image_data is None:
        return b""
    if isinstance(image_data, bytes):
        return image_data

    cleaned = image_data.strip()
    if cleaned.startswith("data:") and "," in cleaned:
        _, cleaned = cleaned.split(",", 1)
    try:
        return base64.b64decode(cleaned, validate=True)
    except binascii.Error:
        return cleaned.encode("utf-8")
