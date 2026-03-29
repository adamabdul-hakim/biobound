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


# ── Receipt / product OCR PFAS analysis ──────────────────────────────────────

_KNOWN_PFAS_ITEMS: list[tuple[list[str], str, str, str, float | None]] = [
    # (keywords, level, category, reason, ppt_estimate)
    (["microwave popcorn", "popcorn bag"], "high", "packaging", "PFAS-coated microwave bags are a primary exposure source.", 45.0),
    (["fast food", "burger", "fries", "nuggets", "mcdonald", "burger king", "wendy", "kfc"], "high", "packaging", "Grease-resistant fast food wrappers commonly contain PFAS.", 30.0),
    (["pizza box", "pizza"], "high", "packaging", "PFAS-treated pizza boxes transfer chemicals to food.", 25.0),
    (["dental floss", "floss"], "high", "personal_care", "Many brands use PTFE/PFAS coating for glide.", 15.0),
    (["non-stick", "teflon", "nonstick"], "high", "cookware", "Non-stick coatings are a significant PFAS source when heated.", 40.0),
    (["stain resist", "stain-resist", "scotchgard", "waterproof spray"], "high", "other", "PFAS-based stain-resistance treatments leach into contact surfaces.", 20.0),
    (["canned soup", "canned food", "canned beans", "canned tuna", "canned corn"], "moderate", "packaging", "Can linings may contain PFAS that migrate into food.", 8.0),
    (["processed meat", "hot dog", "sausage", "deli meat", "bologna", "salami"], "moderate", "food", "Packaging and processing involve PFAS-treated materials.", 6.0),
    (["seafood", "salmon", "tuna", "shrimp", "fish", "tilapia", "cod"], "moderate", "food", "Bioaccumulation of PFAS in aquatic species is well-documented.", 10.0),
    (["takeout", "takeaway", "grease paper", "sandwich wrap"], "moderate", "packaging", "Grease-resistant food paper often contains PFAS.", 12.0),
    (["tap water", "unfiltered water"], "moderate", "water", "Unfiltered tap water can carry PFAS depending on location.", None),
    (["shampoo", "conditioner", "hair spray", "dry shampoo", "keratin"], "moderate", "personal_care", "Many hair products use PFAS for smoothness and water resistance.", 5.0),
    (["apple", "banana", "broccoli", "spinach", "kale", "carrot", "tomato", "lettuce", "cucumber"], "none", "food", "Fresh produce has negligible PFAS unless from contaminated soil.", 0.0),
    (["oats", "oatmeal", "beans", "lentils", "chickpeas", "quinoa", "brown rice"], "low", "food", "Whole grains and legumes have low PFAS exposure and support clearance.", 1.0),
    (["milk", "dairy", "cheese", "yogurt", "butter"], "low", "food", "Dairy may carry trace PFAS from feed and packaging.", 2.0),
    (["bread", "pasta", "cereal"], "low", "food", "Packaged grain products carry low PFAS from packaging contact.", 2.0),
    (["soap", "hand soap", "body wash", "lotion", "moisturizer"], "low", "personal_care", "Most bar soaps and basic lotions have low PFAS content.", 1.0),
    (["vitamin", "supplement", "protein powder"], "low", "other", "Supplements are generally low risk but packaging may contribute.", 1.0),
]


def _fallback_receipt_analysis(ocr_text: str) -> Dict[str, Any]:
    """Keyword-based PFAS item analysis when Gemini is unavailable."""
    text_lower = ocr_text.lower()
    found: list[Dict[str, Any]] = []
    seen: set[str] = set()

    for keywords, level, category, reason, ppt in _KNOWN_PFAS_ITEMS:
        for kw in keywords:
            if kw in text_lower and kw not in seen:
                seen.add(kw)
                found.append({
                    "item": kw.title(),
                    "pfas_level": level,
                    "ppt_estimate": ppt,
                    "reason": reason,
                    "category": category,
                })
                break

    return {"source": "fallback", "items": found}


def analyze_receipt_items(ocr_text: str) -> Dict[str, Any]:
    """Analyze items extracted from a receipt or product list via Gemini.

    Each returned item has: item, pfas_level, ppt_estimate, reason, category.
    Falls back to keyword matching if Gemini is unavailable.
    """
    if not ocr_text or not ocr_text.strip():
        return {"source": "no_text", "items": []}

    prompt = (
        "You are a PFAS toxicologist reviewing a grocery receipt or product list. "
        "PFAS (per- and polyfluoroalkyl substances) are found in: microwave popcorn bags (high), "
        "fast food / grease-resistant wrappers (high), non-stick cookware (high), "
        "dental floss (high), canned foods (moderate), seafood / fish (moderate), "
        "processed meats (moderate), hair products / dry shampoo (moderate), "
        "fresh produce (none), whole grains and legumes (low-none).\n\n"
        f"Receipt / product text to analyze:\n---\n{ocr_text[:3000]}\n---\n\n"
        "For each distinct product or food item you can identify, estimate its PFAS exposure risk. "
        "Ignore store names, addresses, prices, dates, totals, and transaction numbers.\n\n"
        "Return ONLY a JSON array with no extra text. Each element must have exactly these keys:\n"
        '  "item" (string): the product name as it appears\n'
        '  "pfas_level" (string): one of "none", "low", "moderate", "high"\n'
        '  "ppt_estimate" (number or null): estimated PFAS in ppt per serving, null if unknown\n'
        '  "reason" (string): 1-sentence explanation\n'
        '  "category" (string): one of "packaging", "food", "cookware", "personal_care", "water", "other"\n\n'
        "Example: "
        '[{"item":"Microwave Popcorn","pfas_level":"high","ppt_estimate":45,'
        '"reason":"PFAS-coated microwave bags are a primary source.","category":"packaging"}]'
    )

    try:
        raw = _call_gemini_api(prompt)
        raw_stripped = raw.strip()
        start = raw_stripped.find("[")
        end = raw_stripped.rfind("]") + 1
        if start >= 0 and end > start:
            items = json.loads(raw_stripped[start:end])
            if isinstance(items, list):
                valid_levels = {"none", "low", "moderate", "high"}
                valid_cats = {"packaging", "food", "cookware", "personal_care", "water", "other"}
                cleaned = [
                    {
                        "item": str(it.get("item", "Unknown")),
                        "pfas_level": it.get("pfas_level") if it.get("pfas_level") in valid_levels else "low",
                        "ppt_estimate": it.get("ppt_estimate") if isinstance(it.get("ppt_estimate"), (int, float)) else None,
                        "reason": str(it.get("reason", "")),
                        "category": it.get("category") if it.get("category") in valid_cats else "other",
                    }
                    for it in items
                    if isinstance(it, dict) and it.get("item")
                ]
                return {"source": "gemini", "items": cleaned}
    except Exception as e:
        logger.info("Gemini receipt analysis failed, using keyword fallback: %s", e)

    return _fallback_receipt_analysis(ocr_text)
