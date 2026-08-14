const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/water-sources - Retrieve all registered water sources for GIS mapping
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const waterSources = await db.collection('waterSources')
      .find({}, { projection: { _id: 0 } })
      .toArray();

    // Attach mapped sensorNodeId for each water source if exists
    const sensorNodes = await db.collection('sensorNodes').find({}).toArray();
    const nodeMap = new Map();
    for (const node of sensorNodes) {
      if (node.waterSourceId) {
        nodeMap.set(node.waterSourceId, node.nodeId);
      }
    }

    const data = waterSources.map(source => ({
      ...source,
      sensorNodeId: nodeMap.get(source.sourceId) || null
    }));

    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    console.error("Error retrieving water sources:", err);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while fetching water sources",
        details: []
      }
    });
  }
});

// GET /api/water-sources/:sourceId - Retrieve single water source by sourceId
router.get('/:sourceId', async (req, res) => {
  try {
    const db = getDb();
    const sourceId = req.params.sourceId;

    const source = await db.collection('waterSources')
      .findOne({ sourceId }, { projection: { _id: 0 } });

    if (!source) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Water source '${sourceId}' is not registered`,
          details: []
        }
      });
    }

    const node = await db.collection('sensorNodes').findOne({ waterSourceId: sourceId });
    source.sensorNodeId = node ? node.nodeId : null;

    return res.status(200).json({
      success: true,
      data: source
    });
  } catch (err) {
    console.error("Error retrieving water source by ID:", err);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while fetching water source",
        details: []
      }
    });
  }
});

module.exports = router;
