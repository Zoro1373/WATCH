require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const winston = require('winston');
const { connectToDatabase } = require('./db');

// Setup Winston logger
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

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Auth Middleware applied only to /api routes
const authMiddleware = require('./middleware/auth');
app.use('/api', authMiddleware);

const sensorRoute = require('./routes/sensor');
app.use('/api/sensor', sensorRoute);

const symptomRoute = require('./routes/symptom');
app.use('/api/symptom', symptomRoute);

const weatherRoute = require('./routes/weather');
app.use('/api/weather', weatherRoute);

const riskRoute = require('./routes/risk');
app.use('/api/risk', riskRoute);

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
const PORT = process.env.PORT || 3000;
let server;

const { initScheduler } = require('./jobs/scheduler');

connectToDatabase()
  .then(() => {
    logger.info('Successfully connected to MongoDB');
    initScheduler();
    server = app.listen(PORT, () => {
      logger.info(`Server initialized and listening on port ${PORT}`);
    });
  })
  .catch(err => {
    logger.error(`Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  });

module.exports = {
  get server() { return server; }
};
