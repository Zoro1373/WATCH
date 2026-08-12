# PROJECT_ARCHITECTURE.md
Version: 1.0
Status: LOCKED

## 1. Project Overview
A rapid‑prototype system that continuously monitors water quality at community water sources, aggregates environmental and symptom data, and computes a risk score indicating the likelihood of a water‑borne disease outbreak. The risk score is visualized on a GIS dashboard and triggers alerts via SMS or push notifications.

## 2. Problem Definition
- **Water‑borne contamination** can cause disease outbreaks, especially in regions with limited laboratory testing.
- **Early detection** of deteriorating water quality, combined with community‑reported symptoms and weather trends, can enable authorities to act before a full‑scale epidemic develops.
- Existing solutions are either **high‑cost** (lab testing) or **disconnected** (separate environmental and health data streams).

## 3. System Goals
| Goal | Description |
|------|-------------|
| Real‑time monitoring | Sensor data collected at ≥5 min intervals and pushed to the backend. |
| Integrated data view | Combine water quality, crowd‑sourced symptom reports, and weather data. |
| Predictive risk scoring | Generate a low/medium/high risk level using a lightweight ML model. |
| Immediate alerting | Notify officials and the public when risk rises to medium/high. |
| 24‑hour hackathon viability | Simple, single‑process backend, minimal cloud services, easy deployment. |
| Low cost & low power | ESP32 + inexpensive analog sensors, battery or solar powered. |

## 4. High‑Level Architecture
```
Water Sources
   ↓
ESP32 Sensor Node
   ↓
 pH, TDS, Turbidity, Temperature
   ↓
Communication Layer (Wi‑Fi)
   ↓
Node.js REST API
   ↓
MongoDB
   ↓
Water Data + Community Symptom Data + Weather Data
   ↓
Python / Scikit‑learn AI Engine
   ↓
Risk Score (LOW / MEDIUM / HIGH)
   ↓
GIS Dashboard (React) + SMS/Push Alert Service
```

## 5. Component Architecture

| Component | Purpose | Inputs | Outputs | Technology | Dependencies | Communication |
|-----------|---------|--------|---------|------------|--------------|----------------|
| **ESP32 Sensor Node** | Acquire on‑site water quality metrics. | Raw analog signals from pH, TDS, turbidity, temperature sensors. | JSON payload `{ph, tds, turbidity, temp, timestamp, nodeId}`. | ESP32‑Arduino core, sensor libraries. | Power source, Wi‑Fi (LoRa optional). | HTTPS POST over Wi‑Fi. |
| **Communication Layer** | Transport sensor payloads reliably (MVP). | JSON payloads from ESP32. | HTTPS POST messages to backend. | Wi‑Fi router (LoRaWAN optional for future rural deployment), TLS. | Internet connectivity, router config. | HTTPS (REST) over Wi‑Fi. |
| **Node.js Backend API** | Accept sensor data, symptom reports, and serve queries. | Sensor JSON, symptom form submissions, weather API responses. | Acknowledgement (200), stored documents, risk‑score endpoint. | Express.js, body‑parser, cors. | MongoDB driver, external Weather API client. | REST (JSON over HTTPS). |
| **MongoDB** | Persist time‑series water data, symptom reports, weather snapshots, computed risk scores. | Write requests from backend. | Queryable collections (`waterReadings`, `symptoms`, `weather`, `riskScores`). | MongoDB Community Edition (local or Atlas). | Node.js driver, appropriate indexes. | BSON over TCP (standard Mongo protocol). |
| **AI/ML Engine** | Compute outbreak risk from multi‑modal data. | Joined data set (water + symptoms + weather). | Risk level (LOW/MEDIUM/HIGH) + risk score. | Python 3.11, scikit‑learn, pandas, NumPy. | Access to MongoDB, model file (to be selected). | Invoked as a scheduled job or on‑demand via HTTP endpoint. |
| **GIS Dashboard** | Visualize spatial risk and allow manual symptom entry. | Risk scores, sensor locations, weather overlays. | Interactive map, risk legend, filter controls. | React 18, Leaflet/Mapbox GL, Axios. | Backend API, external GIS tiles. | HTTPS (REST JSON). |
| **Alert System** | Notify stakeholders when risk escalates. | Risk level change events. | SMS/Push messages. | Twilio (SMS) or Firebase Cloud Messaging (push). | Backend webhook, API keys. | HTTPS POST to provider API. |
| **Weather Service** | Supply contextual environmental data. | Location coordinates, timestamp. | Forecast JSON (temperature, precipitation, humidity). | OpenWeatherMap API (or similar). | API key, internet. | HTTPS GET. |

## 6. Hardware Architecture
- **ESP32 Development Board** – central MCU, Wi‑Fi enabled, low‑power deep‑sleep.
- **pH Sensor (Analog)** – measures acidity; signal conditioned via op‑amp.
- **TDS Sensor (Analog)** – conductivity‑based total dissolved solids.
- **Turbidity Sensor (Analog)** – light‑scattering measurement.
- **Temperature Sensor (DS18B20 waterproof)** – water temperature.
- **Power** – 3.7 V Li‑Po battery + solar panel (optional) with a charging circuit.
- **Enclosure** – IP66 waterproof housing with cable glands for sensor leads.

Analog pH, TDS, and turbidity sensors connect to ESP32 ADC inputs, while the DS18B20 connects through a digital GPIO using the 1‑Wire protocol. Calibration constants are stored in flash. The node sleeps 4 min, wakes, samples, sends data, and returns to deep‑sleep.

## 7. Backend Architecture
- **Single‑process Node.js server** exposing REST endpoints:
  - `POST /api/sensor` – sensor payload ingestion.
  - `POST /api/symptom` – community symptom submission (mobile/web).
  - `GET /api/risk/:location` – latest risk score.
  - `GET /api/weather/:location` – cached weather data.
- **Scheduler** (node‑cron) triggers data aggregation and ML inference every 15 minutes.
- **Error logging** via `winston` to a rotating file; optional remote log aggregation (e.g., Loggly) if time permits.

## 8. Database Layer
- **Collections**
  - `waterReadings` ( indexed by `nodeId` + `timestamp` )
  - `symptoms` ( indexed by `location` + `timestamp` )
  - `weather` ( cached per location, refreshed hourly )
  - `riskScores` ( indexed by `location` + `timestamp` )
- **Design**: Time‑series documents with minimal nesting to simplify queries.
- **TTL Index** on `waterReadings` & `symptoms` to auto‑expire data older than 30 days (prototype only).

## 9. AI/ML Layer
1. **Data Pre‑processing** – Merge latest water metrics (averaged over last hour) with symptom count per area and current weather.
2. **Feature Set** – `ph`, `tds`, `turbidity`, `temp`, `symptomRate`, `precipitation`, `humidity`.
3. **Model** – A scikit‑learn tabular model (e.g., Logistic Regression, Random Forest, Gradient Boosting) trained using an approved historical dataset available to the team. Training data availability is a development dependency.
4. **Inference** – Model outputs probability; thresholds: <0.33 → LOW, 0.33‑0.66 → MEDIUM, >0.66 → HIGH.
5. **Deployment** – Python script run as a cron job (`*/15 * * * *`) that reads from Mongo, writes back to `riskScores`.

*No claim is made about absolute accuracy; the model is a prototype for risk ranking.*

## 10. Frontend Architecture
- **React SPA** hosted on a static web server (e.g., GitHub Pages or simple Nginx).
- **Map Component** – Leaflet with OpenStreetMap tiles; markers colored by risk level.
- **Dashboard Panels** – Latest sensor readings, symptom submission form, weather summary.
- **State Management** – React Context for global config; no Redux to keep bundle size low.
- **API Layer** – Axios wrappers handling token‑less calls (prototype).

## 11. External Services
| Service | Role | Integration |
|---------|------|-------------|
| Weather API (e.g., OpenWeatherMap) | Provide temperature, precipitation, humidity for each sensor location. | Backend fetches hourly, stores in `weather`. |
| GIS/Mapping (OSM tiles) | Base map for dashboard. | Direct tile URL in Leaflet. |
| SMS/Notification (Twilio) | Send alerts to officials / community phone numbers. | Backend triggers POST to Twilio REST API when risk changes to medium/high. |

## 12. End‑to‑End Data Flow
1. **Sampling** – ESP32 reads sensors, builds JSON, sends via HTTPS POST to `/api/sensor`.
2. **Ingestion** – Backend validates, stores in `waterReadings`.
3. **Symptom Entry** – Community users submit via React form → `/api/symptom` → stored in `symptoms`.
4. **Weather Refresh** – Backend cron fetches weather, updates `weather`.
5. **Aggregation** – Python job runs every 15 minutes, pulls latest records, computes features, runs ML model.
6. **Risk Persistence** – Result written to `riskScores`.
7. **Dashboard Update** – Frontend polls `/api/risk/:location` every minute, refreshes map colors.
8. **Alert Trigger** – If new risk level ≥ MEDIUM and differs from previous, backend calls Twilio → SMS sent.

## 13. Error Handling Strategy
- **Sensor Node** – Retries up to 3 times on network failure; if still fails, stores data locally in ESP32 flash and uploads on next successful connection.
- **Backend** – Input validation (schema via `joi`); malformed payloads return **400** with error detail.
- **Database** – Write failures logged and retried with exponential back‑off (max 5 attempts).
- **ML Job** – Exceptions caught; error logged and job skipped; next scheduled run attempts again.
- **Alert Service** – On Twilio failure, message queued for up to 3 retries; persistent failure escalates to email (if configured).

## 14. Security Considerations
- **Transport Security** – All external traffic uses HTTPS with TLS 1.2+.
- **API Authentication** – Prototype uses simple API keys stored in environment variables; future iteration may add JWT.
- **Data Sanitization** – Server validates numeric ranges for sensor values to prevent injection.
- **Rate Limiting** – Express middleware limits `/api/sensor` to 60 requests/min per nodeId.
- **Database Access** – MongoDB runs with authentication (`admin` user) and network bound to localhost or VPC.

## 15. Offline/Connectivity Strategy
- **ESP32** – If Wi‑Fi unavailable, buffers up to 24 hours of readings in NVS flash; attempts reconnection every 5 min.
- **Backend** – If weather API unreachable, uses last cached weather record (≤ 3 h old).
- **Dashboard** – Shows “last updated” timestamp; if backend unreachable, displays cached data from browser localStorage.

## 16. Deployment Architecture
```
[ESP32 Sensors] --> Internet (Wi‑Fi) --> [Node.js Server (single VM or Docker container)]
                           |
                           v
                    [MongoDB (single instance, local or Atlas free tier)]
                           |
                           v
              [Python ML job (cron on same VM) ] 
                           |
                           v
                [React static files (served by same VM or CDN)]
```
- **VM** – A single small cloud instance (e.g., AWS t2.micro, Azure B1S, or GCP f1‑micro) sufficient for prototype.
- **Containerization (optional)** – Docker Compose can spin up `backend`, `mongodb`, and `ml-job` services for reproducibility.

## 17. Scalability Considerations
| Dimension | Current Prototype | Simple Scaling Path |
|-----------|-------------------|---------------------|
| **Sensor Nodes** | Up to ~50 nodes (Wi‑Fi bandwidth limited). | Deploy additional Wi‑Fi access points or use LoRaWAN gateway. |
| **Backend Load** | Single Node.js process handles < 10 req/s. | Horizontal scale by adding a load‑balanced Node.js pool behind Nginx. |
| **Database** | MongoDB single instance (≈10 k docs/day). | Upgrade to a replica set; add sharding if > 1 M docs. |
| **ML Processing** | 15‑minute scheduled inference. | Switch to streaming inference via a lightweight Flask endpoint if near‑real‑time needed. |
| **Dashboard Users** | < 100 concurrent browsers. | Deploy React app on a CDN; backend API behind rate limiter. |
All scaling steps avoid micro‑service explosion; they stay within the “single‑process” spirit of a hackathon prototype.

## 18. Technology Stack
| Layer | Technology | Version (as of Aug 2026) |
|-------|------------|--------------------------|
| **Hardware** | ESP32‑DevKitC, analog pH/TDS/Turbidity sensors, DS18B20 temperature sensor | ESP-IDF v5.2 |
| **Firmware** | Arduino core for ESP32, FreeRTOS | 2.0.6 |
| **Communication** | HTTPS POST (TLS 1.2) | N/A |
| **Backend** | Node.js, Express.js | v20.12.0 |
| **Database** | MongoDB Community Server | v7.0 |
| **ML** | Python, scikit‑learn, pandas, NumPy | 3.12 / sklearn 1.5 |
| **Frontend** | React 18, Leaflet, Axios | 18.2 / 1.9 |
| **External APIs** | OpenWeatherMap, Mapbox/OSM tiles, Twilio SMS | latest |
| **DevOps** | Docker, docker‑compose (optional), Git, npm | latest |

## 19. Architecture Constraints
- **No micro‑service architecture** – All backend logic lives in a single Node.js process.
- **No container orchestration** – Docker may be used locally but not Kubernetes.
- **No message brokers** – MVP communication uses HTTPS request‑response through the Node.js REST API.
- **Limited cloud services** – Only a single VM (or free tier cloud) and managed MongoDB (or local).
- **Prototype‑only ML** – Scikit‑learn model; no TensorFlow/PyTorch.

## 20. Future Extensions
| Extension | Description | Impact on Architecture |
|----------|-------------|------------------------|
| **Edge ML** | Run lightweight inference on ESP32 (e.g., TensorFlow‑Lite). | Adds on‑device model, reduces backend load. |
| **Crowd‑sourced Geolocation** | Mobile app reports GPS‑tagged symptoms. | Frontend adds geolocation capture; backend stores per‑device location. |
| **Additional Sensors** | Dissolved oxygen, chlorine. | Extra ADC channels, firmware updates, new DB fields. |
| **User Authentication** | Role‑based access for officials vs. public. | JWT auth, role middleware, secure storage. |
| **Dashboard Enhancements** | Time‑series charts, predictive trends. | Additional API endpoints, charting library (e.g., Recharts). |
| **Automated Failover** | Backup VM & Mongo replica set for reliability. | Introduces HA, but still single‑process per node. |
| **Scaling to City‑wide** | Thousands of nodes, real‑time alerts. | Move to LoRaWAN network, potential micro‑service split (out of scope for hackathon). |

---

## Architecture Decision Rules
1. **Technology Additions** – Any new language, framework, or major library (e.g., switching from scikit‑learn to TensorFlow) must be approved by the whole team before implementation.
2. **Infrastructure Changes** – Introducing additional servers, containers, or cloud services (e.g., moving to Kubernetes, adding a message broker) requires unanimous team consent.
3. **Data Model Alterations** – Adding or removing collections/fields in MongoDB must be documented and reviewed to prevent breaking existing pipelines.
4. **Security Policy Adjustments** – Changes to authentication, encryption, or exposure of APIs must be vetted by the security lead.
5. **Scope Creep** – Any feature that expands beyond the defined pipeline (e.g., real‑time video analysis) must be formally scoped out and receive explicit approval.

---

*Prepared for the SRCAS Hackathon 3.0 prototype. All sections reflect the approved technology stack and constraints, and are ready for review.*