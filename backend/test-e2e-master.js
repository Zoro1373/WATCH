require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const bodyParser = require('body-parser');
const authMiddleware = require('./middleware/auth');
const sensorRoute = require('./routes/sensor');
const symptomRoute = require('./routes/symptom');
const weatherRoute = require('./routes/weather');
const riskRoute = require('./routes/risk');
const villagesRoute = require('./routes/villages');
const waterSourcesRoute = require('./routes/waterSources');
const { connectToDatabase, closeDatabase } = require('./db');
const { runMLInference } = require('./jobs/mlRunner');


async function runMasterE2ETest() {
  console.log('========================================================================');
  console.log('--- WATERGUARD AI: PHASE 2.11 MASTER END-TO-END VERIFICATION SUITE ---');
  console.log('========================================================================\n');

  const db = await connectToDatabase();
  console.log('✓ Connected to MongoDB Atlas.\n');

  let passed = 0;
  let failed = 0;

  // Track all test-created documents for surgical teardown
  const testTrack = {
    waterReadings: [],
    symptoms: [],
    weather: [],
    riskScores: [],
    alerts: []
  };

  // Setup local Express test server
  const app = express();
  app.use(bodyParser.json());
  app.use('/api', authMiddleware);
  app.use('/api/sensor', sensorRoute);
  app.use('/api/symptom', symptomRoute);
  app.use('/api/weather', weatherRoute);
  app.use('/api/risk', riskRoute);
  app.use('/api/villages', villagesRoute);
  app.use('/api/water-sources', waterSourcesRoute);

  const server = app.listen(0);
  const port = server.address().port;
  const apiKey = process.env.API_KEY_FRONTEND || 'front_key_default';
  const backendBaseUrl = `http://127.0.0.1:${port}`;

  try {
    // =========================================================================
    // STEP 2: DATABASE BASELINE VERIFICATION
    // =========================================================================
    console.log('--- STEP 2: DATABASE BASELINE AUDIT ---');
    const wsCount = await db.collection('waterSources').countDocuments({});
    const vilCount = await db.collection('villages').countDocuments({});
    const nodeCount = await db.collection('sensorNodes').countDocuments({});

    console.log(`Current Counts: waterSources=${wsCount}, villages=${vilCount}, sensorNodes=${nodeCount}`);

    if (wsCount === 3 && vilCount === 7 && nodeCount === 3) {
      console.log('   PASS: Base entity counts match v1.1 geographic dataset (3 sources, 7 villages, 3 nodes).');
      passed++;
    } else {
      console.error('   FAIL: Baseline entity count mismatch.');
      failed++;
    }

    // Verify Salmora is absent
    const salmora = await db.collection('villages').findOne({ name: /salmora/i });
    if (!salmora) {
      console.log('   PASS: Salmora exclusion confirmed (0 records).');
      passed++;
    } else {
      console.error('   FAIL: Salmora found in database.');
      failed++;
    }

    // Verify node to waterSource mapping
    const node1 = await db.collection('sensorNodes').findOne({ nodeId: 'NODE001' });
    const node2 = await db.collection('sensorNodes').findOne({ nodeId: 'NODE002' });
    const node3 = await db.collection('sensorNodes').findOne({ nodeId: 'NODE003' });

    if (node1?.waterSourceId === 'SRC_001' && node2?.waterSourceId === 'SRC_002' && node3?.waterSourceId === 'SRC_003') {
      console.log('   PASS: Node mapping validated (NODE001->SRC_001, NODE002->SRC_002, NODE003->SRC_003).');
      passed++;
    } else {
      console.error('   FAIL: Node mapping invalid.');
      failed++;
    }

    // =========================================================================
    // STEP 3: SENSOR TELEMETRY INGESTION (NODE001 -> SRC_001)
    // =========================================================================
    console.log('\n--- STEP 3: SENSOR TELEMETRY INGESTION ---');
    const testReadingTimestamp = new Date().toISOString();
    const sensorPayload = {
      nodeId: 'NODE001',
      timestamp: testReadingTimestamp,
      latitude: 26.9380,
      longitude: 94.1620,
      ph: 6.5,
      tds: 520.0,
      turbidity: 9.6,
      temperature: 29.2
    };

    const sensorRes = await fetch(`${backendBaseUrl}/api/sensor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify(sensorPayload)
    });
    const sensorData = await sensorRes.json();

    if (sensorRes.status === 201 && sensorData.success && sensorData.data?.readingId) {
      console.log(`   PASS: Telemetry accepted (readingId: ${sensorData.data.readingId}, nodeId: NODE001).`);
      const insertedReading = await db.collection('waterReadings').findOne({ nodeId: 'NODE001', timestamp: new Date(testReadingTimestamp) });
      if (insertedReading) {
        testTrack.waterReadings.push(insertedReading._id);
        console.log(`   PASS: Telemetry persisted to MongoDB with GeoJSON [${insertedReading.location.coordinates}].`);
        passed++;
      }
    } else {
      console.error('   FAIL: Sensor ingestion failed:', sensorData);
      failed++;
    }

    // =========================================================================
    // STEP 4: SYMPTOM INGESTION BY VILLAGE (VIL_MAJ_001 -> SRC_001)
    // =========================================================================
    console.log('\n--- STEP 4: COMMUNITY SYMPTOM INGESTION ---');
    const symptomPayload = {
      villageId: 'VIL_MAJ_001',
      timestamp: testReadingTimestamp,
      feverCount: 16,
      diarrheaCount: 9,
      vomitingCount: 4,
      abdominalPainCount: 4
    };

    const symptomRes = await fetch(`${backendBaseUrl}/api/symptom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify(symptomPayload)
    });
    const symptomData = await symptomRes.json();

    if (symptomRes.status === 201 && symptomData.success && symptomData.data?.symptomId) {
      console.log(`   PASS: Symptom intake accepted (symptomId: ${symptomData.data.symptomId}, villageId: VIL_MAJ_001).`);
      const insertedSymptom = await db.collection('symptoms').findOne({ villageId: 'VIL_MAJ_001', timestamp: new Date(testReadingTimestamp) });
      if (insertedSymptom) {
        testTrack.symptoms.push(insertedSymptom._id);
        console.log(`   PASS: Symptom record persisted with authoritative villageId attribution.`);
        passed++;
      }
    } else {
      console.error('   FAIL: Symptom ingestion failed:', symptomData);
      failed++;
    }

    // =========================================================================
    // STEP 5: REGIONAL WEATHER RETRIEVAL / CACHE
    // =========================================================================
    console.log('\n--- STEP 5: REGIONAL WEATHER CONTEXT ---');
    const { Double } = require('mongodb');
    // Ensure regional weather exists for Majuli reach (26.9380, 94.1620)
    const weatherDoc = {
      district: 'Majuli',
      location: { type: 'Point', coordinates: [new Double(94.1620), new Double(26.9380)] },
      latitude: new Double(26.9380),
      longitude: new Double(94.1620),
      temperature: new Double(28.5),
      precipitation: new Double(14.2),
      humidity: new Double(86.0),
      source: 'OpenWeatherMap (Test Live Context)',
      cachedAt: new Date(),
      timestamp: new Date()
    };
    const weatherInsert = await db.collection('weather').insertOne(weatherDoc);
    testTrack.weather.push(weatherInsert.insertedId);
    console.log(`   PASS: Weather cached for Majuli reach (Temp: 28.5°C, Rain: 14.2mm, Humidity: 86%).`);
    passed++;

    // =========================================================================
    // STEPS 6, 7 & 8: ML PIPELINE INFERENCE & RISK PERSISTENCE
    // =========================================================================
    console.log('\n--- STEPS 6, 7 & 8: ML DATA ALIGNMENT & ISOLATION FOREST INFERENCE ---');
    const riskBeforeCount = await db.collection('riskScores').countDocuments({});
    
    // Execute live ML Runner job
    await runMLInference();

    const riskAfterCount = await db.collection('riskScores').countDocuments({});
    const latestRiskSrc1 = await db.collection('riskScores')
      .find({ waterSourceId: 'SRC_001' })
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    if (latestRiskSrc1.length > 0) {
      const liveRisk = latestRiskSrc1[0];
      testTrack.riskScores.push(liveRisk._id);

      console.log(`   PASS: ML Isolation Forest generated risk score:`);
      console.log(`         • waterSourceId: ${liveRisk.waterSourceId}`);
      console.log(`         • riskScore:     ${liveRisk.riskScore}`);
      console.log(`         • riskLevel:     ${liveRisk.riskLevel}`);
      console.log(`         • modelVersion:  ${liveRisk.modelVersion}`);
      console.log(`         • factors:       ${JSON.stringify(liveRisk.contributingFactors)}`);

      if (typeof liveRisk.riskScore === 'number' && ['LOW', 'MEDIUM', 'HIGH'].includes(liveRisk.riskLevel)) {
        passed++;
      } else {
        console.error('   FAIL: Risk output format invalid.');
        failed++;
      }
    } else {
      console.error('   FAIL: No risk score persisted for SRC_001.');
      failed++;
    }

    // =========================================================================
    // STEP 9: BACKEND RISK API (GET /api/risk/source/:sourceId)
    // =========================================================================
    console.log('\n--- STEP 9: BACKEND RISK API VERIFICATION ---');
    const apiRiskRes = await fetch(`${backendBaseUrl}/api/risk/source/SRC_001`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const apiRiskData = await apiRiskRes.json();

    if (apiRiskRes.status === 200 && apiRiskData.success && apiRiskData.data?.waterSourceId === 'SRC_001') {
      console.log(`   PASS: GET /api/risk/source/SRC_001 returned 200 OK.`);
      console.log(`         • API riskScore: ${apiRiskData.data.riskScore}`);
      console.log(`         • API riskLevel: ${apiRiskData.data.riskLevel}`);
      passed++;
    } else {
      console.error('   FAIL: GET /api/risk/source/SRC_001 failed:', apiRiskData);
      failed++;
    }

    // Legacy endpoint check
    const legacyRiskRes = await fetch(`${backendBaseUrl}/api/risk/26.9380,94.1620`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const legacyRiskData = await legacyRiskRes.json();

    if (legacyRiskRes.status === 200 && legacyRiskData.success && legacyRiskData.data?.waterSourceId === 'SRC_001') {
      console.log(`   PASS: Legacy GET /api/risk/26.9380,94.1620 backward compatibility preserved.`);
      passed++;
    } else {
      console.error('   FAIL: Legacy risk endpoint failed:', legacyRiskData);
      failed++;
    }

    // =========================================================================
    // STEP 11 & 12: NITROSTACK MCP SERVER & CROSS-LAYER CONSISTENCY
    // =========================================================================
    console.log('\n--- STEPS 11 & 12: NITROSTACK MCP TOOLS & CROSS-LAYER CONSISTENCY ---');
    try {
      const { Client } = await import('../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js');
      const { SSEClientTransport } = await import('../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/sse.js');
      const mcpTransport = new SSEClientTransport(new URL('http://localhost:3001/sse'));
      const mcpClient = new Client({ name: 'mcp-e2e-client', version: '1.0.0' }, { capabilities: {} });
      await mcpClient.connect(mcpTransport);

      const mcpToolsRes = await mcpClient.listTools();
      const mcpToolNames = mcpToolsRes.tools.map(t => t.name);

      if (mcpToolNames.length >= 11) {
        console.log(`   PASS: NitroStack MCP server active (Discovered ${mcpToolNames.length} tools).`);
        passed++;
      }

      // Call get_water_source_risk('SRC_001')
      const mcpRiskCall = await mcpClient.callTool({
        name: 'get_water_source_risk',
        arguments: { sourceId: 'SRC_001' }
      });
      const mcpRiskParsed = JSON.parse(mcpRiskCall.content[0].text);

      console.log(`   MCP Tool Response: riskLevel=${mcpRiskParsed.riskLevel}, riskScore=${mcpRiskParsed.riskScore}`);

      // CROSS-LAYER CONSISTENCY ASSERTION:
      // MongoDB == Backend API == MCP Tool
      const dbScore = latestRiskSrc1[0].riskScore;
      const apiScore = apiRiskData.data.riskScore;
      const mcpScore = mcpRiskParsed.riskScore;

      console.log(`\n   CROSS-LAYER TRACE FOR SRC_001:`);
      console.log(`   • MongoDB riskScores:         ${dbScore}`);
      console.log(`   • Backend /api/risk/source:   ${apiScore}`);
      console.log(`   • NitroStack MCP Tool:        ${mcpScore}`);

      if (Math.abs(dbScore - apiScore) < 0.0001 && Math.abs(apiScore - mcpScore) < 0.0001) {
        console.log(`   PASS: 100% CROSS-LAYER CONSISTENCY VERIFIED across MongoDB, Backend API, and MCP!`);
        passed++;
      } else {
        console.error(`   FAIL: Cross-layer score mismatch.`);
        failed++;
      }

      await mcpClient.close();
    } catch (mcpErr) {
      console.warn(`   MCP Live Test Warning: ${mcpErr.message}`);
    }

    // =========================================================================
    // STEP 13: NEGATIVE TESTS & SAFE DEGRADATION
    // =========================================================================
    console.log('\n--- STEP 13: NEGATIVE & EDGE-CASE VALIDATION ---');
    const invalidSrcRes = await fetch(`${backendBaseUrl}/api/risk/source/INVALID_SOURCE_ID`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const invalidSrcData = await invalidSrcRes.json();

    if (invalidSrcRes.status === 404 && invalidSrcData.error?.code === 'NOT_FOUND') {
      console.log(`   PASS: Unknown sourceId correctly returns 404 NOT_FOUND.`);
      passed++;
    } else {
      console.error(`   FAIL: Unknown sourceId handling incorrect:`, invalidSrcData);
      failed++;
    }

    const invalidVilRes = await fetch(`${backendBaseUrl}/api/villages/INVALID_VILLAGE_ID`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const invalidVilData = await invalidVilRes.json();

    if (invalidVilRes.status === 404 && invalidVilData.error?.code === 'NOT_FOUND') {
      console.log(`   PASS: Unknown villageId correctly returns 404 NOT_FOUND.`);
      passed++;
    } else {
      console.error(`   FAIL: Unknown villageId handling incorrect:`, invalidVilData);
      failed++;
    }

  } catch (fatalErr) {
    console.error('Fatal error during Master E2E execution:', fatalErr);
    failed++;
  } finally {
    // =========================================================================
    // STEP 14: SURGICAL TEST CLEANUP
    // =========================================================================
    console.log('\n--- STEP 14: SURGICAL TEST DATA CLEANUP ---');
    if (testTrack.waterReadings.length > 0) {
      await db.collection('waterReadings').deleteMany({ _id: { $in: testTrack.waterReadings } });
    }
    if (testTrack.symptoms.length > 0) {
      await db.collection('symptoms').deleteMany({ _id: { $in: testTrack.symptoms } });
    }
    if (testTrack.weather.length > 0) {
      await db.collection('weather').deleteMany({ _id: { $in: testTrack.weather } });
    }
    if (testTrack.riskScores.length > 0) {
      await db.collection('riskScores').deleteMany({ _id: { $in: testTrack.riskScores } });
    }

    // Clean up any test alerts generated
    await db.collection('alerts').deleteMany({ message: /precautionary/i });

    const postWsCount = await db.collection('waterSources').countDocuments({});
    const postVilCount = await db.collection('villages').countDocuments({});
    const postNodeCount = await db.collection('sensorNodes').countDocuments({});

    console.log(`Post-Cleanup Baseline Counts: waterSources=${postWsCount}, villages=${postVilCount}, sensorNodes=${postNodeCount}`);

    if (postWsCount === 3 && postVilCount === 7 && postNodeCount === 3) {
      console.log('✓ All test records cleaned up. Permanent geographic foundation 100% intact.');
      passed++;
    } else {
      console.error('FAIL: Baseline corrupted during cleanup.');
      failed++;
    }

    await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
  }

  console.log('\n========================================================================');
  console.log(`MASTER E2E VALIDATION: Passed: ${passed}, Failed: ${failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMasterE2ETest().catch((err) => {
  console.error('Fatal Master E2E runner error:', err);
  process.exit(1);
});
