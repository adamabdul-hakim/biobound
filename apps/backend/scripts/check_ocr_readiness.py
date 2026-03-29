"""Quick readiness check for OCR providers used by /analyze image processing."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.services.ocr import assert_ocr_provider_ready


def main() -> int:
    provider = settings.ocr_provider

    if provider == "mock":
        print(
            "FAIL: OCR_PROVIDER=mock is not allowed for /analyze image processing. "
            "Use OCR_PROVIDER=google or OCR_PROVIDER=tesseract."
        )
        return 1

    try:
        assert_ocr_provider_ready(provider)
    except Exception as exc:
        print(f"FAIL: OCR provider '{provider}' is not ready: {exc}")
        return 1

    print(f"OK: OCR provider '{provider}' is ready for /analyze image processing.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
