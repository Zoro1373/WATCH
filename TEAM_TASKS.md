# TEAM_TASKS.md
Version: 1.0
Status: LOCKED
## 1. Ownership Matrix
| Area | Owner | Support |
|------|-------|---------|
| Architecture | Member 1 | All |
| AI/ML | Member 1 | Member 3 (backend data access) |
| IoT / Sensor Simulation | Member 2 | Member 1 (integration) |
| Backend / API | Member 3 | Member 1 |
| MongoDB | Member 3 | Member 1 |
| Frontend / GIS Dashboard | Member 4 | Member 1 |
| MCP / NitroStack Assistant | Member 4 | Member 1 |
| System Integration | Member 1 | All |
| Final Testing / Demo | All | All |

## 2. File Ownership
| File | Primary Owner | Coordination / Review |
|------|----------------|-----------------------|
| PROJECT_ARCHITECTURE.md | Member 1 | All members (implementation) |
| API_CONTRACT.md | Member 1 (coordinates) | Backend & Frontend members consume |
| DATABASE_SCHEMA.md | Member 3 (implementation) | Member 1 reviews compatibility |
| AI_ML_SPEC.md | Member 1 | All members (especially Member 3) |
| TEAM_TASKS.md | Member 1 (maintains) | All members |
| README.md | Member 1 (coordinates) | All members contribute |

## 3. Phase‑Based Implementation
| Phase | Deliverables | Owner(s) |
|-------|-------------|----------|
| **Phase 1 – Foundations** | Finalized locked documents and creation of this TEAM_TASKS.md | All |
| **Phase 2 – Backend + Database** | Node.js skeleton, MongoDB connection, collections (`sensorNodes`, `waterReadings`, `symptoms`, `weather`, `riskScores`, `alerts`), validation, indexes, API implementation (all endpoints from API_CONTRACT.md) | Member 3 (implementation) – Member 1 reviews |
| **Phase 2 – IoT Simulator** | Synthetic sensor generator (ph, tds, turbidity, temperature, nodeId, timestamp, latitude, longitude), ~5‑minute sampling, accelerated demo mode, POST /api/sensor integration, unit tests | Member 2 |
| **Phase 3 – Frontend Foundation** | React project setup, routing, login flow, empty dashboard scaffold, basic GIS/map component | Member 4 |
| **Phase 4 – ML Pipeline** | Preprocessing, feature engineering, Isolation Forest model, `model_vX.pkl` artifact, riskScore generation (0‑1), LOW/MEDIUM/HIGH classification, contributing‑factor extraction, model versioning | Member 1 |
| **Phase 5 – End‑to‑End Integration** | Full data flow IoT → Backend → MongoDB → ML → riskScores → Backend API → Frontend GIS; verification of data shapes, timestamps, GeoJSON ordering, risk output | All (Member 1 coordinates) |
| **Phase 6 – MCP Assistant** | NitroStack MCP server, six read‑only tools (`get_location_risk`, `get_water_readings`, `get_symptom_data`, `get_weather`, `get_risk_history`, `get_contributing_factors`), AI Assistant UI integration, read‑only enforcement | Member 4 (implementation) – Member 1 provides architecture & NitroStack support |
| **Phase 7 – Testing & Demo** | Unit, integration, end‑to‑end, regression tests; rehearsal of all demo scenarios; final demo preparation | All |

## 4. Testing Responsibilities
| Member | Primary Test Areas |
|--------|-------------------|
| Member 1 | ML unit tests (preprocessing, anomaly scoring, risk classification), end‑to‑end integration tests, architecture compliance checks |
| Member 2 | Simulator output validation, payload schema, duplicate handling, invalid values, network‑failure/retry tests |
| Member 3 | REST API functional tests, authentication, request validation, MongoDB collection/index validation, weather cache and symptom ingestion tests |
| Member 4 | React component/unit tests, GIS map interactions, UI loading/error states, MCP tool read‑only tests, Assistant interaction tests |
| **All** | Full system end‑to‑end tests, regression testing, demo scenario rehearsals |

## 5. Demo Scenarios
1. **NORMAL** – Synthetic stable sensor values → backend stores data, ML produces a low anomaly → `LOW` risk displayed, no alerts.
2. **WATER QUALITY CHANGE** – Synthetic sensor values gradually become abnormal → anomaly score rises, risk level moves to `MEDIUM`/`HIGH` according to prototype thresholds, dashboard shows elevated risk.
3. **COMBINED RISK** – Abnormal water data together with increased synthetic symptom counts and adverse weather (e.g., high precipitation) → combined feature set yields higher anomaly → higher risk level, contributing factors shown.
4. **MCP QUERY** – User asks the AI Assistant “Why is this location high risk?” → MCP calls read‑only tools, retrieves existing riskScore, riskLevel and contributing features, and returns an explanation such as “Elevated turbidity and increased fever reports are among the contributing features.” No data is modified.

*All scenarios use synthetic data; no medical claims or fabricated numbers are made.*

## 6. Definition of Done
- [ ] IoT simulator sends valid JSON to `POST /api/sensor`.
- [ ] Backend validates and stores sensor data.
- [ ] MongoDB contains the required collections with correct indexes and validation.
- [ ] Symptom ingestion works and stores data.
- [ ] Weather retrieval/cache populates the `weather` collection.
- [ ] ML pipeline reads required data, runs Isolation Forest, and writes `riskScore` (0‑1) and `riskLevel` (`LOW`/`MEDIUM`/`HIGH`).
- [ ] `riskScores` include optional `modelVersion` and `contributingFactors`.
- [ ] React GIS dashboard visualizes locations, risk levels, risk scores, sensor readings, symptom data, weather, and alerts.
- [ ] Alerts are generated according to the configured alert policy defined by the locked specifications.
- [ ] NitroStack MCP server runs, read‑only tools function, and Assistant UI can query and explain risk results.
- [ ] MCP does **not** access MongoDB credentials, does not modify any data, and does not generate risk scores.
- [ ] End‑to‑end system flow works across all modules.
- [ ] All four demo scenarios execute successfully.
- [ ] No locked document was altered without explicit team approval.
- [ ] `README.md` and module documentation are prepared later.

## 7. Locked Document Rules
- The following files are immutable unless the team explicitly decides to change them: `PROJECT_ARCHITECTURE.md`, `API_CONTRACT.md`, `DATABASE_SCHEMA.md`, `AI_ML_SPEC.md`.
- If a genuine implementation conflict is discovered:
  1. Stop the work.
  2. Document the conflict.
  3. Notify Member 1.
  4. Discuss with the team and reach consensus.
  5. Apply the change **only** after approval and increment the document version if needed.
- No AI coding agent may silently modify any locked document.

## 8. Vibecoding Rules
1. **Preparation** – Before any code generation, the developer must read the four locked documents **and** `TEAM_TASKS.md`.
2. **Scope** – The coding assistant may only produce code inside the member’s assigned module.
3. **Compliance** – All generated code must follow the locked contracts; it must not create new APIs, collections, or ML features.
4. **Change Requests** – If the assistant suggests a change that would affect a locked document or another member’s module, it must stop and raise the issue to Member 1.
5. **Documentation** – Every code change must be reflected in the corresponding module documentation (to be added later) and must not alter `TEAM_TASKS.md` without Member 1’s coordination.

## 9. Module Boundaries
- **Member 1** – Architecture, AI/ML pipeline, system integration, MCP guidance.
- **Member 2** – Synthetic IoT data generation and direct API integration.
- **Member 3** – Node.js backend, REST API implementation, MongoDB schema and validation.
- **Member 4** – React GIS dashboard, UI/UX, NitroStack MCP server and read‑only tools.

No member may edit another member’s module without explicit coordination.

## 10. MCP Boundary
- The MCP Assistant is a separate product layer; it does **not** belong to the core sensor → backend → DB → ML risk‑generation pipeline.
- Core pipeline must continue functioning even if the MCP server fails.
- MCP tools are strictly **read‑only**; they may query existing risk scores, sensor readings, symptoms, and weather but must never modify or delete data, nor generate risk scores.
- MCP has no direct access to MongoDB credentials or backend secrets.

## 11. Four‑Person Ownership Summary
- **Member 1** – Owns overall system architecture, AI/ML implementation, end‑to‑end integration, and provides MCP/NitroStack guidance.
- **Member 2** – Owns the IoT/sensor simulation layer, generating synthetic data and integrating with the backend API.
- **Member 3** – Owns the Node.js backend and MongoDB implementation, including validation, authentication, and data persistence.
- **Member 4** – Owns the React GIS frontend and the NitroStack MCP Assistant (read‑only tools, UI integration).

**MCP/NitroStack** is owned by **Member 4**, with **Member 1** supplying architecture design, NitroStack setup assistance, tool contracts, and integration testing support.

---
*All statements respect the locked specifications and avoid any claims of medical diagnosis, accuracy numbers, or real hardware.*
