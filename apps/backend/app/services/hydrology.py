import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

EPA_SCORE_CEILING_PPT = 70.0
NSF_CERTIFIED_TYPES = {"NSF-53", "NSF-58"}


@dataclass
class HydrologyResult:
    water_score: int
    effective_ppt: float
    data_status: str
    filter_warning: str | None


def _load_epa_data() -> dict[str, dict]:
    data_path = Path(__file__).parent.parent / "data" / "epa_ucmr5.json"
    with open(data_path, encoding="utf-8") as file:
        return json.load(file)


@lru_cache(maxsize=1)
def _load_nsf_model_data() -> list[dict]:
    data_path = Path(__file__).parent.parent / "data" / "nsf_certified_models.json"
    if not data_path.exists():
        return []

    try:
        with open(data_path, encoding="utf-8") as file:
            payload = json.load(file)
    except json.JSONDecodeError:
        return []

    records = payload.get("records", []) if isinstance(payload, dict) else []
    return records if isinstance(records, list) else []


def _normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    return " ".join(value.strip().lower().split())


def _normalize_model_token(value: str | None) -> str:
    return "".join(ch for ch in _normalize_text(value) if ch.isalnum())


def _lookup_model_certification(filter_brand: str | None, filter_type: str | None) -> bool | None:
    records = _load_nsf_model_data()
    if not records:
        return None

    model_token = _normalize_model_token(filter_type)
    if not model_token or _normalize_text(filter_type) in {"none", "unknown"}:
        return None

    input_brand = _normalize_text(filter_brand)
    for record in records:
        record_model = _normalize_model_token(str(record.get("model", "")))
        if record_model != model_token:
            continue

        record_brand = _normalize_text(str(record.get("brand", "")))
        if input_brand and input_brand not in record_brand and record_brand not in input_brand:
            continue

        return bool(record.get("pfas_certified", False))

    return None


def calculate_hydrology_risk(
    zip_code: str | None,
    filter_type: str | None,
    filter_brand: str | None = None,
) -> HydrologyResult:
    epa_data = _load_epa_data()
    is_certified = filter_type in NSF_CERTIFIED_TYPES
    model_certified = _lookup_model_certification(
        filter_brand=filter_brand,
        filter_type=filter_type,
    )
    if model_certified is not None:
        is_certified = model_certified

    if not zip_code:
        return HydrologyResult(
            water_score=0,
            effective_ppt=0.0,
            data_status="missing-zip",
            filter_warning=_build_filter_warning(filter_type, is_certified),
        )

    entry = epa_data.get(zip_code)
    if not entry or entry.get("status") != "data" or entry.get("totalPpt") is None:
        return HydrologyResult(
            water_score=0,
            effective_ppt=0.0,
            data_status="no-data",
            filter_warning=_build_filter_warning(filter_type, is_certified),
        )

    total_ppt = float(entry["totalPpt"])
    effective_ppt = round(total_ppt * 0.2, 2) if is_certified else total_ppt
    water_score = min(100, round((effective_ppt / EPA_SCORE_CEILING_PPT) * 100))

    return HydrologyResult(
        water_score=water_score,
        effective_ppt=effective_ppt,
        data_status="calculated",
        filter_warning=_build_filter_warning(filter_type, is_certified),
    )


def _build_filter_warning(filter_type: str | None, is_certified: bool) -> str | None:
    if is_certified:
        return None

    if filter_type in (None, "", "unknown"):
        return "Filter model unknown. Use an NSF-53 or NSF-58 certified filter for PFAS reduction."

    if filter_type == "none":
        return (
            "No water filter selected. Use an NSF-53 or NSF-58 certified "
            "filter for PFAS reduction."
        )

    return "Your filter is not NSF certified for PFAS removal. Consider NSF-53 or NSF-58 options."
