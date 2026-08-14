# TEAM_TASKS.md
Version: 1.1
Status: LOCKED

> **Version Note (v1.1):** Added explicit Village ↔ Water Source ↔ Sensor geographic relationship and Assam GIS context while preserving the existing ML pipeline and 11-feature Isolation Forest design.

## 1. Ownership Matrix
| Area | Owner | Support |
| :--- | :--- | :--- |
| Architecture & Integration | Member 1 | All |
| AI/ML Pipeline & Data Alignment | Member 1 | Member 3 (backend data access) |
| IoT / Sensor Simulation | Member 2 | Member 1 (integration) |
| Backend API & MongoDB | Member 3 | Member 1 |
| Villages & Water Sources Domain | Member 3 | Member 1 & Member 4 |
| Assam GIS Dashboard & UI | Member 4 | Member 1 |
| NitroStack MCP Assistant | Member 4 | Member 1 (architecture & tools) |
| Final Testing & Demo Rehearsal | All | All |

---

## 2. File Ownership
| File | Primary Owner | Coordination / Review |
| :--- | :--- | :--- |
| `PROJECT_ARCHITECTURE.md` | Member 1 | All members |
| `API_CONTRACT.md` | Member 1 (coordinates) | Member 3 & Member 4 |
| `DATABASE_SCHEMA.md` | Member 3 (implementation) | Member 1 (reviews compatibility) |
| `AI_ML_SPEC.md` | Member 1 | Member 3 & Member 4 |
| `TEAM_TASKS.md` | Member 1 (maintains) | All members |
| `README.md` | Member 1 (coordinates) | All members |

---

## 3. Phase‑Based Implementation Plan

| Phase | Deliverables | Owner(s) |
| :--- | :--- | :--- |
| **Phase 1 — Foundations (Complete)** | Locked architecture documents v1.1 reflecting real Assam geography, prototype associations, and 11-feature ML pipeline. | All |
| **Phase 2 — Backend & Database** | Node.js backend, MongoDB setup with 8 collections (`villages`, `waterSources`, `sensorNodes`, `waterReadings`, `symptoms`, `weather`, `riskScores`, `alerts`), geospatial indexes, REST endpoints (`/api/villages`, `/api/water-sources`, `/api/sensor`, `/api/symptom`, `/api/risk`, `/api/weather`). | Member 3 (implementation), Member 1 (review) |
| **Phase 2 — IoT Simulator** | Synthetic sensor generator emitting `ph`, `tds`, `turbidity`, `temperature` for simulated nodes (`NODE001`, `NODE002`, `NODE003`) mapped to Assam water sources (`SRC_001`, `SRC_002`, `SRC_003`), ~5-min sampling, accelerated demo mode. | Member 2 |
| **Phase 3 — Frontend & GIS Foundation** | React SPA, Assam regional GIS map (Majuli, Kamrup Metro, Cachar), rendering village markers, water sources, simulated sensor badges, and village symptom submission form with village selector. | Member 4 |
| **Phase 4 — ML Pipeline** | Python Isolation Forest job aligning water telemetry by source, aggregating symptoms across associated villages, merging weather, running 11-feature inference, generating `riskScore` (0–1), `riskLevel`, and contributing factors. | Member 1 |
| **Phase 5 — End‑to‑End Integration** | Complete pipeline integration: IoT Simulator → Backend API → MongoDB → ML Job → `riskScores` → Backend API → React Assam GIS Dashboard; verification of GeoJSON ordering and threshold alerts. | All (Member 1 coordinates) |
| **Phase 6 — MCP Assistant** | NitroStack MCP server, read-only tools (`get_location_risk`, `get_water_readings`, `get_symptom_data`, `get_weather`, `get_risk_history`, `get_contributing_factors`), natural-language risk explanation UI. | Member 4 (implementation), Member 1 (architecture) |
| **Phase 7 — Testing & Demo** | Unit and end-to-end testing, demo scenario rehearsals across all 3 Assam regions. | All |

---

## 4. Testing Responsibilities
| Member | Primary Test Areas |
| :--- | :--- |
| **Member 1** | ML pipeline unit tests, multi-modal geographic data alignment, Isolation Forest anomaly scoring, end-to-end integration tests. |
| **Member 2** | IoT simulator payload schema validation (`ph`, `tds`, `turbidity`, `temp`), duplicate rejection tests, network retry behavior. |
| **Member 3** | REST API endpoints (`/api/villages`, `/api/water-sources`, `/api/sensor`, `/api/symptom`, `/api/risk`), MongoDB schema/indexes validation, symptom-to-village association. |
| **Member 4** | React UI unit tests, Assam GIS map interaction & layer filtering, symptom form submission, MCP read-only tool constraints. |
| **All** | Full end-to-end verification and hackathon pitch demo rehearsals. |

---

## 5. Demo Scenarios (Real Assam Regional Context)
1. **NORMAL (Majuli Reach / `SRC_001`):** Stable simulated telemetry from `NODE001` + baseline symptoms from Kamalabari, Salmora, Garmur → ML produces `riskScore < 0.40` → 🟢 **LOW Risk** on GIS.
2. **WATER QUALITY DRIFT (Deepor Beel / `SRC_002`):** Elevated turbidity and anomalous pH from `NODE002` → ML evaluates anomaly → 🟡 **MEDIUM Risk (0.58)** advisory on GIS.
3. **COMBINED MULTI-MODAL ANOMALY (Barak River / `SRC_003`):** High turbidity + spike in symptom reports from Sonabarighat / Borkhola + heavy precipitation → ML produces `riskScore >= 0.70` → 🔴 **HIGH Risk** alert with contributing factors.
4. **MCP ASSISTANT QUERY:** User asks "Why is Deepor Beel showing medium risk?"; MCP calls read-only tools and explains: "Turbidity and pH deviations are the primary contributing factors."

---

## 6. Definition of Done
- [ ] IoT simulator emits valid telemetry for registered Assam nodes.
- [ ] Backend stores and validates `villages`, `waterSources`, `sensorNodes`, `waterReadings`, `symptoms`, `weather`, `riskScores`, `alerts`.
- [ ] ML pipeline aligns data via `waterSourceId` across exactly 11 features and runs Isolation Forest.
- [ ] React GIS dashboard visualizes real Assam geography with color-coded risk and clear prototype simulation disclaimers.
- [ ] NitroStack MCP server provides read-only explanations without database write access or risk generation.
- [ ] No unapproved features (DO, conductivity, population, medical diagnosis) are introduced.

---

## 7. Locked Document Governance
- Any modifications to the 4 locked documents require unanimous team consensus and formal version increments.
- Coding agents must respect all contracts and not alter architectural boundaries.
