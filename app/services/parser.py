from app.services.ocr import OCRResult
from app.services.pfas_hunter import detect_chemicals_scored, rank_top_risk_contributors


def detect_chemicals(ocr_result: OCRResult, product_name_hint: str | None = None) -> list[str]:
    """
    Detect chemical terms from OCR result.

    Combines OCR text with optional product name hint and returns ranked list of detected chemicals.
    """
    text = ocr_result.raw_text
    if product_name_hint:
        text += " " + product_name_hint

    if not text:
        return []

    matches = detect_chemicals_scored(text)
    if not matches:
        return []

    # Return deterministically ranked top chemicals
    return rank_top_risk_contributors(matches)
