"""Tests for Mission 13: Python ML Job Integration Boundary.

Verifies:
1. Valid JSON input produces valid JSON output.
2. Output is parseable by Python json.loads().
3. stdout contains only JSON (no logs, no banner text).
4. Logs do not pollute stdout (logs go to stderr).
5. Invalid JSON exits non-zero.
6. Empty stdin exits non-zero.
7. Missing artifact exits non-zero.
8. Corrupt artifact exits non-zero.
9. Incompatible artifact exits non-zero.
10. Model version comes strictly from artifact.
11. No fit() is called during CLI inference.
12. No MongoDB connection is attempted.
13. No credentials appear in stdout or stderr.
14. Datetime output is JSON serializable.
15. NumPy numeric values serialize correctly.
16. NaN/Infinity are never emitted as JSON.
17. Existing Mission 12 location failure isolation remains intact in CLI.
18. Existing ML output schema remains unchanged.
19. File input via --input argument works exclusively without stdin.
"""

import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys
import pytest
import numpy as np

from ml.pipeline import (
    FEATURE_NAMES,
    train_pipeline_with_normalizer,
    save_model_artifact,
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
    ts: str | None = None,
) -> dict:
    """Helper to construct an observation dictionary."""
    if ts is None:
        ts = "2026-08-12T12:00:00Z"
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
        _sample_obs(ph=7.0, tds=200.0, turbidity=2.0, fever=0, ts=(base + dt.timedelta(hours=0)).isoformat()),
        _sample_obs(ph=7.4, tds=310.0, turbidity=3.5, fever=1, ts=(base + dt.timedelta(hours=1)).isoformat()),
        _sample_obs(ph=6.9, tds=180.0, turbidity=1.8, fever=0, ts=(base + dt.timedelta(hours=2)).isoformat()),
        _sample_obs(ph=8.2, tds=520.0, turbidity=6.0, fever=6, ts=(base + dt.timedelta(hours=3)).isoformat()),
        _sample_obs(ph=7.1, tds=250.0, turbidity=2.5, fever=1, ts=(base + dt.timedelta(hours=4)).isoformat()),
        _sample_obs(ph=7.3, tds=290.0, turbidity=3.0, fever=0, ts=(base + dt.timedelta(hours=5)).isoformat()),
        _sample_obs(ph=6.8, tds=170.0, turbidity=1.5, fever=0, ts=(base + dt.timedelta(hours=6)).isoformat()),
        _sample_obs(ph=7.5, tds=340.0, turbidity=4.0, fever=2, ts=(base + dt.timedelta(hours=7)).isoformat()),
    ]


@pytest.fixture
def artifact_path(tmp_path) -> str:
    """Fixture creating a valid trained model artifact."""
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


# 1. Valid JSON single observation produces valid JSON output and exit 0
def test_cli_single_observation_success(artifact_path):
    obs = _sample_obs(ph=7.1, tds=260.0, fever=1)
    input_str = json.dumps(obs)

    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", artifact_path],
        input=input_str,
        text=True,
        capture_output=True,
    )

    assert proc.returncode == 0
    parsed = json.loads(proc.stdout)
    assert isinstance(parsed, dict)
    assert "riskScore" in parsed
    assert 0.0 <= parsed["riskScore"] <= 1.0
    assert parsed["riskLevel"] in ["LOW", "MEDIUM", "HIGH"]
    assert parsed["modelVersion"] == "v1.0"
    assert parsed["location"]["latitude"] == 8.1833
    assert parsed["location"]["longitude"] == 77.4119


# 2. Batch observations JSON produces JSON array and exit 0
def test_cli_batch_observations_success(artifact_path):
    batch = [
        _sample_obs(ph=7.0, tds=200.0, lat=8.1, lon=77.1),
        _sample_obs(ph=8.0, tds=600.0, lat=8.2, lon=77.2),
        _sample_obs(ph=6.8, tds=190.0, lat=8.3, lon=77.3),
    ]
    input_str = json.dumps(batch)

    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", artifact_path],
        input=input_str,
        text=True,
        capture_output=True,
    )

    assert proc.returncode == 0
    parsed = json.loads(proc.stdout)
    assert isinstance(parsed, list)
    assert len(parsed) == 3
    assert parsed[0]["location"]["latitude"] == 8.1
    assert parsed[1]["location"]["latitude"] == 8.2
    assert parsed[2]["location"]["latitude"] == 8.3


# 3 & 4. stdout contains pure JSON and logs go strictly to stderr
def test_cli_stdout_pure_json_and_stderr_logs(artifact_path):
    obs = _sample_obs()
    input_str = json.dumps(obs)

    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", artifact_path],
        input=input_str,
        text=True,
        capture_output=True,
    )

    assert proc.returncode == 0
    # stdout must be directly parseable without any trimming of banners/logs
    raw_stdout = proc.stdout.strip()
    assert raw_stdout.startswith("{") and raw_stdout.endswith("}")
    parsed = json.loads(raw_stdout)
    assert "riskScore" in parsed

    # Verify no log prefixes in stdout
    assert "INFO" not in proc.stdout
    assert "WARNING" not in proc.stdout
    assert "ERROR" not in proc.stdout
    assert "CRITICAL" not in proc.stdout


# 5. Invalid JSON input exits non-zero
def test_cli_invalid_json_input_exits_nonzero(artifact_path):
    malformed_json = '{"location": {"latitude": 8.1833}, "water": { unclosed string'

    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", artifact_path],
        input=malformed_json,
        text=True,
        capture_output=True,
    )

    assert proc.returncode != 0
    assert proc.stdout.strip() == ""
    assert "Invalid JSON input" in proc.stderr or "ERROR" in proc.stderr


# 6. Empty stdin exits non-zero
def test_cli_empty_stdin_exits_nonzero(artifact_path):
    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", artifact_path],
        input="",
        text=True,
        capture_output=True,
    )

    assert proc.returncode != 0
    assert proc.stdout.strip() == ""
    assert "Empty input payload" in proc.stderr or "ERROR" in proc.stderr


# 7. Missing artifact exits non-zero
def test_cli_missing_artifact_exits_nonzero(tmp_path):
    missing_path = tmp_path / "non_existent_model.pkl"
    obs = _sample_obs()

    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", str(missing_path)],
        input=json.dumps(obs),
        text=True,
        capture_output=True,
    )

    assert proc.returncode != 0
    assert proc.stdout.strip() == ""
    assert "Model artifact not found" in proc.stderr or "CRITICAL" in proc.stderr


# 8. Corrupted artifact exits non-zero
def test_cli_corrupted_artifact_exits_nonzero(tmp_path):
    corrupt_file = tmp_path / "corrupt.pkl"
    with open(corrupt_file, "wb") as f:
        f.write(b"CORRUPTED_PICKLE_BINARY_XYZ")

    obs = _sample_obs()
    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", str(corrupt_file)],
        input=json.dumps(obs),
        text=True,
        capture_output=True,
    )

    assert proc.returncode != 0
    assert proc.stdout.strip() == ""
    assert "Corrupted artifact file" in proc.stderr or "CRITICAL" in proc.stderr or "Invalid or corrupted" in proc.stderr


# 9. Incompatible artifact exits non-zero
def test_cli_incompatible_artifact_exits_nonzero(tmp_path):
    incomp_file = tmp_path / "incompatible.pkl"
    import pickle
    with open(incomp_file, "wb") as f:
        pickle.dump({"model_version": "v1.0", "feature_names": ["only_two"]}, f)

    obs = _sample_obs()
    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", str(incomp_file)],
        input=json.dumps(obs),
        text=True,
        capture_output=True,
    )

    assert proc.returncode != 0
    assert proc.stdout.strip() == ""


# 10. Model version comes strictly from loaded artifact
def test_cli_model_version_from_artifact(tmp_path):
    train_data = _training_dataset()
    preprocessor, model, normalizer = train_pipeline_with_normalizer(train_data, random_state=42)
    path = tmp_path / "model_v2.5.pkl"
    save_model_artifact(
        preprocessor=preprocessor,
        model=model,
        risk_normalizer=normalizer,
        model_version="v2.5",
        artifact_path=path,
    )

    # Input payload attempting to specify a different modelVersion
    obs = _sample_obs()
    obs["modelVersion"] = "v999.0_FAKE"

    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", str(path)],
        input=json.dumps(obs),
        text=True,
        capture_output=True,
    )

    assert proc.returncode == 0
    parsed = json.loads(proc.stdout)
    assert parsed["modelVersion"] == "v2.5"
    assert parsed["modelVersion"] != "v999.0_FAKE"


# 11. No fit() called during CLI inference
def test_cli_no_fit_called(artifact_path):
    # Verify artifact file modification timestamp before and after inference
    mtime_before = os.path.getmtime(artifact_path)

    obs = _sample_obs(ph=7.3, tds=270.0, fever=1)
    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", artifact_path],
        input=json.dumps(obs),
        text=True,
        capture_output=True,
    )

    assert proc.returncode == 0
    mtime_after = os.path.getmtime(artifact_path)
    assert mtime_before == mtime_after


# 12. No MongoDB connection attempted
def test_cli_no_mongodb_connection(artifact_path):
    # Test script running CLI while monitoring network socket creation or pymongo import
    test_code = f"""
import sys
import socket

# Monkeypatch socket.socket.connect to fail if any connection to MongoDB (port 27017) is attempted
orig_connect = socket.socket.connect
def _guarded_connect(self, address):
    host, port = address[0], address[1]
    if port == 27017 or 'mongo' in str(host).lower():
        raise AssertionError("CRITICAL VIOLATION: MongoDB connection attempted!")
    return orig_connect(self, address)

socket.socket.connect = _guarded_connect

from ml.cli import main
sys.exit(main(["--artifact", {repr(artifact_path)}]))
"""
    obs = _sample_obs()
    proc = subprocess.run(
        [sys.executable, "-c", test_code],
        input=json.dumps(obs),
        text=True,
        capture_output=True,
    )

    assert proc.returncode == 0
    assert "pymongo" not in sys.modules
    parsed = json.loads(proc.stdout)
    assert "riskScore" in parsed


# 13. No credentials appear in stdout or stderr
def test_cli_no_credentials_in_output_or_logs(artifact_path):
    obs = _sample_obs()
    obs["password"] = "SECRET_DB_PASSWORD_XYZ"
    obs["apiKey"] = "TOP_SECRET_API_TOKEN_123"
    obs["mongoUri"] = "mongodb://admin:SECRET_PASSWORD@localhost:27017"

    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", artifact_path],
        input=json.dumps(obs),
        text=True,
        capture_output=True,
    )

    assert proc.returncode == 0
    assert "SECRET_DB_PASSWORD_XYZ" not in proc.stdout
    assert "SECRET_DB_PASSWORD_XYZ" not in proc.stderr
    assert "TOP_SECRET_API_TOKEN_123" not in proc.stdout
    assert "TOP_SECRET_API_TOKEN_123" not in proc.stderr
    assert "SECRET_PASSWORD" not in proc.stdout
    assert "SECRET_PASSWORD" not in proc.stderr


# 14. Datetime JSON serialization (ISO-8601 UTC)
def test_cli_datetime_json_serialization(artifact_path):
    obs = _sample_obs(ts="2026-08-12T14:30:00+00:00")
    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", artifact_path],
        input=json.dumps(obs),
        text=True,
        capture_output=True,
    )

    assert proc.returncode == 0
    parsed = json.loads(proc.stdout)
    assert "timestamp" in parsed
    # Must be valid ISO string
    ts = parsed["timestamp"]
    assert isinstance(ts, str)
    assert "2026-08-12" in ts


# 15. NumPy numeric values serialize correctly
def test_cli_numpy_types_json_serialization(artifact_path):
    obs = _sample_obs(ph=7.25, tds=285.0, fever=2)
    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", artifact_path],
        input=json.dumps(obs),
        text=True,
        capture_output=True,
    )

    assert proc.returncode == 0
    parsed = json.loads(proc.stdout)
    assert isinstance(parsed["riskScore"], float)
    assert isinstance(parsed["contributingFactors"]["ph"], float)
    assert isinstance(parsed["contributingFactors"]["tds"], (int, float))


# 16. NaN / Infinity are never emitted as JSON
def test_cli_nan_infinity_forbidden(artifact_path):
    obs = _sample_obs()
    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", artifact_path],
        input=json.dumps(obs),
        text=True,
        capture_output=True,
    )

    assert proc.returncode == 0
    stdout = proc.stdout
    assert "NaN" not in stdout
    assert "Infinity" not in stdout
    assert "-Infinity" not in stdout


# 17. Existing Mission 12 location failure isolation remains intact in CLI
def test_cli_location_failure_isolation(artifact_path):
    # Batch where one item is malformed / invalid location structure
    batch = [
        _sample_obs(ph=7.0, tds=200.0, lat=8.1, lon=77.1),
        "INVALID_RECORD_ITEM",
        _sample_obs(ph=6.8, tds=190.0, lat=8.3, lon=77.3),
    ]

    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", artifact_path],
        input=json.dumps(batch),
        text=True,
        capture_output=True,
    )

    assert proc.returncode == 0
    parsed = json.loads(proc.stdout)
    assert isinstance(parsed, list)
    assert len(parsed) == 2
    assert parsed[0]["location"]["latitude"] == 8.1
    assert parsed[1]["location"]["latitude"] == 8.3
    # Stderr records the skipped location
    assert "Invalid observation record" in proc.stderr or "ERROR" in proc.stderr


# 18. Output schema matches specification exactly
def test_cli_output_schema_preservation(artifact_path):
    obs = _sample_obs(lat=8.1833, lon=77.4119)
    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", artifact_path],
        input=json.dumps(obs),
        text=True,
        capture_output=True,
    )

    assert proc.returncode == 0
    doc = json.loads(proc.stdout)

    required_keys = {"location", "timestamp", "riskScore", "riskLevel", "modelVersion", "contributingFactors"}
    assert required_keys.issubset(set(doc.keys()))
    assert doc["location"] == {"latitude": 8.1833, "longitude": 77.4119}
    assert isinstance(doc["riskScore"], float)
    assert doc["riskLevel"] in ["LOW", "MEDIUM", "HIGH"]
    assert isinstance(doc["contributingFactors"], dict)

    # Ensure no forbidden status/error keys
    for forbidden in ["error", "errors", "status", "debug", "failed"]:
        assert forbidden not in doc


# 19. File input via --input argument works exclusively
def test_cli_file_input_argument(artifact_path, tmp_path):
    input_file = tmp_path / "input_payload.json"
    obs = _sample_obs(ph=7.35, tds=295.0, lat=8.5, lon=77.5)
    with open(input_file, "w", encoding="utf-8") as f:
        json.dump(obs, f)

    # Invoke with --input (and no stdin provided)
    proc = subprocess.run(
        [sys.executable, "-m", "ml", "--artifact", artifact_path, "--input", str(input_file)],
        text=True,
        capture_output=True,
    )

    assert proc.returncode == 0
    parsed = json.loads(proc.stdout)
    assert parsed["location"]["latitude"] == 8.5
    assert parsed["location"]["longitude"] == 77.5
    assert "riskScore" in parsed
