'use strict';

const apiClient = require('./apiClient');

/**
 * Sends a telemetry reading payload to the backend API endpoint via HTTP POST.
 *
 * @param {Object} reading - Sensor telemetry payload object.
 * @returns {Promise<Object>} Execution result object { success, status, data, error, code }.
 */
async function sendTelemetry(reading) {
  try {
    const response = await apiClient.post('', reading);
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response ? error.response.status : null,
      code: error.code || 'HTTP_ERROR',
      error: error.message
    };
  }
}

module.exports = {
  sendTelemetry
};
