const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { validateBody } = require('../middleware/validator');
const { sensorSchema } = require('../schemas');
const sensorRateLimiter = require('../middleware/rateLimiter');
const { Double } = require('mongodb');

router.post('/', validateBody(sensorSchema), sensorRateLimiter, async (req, res) => {
  try {
    const db = getDb();
    const { nodeId, timestamp, latitude, longitude, ph, tds, turbidity, temperature } = req.body;
    const parsedTimestamp = new Date(timestamp);

    // 1. Verify that the nodeId exists in sensorNodes
    const node = await db.collection('sensorNodes').findOne({ nodeId });
    if (!node) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Sensor node '${nodeId}' is not registered`,
          details: []
        }
      });
    }

    // 2. Check for duplicate reading (nodeId + timestamp)
    const existingReading = await db.collection('waterReadings').findOne({ nodeId, timestamp: parsedTimestamp });
    if (existingReading) {
      return res.status(200).json({
        success: true,
        message: "Duplicate reading",
        data: {
          readingId: existingReading._id.toString(),
          nodeId,
          timestamp
        }
      });
    }

    // 3. Insert reading into waterReadings with GeoJSON Point
    const newReading = {
      nodeId,
      timestamp: parsedTimestamp,
      location: {
        type: "Point",
        coordinates: [new Double(longitude), new Double(latitude)] // GeoJSON is [lon, lat]
      },
      latitude: new Double(latitude),
      longitude: new Double(longitude),
      ph: new Double(ph),
      tds: new Double(tds),
      turbidity: new Double(turbidity),
      temperature: new Double(temperature)
    };

    const result = await db.collection('waterReadings').insertOne(newReading);

    // Update lastSeenAt on the sensor node (optional but good practice)
    await db.collection('sensorNodes').updateOne({ nodeId }, { $set: { lastSeenAt: new Date() } });

    // 4. Return standard 201 Created response
    res.status(201).json({
      success: true,
      message: "Sensor reading accepted",
      data: {
        readingId: result.insertedId.toString(),
        nodeId,
        timestamp
      }
    });

  } catch (err) {
    // Handle edge-case race condition where unique index throws duplicate key error
    if (err.code === 11000) {
      const db = getDb();
      const existingReading = await db.collection('waterReadings').findOne({ nodeId: req.body.nodeId, timestamp: new Date(req.body.timestamp) });
      if (existingReading) {
        return res.status(200).json({
          success: true,
          message: "Duplicate reading",
          data: {
            readingId: existingReading._id.toString(),
            nodeId: req.body.nodeId,
            timestamp: req.body.timestamp
          }
        });
      }
    }

    console.error(err);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        details: []
      }
    });
  }
});

module.exports = router;
