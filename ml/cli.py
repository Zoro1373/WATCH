"""CLI entry point for the WaterGuard AI Python ML job.

Invoked by the Node.js 15-minute scheduled job via:
    node child process -> python -m ml -> stdout JSON -> MongoDB persistence

Architecture Boundary Rules:
1. Input: Read JSON from stdin (default) or exclusively from --input file.
2. Output: Write ONLY machine-readable JSON to stdout.
3. Logging: Direct all log records and diagnostic messages exclusively to stderr.
4. Exit Codes: 0 on success, non-zero on error.
5. Zero MongoDB access: Never connect to or query MongoDB.
6. Zero Retraining: Never call fit() or retrain during inference.
7. Artifact Authoritative: modelVersion comes strictly from the loaded artifact.
"""

import argparse
import datetime as dt
import json
import logging
import os
from pathlib import Path
import sys
from typing import Any, Dict, List

import numpy as np

from ml.pipeline import (
    FEATURE_NAMES,
    load_model_artifact,
    run_inference,
)

logger = logging.getLogger("ml.cli")


def _json_serializer(obj: Any) -> Any:
    """JSON serializer for objects not serializable by default json code.

    Supports:
    - datetime / date -> ISO-8601 formatted string
    - NumPy floating -> standard float (rejecting NaN / Infinity)
    - NumPy integer -> standard int
    - NumPy ndarray -> Python list
    - NumPy bool -> standard bool
    """
    if isinstance(obj, (dt.datetime, dt.date)):
        if isinstance(obj, dt.datetime) and obj.tzinfo is None:
            return obj.replace(tzinfo=dt.timezone.utc).isoformat()
        return obj.isoformat()

    if isinstance(obj, (np.floating, float)):
        val = float(obj)
        if np.isnan(val) or np.isinf(val):
            raise ValueError(f"Invalid non-finite numeric value in output: {val}")
        return val

    if isinstance(obj, (np.integer, int)):
        return int(obj)

    if isinstance(obj, np.ndarray):
        return obj.tolist()

    if isinstance(obj, (np.bool_, bool)):
        return bool(obj)

    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def _configure_logging() -> None:
    """Configure Python standard logging to write exclusively to stderr."""
    logging.basicConfig(
        stream=sys.stderr,
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        force=True,
    )


def _resolve_artifact_path(artifact_arg: str | None) -> Path:
    """Resolve the model artifact file path from argument, env, or default."""
    if artifact_arg:
        return Path(artifact_arg).resolve()

    env_path = os.environ.get("MODEL_ARTIFACT_PATH")
    if env_path:
        return Path(env_path).resolve()

    # Default convention: ml/artifacts/model_v1.0.pkl
    base_dir = Path(__file__).resolve().parent / "artifacts"
    return (base_dir / "model_v1.0.pkl").resolve()


def main(args: List[str] | None = None) -> int:
    """Execute the ML inference CLI job.

    Parameters
    ----------
    args : list of str, optional
        Command-line arguments. If None, uses sys.argv[1:].

    Returns
    -------
    int
        Process exit code:
        - 0: Inference succeeded.
        - 1: Invalid input, unparseable JSON, or missing payload.
        - 2: Model artifact loading failure (missing, corrupted, incompatible).
        - 3: Runtime inference failure.
    """
    _configure_logging()

    parser = argparse.ArgumentParser(
        prog="python -m ml",
        description="WaterGuard AI - Scheduled ML Inference Job Entry Point",
    )
    parser.add_argument(
        "--artifact",
        "-a",
        type=str,
        default=None,
        help="Path to the approved model artifact (.pkl file). Defaults to MODEL_ARTIFACT_PATH or ml/artifacts/model_v1.0.pkl",
    )
    parser.add_argument(
        "--input",
        "-i",
        type=str,
        default=None,
        help="Path to input JSON file. If omitted, input is read exclusively from stdin.",
    )

    parsed_args = parser.parse_args(args)

    # 1. Read input payload
    if parsed_args.input:
        input_file = Path(parsed_args.input)
        if not input_file.exists() or not input_file.is_file():
            logger.error(f"Input file not found: '{input_file}'")
            return 1
        try:
            with open(input_file, "r", encoding="utf-8") as f:
                raw_input = f.read()
        except Exception as e:
            logger.error(f"Failed to read input file '{input_file}': {e}", exc_info=True)
            return 1
    else:
        try:
            raw_input = sys.stdin.read()
        except Exception as e:
            logger.error(f"Failed to read input from stdin: {e}", exc_info=True)
            return 1

    if not raw_input or not raw_input.strip():
        logger.error("Empty input payload received. Expected JSON object or array.")
        return 1

    # 2. Parse JSON payload
    try:
        payload = json.loads(raw_input)
    except Exception as e:
        logger.error(f"Invalid JSON input: {e}")
        return 1

    if not isinstance(payload, (dict, list)):
        logger.error(f"Invalid JSON structure: expected object or array, got {type(payload).__name__}")
        return 1

    # 3. Resolve and load model artifact
    artifact_path = _resolve_artifact_path(parsed_args.artifact)
    try:
        artifact = load_model_artifact(artifact_path)
    except FileNotFoundError as e:
        logger.critical(f"Model artifact not found at '{artifact_path}': {e}")
        return 2
    except ValueError as e:
        logger.critical(f"Invalid or corrupted model artifact at '{artifact_path}': {e}")
        return 2
    except Exception as e:
        logger.critical(f"Unexpected error loading model artifact at '{artifact_path}': {e}", exc_info=True)
        return 2

    # 4. Run inference using existing pipeline functions
    try:
        results = run_inference(artifact, payload, validate=True)
    except Exception as e:
        logger.error(f"Inference execution failed: {e}", exc_info=True)
        return 3

    # 5. Serialize output to pure JSON and write strictly to stdout
    try:
        output_json = json.dumps(results, default=_json_serializer, allow_nan=False)
    except Exception as e:
        logger.error(f"JSON output serialization failed: {e}", exc_info=True)
        return 3

    # Output machine-readable JSON exclusively to stdout
    sys.stdout.write(output_json + "\n")
    sys.stdout.flush()

    return 0


if __name__ == "__main__":
    sys.exit(main())
