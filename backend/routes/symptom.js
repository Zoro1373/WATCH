const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { validateBody } = require('../middleware/validator');
const { symptomSchema } = require('../schemas');
const { Double, Int32 } = require('mongodb');

router.post('/', validateBody(symptomSchema), async (req, res) => {
  try {
    const db = getDb();
    const { location, timestamp, feverCount, diarrheaCount, vomitingCount, abdominalPainCount } = req.body;
    const { latitude, longitude } = location;
    const parsedTimestamp = new Date(timestamp);

    const filter = {
      latitude: new Double(latitude),
      longitude: new Double(longitude),
      timestamp: parsedTimestamp
    };

    const update = {
      $set: {
        location: {
          type: "Point",
          coordinates: [new Double(longitude), new Double(latitude)]
        },
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
        symptomId: result._id.toString(),
        timestamp
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
