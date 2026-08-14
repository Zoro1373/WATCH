# AI_ML_SPEC.md
Version: 1.1
Status: LOCKED

> **Version Note (v1.1):** Added explicit Village ↔ Water Source ↔ Sensor geographic relationship and Assam GIS context while preserving the existing ML pipeline and 11-feature Isolation Forest design.

## 1. Purpose
The AI component provides a **water-source-level early-warning risk indicator** for water-contamination-related health risk. It aggregates recent water-quality sensor telemetry from monitored water bodies, community symptom reports from associated villages, and local weather observations to generate a normalized **riskScore** (0.0 – 1.0) and an operational risk level (`LOW`, `MEDIUM`, `HIGH`).

The model does **not** diagnose disease, predict individual clinical outcomes, or claim medically validated infection probabilities.

---

## 1.1 AI Assistant Overview
The product includes a separate NitroStack MCP‑powered AI Assistant that provides read‑only natural‑language access to existing project data via the MCP server and read‑only tools. This assistant operates **outside** the risk‑generation ML pipeline and does **not** generate or modify risk scores. The risk scores continue to be produced exclusively by the Isolation Forest model described in this specification.

---

## 2. ML Input Data
The scheduled Python/Scikit‑learn job reads historical documents from MongoDB collections defined in **DATABASE_SCHEMA.md**.

| Source Collection | Fields Used as Model Inputs |
| :--- | :--- |
| `waterReadings` | `ph`, `tds`, `turbidity`, `temperature` |
| `symptoms` | `feverCount`, `diarrheaCount`, `vomitingCount`, `abdominalPainCount` |
| `weather` | `temperature` (ambient), `precipitation`, `humidity` |
| Domain Context (Metadata only) | `waterSourceId`, `location`, `timestamp` for data alignment |

> **Strict 11-Feature Constraint:** Exactly 4 water features + 4 symptom features + 3 weather features are fed into the ML vector. No Dissolved Oxygen (DO), Conductivity, or demographic features are introduced.

---

## 3. Data Alignment & Geographic Aggregation
The inference pipeline aligns multi-modal data using the domain hierarchy:

```
Monitored Water Source (sourceId)
   ├── Attached Sensor Node Telemetry (waterReadings for matching nodeId)
   ├── Community Symptoms (symptoms aggregated for all villages where primaryWaterSourceId == sourceId)
   └── Regional Weather (weather cached for the water source district/location)
         ↓
   [ 11-Feature Aligned Vector ]
         ↓
   Isolation Forest Engine
         ↓
   riskScore (0.0 – 1.0) & riskLevel (LOW / MEDIUM / HIGH) assigned to Water Source
```

### Alignment Procedure:
1. **Target Entities**: The job iterates over each active monitored water body in `waterSources` (e.g., `SRC_001`, `SRC_002`, `SRC_003`).
2. **Water Telemetry**: Queries the latest `waterReadings` document emitted by the node assigned to that water source (`sensorNodes.waterSourceId == sourceId`) within the observation window (default: 60 minutes).
3. **Symptom Aggregation**: Identifies all villages prototype-associated with the water source (`villages.primaryWaterSourceId == sourceId`) and sums their latest symptom counts (`feverCount`, `diarrheaCount`, `vomitingCount`, `abdominalPainCount`).
4. **Weather Snapshot**: Queries the latest cached `weather` document matching the water source's location/district.
5. **Vector Assembly**: Merges the 11 numeric features. If data is absent within the window, features are set to **null** for preprocessing imputation.
6. **Unmonitored Villages**: If a village has no `primaryWaterSourceId` or is associated with an unmonitored source, it remains `UNMONITORED`. The system does **not** invent or synthesize a risk score for that village.

> **Crucial Rule:** Geographic identifiers (`villageId`, `district`, `sourceId`, `location`) are used solely as keys for data alignment; they are **never** appended as numerical features in the ML vector. No demographic, clinical, or unapproved features (DO, conductivity, population) are passed to the model.

---

## 4. Preprocessing
| Step | Description |
| :--- | :--- |
| **Type enforcement** | Ensure numeric fields are floats/integers as defined; coerce when possible, otherwise mark as null. |
| **Missing‑value handling** | Missing values remain **null** in the dataframe. The preprocessing pipeline applies `SimpleImputer(strategy='median')` fitted on the training baseline. |
| **Invalid value detection** | Values outside valid physical ranges (e.g., pH < 0 or > 14, TDS < 0, turbidity < 0, temperature < -50°C) are flagged and coerced to null. |
| **Duplicate removal** | Duplicate sensor readings identified by `{nodeId, timestamp}` are dropped prior to feature extraction. |
| **Timestamp normalization** | All dates are normalized to UTC `datetime` objects. |
| **Scaling** | `StandardScaler` (or `RobustScaler`) fitted on baseline features during offline training is applied during inference. |

---

## 5. Feature Engineering
### Approved Input Features (MVP)
- **Raw water measurements (4)**: latest `ph`, `tds`, `turbidity`, `temperature`.
- **Aggregated symptom counts (4)**: latest `feverCount`, `diarrheaCount`, `vomitingCount`, `abdominalPainCount`.
- **Current weather (3)**: latest `temperature`, `precipitation`, `humidity`.

Total: **11 features**.

---

## 6. Target / Label Definition & Model Formulation
Because no verified outbreak-ground-truth label dataset exists, the system implements an **unsupervised anomaly detection** approach:

```
Multi-modal Sensor + Symptom + Weather Data
     ↓
Isolation Forest
     ↓
Raw Anomaly Score
     ↓
Min-Max Normalization (0.0 to 1.0)
     ↓
riskScore
     ↓
Threshold Mapping (LOW / MEDIUM / HIGH)
```

Isolation Forest is the sole production model for the MVP.

---

## 7. Model Selection & Architecture
- **Algorithm**: `sklearn.ensemble.IsolationForest`
- **Parameters**: `n_estimators=100`, `contamination=0.1` (configurable baseline).
- **Inference Output**: The decision function score is inverted and normalized such that higher values represent greater anomaly/risk.

---

## 8. Risk Score Generation & Thresholds
1. **Raw Score**: Isolation Forest evaluates multivariate deviance across the 11 features.
2. **Normalized `riskScore`**: Scored between `0.00` and `1.00`.
3. **Operational Thresholds**:
   - **`LOW` Risk**: `riskScore < 0.40` (Baseline / Normal)
   - **`MEDIUM` Risk**: `0.40 <= riskScore < 0.70` (Advisory / Moderate Deviation)
   - **`HIGH` Risk**: `riskScore >= 0.70` (Elevated Anomaly / Immediate Action Alert)

---

## 9. Explainability & Contributing Factors
During inference, the pipeline extracts the snapshot of values from the 11 features and computes their deviation relative to baseline medians. This summary is persisted in `riskScores.contributingFactors` for dashboard display and read-only MCP Assistant queries:
- `ph`: 6.8
- `tds`: 420.0
- `turbidity`: 8.4
- `temperature`: 28.2
- `feverCount`: 12
- `diarrheaCount`: 5
- `vomitingCount`: 3
- `abdominalPainCount`: 4
- `weatherTemperature`: 27.5
- `precipitation`: 0.0
- `humidity`: 80.0

These values represent contributing context, not clinical proof of causality.

---

## 10. Model Artifact & Versioning
- Persisted artifact: `model_v1.1.pkl` (contains trained IsolationForest estimator and fitted preprocessing Pipeline).
- Version tag `v1.1` is recorded in each generated `riskScores` document.

---

## 11. Inference Pipeline Execution
```
Scheduled Cron (Every 15 Minutes)
   ↓
Query active waterSources from MongoDB
   ↓
For each source:
   1. Fetch latest waterReadings for attached nodeId
   2. Fetch and sum latest symptoms for associated villageIds
   3. Fetch latest weather for source district/location
   4. Construct 11-feature vector
   5. Apply preprocessing Pipeline
   6. Execute Isolation Forest inference
   7. Normalize to riskScore (0.0 - 1.0) and map to LOW/MEDIUM/HIGH
   8. Write document to riskScores collection (keyed by waterSourceId)
```

---

## 12. AI/ML Constraints & Boundary Declarations
- The ML model does **not** make clinical disease diagnoses.
- The ML model evaluates risk for the **Monitored Water Source**, not individual persons or households.
- Geographic entities are used strictly for **data alignment**, not as ML numerical features.
- No new features, deep-learning models, or LLM-generated risk scores are permitted in the pipeline.