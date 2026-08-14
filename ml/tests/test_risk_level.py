import numpy as np
import pytest
from ml.pipeline import (
    DEFAULT_LOW_THRESHOLD,
    DEFAULT_HIGH_THRESHOLD,
    RISK_LEVEL_LOW,
    RISK_LEVEL_MEDIUM,
    RISK_LEVEL_HIGH,
    RISK_LEVELS,
    classify_risk_level,
    classify_risk_levels,
)

# 1. A clearly low score maps to LOW
def test_clearly_low_score_maps_to_low():
    assert classify_risk_level(0.15) == RISK_LEVEL_LOW
    assert classify_risk_level(0.2) == RISK_LEVEL_LOW

# 2. A clearly medium score maps to MEDIUM
def test_clearly_medium_score_maps_to_medium():
    assert classify_risk_level(0.5) == RISK_LEVEL_MEDIUM
    assert classify_risk_level(0.55) == RISK_LEVEL_MEDIUM

# 3. A clearly high score maps to HIGH
def test_clearly_high_score_maps_to_high():
    assert classify_risk_level(0.85) == RISK_LEVEL_HIGH
    assert classify_risk_level(0.95) == RISK_LEVEL_HIGH

# 4. Exact LOW threshold boundary behavior (default 0.4)
def test_exact_low_threshold_boundary():
    assert classify_risk_level(0.39999) == RISK_LEVEL_LOW
    # At exact boundary 0.4, transitions to MEDIUM
    assert classify_risk_level(0.4) == RISK_LEVEL_MEDIUM
    assert classify_risk_level(DEFAULT_LOW_THRESHOLD) == RISK_LEVEL_MEDIUM

# 5. Exact MEDIUM/HIGH boundary behavior (default 0.7)
def test_exact_medium_high_boundary():
    assert classify_risk_level(0.69999) == RISK_LEVEL_MEDIUM
    # At exact boundary 0.7, transitions to HIGH
    assert classify_risk_level(0.7) == RISK_LEVEL_HIGH
    assert classify_risk_level(DEFAULT_HIGH_THRESHOLD) == RISK_LEVEL_HIGH

# 6. riskScore = 0.0
def test_risk_score_zero():
    assert classify_risk_level(0.0) == RISK_LEVEL_LOW

# 7. riskScore = 1.0
def test_risk_score_one():
    assert classify_risk_level(1.0) == RISK_LEVEL_HIGH

# 8. Values between thresholds
def test_values_between_thresholds():
    assert classify_risk_level(0.45) == RISK_LEVEL_MEDIUM
    assert classify_risk_level(0.60) == RISK_LEVEL_MEDIUM
    assert classify_risk_level(0.65) == RISK_LEVEL_MEDIUM

# 9. Slightly out-of-range values
def test_slightly_out_of_range_values():
    # Slightly below 0.0 clamped to 0.0 -> LOW
    assert classify_risk_level(-1e-7) == RISK_LEVEL_LOW
    # Slightly above 1.0 clamped to 1.0 -> HIGH
    assert classify_risk_level(1.0000001) == RISK_LEVEL_HIGH

# 10. NaN handling
def test_nan_handling():
    assert classify_risk_level(float("nan")) is None
    assert classify_risk_level(np.nan) is None

# 11. Infinity handling
def test_infinity_handling():
    assert classify_risk_level(float("inf")) is None
    assert classify_risk_level(float("-inf")) is None
    assert classify_risk_level(np.inf) is None

# 12. None and invalid type handling
def test_none_and_invalid_types_handling():
    assert classify_risk_level(None) is None
    assert classify_risk_level("0.5") is None
    assert classify_risk_level(True) is None
    assert classify_risk_level(False) is None
    assert classify_risk_level([]) is None
    assert classify_risk_level({}) is None

# 13. Monotonicity property
def test_classification_monotonicity():
    rank_map = {RISK_LEVEL_LOW: 0, RISK_LEVEL_MEDIUM: 1, RISK_LEVEL_HIGH: 2}
    scores = np.linspace(0.0, 1.0, 101)
    
    prev_rank = 0
    for s in scores:
        level = classify_risk_level(s)
        rank = rank_map[level]
        assert rank >= prev_rank, f"Monotonicity violated at score {s}: level {level} vs prev_rank {prev_rank}"
        prev_rank = rank

# 14. Multiple scores preserve input order
def test_classify_risk_levels_preserves_order():
    scores = [0.1, 0.45, 0.8, None, 0.4, 0.7, 0.0, 1.0, np.nan]
    expected = [
        RISK_LEVEL_LOW,
        RISK_LEVEL_MEDIUM,
        RISK_LEVEL_HIGH,
        None,
        RISK_LEVEL_MEDIUM,
        RISK_LEVEL_HIGH,
        RISK_LEVEL_LOW,
        RISK_LEVEL_HIGH,
        None,
    ]
    results = classify_risk_levels(scores)
    assert results == expected
    assert len(results) == len(scores)

# 15. Configurable custom thresholds
def test_custom_threshold_configuration():
    # Custom thresholds: LOW < 0.3, MEDIUM 0.3-0.8, HIGH >= 0.8
    assert classify_risk_level(0.35, low_threshold=0.3, high_threshold=0.8) == RISK_LEVEL_MEDIUM
    assert classify_risk_level(0.25, low_threshold=0.3, high_threshold=0.8) == RISK_LEVEL_LOW
    assert classify_risk_level(0.75, low_threshold=0.3, high_threshold=0.8) == RISK_LEVEL_MEDIUM
    assert classify_risk_level(0.80, low_threshold=0.3, high_threshold=0.8) == RISK_LEVEL_HIGH

# 16. Empty input for classify_risk_levels
def test_classify_risk_levels_empty_input():
    assert classify_risk_levels([]) == []
    assert classify_risk_levels(None) == []
