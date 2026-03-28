"""PFAS Detection Engine - identifies PFAS and PFAS-adjacent terms from OCR text."""

import re
from dataclasses import dataclass, field
from typing import Literal


@dataclass
class ChemicalMatch:
    """A detected chemical with scoring details."""

    term: str
    rule_source: Literal["direct_term", "suffix_heuristic", "prefix_heuristic", "trade_name"]
    confidence: float
    matched_text: str = ""  # Original text from OCR that matched

    def __hash__(self) -> int:
        return hash((self.term, self.rule_source))

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, ChemicalMatch):
            return False
        return self.term == other.term and self.rule_source == other.rule_source


# Direct PFAS terms database
DIRECT_PFAS_TERMS = {
    "PTFE": 0.95,
    "PFOA": 0.95,
    "PFOS": 0.95,
    "fluorotelomer": 0.90,
    "polyfluoroalkyl": 0.90,
    "perfluorinated": 0.85,
    "perfluoroalkyl": 0.85,
    "PFAS": 0.95,
    "GenX": 0.90,
    "ADONA": 0.90,
}

# Trade names for PFAS-based products
TRADE_NAMES = {
    "Teflon": "PTFE",
    "Scotchgard": "PFAS",
    "Gore-Tex": "PTFE",
    "Tefala": "PTFE",
}

# Suffix and prefix patterns for heuristic detection
SUFFIX_PATTERNS = [
    (r"fluorocarbon", 0.80),
    (r"fluorinated", 0.75),
    (r"fluoro.*resistant", 0.70),
    (r"perfluoro", 0.85),
]

PREFIX_PATTERNS = [
    (r"^poly.*fluor", 0.70),
]


def normalize_text(text: str) -> str:
    """
    Normalize OCR text for comparison.

    Handles: lowercase, punctuation cleanup, OCR artifact correction.
    """
    if not text:
        return ""
    # Lowercase
    normalized = text.lower()
    # Remove extra whitespace and normalize punctuation
    normalized = re.sub(r"[^\w\s-]", "", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def detect_chemicals_scored(text: str) -> set[ChemicalMatch]:
    """
    Detect PFAS and PFAS-adjacent terms from OCR text.

    Returns: deduplicated set of ChemicalMatch objects with scoring and rationale.
    """
    if not text:
        return set()

    normalized = normalize_text(text)
    matches: set[ChemicalMatch] = set()

    # Rule 1: Direct PFAS term matching
    for term, confidence in DIRECT_PFAS_TERMS.items():
        pattern = re.compile(r"\b" + re.escape(term.lower()) + r"\b")
        for match in pattern.finditer(normalized):
            matches.add(
                ChemicalMatch(
                    term=term,
                    rule_source="direct_term",
                    confidence=confidence,
                    matched_text=match.group(0),
                )
            )

    # Rule 2: Trade name mapping
    for trade_name, canonical_term in TRADE_NAMES.items():
        pattern = re.compile(r"\b" + re.escape(trade_name.lower()) + r"\b")
        for match in pattern.finditer(normalized):
            matches.add(
                ChemicalMatch(
                    term=canonical_term,
                    rule_source="trade_name",
                    confidence=0.85,
                    matched_text=match.group(0),
                )
            )

    # Rule 3: Suffix heuristics
    for pattern_str, confidence in SUFFIX_PATTERNS:
        for match in re.finditer(pattern_str, normalized):
            matched_word = normalized[max(0, match.start() - 20) : match.end() + 20]
            matches.add(
                ChemicalMatch(
                    term=match.group(0).replace(" ", "-"),
                    rule_source="suffix_heuristic",
                    confidence=confidence,
                    matched_text=matched_word,
                )
            )

    # Rule 4: Prefix heuristics
    for pattern_str, confidence in PREFIX_PATTERNS:
        for match in re.finditer(pattern_str, normalized):
            matched_word = normalized[max(0, match.start() - 5) : match.end() + 20]
            matches.add(
                ChemicalMatch(
                    term=match.group(0).replace(" ", "-"),
                    rule_source="prefix_heuristic",
                    confidence=confidence,
                    matched_text=matched_word,
                )
            )

    return matches


def rank_top_risk_contributors(matches: set[ChemicalMatch], top_n: int = 5) -> list[str]:
    """
    Rank and select top risk contributor chemicals deterministically.

    Prioritizes by:
      1. Confidence score (highest first)
      2. Rule source (direct_term > trade_name > suffix > prefix)
      3. Alphabetically by term
    """
    source_priority = {
        "direct_term": 4,
        "trade_name": 3,
        "suffix_heuristic": 2,
        "prefix_heuristic": 1,
    }

    ranked = sorted(
        matches,
        key=lambda m: (-m.confidence, -source_priority.get(m.rule_source, 0), m.term),
    )

    # Deduplicate by term, keeping highest-scored version
    seen_terms = set()
    unique_ranked = []
    for match in ranked:
        if match.term not in seen_terms:
            unique_ranked.append(match.term)
            seen_terms.add(match.term)
            if len(unique_ranked) >= top_n:
                break

    return unique_ranked
