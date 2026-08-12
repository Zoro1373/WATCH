'use strict';

/**
 * Immutable configuration definitions for simulated ESP32 water monitoring nodes.
 * Contains node IDs and geographic coordinates for GIS mapping.
 */
const nodes = Object.freeze([
  Object.freeze({
    nodeId: 'NODE001',
    latitude: 11.0168,
    longitude: 76.9558
  }),
  Object.freeze({
    nodeId: 'NODE002',
    latitude: 11.0215,
    longitude: 76.9621
  }),
  Object.freeze({
    nodeId: 'NODE003',
    latitude: 11.0093,
    longitude: 76.9510
  })
]);

module.exports = nodes;
