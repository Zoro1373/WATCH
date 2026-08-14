# IoT Water Quality Sensor Simulator (Member 2 Module) - WaterGuard AI

A professional, scalable Node.js multi-node telemetry simulation engine for simulating ESP32-based water quality telemetry nodes for the **WaterGuard AI** hackathon platform.

---

## 📌 Project Overview

The **IoT Sensor Simulator** simulates real-world ESP32 water quality sensors (e.g., pH, Turbidity, Conductance, Dissolved Solids) transmitting stream data to the backend API endpoint (`POST /api/sensor`).

- **Phase 1 (Foundation)**: Centralized configuration (`dotenv`), structured Winston logging (`logs/app.log`), reusable Axios API client, and clean directory architecture.
- **Phase 2 (CSV Dataset Loader & Simulator Utility)**: Asynchronous dataset parser (`csv-parser`), strict numeric row validation, encapsulated simulator state, and random record reader.
- **Phase 3 (Telemetry Streaming & Backend API Integration)**: Single-timer streaming engine (`setInterval`), Axios HTTP POST integration (`X-API-KEY`), non-blocking failure tolerance, and graceful shutdown handlers (`SIGINT`/`SIGTERM`).
- **Phase 4 (Multi-Node Simulation & Telemetry Enhancements)**: Multi-node coordinate registry (`src/config/nodes.js`), node-tagged logging (`[NODE001]`), in-memory runtime statistics (`src/utils/statistics.js`), and shutdown summary reporting.

---

## 🔄 Multi-Node Telemetry Streaming Workflow

```text
               CSV Dataset (datasets/water_potability.csv)
                                    │
                                    ▼
                   CSV Loader (src/data/csvLoader.js)
                                    │
                                    ▼
                In-Memory Validated Dataset Array
                                    │
                                    ▼
          Sensor Simulator (src/simulator/sensorSimulator.js)
                                    │
                                    ▼
          Stream Manager (src/simulator/streamManager.js)
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    │ Every STREAM_INTERVAL (Default: 5000ms), iterate sequentially  │
    └───────────────────────────────┬───────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
    [NODE001]                   [NODE002]                   [NODE003]
(11.0168, 76.9558)          (11.0215, 76.9621)          (11.0093, 76.9510)
        │                           │                           │
        ▼                           ▼                           ▼
Generate Reading            Generate Reading            Generate Reading
        │                           │                           │
        ▼                           ▼                           ▼
HTTP POST to API            HTTP POST to API            HTTP POST to API
```

---

## 📁 Project Structure

```
iot-simulator/
│
├── datasets/
│   └── water_potability.csv     # Clean Kaggle Water Potability dataset
│
├── logs/
│   ├── .gitkeep                 # Directory keeper for git
│   └── app.log                  # Transport log file output
│
├── src/
│   ├── config/
│   │   ├── index.js             # Centralized environment configuration (frozen)
│   │   └── nodes.js             # [NEW] Multi-node coordinate definitions (frozen)
│   │
│   ├── constants/
│   │   └── index.js             # Sensor parameters & system defaults (frozen)
│   │
│   ├── data/
│   │   └── csvLoader.js         # Asynchronous CSV parser & row validator
│   │
│   ├── services/
│   │   ├── apiClient.js         # Pre-configured reusable Axios HTTP client instance
│   │   └── telemetryService.js  # HTTP POST telemetry sender service
│   │
│   ├── simulator/
│   │   ├── sensorSimulator.js   # Multi-node sensor simulator & payload generator
│   │   └── streamManager.js     # Single-timer multi-node streaming engine
│   │
│   ├── utils/
│   │   ├── logger.js            # Reusable Winston logger (Console & app.log file)
│   │   └── statistics.js        # [NEW] Encapsulated runtime metrics counter
│   │
│   └── index.js                 # Application entry point & startup controller
│
├── .env                         # Local environment configuration file
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore patterns
├── package.json                 # Project dependencies & npm scripts
└── README.md                    # Project documentation
```

---

## ⚙️ Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `API_URL` | Backend telemetry API endpoint | `http://localhost:5000/api/sensor` |
| `API_KEY` | Secret API key passed via `X-API-KEY` header | `wg_secret_sim_key_2026` |
| `NODE_ID` | Default fallback node ID | `NODE001` |
| `LATITUDE` | Default latitude coordinate | `11.0168` |
| `LONGITUDE` | Default longitude coordinate | `76.9558` |
| `STREAM_INTERVAL` | Telemetry broadcast frequency in milliseconds | `5000` |
| `DEMO_MODE` | Toggle synthetic CSV looping vs real-time mode | `true` |
| `LOG_LEVEL` | Logging verbosity level (`info`, `warn`, `error`, `debug`) | `info` |

---

## 🛠️ Installation & Execution

1. **Install dependencies**:
   ```bash
   cd iot-simulator
   npm install
   ```

2. **Start Multi-Node Telemetry Simulator**:
   ```bash
   npm start
   ```

3. **Graceful Stop & Summary Report**:
   Press `Ctrl+C` in the terminal to trigger `SIGINT` cleanup and view runtime statistics summary.

---

## 📋 Example Console Output (Phase 4 Multi-Node)

#### Multi-Node Telemetry Output:
```text
[2026-08-12 22:25:00] [info]: IoT Simulator Started...
[2026-08-12 22:25:00] [info]: Configuration Loaded...
[2026-08-12 22:25:00] [info]: Logger Initialized...
[2026-08-12 22:25:00] [info]: Dataset Loaded Successfully.
[2026-08-12 22:25:00] [info]: Valid Records: 17
[2026-08-12 22:25:00] [info]: Sensor Simulator Initialized for 3 Configured Nodes.
[2026-08-12 22:25:00] [info]: Streaming Engine Started for 3 Nodes (Interval: 5000ms).
[2026-08-12 22:25:00] [info]: [NODE001] Generated Sensor Reading (pH: 7.08, Turbidity: 2.96, Solids: 20791.3)
[2026-08-12 22:25:00] [warn]: [NODE001] Telemetry Transmission Failed (ECONNREFUSED)
[2026-08-12 22:25:00] [info]: [NODE002] Generated Sensor Reading (pH: 8.32, Turbidity: 4.63, Solids: 22018.4)
[2026-08-12 22:25:00] [warn]: [NODE002] Telemetry Transmission Failed (ECONNREFUSED)
[2026-08-12 22:25:00] [info]: [NODE003] Generated Sensor Reading (pH: 5.58, Turbidity: 2.56, Solids: 28748.7)
[2026-08-12 22:25:00] [warn]: [NODE003] Telemetry Transmission Failed (ECONNREFUSED)
[2026-08-12 22:25:00] [info]: Streaming Started.
```

#### Graceful Shutdown Summary:
```text
[2026-08-12 22:25:15] [info]: Received SIGINT. Initiating graceful shutdown...
[2026-08-12 22:25:15] [info]: Streaming Engine Stopped.
[2026-08-12 22:25:15] [info]: ========== Simulation Summary ==========
[2026-08-12 22:25:15] [info]: Nodes Simulated : 3
[2026-08-12 22:25:15] [info]: Generated       : 9
[2026-08-12 22:25:15] [info]: Successful      : 0
[2026-08-12 22:25:15] [info]: Failed          : 9
[2026-08-12 22:25:15] [info]: ========================================
[2026-08-12 22:25:15] [info]: Application Shutdown Complete.
```
