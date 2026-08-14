import datetime as dt
from ml.pipeline import validate_and_clean

def _run(obs):
    """Helper to invoke validation on already‑aligned observations."""
    return validate_and_clean(obs)

def test_valid_observation_unchanged():
    ref = dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)
    aligned = [{
        "location": {"latitude": 8.0, "longitude": 77.0},
        "timestamp": ref,
        "water": {"ph": 7.0, "tds": 400, "turbidity": 5.0, "temperature": 25.0},
        "symptoms": {"feverCount": 2, "diarrheaCount": 1, "vomitingCount": 0, "abdominalPainCount": 0},
        "weather": {"temperature": 28.0, "precipitation": 0.0, "humidity": 80.0},
    }]
    cleaned = _run(aligned)
    assert cleaned == aligned

def test_utc_timestamp():
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": "2026-08-12T12:00:00+00:00", "water": {}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["timestamp"] == dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)

def test_utc_datetime_object():
    ref = dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": ref, "water": {}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["timestamp"] == ref

def test_naive_timestamp_convention():
    # Naive string treated as UTC per convention
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": "2026-08-12T12:00:00", "water": {}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["timestamp"] == dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)

def test_naive_datetime_object_convention():
    # Naive datetime object treated as UTC per convention
    naive_dt = dt.datetime(2026, 8, 12, 12, 0, 0)
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": naive_dt, "water": {}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["timestamp"] == dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)

def test_plus_0530_conversion():
    # 18:00:00+05:30 corresponds to 12:30:00 UTC
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": "2026-08-12T18:00:00+05:30", "water": {}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["timestamp"] == dt.datetime(2026, 8, 12, 12, 30, 0, tzinfo=dt.timezone.utc)

def test_plus_0530_datetime_object_conversion():
    tz_ist = dt.timezone(dt.timedelta(hours=5, minutes=30))
    dt_ist = dt.datetime(2026, 8, 12, 18, 0, 0, tzinfo=tz_ist)
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": dt_ist, "water": {}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["timestamp"] == dt.datetime(2026, 8, 12, 12, 30, 0, tzinfo=dt.timezone.utc)

def test_minus_0400_conversion():
    # 08:00:00-04:00 corresponds to 12:00:00 UTC
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": "2026-08-12T08:00:00-04:00", "water": {}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["timestamp"] == dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)

def test_minus_0400_datetime_object_conversion():
    tz_edt = dt.timezone(dt.timedelta(hours=-4))
    dt_edt = dt.datetime(2026, 8, 12, 8, 0, 0, tzinfo=tz_edt)
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": dt_edt, "water": {}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["timestamp"] == dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)

def test_trailing_z_conversion():
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": "2026-08-12T12:00:00Z", "water": {}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["timestamp"] == dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)

def test_malformed_timestamp_becomes_none():
    cases = [
        "not-a-timestamp",
        "2026-99-99T99:99:99",
        "",
        None,
        12345,
        [],
        {},
        True,
        False,
    ]
    for bad_ts in cases:
        aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": bad_ts, "water": {}, "symptoms": {}, "weather": {}}]
        cleaned = _run(aligned)
        assert cleaned[0]["timestamp"] is None, f"Expected None for {bad_ts!r}, got {cleaned[0]['timestamp']}"

def test_valid_non_timestamp_fields_remain_unchanged():
    aligned = [{
        "location": {"latitude": 10.5, "longitude": 76.2},
        "timestamp": "2026-08-12T18:00:00+05:30",
        "water": {"ph": 7.4, "tds": 250.0, "turbidity": 2.1, "temperature": 27.5},
        "symptoms": {"feverCount": 3, "diarrheaCount": 2, "vomitingCount": 1, "abdominalPainCount": 0},
        "weather": {"temperature": 31.0, "precipitation": 5.2, "humidity": 78.0},
    }]
    cleaned = _run(aligned)
    assert cleaned[0]["location"] == {"latitude": 10.5, "longitude": 76.2}
    assert cleaned[0]["water"] == {"ph": 7.4, "tds": 250.0, "turbidity": 2.1, "temperature": 27.5}
    assert cleaned[0]["symptoms"] == {"feverCount": 3, "diarrheaCount": 2, "vomitingCount": 1, "abdominalPainCount": 0}
    assert cleaned[0]["weather"] == {"temperature": 31.0, "precipitation": 5.2, "humidity": 78.0}
    assert cleaned[0]["timestamp"] == dt.datetime(2026, 8, 12, 12, 30, 0, tzinfo=dt.timezone.utc)

def test_invalid_ph_becomes_none():
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": "2026-08-12T12:00:00+00:00", "water": {"ph": -1, "tds": 100, "turbidity": 1, "temperature": 20}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["water"]["ph"] is None

def test_ph_above_range_none():
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": "2026-08-12T12:00:00+00:00", "water": {"ph": 15, "tds": 100, "turbidity": 1, "temperature": 20}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["water"]["ph"] is None

def test_negative_tds_none():
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": "2026-08-12T12:00:00+00:00", "water": {"ph": 7, "tds": -5, "turbidity": 1, "temperature": 20}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["water"]["tds"] is None

def test_negative_turbidity_none():
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": "2026-08-12T12:00:00+00:00", "water": {"ph": 7, "tds": 10, "turbidity": -0.5, "temperature": 20}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["water"]["turbidity"] is None

def test_water_temp_out_of_bounds_none():
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": "2026-08-12T12:00:00+00:00", "water": {"ph": 7, "tds": 10, "turbidity": 1, "temperature": -60}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["water"]["temperature"] is None

def test_invalid_latitude_none():
    aligned = [{"location": {"latitude": 100, "longitude": 0}, "timestamp": "2026-08-12T12:00:00+00:00", "water": {}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["location"]["latitude"] is None

def test_invalid_longitude_none():
    aligned = [{"location": {"latitude": 0, "longitude": 200}, "timestamp": "2026-08-12T12:00:00+00:00", "water": {}, "symptoms": {}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["location"]["longitude"] is None

def test_negative_symptom_counts_none():
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": "2026-08-12T12:00:00+00:00", "water": {}, "symptoms": {"feverCount": -1, "diarrheaCount": -2, "vomitingCount": -3, "abdominalPainCount": -4}, "weather": {}}]
    cleaned = _run(aligned)
    for k in ["feverCount", "diarrheaCount", "vomitingCount", "abdominalPainCount"]:
        assert cleaned[0]["symptoms"][k] is None

def test_non_integer_symptom_counts_none():
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": "2026-08-12T12:00:00+00:00", "water": {}, "symptoms": {"feverCount": 2.5, "diarrheaCount": "3", "vomitingCount": None, "abdominalPainCount": 0}, "weather": {}}]
    cleaned = _run(aligned)
    assert cleaned[0]["symptoms"]["feverCount"] is None
    assert cleaned[0]["symptoms"]["diarrheaCount"] is None
    assert cleaned[0]["symptoms"]["vomitingCount"] is None
    assert cleaned[0]["symptoms"]["abdominalPainCount"] == 0

def test_missing_values_remain_none():
    aligned = [{"location": {"latitude": None, "longitude": None}, "timestamp": "2026-08-12T12:00:00+00:00", "water": {"ph": None}, "symptoms": {"feverCount": None}, "weather": {"temperature": None}}]
    cleaned = _run(aligned)
    assert cleaned[0]["water"]["ph"] is None
    assert cleaned[0]["symptoms"]["feverCount"] is None
    assert cleaned[0]["weather"]["temperature"] is None

def test_multiple_observations_deterministic():
    ref = dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)
    obs = [
        {"location": {"latitude": 1, "longitude": 1}, "timestamp": ref.isoformat(), "water": {"ph": 7}, "symptoms": {}, "weather": {}},
        {"location": {"latitude": 2, "longitude": 2}, "timestamp": ref.isoformat(), "water": {"ph": 8}, "symptoms": {}, "weather": {}},
    ]
    cleaned = _run(obs)
    assert len(cleaned) == 2
    assert cleaned[0]["water"]["ph"] == 7
    assert cleaned[0]["timestamp"] == ref
    assert cleaned[1]["water"]["ph"] == 8
    assert cleaned[1]["timestamp"] == ref

def test_no_extra_features_introduced():
    aligned = [{"location": {"latitude": 0, "longitude": 0}, "timestamp": "2026-08-12T12:00:00+00:00", "water": {"ph": 7, "extra": 123}, "symptoms": {"feverCount": 1, "extraSym": 5}, "weather": {"temperature": 20, "extraW": 9}}]
    cleaned = _run(aligned)
    assert set(cleaned[0]["water"].keys()) == {"ph", "tds", "turbidity", "temperature"}
    assert set(cleaned[0]["symptoms"].keys()) == {"feverCount", "diarrheaCount", "vomitingCount", "abdominalPainCount"}
    assert set(cleaned[0]["weather"].keys()) == {"temperature", "precipitation", "humidity"}

