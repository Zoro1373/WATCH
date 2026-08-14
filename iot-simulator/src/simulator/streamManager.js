'use strict';

const config = require('../config');
const nodes = require('../config/nodes');
const logger = require('../utils/logger');
const statistics = require('../utils/statistics');
const { generateReading } = require('./sensorSimulator');
const { sendTelemetry } = require('../services/telemetryService');

let streamTimer = null;

/**
 * Executes a single telemetry stream cycle across all configured simulation nodes:
 * For each node sequentially: generates a reading, updates stats, sends payload, logs node-tagged result.
 */
async function streamTick() {
  try {
    for (const node of nodes) {
      const reading = generateReading(node);
      statistics.recordGenerated();

      logger.info(`[${node.nodeId}] Generated Sensor Reading (pH: ${reading.ph.toFixed(2)}, TDS: ${reading.tds.toFixed(1)} ppm, Turbidity: ${reading.turbidity.toFixed(2)} NTU, Temp: ${reading.temperature.toFixed(1)}°C)`);
      logger.debug(`[${node.nodeId}] Full Telemetry Payload: ${JSON.stringify(reading)}`);

      const result = await sendTelemetry(reading);

      if (result.success) {
        statistics.recordSuccess();
        logger.info(`[${node.nodeId}] Telemetry Sent Successfully (HTTP ${result.status})`);
      } else {
        statistics.recordFailure();
        const errorDetail = result.status ? `HTTP ${result.status}` : (result.code || result.error);
        logger.warn(`[${node.nodeId}] Telemetry Transmission Failed (${errorDetail})`);
      }
    }
  } catch (err) {
    logger.error(`Stream Tick Error: ${err.message}`);
  }
}

/**
 * Starts periodic telemetry streaming using a single setInterval timer.
 * Safe against duplicate execution.
 */
function startStreaming() {
  if (streamTimer) {
    logger.warn('Stream Manager is already running.');
    return;
  }

  logger.info(`Streaming Engine Started for ${nodes.length} Nodes (Interval: ${config.streamInterval}ms).`);
  
  // Trigger immediate first tick, then schedule periodic ticks
  streamTick();
  streamTimer = setInterval(streamTick, config.streamInterval);
}

/**
 * Stops periodic telemetry streaming timer cleanly.
 */
function stopStreaming() {
  if (streamTimer) {
    clearInterval(streamTimer);
    streamTimer = null;
    logger.info('Streaming Engine Stopped.');
  }
}

module.exports = {
  startStreaming,
  stopStreaming
};
