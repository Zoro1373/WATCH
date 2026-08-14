import datetime as dt
import numpy as np
import pandas as pd
import pytest
from ml.pipeline import (
    FEATURE_NAMES,
    extract_features,
    build_preprocessor,
    fit_preprocessor,
    transform_observations,
    fit_transform_observations,
)

EXPECTED_11_FEATURES = [
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

def _sample_training_dataset():
    return [
        _sample_cleaned_observation(ph=7.0, tds=200.0, turbidity=2.0, water_temp=22.0, fever=0, diarrhea=0, vomiting=0, abd_pain=0, weather_temp=25.0, precip=0.0, humidity=60.0),
        _sample_cleaned_observation(ph=7.5, tds=350.0, turbidity=4.0, water_temp=26.0, fever=2, diarrhea=1, vomiting=0, abd_pain=0, weather_temp=30.0, precip=5.0, humidity=80.0),
        _sample_cleaned_observation(ph=8.0, tds=500.0, turbidity=6.0, water_temp=28.0, fever=5, diarrhea=3, vomiting=2, abd_pain=1, weather_temp=32.0, precip=10.0, humidity=85.0),
        _sample_cleaned_observation(ph=6.8, tds=150.0, turbidity=1.5, water_temp=20.0, fever=0, diarrhea=0, vomiting=0, abd_pain=0, weather_temp=22.0, precip=0.0, humidity=50.0),
    ]

# 1. All 11 approved features are extracted
def test_all_11_features_extracted():
    obs = [_sample_cleaned_observation()]
    df = extract_features(obs)
    assert isinstance(df, pd.DataFrame)
    assert list(df.columns) == EXPECTED_11_FEATURES

# 2. Feature order is exactly deterministic
def test_feature_order_is_deterministic():
    assert FEATURE_NAMES == EXPECTED_11_FEATURES
    obs = [_sample_cleaned_observation()]
    df = extract_features(obs)
    for i, name in enumerate(EXPECTED_11_FEATURES):
        assert df.columns[i] == name

# 3. Latitude is not included
def test_latitude_not_included():
    assert "latitude" not in FEATURE_NAMES
    obs = [_sample_cleaned_observation(lat=12.34)]
    df = extract_features(obs)
    assert "latitude" not in df.columns

# 4. Longitude is not included
def test_longitude_not_included():
    assert "longitude" not in FEATURE_NAMES
    obs = [_sample_cleaned_observation(lon=56.78)]
    df = extract_features(obs)
    assert "longitude" not in df.columns

# 5. Timestamp is not included
def test_timestamp_not_included():
    assert "timestamp" not in FEATURE_NAMES
    obs = [_sample_cleaned_observation()]
    df = extract_features(obs)
    assert "timestamp" not in df.columns

# 6. No extra ML features are included
def test_no_extra_features_included():
    obs = [{
        "location": {"latitude": 8.0, "longitude": 77.0},
        "timestamp": dt.datetime.now(dt.timezone.utc),
        "water": {"ph": 7.0, "tds": 200, "turbidity": 2.0, "temperature": 25.0, "extraWater": 999},
        "symptoms": {"feverCount": 1, "diarrheaCount": 0, "vomitingCount": 0, "abdominalPainCount": 0, "symptomRate": 0.5},
        "weather": {"temperature": 30.0, "precipitation": 0.0, "humidity": 70.0, "windSpeed": 15.0},
        "extraRootField": "unwanted",
    }]
    df = extract_features(obs)
    assert len(df.columns) == 11
    assert set(df.columns) == set(EXPECTED_11_FEATURES)

# 7. Missing values are handled by the preprocessing pipeline
def test_missing_values_handled_by_preprocessing_pipeline():
    train_obs = [
        _sample_cleaned_observation(ph=7.0, tds=200, turbidity=2.0),
        _sample_cleaned_observation(ph=8.0, tds=400, turbidity=4.0),
        _sample_cleaned_observation(ph=None, tds=300, turbidity=None),
    ]
    preprocessor = fit_preprocessor(train_obs)
    
    # Inference observation with several missing fields
    inf_obs = [_sample_cleaned_observation(ph=None, tds=None, turbidity=None, fever=None)]
    X_inf = transform_observations(preprocessor, inf_obs)
    
    assert X_inf.shape == (1, 11)
    assert not np.isnan(X_inf).any()

# 8. Transformed output is numeric
def test_transformed_output_is_numeric():
    train_obs = _sample_training_dataset()
    preprocessor, X_trans = fit_transform_observations(train_obs)
    assert isinstance(X_trans, np.ndarray)
    assert np.issubdtype(X_trans.dtype, np.floating)
    assert np.isfinite(X_trans).all()

# 9. Transformed matrix has exactly 11 columns
def test_transformed_matrix_has_11_columns():
    train_obs = _sample_training_dataset()
    preprocessor = fit_preprocessor(train_obs)
    X_trans = transform_observations(preprocessor, train_obs)
    assert X_trans.shape == (len(train_obs), 11)

# 10. Preprocessing object can be fitted on training observations
def test_preprocessor_can_be_fitted_on_training_observations():
    train_obs = _sample_training_dataset()
    preprocessor = fit_preprocessor(train_obs)
    assert hasattr(preprocessor.named_steps["imputer"], "statistics_")
    assert hasattr(preprocessor.named_steps["scaler"], "mean_")
    assert hasattr(preprocessor.named_steps["scaler"], "scale_")
    assert len(preprocessor.named_steps["imputer"].statistics_) == 11

# 11. The SAME fitted preprocessing object can transform separate inference observations
def test_same_fitted_preprocessor_transforms_separate_inference_observations():
    train_obs = _sample_training_dataset()
    preprocessor = fit_preprocessor(train_obs)
    
    inf_obs_1 = [_sample_cleaned_observation(ph=7.1, tds=210.0)]
    inf_obs_2 = [_sample_cleaned_observation(ph=8.2, tds=480.0)]
    
    X_1 = transform_observations(preprocessor, inf_obs_1)
    X_2 = transform_observations(preprocessor, inf_obs_2)
    
    assert X_1.shape == (1, 11)
    assert X_2.shape == (1, 11)
    assert not np.array_equal(X_1, X_2)

# 12. Preprocessing object does not refit itself during inference
def test_preprocessor_does_not_refit_during_inference():
    train_obs = _sample_training_dataset()
    preprocessor = fit_preprocessor(train_obs)
    
    imputer_stats_before = preprocessor.named_steps["imputer"].statistics_.copy()
    scaler_mean_before = preprocessor.named_steps["scaler"].mean_.copy()
    scaler_scale_before = preprocessor.named_steps["scaler"].scale_.copy()
    
    # Run multiple inference batches with extreme values
    extreme_obs = [
        _sample_cleaned_observation(ph=14.0, tds=5000.0, fever=100),
        _sample_cleaned_observation(ph=0.0, tds=0.0, fever=0),
    ]
    _ = transform_observations(preprocessor, extreme_obs)
    
    np.testing.assert_array_equal(preprocessor.named_steps["imputer"].statistics_, imputer_stats_before)
    np.testing.assert_array_equal(preprocessor.named_steps["scaler"].mean_, scaler_mean_before)
    np.testing.assert_array_equal(preprocessor.named_steps["scaler"].scale_, scaler_scale_before)

# 13. Training data and inference data with different distributions still use the same fitted transformation
def test_different_distribution_inference_uses_same_fitted_transformation():
    train_obs = _sample_training_dataset()
    preprocessor = fit_preprocessor(train_obs)
    
    # Known training mean and scale for 'ph'
    ph_idx = FEATURE_NAMES.index("ph")
    ph_mean = preprocessor.named_steps["scaler"].mean_[ph_idx]
    ph_scale = preprocessor.named_steps["scaler"].scale_[ph_idx]
    
    # Inference with specific pH value
    test_ph = 9.0
    inf_obs = [_sample_cleaned_observation(ph=test_ph)]
    X_inf = transform_observations(preprocessor, inf_obs)
    
    expected_ph_scaled = (test_ph - ph_mean) / ph_scale
    np.testing.assert_almost_equal(X_inf[0, ph_idx], expected_ph_scaled)

# 14. Fully populated valid observation transforms successfully
def test_fully_populated_valid_observation_transforms():
    train_obs = _sample_training_dataset()
    preprocessor = fit_preprocessor(train_obs)
    
    obs = [_sample_cleaned_observation(
        ph=7.2, tds=280.0, turbidity=3.0, water_temp=24.5,
        fever=1, diarrhea=1, vomiting=0, abd_pain=0,
        weather_temp=27.0, precip=2.0, humidity=65.0
    )]
    X_out = transform_observations(preprocessor, obs)
    assert X_out.shape == (1, 11)
    assert np.isfinite(X_out).all()

# 15. Multiple observations transform successfully
def test_multiple_observations_transform_successfully():
    train_obs = _sample_training_dataset()
    preprocessor = fit_preprocessor(train_obs)
    
    batch = [
        _sample_cleaned_observation(ph=7.0),
        _sample_cleaned_observation(ph=None),
        _sample_cleaned_observation(tds=None, turbidity=None),
        _sample_cleaned_observation(fever=3, diarrhea=2),
        _sample_cleaned_observation(weather_temp=35.0, precip=20.0),
    ]
    X_batch = transform_observations(preprocessor, batch)
    assert X_batch.shape == (5, 11)
    assert np.isfinite(X_batch).all()

# 16. Build unfitted preprocessor structure
def test_build_preprocessor():
    p = build_preprocessor()
    assert list(p.named_steps.keys()) == ["imputer", "scaler"]
    assert p.named_steps["imputer"].strategy == "median"
    assert p.named_steps["imputer"].keep_empty_features is True

# 17. Edge Case 1: Train with one complete feature column entirely None/NaN
def test_train_with_entirely_missing_feature_column_retains_11_columns():
    # Training dataset where 'precipitation' is completely None across all records
    train_obs = [
        _sample_cleaned_observation(ph=7.0, tds=200.0, precip=None),
        _sample_cleaned_observation(ph=7.5, tds=300.0, precip=None),
        _sample_cleaned_observation(ph=8.0, tds=400.0, precip=None),
    ]
    preprocessor = fit_preprocessor(train_obs)
    X_train = transform_observations(preprocessor, train_obs)
    
    assert X_train.shape == (3, 11)
    assert np.isfinite(X_train).all()

# 18. Edge Case 2: Transform an inference observation where that same feature is missing
def test_inference_with_entirely_missing_feature_retains_11_columns():
    # Fit on training data with 'precipitation' completely missing
    train_obs = [
        _sample_cleaned_observation(ph=7.0, tds=200.0, precip=None),
        _sample_cleaned_observation(ph=7.5, tds=300.0, precip=None),
    ]
    preprocessor = fit_preprocessor(train_obs)
    
    # Inference observation with precipitation missing
    inf_obs = [_sample_cleaned_observation(ph=7.2, tds=250.0, precip=None)]
    X_inf = transform_observations(preprocessor, inf_obs)
    
    assert X_inf.shape == (1, 11)
    assert np.isfinite(X_inf).all()

# 19. Edge Case 3: Verify the feature order remains exactly FEATURE_NAMES
def test_feature_order_remains_exact_feature_names_with_missing_columns():
    train_obs = [
        _sample_cleaned_observation(ph=None, precip=None, turbidity=None),
        _sample_cleaned_observation(ph=None, precip=None, turbidity=None),
    ]
    df_raw = extract_features(train_obs)
    assert list(df_raw.columns) == FEATURE_NAMES
    
    preprocessor = fit_preprocessor(train_obs)
    X_trans = transform_observations(preprocessor, train_obs)
    assert X_trans.shape == (2, len(FEATURE_NAMES))
    assert len(FEATURE_NAMES) == 11
