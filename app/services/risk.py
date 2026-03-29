"""Phase 3: Risk Scoring and REI Model.

This module implements deterministic risk scoring formula with weighted components,
REI (Relevant Exposure Index) multipliers based on exposure assumptions, and confidence
interval computation from OCR and rule strength.
"""

import json
from dataclasses import dataclass
from pathlib import Path

from app.services.pfas_hunter import ChemicalMatch


@dataclass
class RiskScoreResult:
    """Risk scoring output with all intermediate values."""

    risk_score: int  # 0-100, deterministic
    confidence_interval: float  # 0.0-1.0
    detected_count: int
    top_contributors: list[str]
    rei_multiplier: float
    raw_score: float


def load_risk_config(config_path: str | None = None) -> dict:
    """Load risk calibration config from risk_weights.json.

    Args:
        config_path: Override path to risk_weights.json. Defaults to project root.

    Returns:
        Dictionary with risk scoring parameters.
    """
    if config_path is None:
        # Default to project root
        config_path = Path(__file__).parent.parent.parent / "risk_weights.json"
    else:
        config_path = Path(config_path)

    if not config_path.exists():
        raise FileNotFoundError(
            f"Risk config not found at {config_path}. "
            "Create risk_weights.json in project root."
        )

    with open(config_path, encoding="utf-8") as f:
        return json.load(f)


def calculate_risk_score(
    detected_chemicals: set[ChemicalMatch],
    ocr_confidence: float | None = None,
    config: dict | None = None,
) -> RiskScoreResult:
    """Calculate deterministic risk score from detected chemicals.

    Args:
        detected_chemicals: Set of ChemicalMatch objects from pfas_hunter.
        ocr_confidence: OCR confidence for the source text (0.0-1.0).
            Defaults to config boundary_conditions.default_ocr_confidence.
        config: Risk config dict. If None, loaded from risk_weights.json.

    Returns:
        RiskScoreResult with risk_score (0-100), confidence_interval, REI multiplier,
        and top contributors.
    """
    if config is None:
        config = load_risk_config()

    # Handle empty detections
    if not detected_chemicals:
        return RiskScoreResult(
            risk_score=config["boundary_conditions"]["missing_detection_score"],
            confidence_interval=0.0,
            detected_count=0,
            top_contributors=[],
            rei_multiplier=1.0,
            raw_score=0.0,
        )

    # Filter by minimum confidence threshold
    threshold = config["boundary_conditions"]["minimum_detection_threshold"]
    filtered = [c for c in detected_chemicals if c.confidence >= threshold]

    if not filtered:
        return RiskScoreResult(
            risk_score=config["boundary_conditions"]["missing_detection_score"],
            confidence_interval=0.0,
            detected_count=0,
            top_contributors=[],
            rei_multiplier=1.0,
            raw_score=0.0,
        )

    # Sort by confidence (descending) for reproducibility
    sorted_chemicals = sorted(
        filtered, key=lambda x: (-x.confidence, x.term)
    )

    # Take top N contributors
    max_contributors = config["aggregation"]["max_contributors"]
    top_contributors_list = sorted_chemicals[:max_contributors]
    top_terms = [c.term for c in top_contributors_list]

    # Calculate weighted average confidence with source multipliers
    base_weights = config["risk_scoring"]["base_weights"]
    source_key_map = {
        "direct_term": "direct_term_multiplier",
        "trade_name": "trade_name_multiplier",
        "suffix_heuristic": "suffix_heuristic_multiplier",
        "prefix_heuristic": "prefix_heuristic_multiplier",
    }

    weighted_sum = 0.0
    weight_total = 0.0

    for chemical in top_contributors_list:
        source_key = source_key_map.get(chemical.rule_source, "prefix_heuristic")
        source_multiplier = base_weights[source_key]
        weighted_score = chemical.confidence * source_multiplier
        weighted_sum += weighted_score
        weight_total += source_multiplier

    # Average weighted confidence
    avg_weighted_confidence = weighted_sum / weight_total if weight_total > 0 else 0.0

    # Apply count penalty: more chemicals detected = slight penalty for uncertainty
    count_penalty = len(top_contributors_list) * config["aggregation"][
        "count_penalty_per_chemical"
    ]
    raw_score = max(0.0, avg_weighted_confidence - count_penalty)

    # Compute REI multiplier based on exposure scenarios
    rei_multiplier = _compute_rei_multiplier(top_terms, len(filtered), config)

    # Final risk score: 0-100 clamped
    preliminary_score = raw_score * rei_multiplier * 100
    risk_score = int(
        min(
            config["boundary_conditions"]["max_risk_score"],
            max(
                config["boundary_conditions"]["min_risk_score"],
                preliminary_score,
            ),
        )
    )

    # Confidence interval: OCR confidence * average rule strength
    if ocr_confidence is None:
        ocr_confidence = config["boundary_conditions"]["default_ocr_confidence"]

    rule_strength_avg = avg_weighted_confidence
    confidence_interval = ocr_confidence * rule_strength_avg
    confidence_interval = min(
        config["boundary_conditions"]["max_confidence_interval"],
        max(
            config["boundary_conditions"]["min_confidence_interval"],
            confidence_interval,
        ),
    )

    return RiskScoreResult(
        risk_score=risk_score,
        confidence_interval=confidence_interval,
        detected_count=len(filtered),
        top_contributors=top_terms,
        rei_multiplier=rei_multiplier,
        raw_score=raw_score,
    )


def _compute_rei_multiplier(
    top_terms: list[str], total_detections: int, config: dict
) -> float:
    """Compute REI (Relevant Exposure Index) multiplier from exposure scenarios.

    Args:
        top_terms: List of top detected chemical terms.
        total_detections: Total count of detected chemicals.
        config: Risk config dict.

    Returns:
        REI multiplier (typically 1.0-1.5).
    """
    rei = config["rei_model"]["default_rei_multiplier"]
    scenarios = config["rei_model"]["exposure_scenarios"]

    # Scenario 1: Multiple detections suggest high-frequency use
    high_frequency_threshold = scenarios["high_frequency_use"]["threshold_match_count"]
    if total_detections >= high_frequency_threshold:
        rei = max(rei, scenarios["high_frequency_use"]["rei_multiplier"])

    # Scenario 2: Known highly persistent chemicals
    persistent_terms = scenarios["persistent_chemical"]["terms"]
    for term in top_terms:
        if any(pterm.lower() in term.lower() for pterm in persistent_terms):
            rei = max(rei, scenarios["persistent_chemical"]["rei_multiplier"])
            break

    # Scenario 3: Nonstick food contact products
    nonstick_terms = scenarios["nonstick_food_contact"]["terms"]
    for term in top_terms:
        if any(nterm.lower() in term.lower() for nterm in nonstick_terms):
            rei = max(rei, scenarios["nonstick_food_contact"]["rei_multiplier"])
            break

    return rei


def calculate_rei(
    detected_chemicals: set[ChemicalMatch],
    config: dict | None = None,
) -> dict:
    """Calculate Relevant Exposure Index with frequency and exposure assumptions.

    Args:
        detected_chemicals: Set of ChemicalMatch objects.
        config: Risk config dict. If None, loaded from risk_weights.json.

    Returns:
        Dictionary with REI value, active scenarios, and rationale.
    """
    if config is None:
        config = load_risk_config()

    filtered = [
        c
        for c in detected_chemicals
        if c.confidence >= config["boundary_conditions"]["minimum_detection_threshold"]
    ]

    if not filtered:
        return {
            "rei_multiplier": 1.0,
            "active_scenarios": [],
            "total_detections": 0,
            "rationale": "No chemicals detected above threshold.",
        }

    sorted_chemicals = sorted(
        filtered, key=lambda x: (-x.confidence, x.term)
    )
    top_terms = [c.term for c in sorted_chemicals[: config["aggregation"]["max_contributors"]]]

    sei = config["rei_model"]["default_rei_multiplier"]
    active_scenarios = []
    scenarios = config["rei_model"]["exposure_scenarios"]

    # Check high frequency scenario
    if len(filtered) >= scenarios["high_frequency_use"]["threshold_match_count"]:
        sei = max(sei, scenarios["high_frequency_use"]["rei_multiplier"])
        threshold_count = scenarios["high_frequency_use"]["threshold_match_count"]
        active_scenarios.append(
            {
                "name": "high_frequency_use",
                "reason": f"Detected {len(filtered)} chemicals (≥ {threshold_count})",
            }
        )

    # Check persistent chemical scenario
    persistent_terms = scenarios["persistent_chemical"]["terms"]
    for term in top_terms:
        if any(pterm.lower() in term.lower() for pterm in persistent_terms):
            sei = max(sei, scenarios["persistent_chemical"]["rei_multiplier"])
            active_scenarios.append(
                {"name": "persistent_chemical", "reason": f"Detected {term}"}
            )
            break

    # Check nonstick food contact scenario
    nonstick_terms = scenarios["nonstick_food_contact"]["terms"]
    for term in top_terms:
        if any(nterm.lower() in term.lower() for nterm in nonstick_terms):
            sei = max(sei, scenarios["nonstick_food_contact"]["rei_multiplier"])
            active_scenarios.append(
                {"name": "nonstick_food_contact", "reason": f"Detected {term}"}
            )
            break

    return {
        "rei_multiplier": sei,
        "active_scenarios": active_scenarios,
        "total_detections": len(filtered),
        "top_terms": top_terms,
        "rationale": (
            f"Based on {len(active_scenarios)} active exposure scenario(s)"
            if active_scenarios
            else "Default REI from baseline assumptions"
        ),
    }
