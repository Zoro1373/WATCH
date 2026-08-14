"""Tests for Mission 12: ML Failure Handling and Safe Degradation.

Verifies:
1. Missing model artifact aborts inference.
2. Corrupted model artifact aborts inference.
3. Incompatible artifact aborts inference.
4. Missing weather fields become None and inference continues.
5. All weather fields None still allow inference (Explicit Weather Test).
6. Missing individual sensor fields are handled by the fitted imputer (Explicit Sensor-Missing Test).
7. One location preprocessing failure skips only that location.
8. Other locations continue after one preprocessing failure.
9. One location prediction failure skips only that location.
10. Other locations continue after one prediction failure.
11. Risk normalization failure does not fabricate riskScore.
12. Risk-level classification failure does not fabricate riskLevel.
13. No automatic retraining occurs after artifact failure.
14. No fallback model is created.
15. No hard-coded/default riskScore is returned on failure.
16. Successful locations retain the normal schema.
17. Failure information is not inserted into riskScores.
18. No credentials appear in log messages.
19. Batch ordering and determinism of remaining successful results are preserved.
20. Single observation failure returns empty result cleanly.
"""

import datetime as dt
import logging
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
    train_model,
    train_pipeline,
    fit_model,
    fit_preprocessor,
    fit_risk_normalizer,
)


def _sample_obs(
    ph: float | None = 7.2,
    tds: float | None = 300.0,
    turbidity: float | None = 3.0,
    water_temp: float | None = 25.0,
    fever: int | None = 1,
    diarrhea: int | None = 0,
    vomiting: int | None = 0,
    abdominal: int | None = 0,
    weather_temp: float | None = 28.0,
    precipitation: float | None = 0.0,
    humidity: float | None = 70.0,
    lat: float = 8.1833,
    lon: float = 77.4119,
    ts: dt.datetime | str | None = None,
) -> dict:
    """Helper to construct an observation dictionary."""
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


# 1. Missing model artifact aborts inference
def test_missing_model_artifact_aborts_inference(tmp_path, caplog):
    non_existent = tmp_path / "non_existent_model_v9.9.pkl"
    obs = _sample_obs()

    with caplog.at_level(logging.CRITICAL):
        with pytest.raises(FileNotFoundError, match="Model artifact not found"):
            load_model_artifact(non_existent)

    with caplog.at_level(logging.CRITICAL):
        with pytest.raises(FileNotFoundError, match="Model artifact not found"):
            run_inference(non_existent, obs)

    # Verify critical log message was emitted
    assert any("Model artifact not found" in record.message for record in caplog.records)


# 2. Corrupted model artifact aborts inference
def test_corrupted_model_artifact_aborts_inference(tmp_path, caplog):
    corrupt_file = tmp_path / "corrupted_model_v1.0.pkl"
    with open(corrupt_file, "wb") as f:
        f.write(b"NOT_A_VALID_PICKLE_PAYLOAD_CORRUPT_BYTES_XYZ")

    obs = _sample_obs()

    with caplog.at_level(logging.CRITICAL):
        with pytest.raises(ValueError, match="Corrupted artifact file"):
            load_model_artifact(corrupt_file)

    with caplog.at_level(logging.CRITICAL):
        with pytest.raises(ValueError, match="Corrupted artifact file"):
            run_inference(corrupt_file, obs)


# 3. Incompatible artifact aborts inference
def test_incompatible_artifact_aborts_inference(fitted_artifact):
    # Incomplete artifact
    incomplete_art = {
        "model_version": "v1.0",
        "feature_names": list(FEATURE_NAMES),
        # missing preprocessor, model, risk_normalizer
    }
    with pytest.raises(ValueError, match="Incomplete artifact"):
        run_inference(incomplete_art, _sample_obs())

    # Incompatible feature contract
    wrong_features_art = dict(fitted_artifact)
    wrong_features_art["feature_names"] = ["ph", "tds"]
    with pytest.raises(ValueError, match="Incompatible artifact feature contract"):
        run_inference(wrong_features_art, _sample_obs())

    # Corrupted component type
    bad_type_art = dict(fitted_artifact)
    bad_type_art["model"] = "not_a_model"
    with pytest.raises(ValueError, match="Corrupted artifact"):
        run_inference(bad_type_art, _sample_obs())


# 4. Missing weather fields become None and inference continues
def test_missing_weather_fields_become_none_and_inference_continues(fitted_artifact):
    # Partial missing weather
    obs = _sample_obs(
        ph=7.2,
        tds=280.0,
        weather_temp=None,
        precipitation=3.5,
        humidity=None,
    )
    res = run_inference(fitted_artifact, obs)

    assert isinstance(res, dict)
    assert 0.0 <= res["riskScore"] <= 1.0
    assert res["riskLevel"] in RISK_LEVELS
    factors = res["contributingFactors"]
    assert "precipitation" in factors
    assert factors["precipitation"] == 3.5
    # Missing fields must NOT be in contributingFactors
    assert "weatherTemperature" not in factors
    assert "humidity" not in factors


# 5. All weather fields None still allow inference (Explicit Weather Test)
def test_all_weather_fields_none_allows_inference(fitted_artifact):
    obs = {
        "location": {"latitude": 8.1833, "longitude": 77.4119},
        "timestamp": dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc),
        "water": {
            "ph": 7.3,
            "tds": 320.0,
            "turbidity": 2.5,
            "temperature": 26.0,
        },
        "symptoms": {
            "feverCount": 2,
            "diarrheaCount": 1,
            "vomitingCount": 0,
            "abdominalPainCount": 0,
        },
        "weather": {
            "temperature": None,
            "precipitation": None,
            "humidity": None,
        },
    }

    res = run_inference(fitted_artifact, obs)

    assert isinstance(res, dict)
    assert 0.0 <= res["riskScore"] <= 1.0
    assert res["riskLevel"] in RISK_LEVELS
    assert res["modelVersion"] == "v1.0"

    factors = res["contributingFactors"]
    assert factors["ph"] == 7.3
    assert factors["tds"] == 320.0
    assert factors["feverCount"] == 2
    # No weather values fabricated
    assert "weatherTemperature" not in factors
    assert "precipitation" not in factors
    assert "humidity" not in factors


# 6. Missing individual sensor fields handled by fitted imputer (Explicit Sensor-Missing Test)
def test_missing_sensor_fields_handled_by_fitted_imputer(fitted_artifact):
    obs = {
        "location": {"latitude": 8.1833, "longitude": 77.4119},
        "timestamp": "2026-08-12T12:00:00Z",
        "water": {
            "ph": None,
            "tds": 300.0,
            "turbidity": None,
            "temperature": 25.0,
        },
        "symptoms": {
            "feverCount": 0,
            "diarrheaCount": 0,
            "vomitingCount": 0,
            "abdominalPainCount": 0,
        },
        "weather": {
            "temperature": 28.0,
            "precipitation": 0.0,
            "humidity": 65.0,
        },
    }

    res = run_inference(fitted_artifact, obs)

    assert isinstance(res, dict)
    assert 0.0 <= res["riskScore"] <= 1.0
    assert res["riskLevel"] in RISK_LEVELS
    factors = res["contributingFactors"]
    assert factors["tds"] == 300.0
    assert factors["temperature"] == 25.0
    assert "ph" not in factors
    assert "turbidity" not in factors


# 7 & 8. One location preprocessing failure skips only that location, other locations continue
def test_preprocessing_failure_isolation(fitted_artifact, monkeypatch, caplog):
    obs_a = _sample_obs(ph=7.0, tds=200.0, lat=8.1, lon=77.1)
    obs_b = _sample_obs(ph=7.5, tds=350.0, lat=8.2, lon=77.2)
    obs_c = _sample_obs(ph=6.8, tds=180.0, lat=8.3, lon=77.3)

    real_transform = transform_observations

    def _faulty_transform(preprocessor, observations):
        # Fail specifically if observation has lat=8.2
        for o in observations:
            loc = o.get("location") or {}
            if loc.get("latitude") == 8.2:
                raise RuntimeError("Forced preprocessing failure for Location B")
        return real_transform(preprocessor, observations)

    monkeypatch.setattr("ml.pipeline.transform_observations", _faulty_transform)

    batch = [obs_a, obs_b, obs_c]
    with caplog.at_level(logging.ERROR):
        results = run_inference(fitted_artifact, batch)

    assert len(results) == 2
    assert results[0]["location"]["latitude"] == 8.1
    assert results[1]["location"]["latitude"] == 8.3
    # B was omitted and not fabricated
    assert all(r["location"]["latitude"] != 8.2 for r in results)
    assert any("Preprocessing exception" in r.message for r in caplog.records)


# 9 & 10. One location prediction failure skips only that location, other locations continue
def test_prediction_failure_isolation(fitted_artifact, monkeypatch, caplog):
    obs_a = _sample_obs(ph=7.0, tds=200.0, lat=8.1, lon=77.1)
    obs_b = _sample_obs(ph=7.5, tds=350.0, lat=8.2, lon=77.2)
    obs_c = _sample_obs(ph=6.8, tds=180.0, lat=8.3, lon=77.3)

    call_count = 0

    def _faulty_compute_raw(model, X):
        nonlocal call_count
        call_count += 1
        # Fail on second observation
        if call_count == 2:
            raise RuntimeError("Forced model prediction failure for Location B")
        return model.decision_function(X)

    monkeypatch.setattr("ml.pipeline.compute_raw_anomaly_scores", _faulty_compute_raw)

    batch = [obs_a, obs_b, obs_c]
    with caplog.at_level(logging.ERROR):
        results = run_inference(fitted_artifact, batch)

    assert len(results) == 2
    assert results[0]["location"]["latitude"] == 8.1
    assert results[1]["location"]["latitude"] == 8.3
    assert any("Model prediction exception" in r.message for r in caplog.records)


# 11. Risk normalization failure does not fabricate riskScore
def test_risk_normalization_failure_isolation(fitted_artifact, monkeypatch, caplog):
    obs_a = _sample_obs(ph=7.0, tds=200.0, lat=8.1, lon=77.1)
    obs_b = _sample_obs(ph=7.5, tds=350.0, lat=8.2, lon=77.2)
    obs_c = _sample_obs(ph=6.8, tds=180.0, lat=8.3, lon=77.3)

    call_count = 0

    def _faulty_normalize(raw_scores, normalizer):
        nonlocal call_count
        call_count += 1
        if call_count == 2:
            raise RuntimeError("Forced normalization failure for Location B")
        return normalizer.transform(raw_scores)

    monkeypatch.setattr("ml.pipeline.normalize_risk_scores", _faulty_normalize)

    batch = [obs_a, obs_b, obs_c]
    with caplog.at_level(logging.ERROR):
        results = run_inference(fitted_artifact, batch)

    assert len(results) == 2
    assert results[0]["location"]["latitude"] == 8.1
    assert results[1]["location"]["latitude"] == 8.3
    assert any("Risk normalization exception" in r.message for r in caplog.records)


# 12. Risk-level classification failure does not fabricate riskLevel
def test_risk_level_classification_failure_isolation(fitted_artifact, monkeypatch, caplog):
    obs_a = _sample_obs(ph=7.0, tds=200.0, lat=8.1, lon=77.1)
    obs_b = _sample_obs(ph=7.5, tds=350.0, lat=8.2, lon=77.2)
    obs_c = _sample_obs(ph=6.8, tds=180.0, lat=8.3, lon=77.3)

    call_count = 0

    def _faulty_classify(score, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 2:
            return None  # Unclassifiable
        return classify_risk_level(score, **kwargs)

    monkeypatch.setattr("ml.pipeline.classify_risk_level", _faulty_classify)

    batch = [obs_a, obs_b, obs_c]
    with caplog.at_level(logging.ERROR):
        results = run_inference(fitted_artifact, batch)

    assert len(results) == 2
    assert results[0]["location"]["latitude"] == 8.1
    assert results[1]["location"]["latitude"] == 8.3
    # Ensure no fallback "LOW" was assigned to B
    assert all(r["location"]["latitude"] != 8.2 for r in results)
    assert any("Risk level classification failure" in r.message for r in caplog.records)


# 13. No automatic retraining occurs after artifact failure
def test_no_automatic_retraining_after_artifact_failure(tmp_path, monkeypatch):
    def _forbidden_training(*args, **kwargs):
        raise AssertionError("CRITICAL VIOLATION: Training function called during failure handling!")

    monkeypatch.setattr("ml.pipeline.train_model", _forbidden_training)
    monkeypatch.setattr("ml.pipeline.train_pipeline", _forbidden_training)
    monkeypatch.setattr("ml.pipeline.train_pipeline_with_normalizer", _forbidden_training)
    monkeypatch.setattr("ml.pipeline.fit_model", _forbidden_training)
    monkeypatch.setattr("ml.pipeline.fit_preprocessor", _forbidden_training)
    monkeypatch.setattr("ml.pipeline.fit_risk_normalizer", _forbidden_training)
    monkeypatch.setattr(IsolationForest, "fit", _forbidden_training)
    monkeypatch.setattr(Pipeline, "fit", _forbidden_training)

    non_existent = tmp_path / "model_missing.pkl"
    obs = _sample_obs()

    with pytest.raises(FileNotFoundError):
        run_inference(non_existent, obs)


# 14. No fallback model is created
def test_no_fallback_model_created(tmp_path, monkeypatch):
    def _forbidden_build(*args, **kwargs):
        raise AssertionError("CRITICAL VIOLATION: build_model or build_preprocessor called during failure!")

    monkeypatch.setattr("ml.pipeline.build_model", _forbidden_build)
    monkeypatch.setattr("ml.pipeline.build_preprocessor", _forbidden_build)

    non_existent = tmp_path / "model_missing.pkl"
    with pytest.raises(FileNotFoundError):
        load_model_artifact(non_existent)


# 15. No hard-coded / default riskScore is returned on failure
def test_no_hardcoded_or_default_risk_score_on_failure(fitted_artifact, monkeypatch):
    obs = _sample_obs(ph=7.0, tds=200.0)

    # Force preprocessing error
    monkeypatch.setattr(
        "ml.pipeline.transform_observations",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("Preprocess crash")),
    )

    # Single inference returns empty dict
    res = infer_observation(fitted_artifact, obs)
    assert res == {}
    assert "riskScore" not in res
    assert "riskLevel" not in res

    # Batch inference returns empty list
    batch_res = run_inference(fitted_artifact, [obs])
    assert batch_res == []


# 16. Successful locations retain the normal schema
def test_successful_locations_retain_normal_schema(fitted_artifact, monkeypatch):
    obs_a = _sample_obs(ph=7.0, tds=200.0, lat=8.1, lon=77.1)
    obs_b = _sample_obs(ph=7.5, tds=350.0, lat=8.2, lon=77.2)
    obs_c = _sample_obs(ph=6.8, tds=180.0, lat=8.3, lon=77.3)

    call_count = 0

    def _faulty_transform(preprocessor, observations):
        nonlocal call_count
        call_count += 1
        if call_count == 2:
            raise RuntimeError("Fail B")
        return transform_observations(preprocessor, observations)

    monkeypatch.setattr("ml.pipeline.transform_observations", _faulty_transform)

    results = run_inference(fitted_artifact, [obs_a, obs_b, obs_c])
    assert len(results) == 2

    for r in results:
        assert isinstance(r["riskScore"], float)
        assert 0.0 <= r["riskScore"] <= 1.0
        assert r["riskLevel"] in [RISK_LEVEL_LOW, RISK_LEVEL_MEDIUM, RISK_LEVEL_HIGH]
        assert r["modelVersion"] == "v1.0"
        assert isinstance(r["contributingFactors"], dict)
        assert isinstance(r["location"], dict)
        assert "latitude" in r["location"]
        assert "longitude" in r["location"]
        assert "timestamp" in r


# 17. Failure information is not inserted into riskScores
def test_failure_info_not_inserted_into_risk_scores(fitted_artifact, monkeypatch):
    obs_a = _sample_obs(ph=7.0, tds=200.0, lat=8.1, lon=77.1)
    obs_b = _sample_obs(ph=7.5, tds=350.0, lat=8.2, lon=77.2)
    obs_c = _sample_obs(ph=6.8, tds=180.0, lat=8.3, lon=77.3)

    call_count = 0

    def _faulty_transform(preprocessor, observations):
        nonlocal call_count
        call_count += 1
        if call_count == 2:
            raise RuntimeError("Fail B")
        return transform_observations(preprocessor, observations)

    monkeypatch.setattr("ml.pipeline.transform_observations", _faulty_transform)

    results = run_inference(fitted_artifact, [obs_a, obs_b, obs_c])
    for r in results:
        # Assert absence of debug/error/status fields in official output
        assert "error" not in r
        assert "errors" not in r
        assert "status" not in r
        assert "debug" not in r
        assert "exception" not in r
        assert "message" not in r
        assert "failed" not in r
        assert "stackTrace" not in r


# 18. No credentials appear in log messages
def test_no_credentials_appear_in_log_messages(fitted_artifact, monkeypatch, caplog):
    obs = {
        "location": {"latitude": 8.1833, "longitude": 77.4119},
        "timestamp": "2026-08-12T12:00:00Z",
        "water": {"ph": 7.2, "tds": 300.0, "turbidity": 2.0, "temperature": 25.0},
        "symptoms": {"feverCount": 1, "diarrheaCount": 0, "vomitingCount": 0, "abdominalPainCount": 0},
        "weather": {"temperature": 28.0, "precipitation": 0.0, "humidity": 70.0},
        "password": "SUPER_SECRET_MONGO_PASSWORD_999",
        "apiKey": "SECRET_API_KEY_12345",
    }

    # Inject an error during transform
    monkeypatch.setattr(
        "ml.pipeline.transform_observations",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("Simulated error")),
    )

    with caplog.at_level(logging.DEBUG):
        _ = run_inference(fitted_artifact, [obs])

    log_text = " ".join([r.message for r in caplog.records])
    assert "SUPER_SECRET_MONGO_PASSWORD_999" not in log_text
    assert "SECRET_API_KEY_12345" not in log_text


# 19. Batch ordering and determinism of remaining successful results are preserved
def test_batch_ordering_and_determinism_preserved(fitted_artifact, monkeypatch):
    l1 = _sample_obs(ph=7.0, tds=200.0, lat=8.1, lon=77.1)
    l2 = _sample_obs(ph=7.1, tds=210.0, lat=8.2, lon=77.2)
    l3 = _sample_obs(ph=7.2, tds=220.0, lat=8.3, lon=77.3)
    l4 = _sample_obs(ph=7.3, tds=230.0, lat=8.4, lon=77.4)
    l5 = _sample_obs(ph=7.4, tds=240.0, lat=8.5, lon=77.5)

    # Compute baseline individual scores for L1, L3, L5
    r1_single = infer_observation(fitted_artifact, l1)
    r3_single = infer_observation(fitted_artifact, l3)
    r5_single = infer_observation(fitted_artifact, l5)

    call_count = 0

    def _faulty_transform(preprocessor, observations):
        nonlocal call_count
        call_count += 1
        # Fail for L2 (call 2) and L4 (call 4)
        if call_count in (2, 4):
            raise RuntimeError(f"Fail on item {call_count}")
        return transform_observations(preprocessor, observations)

    monkeypatch.setattr("ml.pipeline.transform_observations", _faulty_transform)

    batch_results = run_inference(fitted_artifact, [l1, l2, l3, l4, l5])
    assert len(batch_results) == 3

    # Preserves relative ordering
    assert batch_results[0]["location"]["latitude"] == 8.1
    assert batch_results[1]["location"]["latitude"] == 8.3
    assert batch_results[2]["location"]["latitude"] == 8.5

    # Determinism: scores match single inference exactly
    assert batch_results[0]["riskScore"] == pytest.approx(r1_single["riskScore"], abs=1e-7)
    assert batch_results[1]["riskScore"] == pytest.approx(r3_single["riskScore"], abs=1e-7)
    assert batch_results[2]["riskScore"] == pytest.approx(r5_single["riskScore"], abs=1e-7)


# 20. Single observation failure returns empty result cleanly
def test_single_observation_failure_returns_empty_dict(fitted_artifact, monkeypatch):
    obs = _sample_obs(ph=7.0, tds=200.0)
    monkeypatch.setattr(
        "ml.pipeline.compute_raw_anomaly_scores",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("Decision function failed")),
    )
    res = infer_observation(fitted_artifact, obs)
    assert res == {}


# 21. predict_with_artifact isolates location failures
def test_predict_with_artifact_failure_isolation(fitted_artifact, monkeypatch):
    obs_a = _sample_obs(ph=7.0, tds=200.0, lat=8.1, lon=77.1)
    obs_b = _sample_obs(ph=7.5, tds=350.0, lat=8.2, lon=77.2)
    obs_c = _sample_obs(ph=6.8, tds=180.0, lat=8.3, lon=77.3)

    call_count = 0

    def _faulty_transform(preprocessor, observations):
        nonlocal call_count
        call_count += 1
        if call_count == 2:
            raise RuntimeError("Fail B")
        return transform_observations(preprocessor, observations)

    monkeypatch.setattr("ml.pipeline.transform_observations", _faulty_transform)

    results = predict_with_artifact(fitted_artifact, [obs_a, obs_b, obs_c])
    assert len(results) == 2
    assert results[0]["location"]["latitude"] == 8.1
    assert results[1]["location"]["latitude"] == 8.3


# 22. Unusable invalid input skipped cleanly
def test_unusable_invalid_input_skipped_cleanly(fitted_artifact):
    # Invalid observation record (not a dict)
    batch = [
        _sample_obs(lat=8.1),
        "INVALID_STRING_RECORD",
        None,
        _sample_obs(lat=8.3),
    ]

    results = run_inference(fitted_artifact, batch)
    assert len(results) == 2
    assert results[0]["location"]["latitude"] == 8.1
    assert results[1]["location"]["latitude"] == 8.3
