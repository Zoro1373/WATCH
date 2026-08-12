'use strict';

const dotenv = require('dotenv');
dotenv.config();

/**
 * Centralized Application Configuration Module.
 * All environment variables are parsed, defaulted, and frozen here.
 * No other module should directly access `process.env`.
 */
const config = Object.freeze({
  apiUrl: process.env.API_URL || 'http://localhost:5000/api/sensor',
  apiKey: process.env.API_KEY || '',
  nodeId: process.env.NODE_ID || 'NODE001',
  latitude: process.env.LATITUDE ? parseFloat(process.env.LATITUDE) : null,
  longitude: process.env.LONGITUDE ? parseFloat(process.env.LONGITUDE) : null,
  streamInterval: parseInt(process.env.STREAM_INTERVAL, 10) || 5000,
  demoMode: process.env.DEMO_MODE === 'true',
  logLevel: process.env.LOG_LEVEL || 'info'
});

module.exports = config;
