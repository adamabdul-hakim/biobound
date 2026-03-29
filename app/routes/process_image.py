import base64
import binascii

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.models.schemas import OCRTextBlock, ProcessImageRequest, ProcessImageResponse
from app.services.ocr import extract_text_from_image, normalize_ocr_text

router = APIRouter(prefix="/process-image", tags=["process-image"])


@router.post("", response_model=ProcessImageResponse)
def process_image(payload: ProcessImageRequest) -> ProcessImageResponse:
    image_bytes, effective_mime = _decode_and_validate_image(
        image_base64=payload.image_base64,
        mime_type=payload.mime_type,
    )

    ocr_result = extract_text_from_image(
        image_data=image_bytes,
        mime_type=effective_mime,
        provider_override=payload.ocr_provider,
    )

    text_blocks = [
        OCRTextBlock(
            text=item.text,
            normalized_text=normalize_ocr_text(item.text),
            confidence=item.confidence,
        )
        for item in ocr_result.text_blocks
    ]

    return ProcessImageResponse(
        raw_text=ocr_result.raw_text,
        normalized_text=normalize_ocr_text(ocr_result.raw_text),
        text_blocks=text_blocks,
        labels=ocr_result.labels,
        confidence=ocr_result.confidence,
        provider=ocr_result.provider,
    )


def _decode_and_validate_image(image_base64: str, mime_type: str | None) -> tuple[bytes, str]:
    cleaned = image_base64.strip()
    detected_mime = mime_type

    if cleaned.startswith("data:") and "," in cleaned:
        header, cleaned = cleaned.split(",", 1)
        if ";base64" not in header.lower():
            raise HTTPException(status_code=422, detail="Image payload must be base64 encoded")
        detected_mime = header[5:].split(";")[0].lower()

    detected_mime = (detected_mime or "").lower()
    if not detected_mime:
        raise HTTPException(
            status_code=422,
            detail="mime_type is required when no data URL is provided",
        )

    if detected_mime not in settings.allowed_image_mime_types:
        raise HTTPException(status_code=422, detail=f"Unsupported mime_type: {detected_mime}")

    try:
        image_bytes = base64.b64decode(cleaned, validate=True)
    except binascii.Error as exc:
        raise HTTPException(status_code=422, detail="Invalid base64 image payload") from exc

    if len(image_bytes) > settings.max_image_payload_bytes:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Image payload exceeds {settings.max_image_payload_bytes} bytes "
                f"(received {len(image_bytes)} bytes)"
            ),
        )

    if len(image_bytes) == 0:
        raise HTTPException(status_code=422, detail="Image payload cannot be empty")

    return image_bytes, detected_mime
