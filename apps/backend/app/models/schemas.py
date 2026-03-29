from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class CookwareUse(BaseModel):
    brand: str
    years_of_use: int = Field(ge=0, le=100)


class FilterModel(BaseModel):
    brand: str
    type: str


class DietHabits(BaseModel):
    fiber_sources: list[str]
    foods: list[str]
    medications: list[str]


class MakeUpUse(BaseModel):
    frequency: Literal["never", "rarely", "weekly", "daily"]
    product_types: list[str]


class AnalyzeRequest(BaseModel):
    zip_code: str | None = Field(default=None, pattern=r"^\d{5}$")
    product_scan: str | None = Field(default=None)
    cookware_use: CookwareUse | None = Field(default=None)
    filter_model: FilterModel | None = Field(default=None)
    diet_habits: DietHabits | None = Field(default=None)
    make_up_use: MakeUpUse | None = Field(default=None)

    # Backward-compatible fields from the initial integration contract.
    image_base64: str | None = Field(default=None, description="Base64 encoded product image")
    product_name_hint: str | None = Field(default=None, description="Optional product name hint")


class DecayPoint(BaseModel):
    year: int
    level: int


class AnalyzeMeta(BaseModel):
    contract_version: Literal["v1"] = "v1"
    request_id: UUID = Field(default_factory=uuid4)


class AnalyzeResponse(BaseModel):
    product_name: str
    detected_chemicals: list[str]
    risk_score: int = Field(ge=0, le=100)
    confidence_interval: float = Field(ge=0.0, le=1.0)
    water_risk_score: int = Field(ge=0, le=100)
    water_effective_ppt: float = Field(ge=0.0)
    water_data_status: Literal["calculated", "no-data", "missing-zip"]
    filter_warning: str | None = None
    decay_data: list[DecayPoint]
    medical_warnings: list[str]
    meta: AnalyzeMeta


class OCRTextBlock(BaseModel):
    text: str
    normalized_text: str
    confidence: float = Field(ge=0.0, le=1.0)


class ProcessImageRequest(BaseModel):
    image_base64: str = Field(description="Base64 encoded image data, optionally as a data URL")
    mime_type: str | None = Field(
        default=None,
        description="Optional mime type if base64 has no data URL",
    )
    ocr_provider: Literal["google", "tesseract", "mock"] | None = Field(
        default=None,
        description="Optional override for OCR provider",
    )


class ProcessImageResponse(BaseModel):
    raw_text: str
    normalized_text: str
    text_blocks: list[OCRTextBlock]
    labels: list[str]
    confidence: float = Field(ge=0.0, le=1.0)
    provider: Literal["google", "tesseract", "mock"]
