"""Tests for Mission 11: ML Inference Pipeline.

Validates:
- Single and batch observation inference
- Artifact-based inference (using loaded artifact or artifact file path)
- Schema-compliant ML output fields (riskScore, riskLevel, modelVersion, contributingFactors, location, timestamp)
- Model version provenance from loaded artifact
- Risk score bounded in [0.0, 1.0] and riskLevel in {LOW, MEDIUM, HIGH}
- Contract-preserving contributingFactors snapshot object
- Metadata exclusion (latitude, longitude, timestamp are never model features)
- Missing and invalid value handling via fitted preprocessing
- Zero retraining guarantees (fit, fit_transform never called on any component)
- Zero data leakage (fitted parameters immutable across inference runs)
- Reproducibility across multiple inference runs
- Batch order preservation and sample independence
- Strict feature contract verification and failure on incompatible artifacts
"""

import datetime as dt
from pathlib import Path
import numpy as np
import pytest
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

from ml.pipeline import (
    FEATURE_NAMES,
    DEFAULT_MODEL_VERSION,
    RISK_LEVEL_LOW,
    RISK_LEVEL_MEDIUM,
    RISK_LEVEL_HIGH,
    RISK_LEVELS,
    RiskNormalizer,
    build_preprocessor,
    build_model,
    train_pipeline_with_normalizer,
    save_model_artifact,
    load_model_artifact,
    transform_observations,
    compute_raw_anomaly_scores,
    normalize_risk_scores,
    classify_risk_level,
    classify_risk_levels,
    extract_contributing_factors,
    validate_and_clean,
    run_inference,
    infer_observation,
    predict_with_artifact,
    predict,
)


def _sample_obs(
    ph: float = 7.2,
    tds: float = 300.0,
    turbidity: float = 3.0,
    water_temp: float = 25.0,
    fever: int = 1,
    diarrhea: int = 0,
    vomiting: int = 0,
    abdominal: int = 0,
    weather_temp: float = 28.0,
    precipitation: float = 0.0,
    humidity: float = 70.0,
    lat: float = 8.1833,
    lon: float = 77.4119,
    ts: dt.datetime | str | None = None,
) -> dict:
    """Helper to construct a valid observation dictionary."""
    if ts is None:
        ts = dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)
    return {
        "location": {"latitude": lat, "longitude": lon},
        "timestamp": ts,
        "water": {
            "ph": ph,
            "tds": tds,
            "turbidity": turbidity,
            "temperature": water_temp,
        },
        "symptoms": {
            "feverCount": fever,
            "diarrheaCount": diarrhea,
            "vomitingCount": vomiting,
            "abdominalPainCount": abdominal,
        },
        "weather": {
            "temperature": weather_temp,
            "precipitation": precipitation,
            "humidity": humidity,
        },
    }


def _training_dataset() -> list:
    """Construct deterministic training observations."""
    base = dt.datetime(2026, 8, 12, 6, 0, 0, tzinfo=dt.timezone.utc)
    return [
        _sample_obs(ph=7.0, tds=200.0, turbidity=2.0, fever=0, ts=base + dt.timedelta(hours=0)),
        _sample_obs(ph=7.4, tds=310.0, turbidity=3.5, fever=1, ts=base + dt.timedelta(hours=1)),
        _sample_obs(ph=6.9, tds=180.0, turbidity=1.8, fever=0, ts=base + dt.timedelta(hours=2)),
        _sample_obs(ph=8.2, tds=520.0, turbidity=6.0, fever=6, ts=base + dt.timedelta(hours=3)),
        _sample_obs(ph=7.1, tds=250.0, turbidity=2.5, fever=1, ts=base + dt.timedelta(hours=4)),
        _sample_obs(ph=7.3, tds=290.0, turbidity=3.0, fever=0, ts=base + dt.timedelta(hours=5)),
        _sample_obs(ph=6.8, tds=170.0, turbidity=1.5, fever=0, ts=base + dt.timedelta(hours=6)),
        _sample_obs(ph=7.5, tds=340.0, turbidity=4.0, fever=2, ts=base + dt.timedelta(hours=7)),
    ]


@pytest.fixture
def fitted_artifact(tmp_path) -> dict:
    """Fixture providing a saved and loaded model artifact."""
    train_data = _training_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_data, random_state=42)
    artifact_path = tmp_path / "model_v1.0.pkl"
    save_model_artifact(
        preprocessor=preprocessor,
        model=model,
        risk_normalizer=normalizer,
        model_version="v1.0",
        artifact_path=artifact_path,
    )
    return load_model_artifact(artifact_path)


@pytest.fixture
def artifact_path(tmp_path) -> str:
    """Fixture providing an artifact file path."""
    train_data = _training_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_data, random_state=42)
    path = tmp_path / "model_v1.0.pkl"
    save_model_artifact(
        preprocessor=preprocessor,
        model=model,
        risk_normalizer=normalizer,
        model_version="v1.0",
        artifact_path=path,
    )
    return str(path)


# 1. Single new observation inference
def test_single_new_observation_inference(fitted_artifact):
    obs = _sample_obs(ph=7.1, tds=260.0, fever=1)
    res = infer_observation(fitted_artifact, obs)

    assert isinstance(res, dict)
    assert "riskScore" in res
    assert "riskLevel" in res
    assert "modelVersion" in res
    assert "contributingFactors" in res
    assert "location" in res
    assert "timestamp" in res


# 2. Artifact-loaded inference from disk path
def test_artifact_loaded_from_disk_path(artifact_path):
    obs = _sample_obs(ph=7.2, tds=280.0, fever=0)
    res = run_inference(artifact_path, obs)

    assert isinstance(res, dict)
    assert 0.0 <= res["riskScore"] <= 1.0
    assert res["riskLevel"] in RISK_LEVELS
    assert res["modelVersion"] == "v1.0"


# 3. Final result contains all required schema fields
def test_final_result_schema_fields(fitted_artifact):
    obs = _sample_obs(ph=6.8, tds=190.0, fever=0, lat=8.1833, lon=77.4119)
    res = run_inference(fitted_artifact, obs)

    assert isinstance(res, dict)
    assert "riskScore" in res
    assert "riskLevel" in res
    assert "modelVersion" in res
    assert "contributingFactors" in res
    assert "location" in res
    assert "timestamp" in res

    # Location schema check
    assert res["location"]["latitude"] == 8.1833
    assert res["location"]["longitude"] == 77.4119

    # Timestamp schema check
    assert isinstance(res["timestamp"], dt.datetime)


# 4. Correct model version is returned from artifact
def test_model_version_provenance_from_artifact(tmp_path):
    train_data = _training_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_data, random_state=42)
    path = tmp_path / "model_v2.1.pkl"
    save_model_artifact(preprocessor, model, normalizer, "v2.1", path)

    loaded = load_model_artifact(path)
    obs = _sample_obs()
    res = run_inference(loaded, obs)
    assert res["modelVersion"] == "v2.1"


# 5. RiskScore is strictly bounded in [0.0, 1.0]
def test_risk_score_in_bounds(fitted_artifact):
    observations = [
        _sample_obs(ph=7.0, tds=200.0),
        _sample_obs(ph=9.5, tds=1200.0, fever=15, turbidity=20.0),  # extreme anomaly
        _sample_obs(ph=4.0, tds=50.0, fever=0),
    ]
    results = run_inference(fitted_artifact, observations)
    assert len(results) == 3
    for r in results:
        assert isinstance(r["riskScore"], float)
        assert 0.0 <= r["riskScore"] <= 1.0


# 6. RiskLevel is one of LOW / MEDIUM / HIGH
def test_risk_level_is_valid_category(fitted_artifact):
    observations = [
        _sample_obs(ph=7.0, tds=200.0),
        _sample_obs(ph=8.5, tds=800.0, fever=10),
    ]
    results = run_inference(fitted_artifact, observations)
    for r in results:
        assert r["riskLevel"] in [RISK_LEVEL_LOW, RISK_LEVEL_MEDIUM, RISK_LEVEL_HIGH]


# 7. contributingFactors remains a schema-compliant dictionary snapshot
def test_contributing_factors_is_snapshot_dict(fitted_artifact):
    obs = _sample_obs(ph=7.2, tds=300.0, turbidity=4.0, fever=3, lat=8.0, lon=77.0)
    res = run_inference(fitted_artifact, obs)

    factors = res["contributingFactors"]
    assert isinstance(factors, dict)
    assert factors["ph"] == 7.2
    assert factors["tds"] == 300.0
    assert factors["turbidity"] == 4.0
    assert factors["feverCount"] == 3
    # Metadata must NOT be in contributingFactors
    assert "latitude" not in factors
    assert "longitude" not in factors
    assert "location" not in factors
    assert "timestamp" not in factors
    assert "riskScore" not in factors


# 8. Latitude / Longitude are NOT model features
def test_latitude_longitude_not_model_features(fitted_artifact):
    assert "latitude" not in FEATURE_NAMES
    assert "longitude" not in FEATURE_NAMES
    assert "location" not in FEATURE_NAMES

    # Model input dimensionality is strictly 11
    assert fitted_artifact["model"].n_features_in_ == 11
    assert len(fitted_artifact["feature_names"]) == 11


# 9. Timestamp is NOT a model feature
def test_timestamp_not_model_feature(fitted_artifact):
    assert "timestamp" not in FEATURE_NAMES
    assert "date" not in FEATURE_NAMES
    assert "time" not in FEATURE_NAMES


# 10. Missing approved features are handled by fitted preprocessor
def test_missing_values_handled_by_fitted_preprocessor(fitted_artifact):
    # Observation with missing pH, missing feverCount, missing weather precipitation
    obs = {
        "location": {"latitude": 8.1833, "longitude": 77.4119},
        "timestamp": "2026-08-12T12:00:00Z",
        "water": {"ph": None, "tds": 250.0, "turbidity": 2.0, "temperature": 26.0},
        "symptoms": {"feverCount": None, "diarrheaCount": 0, "vomitingCount": 0, "abdominalPainCount": 0},
        "weather": {"temperature": 27.0, "precipitation": None, "humidity": 65.0},
    }
    res = run_inference(fitted_artifact, obs)

    assert isinstance(res, dict)
    assert 0.0 <= res["riskScore"] <= 1.0
    assert res["riskLevel"] in RISK_LEVELS
    # Missing values should be omitted from contributingFactors snapshot
    assert "ph" not in res["contributingFactors"]
    assert "feverCount" not in res["contributingFactors"]
    assert "precipitation" not in res["contributingFactors"]
    assert res["contributingFactors"]["tds"] == 250.0


# 11. Invalid observation values follow existing validation behavior
def test_invalid_observation_validation_behavior(fitted_artifact):
    # Invalid pH (20.0 > 14), negative TDS (-50), negative fever (-2)
    obs = {
        "location": {"latitude": 8.1833, "longitude": 77.4119},
        "timestamp": "2026-08-12T12:00:00Z",
        "water": {"ph": 20.0, "tds": -50.0, "turbidity": 3.0, "temperature": 25.0},
        "symptoms": {"feverCount": -2, "diarrheaCount": 0, "vomitingCount": 0, "abdominalPainCount": 0},
        "weather": {"temperature": 28.0, "precipitation": 0.0, "humidity": 70.0},
    }
    res = run_inference(fitted_artifact, obs, validate=True)

    assert isinstance(res, dict)
    assert 0.0 <= res["riskScore"] <= 1.0
    assert res["riskLevel"] in RISK_LEVELS
    # Invalid values cleaned to None and thus excluded from contributing factors snapshot
    assert "ph" not in res["contributingFactors"]
    assert "tds" not in res["contributingFactors"]
    assert "feverCount" not in res["contributingFactors"]
    assert res["contributingFactors"]["turbidity"] == 3.0


# 12. Inference does NOT call fit() on any component
def test_no_retraining_fit_never_called(fitted_artifact, monkeypatch):
    def _forbidden_fit(*args, **kwargs):
        raise AssertionError("CRITICAL VIOLATION: fit() was called during inference!")

    def _forbidden_fit_transform(*args, **kwargs):
        raise AssertionError("CRITICAL VIOLATION: fit_transform() was called during inference!")

    # Monkeypatch fit methods on classes
    monkeypatch.setattr(IsolationForest, "fit", _forbidden_fit)
    monkeypatch.setattr(Pipeline, "fit", _forbidden_fit)
    monkeypatch.setattr(Pipeline, "fit_transform", _forbidden_fit_transform)
    monkeypatch.setattr(SimpleImputer, "fit", _forbidden_fit)
    monkeypatch.setattr(SimpleImputer, "fit_transform", _forbidden_fit_transform)
    monkeypatch.setattr(StandardScaler, "fit", _forbidden_fit)
    monkeypatch.setattr(StandardScaler, "fit_transform", _forbidden_fit_transform)
    monkeypatch.setattr(RiskNormalizer, "fit", _forbidden_fit)

    obs = _sample_obs(ph=7.3, tds=270.0, fever=1)
    res = run_inference(fitted_artifact, obs)
    assert isinstance(res, dict)
    assert 0.0 <= res["riskScore"] <= 1.0


# 13. Preprocessor state is unchanged after inference
def test_preprocessor_state_unchanged(fitted_artifact):
    preprocessor = fitted_artifact["preprocessor"]
    imputer = preprocessor.named_steps["imputer"]
    scaler = preprocessor.named_steps["scaler"]

    imputer_stats_before = np.copy(imputer.statistics_)
    scaler_mean_before = np.copy(scaler.mean_)
    scaler_scale_before = np.copy(scaler.scale_)

    # Run inference with drastically different observations
    obs_batch = [
        _sample_obs(ph=9.0, tds=1000.0, fever=20),
        _sample_obs(ph=5.0, tds=50.0, fever=0),
    ]
    _ = run_inference(fitted_artifact, obs_batch)

    # Verify preprocessor parameters did not mutate
    np.testing.assert_array_equal(imputer.statistics_, imputer_stats_before)
    np.testing.assert_array_equal(scaler.mean_, scaler_mean_before)
    np.testing.assert_array_equal(scaler.scale_, scaler_scale_before)


# 14. RiskNormalizer state is unchanged after inference
def test_risk_normalizer_state_unchanged(fitted_artifact):
    normalizer = fitted_artifact["risk_normalizer"]
    min_before = normalizer.training_min
    max_before = normalizer.training_max

    # Run inference with outlier
    obs = _sample_obs(ph=10.0, tds=1500.0, fever=50)
    _ = run_inference(fitted_artifact, obs)

    assert normalizer.training_min == min_before
    assert normalizer.training_max == max_before


# 15. Reproducibility test: Same input + same artifact produces exact same output
def test_inference_reproducibility(fitted_artifact):
    obs = _sample_obs(ph=7.25, tds=285.0, fever=2)

    res1 = run_inference(fitted_artifact, obs)
    res2 = run_inference(fitted_artifact, obs)

    assert res1["riskScore"] == pytest.approx(res2["riskScore"], abs=1e-7)
    assert res1["riskLevel"] == res2["riskLevel"]
    assert res1["modelVersion"] == res2["modelVersion"]
    assert res1["contributingFactors"] == res2["contributingFactors"]
    assert res1["location"] == res2["location"]
    assert res1["timestamp"] == res2["timestamp"]


# 16. Batch inference preserves input and output order
def test_batch_inference_order_preservation(fitted_artifact):
    obs1 = _sample_obs(ph=7.0, tds=200.0, fever=0)
    obs2 = _sample_obs(ph=8.5, tds=700.0, fever=8)
    obs3 = _sample_obs(ph=6.8, tds=180.0, fever=1)

    batch = [obs1, obs2, obs3]
    results = run_inference(fitted_artifact, batch)

    assert len(results) == 3
    assert results[0]["contributingFactors"]["tds"] == 200.0
    assert results[1]["contributingFactors"]["tds"] == 700.0
    assert results[2]["contributingFactors"]["tds"] == 180.0


# 17. Batch inference processes observations independently
def test_batch_observations_processed_independently(fitted_artifact):
    obs_mild = _sample_obs(ph=7.0, tds=200.0, fever=0)
    obs_severe = _sample_obs(ph=9.0, tds=900.0, fever=15)

    # Score individually
    res_mild_single = run_inference(fitted_artifact, obs_mild)
    res_severe_single = run_inference(fitted_artifact, obs_severe)

    # Score together in batch
    results_batch = run_inference(fitted_artifact, [obs_mild, obs_severe])

    # Scores must be identical regardless of whether run alone or in batch
    assert results_batch[0]["riskScore"] == pytest.approx(res_mild_single["riskScore"], abs=1e-7)
    assert results_batch[1]["riskScore"] == pytest.approx(res_severe_single["riskScore"], abs=1e-7)
    assert results_batch[0]["riskLevel"] == res_mild_single["riskLevel"]
    assert results_batch[1]["riskLevel"] == res_severe_single["riskLevel"]


# 18. Feature order strictly matches FEATURE_NAMES
def test_inference_exact_feature_names_order(fitted_artifact):
    assert fitted_artifact["feature_names"] == FEATURE_NAMES
    expected_order = [
        "ph",
        "tds",
        "turbidity",
        "water_temperature",
        "feverCount",
        "diarrheaCount",
        "vomitingCount",
        "abdominalPainCount",
        "weather_temperature",
        "precipitation",
        "humidity",
    ]
    assert FEATURE_NAMES == expected_order


# 19. Incompatible artifact feature contract fails clearly
def test_incompatible_artifact_feature_contract_fails(fitted_artifact):
    corrupted_artifact = dict(fitted_artifact)
    # Corrupt the feature names order / contents
    corrupted_artifact["feature_names"] = ["tds", "ph", "turbidity"]

    obs = _sample_obs()
    with pytest.raises(ValueError, match="Incompatible artifact feature contract"):
        run_inference(corrupted_artifact, obs)


# 20. Incompatible artifact missing required components fails clearly
def test_incomplete_artifact_fails(fitted_artifact):
    incomplete_art = {
        "model_version": "v1.0",
        "feature_names": list(FEATURE_NAMES),
        # missing preprocessor, model, risk_normalizer
    }
    obs = _sample_obs()
    with pytest.raises(ValueError, match="Incomplete artifact"):
        run_inference(incomplete_art, obs)


# 21. Out-of-range risk score clamping behavior
def test_out_of_range_raw_score_clamping(tmp_path):
    train_data = _training_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_data, random_state=42)

    # Set normalizer range artificially narrow
    normalizer.training_min = -0.1
    normalizer.training_max = 0.1

    art = {
        "model_version": "v1.0",
        "feature_names": list(FEATURE_NAMES),
        "preprocessor": preprocessor,
        "model": model,
        "risk_normalizer": normalizer,
    }

    # Severe observation producing inverted score outside [-0.1, 0.1]
    obs = _sample_obs(ph=9.5, tds=1500.0, fever=25)
    res = run_inference(art, obs)

    assert res["riskScore"] == 1.0 or (0.0 <= res["riskScore"] <= 1.0)


# 22. No data leakage across batches
def test_no_data_leakage_across_batches(fitted_artifact):
    imputer = fitted_artifact["preprocessor"].named_steps["imputer"]
    stats_orig = np.copy(imputer.statistics_)

    # Run 1: High symptom counts
    _ = run_inference(fitted_artifact, [_sample_obs(fever=50, diarrhea=30)])

    # Run 2: Zero symptom counts
    _ = run_inference(fitted_artifact, [_sample_obs(fever=0, diarrhea=0)])

    # Fitted statistics unchanged
    np.testing.assert_array_equal(imputer.statistics_, stats_orig)


# 23. predict() entry point works with loaded artifact
def test_pipeline_predict_entry_point(fitted_artifact):
    obs = _sample_obs(ph=7.0, tds=220.0, fever=0)
    res = predict(fitted_artifact, obs)

    assert isinstance(res, list)
    assert len(res) == 1
    assert res[0]["modelVersion"] == "v1.0"
    assert 0.0 <= res[0]["riskScore"] <= 1.0
    assert res[0]["riskLevel"] in RISK_LEVELS


# 24. Empty input handling
def test_empty_input_handling(fitted_artifact):
    assert run_inference(fitted_artifact, []) == []
    assert predict_with_artifact(fitted_artifact, []) == []
    assert predict(fitted_artifact, []) == []
