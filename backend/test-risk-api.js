require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const bodyParser = require('body-parser');
const authMiddleware = require('./middleware/auth');
const riskRoute = require('./routes/risk');
const { connectToDatabase, closeDatabase } = require('./db');
const { Double, ObjectId } = require('mongodb');

async function runRiskApiTests() {
  const db = await connectToDatabase();
  console.log("Connected to MongoDB for Phase 2.8 Risk API Integration Testing.\n");

  let passed = 0;
  let failed = 0;

  const testInserted = {
    riskScores: [],
    waterSources: []
  };

  const app = express();
  app.use(bodyParser.json());
  app.use('/api', authMiddleware);
  app.use('/api/risk', riskRoute);

  const server = app.listen(0);
  const port = server.address().port;
  const apiKey = process.env.API_KEY_FRONTEND || 'front_key_default';

  try {
    const tOlder = new Date(Date.now() - 3600 * 1000);
    const tNewer = new Date();

    // 1. Seed older and newer riskScores for SRC_001 to test latest-risk selection
    const olderRisk = await db.collection('riskScores').insertOne({
      waterSourceId: "SRC_001",
      location: { type: "Point", coordinates: [new Double(94.1620), new Double(26.9380)] },
      latitude: new Double(26.9380),
      longitude: new Double(94.1620),
      timestamp: tOlder,
      riskScore: new Double(0.35),
      riskLevel: "LOW",
      modelVersion: "v1.0",
      contributingFactors: { ph: 7.2, tds: 200, turbidity: 2.0, temperature: 25.0 }
    });
    testInserted.riskScores.push(olderRisk.insertedId);

    const newerRisk = await db.collection('riskScores').insertOne({
      waterSourceId: "SRC_001",
      location: { type: "Point", coordinates: [new Double(94.1620), new Double(26.9380)] },
      latitude: new Double(26.9380),
      longitude: new Double(94.1620),
      timestamp: tNewer,
      riskScore: new Double(0.78),
      riskLevel: "HIGH",
      modelVersion: "v1.0",
      contributingFactors: { ph: 6.4, tds: 520, turbidity: 9.8, temperature: 29.4, feverCount: 15, diarrheaCount: 8, vomitingCount: 3, abdominalPainCount: 3, weatherTemperature: 28.5, precipitation: 14.2, humidity: 86.0 }
    });
    testInserted.riskScores.push(newerRisk.insertedId);

    // 2. Seed risk score for SRC_002
    const riskSrc2 = await db.collection('riskScores').insertOne({
      waterSourceId: "SRC_002",
      location: { type: "Point", coordinates: [new Double(91.6600), new Double(26.1200)] },
      latitude: new Double(26.1200),
      longitude: new Double(91.6600),
      timestamp: tNewer,
      riskScore: new Double(0.48),
      riskLevel: "MEDIUM",
      modelVersion: "v1.0",
      contributingFactors: { ph: 7.1, tds: 380, turbidity: 4.2, temperature: 27.8 }
    });
    testInserted.riskScores.push(riskSrc2.insertedId);

    // 3. Seed risk score for SRC_003
    const riskSrc3 = await db.collection('riskScores').insertOne({
      waterSourceId: "SRC_003",
      location: { type: "Point", coordinates: [new Double(92.8000), new Double(24.8300)] },
      latitude: new Double(24.8300),
      longitude: new Double(92.8000),
      timestamp: tNewer,
      riskScore: new Double(0.22),
      riskLevel: "LOW",
      modelVersion: "v1.0",
      contributingFactors: { ph: 7.5, tds: 180, turbidity: 1.5, temperature: 24.5 }
    });
    testInserted.riskScores.push(riskSrc3.insertedId);

    // 4. Create a dummy water source with NO risk records to test no-risk response
    const emptySource = await db.collection('waterSources').insertOne({
      sourceId: "SRC_TEST_NO_RISK",
      name: "Unassessed Wetland Catchment",
      type: "WETLAND",
      location: { type: "Point", coordinates: [new Double(93.0000), new Double(25.0000)] },
      servedVillageIds: [],
      monitoringStatus: "MONITORED_SIMULATED",
      createdAt: tNewer
    });
    testInserted.waterSources.push(emptySource.insertedId);

    console.log("Seeded test risk documents for testing.\n");

    // ==========================================
    // TEST 1: Valid SRC_001 request & Latest Risk Selection
    // ==========================================
    console.log("TEST 1: Valid GET /api/risk/source/SRC_001 (Latest risk selection)");
    const res1 = await fetch(`http://localhost:${port}/api/risk/source/SRC_001`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const data1 = await res1.json();

    if (res1.status === 200 && data1.success && data1.data.waterSourceId === "SRC_001" && data1.data.riskScore === 0.78 && data1.data.riskLevel === "HIGH") {
      console.log(`   PASS: Returned latest record (riskScore=0.78, riskLevel=HIGH, timestamp=${data1.data.timestamp}).`);
      passed++;
    } else {
      console.error(`   FAIL: Expected latest risk (0.78, HIGH), got:`, data1);
      failed++;
    }

    // ==========================================
    // TEST 2: Valid SRC_002 request
    // ==========================================
    console.log("\nTEST 2: Valid GET /api/risk/source/SRC_002");
    const res2 = await fetch(`http://localhost:${port}/api/risk/source/SRC_002`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const data2 = await res2.json();

    if (res2.status === 200 && data2.success && data2.data.waterSourceId === "SRC_002" && data2.data.riskScore === 0.48 && data2.data.riskLevel === "MEDIUM") {
      console.log(`   PASS: Returned SRC_002 risk record (riskScore=0.48, riskLevel=MEDIUM).`);
      passed++;
    } else {
      console.error(`   FAIL: Expected SRC_002 risk (0.48, MEDIUM), got:`, data2);
      failed++;
    }

    // ==========================================
    // TEST 3: Valid SRC_003 request
    // ==========================================
    console.log("\nTEST 3: Valid GET /api/risk/source/SRC_003");
    const res3 = await fetch(`http://localhost:${port}/api/risk/source/SRC_003`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const data3 = await res3.json();

    if (res3.status === 200 && data3.success && data3.data.waterSourceId === "SRC_003" && data3.data.riskScore === 0.22 && data3.data.riskLevel === "LOW") {
      console.log(`   PASS: Returned SRC_003 risk record (riskScore=0.22, riskLevel=LOW).`);
      passed++;
    } else {
      console.error(`   FAIL: Expected SRC_003 risk (0.22, LOW), got:`, data3);
      failed++;
    }

    // ==========================================
    // TEST 4: Unregistered sourceId -> 404 NOT_FOUND
    // ==========================================
    console.log("\nTEST 4: Unregistered sourceId (DOES_NOT_EXIST) -> 404 NOT_FOUND");
    const res4 = await fetch(`http://localhost:${port}/api/risk/source/DOES_NOT_EXIST`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const data4 = await res4.json();

    if (res4.status === 404 && data4.success === false && data4.error?.code === "NOT_FOUND" && data4.error?.message.includes("is not registered")) {
      console.log(`   PASS: Correctly rejected unregistered sourceId with 404 NOT_FOUND: "${data4.error.message}".`);
      passed++;
    } else {
      console.error(`   FAIL: Expected 404 with 'is not registered', got:`, data4);
      failed++;
    }

    // ==========================================
    // TEST 5: Registered source with NO risk records -> 404 NOT_FOUND
    // ==========================================
    console.log("\nTEST 5: Registered source with NO risk records (SRC_TEST_NO_RISK) -> 404 NOT_FOUND");
    const res5 = await fetch(`http://localhost:${port}/api/risk/source/SRC_TEST_NO_RISK`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const data5 = await res5.json();

    if (res5.status === 404 && data5.success === false && data5.error?.code === "NOT_FOUND" && data5.error?.message.includes("No risk data found")) {
      console.log(`   PASS: Correctly returned 404 with "No risk data found for water source 'SRC_TEST_NO_RISK'".`);
      passed++;
    } else {
      console.error(`   FAIL: Expected 404 with 'No risk data found', got:`, data5);
      failed++;
    }

    // ==========================================
    // TEST 6: Legacy GET /api/risk/:location Backward Compatibility
    // ==========================================
    console.log("\nTEST 6: Legacy GET /api/risk/:location backward compatibility (26.9380,94.1620)");
    const res6 = await fetch(`http://localhost:${port}/api/risk/26.9380,94.1620`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const data6 = await res6.json();

    if (res6.status === 200 && data6.success && data6.data.riskScore === 0.78 && data6.data.location?.latitude === 26.938 && data6.data.waterSourceId === "SRC_001") {
      console.log(`   PASS: Legacy route returned 200 OK with expected structure:`, JSON.stringify(data6.data));
      passed++;
    } else {
      console.error(`   FAIL: Legacy route returned unexpected data:`, data6);
      failed++;
    }

    // ==========================================
    // TEST 7: Read-Only Verification (Route does NOT mutate database)
    // ==========================================
    console.log("\nTEST 7: Read-Only Verification");
    const countBefore = await db.collection('riskScores').countDocuments({});
    await fetch(`http://localhost:${port}/api/risk/source/SRC_001`, { headers: { 'X-API-KEY': apiKey } });
    await fetch(`http://localhost:${port}/api/risk/26.9380,94.1620`, { headers: { 'X-API-KEY': apiKey } });
    const countAfter = await db.collection('riskScores').countDocuments({});

    if (countBefore === countAfter) {
      console.log(`   PASS: Database unchanged after GET requests (count remains ${countBefore}). Route is strictly read-only.`);
      passed++;
    } else {
      console.error(`   FAIL: Route mutated riskScores collection! Before=${countBefore}, After=${countAfter}`);
      failed++;
    }

    // ==========================================
    // TEST 8: Response Completeness & GIS Compatibility
    // ==========================================
    console.log("\nTEST 8: Field Completeness & GIS Compatibility");
    const requiredFields = ["waterSourceId", "riskScore", "riskLevel", "timestamp", "location", "contributingFactors"];
    const missingFields = requiredFields.filter(f => data1.data[f] === undefined);

    if (missingFields.length === 0 && data1.data.location.latitude && data1.data.location.longitude) {
      console.log(`   PASS: All required fields present for GIS integration: ${requiredFields.join(', ')}.`);
      passed++;
    } else {
      console.error(`   FAIL: Missing required response fields:`, missingFields);
      failed++;
    }

  } catch (err) {
    console.error("Test runner encountered fatal error:", err);
    failed++;
  } finally {
    await new Promise((resolve) => server.close(resolve));

    // Teardown: Clean up ONLY test-inserted documents
    if (testInserted.riskScores.length > 0) {
      await db.collection('riskScores').deleteMany({ _id: { $in: testInserted.riskScores } });
    }
    if (testInserted.waterSources.length > 0) {
      await db.collection('waterSources').deleteMany({ _id: { $in: testInserted.waterSources } });
    }

    console.log("\nCleaned up all test-inserted documents from riskScores and waterSources.");
    await closeDatabase();
  }

  console.log(`\n================================`);
  console.log(`Validation Passed: ${passed}, Validation Failed: ${failed}`);
  console.log(`================================\n`);

  process.exit(failed === 0 ? 0 : 1);
}

runRiskApiTests().catch((err) => {
  console.error("Fatal error:", err);
});
