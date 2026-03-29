import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

EPA_SCORE_CEILING_PPT = 70.0


@dataclass
class HydrologyResult:
    water_score: int
    effective_ppt: float
    data_status: str
    filter_warning: str | None


@dataclass
class FilterCertificationResult:
    canonical_type: str | None
    pfas_certified: bool
    found_in_dataset: bool
    matched_by: str | None = None


def _load_epa_data() -> dict[str, dict]:
    data_path = Path(__file__).parent.parent / "data" / "epa_ucmr5.json"
    with open(data_path, encoding="utf-8") as file:
        return json.load(file)


@lru_cache(maxsize=1)
def _load_nsf_data() -> dict:
    data_path = Path(__file__).parent.parent / "data" / "nsf_certifications.json"
    with open(data_path, encoding="utf-8") as file:
        return json.load(file)


@lru_cache(maxsize=1)
def _load_nsf_model_data() -> dict:
    data_path = Path(__file__).parent.parent / "data" / "nsf_certified_models.json"
    try:
        with open(data_path, encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError:
        # Model-level data is optional until all standards are ingested.
        return {"records": []}


def _normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    return " ".join(value.strip().lower().split())


def _normalize_model_token(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", _normalize_text(value))


def _normalize_filter_type(filter_type: str | None, aliases: dict[str, str]) -> str | None:
    if filter_type is None:
        return None

    cleaned = filter_type.strip()
    if cleaned == "":
        return None

    lowered = cleaned.lower()
    return aliases.get(lowered, cleaned.upper())


def _lookup_filter_certification(
    filter_brand: str | None,
    filter_type: str | None,
) -> FilterCertificationResult:
    nsf_data = _load_nsf_data()
    aliases = {
        str(key).lower(): str(value)
        for key, value in nsf_data.get("type_aliases", {}).items()
    }
    standards = nsf_data.get("pfas_standards", [])
    known_standard_types = {
        str(standard.get("type", "")).upper()
        for standard in standards
        if standard.get("type")
    }

    # Prefer model-level lookup when type is not an explicit standard code.
    model_match = _lookup_model_certification(filter_brand=filter_brand, filter_model=filter_type)
    if model_match is not None:
        return model_match

    canonical_type = _normalize_filter_type(filter_type, aliases)

    if canonical_type is None:
        return FilterCertificationResult(
            canonical_type=None,
            pfas_certified=False,
            found_in_dataset=False,
        )

    for standard in standards:
        if (
            str(standard.get("type", "")).upper() == canonical_type
            and canonical_type in known_standard_types
        ):
            return FilterCertificationResult(
                canonical_type=canonical_type,
                pfas_certified=bool(standard.get("pfas_certified", False)),
                found_in_dataset=True,
                matched_by="standard",
            )

    return FilterCertificationResult(
        canonical_type=canonical_type,
        pfas_certified=False,
        found_in_dataset=False,
    )


def _lookup_model_certification(
    filter_brand: str | None,
    filter_model: str | None,
) -> FilterCertificationResult | None:
    model_token = _normalize_model_token(filter_model)
    if not model_token:
        return None

    # Skip model lookup for explicit non-model selections.
    if _normalize_text(filter_model) in {"none", "unknown"}:
        return None

    records = _load_nsf_model_data().get("records", [])
    input_brand = _normalize_text(filter_brand)

    for record in records:
        record_model = _normalize_model_token(str(record.get("model", "")))
        if record_model != model_token:
            continue

        record_brand = _normalize_text(str(record.get("brand", "")))
        if input_brand and input_brand not in record_brand and record_brand not in input_brand:
            continue

        return FilterCertificationResult(
            canonical_type=str(record.get("standard", "")).upper() or None,
            pfas_certified=bool(record.get("pfas_certified", False)),
            found_in_dataset=True,
            matched_by="model",
        )

    return None


def calculate_hydrology_risk(
    zip_code: str | None,
    filter_type: str | None,
    filter_brand: str | None = None,
) -> HydrologyResult:
    epa_data = _load_epa_data()
    filter_result = _lookup_filter_certification(filter_brand=filter_brand, filter_type=filter_type)

    if not zip_code:
        return HydrologyResult(
            water_score=0,
            effective_ppt=0.0,
            data_status="missing-zip",
            filter_warning=_build_filter_warning(filter_type, filter_result),
        )

    entry = epa_data.get(zip_code)
    if not entry or entry.get("status") != "data" or entry.get("totalPpt") is None:
        return HydrologyResult(
            water_score=0,
            effective_ppt=0.0,
            data_status="no-data",
            filter_warning=_build_filter_warning(filter_type, filter_result),
        )

    total_ppt = float(entry["totalPpt"])
    effective_ppt = round(total_ppt * 0.2, 2) if filter_result.pfas_certified else total_ppt
    water_score = min(100, round((effective_ppt / EPA_SCORE_CEILING_PPT) * 100))

    return HydrologyResult(
        water_score=water_score,
        effective_ppt=effective_ppt,
        data_status="calculated",
        filter_warning=_build_filter_warning(filter_type, filter_result),
    )


def _build_filter_warning(
    filter_type: str | None,
    filter_result: FilterCertificationResult,
) -> str | None:
    if filter_result.pfas_certified:
        return None

    if filter_type in (None, "", "unknown"):
        return "Filter model unknown. Use an NSF-53 or NSF-58 certified filter for PFAS reduction."

    if filter_type == "none":
        return (
            "No water filter selected. Use an NSF-53 or NSF-58 certified "
            "filter for PFAS reduction."
        )

    if filter_result.found_in_dataset and filter_result.canonical_type == "NSF-42":
        return (
            "NSF-42 filters address taste and odor, not PFAS. Use NSF-53 or "
            "NSF-58 for PFAS reduction."
        )

    if not filter_result.found_in_dataset:
        return (
            "Filter type could not be verified in the NSF dataset. "
            "Use an NSF-53 or NSF-58 certified filter for PFAS reduction."
        )

    return "Your filter is not NSF certified for PFAS removal. Consider NSF-53 or NSF-58 options."
