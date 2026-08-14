'use strict';

let totalGenerated = 0;
let totalSent = 0;
let totalFailed = 0;

/**
 * Increments the total generated readings counter.
 */
function recordGenerated() {
  totalGenerated += 1;
}

/**
 * Increments the successfully transmitted readings counter.
 */
function recordSuccess() {
  totalSent += 1;
}

/**
 * Increments the failed transmission attempts counter.
 */
function recordFailure() {
  totalFailed += 1;
}

/**
 * Returns a copy of current runtime statistics metrics.
 *
 * @returns {Object} { totalGenerated, totalSent, totalFailed }
 */
function getStatistics() {
  return Object.freeze({
    totalGenerated,
    totalSent,
    totalFailed
  });
}

/**
 * Resets all runtime counters to zero.
 */
function resetStatistics() {
  totalGenerated = 0;
  totalSent = 0;
  totalFailed = 0;
}

module.exports = {
  recordGenerated,
  recordSuccess,
  recordFailure,
  getStatistics,
  resetStatistics
};
