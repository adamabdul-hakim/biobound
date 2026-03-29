import json
from dataclasses import dataclass
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


def calculate_hydrology_risk(zip_code: str | None, filter_type: str | None) -> HydrologyResult:
    epa_data = _load_epa_data()

    if not zip_code:
        return HydrologyResult(
            water_score=0,
            effective_ppt=0.0,
            data_status="missing-zip",
            filter_warning=_build_filter_warning(filter_type),
        )

    entry = epa_data.get(zip_code)
    if not entry or entry.get("status") != "data" or entry.get("totalPpt") is None:
        return HydrologyResult(
            water_score=0,
            effective_ppt=0.0,
            data_status="no-data",
            filter_warning=_build_filter_warning(filter_type),
        )

    total_ppt = float(entry["totalPpt"])
    is_certified = filter_type in NSF_CERTIFIED_TYPES
    effective_ppt = round(total_ppt * 0.2, 2) if is_certified else total_ppt
    water_score = min(100, round((effective_ppt / EPA_SCORE_CEILING_PPT) * 100))

    return HydrologyResult(
        water_score=water_score,
        effective_ppt=effective_ppt,
        data_status="calculated",
        filter_warning=_build_filter_warning(filter_type),
    )


def _build_filter_warning(filter_type: str | None) -> str | None:
    if filter_type in NSF_CERTIFIED_TYPES:
        return None

    if filter_type in (None, "", "unknown"):
        return "Filter model unknown. Use an NSF-53 or NSF-58 certified filter for PFAS reduction."

    if filter_type == "none":
        return "No water filter selected. Use an NSF-53 or NSF-58 certified filter for PFAS reduction."

    return "Your filter is not NSF certified for PFAS removal. Consider NSF-53 or NSF-58 options."
