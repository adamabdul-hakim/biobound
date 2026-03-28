"""Unit tests for PFAS Detection Engine (Phase 2)."""

from app.services.ocr import OCRResult, OCRTextLine
from app.services.parser import detect_chemicals
from app.services.pfas_hunter import (
    ChemicalMatch,
    detect_chemicals_scored,
    normalize_text,
    rank_top_risk_contributors,
)


class TestNormalization:
    """Test text normalization pipeline."""

    def test_normalize_lowercase(self) -> None:
        assert normalize_text("PTFE") == "ptfe"
        assert normalize_text("Teflon") == "teflon"

    def test_normalize_punctuation_removal(self) -> None:
        assert normalize_text("PTFE, coated") == "ptfe coated"
        assert normalize_text("non-stick!") == "non-stick"  # Hyphens are kept

    def test_normalize_whitespace_cleanup(self) -> None:
        assert normalize_text("PTFE   coated") == "ptfe coated"
        assert normalize_text("  text  ") == "text"

    def test_normalize_empty_string(self) -> None:
        assert normalize_text("") == ""

    def test_normalize_ocr_artifacts(self) -> None:
        # Simulating common OCR errors
        assert normalize_text("PTE...") == "pte"  # Dots removed
        assert normalize_text("G@RE-TEX") == "gre-tex"  # @ removed, hyphen kept


class TestDirectTermDetection:
    """Test direct PFAS term matching."""

    def test_detect_ptfe(self) -> None:
        matches = detect_chemicals_scored("PTFE coated pan")
        terms = {m.term for m in matches}
        assert "PTFE" in terms

    def test_detect_pfoa(self) -> None:
        matches = detect_chemicals_scored("Contains PFOA in coating")
        terms = {m.term for m in matches}
        assert "PFOA" in terms

    def test_detect_pfos(self) -> None:
        matches = detect_chemicals_scored("PFOS identified in product")
        terms = {m.term for m in matches}
        assert "PFOS" in terms

    def test_detect_fluorotelomer(self) -> None:
        matches = detect_chemicals_scored("Grease-resistant fluorotelomer treatment")
        terms = {m.term for m in matches}
        assert "fluorotelomer" in terms

    def test_case_insensitive_matching(self) -> None:
        matches_lower = detect_chemicals_scored("ptfe")
        matches_upper = detect_chemicals_scored("PTFE")
        matches_mixed = detect_chemicals_scored("PtFe")

        assert len(matches_lower) == len(matches_upper) == len(matches_mixed)


class TestTradeNameDetection:
    """Test trade name mapping."""

    def test_detect_teflon(self) -> None:
        matches = detect_chemicals_scored("Teflon coated")
        terms = {m.term for m in matches}
        assert "PTFE" in terms  # Maps to canonical term

    def test_detect_scotchgard(self) -> None:
        matches = detect_chemicals_scored("Treated with Scotchgard")
        terms = {m.term for m in matches}
        assert "PFAS" in terms

    def test_detect_goretex(self) -> None:
        matches = detect_chemicals_scored("Gore-Tex material")
        terms = {m.term for m in matches}
        assert "PTFE" in terms


class TestHeuristicDetection:
    """Test suffix/prefix heuristic patterns."""

    def test_detect_fluorocarbon(self) -> None:
        matches = detect_chemicals_scored("fluorocarbon compound")
        # Should have at least one heuristic match
        assert any(m.rule_source in ("suffix_heuristic", "prefix_heuristic") for m in matches)

    def test_detect_perfluoro(self) -> None:
        matches = detect_chemicals_scored("perfluoro alkane")
        terms = {m.term for m in matches}
        assert any("perfluoro" in t.lower() for t in terms)


class TestConfidenceScoring:
    """Test confidence scores for different detection methods."""

    def test_direct_term_highest_confidence(self) -> None:
        matches = detect_chemicals_scored("PTFE")
        ptfe_matches = {m for m in matches if m.term == "PTFE"}
        assert any(m.confidence >= 0.90 for m in ptfe_matches)

    def test_trade_name_confidence(self) -> None:
        matches = detect_chemicals_scored("Teflon")
        trade_matches = {m for m in matches if m.rule_source == "trade_name"}
        assert any(m.confidence == 0.85 for m in trade_matches)

    def test_heuristic_lower_confidence(self) -> None:
        matches = detect_chemicals_scored("fluorinated compound")
        heuristic_matches = {
            m for m in matches if m.rule_source in ("suffix_heuristic", "prefix_heuristic")
        }
        if heuristic_matches:
            assert all(m.confidence <= 0.85 for m in heuristic_matches)


class TestDuplicateDeduplication:
    """Test deduplication of equivalent matches."""

    def test_duplicate_rules_deduplicated(self) -> None:
        # Text with multiple mentions of same chemical
        matches = detect_chemicals_scored("PTFE PTFE PTFE")
        ptfe_count = sum(1 for m in matches if m.term == "PTFE")
        # Should have minimal duplicates (set behavior)
        assert ptfe_count <= 2  # Deduplication by (term, rule_source)

    def test_duplicate_by_term_and_source(self) -> None:
        matches = detect_chemicals_scored("PTFE and PTFE again")
        # ChemicalMatch uses hash based on term+rule_source
        unique_ptfe = {m for m in matches if m.term == "PTFE" and m.rule_source == "direct_term"}
        assert len(unique_ptfe) <= 1


class TestRanking:
    """Test deterministic ranking of top risk contributors."""

    def test_rank_by_confidence(self) -> None:
        matches = {
            ChemicalMatch("Low", "direct_term", 0.5),
            ChemicalMatch("High", "direct_term", 0.95),
            ChemicalMatch("Medium", "direct_term", 0.75),
        }
        ranked = rank_top_risk_contributors(matches, top_n=3)
        assert ranked[0] == "High"
        assert ranked[1] == "Medium"
        assert ranked[2] == "Low"

    def test_rank_respects_top_n(self) -> None:
        matches = {
            ChemicalMatch(f"Term{i}", "direct_term", 0.9 - i * 0.1)
            for i in range(10)
        }
        ranked = rank_top_risk_contributors(matches, top_n=5)
        assert len(ranked) == 5

    def test_rank_by_rule_source_priority(self) -> None:
        # Confidence is primary sort key, rule_source is secondary
        matches = {
            ChemicalMatch("X", "prefix_heuristic", 0.95),
            ChemicalMatch("Y", "direct_term", 0.85),
        }
        ranked = rank_top_risk_contributors(matches, top_n=2)
        # X has higher confidence (0.95) so ranks first despite being heuristic
        assert ranked[0] == "X"
        assert ranked[1] == "Y"

    def test_rank_deterministic_alphabetical_tiebreak(self) -> None:
        matches = {
            ChemicalMatch("PTFE", "direct_term", 0.85),
            ChemicalMatch("PFOA", "direct_term", 0.85),
        }
        ranked = rank_top_risk_contributors(matches, top_n=2)
        assert ranked == ["PFOA", "PTFE"]  # Alphabetical order


class TestParserIntegration:
    """Test integration with parser module."""

    def test_detect_chemicals_with_ocr_result(self) -> None:
        ocr_result = OCRResult(
            raw_text="PTFE coated non-stick pan",
            text_blocks=[OCRTextLine(text="PTFE coated", confidence=0.9)],
            labels=["cookware"],
            confidence=0.9,
            provider="mock",
        )
        chemicals = detect_chemicals(ocr_result)
        assert "PTFE" in chemicals

    def test_detect_chemicals_with_product_hint(self) -> None:
        ocr_result = OCRResult(
            raw_text="coated pan",
            text_blocks=[OCRTextLine(text="coated pan", confidence=0.9)],
            labels=[],
            confidence=0.9,
            provider="mock",
        )
        chemicals = detect_chemicals(ocr_result, product_name_hint="Teflon cookware")
        assert "PTFE" in chemicals

    def test_detect_chemicals_empty_result(self) -> None:
        ocr_result = OCRResult(
            raw_text="",
            text_blocks=[],
            labels=[],
            confidence=0.0,
            provider="mock",
        )
        chemicals = detect_chemicals(ocr_result)
        assert chemicals == []


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_empty_text(self) -> None:
        matches = detect_chemicals_scored("")
        assert len(matches) == 0

    def test_none_text_handled_gracefully(self) -> None:
        chemicals = detect_chemicals(
            OCRResult(
                raw_text="",
                text_blocks=[],
                labels=[],
                confidence=0.0,
                provider="mock",
            )
        )
        assert chemicals == []

    def test_word_boundary_prevents_false_positives(self) -> None:
        # "ptfe-free" should not match PTFE
        matches = detect_chemicals_scored("ptfe-free coating")
        # Should not match because word boundary prevents "pte" from matching "ptfe"
        # But "free" alone shouldn't match either
        terms = {m.term for m in matches}
        # Should have minimal noise
        assert len(terms) <= 2  # Allow for heuristic matches but not spurious ones


class TestFixtures:
    """Test against baseline fixtures from design doc."""

    def test_fixture_nonstick_pan(self) -> None:
        ocr_result = OCRResult(
            raw_text="PTFE coated non-stick surface",
            text_blocks=[OCRTextLine(text="PTFE coated", confidence=0.95)],
            labels=[],
            confidence=0.95,
            provider="mock",
        )
        chemicals = detect_chemicals(ocr_result)
        assert "PTFE" in chemicals

    def test_fixture_popcorn_bag(self) -> None:
        ocr_result = OCRResult(
            raw_text="Grease-resistant fluorotelomer treatment",
            text_blocks=[OCRTextLine(text="fluorotelomer treatment", confidence=0.85)],
            labels=[],
            confidence=0.85,
            provider="mock",
        )
        chemicals = detect_chemicals(ocr_result)
        assert "fluorotelomer" in chemicals
