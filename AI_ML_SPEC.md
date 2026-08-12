# AI_ML_SPEC.md
Version: 1.0
Status: LOCKED

## 1. Purpose
The AI component provides a **location‑level early‑warning risk indicator** for water‑contamination‑related health risk.  It aggregates recent water‑quality sensor data, community symptom reports, and weather observations to generate a normalized **riskScore** (0 – 1) and an operational risk level (`LOW`, `MEDIUM`, `HIGH`).  The model does **not** diagnose disease, predict individual health outcomes, or claim medically validated probabilities.

---

## 1.1 AI Assistant Overview
The product includes a separate MCP‑powered AI Assistant that provides read‑only natural‑language access to existing project data via the MCP server and read‑only tools. This assistant operates **outside** the risk‑generation ML pipeline and does **not** generate or modify risk scores. The risk scores continue to be produced exclusively by the Isolation Forest model described in this specification.

## 2. ML Input Data
The scheduled Python/Scikit‑learn job reads historical documents from MongoDB collections defined in **DATABASE_SCHEMA.md**.

| Source collection | Fields used as model inputs |
|-------------------|------------------------------|
| `waterReadings`   | `ph`, `tds`, `turbidity`, `temperature` |
| `symptoms`        | `feverCount`, `diarrheaCount`, `vomitingCount`, `abdominalPainCount` |
| `weather`         | `temperature`, `precipitation`, `humidity` |
| All sources       | `location` (GeoJSON point + redundant latitude/longitude) and `timestamp` for alignment |

No additional sensor features, symptom categories, or external datasets are introduced in the MVP.  Future extensions may add other environmental or epidemiological variables and will be clearly labelled **FUTURE**.

---

## 3. Data Alignment
1. **Target locations** are derived from distinct `location` values present in the `waterReadings` collection (i.e., each registered ESP32 node).
2. For each target location the job queries the most recent documents (by `timestamp`) from the three collections:
   - Water reading(s) – if multiple readings exist within the alignment window, the **latest** reading is selected.
   - Symptom aggregation – the latest aggregated symptom document for that location is selected.
   - Weather cache – the latest cached weather document for that location is selected.
3. The **historical observation window** (how far back to look for a reading when a recent one is missing) is a configurable parameter (default: 60 minutes).  If no record is found within the window, the corresponding feature value is set to **null**.
4. All three feature groups are merged into a single feature vector keyed by `location` and the inference `timestamp` (the time the job runs).

---

## 4. Preprocessing
| Step | Description |
|------|-------------|
| **Type enforcement** | Ensure numeric fields are floats/integers as defined; coerce when possible, otherwise mark as null. |
| **Missing‑value handling** | Missing values remain **null** in the in‑memory dataframe.  The preprocessing pipeline later applies an imputation strategy (e.g., median imputation) **only during training**; for inference the model’s built‑in handling (e.g., `SimpleImputer` with `strategy='median'`) is applied. |
| **Invalid value detection** | Values outside the validation ranges defined in **DATABASE_SCHEMA.md** (e.g., pH < 0 or > 14, negative TDS) are flagged and treated as null. |
| **Duplicate record removal** | The pipeline drops duplicate sensor readings identified by the unique compound key `{nodeId, timestamp}` before feature extraction. |
| **Timestamp normalization** | All dates are converted to UTC `datetime` objects.  No temporal features are added to the MVP feature vector; they are reserved for future extensions. |
| **Scaling** | For algorithms sensitive to feature scale (e.g., Logistic Regression) a standard scaler (mean = 0, std = 1) is fitted on the training data and persisted for inference. |

The preprocessing steps are encapsulated in a Scikit‑learn `Pipeline` so that the same transformations are applied consistently during training and inference.

---

## 5. Feature Engineering
### Approved Input Features (MVP)
- **Raw water measurements**: latest `ph`, `tds`, `turbidity`, `temperature`.
- **Aggregated symptom counts**: latest `feverCount`, `diarrheaCount`, `vomitingCount`, `abdominalPainCount`.
- **Current weather**: latest `temperature`, `precipitation`, `humidity`.
- **Temporal cues (FUTURE)**: hour of day, day of week, time‑since last sensor reading (not included in the MVP feature vector).

### Optional / Future Features
- Rolling averages or min/max of water measurements over the past 1‑3 hours.
- Symptom trend statistics (e.g., week‑over‑week change).
- Additional environmental variables (e.g., wind speed, water flow).
- External epidemiological indicators.

All future features will be clearly marked **FUTURE** and are not part of the MVP data pipeline.

---

## 6. Target / Label Definition
The MVP does **not** have a verified outbreak label dataset.  Consequently two prototype strategies are described:
1. **Supervised‑learning prototype** – If a labeled dataset becomes available (e.g., expert‑annotated high‑risk episodes), the model can be trained to predict a binary `highRisk` label.  The label would be derived from public health reports, not from the system itself.
2. **Unsupervised risk‑scoring prototype** – Using an anomaly‑detection or density‑based approach (e.g., Isolation Forest) the model assigns a continuous anomaly score that is later normalized to the required `riskScore` range.  This approach works without explicit ground‑truth labels and serves as the default MVP.

Both approaches are documented; the MVP currently implements the **unsupervised risk‑scoring** path.

---

## 7. Model Selection
The MVP uses an **unsupervised** approach because no verified outbreak‑label dataset exists.  The current production path is:
```
No verified outbreak labels
    ↓
Isolation Forest
    ↓
Anomaly score
    ↓
Normalized riskScore
    ↓
LOW / MEDIUM / HIGH
```
Isolation Forest is the only model trained and deployed in the MVP.

**Conditional / Future supervised candidates** (to be considered only if a labeled dataset becomes available):
- **Logistic Regression** – linear, highly interpretable, fast training.
- **Random Forest** – handles non‑linear interactions, provides feature importance.
- **GradientBoostingClassifier** – Scikit‑learn implementation of gradient boosting.

Model selection for the MVP therefore consists of training the Isolation Forest, evaluating its anomaly‑scoring behavior, and persisting the chosen version as `model_vX.pkl`.  No other models are trained in the current MVP.


---

## 8. Baseline Model
A deterministic baseline uses the **historical median anomaly score** (or the median of previously observed riskScore values) for each location.  This provides a simple reference point without requiring random number generation.  No performance numbers are asserted.

---

## 9. Training Pipeline
```
Data (MongoDB) → Validation (field‑level checks) → Preprocessing Pipeline → Feature Engineering → Train/Validation Split (time‑aware) → Model Training → Evaluation → Model Selection → Persist model artifact + preprocessing pipeline (versioned)
```
- **Time‑aware split**: The training set consists of older timestamps; the validation set uses the most recent window to avoid leakage.
- **Leakage prevention**: Feature scaling parameters and imputation statistics are fitted **only** on the training portion and applied to validation/inference.
- **Versioning**: The final artifact includes the model object, the preprocessing pipeline, and a JSON manifest with `modelVersion`, `features`, and `hyperparameters`.

---

## 10. Model Evaluation
Evaluation depends on the selected formulation:
- **Classification (if labels become available)**: Precision, Recall, F1‑score, ROC‑AUC, confusion matrix.  Special attention to class imbalance and the cost of false negatives (missed early warnings).
- **Anomaly / risk‑scoring**: Distribution of riskScore, qualitative inspection of high‑risk cases, and if any labeled validation data exist, precision/recall on those points.
- **Explainability**: Feature importance (e.g., mean decrease impurity for tree models) is inspected to verify that the model leverages plausible inputs.

No specific numeric results are claimed.

---

## 11. Risk Score Generation
1. The selected model outputs a raw score (`log‑odds` for Logistic Regression, probability for classifiers, anomaly score for Isolation Forest). For Isolation Forest, the raw anomaly output is inverted (e.g., using the negative score or `decision_function`) so that **higher values represent greater anomaly/risk**.
2. The raw score is **min‑max normalized** to the 0 – 1 interval using the min/max observed on the training data (or a calibrated sigmoid).  The normalized value is stored as `riskScore`.
3. **Thresholds** for `LOW`/`MEDIUM`/`HIGH` are **configurable prototype thresholds** (e.g., `LOW < 0.4`, `MEDIUM 0.4 – 0.7`, `HIGH ≥ 0.7`).  These defaults can be tuned after validation; they are **not** medically validated.

The contract explicitly states that `riskScore` is *not* a medical probability.

---

## 12. Risk Levels
| Level | Description (operational) |
|-------|---------------------------|
| `LOW`    | Minimal indication of water‑quality risk; no immediate action required. |
| `MEDIUM` | Moderate risk; alerts may be generated for downstream monitoring. |
| `HIGH`   | Elevated risk; system creates alerts and notifies stakeholders via the alert service. |

Thresholds are configurable as described above.

---

## 13. Explainability
The backend includes the optional `contributingFactors` field in `riskScores` (see **DATABASE_SCHEMA.md**).  During inference the pipeline extracts the **top N** features with the highest absolute contribution (e.g., using a model‑compatible attribution method (e.g., built‑in feature importance or coefficient magnitude)).  Example entries:
- `ph`: 0.12 (elevated)
- `temperature`: 0.08 (high ambient temperature)
- `feverCount`: 0.15 (spike in community symptoms)

These are presented as *contributing features*; the documentation makes clear they are **associations**, not causal explanations.

---

## 14. Model Versioning
A simple version string (`v1.0`, `v1.1`, `v2.0`, …) is attached to each persisted model artifact and stored in the `riskScores.modelVersion` field.  The version is incremented when:
- Model architecture changes (different algorithm).
- Hyper‑parameters are significantly altered.
- Preprocessing steps are added/removed.

The version string is part of the `riskScores` document; no external registry is required.

---

## 15. Inference Pipeline
```
Every 15 minutes (scheduled job)
   ↓
MongoDB: fetch latest water, symptom, weather docs per location
   ↓
Validate and clean data (as in Section 4)
   ↓
Apply stored preprocessing pipeline
   ↓
Feature engineering (Section 5)
   ↓
Load versioned Scikit‑learn model (model_vX.pkl)
   ↓
Generate raw prediction → normalized riskScore (0‑1)
   ↓
Assign riskLevel using configurable thresholds
   ↓
Create `contributingFactors` summary
   ↓
Write document to `riskScores` collection (includes `modelVersion`)
```
The job processes each distinct location independently; batch processing is possible but not required for the MVP.

---

## 16. ML Output
The document written to `riskScores` matches the schema in **DATABASE_SCHEMA.md**:
- `location` (GeoJSON + latitude/longitude)
- `timestamp` (inference run time)
- `riskScore` (0 – 1)
- `riskLevel` (`LOW`, `MEDIUM`, `HIGH`)
- optional `modelVersion`
- optional `contributingFactors`
No additional fields are introduced.

---

## 17. Failure Handling
| Failure scenario | Desired behavior |
|------------------|------------------|
| MongoDB unavailable | Log error, skip current run, alert operational team; no `riskScores` written. |
| Required weather data missing | Treat missing weather features as **null**; if *all* weather fields are null, still proceed with available water/symptom data (model must handle nulls). |
| Sensor data missing for a location | Proceed with whatever features are present; nulls are forwarded to the model. |
| Model artifact cannot be loaded | Log critical error, abort run, raise alert; retain previous `riskScores` until a valid model is deployed. |
| Preprocessing exception | Log details, abort inference for the affected location, continue with other locations. |
| Prediction exception | Log, skip that location’s output. |

The system never fabricates a prediction when critical inputs are unavailable; it simply omits the `riskScore` for that location in that run.

---

## 18. Data Quality Checks
Before feeding data to the pipeline the job verifies:
- `ph` within 0 – 14
- `tds` ≥ 0
- `turbidity` ≥ 0
- `temperature` within -50 °C – 100 °C
- Latitude between -90 and 90, longitude between -180 and 180
- Valid ISO‑8601 timestamps (converted to UTC)
- Presence of required fields (nulls are allowed but flagged)
- No duplicate sensor readings (enforced by unique index `{nodeId, timestamp}`)

Any record failing these checks is excluded from the feature set and logged for later investigation.

---

## 19. Training vs Inference
- **Training** is an offline activity performed by data scientists.  It consumes historic data, builds and evaluates candidate models, and updates the persisted model artifact (`model_vX.pkl`).  Training is *not* executed by the 15‑minute scheduled job.
- **Inference** runs every 15 minutes, loads the *approved* model version, and generates predictions for the current snapshot of data.  Retraining is triggered only when a new version is deliberately promoted.

---

## 20. Model Artifact
The artifact is a single Pickle file (`model_vX.pkl`). It stores the trained Scikit‑learn estimator and the fitted preprocessing `Pipeline` (imputer, scaler, etc.). The file name encodes the model version (e.g., `model_v1.0.pkl`), providing the necessary version metadata. No separate JSON manifest or external registry is required.

---

## 21. ML Security
- No credentials, API keys, or secret tokens are embedded in the model file or training data.
- The model artifact is read‑only for the inference job.
- All security‑related environment variables remain in the backend configuration, not exposed through the API or `riskScores` documents.

---

## 22. Monitoring
The backend logs each inference run with:
- Run start/end timestamps.
- Number of locations processed.
- Count of successful predictions vs. skipped locations.
- Distribution statistics of the generated `riskScore` (min/median/max).
- Model version used.
- Any data‑availability warnings (e.g., missing weather for X locations).
These logs provide basic observability without requiring an external monitoring platform.

---

## 23. MVP vs Future
**MVP (required for the hackathon)**
- Python + Scikit‑learn.
- Tabular features listed in Section 2.
- 15‑minute scheduled inference job.
- `riskScore` (0‑1) and `riskLevel` output.
- Optional `contributingFactors` for explainability.
- Simple versioned Pickle model artifact.

**Future enhancements (labelled FUTURE)**
- Incorporate calibrated probability thresholds based on validated outbreak data.
- Automated periodic retraining pipeline.
- richer temporal features (rolling windows, trends).
- External epidemiological datasets.
- Model registry service, CI/CD for model promotion.
- More sophisticated monitoring/alerting dashboards.

---

## 24. ML Architecture Diagram
```
MongoDB
   ↓
Feature Retrieval (waterReadings, symptoms, weather)
   ↓
Data Validation
   ↓
Preprocessing Pipeline
   ↓
Feature Engineering
   ↓
Scikit‑learn Model (trained offline)
   ↓
Risk Score (0‑1)
   ↓
Risk Level (LOW/MEDIUM/HIGH)
   ↓
Contributing Factors
   ↓
`riskScores` collection
   ↓
Backend API (GET /api/risk/:location)
   ↓
GIS Dashboard / Alert Service
```
All components run within the existing backend; no extra services are introduced.

---

## 25. AI/ML Constraints
- The model does **not** diagnose disease, identify individuals, or claim causality.
- No synthetic data or invented accuracy metrics are used.
- The risk‑generation ML pipeline does not use an LLM, deep‑learning framework, or separate ML microservice. The product may contain a separate MCP‑powered AI Assistant layer for read‑only natural‑language access to existing project data. The AI Assistant does not generate or alter ML risk scores.
- The ML pipeline never directly exposes MongoDB to the frontend or ESP32 devices.
- The ML job respects the API contract and database schema; it does not modify them.
- All processing occurs inside the approved 15‑minute scheduled job.

---

## 26. Definition of Done
- Input features are defined and match fields in `DATABASE_SCHEMA.md`.
- Data alignment procedure is documented.
- Missing‑value handling strategy is described.
- Preprocessing steps are enumerated.
- Feature engineering scope is limited to approved features.
- Target/label limitations are explicitly stated (unsupervised prototype vs future supervised).
- Model‑selection workflow is defined.
- Baseline model is described.
- Evaluation metrics are listed without fabricated numbers.
- Risk‑score generation and normalization are specified.
- LOW/MEDIUM/HIGH output categories are defined.
- Explainability approach (contributingFactors) is included.
- Model versioning scheme is defined.
- 15‑minute inference schedule is detailed.
- Failure handling scenarios are covered.
- Training vs inference responsibilities are separated.
- MVP vs future work distinctions are clear.
- No false performance claims are made.
- No changes to architecture, API contract, or database schema are introduced.

---

*This specification is the authoritative reference for the AI/ML component of the SRCAS Hackathon 3.0 prototype.*