const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/villages - Retrieve all registered Assam villages for GIS mapping
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const villages = await db.collection('villages')
      .find({}, { projection: { _id: 0 } })
      .toArray();

    return res.status(200).json({
      success: true,
      data: villages
    });
  } catch (err) {
    console.error("Error retrieving villages:", err);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while fetching villages",
        details: []
      }
    });
  }
});

// GET /api/villages/:villageId - Retrieve single village by villageId
router.get('/:villageId', async (req, res) => {
  try {
    const db = getDb();
    const villageId = req.params.villageId;

    const village = await db.collection('villages')
      .findOne({ villageId }, { projection: { _id: 0 } });

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

    return res.status(200).json({
      success: true,
      data: village
    });
  } catch (err) {
    console.error("Error retrieving village by ID:", err);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while fetching village",
        details: []
      }
    });
  }
});

module.exports = router;
