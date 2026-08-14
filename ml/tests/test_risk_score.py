import datetime as dt
import numpy as np
import pytest
from ml.pipeline import (
    RiskNormalizer,
    fit_risk_normalizer,
    normalize_risk_scores,
    compute_risk_scores,
    score_observations_to_risk,
    train_pipeline_with_normalizer,
    train_and_evaluate,
    fit_preprocessor,
    transform_observations,
    fit_model,
    compute_raw_anomaly_scores,
)

def _sample_obs(ph=7.2, tds=300.0, fever=1, lat=8.0, lon=77.0, ts=None):
    if ts is None:
        ts = dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)
    return {
        "location": {"latitude": lat, "longitude": lon},
        "timestamp": ts,
        "water": {"ph": ph, "tds": tds, "turbidity": 3.0, "temperature": 25.0},
        "symptoms": {"feverCount": fever, "diarrheaCount": 0, "vomitingCount": 0, "abdominalPainCount": 0},
        "weather": {"temperature": 28.0, "precipitation": 0.0, "humidity": 70.0},
    }

def _sample_training_dataset():
    base = dt.datetime(2026, 8, 12, 10, 0, 0, tzinfo=dt.timezone.utc)
    return [
        _sample_obs(ph=7.0, tds=200.0, fever=0, ts=base + dt.timedelta(hours=0)),
        _sample_obs(ph=7.5, tds=350.0, fever=2, ts=base + dt.timedelta(hours=1)),
        _sample_obs(ph=8.0, tds=500.0, fever=5, ts=base + dt.timedelta(hours=2)),
        _sample_obs(ph=6.8, tds=150.0, fever=0, ts=base + dt.timedelta(hours=3)),
        _sample_obs(ph=7.2, tds=280.0, fever=1, ts=base + dt.timedelta(hours=4)),
        _sample_obs(ph=7.4, tds=320.0, fever=1, ts=base + dt.timedelta(hours=5)),
    ]

# 1. Monotonic inversion: higher anomaly (lower raw score) -> higher riskScore
def test_risk_score_monotonic_inversion():
    # Raw scores: 0.3 (normal), 0.1 (moderate), -0.2 (anomalous)
    raw_training_scores = np.array([0.3, 0.1, -0.2])
    normalizer = fit_risk_normalizer(raw_training_scores)
    
    risk_scores = normalize_risk_scores(raw_training_scores, normalizer)
    
    assert len(risk_scores) == 3
    # 0.3 is most normal -> lowest risk (0.0)
    assert risk_scores[0] == 0.0
    # -0.2 is most anomalous -> highest risk (1.0)
    assert risk_scores[2] == 1.0
    # Intermediate score preserves ordering
    assert 0.0 < risk_scores[1] < 1.0
    assert risk_scores[0] < risk_scores[1] < risk_scores[2]

# 2. Risk score is strictly bounded in [0.0, 1.0]
def test_risk_score_bounded_in_zero_to_one():
    raw_train = np.array([0.2, 0.0, -0.1, -0.3])
    normalizer = fit_risk_normalizer(raw_train)
    
    # Test a broad range of raw scores
    raw_eval = np.array([0.5, 0.2, 0.0, -0.1, -0.3, -0.8])
    risk_scores = normalize_risk_scores(raw_eval, normalizer)
    
    assert (risk_scores >= 0.0).all()
    assert (risk_scores <= 1.0).all()
    assert np.isfinite(risk_scores).all()

# 3. Out-of-bounds inference scores are clamped to [0.0, 1.0]
def test_out_of_bounds_inference_scores_clamped():
    raw_train = np.array([0.2, -0.2])
    # Inverted training range: min = -0.2 (from raw=0.2), max = 0.2 (from raw=-0.2)
    normalizer = fit_risk_normalizer(raw_train)
    
    # Raw score 0.5 is even more normal than training max raw -> inverted = -0.5 -> below min -> clamps to 0.0
    # Raw score -0.8 is even more anomalous than training min raw -> inverted = 0.8 -> above max -> clamps to 1.0
    raw_inference = np.array([0.5, -0.8])
    risk_scores = normalize_risk_scores(raw_inference, normalizer)
    
    assert risk_scores[0] == 0.0
    assert risk_scores[1] == 1.0

# 4. Constant-score edge case avoids division by zero and produces neutral 0.0
def test_constant_score_edge_case():
    constant_raw_train = np.array([0.1, 0.1, 0.1])
    normalizer = fit_risk_normalizer(constant_raw_train)
    
    assert normalizer.training_min == normalizer.training_max
    
    scores = normalize_risk_scores(np.array([0.1, 0.2, -0.1]), normalizer)
    assert len(scores) == 3
    assert (scores == 0.0).all()
    assert not np.isnan(scores).any()

# 5. Empty inputs handled gracefully
def test_empty_raw_scores_handling():
    normalizer = RiskNormalizer()
    assert len(normalize_risk_scores(np.empty(0), normalizer)) == 0
    assert len(normalize_risk_scores(None, normalizer)) == 0

# 6. Data leakage prevention: Normalizer parameters fixed from training data
def test_normalizer_parameters_not_refitted_during_inference():
    raw_train = np.array([0.2, 0.0, -0.2])
    normalizer = fit_risk_normalizer(raw_train)
    
    t_min_before = normalizer.training_min
    t_max_before = normalizer.training_max
    
    # Process multiple extreme inference batches
    _ = normalize_risk_scores(np.array([10.0, -10.0]), normalizer)
    _ = normalize_risk_scores(np.array([-5.0, 5.0]), normalizer)
    
    assert normalizer.training_min == t_min_before
    assert normalizer.training_max == t_max_before

# 7. Normalizer serialization to/from dict
def test_normalizer_serialization():
    normalizer = RiskNormalizer(training_min=-0.25, training_max=0.35)
    d = normalizer.to_dict()
    assert d == {"training_min": -0.25, "training_max": 0.35}
    
    restored = RiskNormalizer.from_dict(d)
    assert restored.training_min == -0.25
    assert restored.training_max == 0.35
    
    # normalize with dict parameter
    scores = normalize_risk_scores(np.array([0.0]), d)
    assert 0.0 <= scores[0] <= 1.0

# 8. Pipeline integration: score_observations_to_risk
def test_score_observations_to_risk_pipeline():
    train_obs = _sample_training_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_obs, random_state=42)
    
    # Score training observations
    train_risk = score_observations_to_risk(preprocessor, model, normalizer, train_obs)
    assert len(train_risk) == len(train_obs)
    assert (train_risk >= 0.0).all()
    assert (train_risk <= 1.0).all()
    
    # Score new observation
    new_obs = [_sample_obs(ph=14.0, tds=5000.0, fever=50)]  # Severe outlier
    new_risk = score_observations_to_risk(preprocessor, model, normalizer, new_obs)
    assert len(new_risk) == 1
    assert 0.0 <= new_risk[0] <= 1.0
    # Severe outlier should receive high risk
    assert new_risk[0] >= 0.8

# 9. train_and_evaluate includes normalizer and risk scores
def test_train_and_evaluate_includes_risk_scores():
    obs = _sample_training_dataset()
    res = train_and_evaluate(obs, validation_fraction=0.33, random_state=42)
    
    assert "normalizer" in res
    assert isinstance(res["normalizer"], RiskNormalizer)
    assert "train_risk_scores" in res
    assert "validation_risk_scores" in res
    assert len(res["train_risk_scores"]) == res["train_count"]
    assert len(res["validation_risk_scores"]) == res["validation_count"]
    assert (res["train_risk_scores"] >= 0.0).all() and (res["train_risk_scores"] <= 1.0).all()
    assert (res["validation_risk_scores"] >= 0.0).all() and (res["validation_risk_scores"] <= 1.0).all()

# 10. compute_risk_scores on feature matrix
def test_compute_risk_scores_matrix():
    train_obs = _sample_training_dataset()
    preprocessor = fit_preprocessor(train_obs)
    X_train = transform_observations(preprocessor, train_obs)
    model = fit_model(X_train, random_state=42)
    
    raw_train = compute_raw_anomaly_scores(model, X_train)
    normalizer = fit_risk_normalizer(raw_train)
    
    risk_matrix = compute_risk_scores(model, normalizer, X_train)
    assert isinstance(risk_matrix, np.ndarray)
    assert risk_matrix.shape == (len(train_obs),)
    assert (risk_matrix >= 0.0).all() and (risk_matrix <= 1.0).all()
