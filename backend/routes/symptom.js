const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { validateBody } = require('../middleware/validator');
const { symptomSchema } = require('../schemas');
const { Double, Int32 } = require('mongodb');

router.post('/', validateBody(symptomSchema), async (req, res) => {
  try {
    const db = getDb();
    const { villageId, location, timestamp, feverCount, diarrheaCount, vomitingCount, abdominalPainCount } = req.body;

    // 1. Verify that the village exists in villages collection
    const village = await db.collection('villages').findOne({ villageId });
    if (!village) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Village '${villageId}' is not registered`,
          details: []
        }
      });
    }

    // 2. Resolve geographic coordinates from body or fallback to village location
    let latitude, longitude;
    if (location && location.latitude !== undefined && location.longitude !== undefined) {
      latitude = location.latitude;
      longitude = location.longitude;
    } else if (village.location && Array.isArray(village.location.coordinates)) {
      longitude = village.location.coordinates[0];
      latitude = village.location.coordinates[1];
    } else {
      latitude = 0.0;
      longitude = 0.0;
    }

    const parsedTimestamp = timestamp ? new Date(timestamp) : new Date();

    // 3. Upsert symptom record keyed on villageId and timestamp
    const filter = {
      villageId,
      timestamp: parsedTimestamp
    };

    const update = {
      $set: {
        villageId,
        location: {
          type: "Point",
          coordinates: [new Double(longitude), new Double(latitude)]
        },
        latitude: new Double(latitude),
        longitude: new Double(longitude),
        timestamp: parsedTimestamp,
        feverCount: new Int32(feverCount),
        diarrheaCount: new Int32(diarrheaCount),
        vomitingCount: new Int32(vomitingCount),
        abdominalPainCount: new Int32(abdominalPainCount)
      }
    };

    const result = await db.collection('symptoms').findOneAndUpdate(
      filter,
      update,
      { upsert: true, returnDocument: 'after' }
    );

    res.status(201).json({
      success: true,
      message: "Symptom report accepted",
      data: {
        symptomId: result?._id?.toString() || ('sym_' + Date.now()),
        villageId,
        timestamp: parsedTimestamp.toISOString()
      }
    });

  } catch (err) {
    console.error("Symptom submission error:", err);
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
