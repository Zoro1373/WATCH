require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { connectToDatabase, closeDatabase } = require('./db');
const { runMLInference } = require('./jobs/mlRunner');
const { Double, Int32 } = require('mongodb');

async function runTests() {
  const db = await connectToDatabase();
  console.log("Connected to DB for ML Integration testing.\n");

  const testInserted = {
    waterReadings: [],
    symptoms: [],
    weather: [],
    riskScores: [],
    alerts: []
  };

  const now = new Date();

  // Mock global fetch for twilio to prevent real SMS being sent by alertService during testing
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ sid: "SM_mock_success_123" }) });

  try {
    // 1. Seed dummy data for NODE001 (mapped to SRC_001)
    const readingRes = await db.collection('waterReadings').insertOne({
      nodeId: "NODE001",
      location: { type: "Point", coordinates: [new Double(94.1620), new Double(26.9380)] },
      latitude: new Double(26.9380),
      longitude: new Double(94.1620),
      timestamp: now,
      ph: new Double(6.8),
      tds: new Double(420.0),
      turbidity: new Double(8.4),
      temperature: new Double(28.2)
    });
    testInserted.waterReadings.push(readingRes.insertedId);

    const symRes = await db.collection('symptoms').insertOne({
      villageId: "VIL_MAJ_001",
      location: { type: "Point", coordinates: [new Double(94.1658), new Double(26.9466)] },
      latitude: new Double(26.9466),
      longitude: new Double(94.1658),
      timestamp: now,
      feverCount: new Int32(12),
      diarrheaCount: new Int32(5),
      vomitingCount: new Int32(3),
      abdominalPainCount: new Int32(4)
    });
    testInserted.symptoms.push(symRes.insertedId);

    const weatherRes = await db.collection('weather').insertOne({
      district: "Majuli",
      location: { type: "Point", coordinates: [new Double(94.1620), new Double(26.9380)] },
      latitude: new Double(26.9380),
      longitude: new Double(94.1620),
      temperature: new Double(27.5),
      precipitation: new Double(0.0),
      humidity: new Double(80.0),
      source: "OpenWeatherMap",
      cachedAt: now,
      timestamp: now
    });
    testInserted.weather.push(weatherRes.insertedId);

    console.log("Seeded mock data for SRC_001. Running ML Inference Pipeline...");

    // 2. Run the ML pipeline runner
    await runMLInference();

    // 3. Verify ML output was persisted to riskScores correctly
    const generatedRisk = await db.collection('riskScores')
      .find({ waterSourceId: "SRC_001", timestamp: { $gte: now } })
      .sort({ timestamp: -1 })
      .toArray();

    if (generatedRisk.length === 0) {
      console.error("FAIL: ML Pipeline did not persist a riskScore to MongoDB.");
    } else {
      const risk = generatedRisk[0];
      testInserted.riskScores.push(risk._id);

      console.log("PASS: Found persisted riskScore from ML pipeline.");
      console.log(`Water Source ID: ${risk.waterSourceId}`);
      console.log(`Risk Score: ${risk.riskScore}`);
      console.log(`Risk Level: ${risk.riskLevel}`);
      console.log(`Model Version: ${risk.modelVersion || 'N/A'}`);
      if (risk.contributingFactors) {
        console.log(`Contributing Factors generated:`, JSON.stringify(risk.contributingFactors));
      }

      // 4. Check if Alert was triggered (only if MEDIUM or HIGH)
      if (["MEDIUM", "HIGH"].includes(risk.riskLevel)) {
        const generatedAlerts = await db.collection('alerts')
          .find({ "location.coordinates": [new Double(94.1620), new Double(26.9380)], timestamp: { $gte: now } })
          .toArray();
        if (generatedAlerts.length > 0) {
          testInserted.alerts.push(generatedAlerts[0]._id);
          console.log(`PASS: alertService successfully triggered and wrote an alert with status: ${generatedAlerts[0].status}`);
        } else {
          console.error("FAIL: ML risk was MEDIUM/HIGH but alertService did not generate an alert.");
        }
      } else {
        console.log("Alert check skipped (Risk is LOW).");
      }
    }
  } catch (err) {
    console.error("Error in ML integration test:", err);
  } finally {
    global.fetch = originalFetch;

    // Cleanup test records
    if (testInserted.waterReadings.length > 0) {
      await db.collection('waterReadings').deleteMany({ _id: { $in: testInserted.waterReadings } });
    }
    if (testInserted.symptoms.length > 0) {
      await db.collection('symptoms').deleteMany({ _id: { $in: testInserted.symptoms } });
    }
    if (testInserted.weather.length > 0) {
      await db.collection('weather').deleteMany({ _id: { $in: testInserted.weather } });
    }
    if (testInserted.riskScores.length > 0) {
      await db.collection('riskScores').deleteMany({ _id: { $in: testInserted.riskScores } });
    }
    if (testInserted.alerts.length > 0) {
      await db.collection('alerts').deleteMany({ _id: { $in: testInserted.alerts } });
    }

    await closeDatabase();
    console.log("\nTeardown complete. Tests finished.");
  }
}

runTests().catch(console.error);
