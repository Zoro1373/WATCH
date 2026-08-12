# DATABASE_SCHEMA.md

Version: 1.0
Status: LOCKED

## 1. Purpose
This document defines the official MongoDB data model for the **AI‑POWERED WATER CONTAMINATION TRACKING AND EPIDEMIC EARLY WARNING SYSTEM** prototype.

**DATABASE_SCHEMA.md** is the source of truth for MongoDB collections, fields, indexes, validation rules, and data relationships.  The schema must remain consistent with the locked documents:

- **PROJECT_ARCHITECTURE.md**
- **API_CONTRACT.md**

---

## 2. Database Overview
- **Database:** MongoDB (single database for the MVP)
- **Purpose:** Persist all domain data required by the backend, AI/ML pipeline, and frontend GIS dashboard.
- **Collections Overview:**

| Collection      | Stores                                    | Primary Producer                 | Primary Consumer                     |
|-----------------|-------------------------------------------|----------------------------------|--------------------------------------|
| `sensorNodes`   | Registered ESP32 devices                   | Backend (node registration)       | Validation of sensor submissions     |
| `waterReadings` | Raw water‑quality sensor measurements     | ESP32 → Node.js API `/api/sensor`| AI/ML inference, risk calculation     |
| `symptoms`      | Aggregated community symptom counts       | Community app → `/api/symptom`   | AI/ML inference                      |
| `weather`       | Cached hourly weather data                 | Backend weather fetch job         | AI/ML inference, risk API `/weather`|
| `riskScores`    | AI/ML risk predictions                    | Scheduled ML job (15 min)       | Frontend GIS `/api/risk`, alert gen. |
| `alerts`        | Generated alerts for MEDIUM/HIGH risk     | Backend alert service            | SMS/Push provider, frontend display  |

**Data Flow Overview**
```
ESP32
 ↓
Node.js API
   → waterReadings
   → symptoms
   → weather (cached)
   → sensorNodes (validation)
   ↓
AI/ML scheduled job (15 min)
   reads: waterReadings, symptoms, weather
   writes: riskScores
   ↓
Alert service
   reads: riskScores
   writes: alerts
   ↓
SMS/Push provider
   ↔
React GIS Dashboard
   reads: riskScores, weather, alerts
```

---

## 3. Collection Overview
| Collection      | Purpose                                           | Primary Producer                               | Primary Consumer                               |
|-----------------|---------------------------------------------------|-----------------------------------------------|-----------------------------------------------|
| `sensorNodes`   | Registry of ESP32 sensor nodes (validation only) | Backend admin / registration endpoint (if any) | `waterReadings` validation                    |
| `waterReadings` | Raw water‑quality measurements from ESP32        | ESP32 via `POST /api/sensor`                  | ML job, risk calculation                      |
| `symptoms`      | Aggregated community symptom reports             | Community app via `POST /api/symptom`          | ML job                                        |
| `weather`       | Cached hourly weather data                       | Backend weather fetch job                     | ML job, `GET /api/weather/:location` endpoint |
| `riskScores`    | AI/ML risk predictions per location & time      | ML job (15 min)                               | `GET /api/risk/:location`, alert service      |
| `alerts`        | Generated alerts for high risk levels            | Alert generation service                      | SMS/Push provider, frontend display          |

---

## 4. `waterReadings` Collection
Stores each ESP32 sensor measurement.

| Field            | BSON Type | Required | Description |
|------------------|-----------|----------|-------------|
| `_id`            | ObjectId  | Yes      | Auto‑generated document identifier |
| `nodeId`         | string    | Yes      | Identifier of the ESP32 node (must exist in `sensorNodes`) |
| `timestamp`      | date      | Yes      | UTC time of the measurement (ISO 8601 at API level) |
| `location`       | **GeoJSON Point** | Yes | GeoJSON point for geospatial queries (`type: "Point", coordinates: [lon, lat]`) |
| `latitude`       | double    | Yes      | Redundant latitude for API compatibility (`location.coordinates[1]`) |
| `longitude`      | double    | Yes      | Redundant longitude for API compatibility (`location.coordinates[0]`) |
| `ph`             | double    | Yes      | pH value (0 – 14) |
| `tds`            | double    | Yes      | Total dissolved solids (ppm, ≥ 0) |
| `turbidity`      | double    | Yes      | Turbidity (NTU, ≥ 0) |
| `temperature`    | double    | Yes      | Water temperature (°C, -50 – 100) from DS18B20 |

**Validation Rules (schema level)**
- `ph` ≥ 0 && ≤ 14
- `tds` ≥ 0
- `turbidity` ≥ 0
- `temperature` ≥ -50 && ≤ 100
- `latitude` ≥ -90 && ≤ 90
- `longitude` ≥ -180 && ≤ 180
- `nodeId` non‑empty string
- `timestamp` must be a valid Date

**Example Document**
```json
{
  "_id": ObjectId("66b9c1f2f9a2e3d5c9a0b123"),
  "nodeId": "WATER_001",
  "timestamp": ISODate("2026-08-12T12:30:00Z"),
  "location": { "type": "Point", "coordinates": [77.4119, 8.1833] },
  "latitude": 8.1833,
  "longitude": 77.4119,
  "ph": 6.8,
  "tds": 420,
  "turbidity": 8.4,
  "temperature": 28.2
}
```

---

## 5. `symptoms` Collection
Aggregated community symptom reports.

| Field                | BSON Type | Required | Description |
|----------------------|-----------|----------|-------------|
| `_id`                | ObjectId  | Yes      | Auto‑generated identifier |
| `location`           | **GeoJSON Point** | Yes | Geographic point (`coordinates: [lon, lat]`) |
| `latitude`            | double    | Yes | Redundant latitude for API compatibility |
| `longitude`           | double    | Yes | Redundant longitude for API compatibility |
| `timestamp`          | date      | Yes | UTC aggregation period (ISO 8601) |
| `feverCount`          | int       | Yes | Number of fever reports (≥ 0) |
| `diarrheaCount`      | int       | Yes | Number of diarrhea reports (≥ 0) |
| `vomitingCount`      | int       | Yes | Number of vomiting reports (≥ 0) |
| `abdominalPainCount` | int       | Yes | Number of abdominal‑pain reports (≥ 0) |

**Validation**
- All count fields must be integer ≥ 0.
- Latitude/longitude constraints as in `waterReadings`.

**Example Document**
```json
{
  "_id": ObjectId("66b9c210f9a2e3d5c9a0b124"),
  "location": { "type": "Point", "coordinates": [77.4119, 8.1833] },
  "latitude": 8.1833,
  "longitude": 77.4119,
  "timestamp": ISODate("2026-08-12T12:00:00Z"),
  "feverCount": 12,
  "diarrheaCount": 5,
  "vomitingCount": 3,
  "abdominalPainCount": 4
}
```

---

## 6. `weather` Collection
Cached hourly weather data used by the dashboard and AI engine.

| Field        | BSON Type | Required | Description |
|--------------|-----------|----------|-------------|
| `_id`        | ObjectId  | Yes      | Auto‑generated |
| `location`   | **GeoJSON Point** | Yes | Geographic point (`coordinates: [lon, lat]`) |
| `latitude`   | double    | Yes | Redundant latitude for API compatibility |
| `longitude`  | double    | Yes | Redundant longitude for API compatibility |
| `temperature`| double    | Yes | °C |
| `precipitation`| double | Yes | mm |
| `humidity`   | double    | Yes | % |
| `source`     | string    | Yes | Provider name (e.g., `"OpenWeatherMap"`) |
| `cachedAt`   | date      | Yes | When the backend cached the record |
| `timestamp`  | date      | Yes | The weather observation time (usually same as `cachedAt`) |

**Example Document**
```json
{
  "_id": ObjectId("66b9c22bf9a2e3d5c9a0b125"),
  "location": { "type": "Point", "coordinates": [77.4119, 8.1833] },
  "latitude": 8.1833,
  "longitude": 77.4119,
  "temperature": 27.5,
  "precipitation": 0.0,
  "humidity": 80,
  "source": "OpenWeatherMap",
  "cachedAt": ISODate("2026-08-12T12:00:00Z"),
  "timestamp": ISODate("2026-08-12T12:00:00Z")
}
```

---

## 7. `riskScores` Collection
AI/ML predictions for a specific location and time.

| Field                | BSON Type | Required | Description |
|----------------------|-----------|----------|-------------|
| `_id`                | ObjectId  | Yes      | Auto‑generated |
| `location`           | **GeoJSON Point** | Yes | Geographic point (`coordinates: [lon, lat]`) |
| `latitude`            | double    | Yes | Redundant latitude for API compatibility |
| `longitude`           | double    | Yes | Redundant longitude for API compatibility |
| `timestamp`          | date      | Yes | UTC time the prediction corresponds to (ISO 8601) |
| `riskScore`          | double    | Yes | 0 – 1 (early‑warning indicator) |
| `riskLevel`          | string    | Yes | One of `"LOW"`, `"MEDIUM"`, `"HIGH"` |
| `modelVersion`       | string    | No  | Optional identifier of the ML model version |
| `contributingFactors`| object    | No  | Optional snapshot of sensor/symptom/weather values used in the inference (mirrors the ML input features defined in Section 18) |

**Validation**
- `riskScore` ≥ 0 && ≤ 1
- `riskLevel` ∈ {`LOW`, `MEDIUM`, `HIGH`}

**Example Document**
```json
{
  "_id": ObjectId("66b9c240f9a2e3d5c9a0b126"),
  "location": { "type": "Point", "coordinates": [77.4119, 8.1833] },
  "latitude": 8.1833,
  "longitude": 77.4119,
  "timestamp": ISODate("2026-08-12T12:45:00Z"),
  "riskScore": 0.72,
  "riskLevel": "HIGH",
  "modelVersion": "v1.0",
  "contributingFactors": {
    "ph": 6.8,
    "tds": 420,
    "turbidity": 8.4,
    "temperature": 28.2,
    "feverCount": 12,
    "diarrheaCount": 5,
    "vomitingCount": 3,
    "abdominalPainCount": 4,
    "weatherTemperature": 27.5,
    "precipitation": 0.0,
    "humidity": 80
  }
}
```

---

## 8. `alerts` Collection
Generated alerts for locations with `MEDIUM` or `HIGH` risk.

| Field               | BSON Type | Required | Description |
|---------------------|-----------|----------|-------------|
| `_id`               | ObjectId  | Yes      | Auto‑generated |
| `location`          | **GeoJSON Point** | Yes | Geographic point (`coordinates: [lon, lat]`) |
| `latitude`           | double    | Yes | Redundant latitude for API compatibility |
| `longitude`          | double    | Yes | Redundant longitude for API compatibility |
| `riskLevel`         | string    | Yes | `"MEDIUM"` or `"HIGH"` |
| `riskScore`         | double    | Yes | Same range as in `riskScores` |
| `timestamp`         | date      | Yes | Time of the underlying risk prediction |
| `message`           | string    | Yes | Human‑readable alert text sent to the provider |
| `status`            | string    | Yes | One of `PENDING`, `SENT`, `FAILED` |
| `provider`          | string    | No  | Name of the SMS/Push service (e.g., `"Twilio"` ) |
| `providerMessageId` | string    | No  | Identifier returned by the provider (if any) |
| `retryCount`        | int       | No  | Number of retry attempts (default 0) |
| `lastAttemptAt`     | date      | No  | Timestamp of the most recent attempt |

**Example Document**
```json
{
  "_id": ObjectId("66b9c255f9a2e3d5c9a0b127"),
  "location": { "type": "Point", "coordinates": [77.4119, 8.1833] },
  "latitude": 8.1833,
  "longitude": 77.4119,
  "riskLevel": "HIGH",
  "riskScore": 0.72,
  "timestamp": ISODate("2026-08-12T12:45:00Z"),
  "message": "Water quality risk HIGH at 8.1833,77.4119.",
  "status": "PENDING",
  "provider": "Twilio",
  "retryCount": 0
}
```

---

## 9. Sensor Node Registry (`sensorNodes` Collection)
A minimal registry is required because the API contract states that `nodeId` **must match a registered node**. The collection stores only immutable identification data needed for validation.

| Field        | BSON Type | Required | Description |
|--------------|-----------|----------|-------------|
| `_id`        | ObjectId  | Yes      | Auto‑generated |
| `nodeId`     | string    | Yes      | Unique identifier used by ESP32 (`WATER_001`, …) |
| `name`       | string    | No       | Human‑readable label (optional) |
| `location`   | **GeoJSON Point** | No | Approximate installation location |
| `status`     | string    | No       | E.g., `ACTIVE`, `INACTIVE` |
| `createdAt`  | date      | Yes      | Record creation time |
| `lastSeenAt` | date      | No       | Timestamp of the most recent sensor submission |

**Example Document**
```json
{
  "_id": ObjectId("66b9c26bf9a2e3d5c9a0b128"),
  "nodeId": "WATER_001",
  "name": "Riverbank Station 1",
  "location": { "type": "Point", "coordinates": [77.4119, 8.1833] },
  "status": "ACTIVE",
  "createdAt": ISODate("2026-07-01T09:00:00Z"),
  "lastSeenAt": ISODate("2026-08-12T12:30:00Z")
}
```

---

## 10. Index Strategy
| Collection      | Index Definition                                   | Reason / Query Pattern |
|-----------------|----------------------------------------------------|------------------------|
| `sensorNodes`   | `{ nodeId: 1 }` (unique)                           | Fast lookup for validation of `nodeId` |
| `waterReadings`| `{ nodeId: 1, timestamp: 1 }` // **UNIQUE** compound index for duplicate detection | Retrieve latest reading per node; enforce `nodeId` + `timestamp` uniqueness |
| `waterReadings`| `{ location: "2dsphere" }`                       | Geospatial queries (e.g., find recent readings near a point) |
| `waterReadings`| `{ timestamp: -1 }`                                 | Time‑range queries for ML job |
| `symptoms`      | `{ location: "2dsphere", timestamp: -1 }`        | Find latest symptom aggregate for a location |
| `weather`       | `{ location: "2dsphere", timestamp: -1 }`        | Retrieve most recent cached weather for a location |
| `riskScores`    | `{ location: "2dsphere", timestamp: -1 }`        | Fetch latest risk score per location |
| `alerts`        | `{ status: 1, timestamp: -1 }`                   | Pull pending/failed alerts for retry |
| `alerts`        | `{ location: "2dsphere", timestamp: -1 }`        | Find alerts for a specific area |

*Only indexes that directly support the documented query patterns are created.*

---

## 11. Geospatial Data Model
- **Official representation:** MongoDB **GeoJSON Point** (`{ type: "Point", coordinates: [ <longitude>, <latitude> ] }`).
- **Coordinate order:** `[longitude, latitude]` (MongoDB requirement).
- **API compatibility:** The API contract still returns separate `latitude` and `longitude` fields for consumer convenience. Backend services translate between the two representations:
  - On write: store both the GeoJSON point **and** the duplicate scalar fields.
  - On read: expose the scalar fields alongside any GeoJSON if needed.

---

## 12. Timestamp Strategy
- All timestamps are stored as **BSON `date`** (UTC).  API layer accepts/returns ISO 8601 strings; conversion to/from `Date` occurs in the Node.js layer.
- Relevant timestamps:
  - `timestamp` – logical event time (sensor reading, symptom aggregation, weather observation, risk prediction, alert generation).
  - `createdAt` / `cachedAt` – record‑creation metadata where needed.
  - `lastSeenAt` – optional for node registry.
- Supports:
  - ~5‑minute sensor sampling (`waterReadings.timestamp`).
  - 15‑minute ML inference (`riskScores.timestamp`).
  - ~1‑hour weather cache (`weather.timestamp` / `cachedAt`).

---

## 13. Validation Rules
| Domain               | Field               | Constraint |
|----------------------|---------------------|------------|
| **Water sensor**     | `ph`                | 0 ≤ value ≤ 14 |
|                      | `tds`               | ≥ 0 |
|                      | `turbidity`         | ≥ 0 |
|                      | `temperature`       | -50 ≤ value ≤ 100 |
|                      | `latitude`/`longitude`| -90 ≤ lat ≤ 90, -180 ≤ lon ≤ 180 |
| **Symptoms**         | All count fields   | integer ≥ 0 |
| **Risk score**       | `riskScore`         | 0 ≤ value ≤ 1 |
|                      | `riskLevel`         | `"LOW"`, `"MEDIUM"`, `"HIGH"` |
| **Node registry**    | `nodeId`            | non‑empty string, unique |
| **Timestamps**       | any `timestamp`     | valid UTC `Date` |
| **Alerts**           | `status`            | one of `PENDING`, `SENT`, `FAILED` |
| **General**          | No secret keys, credentials, or personal health data stored |

---

## 14. Relationships / Data Flow
MongoDB remains **document‑oriented**; relationships are logical, not enforced via foreign keys.
- **Node ↔ Reading:** `waterReadings.nodeId` must exist in `sensorNodes.nodeId`. Validation performed by backend.
- **Location‑based correlation:** `location` (GeoJSON) + `timestamp` link readings, symptoms, weather, and risk predictions for the AI job.
- **Risk ↔ Alert:** When `riskScores.riskLevel` is `MEDIUM` or `HIGH`, an alert document is created referencing the same `location` and `timestamp`.

Data is read/written as per the flow diagram in Section 2.

---

## 15. Data Retention
Retention periods are **configurable** and not hard‑coded:

| Collection      | Suggested Retention | Reason |
|-----------------|----------------------|--------|
| `waterReadings` | Configurable (e.g., 30 days) | Historical ML training / audit |
| `symptoms`      | Configurable (e.g., 30 days) | Trend analysis |
| `weather`       | Configurable (e.g., 7 days) | Cache freshness |
| `riskScores`   | Configurable (e.g., 30 days) | Risk history |
| `alerts`        | Configurable (e.g., 90 days) | Auditing of notifications |
| `sensorNodes`  | Permanent (as long as node exists) | Device registry |

If a retention period is defined, a **TTL index** on `timestamp` (or `createdAt`) can be applied after team agreement.

---

## 16. Query Patterns
| # | Description | Collection(s) Involved | Index Utilized |
|---|--------------|------------------------|----------------|
| 1 | Latest water reading for a specific `nodeId` | `waterReadings` | `{ nodeId: 1, timestamp: -1 }` |
| 2 | Recent water readings within 5 km of a point | `waterReadings` | `{ location: "2dsphere" }` + time filter |
| 3 | Latest symptom aggregate for a location | `symptoms` | `{ location: "2dsphere", timestamp: -1 }` |
| 4 | Most recent cached weather for a location | `weather` | `{ location: "2dsphere", timestamp: -1 }` |
| 5 | Current risk score for a location (API) | `riskScores` | `{ location: "2dsphere", timestamp: -1 }` |
| 6 | Risk score history for a location (last 24 h) | `riskScores` | `{ location: "2dsphere", timestamp: -1 }` |
| 7 | Active alerts (status `PENDING` or `FAILED`) for a location | `alerts` | `{ status: 1, timestamp: -1 }` |
| 8 | Alerts needing retry (status `FAILED`) | `alerts` | `{ status: 1, timestamp: -1 }` |

Each query aligns with an index defined in Section 10.

---

## 17. API ↔ Database Mapping
| API Endpoint                     | HTTP Method | Collection(s) written / read |
|----------------------------------|-------------|-----------------------------|
| `POST /api/sensor`               | POST        | **writes** `waterReadings` (validates `nodeId` against `sensorNodes`) |
| `POST /api/symptom`              | POST        | **writes** `symptoms` |
| `GET /api/weather/:location`     | GET         | **reads** `weather` (by location) |
| `GET /api/risk/:location`        | GET         | **reads** `riskScores` (latest by location) |
| **Scheduled ML job** (15 min)   | internal    | **reads** `waterReadings`, `symptoms`, `weather` <br> **writes** `riskScores` |
| **Alert generation** (backend) | internal    | **reads** `riskScores` (MEDIUM/HIGH) <br> **writes** `alerts` |
| **SMS/Push provider**            | internal    | Reads `alerts` (status `PENDING`) and updates `alerts` status fields |

No other collections are involved.

---

## 18. ML Data Access
The 15‑minute ML job reads:
- From `waterReadings`: `ph`, `tds`, `turbidity`, `temperature`
- From `symptoms`: `feverCount`, `diarrheaCount`, `vomitingCount`, `abdominalPainCount`
- From `weather`: `temperature`, `precipitation`, `humidity`

All fields are stored as their native BSON types; optional values are **null** when missing, satisfying the requirement that the ML preprocessing pipeline handles nulls rather than zeros.

Historical data is queried by `location` and `timestamp` ranges, using the indexes in Section 10.

---

## 19. Data Integrity
- **Duplicate sensor readings:** Enforced by a **UNIQUE** compound index `{ nodeId: 1, timestamp: 1 }`. If a duplicate insert occurs, the API returns the existing `readingId` (`200 OK` path in the contract).
- **Timestamp consistency:** All timestamps are stored in UTC (`Date`) and validated on write.
- **Node validation:** `nodeId` must exist in `sensorNodes`. Backend rejects unknown IDs with `401 Unauthorized` (as defined by the API contract).
- **Coordinate validation:** Latitude/longitude ranges enforced (see Section 13). Invalid coordinates cause `400 Bad Request`.
- **Symptom aggregation:** One document per location per aggregation period. Duplicate aggregation is prevented by application‑level upsert logic using the `{ location, timestamp }` pair (unique index cannot be enforced on GeoJSON, so the backend checks for existing records before insert).
- **Weather cache:** One record per location per hour. Duplicate cache entries are handled similarly with upsert logic based on `{ location, timestamp }`.
- **Alert retry:** `retryCount` increments on each failed attempt; `lastAttemptAt` records the attempt time.

No distributed idempotency or complex coordination mechanisms are introduced.

---

## 20. Security and Privacy
- **MongoDB authentication** is handled via environment‑provided credentials (`MONGODB_URI`).
- **No secrets** (API keys, weather provider keys, SMS credentials) are stored in any collection.
- **Privacy:** `symptoms` only contain aggregated counts; no personal health information is recorded.
- **Access control:** Only the backend service has network access to the database. ESP32 devices and the frontend interact solely through the REST API.

---

## 21. Example Documents
1. **`waterReadings`** – see Section 4 example.
2. **`symptoms`** – see Section 5 example.
3. **`weather`** – see Section 6 example.
4. **`riskScores`** – see Section 7 example.
5. **`alerts`** – see Section 8 example.
6. **`sensorNodes`** – see Section 9 example.

---

## 22. Environment Configuration
| Variable          | Description                              |
|-------------------|------------------------------------------|
| `MONGODB_URI`     | Connection string (including credentials) – **placeholder only**, e.g., `mongodb+srv://<user>:<pwd>@cluster0.mongodb.net` |
| `MONGODB_DATABASE`| Name of the database used by the MVP (e.g., `aquaSentry`) |

Only these two variables are required for the backend to connect to MongoDB. No credentials are hard‑coded.

---

## 23. Migration / Schema Evolution
1. **Discuss** any breaking change with the team.
2. **Update** `DATABASE_SCHEMA.md` to reflect the new structure.
3. **If the API payload changes**, also update `API_CONTRACT.md`.
4. **Modify** backend code accordingly and add tests.
5. **Deploy** after verification; no automatic migration framework is required for the hackathon timeline.

---

## 24. Architecture Constraints
- **MongoDB is the exclusive database** for the MVP.
- **Only the Node.js backend** accesses MongoDB directly.
- **ESP32 devices** never talk to MongoDB; they send data via the REST API.
- **Frontend** consumes data through the API; it does not query MongoDB.
- **AI/ML engine** receives data indirectly via the scheduled job that reads from MongoDB.
- No additional caching layers, message brokers, or microservices are introduced.

---

## 25. Definition of Done
`DATABASE_SCHEMA.md` is considered complete when all items in the final consistency checklist (Section 26) are satisfied, and the document accurately reflects the locked architecture and API contract without adding extraneous collections, indexes, or secrets.

---

## 26. Consistency Check
- [x] `waterReadings` duplicate rule is consistent everywhere (`nodeId` + `timestamp` unique index).
- [x] Index Strategy matches duplicate‑handling section.
- [x] `symptoms` duplicate handling uses application‑level upsert (no unique index claim).
- [x] `weather` duplicate handling uses application‑level upsert (no unique index claim).
- [x] No unsupported unique‑index claims remain.
- [x] `riskScores` refers to Section 18 for ML input features.
- [x] Unknown `nodeId` behavior matches API_CONTRACT.md (`401 Unauthorized`).
- [x] No API contract changes were made.
- [x] No architecture changes were made.
- [x] No unnecessary collections were added.
- [x] No unnecessary indexes were added.

---

*This schema is intended for the 24‑hour hackathon prototype and may evolve with further team decisions.*