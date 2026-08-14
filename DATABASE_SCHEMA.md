# DATABASE_SCHEMA.md

Version: 1.1
Status: LOCKED

> **Version Note (v1.1):** Added explicit Village ↔ Water Source ↔ Sensor geographic relationship and Assam GIS context while preserving the existing ML pipeline and 11-feature Isolation Forest design.

## 1. Purpose
This document defines the official MongoDB data model for the **AI‑POWERED WATER CONTAMINATION TRACKING AND EPIDEMIC EARLY WARNING SYSTEM** prototype.

**DATABASE_SCHEMA.md** is the source of truth for MongoDB collections, fields, indexes, validation rules, and data relationships. The schema remains consistent with the locked documents:

- **PROJECT_ARCHITECTURE.md**
- **API_CONTRACT.md**
- **AI_ML_SPEC.md**

---

## 2. Database Overview
- **Database:** MongoDB (single database for the MVP, e.g., `aquaSentry`)
- **Purpose:** Persist all domain entities, telemetry, symptoms, weather observations, and risk outputs required by backend, ML pipeline, and GIS dashboard.
- **Collections Overview:**

| Collection | Stores | Primary Producer | Primary Consumer |
| :--- | :--- | :--- | :--- |
| `villages` | Registered Assam settlements & prototype water links | Backend / Seeding | GIS Dashboard, Symptom Intake |
| `waterSources` | Monitored Assam rivers & wetland reaches | Backend / Seeding | ML Alignment, GIS Dashboard |
| `sensorNodes` | Registered telemetry nodes (hardware / simulated) | Backend (node registry) | `waterReadings` validation, IoT Simulator |
| `waterReadings` | Time-series water quality telemetry (`ph`, `tds`, `turbidity`, `temp`) | IoT Simulator / ESP32 → `/api/sensor` | ML Job, GIS Dashboard |
| `symptoms` | Aggregated community symptoms per village (`feverCount`, etc.) | Community Intake Form → `/api/symptom` | ML Job (aggregated by water source) |
| `weather` | Cached hourly weather snapshots | Backend weather fetch job | ML Job, Weather API |
| `riskScores` | ML early-warning risk scores per monitored water source | Scheduled Python ML Job (15 min) | GIS Dashboard, Alert Service |
| `alerts` | Generated alerts for MEDIUM / HIGH risk events | Backend alert service | SMS / Push provider, GIS Alerts |

**Data Flow Overview**
```
Real Assam Geography
   ↓
villages (e.g., Kamalabari, Salmora, Pamohi, Sonabarighat)
   ↓ (primaryWaterSourceId: Prototype Association)
waterSources (e.g., Brahmaputra Majuli Reach, Deepor Beel, Barak River)
   ↓
sensorNodes (NODE001, NODE002, NODE003 — isSimulated: true)
   ↓
waterReadings (ph, tds, turbidity, temperature)
   +
symptoms (linked via villageId: feverCount, diarrheaCount, vomitingCount, abdominalPainCount)
   +
weather (temperature, precipitation, humidity)
   ↓
AI/ML Scheduled Job (Isolation Forest — 11 Features)
   ↓
riskScores (associated with waterSourceId)
   ↓
alerts + React GIS Dashboard
```

---

## 3. `villages` Collection
Stores registered real Assam settlements and their prototype association to a monitored primary water source.

| Field | BSON Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `_id` | ObjectId | Yes | Auto-generated document identifier |
| `villageId` | string | Yes | Unique identifier (e.g., `"VIL_MAJ_001"`) |
| `name` | string | Yes | Real settlement name (e.g., `"Kamalabari"`) |
| `district` | string | Yes | Administrative district (e.g., `"Majuli"`) |
| `location` | **GeoJSON Point** | Yes | Canonical geographic point (`{ type: "Point", coordinates: [lon, lat] }`) |
| `primaryWaterSourceId` | string | Yes | Identifier of the prototype-associated water source (`sourceId`) |
| `verificationStatus` | string | Yes | Data classification (e.g., `"VERIFIED_GEOGRAPHY_PROTOTYPE_LINK"`) |
| `createdAt` | date | Yes | Creation timestamp |

**Validation Rules**
- `villageId` non-empty string, unique.
- `location.coordinates` must be valid `[longitude, latitude]` with lon ≥ -180 && ≤ 180 and lat ≥ -90 && ≤ 90.
- `primaryWaterSourceId` must match an existing `waterSources.sourceId`.

**Example Document**
```json
{
  "_id": ObjectId("66b9c1f2f9a2e3d5c9a0b101"),
  "villageId": "VIL_MAJ_001",
  "name": "Kamalabari",
  "district": "Majuli",
  "location": { "type": "Point", "coordinates": [94.2411, 26.9622] },
  "primaryWaterSourceId": "SRC_001",
  "verificationStatus": "VERIFIED_GEOGRAPHY_PROTOTYPE_LINK",
  "createdAt": ISODate("2026-08-14T00:00:00Z")
}
```

---

## 4. `waterSources` Collection
Stores monitored Assam water bodies (rivers, wetlands, streams) that serve as the focal entities for telemetry monitoring and early-warning risk evaluation.

| Field | BSON Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `_id` | ObjectId | Yes | Auto-generated identifier |
| `sourceId` | string | Yes | Unique identifier (e.g., `"SRC_001"`) |
| `name` | string | Yes | Name of the water body reach (e.g., `"Brahmaputra River (Majuli Reach)"`) |
| `type` | string | Yes | One of `"RIVER"`, `"WETLAND"`, `"STREAM"`, `"GROUNDWATER"` |
| `location` | **GeoJSON Point** | Yes | Canonical centroid / reach point (`{ type: "Point", coordinates: [lon, lat] }`) |
| `servedVillageIds` | array of strings | Yes | Array of `villageId` references associated with this water body |
| `monitoringStatus` | string | Yes | One of `"MONITORED_SIMULATED"`, `"MONITORED_PHYSICAL"`, `"UNMONITORED"` |
| `createdAt` | date | Yes | Record creation timestamp |

**Validation Rules**
- `sourceId` non-empty string, unique.
- `location.coordinates` must be valid `[longitude, latitude]` with lon ≥ -180 && ≤ 180 and lat ≥ -90 && ≤ 90.

**Example Document**
```json
{
  "_id": ObjectId("66b9c1f2f9a2e3d5c9a0b102"),
  "sourceId": "SRC_001",
  "name": "Brahmaputra River (Majuli Reach)",
  "type": "RIVER",
  "location": { "type": "Point", "coordinates": [94.2150, 26.9500] },
  "servedVillageIds": ["VIL_MAJ_001", "VIL_MAJ_002", "VIL_MAJ_003"],
  "monitoringStatus": "MONITORED_SIMULATED",
  "createdAt": ISODate("2026-08-14T00:00:00Z")
}
```

---

## 5. `sensorNodes` Collection (Device Registry)
Stores registered IoT telemetry nodes (hardware or simulated) mapped to a monitored water source.

| Field | BSON Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `_id` | ObjectId | Yes | Auto-generated identifier |
| `nodeId` | string | Yes | Unique identifier used in telemetry (e.g., `"NODE001"`) |
| `waterSourceId` | string | Yes | Target monitored water source (`sourceId`) |
| `name` | string | No | Label (e.g., `"Majuli Kamalabari Reach Station"`) |
| `location` | **GeoJSON Point** | Yes | Canonical point location of installation / simulation |
| `status` | string | Yes | One of `"ACTIVE"`, `"INACTIVE"`, `"DEGRADED"` |
| `isSimulated` | boolean | Yes | `true` for prototype synthetic nodes |
| `createdAt` | date | Yes | Record creation timestamp |
| `lastSeenAt` | date | No | Timestamp of most recent telemetry ingestion |

**Example Document**
```json
{
  "_id": ObjectId("66b9c26bf9a2e3d5c9a0b128"),
  "nodeId": "NODE001",
  "waterSourceId": "SRC_001",
  "name": "Majuli Kamalabari Reach Station",
  "location": { "type": "Point", "coordinates": [94.2150, 26.9500] },
  "status": "ACTIVE",
  "isSimulated": true,
  "createdAt": ISODate("2026-08-14T00:00:00Z"),
  "lastSeenAt": ISODate("2026-08-14T12:30:00Z")
}
```

---

## 6. `waterReadings` Collection
Stores time-series sensor measurements emitted by telemetry nodes.

| Field | BSON Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `_id` | ObjectId | Yes | Auto-generated identifier |
| `nodeId` | string | Yes | Identifier of the node (must exist in `sensorNodes`) |
| `timestamp` | date | Yes | UTC time of the measurement |
| `location` | **GeoJSON Point** | Yes | GeoJSON point for geospatial queries |
| `latitude` | double | Yes | Redundant latitude for API compatibility |
| `longitude` | double | Yes | Redundant longitude for API compatibility |
| `ph` | double | Yes | pH value (0.0 – 14.0) |
| `tds` | double | Yes | Total dissolved solids (ppm, ≥ 0) |
| `turbidity` | double | Yes | Turbidity (NTU, ≥ 0) |
| `temperature` | double | Yes | Water temperature (°C, -50 to 100) from DS18B20 sensor |

> **ML Feature Notice:** Exactly 4 water features (`ph`, `tds`, `turbidity`, `temperature`) are stored. No Dissolved Oxygen (DO) or Conductivity fields are present.

**Validation Rules**
- `ph` ≥ 0 && ≤ 14
- `tds` ≥ 0
- `turbidity` ≥ 0
- `temperature` ≥ -50 && ≤ 100
- Unique compound key `{ nodeId: 1, timestamp: 1 }` prevents duplicate telemetry.

**Example Document**
```json
{
  "_id": ObjectId("66b9c1f2f9a2e3d5c9a0b123"),
  "nodeId": "NODE001",
  "timestamp": ISODate("2026-08-14T12:30:00Z"),
  "location": { "type": "Point", "coordinates": [94.2150, 26.9500] },
  "latitude": 26.9500,
  "longitude": 94.2150,
  "ph": 6.8,
  "tds": 420,
  "turbidity": 8.4,
  "temperature": 28.2
}
```

---

## 7. `symptoms` Collection
Stores community symptom counts associated with a registered Assam village.

| Field | BSON Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `_id` | ObjectId | Yes | Auto-generated identifier |
| `villageId` | string | Yes | Target village identifier (`villages.villageId`) |
| `location` | **GeoJSON Point** | Yes | Geographic coordinates of the report |
| `latitude` | double | Yes | Redundant scalar latitude |
| `longitude` | double | Yes | Redundant scalar longitude |
| `timestamp` | date | Yes | UTC aggregation period (ISO 8601) |
| `feverCount` | int | Yes | Number of fever reports (≥ 0) |
| `diarrheaCount` | int | Yes | Number of diarrhea reports (≥ 0) |
| `vomitingCount` | int | Yes | Number of vomiting reports (≥ 0) |
| `abdominalPainCount` | int | Yes | Number of abdominal pain reports (≥ 0) |

> **Field Name Integrity:** Symptom counts use the exact approved names: `feverCount`, `diarrheaCount`, `vomitingCount`, `abdominalPainCount`.

**Validation Rules**
- `villageId` non-empty string referencing an existing document in `villages`.
- All 4 count fields must be integer ≥ 0.
- **Aggregation Key / Idempotency**: `{ villageId, timestamp }` serves as the canonical aggregation/upsert key for symptom reports.

**Example Document**
```json
{
  "_id": ObjectId("66b9c210f9a2e3d5c9a0b124"),
  "villageId": "VIL_MAJ_001",
  "location": { "type": "Point", "coordinates": [94.1658, 26.9466] },
  "latitude": 26.9466,
  "longitude": 94.1658,
  "timestamp": ISODate("2026-08-14T12:00:00Z"),
  "feverCount": 12,
  "diarrheaCount": 5,
  "vomitingCount": 3,
  "abdominalPainCount": 4
}
```

---

## 8. `weather` Collection
Cached hourly weather snapshots per district / geographic area.

| Field | BSON Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `_id` | ObjectId | Yes | Auto-generated identifier |
| `district` | string | No | Optional district identifier (e.g., `"Majuli"`) |
| `location` | **GeoJSON Point** | Yes | Geographic point (`coordinates: [lon, lat]`) |
| `latitude` | double | Yes | Redundant scalar latitude |
| `longitude` | double | Yes | Redundant scalar longitude |
| `temperature` | double | Yes | Ambient air temperature (°C) |
| `precipitation` | double | Yes | Rainfall amount (mm) |
| `humidity` | double | Yes | Relative humidity (%) |
| `source` | string | Yes | Weather provider (e.g., `"OpenWeatherMap"`) |
| `cachedAt` | date | Yes | Cache insertion timestamp |
| `timestamp` | date | Yes | Weather observation timestamp |

**Example Document**
```json
{
  "_id": ObjectId("66b9c22bf9a2e3d5c9a0b125"),
  "district": "Majuli",
  "location": { "type": "Point", "coordinates": [94.2150, 26.9500] },
  "latitude": 26.9500,
  "longitude": 94.2150,
  "temperature": 27.5,
  "precipitation": 0.0,
  "humidity": 80,
  "source": "OpenWeatherMap",
  "cachedAt": ISODate("2026-08-14T12:00:00Z"),
  "timestamp": ISODate("2026-08-14T12:00:00Z")
}
```

---

## 9. `riskScores` Collection
Stores AI/ML early-warning anomaly risk scores produced by the Isolation Forest model for a **monitored water source**.

| Field | BSON Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `_id` | ObjectId | Yes | Auto-generated identifier |
| `waterSourceId` | string | Yes | Identifier of the evaluated water source (`sourceId`) |
| `location` | **GeoJSON Point** | Yes | Geographic point of the monitored water source |
| `latitude` | double | Yes | Redundant scalar latitude |
| `longitude` | double | Yes | Redundant scalar longitude |
| `timestamp` | date | Yes | UTC timestamp of inference run |
| `riskScore` | double | Yes | Normalized early-warning indicator (`0.0` to `1.0`) |
| `riskLevel` | string | Yes | Categorical level: `"LOW"`, `"MEDIUM"`, `"HIGH"` |
| `modelVersion` | string | No | Model version tag (e.g., `"v1.1"`) |
| `contributingFactors` | object | No | Snapshot of the 11 ML features used in the inference |

**Validation Rules**
- `waterSourceId` non-empty string.
- `riskScore` ≥ 0.0 && ≤ 1.0.
- `riskLevel` ∈ {`LOW`, `MEDIUM`, `HIGH`}.

**Example Document**
```json
{
  "_id": ObjectId("66b9c240f9a2e3d5c9a0b126"),
  "waterSourceId": "SRC_001",
  "location": { "type": "Point", "coordinates": [94.2150, 26.9500] },
  "latitude": 26.9500,
  "longitude": 94.2150,
  "timestamp": ISODate("2026-08-14T12:45:00Z"),
  "riskScore": 0.72,
  "riskLevel": "HIGH",
  "modelVersion": "v1.1",
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

## 10. `alerts` Collection
Stores notifications generated when a water source's risk level reaches `MEDIUM` or `HIGH`.

| Field | BSON Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `_id` | ObjectId | Yes | Auto-generated identifier |
| `waterSourceId` | string | Yes | Associated water source identifier |
| `location` | **GeoJSON Point** | Yes | Coordinates of the alert event |
| `latitude` | double | Yes | Redundant scalar latitude |
| `longitude` | double | Yes | Redundant scalar longitude |
| `riskLevel` | string | Yes | `"MEDIUM"` or `"HIGH"` |
| `riskScore` | double | Yes | Numerical score from `riskScores` |
| `timestamp` | date | Yes | Timestamp of the underlying risk evaluation |
| `message` | string | Yes | Alert notification message |
| `status` | string | Yes | One of `"PENDING"`, `"SENT"`, `"FAILED"` |
| `provider` | string | No | Notification gateway (e.g., `"Twilio"`) |
| `retryCount` | int | No | Retry attempts (default: 0) |
| `lastAttemptAt` | date | No | Timestamp of most recent dispatch attempt |

**Example Document**
```json
{
  "_id": ObjectId("66b9c255f9a2e3d5c9a0b127"),
  "waterSourceId": "SRC_001",
  "location": { "type": "Point", "coordinates": [94.2150, 26.9500] },
  "latitude": 26.9500,
  "longitude": 94.2150,
  "riskLevel": "HIGH",
  "riskScore": 0.72,
  "timestamp": ISODate("2026-08-14T12:45:00Z"),
  "message": "Water quality risk HIGH at Brahmaputra River (Majuli Reach).",
  "status": "PENDING",
  "provider": "Twilio",
  "retryCount": 0
}
```

---

## 11. Index Strategy

| Collection | Index Definition | Reason / Query Pattern |
| :--- | :--- | :--- |
| `villages` | `{ villageId: 1 }` (unique) | Primary lookup by village identifier |
| `villages` | `{ primaryWaterSourceId: 1 }` | Fast retrieval of villages associated with a water source |
| `villages` | `{ location: "2dsphere" }` | Spatial filtering of settlements on GIS map |
| `waterSources` | `{ sourceId: 1 }` (unique) | Primary lookup by water source identifier |
| `waterSources` | `{ location: "2dsphere" }` | Spatial queries for water bodies |
| `sensorNodes` | `{ nodeId: 1 }` (unique) | Fast lookup for telemetry authorization |
| `sensorNodes` | `{ waterSourceId: 1 }` | Find node mapped to a water source |
| `waterReadings` | `{ nodeId: 1, timestamp: 1 }` (unique) | Enforce duplicate rejection; time-series ordering |
| `waterReadings` | `{ location: "2dsphere" }` | Spatial proximity queries |
| `waterReadings` | `{ timestamp: -1 }` | Latest telemetry retrieval for ML pipeline |
| `symptoms` | `{ villageId: 1, timestamp: -1 }` | Retrieve latest symptoms for villages associated with a source; enforces (villageId, timestamp) temporal lookup |
| `symptoms` | `{ location: "2dsphere", timestamp: -1 }` | Spatial query compatibility (no proximity fallback) |
| `weather` | `{ district: 1, timestamp: -1 }` | Fast weather lookup by district |
| `weather` | `{ location: "2dsphere", timestamp: -1 }` | Spatial weather lookup |
| `riskScores` | `{ waterSourceId: 1, timestamp: -1 }` | Retrieve latest risk score for a water source |
| `riskScores` | `{ location: "2dsphere", timestamp: -1 }` | Spatial risk queries |
| `alerts` | `{ status: 1, timestamp: -1 }` | Pull pending alerts for dispatch |
| `alerts` | `{ waterSourceId: 1, timestamp: -1 }` | Retrieve active alerts by water source |

---

## 12. Geospatial Data Model
- **Official standard:** MongoDB **GeoJSON Point** (`{ type: "Point", coordinates: [ <longitude>, <latitude> ] }`).
- **Coordinate Order:** `[longitude, latitude]` strictly enforced in all GeoJSON fields.
- **Canonical Representation:** For the `villages` and `waterSources` domain entities, `location` (GeoJSON Point) is the canonical geographic representation without standalone scalar coordinates. Legacy time-series telemetry collections maintain scalar latitude and longitude fields where required for existing API backward compatibility.

---

## 13. ML Data Access & Alignment
The scheduled 15-minute ML job aligns data as follows:
1. Iterate over each registered **`waterSources`** document with active monitoring.
2. Fetch latest telemetry from **`waterReadings`** matching the attached `sensorNodes.nodeId` (`ph`, `tds`, `turbidity`, `temperature`).
3. Fetch latest **`symptoms`** aggregated across all villages listed in `waterSources.servedVillageIds` (`feverCount`, `diarrheaCount`, `vomitingCount`, `abdominalPainCount`).
4. Fetch latest **`weather`** for the water source's district/location (`temperature`, `precipitation`, `humidity`).
5. Feed the 11-feature vector to **Isolation Forest** and write the resulting `riskScore` and `riskLevel` into `riskScores` keyed by `waterSourceId`.

---

## 14. Data Integrity & Operational Boundaries
- **Prototype Designation:** The linkage between `villages` and `waterSources` (`primaryWaterSourceId`, `servedVillageIds`) is designated as a prototype association. It does not claim verified piped-scheme dependencies.
- **Simulated Hardware:** Telemetry in `waterReadings` is simulated by `iot-simulator` for registered nodes (`NODE001`, `NODE002`, `NODE003` with `isSimulated: true`).
- **Coordinate Sourcing:** Coordinates for Assam settlements and water body reaches require verification/sourcing from authoritative sources prior to geographic seeding; no fabricated coordinates are permitted.
- **No Population Field:** No population or demographic count field is included.
- **Medical Scope:** No disease outbreak predictions, medical diagnoses, or clinical infection probabilities are stored.

---

## 15. Definition of Done
`DATABASE_SCHEMA.md` v1.1 is complete, maintaining exact field consistency with `PROJECT_ARCHITECTURE.md`, `API_CONTRACT.md`, and `AI_ML_SPEC.md` without extra collections or unapproved ML features.