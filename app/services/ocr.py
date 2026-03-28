from dataclasses import dataclass


@dataclass
class OCRResult:
    raw_text: str
    confidence: float


def extract_text_from_image(_: str | None) -> OCRResult:
    return OCRResult(raw_text="", confidence=0.0)
