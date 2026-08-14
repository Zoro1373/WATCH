import datetime as dt
import numpy as np
import pytest
from ml.pipeline import (
    time_aware_split,
    evaluate_anomaly_scores,
    evaluate_validation_set,
    train_and_evaluate,
    fit_preprocessor,
    transform_observations,
    fit_model,
)

def _sample_obs(ts, ph=7.2, tds=300.0, fever=1, lat=8.0, lon=77.0):
    return {
        "location": {"latitude": lat, "longitude": lon},
        "timestamp": ts,
        "water": {"ph": ph, "tds": tds, "turbidity": 3.0, "temperature": 25.0},
        "symptoms": {"feverCount": fever, "diarrheaCount": 0, "vomitingCount": 0, "abdominalPainCount": 0},
        "weather": {"temperature": 28.0, "precipitation": 0.0, "humidity": 70.0},
    }

def _sample_time_series(n=10, base_hour=10):
    base = dt.datetime(2026, 8, 12, base_hour, 0, 0, tzinfo=dt.timezone.utc)
    return [
        _sample_obs(
            ts=base + dt.timedelta(hours=i),
            ph=7.0 + (i * 0.1),
            tds=200.0 + (i * 20.0),
            fever=i % 3,
        )
        for i in range(n)
    ]

# 1. Observations are sorted chronologically
def test_time_aware_split_chronological_order():
    obs_list = _sample_time_series(n=10)
    # Shuffle the input order to verify sorting
    shuffled = [obs_list[5], obs_list[0], obs_list[9], obs_list[2], obs_list[7], obs_list[1], obs_list[8], obs_list[3], obs_list[6], obs_list[4]]
    
    train_set, val_set = time_aware_split(shuffled, validation_fraction=0.2)
    
    assert len(train_set) == 8
    assert len(val_set) == 2
    
    # Verify training timestamps are strictly in ascending order
    for i in range(len(train_set) - 1):
        assert train_set[i]["timestamp"] <= train_set[i + 1]["timestamp"]
        
    # Verify validation timestamps are strictly in ascending order
    for i in range(len(val_set) - 1):
        assert val_set[i]["timestamp"] <= val_set[i + 1]["timestamp"]

# 2. No temporal leakage: max training timestamp <= min validation timestamp
def test_time_aware_split_no_temporal_leakage():
    obs_list = _sample_time_series(n=10)
    train_set, val_set = time_aware_split(obs_list, validation_fraction=0.3)
    
    assert len(train_set) == 7
    assert len(val_set) == 3
    
    max_train_ts = max(obs["timestamp"] for obs in train_set)
    min_val_ts = min(obs["timestamp"] for obs in val_set)
    
    assert max_train_ts <= min_val_ts

# 3. Determinism
def test_time_aware_split_is_deterministic():
    obs_list = _sample_time_series(n=8)
    train_1, val_1 = time_aware_split(obs_list, validation_fraction=0.25)
    train_2, val_2 = time_aware_split(obs_list, validation_fraction=0.25)
    
    assert train_1 == train_2
    assert val_1 == val_2

# 4. Filter invalid/missing timestamps
def test_time_aware_split_filters_invalid_timestamps():
    valid_ts = dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)
    obs_with_bad = [
        _sample_obs(ts=valid_ts),
        _sample_obs(ts=None),
        _sample_obs(ts="not-a-valid-timestamp"),
        _sample_obs(ts=valid_ts + dt.timedelta(hours=1)),
    ]
    train_set, val_set = time_aware_split(obs_with_bad, validation_fraction=0.5)
    
    # 2 valid records split 50/50 -> 1 train, 1 validation
    assert len(train_set) == 1
    assert len(val_set) == 1
    assert train_set[0]["timestamp"] == valid_ts
    assert val_set[0]["timestamp"] == valid_ts + dt.timedelta(hours=1)

# 5. Explicit cutoff timestamp
def test_time_aware_split_explicit_cutoff():
    obs_list = _sample_time_series(n=6, base_hour=10)
    cutoff = dt.datetime(2026, 8, 12, 13, 0, 0, tzinfo=dt.timezone.utc)
    
    train_set, val_set = time_aware_split(obs_list, split_time=cutoff)
    
    # Hours 10, 11, 12 in train (3 records), hours 13, 14, 15 in val (3 records)
    assert len(train_set) == 3
    assert len(val_set) == 3
    assert all(obs["timestamp"] < cutoff for obs in train_set)
    assert all(obs["timestamp"] >= cutoff for obs in val_set)

# 6. Edge cases: empty, 0 fraction, 1.0 fraction
def test_time_aware_split_boundary_fractions():
    obs_list = _sample_time_series(n=5)
    
    # Empty
    assert time_aware_split([]) == ([], [])
    
    # 0.0 fraction
    train_all, val_empty = time_aware_split(obs_list, validation_fraction=0.0)
    assert len(train_all) == 5
    assert len(val_empty) == 0
    
    # 1.0 fraction
    train_empty, val_all = time_aware_split(obs_list, validation_fraction=1.0)
    assert len(train_empty) == 0
    assert len(val_all) == 5

# 7. Original observations preserved
def test_time_aware_split_preserves_original_structures():
    obs_list = _sample_time_series(n=4)
    train_set, val_set = time_aware_split(obs_list, validation_fraction=0.25)
    
    for obs in train_set + val_set:
        assert "location" in obs
        assert "water" in obs
        assert "symptoms" in obs
        assert "weather" in obs
        assert "timestamp" in obs

# 8. Data leakage prevention: Preprocessor fitted strictly on training split
def test_preprocessing_fitted_only_on_train_split():
    # Training observations have normal low TDS (200-240)
    # Validation observations have elevated TDS (500-600)
    base = dt.datetime(2026, 8, 12, 10, 0, 0, tzinfo=dt.timezone.utc)
    obs = [
        _sample_obs(ts=base + dt.timedelta(hours=0), tds=200.0),
        _sample_obs(ts=base + dt.timedelta(hours=1), tds=220.0),
        _sample_obs(ts=base + dt.timedelta(hours=2), tds=240.0),
        _sample_obs(ts=base + dt.timedelta(hours=3), tds=500.0),
        _sample_obs(ts=base + dt.timedelta(hours=4), tds=600.0),
    ]
    train_set, val_set = time_aware_split(obs, validation_fraction=0.4)
    assert len(train_set) == 3
    assert len(val_set) == 2
    
    preprocessor = fit_preprocessor(train_set)
    
    # Check that scaler mean for TDS reflects only the training set mean (220.0)
    tds_idx = 1  # 'tds' is index 1 in FEATURE_NAMES
    expected_train_mean = (200.0 + 220.0 + 240.0) / 3.0
    actual_scaler_mean = preprocessor.named_steps["scaler"].mean_[tds_idx]
    
    np.testing.assert_almost_equal(actual_scaler_mean, expected_train_mean)

# 9. Evaluate validation set produces distribution metrics
def test_evaluate_validation_set_distribution_metrics():
    train_obs = _sample_time_series(n=8, base_hour=8)
    val_obs = _sample_time_series(n=4, base_hour=16)
    
    preprocessor = fit_preprocessor(train_obs)
    X_train = transform_observations(preprocessor, train_obs)
    model = fit_model(X_train, random_state=42)
    
    metrics = evaluate_validation_set(model, preprocessor, val_obs)
    
    assert metrics["sample_count"] == len(val_obs)
    assert isinstance(metrics["score_min"], float)
    assert isinstance(metrics["score_max"], float)
    assert isinstance(metrics["score_mean"], float)
    assert isinstance(metrics["score_median"], float)
    assert isinstance(metrics["score_std"], float)
    assert isinstance(metrics["score_q25"], float)
    assert isinstance(metrics["score_q75"], float)
    assert metrics["inlier_count"] + metrics["outlier_count"] == len(val_obs)
    assert 0.0 <= metrics["outlier_fraction"] <= 1.0

# 10. End-to-end train_and_evaluate flow
def test_train_and_evaluate_end_to_end():
    obs_list = _sample_time_series(n=12, base_hour=6)
    
    res = train_and_evaluate(obs_list, validation_fraction=0.25, random_state=42)
    
    assert res["train_count"] == 9
    assert res["validation_count"] == 3
    assert res["preprocessor"] is not None
    assert res["model"] is not None
    assert res["train_metrics"]["sample_count"] == 9
    assert res["validation_metrics"]["sample_count"] == 3

# 11. Empty validation evaluation returns safe empty metrics
def test_evaluate_empty_validation_set():
    train_obs = _sample_time_series(n=4)
    preprocessor = fit_preprocessor(train_obs)
    X_train = transform_observations(preprocessor, train_obs)
    model = fit_model(X_train, random_state=42)
    
    metrics = evaluate_validation_set(model, preprocessor, [])
    assert metrics["sample_count"] == 0
    assert metrics["score_mean"] is None
    assert metrics["inlier_count"] == 0
    assert metrics["outlier_fraction"] == 0.0
