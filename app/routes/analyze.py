import json
import logging
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.core.config import settings
from app.core.rate_limit import analyze_rate_limiter
from app.models.schemas import AnalyzeMeta, AnalyzeRequest, AnalyzeResponse
from app.services.decay import evaluate_medical_warnings, simulate_decay
from app.services.ocr import extract_text_from_image
from app.services.pfas_hunter import detect_chemicals_scored
from app.services.risk import calculate_risk_score

router = APIRouter(prefix="/analyze", tags=["analyze"])
logger = logging.getLogger(__name__)


def _log_request(
    request_id: str,
    stage: str,
    status: str,
    details: dict[str, Any] | None = None,
) -> None:
    """Log structured request progress with request ID correlation."""
    log_entry = {
        "request_id": request_id,
        "stage": stage,
        "status": status,
        **(details or {}),
    }
    logger.info(json.dumps(log_entry))


def _log_error(request_id: str, stage: str, error_message: str, error_type: str) -> None:
    """Log structured error with request ID correlation."""
    log_entry = {
        "request_id": request_id,
        "stage": stage,
        "status": "error",
        "error_message": error_message,
        "error_type": error_type,
    }
    logger.error(json.dumps(log_entry))


@router.post("", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest, request: Request) -> AnalyzeResponse:
    """Unified /analyze endpoint: OCR -> Detection -> Risk -> Decay -> Warnings.

    Phase 5 implementation with orchestration, request correlation, and error handling.
    """
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

    client_host = request.client.host if request.client else "unknown"
    if not analyze_rate_limiter.allow(
        key=client_host,
        limit=settings.analyze_rate_limit_per_minute,
        window_seconds=60,
    ):
        _log_error(
            request_id,
            "rate_limit",
            f"Rate limit exceeded for client={client_host}",
            "RateLimitExceeded",
        )
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please retry later.",
        )

    _log_request(request_id, "analyze_start", "started")

    try:
        # Stage 1: OCR
        _log_request(request_id, "ocr_start", "processing")
        try:
            ocr_result = extract_text_from_image(payload.image_base64)
            _log_request(
                request_id,
                "ocr_success",
                "completed",
                {"blocks_found": len(ocr_result.text_blocks)},
            )
        except (ValueError, TypeError) as e:
            _log_error(request_id, "ocr", str(e), type(e).__name__)
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image input: {str(e)}",
            ) from e
        except Exception as e:
            _log_error(request_id, "ocr", str(e), type(e).__name__)
            raise HTTPException(
                status_code=500,
                detail="OCR processing failed",
            ) from e

        # Stage 2: Chemical Detection
        _log_request(request_id, "detection_start", "processing")
        try:
            # Combine OCR text with product hint for detection
            text = ocr_result.raw_text
            if payload.product_name_hint:
                text += " " + payload.product_name_hint

            chemicals_scored = detect_chemicals_scored(text)
            _log_request(
                request_id,
                "detection_success",
                "completed",
                {"chemicals_found": len(chemicals_scored)},
            )
        except Exception as e:
            _log_error(request_id, "detection", str(e), type(e).__name__)
            raise HTTPException(
                status_code=500,
                detail="Chemical detection failed",
            ) from e

        # Stage 3: Risk Scoring
        _log_request(request_id, "risk_start", "processing")
        try:
            risk_result = calculate_risk_score(chemicals_scored)
            _log_request(
                request_id,
                "risk_success",
                "completed",
                {"risk_score": risk_result.risk_score},
            )
        except Exception as e:
            _log_error(request_id, "risk", str(e), type(e).__name__)
            raise HTTPException(
                status_code=500,
                detail="Risk scoring failed",
            ) from e

        # Stage 4: Decay Simulation
        _log_request(request_id, "decay_start", "processing")
        try:
            top_chemical = (
                risk_result.top_contributors[0]
                if risk_result.top_contributors
                else None
            )
            decay_result = simulate_decay(
                chemical=top_chemical,
                initial_level=risk_result.risk_score,
            )
            _log_request(
                request_id,
                "decay_success",
                "completed",
                {"years_simulated": len(decay_result.decay_data)},
            )
        except Exception as e:
            _log_error(request_id, "decay", str(e), type(e).__name__)
            raise HTTPException(
                status_code=500,
                detail="Decay simulation failed",
            ) from e

        # Stage 5: Medical Warnings
        _log_request(request_id, "warnings_start", "processing")
        try:
            warnings_result = evaluate_medical_warnings(
                detected_chemicals=risk_result.top_contributors,
                risk_score=risk_result.risk_score,
                contraindication=None,
            )
            medical_warnings = warnings_result.warnings
            _log_request(
                request_id,
                "warnings_success",
                "completed",
                {
                    "warnings_count": len(medical_warnings),
                    "recommendation_safe": warnings_result.recommendation_safe,
                },
            )
        except Exception as e:
            _log_error(request_id, "warnings", str(e), type(e).__name__)
            raise HTTPException(
                status_code=500,
                detail="Warning evaluation failed",
            ) from e

        # Compose response
        response = AnalyzeResponse(
            product_name=payload.product_name_hint or "Unknown Product",
            detected_chemicals=risk_result.top_contributors,
            risk_score=risk_result.risk_score,
            confidence_interval=risk_result.confidence_interval,
            decay_data=decay_result.decay_data,
            medical_warnings=medical_warnings,
            meta=AnalyzeMeta(request_id=uuid.UUID(request_id)),
        )

        _log_request(request_id, "analyze_complete", "success")
        return response

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        _log_error(request_id, "analyze", str(e), type(e).__name__)
        raise HTTPException(
            status_code=500,
            detail="Unexpected error during analysis",
        ) from e


@router.post("/process-image", response_model=AnalyzeResponse)
def process_image(payload: AnalyzeRequest, request: Request) -> AnalyzeResponse:
    # Alias endpoint for backwards compatibility with design doc
    return analyze(payload, request)
