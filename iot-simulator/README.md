# IoT Water Quality Sensor Simulator (Member 2 Module) - WaterGuard AI

A professional, scalable Node.js multi-node telemetry simulation engine for simulating ESP32-based water quality telemetry nodes for the **WaterGuard AI** hackathon platform.

---

## 📌 Project Overview

The **IoT Sensor Simulator** simulates real-world ESP32 water quality sensors transmitting stream data to the backend API endpoint (`POST /api/sensor`).

- **Phase 1 (Foundation)**: Centralized configuration (`dotenv`), structured Winston logging (`logs/app.log`), reusable Axios API client, and clean directory architecture.
- **Phase 2 (CSV Dataset Loader & Simulator Utility)**: Asynchronous dataset parser (`csv-parser`), strict numeric row validation, encapsulated simulator state, and random record reader.
- **Phase 3 (Telemetry Streaming & Backend API Integration)**: Single-timer streaming engine (`setInterval`), Axios HTTP POST integration (`X-API-KEY`), non-blocking failure tolerance, and graceful shutdown handlers (`SIGINT`/`SIGTERM`).
- **Phase 4 (Multi-Node Simulation & Telemetry Enhancements)**: Multi-node coordinate registry (`src/config/nodes.js`), node-tagged logging (`[NODE001]`), in-memory runtime statistics (`src/utils/statistics.js`), and shutdown summary reporting.
- **Phase 12 (Integration Correction)**: Aligned payload schema strictly with `API_CONTRACT.md` Section 6 (`nodeId`, `timestamp`, `latitude`, `longitude`, `ph`, `tds`, `turbidity`, `temperature`).

---

## 📋 Standard Telemetry Payload (`POST /api/sensor`)

```json
{
  "nodeId": "NODE001",
  "timestamp": "2026-08-14T12:45:00.123Z",
  "latitude": 11.0168,
  "longitude": 76.9558,
  "ph": 7.08,
  "tds": 20791.3,
  "turbidity": 2.96,
  "temperature": 27.2
}
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
│   │   └── nodes.js             # Multi-node coordinate definitions (frozen)
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
│   │   └── logger.js            # Reusable Winston logger (Console & app.log file)
│   │   └── statistics.js        # Encapsulated runtime metrics counter
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

## 🛠️ Execution & Testing

```bash
cd iot-simulator
npm install
npm start
```
