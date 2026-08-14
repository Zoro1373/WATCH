# PROJECT_ARCHITECTURE.md
Version: 1.1
Status: LOCKED

> **Version Note (v1.1):** Added explicit Village ↔ Water Source ↔ Sensor geographic relationship and Assam GIS context while preserving the existing ML pipeline and 11-feature Isolation Forest design.

## 1. Project Overview
A rapid‑prototype system that continuously monitors water quality at community water sources, aggregates environmental and community symptom data, and computes a risk score indicating the likelihood of a water‑borne disease outbreak. The risk score is visualized on an interactive GIS dashboard and triggers alerts via SMS or push notifications.

The system incorporates real Assam geographic context (e.g., Majuli River Island, Deepor Beel wetland, Cachar/Barak River reach) for realistic spatial mapping. Real geographic locations are used for contextual awareness; sensor telemetry is simulated; and Village → Water Source operational/drinking relationships are explicitly designated as prototype associations unless independently verified.

## 2. Problem Definition
- **Water‑borne contamination** can cause disease outbreaks, especially in vulnerable riverine, wetland, and rural regions with limited laboratory testing.
- **Early detection** of deteriorating water quality, combined with community‑reported symptoms and weather trends, can enable authorities to act before a full‑scale epidemic develops.
- Existing solutions are either **high‑cost** (lab testing) or **disconnected** (separate environmental and health data streams).

## 3. System Goals
| Goal | Description |
|------|-------------|
| Real‑time monitoring | Sensor telemetry collected at ≥5 min intervals and pushed to the backend (simulated for prototype). |
| Integrated data view | Combine water quality from monitored water sources, crowd‑sourced symptom reports from associated villages, and weather data. |
| Predictive risk scoring | Generate a low/medium/high risk level for monitored water sources using a lightweight ML model (Isolation Forest). |
| Immediate alerting | Notify officials and communities when water-source risk rises to medium/high. |
| 24‑hour hackathon viability | Simple, single‑process backend, minimal cloud services, easy deployment. |
| Low cost & low power | ESP32 architecture + inexpensive analog sensors, battery or solar powered (modeled via IoT simulator). |

## 4. High‑Level Architecture
```
Real Assam Geography
   ↓
Villages (e.g., Kamalabari, Salmora, Pamohi, Sonabarighat)
   ↓ (Prototype Association)
Primary Water Sources (e.g., Brahmaputra Majuli Reach, Deepor Beel, Barak River)
   ↓
Simulated Sensor Nodes (NODE001, NODE002, NODE003)
   ↓
Water Readings (pH, TDS, Turbidity, Temperature)
   +
Community Symptom Reports (feverCount, diarrheaCount, vomitingCount, abdominalPainCount)
   +
Weather Data (Temperature, Precipitation, Humidity)
   ↓
Python / Scikit‑learn AI Engine (Isolation Forest — 11 Features)
   ↓
Risk Score (LOW / MEDIUM / HIGH) assigned to Monitored Water Source
   ↓
GIS Dashboard (Assam Geographic Context + Telemetry & Risk Overlays) + Alert Service
```

## 5. Component Architecture

| Component | Purpose | Inputs | Outputs | Technology | Dependencies | Communication |
|-----------|---------|--------|---------|------------|--------------|----------------|
| **ESP32 Sensor Node / IoT Simulator** | Acquire/simulate on‑site water quality metrics for monitored water sources. | Raw/simulated analog signals from pH, TDS, turbidity, temperature sensors. | JSON payload `{nodeId, timestamp, latitude, longitude, ph, tds, turbidity, temperature}`. | ESP32‑Arduino / Node.js simulator. | Power source, Wi‑Fi connectivity. | HTTPS POST over Wi‑Fi. |
| **Communication Layer** | Transport sensor payloads reliably (MVP). | JSON payloads from ESP32 / simulator. | HTTPS POST messages to backend. | Wi‑Fi router (LoRaWAN optional for future rural deployment), TLS. | Internet connectivity, router config. | HTTPS (REST) over Wi‑Fi. |
| **Node.js Backend API** | Ingest sensor data, manage villages/water sources, receive symptom reports, and serve queries. | Sensor JSON, symptom submissions, weather API responses, GIS queries. | Acknowledgement (200/201), stored documents, risk‑score endpoint, GIS data. | Express.js, body‑parser, cors. | MongoDB driver, external Weather API client. | REST (JSON over HTTPS). |
| **MongoDB** | Persist villages, water sources, sensor nodes, time‑series water data, symptoms, weather, and computed risk scores. | Write requests from backend. | Queryable collections (`villages`, `waterSources`, `sensorNodes`, `waterReadings`, `symptoms`, `weather`, `riskScores`, `alerts`). | MongoDB Community Edition (local or Atlas). | Node.js driver, appropriate indexes. | BSON over TCP (standard Mongo protocol). |
| **AI/ML Engine** | Compute early-warning risk from multi‑modal data aligned by water source. | Aligned data set (water telemetry + associated village symptoms + weather). | Risk level (LOW/MEDIUM/HIGH) + normalized riskScore (0–1). | Python 3.11/3.12, scikit‑learn (Isolation Forest), pandas, NumPy. | Access to MongoDB, persisted model artifact. | Scheduled job (node-cron) or on‑demand via HTTP endpoint. |
| **GIS Dashboard** | Visualize spatial risk across Assam geographic context, water sources, and associated settlements. | Risk scores, water source locations, village locations, sensor status, weather overlays. | Interactive map, risk legend (LOW/MED/HIGH/UNMONITORED), village health summaries. | React 18, Leaflet/Mapbox GL, Axios. | Backend API, external GIS tiles. | HTTPS (REST JSON). |
| **Alert System** | Notify stakeholders when water source risk escalates. | Risk level change events (MEDIUM/HIGH). | SMS/Push messages. | Twilio (SMS) or Firebase Cloud Messaging (push). | Backend webhook, API keys. | HTTPS POST to provider API. |
| **Weather Service** | Supply contextual environmental data. | Location coordinates / district, timestamp. | Forecast/observation JSON (temperature, precipitation, humidity). | OpenWeatherMap API (or cached provider). | API key, internet. | HTTPS GET. |

## 6. Hardware & Simulation Architecture
- **ESP32 Development Board** – central MCU, Wi‑Fi enabled, low‑power deep‑sleep (simulated via IoT simulator for prototype).
- **pH Sensor (Analog)** – measures acidity; signal conditioned via op‑amp.
- **TDS Sensor (Analog)** – conductivity‑based total dissolved solids.
- **Turbidity Sensor (Analog)** – light‑scattering measurement.
- **Temperature Sensor (DS18B20 waterproof)** – water temperature.
- **Power** – 3.7 V Li‑Po battery + solar panel (optional) with a charging circuit.
- **Enclosure** – IP66 waterproof housing with cable glands for sensor leads.

> **Simulation Disclaimer:** Physical sensors are not currently installed in Assam water bodies. The IoT simulator emits valid payloads representing realistic sensor behaviors for registered prototype nodes (`NODE001`, `NODE002`, `NODE003`).

## 7. Backend Architecture
- **Single‑process Node.js server** exposing REST endpoints:
  - `POST /api/sensor` – sensor payload ingestion.
  - `POST /api/symptom` – community symptom submission (associated with villageId).
  - `GET /api/villages` – retrieval of Assam settlements and associated water sources.
  - `GET /api/water-sources` – retrieval of monitored water bodies and monitoring status.
  - `GET /api/risk/:location` & `GET /api/risk/source/:sourceId` – latest risk score.
  - `GET /api/weather/:location` – cached weather data.
- **Scheduler** (node‑cron) triggers data aggregation and ML inference every 15 minutes.
- **Error logging** via `winston` to a rotating file.

## 8. Database Layer
- **Collections**
  - `villages` (Assam settlements, district, location, `primaryWaterSourceId`, `verificationStatus`)
  - `waterSources` (Monitored rivers/wetlands, location, `servedVillageIds`, `monitoringStatus`)
  - `sensorNodes` (Registered nodes, `waterSourceId`, status, `isSimulated`)
  - `waterReadings` (Indexed by `nodeId` + `timestamp`, stores `ph`, `tds`, `turbidity`, `temperature`)
  - `symptoms` (Indexed by `villageId` + `timestamp`, stores `feverCount`, `diarrheaCount`, `vomitingCount`, `abdominalPainCount`)
  - `weather` (Cached per district/location, refreshed hourly)
  - `riskScores` (Indexed by `waterSourceId` + `timestamp`, stores `riskScore`, `riskLevel`, `contributingFactors`)
  - `alerts` (Indexed by `waterSourceId` / status)
- **Design**: Time‑series and domain documents with minimal nesting to simplify queries.
- **TTL Index** on `waterReadings` & `symptoms` to auto‑expire data older than 30 days (prototype only).

## 9. AI/ML Layer
1. **Data Pre‑processing & Geographic Alignment** – For each monitored water source, retrieve recent water telemetry from its attached sensor node, aggregate symptom counts from all associated villages (`primaryWaterSourceId == sourceId`), and merge with local weather observations.
2. **Feature Set (Strict 11 Features)** – 
   - Water: `ph`, `tds`, `turbidity`, `temperature`
   - Symptoms: `feverCount`, `diarrheaCount`, `vomitingCount`, `abdominalPainCount`
   - Weather: `temperature` (ambient), `precipitation`, `humidity`
3. **Model** – Scikit‑learn **Isolation Forest** unsupervised anomaly scoring pipeline.
4. **Inference** – Raw anomaly score inverted and min-max normalized to `riskScore` (0.0 to 1.0); thresholds: <0.40 → LOW, 0.40–0.69 → MEDIUM, ≥0.70 → HIGH.
5. **Deployment** – Python script run as a scheduled job (`*/15 * * * *`) that reads aligned data from Mongo and writes back to `riskScores` keyed by `waterSourceId`.

*The model produces early-warning risk scores for monitored water sources; it does NOT diagnose disease, identify individuals, or claim causal clinical predictions.*

## 10. Frontend & GIS Architecture
- **React SPA** with interactive GIS mapping.
- **GIS Map Component** – Visualizes real Assam geography (Majuli, Kamrup Metro/Guwahati, Cachar/Silchar), settlements, and water bodies. Layers include:
  - Real Assam geographic context (districts and villages).
  - Monitored Water Source markers with risk color-coding:
    - 🟢 **LOW** (< 0.40) — Baseline / Normal
    - 🟡 **MEDIUM** (0.40 – 0.69) — Advisory
    - 🔴 **HIGH** (≥ 0.70) — Immediate Investigation Alert
    - ⚪ **UNMONITORED** — Water body without active telemetry
  - Simulated Sensor Node badges (`NODE001`, `NODE002`, `NODE003`).
  - Associated Village catchment indicator lines.
- **Dashboard Panels** – Monitored source quality telemetry, community symptom intake form, weather status, and active alerts.
- **State Management** – React Context for global state.

## 11. External Services
| Service | Role | Integration |
|---------|------|-------------|
| Weather API (e.g., OpenWeatherMap) | Provide temperature, precipitation, humidity for monitored districts. | Backend fetches hourly, stores in `weather`. |
| GIS/Mapping (OSM / Mapbox tiles) | Base map for Assam regional dashboard. | Tile URL in Leaflet/Mapbox. |
| SMS/Notification (Twilio) | Send alerts to officials / community phone numbers. | Backend triggers POST to Twilio REST API when risk changes to medium/high. |

## 12. End‑to‑End Data Flow
1. **Sampling / Simulation** – ESP32 / IoT simulator generates reading for `NODE001` → HTTPS POST to `/api/sensor`.
2. **Ingestion** – Backend validates `nodeId`, links to registered water source, stores in `waterReadings`.
3. **Symptom Entry** – Community users submit symptoms for a specific village via React form → `POST /api/symptom` (with `villageId`) → stored in `symptoms`.
4. **Weather Refresh** – Backend cron fetches regional weather, updates `weather`.
5. **Aggregation & ML Inference** – Python job runs every 15 minutes, aligns water data + associated village symptoms + weather into the 11-feature vector, and runs Isolation Forest.
6. **Risk Persistence** – Result written to `riskScores` referencing `waterSourceId`.
7. **Dashboard Update** – Frontend polls `/api/risk` / GIS endpoints, refreshes map colors and node status.
8. **Alert Trigger** – If new risk level ≥ MEDIUM, backend logs alert and triggers notification service.

## 13. Error Handling Strategy
- **Sensor Node / Simulator** – Retries up to 3 times on network failure; buffers data if offline.
- **Backend** – Input validation (schema via `joi`/validation rules); malformed payloads return **400** with error detail.
- **Database** – Write failures logged and retried with exponential back‑off.
- **ML Job** – Exceptions caught; error logged and job skipped; missing data handled gracefully via imputation pipeline without inventing false records.
- **Alert Service** – On Twilio failure, message queued for retry.

## 14. Security Considerations
- **Transport Security** – All external traffic uses HTTPS with TLS 1.2+.
- **API Authentication** – Prototype uses API keys in `X-API-KEY` header.
- **Data Sanitization** – Server validates numeric ranges for sensor values and symptom counts.
- **Rate Limiting** – Express middleware limits sensor endpoint to 60 req/min per node.
- **Database Access** – MongoDB bound to localhost or VPC with authentication; credentials never exposed to frontend or MCP Assistant.

## 15. Offline/Connectivity Strategy
- **Sensor Simulator / Node** – Buffers readings if network is unreachable; flushes on reconnection.
- **Backend** – Uses last cached weather record (≤ 3 h old) if external weather API is unavailable.
- **Dashboard** – Displays "last updated" timestamp and graceful fallback states.

## 16. Deployment Architecture
```
[ESP32 / IoT Simulator] --> Internet (Wi‑Fi) --> [Node.js Server (single VM or Docker container)]
                                                      |
                                                      v
                                               [MongoDB (single instance, local or Atlas)]
                                                      |
                                                      v
                                         [Python ML job (cron on same VM) ] 
                                                      |
                                                      v
                                           [React static files / GIS]
```

## 17. Scalability Considerations
| Dimension | Current Prototype | Simple Scaling Path |
|-----------|-------------------|---------------------|
| **Sensor Nodes** | Up to ~50 nodes (Wi‑Fi / simulated). | Deploy additional gateways or transition to LoRaWAN. |
| **Backend Load** | Single Node.js process handles < 10 req/s. | Horizontal scale with Node.js cluster behind Nginx. |
| **Database** | MongoDB single instance (≈10 k docs/day). | Upgrade to replica set; add geospatial indexing on geographic collections. |
| **ML Processing** | 15‑minute scheduled batch inference. | Optimize batch queries or evaluate streaming inference if real-time needed. |
| **Dashboard Users** | < 100 concurrent browsers. | Deploy React app on CDN; cache GIS summary endpoints. |

## 18. Technology Stack
| Layer | Technology | Version (as of Aug 2026) |
|-------|------------|--------------------------|
| **Hardware / IoT** | ESP32‑DevKitC / Synthetic Simulator, analog pH/TDS/Turbidity, DS18B20 temp | ESP-IDF v5.2 / Node.js simulator |
| **Communication** | HTTPS POST (TLS 1.2) | N/A |
| **Backend** | Node.js, Express.js | v20.12.0 |
| **Database** | MongoDB Community Server | v7.0 |
| **ML** | Python, scikit‑learn (Isolation Forest), pandas, NumPy | 3.12 / sklearn 1.5 |
| **Frontend** | React 18, Leaflet, Axios | 18.2 / 1.9 |
| **MCP Assistant** | NitroStack, Model Context Protocol | Latest |
| **External APIs** | OpenWeatherMap, Mapbox/OSM tiles, Twilio SMS | Latest |

## 19. Architecture Constraints
- **No micro‑service architecture** – All backend logic lives in a single Node.js process.
- **No message brokers or complex streaming** – MVP communication uses HTTPS request‑response.
- **No GraphQL or MQTT** – Standard REST API is used.
- **Prototype‑only ML** – Scikit‑learn Isolation Forest; no deep-learning or LLM in the core risk-scoring pipeline.
- **Read-Only MCP Assistant** – MCP tools query existing data via backend APIs; MCP never writes to database, alters ML scores, or accesses DB credentials.

## 20. Future Extensions
| Extension | Description | Impact on Architecture |
|----------|-------------|------------------------|
| **Edge ML** | Run lightweight inference on ESP32 (e.g., TensorFlow‑Lite). | Adds on‑device model, reduces backend load. |
| **Validated Health Schemes** | Integrate verified Jal Jeevan Mission utility maps. | Elevates prototype associations to verified drinking water schemes. |
| **Physical Sensor Rollout** | Deploy physical solar-powered hardware in Assam water bodies. | Replaces simulated telemetry with physical hardware feeds. |
| **User Authentication** | Role‑based access for health officials vs. public. | JWT auth, role middleware, secure storage. |

---

## Architecture Decision Rules
1. **Technology Additions** – Any new language, framework, or major library requires unanimous team approval.
2. **Infrastructure Changes** – Introducing message brokers, Kubernetes, or microservices is prohibited for MVP.
3. **Data Model Alterations** – Adding or modifying collections/fields in MongoDB must be documented in `DATABASE_SCHEMA.md` and approved.
4. **Data Integrity** – Real geographic names must not be conflated with physical sensor deployment or verified clinical causation.

---

*Prepared for the SRCAS Hackathon 3.0 prototype. Updated to v1.1 reflecting real Assam geography, prototype association boundaries, and the 11-feature Isolation Forest pipeline.*