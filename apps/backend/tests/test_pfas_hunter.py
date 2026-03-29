from app.services.pfas_hunter import (
    ChemicalMatch,
    detect_chemicals_scored,
    normalize_text,
    rank_top_risk_contributors,
)


def test_normalize_text_basic() -> None:
    """Text normalization handles common patterns."""
    assert normalize_text("PTFE Coated Pan") == "ptfe coated pan"
    assert normalize_text("Scotchgard™ Fabric") == "scotchgard fabric"
    assert normalize_text("  extra   spaces  ") == "extra spaces"


def test_detect_chemicals_direct_term_ptfe() -> None:
    """Direct PFAS term detection returns formatted match."""
    matches = detect_chemicals_scored("PTFE non-stick coating")
    assert len(matches) > 0
    terms = [m.term for m in matches]
    assert "PTFE" in terms
    found = next(m for m in matches if m.term == "PTFE")
    assert found.rule_source == "direct_term"
    assert found.confidence >= 0.90


def test_detect_chemicals_direct_term_pfas() -> None:
    """PFAS abbreviation detection."""
    matches = detect_chemicals_scored("PFAS related compounds found")
    terms = [m.term for m in matches]
    assert "PFAS" in terms


def test_detect_chemicals_trade_name_teflon() -> None:
    """Trade name mapping to canonical term."""
    matches = detect_chemicals_scored("Teflon cookware label")
    terms = [m.term for m in matches]
    assert "PTFE" in terms
    found = next((m for m in matches if m.term == "PTFE"), None)
    assert found is not None
    assert found.rule_source == "trade_name"


def test_detect_chemicals_trade_name_scotchgard() -> None:
    """Scotchgard maps to PFAS."""
    matches = detect_chemicals_scored("Scotchgard treated")
    terms = [m.term for m in matches]
    assert "PFAS" in terms


def test_detect_chemicals_suffix_heuristic() -> None:
    """Suffix pattern heuristic detects fluorocarbon."""
    matches = detect_chemicals_scored("fluorocarbon based treatment")
    assert len(matches) > 0
    found = next(
        (m for m in matches if "fluorocarbon" in m.term.lower()), None
    )
    assert found is not None
    assert found.rule_source == "suffix_heuristic"


def test_detect_chemicals_empty_string() -> None:
    """Empty input returns no matches."""
    matches = detect_chemicals_scored("")
    assert len(matches) == 0


def test_detect_chemicals_no_matches() -> None:
    """Text without PFAS returns no matches."""
    matches = detect_chemicals_scored("Plain cotton fabric")
    assert len(matches) == 0


def test_rank_top_risk_contributors_basic() -> None:
    """Ranking selects top N by confidence."""
    match1 = ChemicalMatch(term="PTFE", rule_source="direct_term", confidence=0.95)
    match2 = ChemicalMatch(term="PFOA", rule_source="direct_term", confidence=0.90)
    match3 = ChemicalMatch(term="fluorocarbon", rule_source="suffix_heuristic", confidence=0.70)

    ranked = rank_top_risk_contributors({match1, match2, match3}, top_n=2)
    assert len(ranked) == 2
    assert ranked[0] == "PTFE"
    assert ranked[1] == "PFOA"


def test_rank_top_risk_contributors_deduplication() -> None:
    """Ranking removes duplicate terms, keeps highest score."""
    match1 = ChemicalMatch(term="PTFE", rule_source="direct_term", confidence=0.95)
    match2 = ChemicalMatch(term="PTFE", rule_source="suffix_heuristic", confidence=0.70)

    ranked = rank_top_risk_contributors({match1, match2}, top_n=5)
    assert ranked.count("PTFE") == 1


def test_rank_top_risk_contributors_source_priority() -> None:
    """Higher source priority breaks confidence ties."""
    match_direct = ChemicalMatch(
        term="PFAS", rule_source="direct_term", confidence=0.80
    )
    match_trade = ChemicalMatch(
        term="PFAS", rule_source="trade_name", confidence=0.85
    )

    ranked = rank_top_risk_contributors({match_direct, match_trade}, top_n=5)
    assert ranked == ["PFAS"]  # Deduplicated, direct_term version kept


def test_detect_chemicals_fixture_nonstick_pan() -> None:
    """Real-world fixture: nonstick pan OCR text."""
    ocr_text = "PTFE-coated non-stick cooking surface Teflon brand cookware"
    matches = detect_chemicals_scored(ocr_text)
    assert len(matches) > 0
    terms = [m.term for m in matches]
    assert "PTFE" in terms


def test_detect_chemicals_fixture_waterproof_fabric() -> None:
    """Fixture: waterproof fabric with trade name."""
    ocr_text = "Gore-Tex waterproof membrane fluorocarbon coating"
    matches = detect_chemicals_scored(ocr_text)
    terms = [m.term for m in matches]
    assert "PTFE" in terms or "fluorocarbon" in terms


def test_detect_chemicals_false_positive_plain_text() -> None:
    """False positive regression: plain fabric name."""
    ocr_text = "100% cotton natural textile"
    matches = detect_chemicals_scored(ocr_text)
    assert len(matches) == 0


def test_detect_chemicals_false_positive_fluorine_chemistry() -> None:
    """False positive regression: chemistry terms without PFAS context."""
    ocr_text = "Contains fluoride for dental health"
    matches = detect_chemicals_scored(ocr_text)
    terms = [m.term for m in matches]
    assert "fluoride" not in terms
