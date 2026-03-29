from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.gemini_estimator import analyze_receipt_items, estimate_pfas_by_zip, get_pfas_recommendations

router = APIRouter(prefix="/estimate", tags=["estimate"])


@router.get("/pfas")
def estimate_pfas(zip_code: str = Query(..., description="ZIP code to estimate PFAS for")):
    try:
        result = estimate_pfas_by_zip(zip_code)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Estimation failed: {e}") from e


class RecommendationsRequest(BaseModel):
    rei_score: int
    filter_type: str | None = None
    cookware_pct: int = 0
    cookware_years: int = 0
    diet_raising_count: int = 0
    diet_reducing_count: int = 0
    has_children: bool = False
    children_crawl: bool = False
    zip_code: str | None = None


@router.post("/recommendations")
def get_recommendations(body: RecommendationsRequest):
    try:
        result = get_pfas_recommendations(
            rei_score=body.rei_score,
            filter_type=body.filter_type,
            cookware_pct=body.cookware_pct,
            cookware_years=body.cookware_years,
            diet_raising_count=body.diet_raising_count,
            diet_reducing_count=body.diet_reducing_count,
            has_children=body.has_children,
            children_crawl=body.children_crawl,
            zip_code=body.zip_code,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendations failed: {e}") from e


class ScanReceiptRequest(BaseModel):
    image_base64: str | None = None
    raw_text: str | None = None


@router.post("/scan-receipt")
def scan_receipt(body: ScanReceiptRequest):
    """OCR an image or analyze raw text for per-item PFAS levels via Gemini.

    Accepts either:
    - image_base64: base64-encoded image (data URI or raw) — OCR is run first
    - raw_text: pre-extracted text (receipt paste, manual entry)

    Returns a list of identified items with pfas_level, ppt_estimate, reason, category.
    """
    from app.services.ocr import extract_text_from_image

    ocr_text = (body.raw_text or "").strip()

    if body.image_base64 and not ocr_text:
        try:
            ocr_result = extract_text_from_image(
                body.image_base64,
                allow_mock_fallback=True,
            )
            ocr_text = ocr_result.raw_text
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OCR processing failed: {e}") from e

    if not ocr_text:
        raise HTTPException(
            status_code=422,
            detail="No text could be extracted. Provide image_base64 or raw_text.",
        )

    try:
        result = analyze_receipt_items(ocr_text)
        return {**result, "ocr_text": ocr_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PFAS analysis failed: {e}") from e
