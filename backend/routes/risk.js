const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { validateParams } = require('../middleware/validator');
const { locationParamSchema } = require('../schemas');

// GET /api/risk/source/:sourceId - Retrieve latest risk for a monitored water source
router.get('/source/:sourceId', async (req, res) => {
  try {
    const db = getDb();
    const sourceId = req.params.sourceId;

    // Verify sourceId exists in registered waterSources
    const source = await db.collection('waterSources').findOne({ sourceId });
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

    const riskDocs = await db.collection('riskScores')
      .find({ waterSourceId: sourceId })
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    if (riskDocs.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `No risk data found for water source '${sourceId}'`,
          details: []
        }
      });
    }

    const doc = riskDocs[0];
    const responseData = {
      waterSourceId: doc.waterSourceId,
      riskScore: doc.riskScore,
      riskLevel: doc.riskLevel,
      timestamp: doc.timestamp.toISOString(),
      location: {
        latitude: doc.latitude,
        longitude: doc.longitude
      }
    };

    if (doc.contributingFactors) {
      responseData.contributingFactors = doc.contributingFactors;
    }

    return res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (err) {
    console.error("Error retrieving risk by sourceId:", err);
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

// GET /api/risk/:location - Legacy endpoint for geospatial risk retrieval
router.get('/:location', validateParams(locationParamSchema), async (req, res) => {
  try {
    const db = getDb();
    const locStr = req.params.location;
    const [latStr, lonStr] = locStr.split(',');
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lonStr);

    const radiusInRadians = 50 / 6378.1;
    const riskDocs = await db.collection('riskScores')
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

    if (riskDocs.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "No risk data found for this location",
          details: []
        }
      });
    }

    const doc = riskDocs[0];

    const responseData = {
      location: {
        latitude: doc.latitude,
        longitude: doc.longitude
      },
      riskScore: doc.riskScore,
      riskLevel: doc.riskLevel,
      timestamp: doc.timestamp.toISOString()
    };

    if (doc.waterSourceId) {
      responseData.waterSourceId = doc.waterSourceId;
    }

    if (doc.contributingFactors) {
      responseData.contributingFactors = doc.contributingFactors;
    }

    return res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (err) {
    console.error("Error retrieving risk by location:", err);
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
