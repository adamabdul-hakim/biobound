from app.services.hydrology import calculate_hydrology_risk


def test_hydrology_non_certified_filter_keeps_raw_ppt() -> None:
    result = calculate_hydrology_risk(zip_code="10006", filter_type="none")

    assert result.data_status == "calculated"
    assert result.effective_ppt == 22.1
    assert result.water_score == 32
    assert result.filter_warning is not None


def test_hydrology_certified_filter_reduces_ppt() -> None:
    result = calculate_hydrology_risk(zip_code="10006", filter_type="NSF-53")

    assert result.data_status == "calculated"
    assert result.effective_ppt == 4.42
    assert result.water_score == 6
    assert result.filter_warning is None


def test_hydrology_handles_missing_zip_without_fake_score() -> None:
    result = calculate_hydrology_risk(zip_code="99999", filter_type="none")

    assert result.data_status == "no-data"
    assert result.effective_ppt == 0.0
    assert result.water_score == 0
