import json
import logging
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.core.config import settings
from app.core.rate_limit import analyze_rate_limiter
from app.models.schemas import (
    AnalyzeMeta,
    AnalyzeRequest,
    AnalyzeResponse,
    ModuleScores,
    SafetySummary,
)
from app.services.decay import evaluate_medical_warnings, simulate_decay
from app.services.hydrology import calculate_hydrology_risk
from app.services.ocr import OCRResult, extract_text_from_image
from app.services.pfas_hunter import detect_chemicals_scored, rank_top_risk_contributors
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
            if payload.image_base64:
                ocr_result = extract_text_from_image(
                    payload.image_base64,
                    allow_mock_fallback=False,
                    strict_readiness=True,
                )
            else:
                ocr_result = OCRResult(
                    raw_text="",
                    text_blocks=[],
                    labels=[],
                    confidence=0.0,
                    provider="none",
                )
            _log_request(
                request_id,
                "ocr_success",
                "completed",
                {
                    "blocks_found": len(ocr_result.text_blocks),
                    "provider": ocr_result.provider,
                    "raw_text_length": len(ocr_result.raw_text),
                    "ocr_preview": _ocr_preview(ocr_result.raw_text),
                },
            )
        except (ValueError, TypeError) as e:
            _log_error(request_id, "ocr", str(e), type(e).__name__)
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image input: {str(e)}",
            ) from e
        except Exception as e:
            _log_error(request_id, "ocr", str(e), type(e).__name__)
            error_message = str(e).lower()
            if (
                "not installed" in error_message
                or "not set" in error_message
                or "does not exist" in error_message
                or "not available on path" in error_message
                or "not allowed for /analyze" in error_message
            ):
                raise HTTPException(
                    status_code=503,
                    detail="OCR provider is not ready for analyze image processing",
                ) from e
            raise HTTPException(
                status_code=500,
                detail="OCR processing failed",
            ) from e

        # Stage 2: Chemical Detection
        _log_request(request_id, "detection_start", "processing")
        try:
            text = _build_scanner_text(payload=payload, ocr_result=ocr_result)

            chemicals_scored = detect_chemicals_scored(text)
            matched_terms = rank_top_risk_contributors(chemicals_scored, top_n=8)
            _log_request(
                request_id,
                "detection_success",
                "completed",
                {
                    "chemicals_found": len(chemicals_scored),
                    "scanner_text_length": len(text),
                    "matched_terms": matched_terms,
                },
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
            raw_scanner_result = calculate_risk_score(chemicals_scored)
            scanner_score = _apply_cookware_exposure_modifier(
                base_score=raw_scanner_result.risk_score,
                payload=payload,
            )

            hydrology_result = calculate_hydrology_risk(
                zip_code=payload.zip_code,
                filter_type=payload.filter_model.type if payload.filter_model else None,
                filter_brand=payload.filter_model.brand if payload.filter_model else None,
            )

            decay_score = _compute_decay_score(payload)

            # Backend-owned REI composition from module contributions.
            final_risk_score = int(
                min(
                    100,
                    max(
                        0,
                        round(
                            (scanner_score * 0.5)
                            + (hydrology_result.water_score * 0.3)
                            + (decay_score * 0.2)
                        ),
                    ),
                )
            )
            _log_request(
                request_id,
                "risk_success",
                "completed",
                {
                    "risk_score": final_risk_score,
                    "product_risk_score": scanner_score,
                    "scanner_base_score": raw_scanner_result.risk_score,
                    "water_risk_score": hydrology_result.water_score,
                    "decay_score": decay_score,
                    "water_data_status": hydrology_result.data_status,
                },
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
                raw_scanner_result.top_contributors[0]
                if raw_scanner_result.top_contributors
                else None
            )
            decay_result = simulate_decay(
                chemical=top_chemical,
                initial_level=final_risk_score,
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
            contraindication = _derive_contraindication(payload)
            warnings_result = evaluate_medical_warnings(
                detected_chemicals=raw_scanner_result.top_contributors,
                risk_score=final_risk_score,
                contraindication=contraindication,
            )
            medical_warnings = warnings_result.warnings

            safety_summary = SafetySummary(
                contraindications=[contraindication] if contraindication else [],
                recommendation_safe=warnings_result.recommendation_safe,
                equity_adjustments_applied=hydrology_result.data_status != "calculated",
                zero_cost_actions=[
                    "Drink and cook with filtered water whenever possible",
                    "Prefer stainless steel or cast iron cookware",
                    "Reduce use of grease-resistant packaging",
                ],
            )

            module_scores = ModuleScores(
                hydrology=hydrology_result.water_score,
                scanner=scanner_score,
                decay=decay_score,
                composite=final_risk_score,
            )
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
            detected_chemicals=raw_scanner_result.top_contributors,
            risk_score=final_risk_score,
            rei_formula_version="v2-module-weighted-0.5-0.3-0.2",
            module_scores=module_scores,
            confidence_interval=raw_scanner_result.confidence_interval,
            water_risk_score=hydrology_result.water_score,
            water_effective_ppt=hydrology_result.effective_ppt,
            water_data_status=hydrology_result.data_status,
            filter_warning=hydrology_result.filter_warning,
            decay_data=decay_result.decay_data,
            medical_warnings=medical_warnings,
            safety=safety_summary,
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


def _compute_decay_score(payload: AnalyzeRequest) -> int:
    if payload.diet_habits is None:
        return 45

    habits = payload.diet_habits
    fiber_sources = {item.lower() for item in habits.fiber_sources}
    foods = {item.lower() for item in habits.foods}
    medications = {item.lower() for item in habits.medications if item.lower() != "none"}

    protective_fiber_sources = {
        "oats",
        "beans",
        "lentils",
        "psyllium husk",
        "flax seeds",
        "whole wheat",
    }
    beneficial_foods = {"organic produce"}
    adverse_foods = {"processed foods"}

    fiber_bonus = min(25, len(fiber_sources & protective_fiber_sources) * 6)
    beneficial_bonus = min(10, len(foods & beneficial_foods) * 4)
    adverse_penalty = min(12, len(foods & adverse_foods) * 8)

    medication_risk_weights = {
        "metformin": 5,
        "statins": 4,
        "blood pressure meds": 6,
    }
    medication_penalty = sum(
        weight
        for medication, weight in medication_risk_weights.items()
        if medication in medications
    )

    score = 45 + fiber_bonus + beneficial_bonus - adverse_penalty - medication_penalty
    return max(0, min(100, score))


def _ocr_preview(raw_text: str) -> str:
    if not raw_text:
        return ""
    compact = " ".join(raw_text.split())
    return compact[:180]


def _derive_contraindication(payload: AnalyzeRequest) -> str | None:
    if payload.diet_habits is None:
        return None

    meds = {m.lower() for m in payload.diet_habits.medications}
    fiber_count = len(payload.diet_habits.fiber_sources)

    if "blood pressure meds" in meds and fiber_count > 0:
        return "High-fiber timing may alter blood pressure medication absorption"

    if "metformin" in meds and fiber_count >= 2:
        return "High-fiber intake may require metformin timing review"

    if "statins" in meds and "psyllium husk" in {
        f.lower() for f in payload.diet_habits.fiber_sources
    }:
        return "Psyllium may affect statin absorption timing"

    interacting = {"metformin", "statins", "blood pressure meds"}
    if meds & interacting and fiber_count > 0:
        return "Potential fiber-medication timing interaction"

    return None


def _build_scanner_text(payload: AnalyzeRequest, ocr_result: OCRResult) -> str:
    # Module 2 source text priority: OCR image text + explicit product_scan + fallback hint.
    parts: list[str] = []
    if ocr_result.raw_text:
        parts.append(ocr_result.raw_text)

    if payload.product_scan:
        parts.append(payload.product_scan)

    if payload.product_name_hint:
        parts.append(payload.product_name_hint)

    return " ".join(parts)


def _apply_cookware_exposure_modifier(base_score: int, payload: AnalyzeRequest) -> int:
    cookware = payload.cookware_use
    if cookware is None:
        return base_score

    # In current Team A shape, brand stores non-stick frequency buckets like "50%".
    frequency_bonus = 0
    brand_value = cookware.brand.strip().lower()
    if brand_value.endswith("%"):
        try:
            percentage = int(brand_value.replace("%", ""))
            frequency_bonus = min(20, max(0, round(percentage / 5)))
        except ValueError:
            frequency_bonus = 0

    years_bonus = min(10, max(0, cookware.years_of_use))
    adjusted = base_score + frequency_bonus + years_bonus
    return min(100, max(0, adjusted))
