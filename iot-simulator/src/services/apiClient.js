'use strict';

const axios = require('axios');
const config = require('../config');
const { DEFAULT_SIMULATOR_SETTINGS } = require('../constants');

/**
 * Reusable Axios HTTP API Client Instance.
 * Pre-configured with baseURL, timeout, standard headers, and X-API-KEY.
 */
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

if (config.apiKey) {
  headers['X-API-KEY'] = config.apiKey;
}

const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: DEFAULT_SIMULATOR_SETTINGS.HTTP_TIMEOUT_MS || 10000,
  headers
});

module.exports = apiClient;
