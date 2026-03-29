"""Phase 4: Decay Simulator Tests.

Tests for exponential decay model, intervention logic, medical warnings,
and boundary conditions.
"""

import math

from app.services.decay import (
    DECAY_CONSTANTS,
    DEFAULT_DECAY_CONSTANT,
    INTERVENTION_ACCELERATION_FACTOR,
    MIN_DECAY_LEVEL,
    STANDARD_HORIZONS,
    evaluate_medical_warnings,
    get_decay_constant,
    simulate_decay,
)


class TestDecayConstantLookup:
    """Test decay constant retrieval by chemical."""

    def test_pfoa_constant(self):
        """PFOA has correct decay constant."""
        k = get_decay_constant("PFOA")
        assert k == DECAY_CONSTANTS["PFOA"]
        assert abs(k - 0.182) < 0.001  # ~3.8 year half-life

    def test_pfos_constant(self):
        """PFOS has correct decay constant."""
        k = get_decay_constant("PFOS")
        assert k == DECAY_CONSTANTS["PFOS"]
        assert abs(k - 0.148) < 0.001  # ~4.7 year half-life

    def test_ptfe_constant(self):
        """PTFE has correct decay constant."""
        k = get_decay_constant("PTFE")
        assert k == DECAY_CONSTANTS["PTFE"]
        assert abs(k - 0.347) < 0.001  # ~2.0 year half-life

    def test_teflon_alias(self):
        """Teflon (trade name) maps to PTFE constant."""
        k = get_decay_constant("Teflon")
        assert k == DECAY_CONSTANTS["Teflon"]

    def test_case_insensitive_lookup(self):
        """Chemical lookup is case-insensitive."""
        assert get_decay_constant("PFOA") == get_decay_constant("pfoa")
        assert get_decay_constant("Teflon") == get_decay_constant("teflon")

    def test_unknown_chemical_uses_default(self):
        """Unknown chemical falls back to default constant."""
        k = get_decay_constant("UnknownChemXYZ")
        assert k == DEFAULT_DECAY_CONSTANT


class TestExponentialDecayModel:
    """Test C(t) = C0 * e^(-k*t) formula."""

    def test_zero_time_returns_initial_level(self):
        """At t=0, level equals initial level."""
        result = simulate_decay(chemical="PFOA", initial_level=100)
        assert result.decay_data[0].level == 100
        assert result.decay_data[0].year == 2026

    def test_decay_decreases_over_time(self):
        """Level decreases monotonically over time."""
        result = simulate_decay(chemical="PFOA")
        levels = [d.level for d in result.decay_data]
        for i in range(len(levels) - 1):
            assert levels[i] > levels[i + 1]

    def test_half_life_calculation(self):
        """After one half-life, level is approximately 50."""
        # PFOA: t_half = ln(2) / k = 0.693 / 0.182 ≈ 3.8 years
        k = DECAY_CONSTANTS["PFOA"]
        t_half = math.log(2) / k
        level = 100 * math.exp(-k * t_half)
        assert abs(level - 50) < 1  # Within 1%

    def test_custom_years_respected(self):
        """Custom year horizons are used."""
        custom_years = [2026, 2028, 2032]
        result = simulate_decay(years=custom_years)
        returned_years = [d.year for d in result.decay_data]
        assert returned_years == custom_years

    def test_standard_horizons_default(self):
        """Defaults to STANDARD_HORIZONS [2026, 2030, 2034]."""
        result = simulate_decay()
        returned_years = [d.year for d in result.decay_data]
        assert returned_years == STANDARD_HORIZONS

    def test_initial_level_parameter(self):
        """Custom initial level is respected."""
        result = simulate_decay(initial_level=80)
        assert result.decay_data[0].level == 80


class TestInterventionLogic:
    """Intervention acceleration when safe."""

    def test_no_intervention_without_flag(self):
        """Without intervention_enabled, k unchanged."""
        result = simulate_decay(chemical="PFOA", intervention_enabled=False)
        assert result.applied_k == DECAY_CONSTANTS["PFOA"]
        assert not result.intervention_applied

    def test_intervention_accelerates_decay(self):
        """With intervention (no contraindication), k is accelerated."""
        result = simulate_decay(
            chemical="PFOA",
            intervention_enabled=True,
            contraindication_present=False,
        )
        expected_k = DECAY_CONSTANTS["PFOA"] * INTERVENTION_ACCELERATION_FACTOR
        assert abs(result.applied_k - expected_k) < 0.001
        assert result.intervention_applied

    def test_contraindication_blocks_intervention(self):
        """With contraindication, intervention is blocked."""
        result = simulate_decay(
            chemical="PFOA",
            intervention_enabled=True,
            contraindication_present=True,
        )
        assert result.applied_k == DECAY_CONSTANTS["PFOA"]  # Unchanged
        assert not result.intervention_applied

    def test_intervention_faster_decay(self):
        """Intervention produces faster decay curve."""
        no_intervention = simulate_decay(
            chemical="PFOA", intervention_enabled=False
        )
        with_intervention = simulate_decay(
            chemical="PFOA",
            intervention_enabled=True,
            contraindication_present=False,
        )

        # At year 2030 (4 years), intervention should yield lower level
        assert with_intervention.decay_data[1].level < no_intervention.decay_data[1].level


class TestBoundaryConditions:
    """Clamping and limits."""

    def test_level_never_below_minimum(self):
        """All levels clamped to MIN_DECAY_LEVEL (5.0)."""
        result = simulate_decay(
            chemical="PTFE",  # Fastest decay
            years=[2026, 2040, 2050, 2100],
        )
        for point in result.decay_data:
            assert point.level >= MIN_DECAY_LEVEL

    def test_level_never_above_initial(self):
        """Levels never exceed initial level."""
        result = simulate_decay(initial_level=100)
        for point in result.decay_data:
            assert point.level <= 100

    def test_negative_time_not_used(self):
        """Decay assumes non-negative years."""
        result = simulate_decay(years=[2026, 2030])
        # All year differences >= 0
        for i, point in enumerate(result.decay_data):
            assert point.year >= 2026


class TestMedicalWarnings:
    """Warning gates and recommendation safety."""

    def test_no_warnings_empty_detections(self):
        """No warnings when no chemicals detected."""
        result = evaluate_medical_warnings(
            detected_chemicals=[],
            risk_score=0,
        )
        assert result.warnings == []
        assert result.recommendation_safe

    def test_contraindication_sets_unsafe(self):
        """Contraindication sets recommendation_safe=False."""
        result = evaluate_medical_warnings(
            detected_chemicals=["PFOA"],
            risk_score=80,
            contraindication="kidney_disease",
        )
        assert not result.recommendation_safe
        assert result.contraindication_present
        assert result.contraindication_type == "kidney_disease"
        assert any("contraindication" in w.lower() for w in result.warnings)

    def test_persistent_chemical_high_risk(self):
        """Persistent chemical (PFOA/PFOS) + high score triggers warning."""
        result = evaluate_medical_warnings(
            detected_chemicals=["PFOA"],
            risk_score=80,
        )
        assert result.recommendation_safe  # No contraindication
        assert len(result.warnings) >= 1
        assert any("persistent" in w.lower() for w in result.warnings)

    def test_low_risk_persistent_safe(self):
        """Persistent chemical with low score is safe."""
        result = evaluate_medical_warnings(
            detected_chemicals=["PFOA"],
            risk_score=30,
        )
        assert result.recommendation_safe

    def test_multiple_detections_warning(self):
        """Multiple detections (>=3) trigger warning."""
        result = evaluate_medical_warnings(
            detected_chemicals=["PFOA", "PFOS", "PTFE"],
            risk_score=50,
        )
        assert any("multiple" in w.lower() for w in result.warnings)

    def test_high_risk_with_contraindication_unsafe(self):
        """High-risk persistent + contraindication = unsafe."""
        result = evaluate_medical_warnings(
            detected_chemicals=["PFOA", "PFOS"],
            risk_score=85,
            contraindication="liver_impairment",
        )
        assert not result.recommendation_safe
        assert "contraindication" in result.warnings[0].lower()

    def test_disclaimer_always_present(self):
        """Mandatory disclaimer in warnings when chemicals detected."""
        result = evaluate_medical_warnings(
            detected_chemicals=["PFOA"],
            risk_score=50,
        )
        assert any("informational" in w.lower() for w in result.warnings)


class TestDecaySimulationMetadata:
    """Decay result structure and metadata."""

    def test_result_contains_all_fields(self):
        """DecaySimulation has all expected fields."""
        result = simulate_decay(chemical="PFOA")
        assert hasattr(result, "decay_data")
        assert hasattr(result, "chemical")
        assert hasattr(result, "base_k")
        assert hasattr(result, "applied_k")
        assert hasattr(result, "intervention_applied")
        assert hasattr(result, "years_projected")

    def test_chemical_tracked(self):
        """Chemical name is preserved in result."""
        result = simulate_decay(chemical="PTFE")
        assert result.chemical == "PTFE"

    def test_decay_constants_stored(self):
        """Base and applied k are both stored."""
        result = simulate_decay(
            chemical="PFOA",
            intervention_enabled=True,
            contraindication_present=False,
        )
        assert result.base_k == DECAY_CONSTANTS["PFOA"]
        assert result.applied_k > result.base_k


class TestDeterminism:
    """Decay calculations are deterministic."""

    def test_same_input_same_output(self):
        """Identical inputs produce identical decay curves."""
        result1 = simulate_decay(
            chemical="PFOA",
            initial_level=100,
            intervention_enabled=True,
            contraindication_present=False,
        )
        result2 = simulate_decay(
            chemical="PFOA",
            initial_level=100,
            intervention_enabled=True,
            contraindication_present=False,
        )

        assert len(result1.decay_data) == len(result2.decay_data)
        for p1, p2 in zip(result1.decay_data, result2.decay_data):
            assert p1.year == p2.year
            assert p1.level == p2.level

    def test_warning_determinism(self):
        """Same inputs produce same warnings."""
        result1 = evaluate_medical_warnings(
            detected_chemicals=["PFOA"],
            risk_score=85,
            contraindication="kidney",
        )
        result2 = evaluate_medical_warnings(
            detected_chemicals=["PFOA"],
            risk_score=85,
            contraindication="kidney",
        )

        assert result1.warnings == result2.warnings
        assert result1.recommendation_safe == result2.recommendation_safe


class TestFixtureScenarios:
    """Real-world product scenarios."""

    def test_nonstick_pan_scenario(self):
        """Nonstick pan: PTFE fast decay, safe intervention."""
        decay = simulate_decay(
            chemical="PTFE",
            intervention_enabled=True,
            contraindication_present=False,
        )
        warnings = evaluate_medical_warnings(
            detected_chemicals=["PTFE"],
            risk_score=45,
        )

        assert decay.intervention_applied
        assert warnings.recommendation_safe
        # Level should drop significantly by year 2030 (fast-decaying)
        assert decay.decay_data[1].level < decay.decay_data[0].level

    def test_waterproof_fabric_scenario(self):
        """Waterproof fabric: Scotchgard, persistent, safe to intervene."""
        decay = simulate_decay(
            chemical="Scotchgard",
            intervention_enabled=True,
            contraindication_present=False,
        )
        warnings = evaluate_medical_warnings(
            detected_chemicals=["Scotchgard"],
            risk_score=55,
        )

        assert decay.intervention_applied
        assert warnings.recommendation_safe

    def test_multiple_pfas_with_contraindication(self):
        """Multiple PFAS + kidney disease = unsafe intervention."""
        decay = simulate_decay(
            chemical="PFOA",
            intervention_enabled=True,
            contraindication_present=True,
        )
        warnings = evaluate_medical_warnings(
            detected_chemicals=["PFOA", "PFOS", "PTFE"],
            risk_score=80,
            contraindication="chronic_kidney_disease",
        )

        assert not decay.intervention_applied  # Blocked by contraindication
        assert not warnings.recommendation_safe
        assert warnings.contraindication_present
        assert len(warnings.warnings) > 0


class TestAssumptions:
    """Validate assumptions used in model."""

    def test_half_life_to_k_conversion(self):
        """Verify half-life to k conversion: k = ln(2) / t_half."""
        expected_k_pfoa = math.log(2) / 3.8
        actual_k_pfoa = DECAY_CONSTANTS["PFOA"]
        assert abs(expected_k_pfoa - actual_k_pfoa) < 0.01

    def test_intervention_multiplier_applied(self):
        """Intervention increases k by INTERVENTION_ACCELERATION_FACTOR."""
        base_k = DEFAULT_DECAY_CONSTANT
        result = simulate_decay(
            intervention_enabled=True,
            contraindication_present=False,
        )
        expected_k = base_k * INTERVENTION_ACCELERATION_FACTOR
        assert abs(result.applied_k - expected_k) < 0.001
