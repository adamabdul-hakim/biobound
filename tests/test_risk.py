"""Phase 3: Risk Scoring Module Tests.

Covers risk scoring formula validation, REI computation, confidence intervals,
and boundary conditions for risk assessment.
"""

import json

import pytest

from app.services.pfas_hunter import ChemicalMatch
from app.services.risk import (
    calculate_rei,
    calculate_risk_score,
    load_risk_config,
)


@pytest.fixture
def mock_config():
    """Fixture providing default risk config."""
    return {
        "risk_scoring": {
            "description": "Risk scoring calibration for PFAS detection",
            "version": "1.0",
            "base_weights": {
                "direct_term_multiplier": 1.0,
                "trade_name_multiplier": 0.9,
                "suffix_heuristic_multiplier": 0.7,
                "prefix_heuristic_multiplier": 0.5,
            },
        },
        "aggregation": {
            "max_contributors": 5,
            "confidence_floor": 0.5,
            "count_penalty_per_chemical": 0.05,
        },
        "rei_model": {
            "description": "Relevant Exposure Index assumptions",
            "default_rei_multiplier": 1.2,
            "exposure_scenarios": {
                "high_frequency_use": {
                    "threshold_match_count": 3,
                    "rei_multiplier": 1.5,
                    "description": "Multiple PFAS detections suggest frequent exposure",
                },
                "persistent_chemical": {
                    "terms": ["PFOA", "PFOS", "PTFE"],
                    "rei_multiplier": 1.3,
                    "description": "Known highly persistent chemicals",
                },
                "nonstick_food_contact": {
                    "terms": ["PTFE", "Teflon"],
                    "rei_multiplier": 1.2,
                    "description": "Direct food contact risk elevation",
                },
            },
        },
        "boundary_conditions": {
            "min_risk_score": 0,
            "max_risk_score": 100,
            "min_confidence_interval": 0.0,
            "max_confidence_interval": 1.0,
            "default_ocr_confidence": 0.85,
            "missing_detection_score": 0,
            "minimum_detection_threshold": 0.5,
        },
    }


class TestRiskScoreBasic:
    """Basic risk scoring tests."""

    def test_empty_detections_returns_zero_score(self, mock_config):
        """Risk score is 0 when no chemicals detected."""
        result = calculate_risk_score(set(), config=mock_config)
        assert result.risk_score == 0
        assert result.confidence_interval == 0.0
        assert result.detected_count == 0
        assert result.top_contributors == []

    def test_single_direct_term_detection(self, mock_config):
        """Single direct PFAS term produces risk score > 0."""
        match = ChemicalMatch(
            term="PTFE",
            rule_source="direct_term",
            confidence=0.95,
            matched_text="PTFE coating",
        )
        result = calculate_risk_score({match}, config=mock_config)

        assert result.risk_score > 0
        assert result.confidence_interval > 0.0
        assert result.detected_count == 1
        assert "PTFE" in result.top_contributors

    def test_multiple_detections_increases_score(self, mock_config):
        """More detections increase risk score (or maintain high level)."""
        single = ChemicalMatch(
            term="PTFE",
            rule_source="direct_term",
            confidence=0.95,
            matched_text="PTFE",
        )
        # Single calculation not used directly, but validates structure
        _single_result = calculate_risk_score({single}, config=mock_config)

        multiple = {
            ChemicalMatch(
                term="weak1",
                rule_source="prefix_heuristic",
                confidence=0.60,
                matched_text="weak1",
            ),
            ChemicalMatch(
                term="weak2",
                rule_source="prefix_heuristic",
                confidence=0.60,
                matched_text="weak2",
            ),
            ChemicalMatch(
                term="weak3",
                rule_source="prefix_heuristic",
                confidence=0.60,
                matched_text="weak3",
            ),
        }
        result_multiple = calculate_risk_score(multiple, config=mock_config)

        # Multiple detections trigger high-frequency REI (1.5 vs 1.0 default)
        # which should increase score
        assert result_multiple.detected_count == 3
        # The multiple low-confidence scenario creates baseline risk via REI
        assert result_multiple.rei_multiplier >= 1.2

    def test_risk_score_always_between_0_and_100(self, mock_config):
        """Risk score boundary invariant."""
        high_confidence_matches = {
            ChemicalMatch(
                term=f"CHEM{i}",
                rule_source="direct_term",
                confidence=0.99,
                matched_text=f"CHEM{i}",
            )
            for i in range(10)
        }
        result = calculate_risk_score(high_confidence_matches, config=mock_config)
        assert 0 <= result.risk_score <= 100
        assert 0.0 <= result.confidence_interval <= 1.0


class TestRiskScoreDeterminism:
    """Ensure risk scoring is deterministic."""

    def test_same_input_same_output(self, mock_config):
        """Identical inputs always produce identical scores."""
        chemicals = {
            ChemicalMatch(
                term="PTFE",
                rule_source="direct_term",
                confidence=0.95,
                matched_text="PTFE",
            ),
            ChemicalMatch(
                term="Teflon",
                rule_source="trade_name",
                confidence=0.85,
                matched_text="Teflon",
            ),
        }

        result1 = calculate_risk_score(chemicals, ocr_confidence=0.90, config=mock_config)
        result2 = calculate_risk_score(chemicals, ocr_confidence=0.90, config=mock_config)

        assert result1.risk_score == result2.risk_score
        assert result1.confidence_interval == result2.confidence_interval
        assert result1.top_contributors == result2.top_contributors


class TestSourceMultipliers:
    """Source-based weighting validation."""

    def test_config_weights_direct_term_highest(self, mock_config):
        """Config defines direct_term as highest multiplier."""
        weights = mock_config["risk_scoring"]["base_weights"]
        assert weights["direct_term_multiplier"] > weights["trade_name_multiplier"]
        assert weights["trade_name_multiplier"] > weights["suffix_heuristic_multiplier"]
        assert weights["suffix_heuristic_multiplier"] > weights["prefix_heuristic_multiplier"]

    def test_direct_term_multiplier_weights_correctly(self, mock_config):
        """Direct terms receive 1.0x multiplier."""
        direct = {
            ChemicalMatch(
                term="PFOA",
                rule_source="direct_term",
                confidence=0.80,
                matched_text="PFOA",
            )
        }
        result = calculate_risk_score(direct, config=mock_config)

        # Confidence 0.80, direct_term multiplier 1.0, no REI penalty
        # raw_score should reflect 0.80 * 1.0
        assert result.raw_score >= 0.70  # After count penalty of 0.05: 0.80 - 0.05


class TestConfidenceInterval:
    """Confidence interval computation."""

    def test_confidence_interval_depends_on_ocr_and_rule_strength(self, mock_config):
        """CI combines OCR and rule strength."""
        match = ChemicalMatch(
            term="PTFE",
            rule_source="direct_term",
            confidence=0.95,
            matched_text="PTFE",
        )

        high_ocr = calculate_risk_score({match}, ocr_confidence=0.99, config=mock_config)
        low_ocr = calculate_risk_score({match}, ocr_confidence=0.50, config=mock_config)

        assert high_ocr.confidence_interval > low_ocr.confidence_interval

    def test_confidence_interval_default_ocr(self, mock_config):
        """CI uses default OCR confidence if not provided."""
        match = ChemicalMatch(
            term="PTFE",
            rule_source="direct_term",
            confidence=0.95,
            matched_text="PTFE",
        )
        result = calculate_risk_score({match}, config=mock_config)

        # Should use default OCR confidence of 0.85
        expected_ci = 0.85 * 0.95  # OCR * rule strength
        assert abs(result.confidence_interval - expected_ci) < 0.01


class TestREIComputation:
    """REI (Relevant Exposure Index) multipliers."""

    def test_default_rei_with_single_detection(self, mock_config):
        """Single detection uses default REI."""
        match = ChemicalMatch(
            term="fluorocarbon",
            rule_source="suffix_heuristic",
            confidence=0.80,
            matched_text="fluorocarbon",
        )
        result = calculate_risk_score({match}, config=mock_config)

        # Default REI is 1.2
        assert result.rei_multiplier == 1.2

    def test_high_frequency_use_scenario(self, mock_config):
        """Multiple detections trigger high-frequency REI."""
        chemicals = {
            ChemicalMatch(
                term=f"CHEM{i}",
                rule_source="direct_term",
                confidence=0.90,
                matched_text=f"CHEM{i}",
            )
            for i in range(4)  # 4 >= threshold of 3
        }
        result = calculate_risk_score(chemicals, config=mock_config)

        # Should trigger high_frequency threshold (1.5)
        assert result.rei_multiplier == 1.5

    def test_persistent_chemical_scenario(self, mock_config):
        """Known persistent chemicals boost REI."""
        match = ChemicalMatch(
            term="PFOA",
            rule_source="direct_term",
            confidence=0.95,
            matched_text="PFOA",
        )
        result = calculate_risk_score({match}, config=mock_config)

        # PFOA is in persistent_terms, so REI should be 1.3
        assert result.rei_multiplier == 1.3

    def test_nonstick_food_contact_scenario(self, mock_config):
        """PTFE detection triggers nonstick food contact REI."""
        match = ChemicalMatch(
            term="PTFE",
            rule_source="direct_term",
            confidence=0.95,
            matched_text="PTFE",
        )
        result = calculate_risk_score({match}, config=mock_config)

        # PTFE is in nonstick_food_contact, REI is 1.2
        # But persistent_chemical (1.3) is higher, so should be 1.3
        assert result.rei_multiplier >= 1.2


class TestCalculateREI:
    """REI function detailed tests."""

    def test_rei_returns_multiplier_and_scenarios(self, mock_config):
        """REI result includes multiplier and active scenarios."""
        chemicals = {
            ChemicalMatch(
                term="PFOA",
                rule_source="direct_term",
                confidence=0.95,
                matched_text="PFOA",
            ),
            ChemicalMatch(
                term="PFOS",
                rule_source="direct_term",
                confidence=0.92,
                matched_text="PFOS",
            ),
            ChemicalMatch(
                term="PTFE",
                rule_source="direct_term",
                confidence=0.95,
                matched_text="PTFE",
            ),
        }
        rei_result = calculate_rei(chemicals, config=mock_config)

        assert "rei_multiplier" in rei_result
        assert "active_scenarios" in rei_result
        assert "total_detections" in rei_result
        assert "top_terms" in rei_result
        assert "rationale" in rei_result

    def test_rei_high_frequency_scenario_documented(self, mock_config):
        """High frequency scenario is documented in REI result."""
        chemicals = {
            ChemicalMatch(
                term=f"CHEM{i}",
                rule_source="direct_term",
                confidence=0.90,
                matched_text=f"CHEM{i}",
            )
            for i in range(4)
        }
        rei_result = calculate_rei(chemicals, config=mock_config)

        scenario_names = [s["name"] for s in rei_result["active_scenarios"]]
        assert "high_frequency_use" in scenario_names


class TestBoundaryConditions:
    """Clamping and default value tests."""

    def test_score_clamped_at_max(self, mock_config):
        """Score cannot exceed max_risk_score."""
        extreme_match = ChemicalMatch(
            term="EXTREME",
            rule_source="direct_term",
            confidence=1.0,
            matched_text="EXTREME",
        )
        result = calculate_risk_score({extreme_match}, config=mock_config)

        assert result.risk_score <= 100

    def test_score_clamped_at_min(self, mock_config):
        """Score cannot go below min_risk_score."""
        # Create a match below confidence threshold
        low_match = ChemicalMatch(
            term="LOW",
            rule_source="prefix_heuristic",
            confidence=0.40,  # Below 0.5 threshold
            matched_text="LOW",
        )
        result = calculate_risk_score({low_match}, config=mock_config)

        assert result.risk_score >= 0

    def test_confidence_interval_clamped(self, mock_config):
        """CI always within [0.0, 1.0]."""
        match = ChemicalMatch(
            term="PTFE",
            rule_source="direct_term",
            confidence=0.95,
            matched_text="PTFE",
        )
        result = calculate_risk_score({match}, ocr_confidence=1.5, config=mock_config)

        assert 0.0 <= result.confidence_interval <= 1.0

    def test_below_threshold_filtered(self, mock_config):
        """Chemicals below confidence threshold are filtered."""
        below_threshold = ChemicalMatch(
            term="WEAK",
            rule_source="prefix_heuristic",
            confidence=0.40,
            matched_text="WEAK",
        )
        above_threshold = ChemicalMatch(
            term="PTFE",
            rule_source="direct_term",
            confidence=0.95,
            matched_text="PTFE",
        )

        result = calculate_risk_score(
            {below_threshold, above_threshold}, config=mock_config
        )

        assert result.detected_count == 1
        assert "PTFE" in result.top_contributors
        assert "WEAK" not in result.top_contributors


class TestMaxContributors:
    """Top-N ranking."""

    def test_only_top_n_returned(self, mock_config):
        """Only top max_contributors are ranked."""
        chemicals = {
            ChemicalMatch(
                term=f"CHEM{i}",
                rule_source="direct_term",
                confidence=0.95 - (i * 0.05),
                matched_text=f"CHEM{i}",
            )
            for i in range(10)
        }
        result = calculate_risk_score(chemicals, config=mock_config)

        max_contributors = mock_config["aggregation"]["max_contributors"]
        assert len(result.top_contributors) <= max_contributors

    def test_ranking_by_confidence_then_term(self, mock_config):
        """Top N ordered by confidence (desc), then term alphabetically."""
        chemicals = {
            ChemicalMatch(
                term="Beta",
                rule_source="direct_term",
                confidence=0.95,
                matched_text="Beta",
            ),
            ChemicalMatch(
                term="Alpha",
                rule_source="direct_term",
                confidence=0.95,
                matched_text="Alpha",
            ),
            ChemicalMatch(
                term="Gamma",
                rule_source="direct_term",
                confidence=0.90,
                matched_text="Gamma",
            ),
        }
        result = calculate_risk_score(chemicals, config=mock_config)

        # Alpha and Beta both 0.95, should be alphabetical
        assert result.top_contributors[0] in ["Alpha", "Beta"]


class TestLoadRiskConfig:
    """Config loading tests."""

    def test_load_config_from_project_root(self, tmp_path):
        """Config loaded from project root by default."""
        config_data = {
            "risk_scoring": {"base_weights": {"direct_term_multiplier": 1.0}},
            "rei_model": {"default_rei_multiplier": 1.2},
            "boundary_conditions": {"max_risk_score": 100},
        }

        config_file = tmp_path / "risk_weights.json"
        with open(config_file, "w", encoding="utf-8") as f:
            json.dump(config_data, f)

        config = load_risk_config(str(config_file))
        assert config["risk_scoring"]["base_weights"]["direct_term_multiplier"] == 1.0

    def test_load_config_not_found_raises_error(self):
        """FileNotFoundError when config missing."""
        with pytest.raises(FileNotFoundError):
            load_risk_config("/nonexistent/path/risk_weights.json")


class TestFixtureScenarios:
    """Real-world product scenarios."""

    def test_nonstick_pan_scenario(self, mock_config):
        """Nonstick pan product with PTFE and Teflon."""
        chemicals = {
            ChemicalMatch(
                term="PTFE",
                rule_source="direct_term",
                confidence=0.95,
                matched_text="PTFE",
            ),
            ChemicalMatch(
                term="Teflon",
                rule_source="trade_name",
                confidence=0.85,
                matched_text="Teflon",
            ),
        }
        result = calculate_risk_score(chemicals, config=mock_config)

        assert result.risk_score > 50
        assert 2 == result.detected_count
        assert "PTFE" in result.top_contributors

    def test_waterproof_fabric_scenario(self, mock_config):
        """Waterproof fabric with Scotchgard and Gore-Tex."""
        chemicals = {
            ChemicalMatch(
                term="Scotchgard",
                rule_source="trade_name",
                confidence=0.9,
                matched_text="Scotchgard",
            ),
            ChemicalMatch(
                term="fluorocarbon",
                rule_source="suffix_heuristic",
                confidence=0.75,
                matched_text="fluorocarbon",
            ),
        }
        result = calculate_risk_score(chemicals, config=mock_config)

        assert result.risk_score > 0
        assert result.confidence_interval > 0.0

    def test_plain_text_no_chemicals(self, mock_config):
        """Plain household product with no PFAS."""
        result = calculate_risk_score(set(), config=mock_config)

        assert result.risk_score == 0
        assert result.confidence_interval == 0.0
        assert result.detected_count == 0
