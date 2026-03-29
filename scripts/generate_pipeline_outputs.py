import base64
import json
from pathlib import Path

from app.services.decay import simulate_decay
from app.services.ocr import extract_text_from_image
from app.services.parser import detect_chemicals
from app.services.risk import calculate_risk_score


def run_process_image_fixture(input_fixture_path: Path, output_path: Path) -> None:
    fixtures = json.loads(input_fixture_path.read_text(encoding="utf-8"))
    results = []

    for fixture in fixtures:
        request = fixture.get("request", {})
        image_base64 = request.get("image_base64")
        ocr_provider = request.get("ocr_provider")

        ocr_result = extract_text_from_image(
            image_data=image_base64,
            provider_override=ocr_provider,
        )

        result = {
            "name": fixture.get("name", "unknown"),
            "request": request,
            "ocr": {
                "raw_text": ocr_result.raw_text,
                "normalized_text": ocr_result.raw_text.lower(),
                "text_blocks": [
                    {
                        "text": tb.text,
                        "confidence": tb.confidence,
                    }
                    for tb in ocr_result.text_blocks
                ],
                "labels": ocr_result.labels,
                "confidence": ocr_result.confidence,
                "provider": ocr_result.provider,
            },
            "expected": fixture.get("expected", {}),
        }

        results.append(result)

    output_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Wrote process-image outputs to {output_path}")


def run_analyze_fixture(input_fixture_path: Path, output_path: Path) -> None:
    fixtures = json.loads(input_fixture_path.read_text(encoding="utf-8"))
    results = []

    for fixture in fixtures:
        request = fixture.get("request", {})
        image_base64 = request.get("image_base64")
        product_name_hint = request.get("product_name_hint")

        ocr_result = extract_text_from_image(image_data=image_base64)
        detected = detect_chemicals(ocr_result, product_name_hint=product_name_hint)

        # For risk scoring we need objects from pfas_hunter, so we duplicate behavior with scoring function
        # currently detect_chemicals returns list[str], so we use another path.
        # To avoid complexity, we can re-run pfas_hunter directly.
        from app.services.pfas_hunter import detect_chemicals_scored

        scored_matches = detect_chemicals_scored(ocr_result.raw_text + (" " + product_name_hint if product_name_hint else ""))
        risk_result = calculate_risk_score(scored_matches, ocr_confidence=ocr_result.confidence)

        result = {
            "name": fixture.get("name", "unknown"),
            "request": request,
            "ocr": {
                "raw_text": ocr_result.raw_text,
                "provider": ocr_result.provider,
                "confidence": ocr_result.confidence,
            },
            "detected_chemicals": detected,
            "risk": {
                "risk_score": risk_result.risk_score,
                "confidence_interval": risk_result.confidence_interval,
                "detected_count": risk_result.detected_count,
                "top_contributors": risk_result.top_contributors,
                "rei_multiplier": risk_result.rei_multiplier,
                "raw_score": risk_result.raw_score,
            },
            "decay_data": [
                {"year": pt.year, "level": pt.level} for pt in simulate_decay()
            ],
        }

        results.append(result)

    output_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Wrote analyze outputs to {output_path}")


if __name__ == "__main__":
    base = Path("tests/fixtures")
    process_input = base / "process_image_payload.json"
    process_output = base / "generated_process_image_output.json"
    run_process_image_fixture(process_input, process_output)

    analyze_input = base / "process_image_payload.json"  # re-use same requests for analysis
    analyze_output = base / "generated_analyze_output.json"
    run_analyze_fixture(analyze_input, analyze_output)
