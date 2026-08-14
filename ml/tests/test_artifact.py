import datetime as dt
import pickle
from pathlib import Path
import numpy as np
import pytest
from ml.pipeline import (
    FEATURE_NAMES,
    DEFAULT_MODEL_VERSION,
    save_model_artifact,
    load_model_artifact,
    predict_with_artifact,
    predict,
    train_pipeline_with_normalizer,
    transform_observations,
    compute_raw_anomaly_scores,
    normalize_risk_scores,
    classify_risk_levels,
    RiskNormalizer,
    build_preprocessor,
    build_model,
)

def _sample_obs(ph=7.2, tds=300.0, fever=1, lat=8.1833, lon=77.4119, ts=None):
    if ts is None:
        ts = dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)
    return {
        "location": {"latitude": lat, "longitude": lon},
        "timestamp": ts,
        "water": {"ph": ph, "tds": tds, "turbidity": 3.0, "temperature": 25.0},
        "symptoms": {"feverCount": fever, "diarrheaCount": 0, "vomitingCount": 0, "abdominalPainCount": 0},
        "weather": {"temperature": 28.0, "precipitation": 0.0, "humidity": 70.0},
    }

def _sample_dataset():
    base = dt.datetime(2026, 8, 12, 10, 0, 0, tzinfo=dt.timezone.utc)
    return [
        _sample_obs(ph=7.0, tds=200.0, fever=0, ts=base + dt.timedelta(hours=0)),
        _sample_obs(ph=7.5, tds=350.0, fever=2, ts=base + dt.timedelta(hours=1)),
        _sample_obs(ph=8.0, tds=500.0, fever=5, ts=base + dt.timedelta(hours=2)),
        _sample_obs(ph=6.8, tds=150.0, fever=0, ts=base + dt.timedelta(hours=3)),
        _sample_obs(ph=7.2, tds=280.0, fever=1, ts=base + dt.timedelta(hours=4)),
        _sample_obs(ph=7.4, tds=320.0, fever=1, ts=base + dt.timedelta(hours=5)),
    ]

# 1. Save and load fitted artifact successfully
def test_save_and_load_artifact_roundtrip(tmp_path):
    train_data = _sample_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_data, random_state=42)
    
    artifact_file = tmp_path / "model_v1.0.pkl"
    saved_path = save_model_artifact(
        preprocessor=preprocessor,
        model=model,
        risk_normalizer=normalizer,
        model_version="v1.0",
        artifact_path=artifact_file,
    )
    
    assert Path(saved_path).exists()
    
    loaded = load_model_artifact(saved_path)
    assert loaded["model_version"] == "v1.0"
    assert loaded["feature_names"] == FEATURE_NAMES
    assert loaded["preprocessor"] is not None
    assert loaded["model"] is not None
    assert loaded["risk_normalizer"] is not None
    assert isinstance(loaded["risk_normalizer"], RiskNormalizer)

# 2. Reproducibility test: Pre-save and post-load inference outputs match exactly
def test_inference_reproducibility_pre_save_post_load(tmp_path):
    train_data = _sample_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_data, random_state=42)
    
    test_obs = [
        _sample_obs(ph=6.5, tds=180.0, fever=0),
        _sample_obs(ph=8.5, tds=600.0, fever=8),
        _sample_obs(ph=7.1, tds=290.0, fever=1),
    ]
    
    # Pre-save inference
    X_pre = transform_observations(preprocessor, test_obs)
    raw_pre = compute_raw_anomaly_scores(model, X_pre)
    risk_pre = normalize_risk_scores(raw_pre, normalizer)
    levels_pre = classify_risk_levels(risk_pre)
    
    # Save artifact
    artifact_file = tmp_path / "test_model_v1.0.pkl"
    save_model_artifact(preprocessor, model, normalizer, "v1.0", artifact_file)
    
    # Load into clean artifact dict
    loaded = load_model_artifact(artifact_file)
    
    # Post-load inference using loaded components
    X_post = transform_observations(loaded["preprocessor"], test_obs)
    raw_post = compute_raw_anomaly_scores(loaded["model"], X_post)
    risk_post = normalize_risk_scores(raw_post, loaded["risk_normalizer"])
    levels_post = classify_risk_levels(risk_post)
    
    # Assert exact numerical equivalence
    np.testing.assert_allclose(X_pre, X_post, rtol=1e-6)
    np.testing.assert_allclose(raw_pre, raw_post, rtol=1e-6)
    np.testing.assert_allclose(risk_pre, risk_post, rtol=1e-6)
    assert levels_pre == levels_post

# 3. Predict with loaded artifact
def test_predict_with_artifact(tmp_path):
    train_data = _sample_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_data, random_state=42)
    
    artifact_file = tmp_path / "model_v1.0.pkl"
    save_model_artifact(preprocessor, model, normalizer, "v1.0", artifact_file)
    loaded = load_model_artifact(artifact_file)
    
    test_obs = [_sample_obs(ph=7.0, tds=220.0, fever=0)]
    results = predict_with_artifact(loaded, test_obs)
    
    assert len(results) == 1
    res = results[0]
    assert 0.0 <= res["riskScore"] <= 1.0
    assert res["riskLevel"] in ["LOW", "MEDIUM", "HIGH"]
    assert res["modelVersion"] == "v1.0"
    assert isinstance(res["contributingFactors"], dict)
    assert res["contributingFactors"]["ph"] == 7.0
    assert "location" in res
    assert "timestamp" in res

# 4. Pipeline predict function integration
def test_pipeline_predict_with_loaded_artifact(tmp_path):
    train_data = _sample_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_data, random_state=42)
    
    artifact_file = tmp_path / "model_v1.0.pkl"
    save_model_artifact(preprocessor, model, normalizer, "v1.0", artifact_file)
    loaded = load_model_artifact(artifact_file)
    
    test_obs = [_sample_obs(ph=7.0, tds=220.0, fever=0)]
    res = predict(loaded, test_obs)
    assert len(res) == 1
    assert res[0]["modelVersion"] == "v1.0"

# 5. Overwrite prevention and explicit overwrite
def test_save_artifact_overwrite_control(tmp_path):
    train_data = _sample_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_data, random_state=42)
    
    artifact_file = tmp_path / "model_v1.0.pkl"
    save_model_artifact(preprocessor, model, normalizer, "v1.0", artifact_file)
    
    # Overwrite = False should raise FileExistsError
    with pytest.raises(FileExistsError):
        save_model_artifact(preprocessor, model, normalizer, "v1.0", artifact_file, overwrite=False)
        
    # Overwrite = True should succeed
    new_path = save_model_artifact(preprocessor, model, normalizer, "v1.0", artifact_file, overwrite=True)
    assert Path(new_path).exists()

# 6. Unfitted component validation on save
def test_save_unfitted_components_fails(tmp_path):
    unfitted_preprocessor = build_preprocessor()
    unfitted_model = build_model()
    normalizer = RiskNormalizer()
    artifact_file = tmp_path / "fail.pkl"
    
    with pytest.raises(ValueError, match="Unfitted"):
        save_model_artifact(unfitted_preprocessor, unfitted_model, normalizer, "v1.0", artifact_file)

# 7. Missing file handling on load
def test_load_missing_file_fails(tmp_path):
    missing_file = tmp_path / "non_existent.pkl"
    with pytest.raises(FileNotFoundError):
        load_model_artifact(missing_file)

# 8. Corrupted file handling on load
def test_load_corrupted_file_fails(tmp_path):
    bad_file = tmp_path / "corrupt.pkl"
    with open(bad_file, "wb") as f:
        f.write(b"NOT_A_VALID_PICKLE_DATA")
        
    with pytest.raises(ValueError, match="Corrupted"):
        load_model_artifact(bad_file)

# 9. Incomplete artifact payload on load
def test_load_incomplete_artifact_fails(tmp_path):
    bad_file = tmp_path / "incomplete.pkl"
    # Missing 'risk_normalizer' and 'model'
    with open(bad_file, "wb") as f:
        pickle.dump({"model_version": "v1.0", "feature_names": FEATURE_NAMES}, f)
        
    with pytest.raises(ValueError, match="Incomplete"):
        load_model_artifact(bad_file)

# 10. Incompatible feature contract on load
def test_load_incompatible_feature_contract_fails(tmp_path):
    bad_file = tmp_path / "bad_features.pkl"
    train_data = _sample_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_data, random_state=42)
    
    corrupt_features = list(FEATURE_NAMES)
    corrupt_features[0] = "wrong_feature_name"
    
    payload = {
        "model_version": "v1.0",
        "feature_names": corrupt_features,
        "preprocessor": preprocessor,
        "model": model,
        "risk_normalizer": normalizer,
    }
    with open(bad_file, "wb") as f:
        pickle.dump(payload, f)
        
    with pytest.raises(ValueError, match="Incompatible feature contract"):
        load_model_artifact(bad_file)

# 11. Model version mismatch on load
def test_load_version_mismatch_fails(tmp_path):
    artifact_file = tmp_path / "model_v1.0.pkl"
    train_data = _sample_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_data, random_state=42)
    save_model_artifact(preprocessor, model, normalizer, "v1.0", artifact_file)
    
    with pytest.raises(ValueError, match="Model version mismatch"):
        load_model_artifact(artifact_file, expected_version="v2.0")

# 12. Security validation: metadata cannot contain credentials
def test_save_security_blocks_credentials(tmp_path):
    train_data = _sample_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_data, random_state=42)
    artifact_file = tmp_path / "secure.pkl"
    
    with pytest.raises(ValueError, match="Security violation"):
        save_model_artifact(
            preprocessor,
            model,
            normalizer,
            "v1.0",
            artifact_file,
            metadata={"mongodb_password": "secret_password_123"},
        )
