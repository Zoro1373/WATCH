'use strict';

const config = require('./config');
const nodes = require('./config/nodes');
const logger = require('./utils/logger');
const statistics = require('./utils/statistics');
const { loadDataset } = require('./data/csvLoader');
const { initializeSimulator } = require('./simulator/sensorSimulator');
const { startStreaming, stopStreaming } = require('./simulator/streamManager');

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Initiating graceful shutdown...`);
  stopStreaming();

  const stats = statistics.getStatistics();
  logger.info('========== Simulation Summary ==========');
  logger.info(`Nodes Simulated : ${nodes.length}`);
  logger.info(`Generated       : ${stats.totalGenerated}`);
  logger.info(`Successful      : ${stats.totalSent}`);
  logger.info(`Failed          : ${stats.totalFailed}`);
  logger.info('========================================');
  logger.info('Application Shutdown Complete.');
  
  process.exit(0);
}

async function main() {
  try {
    logger.info('IoT Simulator Started...');
    logger.info('Configuration Loaded...');
    logger.info('Logger Initialized...');

    // Load CSV Dataset
    const records = await loadDataset();
    logger.info('Dataset Loaded Successfully.');
    logger.info(`Valid Records: ${records.length}`);

    // Initialize Simulator
    initializeSimulator(records);
    logger.info(`Sensor Simulator Initialized for ${nodes.length} Configured Nodes.`);

    // Register OS Process Termination Signal Handlers
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Start Telemetry Streaming
    startStreaming();
    logger.info('Streaming Started.');
  } catch (error) {
    logger.error(`IoT Simulator Initialization Failure: ${error.message}`);
    process.exit(1);
  }
}

main();
