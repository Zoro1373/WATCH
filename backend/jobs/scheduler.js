const cron = require('node-cron');
const { runWeatherJob } = require('./weatherFetcher');
const { runMLInference } = require('./mlRunner');
const { processAlerts } = require('../services/alertService');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

let isInitialized = false;

function initScheduler() {
  if (isInitialized) {
    logger.warn('Scheduler is already initialized.');
    return;
  }

  logger.info('Initializing backend background jobs scheduler');

  // Hourly weather fetcher as specified by PROJECT_ARCHITECTURE.md
  // '0 * * * *' runs exactly at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Cron triggered: runWeatherJob');
    await runWeatherJob();
  });

  // Note: Alert processing will be triggered sequentially by the ML job completion, not by a polling cron.
  
  // ML inference: Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Cron triggered: runMLInference');
    await runMLInference();
  });

  isInitialized = true;
  logger.info('Scheduler initialized successfully');
}

module.exports = { initScheduler };
