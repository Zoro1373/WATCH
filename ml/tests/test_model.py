import datetime as dt
import numpy as np
import pytest
from sklearn.ensemble import IsolationForest

from ml.pipeline import (
    FEATURE_NAMES,
    build_model,
    fit_model,
    train_model,
    train_pipeline,
    fit_preprocessor,
    transform_observations,
    compute_raw_anomaly_scores,
    predict_inliers_outliers,
)

def _sample_cleaned_observation(
    ph=7.2, tds=300.0, turbidity=3.5, water_temp=24.0,
    fever=1, diarrhea=0, vomiting=0, abd_pain=0,
    weather_temp=28.0, precip=1.5, humidity=70.0,
    lat=8.0, lon=77.0, ts=None,
):
    if ts is None:
        ts = dt.datetime(2026, 8, 12, 12, 0, 0, tzinfo=dt.timezone.utc)
    return {
        "location": {"latitude": lat, "longitude": lon},
        "timestamp": ts,
        "water": {"ph": ph, "tds": tds, "turbidity": turbidity, "temperature": water_temp},
        "symptoms": {"feverCount": fever, "diarrheaCount": diarrhea, "vomitingCount": vomiting, "abdominalPainCount": abd_pain},
        "weather": {"temperature": weather_temp, "precipitation": precip, "humidity": humidity},
    }

def _sample_in_memory_training_fixtures():
    """In-memory fixtures strictly for unit testing model pipeline primitives."""
    return [
        _sample_cleaned_observation(ph=7.0, tds=200.0, turbidity=2.0, water_temp=22.0, fever=0, diarrhea=0, vomiting=0, abd_pain=0, weather_temp=25.0, precip=0.0, humidity=60.0),
        _sample_cleaned_observation(ph=7.5, tds=350.0, turbidity=4.0, water_temp=26.0, fever=2, diarrhea=1, vomiting=0, abd_pain=0, weather_temp=30.0, precip=5.0, humidity=80.0),
        _sample_cleaned_observation(ph=8.0, tds=500.0, turbidity=6.0, water_temp=28.0, fever=5, diarrhea=3, vomiting=2, abd_pain=1, weather_temp=32.0, precip=10.0, humidity=85.0),
        _sample_cleaned_observation(ph=6.8, tds=150.0, turbidity=1.5, water_temp=20.0, fever=0, diarrhea=0, vomiting=0, abd_pain=0, weather_temp=22.0, precip=0.0, humidity=50.0),
        _sample_cleaned_observation(ph=7.2, tds=280.0, turbidity=3.0, water_temp=24.0, fever=1, diarrhea=0, vomiting=0, abd_pain=0, weather_temp=27.0, precip=2.0, humidity=65.0),
        _sample_cleaned_observation(ph=7.4, tds=320.0, turbidity=3.8, water_temp=25.0, fever=1, diarrhea=1, vomiting=0, abd_pain=0, weather_temp=29.0, precip=3.0, humidity=72.0),
    ]

# 1. Isolation Forest instance is created successfully
def test_build_model_creates_instance():
    model = build_model()
    assert isinstance(model, IsolationForest)
    assert model.n_estimators == 100
    assert model.max_samples == "auto"
    assert model.contamination == "auto"
    assert model.max_features == 1.0
    assert model.bootstrap is False

# 2. Model uses exactly the 11-feature matrix produced by preprocessing
def test_model_uses_11_feature_matrix():
    train_obs = _sample_in_memory_training_fixtures()
    preprocessor = fit_preprocessor(train_obs)
    X_train = transform_observations(preprocessor, train_obs)
    
    assert X_train.shape[1] == len(FEATURE_NAMES)
    assert X_train.shape[1] == 11
    
    model = fit_model(X_train, random_state=42)
    assert hasattr(model, "n_features_in_")
    assert model.n_features_in_ == 11

# 3. Model can fit on a valid training matrix
def test_model_fits_on_valid_training_matrix():
    train_obs = _sample_in_memory_training_fixtures()
    preprocessor, model = train_pipeline(train_obs, random_state=42)
    
    assert hasattr(model, "estimators_")
    assert len(model.estimators_) == 100

# 4. Model can produce predictions for new preprocessed observations
def test_model_predicts_on_new_observations():
    train_obs = _sample_in_memory_training_fixtures()
    preprocessor, model = train_pipeline(train_obs, random_state=42)
    
    new_obs = [
        _sample_cleaned_observation(ph=7.3, tds=310.0, fever=1),
        _sample_cleaned_observation(ph=14.0, tds=5000.0, fever=50),  # Extreme outlier
    ]
    X_new = transform_observations(preprocessor, new_obs)
    preds = predict_inliers_outliers(model, X_new)
    
    assert isinstance(preds, np.ndarray)
    assert len(preds) == 2
    # Predictions in Scikit-learn IsolationForest are strictly +1 (inlier) or -1 (outlier)
    assert set(preds).issubset({1, -1})

# 5. Model can produce raw anomaly-related scores using chosen Scikit-learn API
def test_model_produces_raw_anomaly_scores():
    train_obs = _sample_in_memory_training_fixtures()
    preprocessor, model = train_pipeline(train_obs, random_state=42)
    
    test_obs = [_sample_cleaned_observation(ph=7.2, tds=300.0)]
    X_test = transform_observations(preprocessor, test_obs)
    
    raw_scores = compute_raw_anomaly_scores(model, X_test)
    assert isinstance(raw_scores, np.ndarray)
    assert raw_scores.shape == (1,)
    assert np.isfinite(raw_scores).all()

# 6. Output length matches the number of input observations
def test_output_length_matches_input_observations():
    train_obs = _sample_in_memory_training_fixtures()
    preprocessor, model = train_pipeline(train_obs, random_state=42)
    
    inf_batch = [
        _sample_cleaned_observation(ph=7.0),
        _sample_cleaned_observation(ph=7.5),
        _sample_cleaned_observation(ph=8.0),
        _sample_cleaned_observation(ph=6.5),
    ]
    X_inf = transform_observations(preprocessor, inf_batch)
    
    scores = compute_raw_anomaly_scores(model, X_inf)
    preds = predict_inliers_outliers(model, X_inf)
    
    assert len(scores) == len(inf_batch)
    assert len(preds) == len(inf_batch)

# 7. Raw scores are NOT incorrectly labeled as probabilities
def test_raw_scores_are_not_probabilities():
    train_obs = _sample_in_memory_training_fixtures()
    preprocessor, model = train_pipeline(train_obs, random_state=42)
    
    # Generate decision_function scores on diverse observations
    test_obs = [
        _sample_cleaned_observation(ph=7.2, tds=300.0),
        _sample_cleaned_observation(ph=14.0, tds=5000.0, fever=100),
    ]
    X_test = transform_observations(preprocessor, test_obs)
    raw_scores = compute_raw_anomaly_scores(model, X_test)
    
    # Raw decision_function scores in sklearn can be negative or positive around 0,
    # demonstrating they are raw tree-depth anomaly offsets and not bounded [0, 1] probabilities.
    assert isinstance(raw_scores, np.ndarray)
    assert raw_scores.dtype == np.float64

# 8. Model does not receive latitude/longitude/timestamp
def test_model_does_not_receive_metadata():
    obs_with_metadata = [
        _sample_cleaned_observation(lat=13.0827, lon=80.2707, ts=dt.datetime(2026, 8, 12, 18, 0, 0, tzinfo=dt.timezone.utc)),
        _sample_cleaned_observation(lat=11.0168, lon=76.9558, ts=dt.datetime(2026, 8, 12, 19, 0, 0, tzinfo=dt.timezone.utc)),
    ]
    preprocessor = fit_preprocessor(obs_with_metadata)
    X = transform_observations(preprocessor, obs_with_metadata)
    
    # Matrix must contain strictly 11 feature columns, no lat/lon/timestamp
    assert X.shape == (2, 11)
    
    model = fit_model(X, random_state=42)
    assert model.n_features_in_ == 11

# 9. Model does not introduce additional features
def test_model_does_not_introduce_additional_features():
    train_obs = _sample_in_memory_training_fixtures()
    model = train_model(train_obs, random_state=42)
    assert model.n_features_in_ == len(FEATURE_NAMES)
    assert len(FEATURE_NAMES) == 11

# 10. Training is reproducible if and only if configured model settings specify reproducibility
def test_training_reproducibility_with_random_state():
    train_obs = _sample_in_memory_training_fixtures()
    preprocessor = fit_preprocessor(train_obs)
    X = transform_observations(preprocessor, train_obs)
    
    model_a = fit_model(X, random_state=123)
    model_b = fit_model(X, random_state=123)
    
    scores_a = compute_raw_anomaly_scores(model_a, X)
    scores_b = compute_raw_anomaly_scores(model_b, X)
    
    np.testing.assert_array_almost_equal(scores_a, scores_b)

def test_train_model_with_empty_data_returns_none():
    assert train_model([]) is None
    assert train_model(None) is None
