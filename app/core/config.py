import os

from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "BioBound Team B API"
    api_version: str = "v1"
    max_image_payload_bytes: int = int(os.getenv("MAX_IMAGE_PAYLOAD_BYTES", "5242880"))
    allowed_image_mime_types: tuple[str, ...] = ("image/png", "image/jpeg", "image/webp")
    ocr_provider: str = os.getenv("OCR_PROVIDER", "google").lower()
    ocr_timeout_seconds: float = float(os.getenv("OCR_TIMEOUT_SECONDS", "2.0"))
    ocr_retry_attempts: int = int(os.getenv("OCR_RETRY_ATTEMPTS", "2"))
    ocr_enable_fallback_tesseract: bool = (
        os.getenv("OCR_ENABLE_FALLBACK_TESSERACT", "true").lower() == "true"
    )


settings = Settings()
