'use strict';

/**
 * Immutable configuration definitions for simulated ESP32 water monitoring nodes.
 * Contains node IDs and geographic coordinates for GIS mapping.
 */
const nodes = Object.freeze([
  Object.freeze({
    nodeId: 'NODE001',
    latitude: 26.9380,
    longitude: 94.1620
  }),
  Object.freeze({
    nodeId: 'NODE002',
    latitude: 26.1333,
    longitude: 91.6667
  }),
  Object.freeze({
    nodeId: 'NODE003',
    latitude: 24.8260,
    longitude: 92.7980
  })
]);

module.exports = nodes;
