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

    # Try Gemini 1.5 Flash first (v1beta)
    base = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    url = f"{base}?key={urllib.parse.quote(api_key)}"

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 300},
    }

    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=12) as resp:
        resp_data = resp.read().decode("utf-8")
        parsed = json.loads(resp_data)
        # Extract text from Gemini response structure
        return parsed["candidates"][0]["content"]["parts"][0]["text"]


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


# Fallback recommendations when Gemini is unavailable, keyed by risk tier
_FALLBACK_RECOMMENDATIONS: Dict[str, list] = {
    "low": [
        "Continue using filtered water for drinking and cooking.",
        "Maintain a fiber-rich diet — oats, beans, and flaxseed support PFAS clearance.",
        "Prefer stainless steel or cast iron cookware to limit PFAS migration.",
        "Check shampoo and personal care products for PFAS (fluorine-based ingredients).",
        "Review your home's dust levels — regular vacuuming reduces PFAS-laden dust.",
        "Your risk is low — schedule a water quality check every 2 years.",
    ],
    "moderate": [
        "Upgrade your water filter to NSF-53 or NSF-58 certified — this is the single highest-impact step.",
        "Replace non-stick cookware older than 5 years with ceramic or stainless steel alternatives.",
        "Increase daily soluble fiber intake (psyllium husk, oats, beans) to accelerate PFAS excretion.",
        "Reduce fast food and microwave popcorn — PFAS-coated packaging is a major source.",
        "If you have children under 5, damp-mop floors frequently to reduce dust ingestion.",
        "Ask your water utility for their latest PFAS testing report.",
    ],
    "high": [
        "Install an under-sink NSF-58 reverse osmosis filter — this removes up to 99% of PFAS from drinking water.",
        "Replace ALL non-stick cookware immediately with PFAS-free alternatives (cast iron, stainless, ceramic).",
        "Prioritize daily fiber supplementation (psyllium husk or cholestyramine with medical guidance).",
        "Eliminate PFAS-packaged foods: fast food, microwave popcorn, and pizza boxes.",
        "If young children are present, test home dust and increase damp-cleaning frequency.",
        "Discuss PFAS biomonitoring with your healthcare provider — blood tests can measure PFAS levels.",
        "Contact your local health department to report possible PFAS contamination in your area.",
    ],
}


def get_pfas_recommendations(
    rei_score: int,
    filter_type: str | None,
    cookware_pct: int,
    cookware_years: int,
    diet_raising_count: int,
    diet_reducing_count: int,
    has_children: bool,
    children_crawl: bool,
    zip_code: str | None = None,
) -> Dict[str, Any]:
    """Generate personalized PFAS reduction recommendations via Gemini.

    Falls back to curated static recommendations if Gemini is unavailable.
    """
    tier = "high" if rei_score >= 67 else ("moderate" if rei_score >= 33 else "low")

    prompt = (
        f"You are a public health advisor specializing in PFAS (per- and polyfluoroalkyl substances) exposure.\n"
        f"A user has a PFAS exposure score of {rei_score}/100 ({tier} risk).\n"
        f"Profile:\n"
        f"- Water filter: {filter_type or 'none'} (NSF-53/58 certified removes 99%+)\n"
        f"- Non-stick cookware: {cookware_pct}% of cookware, used for {cookware_years} years\n"
        f"- PFAS-raising foods per week: {diet_raising_count} categories\n"
        f"- PFAS-reducing fiber sources: {diet_reducing_count} categories\n"
        f"- Young children at home: {'Yes' + (', crawling on floors' if children_crawl else '') if has_children else 'No'}\n"
        f"{'- Location ZIP: ' + zip_code if zip_code else ''}\n\n"
        f"Provide exactly 6 concise, actionable, personalized recommendations to reduce this person's PFAS exposure. "
        f"Each recommendation should be 1-2 sentences. Return a JSON array of strings only, no extra text."
    )

    try:
        raw = _call_gemini_api(prompt)
        # Parse JSON array from response
        raw_stripped = raw.strip()
        # Find JSON array in response
        start = raw_stripped.find("[")
        end = raw_stripped.rfind("]") + 1
        if start >= 0 and end > start:
            recs = json.loads(raw_stripped[start:end])
            if isinstance(recs, list) and all(isinstance(r, str) for r in recs):
                return {"source": "gemini", "tier": tier, "recommendations": recs[:8]}
        # If not valid JSON array, split by newlines
        lines = [ln.strip().lstrip("0123456789.-) ") for ln in raw_stripped.splitlines() if ln.strip()]
        lines = [ln for ln in lines if len(ln) > 20][:8]
        if lines:
            return {"source": "gemini", "tier": tier, "recommendations": lines}
    except Exception as e:
        logger.info("Gemini recommendations call failed, using fallback: %s", e)

    return {
        "source": "fallback",
        "tier": tier,
        "recommendations": _FALLBACK_RECOMMENDATIONS.get(tier, _FALLBACK_RECOMMENDATIONS["moderate"]),
    }
