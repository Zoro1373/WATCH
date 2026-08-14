const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { validateParams } = require('../middleware/validator');
const { locationParamSchema } = require('../schemas');

router.get('/:location', validateParams(locationParamSchema), async (req, res) => {
  try {
    const db = getDb();
    const locStr = req.params.location;
    const [latStr, lonStr] = locStr.split(',');
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lonStr);

    // Geospatial search using $geoWithin allows $sort based on the compound index { location: "2dsphere", timestamp: -1 }
    // Using a 50km radius as a reasonable buffer for a cached weather station observation
    const radiusInRadians = 50 / 6378.1;
    const weatherDocs = await db.collection('weather')
      .find({
        location: {
          $geoWithin: {
            $centerSphere: [ [longitude, latitude], radiusInRadians ]
          }
        }
      })
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    if (weatherDocs.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "No weather data found for this location",
          details: []
        }
      });
    }

    const doc = weatherDocs[0];

    return res.status(200).json({
      success: true,
      data: {
        location: {
          latitude: doc.latitude,
          longitude: doc.longitude
        },
        temperature: doc.temperature,
        precipitation: doc.precipitation,
        humidity: doc.humidity,
        source: doc.source,
        cachedAt: doc.cachedAt.toISOString(),
        timestamp: doc.timestamp.toISOString()
      }
    });

  } catch (err) {
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
