import datetime as dt
import pytest
from ml.pipeline import (
    DEFAULT_FACTOR_THRESHOLDS,
    FACTOR_ABNORMAL_PH,
    FACTOR_ELEVATED_TDS,
    FACTOR_ELEVATED_TURBIDITY,
    FACTOR_ELEVATED_WATER_TEMP,
    FACTOR_REPORTED_FEVER,
    FACTOR_REPORTED_DIARRHEA,
    FACTOR_REPORTED_VOMITING,
    FACTOR_REPORTED_ABDOMINAL_PAIN,
    FACTOR_ELEVATED_WEATHER_TEMP,
    FACTOR_ELEVATED_PRECIPITATION,
    FACTOR_ELEVATED_HUMIDITY,
    extract_contributing_factors,
    generate_contributing_factors,
    get_contributing_factors,
    format_risk_assessment,
)

def _sample_normal_obs():
    return {
        "location": {"latitude": 8.1833, "longitude": 77.4119},
        "timestamp": dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc),
        "water": {"ph": 7.2, "tds": 250.0, "turbidity": 2.0, "temperature": 26.0},
        "symptoms": {"feverCount": 0, "diarrheaCount": 0, "vomitingCount": 0, "abdominalPainCount": 0},
        "weather": {"temperature": 28.0, "precipitation": 0.0, "humidity": 70.0},
    }

# 1. Normal observation produces no unsupported factors
def test_normal_observation_produces_no_factors():
    obs = _sample_normal_obs()
    factors = generate_contributing_factors(obs)
    assert factors == []

# 2. Abnormal pH produces correct factor
def test_abnormal_ph_factor():
    # Low pH
    obs_low = _sample_normal_obs()
    obs_low["water"]["ph"] = 5.8
    assert generate_contributing_factors(obs_low) == [FACTOR_ABNORMAL_PH]

    # High pH
    obs_high = _sample_normal_obs()
    obs_high["water"]["ph"] = 9.2
    assert generate_contributing_factors(obs_high) == [FACTOR_ABNORMAL_PH]

# 3. Elevated turbidity produces correct factor
def test_elevated_turbidity_factor():
    obs = _sample_normal_obs()
    obs["water"]["turbidity"] = 8.5
    assert generate_contributing_factors(obs) == [FACTOR_ELEVATED_TURBIDITY]

# 4. Elevated TDS produces correct factor
def test_elevated_tds_factor():
    obs = _sample_normal_obs()
    obs["water"]["tds"] = 650.0
    assert generate_contributing_factors(obs) == [FACTOR_ELEVATED_TDS]

# 5. Elevated water temperature produces correct factor
def test_elevated_water_temp_factor():
    obs = _sample_normal_obs()
    obs["water"]["temperature"] = 38.0
    assert generate_contributing_factors(obs) == [FACTOR_ELEVATED_WATER_TEMP]

# 6. Symptom thresholds produce correct factors
def test_symptom_factors():
    obs_fever = _sample_normal_obs()
    obs_fever["symptoms"]["feverCount"] = 5
    assert generate_contributing_factors(obs_fever) == [FACTOR_REPORTED_FEVER]

    obs_diarrhea = _sample_normal_obs()
    obs_diarrhea["symptoms"]["diarrheaCount"] = 3
    assert generate_contributing_factors(obs_diarrhea) == [FACTOR_REPORTED_DIARRHEA]

    obs_vomiting = _sample_normal_obs()
    obs_vomiting["symptoms"]["vomitingCount"] = 2
    assert generate_contributing_factors(obs_vomiting) == [FACTOR_REPORTED_VOMITING]

    obs_pain = _sample_normal_obs()
    obs_pain["symptoms"]["abdominalPainCount"] = 4
    assert generate_contributing_factors(obs_pain) == [FACTOR_REPORTED_ABDOMINAL_PAIN]

# 7. Weather factors
def test_weather_factors():
    obs = _sample_normal_obs()
    obs["weather"]["temperature"] = 40.0
    obs["weather"]["precipitation"] = 12.0
    obs["weather"]["humidity"] = 90.0
    factors = generate_contributing_factors(obs)
    assert factors == [
        FACTOR_ELEVATED_WEATHER_TEMP,
        FACTOR_ELEVATED_PRECIPITATION,
        FACTOR_ELEVATED_HUMIDITY,
    ]

# 8. Missing values do not create factors
def test_missing_values_do_not_create_factors():
    obs = {
        "location": {"latitude": 8.0, "longitude": 77.0},
        "timestamp": dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc),
        "water": {"ph": None, "tds": None, "turbidity": None, "temperature": None},
        "symptoms": {"feverCount": None, "diarrheaCount": None, "vomitingCount": None, "abdominalPainCount": None},
        "weather": {"temperature": None, "precipitation": None, "humidity": None},
    }
    assert generate_contributing_factors(obs) == []

# 9. Multiple factors are returned deterministically in approved feature order
def test_multiple_factors_deterministic_order():
    obs = {
        "water": {"ph": 9.5, "tds": 700.0, "turbidity": 10.0, "temperature": 38.0},
        "symptoms": {"feverCount": 10, "diarrheaCount": 4, "vomitingCount": 2, "abdominalPainCount": 3},
        "weather": {"temperature": 39.0, "precipitation": 15.0, "humidity": 92.0},
    }
    expected_order = [
        FACTOR_ABNORMAL_PH,
        FACTOR_ELEVATED_TDS,
        FACTOR_ELEVATED_TURBIDITY,
        FACTOR_ELEVATED_WATER_TEMP,
        FACTOR_REPORTED_FEVER,
        FACTOR_REPORTED_DIARRHEA,
        FACTOR_REPORTED_VOMITING,
        FACTOR_REPORTED_ABDOMINAL_PAIN,
        FACTOR_ELEVATED_WEATHER_TEMP,
        FACTOR_ELEVATED_PRECIPITATION,
        FACTOR_ELEVATED_HUMIDITY,
    ]
    factors = generate_contributing_factors(obs)
    assert factors == expected_order

# 10. Metadata (latitude, longitude, timestamp) is never in factors
def test_metadata_never_in_factors():
    obs = {
        "latitude": 90.0,
        "longitude": 180.0,
        "timestamp": dt.datetime.now(dt.timezone.utc),
        "location": {"latitude": 90.0, "longitude": 180.0},
        "water": {"ph": 7.0, "tds": 200.0, "turbidity": 1.0, "temperature": 25.0},
        "symptoms": {"feverCount": 0, "diarrheaCount": 0, "vomitingCount": 0, "abdominalPainCount": 0},
        "weather": {"temperature": 25.0, "precipitation": 0.0, "humidity": 50.0},
    }
    factors = generate_contributing_factors(obs)
    assert factors == []
    for f in factors:
        assert "latitude" not in f.lower()
        assert "longitude" not in f.lower()
        assert "timestamp" not in f.lower()

# 11. No causal or diagnostic claims in factor descriptions
def test_no_causal_or_medical_language():
    forbidden_terms = [
        "cause", "caused", "causing", "due to", "result of",
        "disease", "outbreak", "infection", "pathogen", "unsafe",
        "contamination", "diagnos", "epidemic", "sick"
    ]
    obs = {
        "water": {"ph": 9.5, "tds": 800.0, "turbidity": 15.0, "temperature": 40.0},
        "symptoms": {"feverCount": 20, "diarrheaCount": 10, "vomitingCount": 5, "abdominalPainCount": 8},
        "weather": {"temperature": 42.0, "precipitation": 25.0, "humidity": 95.0},
    }
    factors = generate_contributing_factors(obs)
    for factor in factors:
        lower = factor.lower()
        for term in forbidden_terms:
            assert term not in lower, f"Forbidden term '{term}' found in factor description '{factor}'"

# 12. riskScore alone does not manufacture factors
def test_risk_score_alone_cannot_manufacture_factors():
    # Normal observation with artificial high risk passed to assessment formatter
    obs = _sample_normal_obs()
    assessment = format_risk_assessment(
        risk_score=0.95,
        risk_level="HIGH",
        observation=obs,
    )
    assert assessment["riskScore"] == 0.95
    assert assessment["riskLevel"] == "HIGH"
    # Even with high riskScore, normal values must not fabricate factors
    assert assessment["factorDescriptions"] == []

# 13. extract_contributing_factors structured snapshot
def test_extract_contributing_factors_snapshot():
    obs = _sample_normal_obs()
    snapshot = extract_contributing_factors(obs)
    
    assert snapshot["ph"] == 7.2
    assert snapshot["tds"] == 250.0
    assert snapshot["turbidity"] == 2.0
    assert snapshot["temperature"] == 26.0
    assert snapshot["feverCount"] == 0
    assert snapshot["diarrheaCount"] == 0
    assert snapshot["weatherTemperature"] == 28.0
    assert snapshot["precipitation"] == 0.0
    assert snapshot["humidity"] == 70.0
    assert "latitude" not in snapshot
    assert "longitude" not in snapshot
    assert "timestamp" not in snapshot

# 14. Alias get_contributing_factors matches generate_contributing_factors
def test_get_contributing_factors_alias():
    obs = _sample_normal_obs()
    obs["water"]["turbidity"] = 9.0
    assert get_contributing_factors(obs) == generate_contributing_factors(obs)

# 15. Custom configurable thresholds
def test_custom_thresholds():
    obs = _sample_normal_obs()
    obs["water"]["turbidity"] = 3.5  # Under default (5.0), but over custom (3.0)

    # Default: no factor
    assert generate_contributing_factors(obs) == []

    # Custom threshold
    assert generate_contributing_factors(obs, thresholds={"turbidity_max": 3.0}) == [FACTOR_ELEVATED_TURBIDITY]

# 16. Schema compliance: contributingFactors is strictly a dictionary/object of observed values
def test_contributing_factors_is_dict_object_schema_compliant():
    obs = {
        "location": {"latitude": 8.1833, "longitude": 77.4119},
        "timestamp": dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc),
        "water": {"ph": 6.8, "tds": 420.0, "turbidity": 8.4, "temperature": 28.2},
        "symptoms": {"feverCount": 12, "diarrheaCount": 5, "vomitingCount": 3, "abdominalPainCount": 4},
        "weather": {"temperature": 27.5, "precipitation": 0.0, "humidity": 80.0},
    }
    factors = extract_contributing_factors(obs)
    
    assert isinstance(factors, dict)
    assert factors["ph"] == 6.8
    assert factors["tds"] == 420.0
    assert factors["turbidity"] == 8.4
    assert factors["temperature"] == 28.2
    assert factors["feverCount"] == 12
    assert factors["diarrheaCount"] == 5
    assert factors["vomitingCount"] == 3
    assert factors["abdominalPainCount"] == 4
    assert factors["weatherTemperature"] == 27.5
    assert factors["precipitation"] == 0.0
    assert factors["humidity"] == 80.0
    # No metadata keys
    assert "latitude" not in factors
    assert "longitude" not in factors
    assert "timestamp" not in factors
    assert "location" not in factors

# 17. Heuristic descriptions are independent of model and NOT claimed as attribution
def test_heuristic_descriptions_are_not_model_attribution():
    # Observations with elevated features produce strings purely from raw threshold heuristics
    obs = _sample_normal_obs()
    obs["water"]["ph"] = 9.0
    
    descriptions = generate_contributing_factors(obs)
    assert isinstance(descriptions, list)
    assert descriptions == [FACTOR_ABNORMAL_PH]
    # No model weights or probability attribution fields are returned
    for item in descriptions:
        assert isinstance(item, str)

