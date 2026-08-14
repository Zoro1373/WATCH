require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const bodyParser = require('body-parser');
const authMiddleware = require('./middleware/auth');
const riskRoute = require('./routes/risk');
const { connectToDatabase, closeDatabase } = require('./db');
const { runMLInference } = require('./jobs/mlRunner');
const { Double, Int32, ObjectId } = require('mongodb');

async function runMLAlignmentTests() {
  const db = await connectToDatabase();
  console.log("Connected to MongoDB for Phase 2.7 ML Data Alignment Testing.\n");

  let passed = 0;
  let failed = 0;

  const now = new Date();
  const testInserted = {
    waterReadings: [],
    symptoms: [],
    weather: [],
    riskScores: [],
    alerts: [],
    villages: []
  };

  // Mock global fetch for twilio to prevent real SMS being sent during tests
  const originalFetch = global.fetch;
  global.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('api.twilio.com')) {
      return { ok: true, json: async () => ({ sid: "SM_mock_success_123" }) };
    }
    return originalFetch(url, opts);
  };

  let server;

  try {
    // 1. Setup Test Telemetry for NODE001 (mapped to SRC_001)
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

    // 2. Setup Symptoms for 2 villages linked to SRC_001:
    // VIL_MAJ_001 (fever: 10, diarrhea: 5, vomiting: 2, pain: 1)
    // VIL_MAJ_002 (fever: 5, diarrhea: 3, vomiting: 1, pain: 2) -> Expected sum: fever=15, diarrhea=8, vomiting=3, pain=3
    const sym1 = await db.collection('symptoms').insertOne({
      villageId: "VIL_MAJ_001",
      location: { type: "Point", coordinates: [new Double(94.1658), new Double(26.9466)] },
      latitude: new Double(26.9466),
      longitude: new Double(94.1658),
      timestamp: now,
      feverCount: new Int32(10),
      diarrheaCount: new Int32(5),
      vomitingCount: new Int32(2),
      abdominalPainCount: new Int32(1)
    });
    testInserted.symptoms.push(sym1.insertedId);

    const sym2 = await db.collection('symptoms').insertOne({
      villageId: "VIL_MAJ_002",
      location: { type: "Point", coordinates: [new Double(94.1575), new Double(26.9803)] },
      latitude: new Double(26.9803),
      longitude: new Double(94.1575),
      timestamp: now,
      feverCount: new Int32(5),
      diarrheaCount: new Int32(3),
      vomitingCount: new Int32(1),
      abdominalPainCount: new Int32(2)
    });
    testInserted.symptoms.push(sym2.insertedId);

    // 3. Setup Symptom for a village linked to SRC_002 (should NOT enter SRC_001):
    // VIL_KAM_001 (fever: 50, diarrhea: 50, vomiting: 50, pain: 50)
    const sym3 = await db.collection('symptoms').insertOne({
      villageId: "VIL_KAM_001",
      location: { type: "Point", coordinates: [new Double(91.6894), new Double(26.1039)] },
      latitude: new Double(26.1039),
      longitude: new Double(91.6894),
      timestamp: now,
      feverCount: new Int32(50),
      diarrheaCount: new Int32(50),
      vomitingCount: new Int32(50),
      abdominalPainCount: new Int32(50)
    });
    testInserted.symptoms.push(sym3.insertedId);

    // 4. Setup unmonitored village with unmonitored source ID
    const unmonitoredVil = await db.collection('villages').insertOne({
      villageId: "VIL_TEST_UNMONITORED",
      name: "Unmonitored Test Settlement",
      district: "Majuli",
      location: { type: "Point", coordinates: [new Double(94.2000), new Double(26.9500)] },
      primaryWaterSourceId: "SRC_UNMONITORED",
      verificationStatus: "PROTOTYPE_ASSOCIATION",
      createdAt: now
    });
    testInserted.villages.push(unmonitoredVil.insertedId);

    const symUnmonitored = await db.collection('symptoms').insertOne({
      villageId: "VIL_TEST_UNMONITORED",
      location: { type: "Point", coordinates: [new Double(94.2000), new Double(26.9500)] },
      latitude: new Double(26.9500),
      longitude: new Double(94.2000),
      timestamp: now,
      feverCount: new Int32(100),
      diarrheaCount: new Int32(100),
      vomitingCount: new Int32(100),
      abdominalPainCount: new Int32(100)
    });
    testInserted.symptoms.push(symUnmonitored.insertedId);

    // 5. Setup regional weather near SRC_001
    const weather1 = await db.collection('weather').insertOne({
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
    testInserted.weather.push(weather1.insertedId);

    console.log("Seeded test telemetry, multi-village symptoms, and weather.");
    console.log("Running ML Inference Pipeline...");

    // 6. Execute ML Inference Job
    await runMLInference();

    // 7. Verify generated riskScore in MongoDB
    const generatedRisks = await db.collection('riskScores')
      .find({ waterSourceId: "SRC_001", timestamp: { $gte: now } })
      .sort({ timestamp: -1 })
      .toArray();

    if (generatedRisks.length > 0) {
      const riskDoc = generatedRisks[0];
      testInserted.riskScores.push(riskDoc._id);

      console.log(`\nPASS: Found persisted riskScore for waterSourceId 'SRC_001'.`);
      console.log(`   riskScore: ${riskDoc.riskScore}`);
      console.log(`   riskLevel: ${riskDoc.riskLevel}`);
      console.log(`   modelVersion: ${riskDoc.modelVersion}`);
      console.log(`   contributingFactors:`, JSON.stringify(riskDoc.contributingFactors));
      passed++;

      // Verify exact multi-village symptom aggregation in contributingFactors:
      // VIL_MAJ_001 (10) + VIL_MAJ_002 (5) = 15 fever
      const factors = riskDoc.contributingFactors || {};
      if (factors.feverCount === 15 && factors.diarrheaCount === 8 && factors.vomitingCount === 3 && factors.abdominalPainCount === 3) {
        console.log(`PASS: Multi-village symptom aggregation exact match: fever=15, diarrhea=8, vomiting=3, abdominalPain=3.`);
        passed++;
      } else {
        console.error(`FAIL: Symptom aggregation mismatch in contributingFactors:`, factors);
        failed++;
      }

      // Verify VIL_KAM_001 (50 fever) and unmonitored village (100 fever) did NOT pollute SRC_001
      if (factors.feverCount !== 65 && factors.feverCount !== 115 && factors.feverCount !== 165) {
        console.log(`PASS: Unrelated and unmonitored village symptoms were correctly isolated from SRC_001.`);
        passed++;
      } else {
        console.error(`FAIL: Cross-source symptom pollution detected:`, factors);
        failed++;
      }

      // Verify risk score range and level
      if (typeof riskDoc.riskScore === 'number' && riskDoc.riskScore >= 0 && riskDoc.riskScore <= 1 && ["LOW", "MEDIUM", "HIGH"].includes(riskDoc.riskLevel)) {
        console.log(`PASS: riskScore is bounded [0.0, 1.0] and riskLevel is valid categorical enum.`);
        passed++;
      } else {
        console.error(`FAIL: Invalid riskScore or riskLevel values:`, riskDoc);
        failed++;
      }
    } else {
      console.error("FAIL: No riskScore document was persisted for SRC_001.");
      failed++;
    }

    // 8. Test Express API Endpoints: GET /api/risk/source/:sourceId and GET /api/risk/:location
    const app = express();
    app.use(bodyParser.json());
    app.use('/api', authMiddleware);
    app.use('/api/risk', riskRoute);

    server = app.listen(0);
    const port = server.address().port;

    // Test GET /api/risk/source/SRC_001
    const resSource = await fetch(`http://localhost:${port}/api/risk/source/SRC_001`, {
      headers: { 'X-API-KEY': process.env.API_KEY_FRONTEND || 'test_key' }
    });
    const dataBySource = await resSource.json();

    if (resSource.status === 200 && dataBySource.success && dataBySource.data.waterSourceId === "SRC_001") {
      console.log(`\nPASS: GET /api/risk/source/SRC_001 succeeded (200 OK):`, JSON.stringify(dataBySource.data));
      passed++;
    } else {
      console.error(`FAIL: GET /api/risk/source/SRC_001 returned invalid response:`, dataBySource);
      failed++;
    }

    // Test GET /api/risk/source/NON_EXISTENT_SRC -> 404
    const resNotFound = await fetch(`http://localhost:${port}/api/risk/source/NON_EXISTENT_SRC`, {
      headers: { 'X-API-KEY': process.env.API_KEY_FRONTEND || 'test_key' }
    });
    const dataNotFound = await resNotFound.json();
    if (resNotFound.status === 404 && dataNotFound.error?.code === "NOT_FOUND") {
      console.log(`PASS: GET /api/risk/source/NON_EXISTENT_SRC correctly returned 404 NOT_FOUND.`);
      passed++;
    } else {
      console.error(`FAIL: Expected 404 for non-existent source:`, dataNotFound);
      failed++;
    }

    // Test legacy GET /api/risk/:location (Kamalabari location: 26.9380,94.1620)
    const resLocation = await fetch(`http://localhost:${port}/api/risk/26.9380,94.1620`, {
      headers: { 'X-API-KEY': process.env.API_KEY_FRONTEND || 'test_key' }
    });
    const dataByLocation = await resLocation.json();

    if (resLocation.status === 200 && dataByLocation.success && dataByLocation.data.riskScore !== undefined) {
      console.log(`PASS: Legacy GET /api/risk/:location succeeded (200 OK):`, JSON.stringify(dataByLocation.data));
      passed++;
    } else {
      console.error(`FAIL: Legacy GET /api/risk/:location failed:`, dataByLocation);
      failed++;
    }

  } catch (err) {
    console.error("Test execution fatal error:", err);
    failed++;
  } finally {
    global.fetch = originalFetch;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    // 9. Teardown: Clean up ONLY test-inserted documents
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
    if (testInserted.villages.length > 0) {
      await db.collection('villages').deleteMany({ _id: { $in: testInserted.villages } });
    }
    await db.collection('alerts').deleteMany({ "location.coordinates": [new Double(94.1620), new Double(26.9380)] });

    console.log("\nCleaned up all test-inserted documents from waterReadings, symptoms, weather, riskScores, villages, and alerts.");

    const finalReadingsCount = await db.collection('waterReadings').countDocuments({});
    const finalSymptomsCount = await db.collection('symptoms').countDocuments({});
    const finalWeatherCount = await db.collection('weather').countDocuments({});
    const finalRiskCount = await db.collection('riskScores').countDocuments({});

    console.log(`Final collection counts: waterReadings=${finalReadingsCount}, symptoms=${finalSymptomsCount}, weather=${finalWeatherCount}, riskScores=${finalRiskCount}`);

    await closeDatabase();
  }

  console.log(`\n================================`);
  console.log(`Validation Passed: ${passed}, Validation Failed: ${failed}`);
  console.log(`================================\n`);
}

runMLAlignmentTests().catch((err) => {
  console.error("Fatal test runner error:", err);
});
