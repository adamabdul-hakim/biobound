"""Phase 4: Biological Decay Simulator.

Implements exponential decay model C(t) = C0 * e^(-k*t) with intervention logic
and medical warning gates.
"""

import math
from dataclasses import dataclass

from app.models.schemas import DecayPoint

# Decay constants (k) for known PFAS chemicals
# Based on epidemiological estimates of half-life
DECAY_CONSTANTS = {
    "PFOA": 0.182,  # half-life ~3.8 years
    "PFOS": 0.148,  # half-life ~4.7 years
    "PTFE": 0.347,  # half-life ~2.0 years (fast clearance via GI)
    "Teflon": 0.347,  # Trade name for PTFE
    "Scotchgard": 0.231,  # Generic PFAS assumption
}

DEFAULT_DECAY_CONSTANT = 0.231  # half-life ~3.0 years (conservative default)
INTERVENTION_ACCELERATION_FACTOR = 1.5  # Increase k by 50% when intervention applied
MIN_DECAY_LEVEL = 5.0  # Clamp below-threshold levels
STANDARD_HORIZONS = [2026, 2030, 2034]  # Reporting years (present + 4 + 8)


@dataclass
class DecaySimulation:
    """Complete decay simulation result."""

    decay_data: list[DecayPoint]
    chemical: str
    base_k: float
    applied_k: float
    intervention_applied: bool
    years_projected: list[int]


@dataclass
class MedicalWarningResult:
    """Medical warning evaluation result."""

    warnings: list[str]
    recommendation_safe: bool
    contraindication_present: bool
    contraindication_type: str | None


def get_decay_constant(chemical_term: str) -> float:
    """Retrieve decay constant for a specific chemical.

    Args:
        chemical_term: Chemical name or trade name.

    Returns:
        Decay constant k (per year). Falls back to default if unknown.
    """
    for key, value in DECAY_CONSTANTS.items():
        if key.lower() in chemical_term.lower():
            return value
    return DEFAULT_DECAY_CONSTANT


def simulate_decay(
    chemical: str | None = None,
    initial_level: int = 100,
    intervention_enabled: bool = False,
    contraindication_present: bool = False,
    years: list[int] | None = None,
) -> DecaySimulation:
    """Simulate PFAS decay using exponential model.

    Args:
        chemical: Chemical name. If None, uses default decay constant.
        initial_level: Starting level (0-100). Defaults to 100.
        intervention_enabled: Dietary intervention flag.
        contraindication_present: Medical contraindication present.
        years: Custom year horizons. Defaults to STANDARD_HORIZONS.

    Returns:
        DecaySimulation with decay_data, decay constant, intervention status.
    """
    if years is None:
        years = STANDARD_HORIZONS

    # Get base decay constant
    base_k = get_decay_constant(chemical) if chemical else DEFAULT_DECAY_CONSTANT

    # Apply intervention acceleration if safe
    applied_k = base_k
    intervention_applied = False
    if (
        intervention_enabled
        and not contraindication_present
    ):
        applied_k = base_k * INTERVENTION_ACCELERATION_FACTOR
        intervention_applied = True

    # Generate decay curve
    decay_data = []
    base_year = years[0]  # Reference year (typically 2026)

    for year in years:
        t = year - base_year  # Years elapsed since reference
        # Exponential decay: C(t) = C0 * e^(-k*t)
        level = initial_level * math.exp(-applied_k * t)
        # Clamp to minimum threshold
        level = max(level, MIN_DECAY_LEVEL)
        decay_data.append(DecayPoint(year=year, level=int(round(level))))

    return DecaySimulation(
        decay_data=decay_data,
        chemical=chemical or "Unknown",
        base_k=base_k,
        applied_k=applied_k,
        intervention_applied=intervention_applied,
        years_projected=years,
    )


def evaluate_medical_warnings(
    detected_chemicals: list[str],
    risk_score: int,
    contraindication: str | None = None,
) -> MedicalWarningResult:
    """Evaluate medical warnings and intervention safety.

    Args:
        detected_chemicals: List of detected chemical names.
        risk_score: Risk score from Phase 3 (0-100).
        contraindication: Medication/condition contraindication type if present.

    Returns:
        MedicalWarningResult with warnings list and safety status.
    """
    warnings = []
    recommendation_safe = True
    contraindication_present = contraindication is not None
    contraindication_type = contraindication

    # Gate 1: High-risk chemicals with contraindications
    persistent_terms = ["PFOA", "PFOS"]
    has_persistent = any(
        any(pterm.lower() in chem.lower() for pterm in persistent_terms)
        for chem in detected_chemicals
    )

    if contraindication_present:
        recommendation_safe = False
        warnings.append(
            f"Intervention not recommended due to contraindication: {contraindication}. "
            "Consult medical provider before dietary changes."
        )

    # Gate 2: High-risk scenario with persistent chemicals
    if has_persistent and risk_score >= 75:
        if not contraindication_present:
            # Safe to recommend but with caution
            warnings.append(
                "High-risk PFAS exposure detected (persistent compound). "
                "Dietary intervention recommended with medical supervision."
            )
        else:
            warnings.append(
                "High-risk PFAS exposure with contraindication present. "
                "Do not modify diet without medical review."
            )

    # Gate 3: Multiple detections (high-frequency exposure)
    if len(detected_chemicals) >= 3:
        warnings.append(
            f"Multiple PFAS types detected ({len(detected_chemicals)}). "
            "Exposure reduction advised."
        )
        if contraindication_present:
            recommendation_safe = False

    # Gate 4: Disclaimer for all non-empty results
    if detected_chemicals:
        warnings.append(
            "This analysis is informational only and not a medical recommendation. "
            "Consult your healthcare provider."
        )

    return MedicalWarningResult(
        warnings=warnings,
        recommendation_safe=recommendation_safe,
        contraindication_present=contraindication_present,
        contraindication_type=contraindication_type,
    )

