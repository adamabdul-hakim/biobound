"""Quick readiness check for OCR providers used by /analyze image processing."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.services.ocr import assert_ocr_provider_ready


def _resolve_providers(selection: str) -> list[str]:
    if selection == "all":
        return ["google", "tesseract"]

    if selection == "current":
        provider = settings.ocr_provider
        if provider == "mock":
            return ["mock"]
        return [provider]

    return [selection]


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--provider",
        choices=["current", "google", "tesseract", "all"],
        default="current",
        help="Provider to validate (default: current OCR_PROVIDER value)",
    )
    return parser


def main() -> int:
    parser = _build_parser()
    args = parser.parse_args()
    providers = _resolve_providers(args.provider)

    if providers == ["mock"]:
        print(
            "FAIL: OCR_PROVIDER=mock is not allowed for /analyze image processing. "
            "Use OCR_PROVIDER=google or OCR_PROVIDER=tesseract."
        )
        return 1

    failures: list[tuple[str, str]] = []
    for provider in providers:
        try:
            assert_ocr_provider_ready(provider)
            print(f"OK: OCR provider '{provider}' is ready.")
        except Exception as exc:
            failures.append((provider, str(exc)))
            print(f"FAIL: OCR provider '{provider}' is not ready: {exc}")

    if failures:
        print("\nAction hints:")
        for provider, reason in failures:
            if provider == "google":
                print(
                    "- Google Vision: install extras with `pip install -e .[ocr-google]` "
                    "and set GOOGLE_APPLICATION_CREDENTIALS to a valid service-account JSON path."
                )
                if "does not exist" in reason.lower() or "not set" in reason.lower():
                    print("  Verify the credentials file path and environment variable value.")
            elif provider == "tesseract":
                print(
                    "- Tesseract: install Python extras with `pip install -e .[ocr-tesseract]` "
                    "and install the Tesseract binary on your OS PATH."
                )
            else:
                print(f"- {provider}: {reason}")
        return 1

    print("All requested OCR readiness checks passed for /analyze image processing.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
