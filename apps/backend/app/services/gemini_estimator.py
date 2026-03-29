import json
import logging
import urllib.request
import urllib.parse
from typing import Any, Dict

from app.core.config import settings

logger = logging.getLogger(__name__)


DEMO_ZIP_PREFIXES = {
    # Cincinnati demo: any zip starting with 452
    "cincinnati": {
        "prefixes": ("452",),
        "data": {
            "system_name": "Cincinnati Public Water System",
            "state": "Ohio",
            "population_served": 750200,
            "pfas_detected": {
                "PFBS": {"year": 2023, "max_ppt": 4.1},
                "PFBA": {"year": 2023, "max_ppt": 5.2},
                "PFOS": {"year": 2023, "max_ppt": 6.1},
                "Total PFAS": {"year": 2023, "max_ppt": 15},
            },
        },
    },
    # Little Hocking / Parkesburg demo: zip prefix 457 (Ohio eastern)
    "little_hocking": {
        "prefixes": ("457",),
        "data": {
            "contamination_site": "Little Hocking Water Association",
            "location": "Washington County, Ohio",
            "pfas_detected": {
                "PFOA": {"source": "Groundwater", "max_ppt": 10.1, "years_tested": [2004]},
            },
            "suspected_source": "Industrial Manufacturing",
        },
    },
}


def _match_demo(zip_code: str) -> Dict[str, Any] | None:
    z = str(zip_code).strip()
    for loc in DEMO_ZIP_PREFIXES.values():
        for p in loc["prefixes"]:
            if z.startswith(p):
                return loc["data"]
    return None


def _call_gemini_api(prompt: str) -> str:
    """Call Google's Generative API (text-bison / Gemini) if configured.

    This implementation uses a simple HTTP request with the API key passed
    as `GEMINI_API_KEY` in the environment. If the call fails for any reason,
    an exception is raised and callers should fall back to the internal heuristic.
    """
    api_key = settings.gemini_api_key
    if not api_key:
        raise RuntimeError("No GEMINI_API_KEY configured")

    # Use a v1beta2-like endpoint for text-bison style models (best-effort).
    base = "https://generative.googleapis.com/v1beta2/models/text-bison-001:generateText"
    url = f"{base}?key={urllib.parse.quote(api_key)}"

    body = {
        "temperature": 0.2,
        "maxOutputTokens": 200,
        "prompt": {"text": prompt},
    }

    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        resp_data = resp.read().decode("utf-8")
        return resp_data


def estimate_pfas_by_zip(zip_code: str) -> Dict[str, Any]:
    """Estimate PFAS for a zip code.

    - If the zip matches one of two demo prefixes, return the provided manual data.
    - Else, attempt to call the Gemini API to get an estimate from an LLM prompt.
    - If API call is not configured or fails, return a deterministic heuristic estimate.
    """
    demo = _match_demo(zip_code)
    if demo is not None:
        return {
            "source": "manual_demo",
            "zip_code": str(zip_code),
            "location_data": demo,
        }

    prompt = (
        f"Estimate a reasonable Total PFAS concentration in parts-per-trillion (ppt) "
        f"for drinking water served to zip code {zip_code} in the United States. "
        "Provide a JSON object with keys: estimated_total_pfas_ppt (number), "
        "breakdown (object of likely PFAS with ppt values), and confidence (low|medium|high)."
    )

    try:
        raw = _call_gemini_api(prompt)
        # Try to extract JSON from the model response; be liberal when parsing.
        try:
            parsed = json.loads(raw)
            return {"source": "gemini", "zip_code": str(zip_code), "estimate": parsed}
        except Exception:
            # If the response isn't raw JSON, return raw text in the estimate field.
            return {"source": "gemini", "zip_code": str(zip_code), "raw_response": raw}
    except Exception as e:
        logger.info("Gemini call failed, falling back to deterministic heuristic: %s", e)
        # Deterministic heuristic: use digits of zip to pick a small number
        digits = [int(ch) for ch in str(zip_code) if ch.isdigit()]
        seed = sum(digits) if digits else 5
        estimated = max(1.0, float((seed % 12) + 1))
        breakdown = {
            "PFOS": round(estimated * 0.4, 2),
            "PFOA": round(estimated * 0.35, 2),
            "Other PFAS": round(estimated * 0.25, 2),
        }
        return {
            "source": "heuristic_fallback",
            "zip_code": str(zip_code),
            "estimate": {
                "estimated_total_pfas_ppt": round(estimated, 2),
                "breakdown": breakdown,
                "confidence": "low",
            },
        }
