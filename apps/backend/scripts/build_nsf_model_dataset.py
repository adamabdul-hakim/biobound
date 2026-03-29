"""Convert NSF product CSV exports into a normalized JSON dataset.

Usage example:
    python scripts/build_nsf_model_dataset.py \
        --input-csv ./data/nsf_58_export.csv \
        --standard NSF-58 \
        --retrieved-by adama
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def _normalize_header(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _split_multiline_cell(value: str) -> list[str]:
    parts = re.split(r"\r?\n|;", value)
    cleaned = [part.strip() for part in parts if part.strip()]

    # De-duplicate while preserving order.
    seen: set[str] = set()
    result: list[str] = []
    for item in cleaned:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


def _parse_gpd(value: str) -> float | None:
    text = value.strip()
    if not text:
        return None

    match = re.search(r"[0-9]+(?:\.[0-9]+)?", text.replace(",", ""))
    if not match:
        return None

    return float(match.group(0))


def _standard_to_pfas_certified(standard: str) -> bool:
    return standard.upper() in {"NSF-53", "NSF-58"}


def _read_rows(input_csv: Path) -> list[dict[str, str]]:
    with input_csv.open("r", encoding="utf-8-sig", newline="") as handle:
        sample = handle.read(4096)
        handle.seek(0)

        try:
            dialect = csv.Sniffer().sniff(sample)
        except csv.Error:
            dialect = csv.excel

        reader = csv.DictReader(handle, dialect=dialect)
        return [row for row in reader if row]


def _value_from_candidates(row: dict[str, str], candidates: list[str]) -> str:
    normalized_map = {_normalize_header(k): v for k, v in row.items() if k}
    for candidate in candidates:
        value = normalized_map.get(candidate)
        if value is not None:
            return value.strip()
    return ""


def _build_record(
    row: dict[str, str],
    standard: str,
    source_document: str,
    source_url: str | None,
) -> dict[str, Any] | None:
    model = _value_from_candidates(
        row,
        [
            "brandnametradenamemodel",
            "model",
            "product",
            "brandmodel",
            "tradenamemodel",
        ],
    )
    if not model:
        return None

    company = _value_from_candidates(row, ["company", "manufacturer", "brand"])
    product_type = _value_from_candidates(row, ["producttype", "type"])
    replacement_module_raw = _value_from_candidates(row, ["replacementmodule", "replacementmodules"])
    claims_raw = _value_from_candidates(row, ["claims", "claim", "claimsreduction"])
    gpd_raw = _value_from_candidates(row, ["dailyproductionrategpd", "dailyproductionrate"])

    replacements = _split_multiline_cell(replacement_module_raw)
    claims = _split_multiline_cell(claims_raw)

    record: dict[str, Any] = {
        "brand": company.upper() if company else "UNKNOWN",
        "model": model,
        "standard": standard,
        "pfas_certified": _standard_to_pfas_certified(standard),
        "product_type": product_type,
        "replacement_modules": replacements,
        "claims": claims,
        "source_type": "csv",
        "source_document": source_document,
    }

    parsed_gpd = _parse_gpd(gpd_raw)
    if parsed_gpd is not None:
        record["daily_production_rate_gpd"] = parsed_gpd

    if source_url:
        record["source_url"] = source_url

    return record


def _dedupe_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str, str]] = set()
    deduped: list[dict[str, Any]] = []

    for record in records:
        key = (
            str(record.get("brand", "")).strip().lower(),
            str(record.get("model", "")).strip().lower(),
            str(record.get("standard", "")).strip().upper(),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(record)

    return deduped


def build_dataset(
    input_csv: Path,
    output_json: Path,
    standard: str,
    retrieved_by: str,
    source_url: str | None,
) -> dict[str, Any]:
    rows = _read_rows(input_csv)
    source_document = input_csv.name

    records: list[dict[str, Any]] = []
    for row in rows:
        record = _build_record(
            row=row,
            standard=standard,
            source_document=source_document,
            source_url=source_url,
        )
        if record is not None:
            records.append(record)

    deduped_records = _dedupe_records(records)

    dataset = {
        "metadata": {
            "name": "NSF Certified Filter Models",
            "generated_at": datetime.now(UTC).isoformat(),
            "retrieved_by": retrieved_by,
            "input_csv": str(input_csv),
            "standard_filter": standard,
            "source_url": source_url,
            "record_count": len(deduped_records),
        },
        "records": deduped_records,
    }

    output_json.parent.mkdir(parents=True, exist_ok=True)
    with output_json.open("w", encoding="utf-8") as handle:
        json.dump(dataset, handle, indent=2)
        handle.write("\n")

    return dataset


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-csv", required=True, help="Path to NSF CSV export")
    parser.add_argument(
        "--output-json",
        default="app/data/nsf_certified_models.json",
        help="Output JSON path (default: app/data/nsf_certified_models.json)",
    )
    parser.add_argument(
        "--standard",
        default="NSF-58",
        choices=["NSF-42", "NSF-53", "NSF-58"],
        help="Certification standard represented by the CSV",
    )
    parser.add_argument("--retrieved-by", required=True, help="Name/identifier of dataset retriever")
    parser.add_argument("--source-url", default=None, help="Official source URL for traceability")
    return parser


def main() -> int:
    parser = _build_parser()
    args = parser.parse_args()

    input_csv = Path(args.input_csv).resolve()
    output_json = Path(args.output_json).resolve()

    if not input_csv.exists():
        parser.error(f"Input CSV not found: {input_csv}")

    dataset = build_dataset(
        input_csv=input_csv,
        output_json=output_json,
        standard=args.standard,
        retrieved_by=args.retrieved_by,
        source_url=args.source_url,
    )

    print(f"Wrote {dataset['metadata']['record_count']} records to {output_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
