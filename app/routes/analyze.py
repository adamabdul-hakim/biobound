from fastapi import APIRouter

from app.models.schemas import AnalyzeMeta, AnalyzeRequest, AnalyzeResponse
from app.services.decay import simulate_decay
from app.services.ocr import extract_text_from_image
from app.services.parser import detect_chemicals
from app.services.risk import calculate_risk_score

router = APIRouter(prefix="/analyze", tags=["analyze"])

PHASE_0_WARNING = (
    "Informational placeholder: medical review logic not enabled in phase 0."
)


@router.post("", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    ocr_result = extract_text_from_image(payload.image_base64)
    chemicals = detect_chemicals(ocr_result, payload.product_name_hint)
    risk_score, confidence = calculate_risk_score(chemicals)

    return AnalyzeResponse(
        product_name=payload.product_name_hint or "Unknown Product",
        detected_chemicals=chemicals,
        risk_score=risk_score,
        confidence_interval=confidence,
        decay_data=simulate_decay(),
        medical_warnings=[PHASE_0_WARNING],
        meta=AnalyzeMeta(),
    )


@router.post("/process-image", response_model=AnalyzeResponse)
def process_image(payload: AnalyzeRequest) -> AnalyzeResponse:
    # Alias endpoint for backwards compatibility with design doc
    return analyze(payload)
