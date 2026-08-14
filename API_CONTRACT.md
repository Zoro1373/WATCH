# API_CONTRACT.md
Version: 1.1
Status: LOCKED

> **Version Note (v1.1):** Added explicit Village ↔ Water Source ↔ Sensor geographic relationship and Assam GIS context while preserving the existing ML pipeline and 11-feature Isolation Forest design.

## 1. Purpose
This document defines the official API interfaces for the **AI‑POWERED WATER CONTAMINATION TRACKING AND EPIDEMIC EARLY WARNING SYSTEM** prototype. All implementations – ESP32 firmware / IoT simulator, Node.js backend, React frontend, Python ML engine, and NitroStack MCP Assistant – must conform to the contracts described here.

---

## 2. API Design Principles
- **RESTful** endpoints using standard HTTP verbs.
- **JSON** payloads (`Content‑Type: application/json`).
- All communications over **HTTPS** (TLS 1.2+).
- **Stateless** requests; state persisted in MongoDB.
- Server-side validation; malformed requests return `400 Bad Request`.
- **ISO 8601** timestamps in UTC (e.g., `2026-08-14T12:30:00Z`).
- Backward compatibility preserved for existing endpoints.
- No client-submitted risk scores; risk is generated exclusively by the ML pipeline.

---

## 3. Base Configuration & Authentication
- **Base URL**: `/api`
- **Authentication**: Prototype uses the `X-API-KEY` header for all requests. Missing or invalid keys return `401 Unauthorized`.

---

## 4. Village API

### GET /api/villages
**Purpose**: Retrieve all registered Assam settlements and their prototype water source associations for GIS mapping.

**Authentication**: Required (`X-API-KEY`).

**Successful Response** (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "villageId": "VIL_MAJ_001",
      "name": "Kamalabari",
      "district": "Majuli",
      "location": { "type": "Point", "coordinates": [94.2411, 26.9622] },
      "primaryWaterSourceId": "SRC_001",
      "verificationStatus": "VERIFIED_GEOGRAPHY_PROTOTYPE_LINK"
    }
  ]
}
```

### GET /api/villages/:villageId
**Purpose**: Retrieve details of a specific Assam village.

**Successful Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "villageId": "VIL_MAJ_001",
    "name": "Kamalabari",
    "district": "Majuli",
    "location": { "type": "Point", "coordinates": [94.2411, 26.9622] },
    "primaryWaterSourceId": "SRC_001",
    "verificationStatus": "VERIFIED_GEOGRAPHY_PROTOTYPE_LINK"
  }
}
```
**Error Responses**: `404 Not Found` if `villageId` does not exist.

---

## 5. Water Source API

### GET /api/water-sources
**Purpose**: Retrieve all monitored and unmonitored Assam water bodies for GIS visualization.

**Authentication**: Required (`X-API-KEY`).

**Successful Response** (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "sourceId": "SRC_001",
      "name": "Brahmaputra River (Majuli Reach)",
      "type": "RIVER",
      "location": { "type": "Point", "coordinates": [94.2150, 26.9500] },
      "servedVillageIds": ["VIL_MAJ_001", "VIL_MAJ_002", "VIL_MAJ_003"],
      "monitoringStatus": "MONITORED_SIMULATED",
      "sensorNodeId": "NODE001"
    }
  ]
}
```

### GET /api/water-sources/:sourceId
**Purpose**: Retrieve details of a single water source entity.

**Successful Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "sourceId": "SRC_001",
    "name": "Brahmaputra River (Majuli Reach)",
    "type": "RIVER",
    "location": { "type": "Point", "coordinates": [94.2150, 26.9500] },
    "servedVillageIds": ["VIL_MAJ_001", "VIL_MAJ_002", "VIL_MAJ_003"],
    "monitoringStatus": "MONITORED_SIMULATED",
    "sensorNodeId": "NODE001"
  }
}
```

---

## 6. Sensor Telemetry API

### POST /api/sensor
**Purpose**: Ingest water quality telemetry from registered ESP32 / IoT simulator nodes.

**Authentication**: Required (`X-API-KEY`).

**Request Body**:
```json
{
  "nodeId": "NODE001",
  "timestamp": "2026-08-14T12:30:00Z",
  "latitude": 26.9500,
  "longitude": 94.2150,
  "ph": 6.8,
  "tds": 420.0,
  "turbidity": 8.4,
  "temperature": 28.2
}
```

- `nodeId`: string, matches a registered `sensorNodes` document.
- `timestamp`: ISO 8601 UTC string.
- `latitude` / `longitude`: numeric within valid bounds.
- `ph`: 0.0 – 14.0.
- `tds`: ≥ 0 (ppm).
- `turbidity`: ≥ 0 (NTU).
- `temperature`: water temp from DS18B20 sensor (°C).

**Successful Response** (`201 Created`):
```json
{
  "success": true,
  "message": "Sensor reading accepted",
  "data": {
    "readingId": "66b9c1f2f9a2e3d5c9a0b123",
    "nodeId": "NODE001",
    "timestamp": "2026-08-14T12:30:00Z"
  }
}
```

**Duplicate Ingestion Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Duplicate reading ignored",
  "data": {
    "readingId": "66b9c1f2f9a2e3d5c9a0b123",
    "nodeId": "NODE001",
    "timestamp": "2026-08-14T12:30:00Z"
  }
}
```

---

## 7. Community Symptom API

### POST /api/symptom
**Purpose**: Ingest community symptom reports associated with a specific Assam village.

**Authentication**: Required (`X-API-KEY`).

**Request Body**:
```json
{
  "villageId": "VIL_MAJ_001",
  "timestamp": "2026-08-14T12:00:00Z",
  "feverCount": 12,
  "diarrheaCount": 5,
  "vomitingCount": 3,
  "abdominalPainCount": 4,
  "location": {
    "latitude": 26.9622,
    "longitude": 94.2411
  }
}
```

- `villageId`: string, **REQUIRED**, must match an existing village in `villages`. No geographic proximity fallback is permitted.
- `feverCount`, `diarrheaCount`, `vomitingCount`, `abdominalPainCount`: non-negative integers (exact field names preserved).
- `location`: optional geographic object (`{ latitude, longitude }`); populated automatically from the village's registered coordinates if omitted.
- `timestamp`: optional ISO 8601 UTC aggregation period timestamp (defaults to current time if omitted).

**Idempotency & Duplicate Handling**:
Symptom reports use `{ villageId, timestamp }` as the canonical aggregation and upsert key. Submitting subsequent updates for the same village within the same period updates the existing record rather than generating duplicates.

**Successful Response** (`201 Created`):
```json
{
  "success": true,
  "message": "Symptom report accepted",
  "data": {
    "symptomId": "66b9c210f9a2e3d5c9a0b124",
    "villageId": "VIL_MAJ_001",
    "timestamp": "2026-08-14T12:00:00Z"
  }
}
```

---

## 8. Risk Assessment API

### GET /api/risk/source/:sourceId
**Purpose**: Return the latest ML early-warning risk assessment for a monitored water source.

**Authentication**: Required (`X-API-KEY`).

**Successful Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "waterSourceId": "SRC_001",
    "riskScore": 0.72,
    "riskLevel": "HIGH",
    "timestamp": "2026-08-14T12:45:00Z",
    "location": {
      "latitude": 26.9500,
      "longitude": 94.2150
    },
    "contributingFactors": {
      "ph": 6.8,
      "tds": 420.0,
      "turbidity": 8.4,
      "temperature": 28.2,
      "feverCount": 12,
      "diarrheaCount": 5,
      "vomitingCount": 3,
      "abdominalPainCount": 4,
      "weatherTemperature": 27.5,
      "precipitation": 0.0,
      "humidity": 80.0
    }
  }
}
```

### GET /api/risk/:location
**Purpose**: Backward-compatible endpoint to retrieve latest risk for nearest coordinates (`lat,lon`).

**Successful Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "waterSourceId": "SRC_001",
    "riskScore": 0.72,
    "riskLevel": "HIGH",
    "timestamp": "2026-08-14T12:45:00Z",
    "location": {
      "latitude": 26.9500,
      "longitude": 94.2150
    },
    "contributingFactors": {
      "ph": 6.8,
      "tds": 420.0,
      "turbidity": 8.4,
      "temperature": 28.2,
      "feverCount": 12,
      "diarrheaCount": 5,
      "vomitingCount": 3,
      "abdominalPainCount": 4,
      "weatherTemperature": 27.5,
      "precipitation": 0.0,
      "humidity": 80.0
    }
  }
}
```

---

## 9. Weather API

### GET /api/weather/:location
**Purpose**: Retrieve cached hourly weather data for a geographic location / district.

**Successful Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "district": "Majuli",
    "location": {
      "latitude": 26.9500,
      "longitude": 94.2150
    },
    "temperature": 27.5,
    "precipitation": 0.0,
    "humidity": 80.0,
    "source": "OpenWeatherMap",
    "cachedAt": "2026-08-14T12:00:00Z",
    "timestamp": "2026-08-14T12:00:00Z"
  }
}
```

---

## 10. AI/ML Scheduled Interface
The Python ML job runs on a 15-minute schedule.

**Input Vector Contract (11 Numerical Features):**
1. `ph` (water reading)
2. `tds` (water reading)
3. `turbidity` (water reading)
4. `temperature` (water reading)
5. `feverCount` (village symptoms aggregate)
6. `diarrheaCount` (village symptoms aggregate)
7. `vomitingCount` (village symptoms aggregate)
8. `abdominalPainCount` (village symptoms aggregate)
9. `temperature` (weather ambient)
10. `precipitation` (weather rainfall)
11. `humidity` (weather relative humidity)

**Output Contract:**
Writes document directly to `riskScores` containing `waterSourceId`, `riskScore`, `riskLevel`, `timestamp`, and `contributingFactors`.

---

## 11. Error Response Contract
All error responses conform to:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description of error",
    "details": []
  }
}
```
**Error Codes**: `VALIDATION_ERROR`, `AUTHENTICATION_ERROR`, `RATE_LIMIT_EXCEEDED`, `NOT_FOUND`, `INTERNAL_ERROR`.

---

## 12. Validation Constraints Summary

| Field | Type | Constraint |
| :--- | :--- | :--- |
| `ph` | number | 0.0 ≤ value ≤ 14.0 |
| `tds` | number | value ≥ 0 |
| `turbidity` | number | value ≥ 0 |
| `temperature` (water) | number | -50.0 ≤ value ≤ 100.0 |
| `feverCount` | integer | value ≥ 0 |
| `diarrheaCount` | integer | value ≥ 0 |
| `vomitingCount` | integer | value ≥ 0 |
| `abdominalPainCount` | integer | value ≥ 0 |
| `latitude` | number | -90.0 ≤ value ≤ 90.0 |
| `longitude` | number | -180.0 ≤ value ≤ 180.0 |
| `riskScore` | number | 0.0 ≤ value ≤ 1.0 (ML generated only) |
| `riskLevel` | string | One of `"LOW"`, `"MEDIUM"`, `"HIGH"` |

---

## 13. Rate Limiting
- `POST /api/sensor`: 60 requests per minute per `nodeId`.

---

## 14. Frontend & MCP Assistant Integration
- **GIS Map**: Queries `/api/villages`, `/api/water-sources`, and `/api/risk/source/:sourceId`.
- **Symptom Form**: Submits to `POST /api/symptom` with selected `villageId`.
- **MCP Assistant**: Uses read-only tools that call backend query endpoints (`get_location_risk`, `get_water_readings`, `get_symptom_data`, `get_weather`, `get_risk_history`, `get_contributing_factors`).

---

## 15. Security & Privacy Rules
- All endpoints require valid API key authentication.
- Secrets and database credentials are never returned over the API.
- The ML engine and database are inaccessible to frontend clients except via these REST endpoints.