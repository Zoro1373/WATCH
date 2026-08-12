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
 *
 * @param {Object} [nodeConfig] - Optional specific node object { nodeId, latitude, longitude }.
 * @returns {Object} Simulated ESP32 telemetry reading object.
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

  return {
    nodeId,
    timestamp: new Date().toISOString(),
    ph: record.ph,
    hardness: record.hardness,
    solids: record.solids,
    chloramines: record.chloramines,
    sulfate: record.sulfate,
    conductivity: record.conductivity,
    organicCarbon: record.organicCarbon,
    trihalomethanes: record.trihalomethanes,
    turbidity: record.turbidity,
    potability: record.potability,
    latitude,
    longitude
  };
}

module.exports = {
  initializeSimulator,
  generateReading
};
