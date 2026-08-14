'use strict';

/**
 * Reusable constants for the IoT Water Quality Sensor Simulator.
 * Reserved for sensor feature definitions, default ranges, and protocol constants.
 * No business logic is implemented here in Phase 1.
 */
const SENSOR_PARAMETERS = Object.freeze({
  PH: 'ph',
  HARDNESS: 'Hardness',
  SOLIDS: 'Solids',
  CHLORAMINES: 'Chloramines',
  SULFATE: 'Sulfate',
  CONDUCTIVITY: 'Conductivity',
  ORGANIC_CARBON: 'Organic_carbon',
  TRIHALOMETHANES: 'Trihalomethanes',
  TURBIDITY: 'Turbidity',
  POTABILITY: 'Potability'
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
