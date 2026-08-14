'use strict';

const config = require('../config');

let dataset = [];

/**
 * Initializes the ESP32 sensor simulator with loaded dataset records.
 *
 * @param {Array<Object>} loadedDataset - Array of validated dataset records.
 */
function initializeSimulator(loadedDataset) {
  if (!Array.isArray(loadedDataset) || loadedDataset.length === 0) {
    throw new Error('Sensor Simulator initialization failed: Provided dataset must be a non-empty array.');
  }

  dataset = loadedDataset;
}

/**
 * Generates a single simulated sensor reading payload for a specified node configuration.
 * Compliant strictly with API_CONTRACT.md Section 6 (POST /api/sensor).
 *
 * Returns exactly 8 parameters:
 * { nodeId, timestamp, latitude, longitude, ph, tds, turbidity, temperature }
 *
 * @param {Object} [nodeConfig] - Optional specific node object { nodeId, latitude, longitude }.
 * @returns {Object} Simulated ESP32 telemetry reading object matching API_CONTRACT.md.
 */
function generateReading(nodeConfig) {
  if (dataset.length === 0) {
    throw new Error('Sensor Simulator not initialized. Call initializeSimulator(dataset) first.');
  }

  const randomIndex = Math.floor(Math.random() * dataset.length);
  const record = dataset[randomIndex];

  const nodeId = nodeConfig && nodeConfig.nodeId ? nodeConfig.nodeId : config.nodeId;
  const latitude = nodeConfig && nodeConfig.latitude !== undefined ? nodeConfig.latitude : config.latitude;
  const longitude = nodeConfig && nodeConfig.longitude !== undefined ? nodeConfig.longitude : config.longitude;

  // Simulate DS18B20 waterproof sensor temperature reading (°C) as per PROJECT_ARCHITECTURE.md Section 6
  // Plausible water temperature range: 24.0°C to 29.5°C
  const simulatedTemp = Number((24.0 + ((record.ph * 7 + record.turbidity * 3) % 5.5)).toFixed(1));

  return {
    nodeId,
    timestamp: new Date().toISOString(),
    latitude,
    longitude,
    ph: record.ph,
    tds: record.tds,
    turbidity: record.turbidity,
    temperature: simulatedTemp
  };
}

module.exports = {
  initializeSimulator,
  generateReading
};
