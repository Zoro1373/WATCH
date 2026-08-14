'use strict';

/**
 * Reusable constants for the IoT Water Quality Sensor Simulator.
 * Aligned strictly with API_CONTRACT.md and PROJECT_ARCHITECTURE.md.
 */
const SENSOR_PARAMETERS = Object.freeze({
  PH: 'ph',
  TDS: 'tds',
  TURBIDITY: 'turbidity',
  TEMPERATURE: 'temperature'
});

const DEFAULT_SIMULATOR_SETTINGS = Object.freeze({
  DEFAULT_NODE_ID: 'NODE001',
  DEFAULT_STREAM_INTERVAL_MS: 5000,
  HTTP_TIMEOUT_MS: 10000
});

module.exports = Object.freeze({
  SENSOR_PARAMETERS,
  DEFAULT_SIMULATOR_SETTINGS
});
