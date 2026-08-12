# TENET SRCAS Hackathon 3.0
Version: 1.0
Status: LOCKED
## Project Overview

This project implements an **AI‑powered water‑contamination tracking and epidemic early‑warning system**.  It continuously ingests water‑quality sensor data, community‑reported symptoms, and weather information, then uses an unsupervised machine‑learning model to produce a **location‑level risk indicator**.  The risk indicator (a normalized `riskScore` between 0 and 1 and a categorical `riskLevel` of `LOW`, `MEDIUM` or `HIGH`) is visualised on a GIS dashboard and can trigger alerts.  An optional read‑only MCP‑powered AI Assistant provides natural‑language access to the existing data.

> **Important:** The system does **not** diagnose disease, predict individual health outcomes, or claim medically‑validated probabilities.  It is strictly an early‑warning indicator.

---

## 1. How the System Works

```
IoT / Sensor Simulator
    ↓ (HTTPS POST /api/sensor)
Node.js Backend
    ↓ (MongoDB persistence)
MongoDB
    ↓ (Python + Scikit‑learn)
Isolation Forest (MVP)
    ↓ (riskScore 0‑1, riskLevel)
MongoDB (riskScores collection)
    ↓ (Backend API)
React GIS Dashboard
    ↓ (Alerts UI)
```

**Stage Overview**
- **IoT / Sensor Simulator** – Generates synthetic `ph`, `tds`, `turbidity`, `temperature`, along with `nodeId`, `timestamp`, `latitude`, and `longitude`.  The simulator mimics a 5‑minute sampling interval and provides an accelerated demo mode.
- **Backend** – Validates the incoming payload, enforces the API‑key authentication defined in `API_CONTRACT.md`, and stores data in the MongoDB collections described in `DATABASE_SCHEMA.md`.
- **ML Pipeline** – A Python script (Scikit‑learn, Isolation Forest) retrieves the latest water, symptom, and weather records, validates them, applies preprocessing and feature engineering, computes an anomaly score, normalises it to the 0‑1 `riskScore`, and maps the score to `LOW`/`MEDIUM`/`HIGH`.
- **Frontend** – A React GIS dashboard displays locations, risk levels, risk scores, recent sensor readings, symptom counts, weather data, and any generated alerts.
- **MCP Assistant** – Runs on NitroStack, exposing six read‑only tools (`get_location_risk`, `get_water_readings`, `get_symptom_data`, `get_weather`, `get_risk_history`, `get_contributing_factors`).  Users can ask natural‑language questions (e.g., “Why is this location high risk?”) and receive explanations based on existing data.

---

## 2. Key Features

- **Synthetic IoT sensor simulation** (no physical hardware). 
- **REST API** for sensor ingestion, symptom ingestion, and weather cache (`POST /api/sensor`, `POST /api/symptom`, `GET /api/weather/:location`).
- **MongoDB** storage of all historical data (`sensorNodes`, `waterReadings`, `symptoms`, `weather`, `riskScores`, `alerts`).
- **Python + Scikit‑learn** Isolation Forest model (unsupervised anomaly scoring). 
- **Risk output**: `riskScore` (0‑1) and categorical `riskLevel` (`LOW`, `MEDIUM`, `HIGH`).
- **Contributing‑feature summary** attached to each `riskScores` document.
- **React GIS dashboard** with map visualisation, risk colour‑coding, and alert UI.
- **Alert mechanism** based on configurable `MEDIUM`/`HIGH` thresholds.
- **NitroStack MCP Assistant** with read‑only tools for data retrieval and explanation.

---

## 3. AI / ML Details

The ML design is documented in `AI_ML_SPEC.md`.  In brief:
- **Language & framework**: Python 3 with Scikit‑learn.
- **Model**: Isolation Forest (MVP unsupervised approach) because no verified outbreak‑label dataset exists.
- **Input categories**:
  - *Water*: `ph`, `tds`, `turbidity`, `temperature`
  - *Symptoms*: `feverCount`, `diarrheaCount`, `vomitingCount`, `abdominalPainCount`
  - *Weather*: `temperature`, `precipitation`, `humidity`
- **Pipeline steps**: data retrieval → validation → preprocessing (type enforcement, null handling, scaling) → feature engineering → Isolation Forest → anomaly score → min‑max normalisation → `riskScore` → risk‑level mapping.
- **Output**: a `riskScore` (0‑1) and a categorical `riskLevel`.  The model also records `contributingFactors` for explainability.
- **Constraints**: No medical probabilities, no causal claims, and no fabricated performance metrics.

---

## 4. MCP AI Assistant

The MCP Assistant is a **separate product layer** and does **not** participate in risk‑score generation.

```
User
    ↓
AI Assistant
    ↓
NitroStack MCP Server
    ↓
Read‑only tools
    ↓
Backend / API
    ↓
MongoDB
```

**Read‑only tools** (all return data without modifying anything):
1. `get_location_risk(location)`
2. `get_water_readings(location, timeRange)`
3. `get_symptom_data(location, timeRange)`
4. `get_weather(location, timeRange)`
5. `get_risk_history(location, timeRange)`
6. `get_contributing_factors(location)`

The Assistant can answer queries such as:
- “Why is this location high risk?”
- “What is the current risk in this location?”
- “Show recent water readings.”
- “Are symptom counts increasing?”
- “What weather conditions were recorded?”
- “Show the recent risk history.”

All interactions are **read‑only**; the Assistant never creates or modifies sensor data, symptoms, weather, risk scores, alerts, or ML models, and it does not have direct access to MongoDB credentials.

---

## 5. System Architecture Diagrams

**Core System**
```
ESP32 / IoT Simulator
    ↓
Node.js Backend
    ↓
MongoDB
    ↓
Python + Scikit‑learn (Isolation Forest)
    ↓
riskScores collection
    ↓
Backend API
    ↓
React GIS Dashboard
    ↓
Alerts
```

**MCP Assistant Layer**
```
User
    ↓
AI Assistant
    ↓
NitroStack MCP Server
    ↓
Read‑only tools
    ↓
Backend / API
    ↓
MongoDB
```

*The MCP layer operates independently of the core risk‑generation pipeline.*

---

## 6. Technology Stack

| Layer | Technology |
|-------|--------------|
| Frontend | React, GIS/map visualisation |
| Backend | Node.js, REST API (as defined in `API_CONTRACT.md`) |
| Database | MongoDB |
| ML | Python, Scikit‑learn, Isolation Forest |
| IoT / Simulator | ESP32‑style data generator, HTTPS POST |
| MCP Assistant | NitroStack, read‑only tool endpoints |

---

## 7. Data Flow Summary

- **IoT**: Synthetic sensor payload → `POST /api/sensor` → Backend validation → MongoDB `waterReadings`.
- **Symptoms**: Community symptom JSON → `POST /api/symptom` → Backend → MongoDB `symptoms`.
- **Weather**: Backend fetches external weather, caches in `weather` collection.
- **ML**: Reads the three collections, runs preprocessing & Isolation Forest, writes `riskScores`.
- **Frontend**: Calls the risk, sensor, symptom, and weather endpoints to render the GIS dashboard and alerts.
- **MCP**: Assistant queries the read‑only tools, which internally call the same backend endpoints; results are presented to the user.

---

## 8. Demo Flow

1. **NORMAL** – The simulator emits stable synthetic readings; the ML model outputs a low anomaly → `LOW` risk shown on the map; no alerts are generated.
2. **WATER QUALITY CHANGE** – Sensor values gradually drift to abnormal ranges; anomaly score rises, leading to `MEDIUM`/`HIGH` risk levels and corresponding dashboard updates.
3. **COMBINED RISK** – Abnormal water data combined with increased synthetic symptom counts and adverse weather (e.g., high precipitation) produce a higher anomaly score; the dashboard displays an elevated risk and lists contributing features.
4. **MCP QUERY** – A user asks the AI Assistant “Why is this location high risk?”; the MCP Assistant retrieves the stored risk result and contributing factors via the read‑only tools and returns an explanation such as “Elevated turbidity and increased fever reports are among the contributing features.”

All demo data are synthetic; no claim is made about real measurements or medical outcomes.

---

## 9. Project Structure (planned)

```
AquaSentry/
├─ backend/          # Node.js server, API implementation
├─ frontend/         # React GIS dashboard
├─ iot/              # Synthetic sensor simulator
├─ ml/               # Python Isolation Forest pipeline
├─ mcp/              # NitroStack server and read‑only tools
├─ README.md         # This document
├─ PROJECT_ARCHITECTURE.md
├─ API_CONTRACT.md
├─ DATABASE_SCHEMA.md
├─ AI_ML_SPEC.md
└─ TEAM_TASKS.md
```

Directories will be created as implementation progresses.

---

## 10. Setup / Installation

*Implementation‑specific setup instructions will be added as modules are built.*  At a high level:
- Install Node.js dependencies for the backend.
- Install React dependencies for the frontend.
- Install Python dependencies (`scikit-learn`, etc.) for the ML pipeline.
- Configure environment variables for MongoDB connection, API keys, and any required credentials (never commit secrets).
- Run the IoT simulator, backend server, and MCP server concurrently during development.

---

## 11. Environment Variables & Secrets

All secrets (MongoDB URI, API keys, MCP credentials, weather API keys) **must** be stored in environment variables or a secret manager and **must never** be committed to the repository.

---

## 12. API Summary

The full API contract is defined in `API_CONTRACT.md`.  Briefly:
- **Authentication** – API‑key header `X‑API‑KEY` required for all endpoints.
- **Endpoints** – Sensor ingestion (`POST /api/sensor`), symptom ingestion (`POST /api/symptom`), weather cache (`GET /api/weather/:location`), risk retrieval (`GET /api/risk/:location`), and alert handling.

---

## 13. Database Overview

MongoDB holds the following collections (schema, indexes, and validation rules are detailed in `DATABASE_SCHEMA.md`):
- `sensorNodes`
- `waterReadings`
- `symptoms`
- `weather`
- `riskScores`
- `alerts`

---

## 14. Security & Safety

- The backend is the sole data‑access boundary; the frontend and MCP never connect directly to MongoDB.
- MCP tools are **read‑only** and have no access to MongoDB credentials.
- Secrets are kept out of source control.
- Synthetic data is clearly identified as such; no claim is made that it reflects real measurements.
- `riskScore` is an **early‑warning indicator**, not a medical probability.
- No causal relationships are implied between features and risk.

---

## 15. Limitations

- No physical water‑quality sensors are used; all sensor data are simulated.
- No verified outbreak‑label dataset exists, so the ML model relies on unsupervised anomaly scoring.
- Risk thresholds are prototype‑configurable and not medically validated.
- The system provides early‑warning information, not a medical diagnosis.
- Demo symptom and weather data may also be synthetic.

---

## 16. Future Enhancements

- Integration of real sensor hardware (pH, TDS, turbidity, DS18B20). 
- Acquisition of a labeled outbreak dataset to enable supervised learning. 
- Calibration of risk thresholds based on scientific validation. 
- Expanded feature set (e.g., additional environmental variables). 
- Automated model retraining and monitoring pipelines. 
- Production‑grade deployment, scaling, and observability.

---

## 17. Team

| Member | Responsibilities |
|--------|-------------------|
| **Member 1** | Architecture, AI/ML pipeline, system integration, MCP guidance |
| **Member 2** | Synthetic IoT sensor simulation and POST `/api/sensor` integration |
| **Member 3** | Node.js backend, REST API implementation, MongoDB schema & validation |
| **Member 4** | React GIS dashboard, alerts UI, NitroStack MCP server, read‑only tools |

---

## 18. Documentation Map

- `PROJECT_ARCHITECTURE.md` – System architecture source of truth.
- `API_CONTRACT.md` – Full API definition.
- `DATABASE_SCHEMA.md` – MongoDB schema, indexes, validation.
- `AI_ML_SPEC.md` – ML pipeline specification.
- `TEAM_TASKS.md` – Ownership, implementation phases, testing, and demo plan.
- `README.md` – This high‑level project overview and getting‑started guide.

---

## 19. Hackathon Demo Pitch

> **Our system combines water‑quality signals, community symptom reports, and weather context to generate a location‑level early‑warning risk indicator, visualises it on an interactive GIS map, and provides controlled natural‑language access via a read‑only MCP Assistant.**

The prototype respects privacy, uses only synthetic sensor data, and follows the locked architecture and contracts.
