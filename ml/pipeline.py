"""Machine learning pipeline skeleton for WaterGuard AI.

This module provides placeholder functions that will later be
implemented to load data from MongoDB, preprocess it, train an
IsolationForest model, and generate risk scores.

The MVP specifications (inputs, outputs) are defined in
`AI_ML_SPEC.md`.  No actual model logic is implemented in this
foundation step.
"""

import datetime as _dt
import logging
import os
from pathlib import Path
import pickle
from typing import Dict, List, Any, Tuple
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest

# Standard Python logger for ML pipeline
logger = logging.getLogger("ml.pipeline")

# Placeholder type for a model; will be replaced with actual IsolationForest instance.
Model = Any

DEFAULT_MODEL_VERSION: str = "v1.0"

FEATURE_NAMES: List[str] = [
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

DEFAULT_LOW_THRESHOLD: float = 0.4
DEFAULT_HIGH_THRESHOLD: float = 0.7
RISK_LEVEL_LOW: str = "LOW"
RISK_LEVEL_MEDIUM: str = "MEDIUM"
RISK_LEVEL_HIGH: str = "HIGH"
RISK_LEVELS: List[str] = [RISK_LEVEL_LOW, RISK_LEVEL_MEDIUM, RISK_LEVEL_HIGH]

def _format_location_summary(obs: Any, index: int | None = None) -> str:
    """Format a safe, non-sensitive summary of location for logging.

    Excludes any credentials, secrets, or API keys.
    """
    idx_str = f"index={index}, " if index is not None else ""
    if not isinstance(obs, dict):
        return f"[{idx_str}invalid observation type: {type(obs).__name__}]"

    loc = obs.get("location")
    if isinstance(loc, dict):
        lat = loc.get("latitude")
        lon = loc.get("longitude")
        if lat is not None or lon is not None:
            return f"[{idx_str}latitude={lat}, longitude={lon}]"
    node_id = obs.get("nodeId") or obs.get("node_id")
    if node_id:
        return f"[{idx_str}nodeId={node_id}]"
    return f"[{idx_str}unspecified location]"

def _to_utc(ts: Any) -> _dt.datetime | None:
    """Normalize a timestamp value (string or datetime) to a timezone-aware UTC datetime.

    Supports:
    - UTC ISO strings (e.g. '2026-08-12T12:00:00+00:00')
    - Trailing 'Z' (e.g. '2026-08-12T12:00:00Z')
    - Explicit timezone offsets (e.g. '+05:30', '-04:00')
    - Naive ISO strings (treated as UTC per convention)
    - Aware datetime objects (converted to UTC)
    - Naive datetime objects (treated as UTC per convention)

    Returns None for missing, malformed, or invalid types.
    """
    if isinstance(ts, str):
        try:
            s = ts.strip()
            if s.endswith('Z') or s.endswith('z'):
                ts_clean = s[:-1] + '+00:00'
            else:
                ts_clean = s
            dt = _dt.datetime.fromisoformat(ts_clean)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=_dt.timezone.utc)
            else:
                dt = dt.astimezone(_dt.timezone.utc)
            return dt
        except Exception:
            return None
    if isinstance(ts, _dt.datetime):
        if ts.tzinfo is None:
            return ts.replace(tzinfo=_dt.timezone.utc)
        return ts.astimezone(_dt.timezone.utc)
    return None

def load_data() -> List[Dict[str, Any]]:
    """Load raw records from MongoDB.

    Returns a list of dictionaries, each containing the combined
    water, symptom, and weather features as specified in the spec.
    Actual implementation will use pymongo; here we return an empty list
    as a stub.
    """
    # TODO: implement MongoDB retrieval
    return []

def extract_features(observations: List[Dict[str, Any]]) -> pd.DataFrame:
    """Extract the approved 11 ML features from cleaned observations.

    Flattens nested structures ('water', 'symptoms', 'weather') into the
    exact deterministic 11-feature format, excluding metadata fields
    (location, timestamp).

    Feature Order:
    1. ph
    2. tds
    3. turbidity
    4. water_temperature
    5. feverCount
    6. diarrheaCount
    7. vomitingCount
    8. abdominalPainCount
    9. weather_temperature
    10. precipitation
    11. humidity

    Parameters
    ----------
    observations : list of dict
        Cleaned observation records (output of validate_and_clean).

    Returns
    -------
    pandas.DataFrame
        DataFrame with columns matching FEATURE_NAMES in exact order,
        with missing/null values represented as NaN.
    """
    rows = []
    for obs in observations:
        water = obs.get("water") if isinstance(obs.get("water"), dict) else {}
        symptoms = obs.get("symptoms") if isinstance(obs.get("symptoms"), dict) else {}
        weather = obs.get("weather") if isinstance(obs.get("weather"), dict) else {}

        row = {
            "ph": water.get("ph") if "ph" in water else obs.get("ph"),
            "tds": water.get("tds") if "tds" in water else obs.get("tds"),
            "turbidity": water.get("turbidity") if "turbidity" in water else obs.get("turbidity"),
            "water_temperature": water.get("temperature") if "temperature" in water else obs.get("water_temperature"),
            "feverCount": symptoms.get("feverCount") if "feverCount" in symptoms else obs.get("feverCount"),
            "diarrheaCount": symptoms.get("diarrheaCount") if "diarrheaCount" in symptoms else obs.get("diarrheaCount"),
            "vomitingCount": symptoms.get("vomitingCount") if "vomitingCount" in symptoms else obs.get("vomitingCount"),
            "abdominalPainCount": symptoms.get("abdominalPainCount") if "abdominalPainCount" in symptoms else obs.get("abdominalPainCount"),
            "weather_temperature": weather.get("temperature") if "temperature" in weather else obs.get("weather_temperature"),
            "precipitation": weather.get("precipitation") if "precipitation" in weather else obs.get("precipitation"),
            "humidity": weather.get("humidity") if "humidity" in weather else obs.get("humidity"),
        }
        rows.append(row)

    if not rows:
        return pd.DataFrame(columns=FEATURE_NAMES, dtype=float)

    df = pd.DataFrame(rows, columns=FEATURE_NAMES)
    return df.astype(float)

def build_preprocessor() -> Pipeline:
    """Build an unfitted Scikit-learn preprocessing pipeline.

    The pipeline encapsulates:
    1. 'imputer': SimpleImputer(strategy='median', keep_empty_features=True)
       - Imputes missing numeric values using column medians computed from training data.
       - Retains entirely missing feature columns (keep_empty_features=True) to preserve
         the deterministic 11-feature matrix contract.
    2. 'scaler': StandardScaler()
       - Standardizes features by removing the mean and scaling to unit variance.

    Returns
    -------
    sklearn.pipeline.Pipeline
        Unfitted Scikit-learn Pipeline instance.
    """
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
        ("scaler", StandardScaler()),
    ])

def fit_preprocessor(observations: List[Dict[str, Any]]) -> Pipeline:
    """Fit a new preprocessing pipeline on training observations.

    Parameters
    ----------
    observations : list of dict
        Cleaned training observations (from validate_and_clean).

    Returns
    -------
    sklearn.pipeline.Pipeline
        Fitted Scikit-learn Pipeline instance ready for transforming training
        or inference observations.
    """
    X = extract_features(observations)
    preprocessor = build_preprocessor()
    preprocessor.fit(X)
    return preprocessor

def transform_observations(
    preprocessor: Pipeline,
    observations: List[Dict[str, Any]],
) -> np.ndarray:
    """Transform observations using a previously fitted preprocessing pipeline.

    Extracts the 11 approved features and applies the fitted imputer and scaler.
    Does NOT refit or modify the preprocessor state, preventing data leakage.

    Parameters
    ----------
    preprocessor : sklearn.pipeline.Pipeline
        A fitted Scikit-learn Pipeline.
    observations : list of dict
        Cleaned observation records (from validate_and_clean).

    Returns
    -------
    numpy.ndarray
        Transformed numeric 2D feature matrix of shape (N, 11) with dtype float64.
    """
    X = extract_features(observations)
    return preprocessor.transform(X)

def fit_transform_observations(
    observations: List[Dict[str, Any]],
) -> Tuple[Pipeline, np.ndarray]:
    """Fit a preprocessing pipeline on training observations and transform them.

    Parameters
    ----------
    observations : list of dict
        Cleaned training observations.

    Returns
    -------
    tuple of (Pipeline, numpy.ndarray)
        Fitted pipeline and transformed numeric feature matrix.
    """
    preprocessor = fit_preprocessor(observations)
    X_transformed = transform_observations(preprocessor, observations)
    return preprocessor, X_transformed

def preprocess(records: List[Dict[str, Any]]) -> pd.DataFrame:
    """Validate and preprocess raw records into a DataFrame ready for model input.

    Parameters
    ----------
    records : list of dict
        Observation records.

    Returns
    -------
    pandas.DataFrame
        DataFrame with columns matching FEATURE_NAMES.
    """
    return extract_features(records)

def build_model(random_state: int | None = None) -> IsolationForest:
    """Build an unfitted IsolationForest model.

    Configuration:
    - Uses Scikit-learn safe defaults for all unspecified parameters:
      - n_estimators=100
      - max_samples='auto'
      - contamination='auto'
      - max_features=1.0
      - bootstrap=False
    - random_state: optional int for reproducibility testing (defaults to None).

    Parameters
    ----------
    random_state : int, optional
        Random seed for reproducibility if specified. Defaults to None.

    Returns
    -------
    sklearn.ensemble.IsolationForest
        Unfitted Isolation Forest instance.
    """
    return IsolationForest(random_state=random_state)

def fit_model(X: Any, random_state: int | None = None) -> IsolationForest:
    """Fit an IsolationForest model on a preprocessed 11-feature matrix.

    Parameters
    ----------
    X : array-like of shape (n_samples, 11)
        Numeric preprocessed feature matrix.
    random_state : int, optional
        Random seed for reproducibility if specified.

    Returns
    -------
    sklearn.ensemble.IsolationForest
        Fitted Isolation Forest model.
    """
    model = build_model(random_state=random_state)
    model.fit(X)
    return model

def train_pipeline(
    observations: List[Dict[str, Any]],
    random_state: int | None = None,
) -> Tuple[Pipeline, IsolationForest]:
    """Fit both preprocessing pipeline and Isolation Forest on training observations.

    Parameters
    ----------
    observations : list of dict
        Cleaned observation records (from validate_and_clean).
    random_state : int, optional
        Random seed for Isolation Forest.

    Returns
    -------
    tuple of (Pipeline, IsolationForest)
        The fitted preprocessor and the fitted Isolation Forest model.
    """
    preprocessor = fit_preprocessor(observations)
    X_train = transform_observations(preprocessor, observations)
    model = fit_model(X_train, random_state=random_state)
    return preprocessor, model

def train_model(data: Any, random_state: int | None = None) -> IsolationForest | None:
    """Train an Isolation Forest model on training data.

    Parameters
    ----------
    data : list of dict, pandas.DataFrame, or numpy.ndarray
        Training observations or preprocessed feature matrix.
        If empty, returns None.
    random_state : int, optional
        Random seed for reproducibility if specified. Defaults to None.

    Returns
    -------
    sklearn.ensemble.IsolationForest or None
        Fitted Isolation Forest model instance, or None if data is empty.
    """
    if data is None or (isinstance(data, (list, tuple, np.ndarray, pd.DataFrame)) and len(data) == 0):
        return None

    if isinstance(data, list):
        preprocessor = fit_preprocessor(data)
        X = transform_observations(preprocessor, data)
    elif isinstance(data, pd.DataFrame):
        X = data.values
    else:
        X = data

    return fit_model(X, random_state=random_state)

def compute_raw_anomaly_scores(model: IsolationForest, X: np.ndarray) -> np.ndarray:
    """Compute raw decision function anomaly scores from a fitted Isolation Forest.

    Parameters
    ----------
    model : sklearn.ensemble.IsolationForest
        Fitted IsolationForest model.
    X : numpy.ndarray of shape (n_samples, 11)
        Numeric preprocessed feature matrix.

    Returns
    -------
    numpy.ndarray of shape (n_samples,)
        Raw decision_function values from IsolationForest.
        In Scikit-learn semantics:
        - Negative values indicate anomalies / outliers.
        - Positive values indicate inliers.
        NOTE: This raw score is NOT a medical probability, NOT a health risk score,
        and NOT an outbreak prediction.
    """
    return model.decision_function(X)

def predict_inliers_outliers(model: IsolationForest, X: np.ndarray) -> np.ndarray:
    """Predict inlier (+1) vs outlier (-1) indicators using Isolation Forest.

    Parameters
    ----------
    model : sklearn.ensemble.IsolationForest
        Fitted IsolationForest model.
    X : numpy.ndarray of shape (n_samples, 11)
        Numeric preprocessed feature matrix.

    Returns
    -------
    numpy.ndarray of shape (n_samples,)
        Array of +1 (inliers) and -1 (outliers/anomalies).
        NOTE: This is a mathematical outlier indicator, NOT an operational risk level.
    """
    return model.predict(X)

def time_aware_split(
    observations: List[Dict[str, Any]],
    validation_fraction: float = 0.2,
    split_time: Any = None,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Split observations chronologically into training and validation sets.

    Requirements:
    - Sorts observations chronologically by their normalized UTC timestamp.
    - Earlier observations are assigned to training; later observations to validation.
    - Never shuffles observations, strictly preventing temporal data leakage.
    - Filters out observations lacking a valid timestamp without fabrication.
    - Preserves the original observation dictionaries.

    Parameters
    ----------
    observations : list of dict
        Validated observation records (from validate_and_clean).
    validation_fraction : float, default 0.2
        Fraction of recent observations allocated to the validation set.
        Default is 0.2 (conservative standard 80/20 train/validation split).
    split_time : datetime or str, optional
        Explicit cutoff timestamp (UTC). If provided, observations strictly before
        this time are training, and observations at or after are validation.
        Overrides validation_fraction.

    Returns
    -------
    tuple of (list of dict, list of dict)
        (train_observations, validation_observations)
    """
    if not observations:
        return [], []

    # Filter and pair with normalized UTC timestamp
    parsed = []
    for obs in observations:
        ts = _to_utc(obs.get("timestamp")) if isinstance(obs, dict) else None
        if ts is not None:
            parsed.append((ts, obs))

    if not parsed:
        return [], []

    # Sort chronologically by timestamp (stable Timsort)
    parsed.sort(key=lambda item: item[0])

    if split_time is not None:
        cutoff = _to_utc(split_time)
        if cutoff is None:
            raise ValueError(f"Invalid split_time provided: {split_time}")
        train_obs = [obs for ts, obs in parsed if ts < cutoff]
        val_obs = [obs for ts, obs in parsed if ts >= cutoff]
        return train_obs, val_obs

    # Fractional split
    if validation_fraction <= 0.0:
        return [item[1] for item in parsed], []
    if validation_fraction >= 1.0:
        return [], [item[1] for item in parsed]

    n_total = len(parsed)
    split_idx = int(n_total * (1.0 - validation_fraction))
    if split_idx == n_total and n_total > 1:
        split_idx = n_total - 1

    train_obs = [item[1] for item in parsed[:split_idx]]
    val_obs = [item[1] for item in parsed[split_idx:]]
    return train_obs, val_obs

def evaluate_anomaly_scores(
    model: IsolationForest,
    X: np.ndarray,
) -> Dict[str, Any]:
    """Compute empirical distribution statistics of raw anomaly scores.

    Parameters
    ----------
    model : sklearn.ensemble.IsolationForest
        Fitted IsolationForest model.
    X : numpy.ndarray of shape (n_samples, 11)
        Numeric preprocessed feature matrix.

    Returns
    -------
    dict
        Distribution statistics of raw decision_function anomaly scores:
        - 'sample_count': int
        - 'score_min': float
        - 'score_max': float
        - 'score_mean': float
        - 'score_median': float
        - 'score_std': float
        - 'score_q25': float
        - 'score_q75': float
        - 'inlier_count': int (predict == +1)
        - 'outlier_count': int (predict == -1)
        - 'outlier_fraction': float

        NOTE: These summary statistics describe the empirical distribution of
        raw isolation forest decision scores. They do NOT represent medical
        probabilities, clinical diagnoses, or supervised accuracy metrics.
    """
    if X is None or len(X) == 0:
        return {
            "sample_count": 0,
            "score_min": None,
            "score_max": None,
            "score_mean": None,
            "score_median": None,
            "score_std": None,
            "score_q25": None,
            "score_q75": None,
            "inlier_count": 0,
            "outlier_count": 0,
            "outlier_fraction": 0.0,
        }

    scores = model.decision_function(X)
    preds = model.predict(X)

    inlier_count = int(np.sum(preds == 1))
    outlier_count = int(np.sum(preds == -1))
    total_count = len(scores)

    return {
        "sample_count": total_count,
        "score_min": float(np.min(scores)),
        "score_max": float(np.max(scores)),
        "score_mean": float(np.mean(scores)),
        "score_median": float(np.median(scores)),
        "score_std": float(np.std(scores)),
        "score_q25": float(np.percentile(scores, 25)),
        "score_q75": float(np.percentile(scores, 75)),
        "inlier_count": inlier_count,
        "outlier_count": outlier_count,
        "outlier_fraction": float(outlier_count / total_count) if total_count > 0 else 0.0,
    }

def evaluate_validation_set(
    model: IsolationForest,
    preprocessor: Pipeline,
    validation_observations: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Evaluate a fitted model on validation observations without data leakage.

    Transforms validation observations using the previously fitted preprocessor,
    computes raw anomaly scores, and returns their distribution statistics.

    Parameters
    ----------
    model : sklearn.ensemble.IsolationForest
        Fitted Isolation Forest model (trained strictly on training observations).
    preprocessor : sklearn.pipeline.Pipeline
        Fitted preprocessing pipeline (fitted strictly on training observations).
    validation_observations : list of dict
        Validation observations (from time_aware_split).

    Returns
    -------
    dict
        Evaluation results dictionary containing score distribution statistics.
    """
    if not validation_observations:
        return evaluate_anomaly_scores(model, np.empty((0, len(FEATURE_NAMES))))

    X_val = transform_observations(preprocessor, validation_observations)
    return evaluate_anomaly_scores(model, X_val)

class RiskNormalizer:
    """Min-max normalizer for Isolation Forest raw anomaly decision scores.

    Learns min and max from inverted training anomaly scores (-raw_scores).
    Maps future anomaly scores monotonically into [0.0, 1.0], clamping out-of-bounds
    inference values to maintain the fixed training-based scale without data leakage.

    Parameters
    ----------
    training_min : float, default 0.0
        Minimum inverted score observed on training data.
    training_max : float, default 1.0
        Maximum inverted score observed on training data.
    """

    def __init__(self, training_min: float = 0.0, training_max: float = 1.0):
        self.training_min: float = float(training_min)
        self.training_max: float = float(training_max)

    def fit(self, raw_training_scores: Any) -> "RiskNormalizer":
        """Fit the normalizer on raw Isolation Forest decision scores from training data.

        Parameters
        ----------
        raw_training_scores : array-like
            Raw decision_function output on the training set.

        Returns
        -------
        RiskNormalizer
            Self with fitted training_min and training_max.
        """
        if raw_training_scores is None or len(raw_training_scores) == 0:
            self.training_min = 0.0
            self.training_max = 0.0
            return self

        arr = np.asarray(raw_training_scores, dtype=float)
        # Invert raw scores: higher inverted score = greater anomaly / risk
        inverted = -arr
        self.training_min = float(np.min(inverted))
        self.training_max = float(np.max(inverted))
        return self

    def transform(self, raw_scores: Any) -> np.ndarray:
        """Normalize raw anomaly scores into riskScore in [0.0, 1.0].

        Formula:
            inverted = -raw_scores
            if training_max == training_min:
                riskScore = 0.0
            else:
                riskScore = (inverted - training_min) / (training_max - training_min)
            riskScore = np.clip(riskScore, 0.0, 1.0)

        Parameters
        ----------
        raw_scores : array-like
            Raw decision_function values.

        Returns
        -------
        numpy.ndarray
            Normalized risk scores in [0.0, 1.0].
        """
        if raw_scores is None or (isinstance(raw_scores, (list, tuple, np.ndarray)) and len(raw_scores) == 0):
            return np.empty(0, dtype=float)

        arr = np.asarray(raw_scores, dtype=float)
        inverted = -arr

        if self.training_max == self.training_min:
            # Constant-score edge case: map to neutral deterministic 0.0
            return np.zeros_like(inverted, dtype=float)

        normalized = (inverted - self.training_min) / (self.training_max - self.training_min)
        return np.clip(normalized, 0.0, 1.0)

    def to_dict(self) -> Dict[str, float]:
        """Serialize normalizer parameters as a dictionary."""
        return {
            "training_min": self.training_min,
            "training_max": self.training_max,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RiskNormalizer":
        """Reconstruct a RiskNormalizer from a dictionary."""
        return cls(
            training_min=data.get("training_min", 0.0),
            training_max=data.get("training_max", 1.0),
        )


def fit_risk_normalizer(raw_training_scores: Any) -> RiskNormalizer:
    """Fit a RiskNormalizer on raw Isolation Forest decision scores from training data.

    Parameters
    ----------
    raw_training_scores : array-like
        Raw decision_function output on the training set.

    Returns
    -------
    RiskNormalizer
        Fitted normalizer with training_min and training_max.
    """
    normalizer = RiskNormalizer()
    normalizer.fit(raw_training_scores)
    return normalizer


def normalize_risk_scores(
    raw_scores: Any,
    normalizer: RiskNormalizer | Dict[str, Any],
) -> np.ndarray:
    """Normalize raw anomaly scores into operational riskScore in [0.0, 1.0].

    Parameters
    ----------
    raw_scores : array-like
        Raw decision_function values.
    normalizer : RiskNormalizer or dict
        Fitted normalizer containing training_min and training_max.

    Returns
    -------
    numpy.ndarray
        Array of riskScore values in [0.0, 1.0].
    """
    if isinstance(normalizer, dict):
        norm_obj = RiskNormalizer.from_dict(normalizer)
        return norm_obj.transform(raw_scores)
    return normalizer.transform(raw_scores)


def compute_risk_scores(
    model: IsolationForest,
    normalizer: RiskNormalizer | Dict[str, Any],
    X: np.ndarray,
) -> np.ndarray:
    """Compute normalized riskScore values [0.0, 1.0] for a preprocessed feature matrix.

    Parameters
    ----------
    model : sklearn.ensemble.IsolationForest
        Fitted IsolationForest model.
    normalizer : RiskNormalizer or dict
        Fitted RiskNormalizer instance.
    X : numpy.ndarray of shape (n_samples, 11)
        Numeric preprocessed feature matrix.

    Returns
    -------
    numpy.ndarray of shape (n_samples,)
        Normalized riskScore values in [0.0, 1.0].
    """
    raw_scores = compute_raw_anomaly_scores(model, X)
    return normalize_risk_scores(raw_scores, normalizer)


def score_observations_to_risk(
    preprocessor: Pipeline,
    model: IsolationForest,
    normalizer: RiskNormalizer | Dict[str, Any],
    observations: List[Dict[str, Any]],
) -> np.ndarray:
    """Transform cleaned observations and compute normalized risk scores [0.0, 1.0].

    Parameters
    ----------
    preprocessor : sklearn.pipeline.Pipeline
        Fitted preprocessing pipeline.
    model : sklearn.ensemble.IsolationForest
        Fitted Isolation Forest model.
    normalizer : RiskNormalizer or dict
        Fitted RiskNormalizer instance.
    observations : list of dict
        Cleaned observation records.

    Returns
    -------
    numpy.ndarray of shape (n_samples,)
        Normalized risk scores in [0.0, 1.0].
    """
    if not observations:
        return np.empty(0, dtype=float)
    X = transform_observations(preprocessor, observations)
    return compute_risk_scores(model, normalizer, X)


def train_pipeline_with_normalizer(
    observations: List[Dict[str, Any]],
    random_state: int | None = None,
) -> Tuple[Pipeline, IsolationForest, RiskNormalizer]:
    """Fit preprocessing pipeline, Isolation Forest, and RiskNormalizer on training observations.

    Parameters
    ----------
    observations : list of dict
        Cleaned observation records (from validate_and_clean).
    random_state : int, optional
        Random seed for Isolation Forest.

    Returns
    -------
    tuple of (Pipeline, IsolationForest, RiskNormalizer)
        The fitted preprocessor, fitted Isolation Forest model, and fitted risk normalizer.
    """
    preprocessor = fit_preprocessor(observations)
    X_train = transform_observations(preprocessor, observations)
    model = fit_model(X_train, random_state=random_state)
    raw_train_scores = compute_raw_anomaly_scores(model, X_train)
    normalizer = fit_risk_normalizer(raw_train_scores)
    return preprocessor, model, normalizer


def train_and_evaluate(
    observations: List[Dict[str, Any]],
    validation_fraction: float = 0.2,
    random_state: int | None = None,
) -> Dict[str, Any]:
    """Execute end-to-end time-aware training and validation evaluation.

    Flow:
    1. Time-aware split: historical observations -> train_set, val_set.
    2. Fit preprocessing on train_set only.
    3. Transform train_set with fitted preprocessor.
    4. Fit Isolation Forest on transformed train_set.
    5. Fit RiskNormalizer on inverted raw training decision scores.
    6. Transform val_set with the SAME fitted preprocessor (zero leakage).
    7. Compute validation raw scores and normalize to riskScore using the training normalizer.
    8. Evaluate anomaly score distribution on val_set.

    Parameters
    ----------
    observations : list of dict
        Validated historical observation records.
    validation_fraction : float, default 0.2
        Fraction of recent observations allocated to validation.
    random_state : int, optional
        Random seed for Isolation Forest.

    Returns
    -------
    dict
        Dictionary containing:
        - 'preprocessor': fitted Pipeline
        - 'model': fitted IsolationForest
        - 'normalizer': fitted RiskNormalizer
        - 'train_count': int
        - 'validation_count': int
        - 'train_metrics': dict (distribution statistics on train set)
        - 'validation_metrics': dict (distribution statistics on validation set)
        - 'train_risk_scores': numpy.ndarray (normalized riskScore on train set)
        - 'validation_risk_scores': numpy.ndarray (normalized riskScore on validation set)
    """
    train_obs, val_obs = time_aware_split(observations, validation_fraction=validation_fraction)

    preprocessor, model = train_pipeline(train_obs, random_state=random_state)
    X_train = transform_observations(preprocessor, train_obs)

    raw_train_scores = compute_raw_anomaly_scores(model, X_train)
    normalizer = fit_risk_normalizer(raw_train_scores)
    train_risk_scores = normalize_risk_scores(raw_train_scores, normalizer)

    train_metrics = evaluate_anomaly_scores(model, X_train)
    val_metrics = evaluate_validation_set(model, preprocessor, val_obs)

    if val_obs:
        X_val = transform_observations(preprocessor, val_obs)
        raw_val_scores = compute_raw_anomaly_scores(model, X_val)
        val_risk_scores = normalize_risk_scores(raw_val_scores, normalizer)
    else:
        val_risk_scores = np.empty(0, dtype=float)

    return {
        "preprocessor": preprocessor,
        "model": model,
        "normalizer": normalizer,
        "train_count": len(train_obs),
        "validation_count": len(val_obs),
        "train_metrics": train_metrics,
        "validation_metrics": val_metrics,
        "train_risk_scores": train_risk_scores,
        "validation_risk_scores": val_risk_scores,
    }

def classify_risk_level(
    risk_score: Any,
    low_threshold: float = DEFAULT_LOW_THRESHOLD,
    high_threshold: float = DEFAULT_HIGH_THRESHOLD,
) -> str | None:
    """Classify a normalized riskScore into an operational risk level ('LOW', 'MEDIUM', 'HIGH').

    Threshold policy (from AI_ML_SPEC.md Section 11 & 12):
    - LOW: riskScore < low_threshold (default: < 0.4)
    - MEDIUM: low_threshold <= riskScore < high_threshold (default: 0.4 <= riskScore < 0.7)
    - HIGH: riskScore >= high_threshold (default: >= 0.7)

    Boundary behavior:
    - riskScore < low_threshold: "LOW"
    - riskScore == low_threshold: "MEDIUM"
    - low_threshold < riskScore < high_threshold: "MEDIUM"
    - riskScore == high_threshold: "HIGH"
    - riskScore > high_threshold: "HIGH"

    Invalid input behavior:
    - If risk_score is None, boolean, NaN, Infinite, non-numeric, or malformed:
      returns None without fabricating a risk category.
    - Floating point values slightly out of bounds (e.g. -1e-7 or 1.0000001) are clamped to [0.0, 1.0].

    Parameters
    ----------
    risk_score : float or int
        Normalized risk score in [0.0, 1.0].
    low_threshold : float, default 0.4
        Upper bound for LOW category (exclusive).
    high_threshold : float, default 0.7
        Lower bound for HIGH category (inclusive).

    Returns
    -------
    str or None
        'LOW', 'MEDIUM', 'HIGH', or None if input is invalid/missing.
    """
    if risk_score is None or isinstance(risk_score, bool):
        return None

    if not isinstance(risk_score, (int, float, np.number)):
        return None

    try:
        val = float(risk_score)
    except (ValueError, TypeError):
        return None

    if np.isnan(val) or np.isinf(val):
        return None

    # Handle slight floating-point out-of-range bounds safely
    clamped_val = max(0.0, min(1.0, val))

    if clamped_val < low_threshold:
        return RISK_LEVEL_LOW
    elif clamped_val < high_threshold:
        return RISK_LEVEL_MEDIUM
    else:
        return RISK_LEVEL_HIGH


def classify_risk_levels(
    risk_scores: Any,
    low_threshold: float = DEFAULT_LOW_THRESHOLD,
    high_threshold: float = DEFAULT_HIGH_THRESHOLD,
) -> List[str | None]:
    """Classify an iterable of riskScore values into risk levels.

    Preserves exact input ordering.

    Parameters
    ----------
    risk_scores : iterable
        Sequence of risk scores.
    low_threshold : float, default 0.4
        Upper bound for LOW category.
    high_threshold : float, default 0.7
        Lower bound for HIGH category.

    Returns
    -------
    list of (str or None)
        List of risk levels corresponding to each input risk score.
    """
    if risk_scores is None:
        return []
    return [
        classify_risk_level(s, low_threshold=low_threshold, high_threshold=high_threshold)
        for s in risk_scores
    ]


DEFAULT_FACTOR_THRESHOLDS: Dict[str, Any] = {
    # Configurable observation-based engineering heuristics (not locked ML thresholds)
    "ph_min": 6.5,
    "ph_max": 8.5,
    "tds_max": 500.0,
    "turbidity_max": 5.0,
    "water_temp_max": 35.0,
    # Symptom report indicators (any positive count indicates reported symptoms)
    "fever_count_min": 1,
    "diarrhea_count_min": 1,
    "vomiting_count_min": 1,
    "abdominal_pain_count_min": 1,
    # Weather heuristic indicators
    "weather_temp_max": 35.0,
    "precipitation_min": 5.0,
    "humidity_max": 85.0,
}

FACTOR_ABNORMAL_PH: str = "Abnormal pH"
FACTOR_ELEVATED_TDS: str = "Elevated TDS"
FACTOR_ELEVATED_TURBIDITY: str = "Elevated turbidity"
FACTOR_ELEVATED_WATER_TEMP: str = "Elevated water temperature"
FACTOR_REPORTED_FEVER: str = "Reported fever cases"
FACTOR_REPORTED_DIARRHEA: str = "Reported diarrhea cases"
FACTOR_REPORTED_VOMITING: str = "Reported vomiting cases"
FACTOR_REPORTED_ABDOMINAL_PAIN: str = "Reported abdominal pain cases"
FACTOR_ELEVATED_WEATHER_TEMP: str = "Elevated weather temperature"
FACTOR_ELEVATED_PRECIPITATION: str = "Elevated precipitation"
FACTOR_ELEVATED_HUMIDITY: str = "Elevated humidity"


def extract_contributing_factors(observation: Dict[str, Any]) -> Dict[str, Any]:
    """Extract the official schema-compliant snapshot dictionary of observed input features.

    This represents the official 'contributingFactors' object defined in
    DATABASE_SCHEMA.md Section 7 and API_CONTRACT.md Section 8.
    Excludes metadata (latitude, longitude, timestamp).
    Only non-null observed features are included.

    Parameters
    ----------
    observation : dict
        Cleaned observation record containing nested water, symptoms, weather dicts
        or flattened feature keys.

    Returns
    -------
    dict
        Snapshot object of observed sensor/symptom/weather values.
    """
    if not isinstance(observation, dict):
        return {}

    factors: Dict[str, Any] = {}

    # Water
    water = observation.get("water") or {}
    if isinstance(water, dict):
        if water.get("ph") is not None:
            factors["ph"] = water["ph"]
        if water.get("tds") is not None:
            factors["tds"] = water["tds"]
        if water.get("turbidity") is not None:
            factors["turbidity"] = water["turbidity"]
        if water.get("temperature") is not None:
            factors["temperature"] = water["temperature"]
    else:
        # Flattened fallback
        for k in ["ph", "tds", "turbidity"]:
            if observation.get(k) is not None:
                factors[k] = observation[k]
        if observation.get("water_temperature") is not None:
            factors["temperature"] = observation["water_temperature"]

    # Symptoms
    symptoms = observation.get("symptoms") or {}
    if isinstance(symptoms, dict):
        for k in ["feverCount", "diarrheaCount", "vomitingCount", "abdominalPainCount"]:
            if symptoms.get(k) is not None:
                factors[k] = symptoms[k]
    else:
        for k in ["feverCount", "diarrheaCount", "vomitingCount", "abdominalPainCount"]:
            if observation.get(k) is not None:
                factors[k] = observation[k]

    # Weather
    weather = observation.get("weather") or {}
    if isinstance(weather, dict):
        if weather.get("temperature") is not None:
            factors["weatherTemperature"] = weather["temperature"]
        if weather.get("precipitation") is not None:
            factors["precipitation"] = weather["precipitation"]
        if weather.get("humidity") is not None:
            factors["humidity"] = weather["humidity"]
    else:
        if observation.get("weather_temperature") is not None:
            factors["weatherTemperature"] = observation["weather_temperature"]
        for k in ["precipitation", "humidity"]:
            if observation.get(k) is not None:
                factors[k] = observation[k]

    return factors


def generate_contributing_factors(
    observation: Dict[str, Any],
    thresholds: Dict[str, Any] | None = None,
) -> List[str]:
    """Generate internal observation-based heuristic indicators for an observation.

    NOTE: These indicators are derived from simple observation threshold heuristics
    for internal diagnostic inspection. They are NOT model-derived feature attributions
    (Isolation Forest feature importance), NOT causal explanations, and NOT medical diagnoses.

    Requirements:
    - Grounded purely on observed feature values (NOT inferred from riskScore).
    - Preserves deterministic ordering matching the approved feature list.
    - Missing/None feature values never generate indicators.
    - Excludes metadata (latitude, longitude, timestamp).
    - Uses neutral observational descriptions (NO causal claims, NO medical diagnosis).

    Parameters
    ----------
    observation : dict
        Cleaned observation record.
    thresholds : dict, optional
        Custom engineering heuristic thresholds overriding DEFAULT_FACTOR_THRESHOLDS.

    Returns
    -------
    list of str
        Deterministic list of observational heuristic indicator descriptions.
    """
    if not isinstance(observation, dict):
        return []

    cfg = dict(DEFAULT_FACTOR_THRESHOLDS)
    if thresholds:
        cfg.update(thresholds)

    factors: List[str] = []

    # 1. ph
    water = observation.get("water") if isinstance(observation.get("water"), dict) else observation
    ph = water.get("ph")
    if ph is not None and isinstance(ph, (int, float)) and not np.isnan(ph):
        ph_min = cfg.get("ph_min")
        ph_max = cfg.get("ph_max")
        if (ph_min is not None and ph < ph_min) or (ph_max is not None and ph > ph_max):
            factors.append(FACTOR_ABNORMAL_PH)

    # 2. tds
    tds = water.get("tds")
    if tds is not None and isinstance(tds, (int, float)) and not np.isnan(tds):
        tds_max = cfg.get("tds_max")
        if tds_max is not None and tds > tds_max:
            factors.append(FACTOR_ELEVATED_TDS)

    # 3. turbidity
    turbidity = water.get("turbidity")
    if turbidity is not None and isinstance(turbidity, (int, float)) and not np.isnan(turbidity):
        turbidity_max = cfg.get("turbidity_max")
        if turbidity_max is not None and turbidity > turbidity_max:
            factors.append(FACTOR_ELEVATED_TURBIDITY)

    # 4. water temperature
    water_temp = water.get("temperature") if "temperature" in water else observation.get("water_temperature")
    if water_temp is not None and isinstance(water_temp, (int, float)) and not np.isnan(water_temp):
        water_temp_max = cfg.get("water_temp_max")
        if water_temp_max is not None and water_temp > water_temp_max:
            factors.append(FACTOR_ELEVATED_WATER_TEMP)

    # 5-8. Symptoms
    symptoms = observation.get("symptoms") if isinstance(observation.get("symptoms"), dict) else observation

    fever = symptoms.get("feverCount")
    if fever is not None and isinstance(fever, (int, float)) and not np.isnan(fever):
        fever_min = cfg.get("fever_count_min")
        if fever_min is not None and fever >= fever_min:
            factors.append(FACTOR_REPORTED_FEVER)

    diarrhea = symptoms.get("diarrheaCount")
    if diarrhea is not None and isinstance(diarrhea, (int, float)) and not np.isnan(diarrhea):
        diarrhea_min = cfg.get("diarrhea_count_min")
        if diarrhea_min is not None and diarrhea >= diarrhea_min:
            factors.append(FACTOR_REPORTED_DIARRHEA)

    vomiting = symptoms.get("vomitingCount")
    if vomiting is not None and isinstance(vomiting, (int, float)) and not np.isnan(vomiting):
        vomiting_min = cfg.get("vomiting_count_min")
        if vomiting_min is not None and vomiting >= vomiting_min:
            factors.append(FACTOR_REPORTED_VOMITING)

    abdominal = symptoms.get("abdominalPainCount")
    if abdominal is not None and isinstance(abdominal, (int, float)) and not np.isnan(abdominal):
        abdominal_min = cfg.get("abdominal_pain_count_min")
        if abdominal_min is not None and abdominal >= abdominal_min:
            factors.append(FACTOR_REPORTED_ABDOMINAL_PAIN)

    # 9-11. Weather
    weather = observation.get("weather") if isinstance(observation.get("weather"), dict) else observation

    weather_temp = weather.get("temperature") if "temperature" in weather and weather is not water else observation.get("weather_temperature")
    if weather_temp is not None and isinstance(weather_temp, (int, float)) and not np.isnan(weather_temp):
        weather_temp_max = cfg.get("weather_temp_max")
        if weather_temp_max is not None and weather_temp > weather_temp_max:
            factors.append(FACTOR_ELEVATED_WEATHER_TEMP)

    precip = weather.get("precipitation")
    if precip is not None and isinstance(precip, (int, float)) and not np.isnan(precip):
        precip_min = cfg.get("precipitation_min")
        if precip_min is not None and precip > precip_min:
            factors.append(FACTOR_ELEVATED_PRECIPITATION)

    humidity = weather.get("humidity")
    if humidity is not None and isinstance(humidity, (int, float)) and not np.isnan(humidity):
        humidity_max = cfg.get("humidity_max")
        if humidity_max is not None and humidity > humidity_max:
            factors.append(FACTOR_ELEVATED_HUMIDITY)

    return factors


get_contributing_factors = generate_contributing_factors


def format_risk_assessment(
    risk_score: float,
    risk_level: str,
    observation: Dict[str, Any],
    thresholds: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """Format an in-memory internal ML assessment record.

    The 'contributingFactors' field contains strictly the schema-compliant observed feature
    snapshot dictionary required by DATABASE_SCHEMA.md and API_CONTRACT.md.
    'factorDescriptions' is an internal diagnostic helper containing heuristic indicator strings.

    Parameters
    ----------
    risk_score : float
        Normalized risk score in [0.0, 1.0].
    risk_level : str
        'LOW', 'MEDIUM', or 'HIGH'.
    observation : dict
        Cleaned observation record.
    thresholds : dict, optional
        Custom factor thresholds.

    Returns
    -------
    dict
        Assessment record with 'riskScore', 'riskLevel', 'contributingFactors' (dict object),
        and 'factorDescriptions' (internal list of heuristic strings).
    """
    return {
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "contributingFactors": extract_contributing_factors(observation),
        "factorDescriptions": generate_contributing_factors(observation, thresholds=thresholds),
    }


def save_model_artifact(
    preprocessor: Pipeline,
    model: IsolationForest,
    risk_normalizer: RiskNormalizer,
    model_version: str = DEFAULT_MODEL_VERSION,
    artifact_path: str | Path | None = None,
    overwrite: bool = False,
    metadata: Dict[str, Any] | None = None,
) -> str:
    """Save a fully fitted ML pipeline artifact to disk.

    Persists:
    - model_version (string)
    - feature_names (exact 11 approved features in exact sequence)
    - fitted preprocessing pipeline (SimpleImputer + StandardScaler)
    - fitted Isolation Forest estimator
    - fitted RiskNormalizer (training min/max parameters)
    - metadata dictionary

    Parameters
    ----------
    preprocessor : sklearn.pipeline.Pipeline
        Fitted preprocessing pipeline.
    model : sklearn.ensemble.IsolationForest
        Fitted Isolation Forest model.
    risk_normalizer : RiskNormalizer
        Fitted RiskNormalizer instance.
    model_version : str, default 'v1.0'
        Model version identifier (e.g. 'v1.0', 'v1.1', 'v2.0').
    artifact_path : str or Path, optional
        Target file path. If None, defaults to 'ml/artifacts/model_{model_version}.pkl'.
    overwrite : bool, default False
        Whether to overwrite an existing artifact file.
    metadata : dict, optional
        Additional non-sensitive metadata (training date, hyperparams, etc.).

    Returns
    -------
    str
        Absolute path to the saved artifact file.

    Raises
    ------
    ValueError
        If preprocessor, model, risk_normalizer, or version are invalid/unfitted.
    FileExistsError
        If target artifact exists and overwrite is False.
    """
    if preprocessor is None or not isinstance(preprocessor, Pipeline):
        raise ValueError("Invalid or missing preprocessor: must be a fitted sklearn Pipeline.")

    if not hasattr(preprocessor, "named_steps") or "scaler" not in preprocessor.named_steps:
        raise ValueError("Invalid preprocessor: missing required 'scaler' step.")

    scaler = preprocessor.named_steps["scaler"]
    if not hasattr(scaler, "mean_") or scaler.mean_ is None:
        raise ValueError("Unfitted preprocessor: scaler.mean_ is missing.")

    if model is None or not isinstance(model, IsolationForest):
        raise ValueError("Invalid or missing model: must be a fitted IsolationForest.")

    if not hasattr(model, "estimators_") or len(model.estimators_) == 0:
        raise ValueError("Unfitted model: IsolationForest has no fitted estimators.")

    if not hasattr(model, "n_features_in_") or model.n_features_in_ != len(FEATURE_NAMES):
        raise ValueError(
            f"Invalid model feature dimensionality: expected {len(FEATURE_NAMES)} features, "
            f"got {getattr(model, 'n_features_in_', None)}."
        )

    if risk_normalizer is None or not isinstance(risk_normalizer, RiskNormalizer):
        raise ValueError("Invalid or missing risk_normalizer: must be a RiskNormalizer instance.")

    if not model_version or not isinstance(model_version, str):
        raise ValueError("Invalid model_version: must be a non-empty string.")

    # Determine artifact file path
    if artifact_path is None:
        base_dir = Path(__file__).resolve().parent / "artifacts"
        ver_slug = model_version if model_version.startswith("v") else f"v{model_version}"
        target_path = base_dir / f"model_{ver_slug}.pkl"
    else:
        target_path = Path(artifact_path).resolve()

    # Ensure parent directory exists
    target_path.parent.mkdir(parents=True, exist_ok=True)

    if target_path.exists() and not overwrite:
        raise FileExistsError(
            f"Artifact file already exists at '{target_path}'. Set overwrite=True to replace."
        )

    meta = {
        "created_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "algorithm": "IsolationForest",
        "n_features": len(FEATURE_NAMES),
        "training_min": risk_normalizer.training_min,
        "training_max": risk_normalizer.training_max,
    }
    if metadata:
        # Exclude any sensitive keys
        for sensitive_key in ["password", "uri", "secret", "token", "key", "credential"]:
            for k in list(metadata.keys()):
                if sensitive_key in k.lower():
                    raise ValueError(f"Security violation: metadata cannot contain '{k}'.")
        meta.update(metadata)

    payload = {
        "model_version": model_version,
        "feature_names": list(FEATURE_NAMES),
        "preprocessor": preprocessor,
        "model": model,
        "risk_normalizer": risk_normalizer,
        "metadata": meta,
    }

    with open(target_path, "wb") as f:
        pickle.dump(payload, f, protocol=pickle.HIGHEST_PROTOCOL)

    return str(target_path)


def load_model_artifact(
    artifact_path: str | Path,
    expected_version: str | None = None,
) -> Dict[str, Any]:
    """Load and validate a persisted ML pipeline artifact from disk.

    Validates:
    - File existence
    - Payload structure and required dictionary keys
    - Feature contract (exact names and sequence matching FEATURE_NAMES)
    - Model version integrity
    - Fitted components integrity (Pipeline, IsolationForest, RiskNormalizer)

    Does NOT retrain or refit any component during loading.
    Does NOT fall back to an unapproved or default model.

    Parameters
    ----------
    artifact_path : str or Path
        Path to the persisted .pkl artifact file.
    expected_version : str, optional
        If specified, verifies that artifact model_version matches expected_version.

    Returns
    -------
    dict
        Dictionary with keys:
        - 'model_version': str
        - 'feature_names': list of str
        - 'preprocessor': fitted Pipeline
        - 'model': fitted IsolationForest
        - 'risk_normalizer': fitted RiskNormalizer
        - 'metadata': dict

    Raises
    ------
    FileNotFoundError
        If the artifact file does not exist.
    ValueError
        If the artifact is corrupted, incomplete, incompatible, or has wrong feature contract.
    """
    path = Path(artifact_path).resolve()
    if not path.exists():
        msg = f"Model artifact not found at '{path}'. Aborting inference run."
        logger.critical(msg)
        raise FileNotFoundError(msg)

    if not path.is_file():
        msg = f"Artifact path '{path}' is not a regular file. Aborting inference run."
        logger.critical(msg)
        raise ValueError(msg)

    try:
        with open(path, "rb") as f:
            payload = pickle.load(f)
    except Exception as e:
        msg = f"Corrupted artifact file at '{path}': {e}. Aborting inference run."
        logger.critical(msg, exc_info=True)
        raise ValueError(msg) from e

    if not isinstance(payload, dict):
        msg = f"Invalid artifact format at '{path}': expected dictionary, got {type(payload)}. Aborting inference run."
        logger.critical(msg)
        raise ValueError(msg)

    required_keys = {"model_version", "feature_names", "preprocessor", "model", "risk_normalizer"}
    missing = required_keys - set(payload.keys())
    if missing:
        msg = f"Incomplete artifact at '{path}': missing required keys {sorted(missing)}. Aborting inference run."
        logger.critical(msg)
        raise ValueError(msg)

    # Validate feature contract
    stored_features = payload["feature_names"]
    if stored_features != FEATURE_NAMES:
        msg = (
            f"Incompatible feature contract in artifact at '{path}': expected {FEATURE_NAMES}, "
            f"got {stored_features}. Aborting inference run."
        )
        logger.critical(msg)
        raise ValueError(msg)

    # Validate model version
    version = payload["model_version"]
    if not version or not isinstance(version, str):
        msg = f"Invalid model_version in artifact at '{path}': {version}. Aborting inference run."
        logger.critical(msg)
        raise ValueError(msg)

    if expected_version is not None and version != expected_version:
        msg = f"Model version mismatch: expected '{expected_version}', found '{version}' in artifact at '{path}'."
        logger.critical(msg)
        raise ValueError(msg)

    # Validate components
    preprocessor = payload["preprocessor"]
    if not isinstance(preprocessor, Pipeline):
        msg = f"Corrupted artifact at '{path}': preprocessor is not a Pipeline instance."
        logger.critical(msg)
        raise ValueError(msg)

    model = payload["model"]
    if not isinstance(model, IsolationForest):
        msg = f"Corrupted artifact at '{path}': model is not an IsolationForest instance."
        logger.critical(msg)
        raise ValueError(msg)

    if not hasattr(model, "estimators_") or len(model.estimators_) == 0:
        msg = f"Corrupted artifact at '{path}': model has no fitted estimators."
        logger.critical(msg)
        raise ValueError(msg)

    normalizer = payload["risk_normalizer"]
    if not isinstance(normalizer, RiskNormalizer):
        msg = f"Corrupted artifact at '{path}': risk_normalizer is not a RiskNormalizer instance."
        logger.critical(msg)
        raise ValueError(msg)

    logger.info(f"Successfully loaded approved model artifact '{path}' (version: {version}).")
    return {
        "model_version": version,
        "feature_names": stored_features,
        "preprocessor": preprocessor,
        "model": model,
        "risk_normalizer": normalizer,
        "metadata": payload.get("metadata", {}),
    }


def run_inference(
    artifact: Dict[str, Any] | str | Path,
    observations: List[Dict[str, Any]] | Dict[str, Any],
    validate: bool = True,
) -> List[Dict[str, Any]] | Dict[str, Any]:
    """Execute end-to-end inference on new observation(s) using a loaded or stored model artifact.

    Inference Pipeline Flow:
    new observation(s)
        ↓
    validation/cleaning (if validate=True, using validate_and_clean)
        ↓
    feature extraction (exact 11 features extracted in FEATURE_NAMES order)
        ↓
    LOADED fitted preprocessor (imputation + scaling with frozen training stats, NO refitting)
        ↓
    LOADED fitted Isolation Forest (decision_function raw anomaly scores, NO retraining)
        ↓
    raw anomaly score
        ↓
    LOADED RiskNormalizer (min-max normalization using frozen training parameters, NO refitting)
        ↓
    riskScore [0.0, 1.0]
        ↓
    riskLevel (LOW / MEDIUM / HIGH via classify_risk_levels)
        ↓
    schema-compatible contributingFactors (snapshot dict of observed features)
        ↓
    final ML result document(s) matching DATABASE_SCHEMA.md and API_CONTRACT.md

    FAILURE HANDLING & DEGRADATION:
    - Global Artifact Failure: If model artifact is missing or corrupted, aborts run immediately.
      Never retrains automatically, never uses an unapproved fallback model.
    - Missing Data: Missing weather and sensor features remain None and are imputed by the
      fitted preprocessor. Missing fields are excluded from contributingFactors.
    - Location Isolation: If preprocessing, prediction, normalization, or classification fails
      for one location, that location is logged and skipped cleanly. Other locations continue.
    - Output Contract: Successful outputs strictly follow the approved schema with no error fields.

    Parameters
    ----------
    artifact : dict, str, or Path
        Loaded artifact dictionary (from load_model_artifact) or path to .pkl artifact file.
    observations : dict or list of dict
        Single observation dictionary or list of observation dictionaries.
    validate : bool, default True
        Whether to run validate_and_clean on observations before feature extraction.

    Returns
    -------
    dict or list of dict
        Single result dictionary (if single observation passed) or list of result dictionaries.

    Raises
    ------
    ValueError
        If artifact is invalid, incomplete, or has incompatible feature contract.
    FileNotFoundError
        If artifact path does not exist.
    """
    if isinstance(artifact, (str, Path)):
        art = load_model_artifact(artifact)
    elif isinstance(artifact, dict):
        required_keys = {"preprocessor", "model", "risk_normalizer", "model_version"}
        missing = required_keys - set(artifact.keys())
        if missing:
            msg = f"Incomplete artifact: missing required keys {sorted(missing)}."
            logger.critical(msg)
            raise ValueError(msg)
        stored_features = artifact.get("feature_names")
        if stored_features is not None and stored_features != FEATURE_NAMES:
            msg = f"Incompatible artifact feature contract: expected {FEATURE_NAMES}, got {stored_features}."
            logger.critical(msg)
            raise ValueError(msg)
        # Validate component types
        if not isinstance(artifact["preprocessor"], Pipeline):
            msg = "Corrupted artifact: preprocessor is not a Pipeline instance."
            logger.critical(msg)
            raise ValueError(msg)
        if not isinstance(artifact["model"], IsolationForest):
            msg = "Corrupted artifact: model is not an IsolationForest instance."
            logger.critical(msg)
            raise ValueError(msg)
        if not isinstance(artifact["risk_normalizer"], RiskNormalizer):
            msg = "Corrupted artifact: risk_normalizer is not a RiskNormalizer instance."
            logger.critical(msg)
            raise ValueError(msg)
        art = artifact
    else:
        msg = f"Invalid artifact type: expected dict, str, or Path, got {type(artifact)}."
        logger.critical(msg)
        raise ValueError(msg)

    is_single = isinstance(observations, dict)
    if is_single:
        obs_list = [observations]
    elif isinstance(observations, (list, tuple)):
        obs_list = list(observations)
    elif observations is None:
        return []
    else:
        msg = f"Invalid observations type: expected dict or list of dict, got {type(observations)}."
        logger.error(msg)
        raise ValueError(msg)

    if not obs_list:
        return {} if is_single else []

    preprocessor: Pipeline = art["preprocessor"]
    model: IsolationForest = art["model"]
    normalizer: RiskNormalizer = art["risk_normalizer"]
    version: str = art["model_version"]

    results: List[Dict[str, Any]] = []

    for i, raw_obs in enumerate(obs_list):
        loc_summary = _format_location_summary(raw_obs, index=i)

        if not isinstance(raw_obs, dict):
            logger.error(
                f"Invalid observation record at {loc_summary}: expected dict, got {type(raw_obs).__name__}. "
                "Skipping location."
            )
            continue

        # Step 1: Validation and cleaning
        if validate:
            try:
                cleaned_list = validate_and_clean([raw_obs])
                if not cleaned_list or not isinstance(cleaned_list[0], dict):
                    logger.error(
                        f"Validation produced empty or invalid output for location {loc_summary}. Skipping location."
                    )
                    continue
                cleaned_obs = cleaned_list[0]
            except Exception as e:
                logger.error(
                    f"Validation exception for location {loc_summary}: {e}. Skipping location.",
                    exc_info=True,
                )
                continue
        else:
            cleaned_obs = raw_obs

        # Step 2: Feature extraction and preprocessing
        try:
            X = transform_observations(preprocessor, [cleaned_obs])
            if X is None or X.shape != (1, len(FEATURE_NAMES)):
                logger.error(
                    f"Preprocessing failure for location {loc_summary}: transformed feature matrix has unexpected shape "
                    f"{getattr(X, 'shape', None)}. Skipping location."
                )
                continue
            if np.isnan(X).any() or np.isinf(X).any():
                logger.error(
                    f"Preprocessing failure for location {loc_summary}: transformed feature matrix contains NaN/Inf values. "
                    "Skipping location."
                )
                continue
        except Exception as e:
            logger.error(
                f"Preprocessing exception for location {loc_summary}: {e}. Skipping location.",
                exc_info=True,
            )
            continue

        # Step 3: Isolation Forest Prediction
        try:
            raw_scores = compute_raw_anomaly_scores(model, X)
            if raw_scores is None or len(raw_scores) == 0:
                logger.error(
                    f"Model prediction produced empty scores for location {loc_summary}. Skipping location."
                )
                continue
            raw_score = float(raw_scores[0])
            if np.isnan(raw_score) or np.isinf(raw_score):
                logger.error(
                    f"Model prediction produced NaN/Inf raw score ({raw_score}) for location {loc_summary}. "
                    "Skipping location."
                )
                continue
        except Exception as e:
            logger.error(
                f"Model prediction exception for location {loc_summary}: {e}. Skipping location.",
                exc_info=True,
            )
            continue

        # Step 4: Risk Normalization
        try:
            risk_scores = normalize_risk_scores(raw_scores, normalizer)
            if risk_scores is None or len(risk_scores) == 0:
                logger.error(
                    f"Risk normalization produced empty score for location {loc_summary}. Skipping location."
                )
                continue
            norm_val = float(risk_scores[0])
            if np.isnan(norm_val) or np.isinf(norm_val):
                logger.error(
                    f"Risk normalization produced NaN/Inf score ({norm_val}) for location {loc_summary}. "
                    "Skipping location."
                )
                continue
            # Ensure clamped [0.0, 1.0]
            risk_score = float(np.clip(norm_val, 0.0, 1.0))
        except Exception as e:
            logger.error(
                f"Risk normalization exception for location {loc_summary}: {e}. Skipping location.",
                exc_info=True,
            )
            continue

        # Step 5: Risk Level Classification
        try:
            risk_level = classify_risk_level(risk_score)
            if risk_level is None or risk_level not in RISK_LEVELS:
                logger.error(
                    f"Risk level classification failure for location {loc_summary}: could not classify "
                    f"riskScore {risk_score}. Skipping location."
                )
                continue
        except Exception as e:
            logger.error(
                f"Risk level classification exception for location {loc_summary}: {e}. Skipping location.",
                exc_info=True,
            )
            continue

        # Step 6: Contributing Factors snapshot
        try:
            factors = extract_contributing_factors(cleaned_obs)
        except Exception as e:
            logger.warning(f"Contributing factors extraction warning for location {loc_summary}: {e}.")
            factors = {}

        # Step 7: Build schema-compliant result document
        res_doc: Dict[str, Any] = {
            "riskScore": risk_score,
            "riskLevel": risk_level,
            "modelVersion": version,
            "contributingFactors": factors,
        }

        # Include location if present in observation or cleaned observation
        loc = cleaned_obs.get("location") if isinstance(cleaned_obs.get("location"), dict) else None
        if loc is None and isinstance(raw_obs.get("location"), dict):
            loc = raw_obs.get("location")
        if loc is not None:
            res_doc["location"] = loc

        # Include timestamp if present
        ts = cleaned_obs.get("timestamp")
        if ts is None and raw_obs.get("timestamp") is not None:
            ts = raw_obs.get("timestamp")
        if ts is not None:
            res_doc["timestamp"] = ts

        results.append(res_doc)

    return (results[0] if results else {}) if is_single else results


def infer_observation(
    artifact: Dict[str, Any] | str | Path,
    observation: Dict[str, Any],
    validate: bool = True,
) -> Dict[str, Any]:
    """Execute inference for a single observation using a loaded or stored model artifact.

    Parameters
    ----------
    artifact : dict, str, or Path
        Loaded artifact dictionary or path to artifact file.
    observation : dict
        Single observation dictionary.
    validate : bool, default True
        Whether to run validate_and_clean on the observation.

    Returns
    -------
    dict
        ML prediction result dictionary (or empty dict if inference failed).
    """
    res = run_inference(artifact, observation, validate=validate)
    return res if isinstance(res, dict) else (res[0] if res else {})


def predict_with_artifact(
    artifact: Dict[str, Any],
    observations: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Execute end-to-end inference on cleaned observations using a loaded artifact.

    Parameters
    ----------
    artifact : dict
        Loaded artifact dictionary containing 'preprocessor', 'model',
        'risk_normalizer', and 'model_version'.
    observations : list of dict
        Cleaned observation records.

    Returns
    -------
    list of dict
        List of prediction result dictionaries matching the riskScores schema.
    """
    if not isinstance(artifact, dict):
        msg = f"Invalid artifact: expected dictionary, got {type(artifact)}."
        logger.critical(msg)
        raise ValueError(msg)

    required_keys = {"preprocessor", "model", "risk_normalizer", "model_version"}
    missing = required_keys - set(artifact.keys())
    if missing:
        msg = f"Incomplete artifact: missing required keys {sorted(missing)}."
        logger.critical(msg)
        raise ValueError(msg)

    if artifact.get("feature_names") is not None and artifact.get("feature_names") != FEATURE_NAMES:
        msg = (
            f"Incompatible artifact feature contract: expected {FEATURE_NAMES}, "
            f"got {artifact.get('feature_names')}."
        )
        logger.critical(msg)
        raise ValueError(msg)

    if not observations:
        return []

    # Run inference without re-validating (observations assumed cleaned or validated during run_inference)
    return run_inference(artifact, observations, validate=False)


def predict(model: Model, data: Any) -> List[Dict[str, Any]]:
    """Generate risk predictions using a trained model or loaded artifact.

    Returns a list of dicts containing at least ``riskScore`` (0‑1),
    ``riskLevel`` (LOW/MEDIUM/HIGH), ``modelVersion``, and ``contributingFactors``.

    Parameters
    ----------
    model : dict or Model
        Loaded artifact dictionary or model.
    data : list of dict or dict
        Observation(s).

    Returns
    -------
    list of dict
        Prediction result dictionaries.
    """
    if isinstance(model, dict) and "preprocessor" in model and "model" in model and "risk_normalizer" in model:
        if isinstance(data, dict):
            res = run_inference(model, data)
            return [res] if res else []
        return predict_with_artifact(model, data)
    return []


def align_observations(
    water_records: List[Dict[str, Any]],
    symptom_records: List[Dict[str, Any]],
    weather_records: List[Dict[str, Any]],
    window_minutes: int = 60,
    reference_time: Any = None,
) -> List[Dict[str, Any]]:
    """Align source records into the ML input structure.

    Parameters
    ----------
    water_records, symptom_records, weather_records : list of dicts
        Source data for each modality.  Each record must contain at
        least ``latitude``, ``longitude`` and ``timestamp`` fields.
    window_minutes : int, default 60
        Maximum age (in minutes) a source record may have relative to the
        ``reference_time`` to be considered valid.  Older records are
        treated as missing and their feature values become ``None``.
    reference_time : datetime, optional
        UTC datetime representing the inference run time.  If ``None`` the
        current UTC time (``datetime.utcnow()``) is used.  Supplying a
        value makes the function deterministic for testing.

    Returns
    -------
    list of dict
        One aligned observation per distinct location derived from the
        water records.  Missing feature values are represented as ``None``.
    """
    # Determine the reference timestamp (UTC) for the alignment window
    if reference_time is None:
        reference_time = _dt.datetime.now(_dt.timezone.utc)
    # Ensure reference_time is timezone‑aware UTC
    if reference_time.tzinfo is None:
        reference_time = reference_time.replace(tzinfo=_dt.timezone.utc)
    else:
        reference_time = reference_time.astimezone(_dt.timezone.utc)

    # Helper – location key tuple (lat, lon)
    def _loc_key(rec: Dict[str, Any]) -> tuple:
        return (rec.get("latitude"), rec.get("longitude"))

    # Build a mapping of the latest valid record per location within the window
    def _latest_valid(records: List[Dict[str, Any]]) -> Dict[tuple, Dict[str, Any]]:
        latest: Dict[tuple, Dict[str, Any]] = {}
        for rec in records:
            key = _loc_key(rec)
            if None in key:
                continue
            ts = _to_utc(rec.get("timestamp"))
            if ts is None:
                continue
            age_minutes = (reference_time - ts).total_seconds() / 60.0
            if age_minutes < 0 or age_minutes > window_minutes:
                # Record is outside the allowed observation window
                continue
            # Keep the most recent record for this location
            if key not in latest or ts > _to_utc(latest[key].get("timestamp")):
                latest[key] = rec
        return latest

    water_latest = _latest_valid(water_records)
    symptom_latest = _latest_valid(symptom_records)
    weather_latest = _latest_valid(weather_records)

    aligned: List[Dict[str, Any]] = []
    for loc_key, water_rec in water_latest.items():
        lat, lon = loc_key
        # Water features (may be missing → None)
        water_feat = {
            "ph": water_rec.get("ph"),
            "tds": water_rec.get("tds"),
            "turbidity": water_rec.get("turbidity"),
            "temperature": water_rec.get("temperature"),
        }
        # Symptom features – may be absent for this location
        symptom_rec = symptom_latest.get(loc_key, {})
        symptom_feat = {
            "feverCount": symptom_rec.get("feverCount"),
            "diarrheaCount": symptom_rec.get("diarrheaCount"),
            "vomitingCount": symptom_rec.get("vomitingCount"),
            "abdominalPainCount": symptom_rec.get("abdominalPainCount"),
        }
        # Weather features – may be absent for this location
        weather_rec = weather_latest.get(loc_key, {})
        weather_feat = {
            "temperature": weather_rec.get("temperature"),
            "precipitation": weather_rec.get("precipitation"),
            "humidity": weather_rec.get("humidity"),
        }
        aligned.append(
            {
                "location": {"latitude": lat, "longitude": lon},
                "timestamp": reference_time.isoformat(),
                "water": water_feat,
                "symptoms": symptom_feat,
                "weather": weather_feat,
            }
        )
    return aligned


def validate_and_clean(observations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Validate and clean aligned observations.

    - Missing values (None or absent) are left as ``None``.
    - Values that violate type or range constraints are replaced with ``None``.
    - Valid timestamps are normalized to UTC ``datetime`` objects; malformed or missing timestamps become ``None``.
    - Invalid latitude/longitude are set to ``None`` (the whole location is kept but with null coordinates).
    """
    def _is_number(v: Any) -> bool:
        return isinstance(v, (int, float)) and not isinstance(v, bool)

    cleaned = []
    for obs in observations:
        loc = obs.get("location") if isinstance(obs.get("location"), dict) else {}
        obs_clean = {
            "location": {
                "latitude": loc.get("latitude"),
                "longitude": loc.get("longitude"),
            },
            "timestamp": _to_utc(obs.get("timestamp")),
            "water": {},
            "symptoms": {},
            "weather": {},
        }
        # Validate location
        lat = obs_clean["location"]["latitude"]
        lon = obs_clean["location"]["longitude"]
        if not _is_number(lat) or not (-90 <= float(lat) <= 90):
            obs_clean["location"]["latitude"] = None
        if not _is_number(lon) or not (-180 <= float(lon) <= 180):
            obs_clean["location"]["longitude"] = None

        # Helper to validate numeric range
        def _validate_numeric(val, min_val=None, max_val=None):
            if val is None:
                return None
            if not _is_number(val):
                return None
            f = float(val)
            if (min_val is not None and f < min_val) or (max_val is not None and f > max_val):
                return None
            return f if isinstance(val, float) else val

        # Water validation
        water = obs.get("water") if isinstance(obs.get("water"), dict) else {}
        obs_clean["water"]["ph"] = _validate_numeric(water.get("ph"), 0, 14)
        obs_clean["water"]["tds"] = _validate_numeric(water.get("tds"), 0, None)
        obs_clean["water"]["turbidity"] = _validate_numeric(water.get("turbidity"), 0, None)
        obs_clean["water"]["temperature"] = _validate_numeric(water.get("temperature"), -50, 100)

        # Symptom validation – must be integer >=0
        symptoms = obs.get("symptoms") if isinstance(obs.get("symptoms"), dict) else {}
        for key in ["feverCount", "diarrheaCount", "vomitingCount", "abdominalPainCount"]:
            val = symptoms.get(key)
            if val is None:
                cleaned_val = None
            elif isinstance(val, int) and not isinstance(val, bool) and val >= 0:
                cleaned_val = val
            else:
                cleaned_val = None
            obs_clean["symptoms"][key] = cleaned_val

        # Weather validation – numeric, no explicit range in spec (just ensure numeric)
        weather = obs.get("weather") if isinstance(obs.get("weather"), dict) else {}
        for key in ["temperature", "precipitation", "humidity"]:
            val = weather.get(key)
            if val is None:
                cleaned_val = None
            elif _is_number(val):
                cleaned_val = float(val) if isinstance(val, float) else val
            else:
                cleaned_val = None
            obs_clean["weather"][key] = cleaned_val

        cleaned.append(obs_clean)
    return cleaned
