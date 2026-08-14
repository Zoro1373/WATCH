require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const bodyParser = require('body-parser');
const authMiddleware = require('./middleware/auth');
const sensorRoute = require('./routes/sensor');
const { connectToDatabase, closeDatabase } = require('./db');

async function validateSensorMapping() {
  const db = await connectToDatabase();
  console.log("Connected to MongoDB for Phase 2.5 Sensor Node Mapping Validation.\n");

  let passed = 0;
  let failed = 0;

  // Clean up any test scratch nodes if present
  await db.collection('sensorNodes').deleteMany({ nodeId: { $nin: ["NODE001", "NODE002", "NODE003"] } });

  // 1. Verify exact NODE -> SOURCE mappings and absence of standalone latitude/longitude
  const expectedMappings = [
    { nodeId: "NODE001", waterSourceId: "SRC_001", isSimulated: true },
    { nodeId: "NODE002", waterSourceId: "SRC_002", isSimulated: true },
    { nodeId: "NODE003", waterSourceId: "SRC_003", isSimulated: true }
  ];

  for (const exp of expectedMappings) {
    const node = await db.collection('sensorNodes').findOne({ nodeId: exp.nodeId });
    if (!node) {
      console.error(`FAIL: Sensor node ${exp.nodeId} not found.`);
      failed++;
      continue;
    }
    if (node.waterSourceId === exp.waterSourceId && node.isSimulated === exp.isSimulated) {
      console.log(`PASS: ${exp.nodeId} correctly mapped to ${exp.waterSourceId} (isSimulated: ${node.isSimulated}).`);
      passed++;
    } else {
      console.error(`FAIL: ${exp.nodeId} mapping mismatch:`, node);
      failed++;
    }

    // Verify absence of redundant standalone latitude/longitude
    if (node.latitude === undefined && node.longitude === undefined) {
      console.log(`PASS: ${exp.nodeId} has no standalone latitude/longitude fields.`);
      passed++;
    } else {
      console.error(`FAIL: ${exp.nodeId} still contains standalone coordinates:`, { lat: node.latitude, lon: node.longitude });
      failed++;
    }
  }

  // 2. Verify all referenced water sources exist
  for (const exp of expectedMappings) {
    const source = await db.collection('waterSources').findOne({ sourceId: exp.waterSourceId });
    if (source) {
      console.log(`PASS: Referenced water source ${exp.waterSourceId} (${source.name}) exists in waterSources.`);
      passed++;
    } else {
      console.error(`FAIL: Referenced water source ${exp.waterSourceId} NOT found in waterSources.`);
      failed++;
    }
  }

  // 3. Verify exactly 3 unique sensor nodes
  const allNodes = await db.collection('sensorNodes').find({}).toArray();
  const nodeIds = allNodes.map(n => n.nodeId);
  const uniqueIds = new Set(nodeIds);
  if (nodeIds.length === 3 && uniqueIds.size === 3) {
    console.log(`PASS: Exactly 3 canonical sensor nodes present: ${nodeIds.join(', ')}.`);
    passed++;
  } else {
    console.error("FAIL: Expected exactly 3 sensor nodes, found:", nodeIds);
    failed++;
  }

  // 4. Test live Sensor API Ingestion & Node -> WaterSource Resolution
  const app = express();
  app.use(bodyParser.json());
  app.use('/api', authMiddleware);
  app.use('/api/sensor', sensorRoute);

  const server = app.listen(0);
  const port = server.address().port;

  const testInsertedIds = [];

  try {
    for (const exp of expectedMappings) {
      const ts = new Date().toISOString();
      const payload = {
        nodeId: exp.nodeId,
        timestamp: ts,
        latitude: 26.9466,
        longitude: 94.1658,
        ph: 7.2,
        tds: 350.0,
        turbidity: 4.5,
        temperature: 27.5
      };

      const res = await fetch(`http://localhost:${port}/api/sensor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.API_KEY_IOT || 'test_key'
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (res.status === 201 && resData.success) {
        console.log(`PASS: Telemetry ingestion for ${exp.nodeId} succeeded (status 201).`);
        passed++;

        // Verify reading persisted in waterReadings
        const reading = await db.collection('waterReadings').findOne({
          nodeId: exp.nodeId,
          timestamp: new Date(ts)
        });

        if (reading) {
          testInsertedIds.push(reading._id);
          console.log(`PASS: Telemetry reading for ${exp.nodeId} persisted in waterReadings with ID: ${reading._id}`);
          passed++;

          // Verify Node -> WaterSource Resolution chain
          const registeredNode = await db.collection('sensorNodes').findOne({ nodeId: reading.nodeId });
          const resolvedSource = await db.collection('waterSources').findOne({ sourceId: registeredNode.waterSourceId });

          if (resolvedSource && resolvedSource.sourceId === exp.waterSourceId) {
            console.log(`PASS: Resolution chain succeeded: reading.nodeId (${reading.nodeId}) -> sensorNodes.waterSourceId (${registeredNode.waterSourceId}) -> waterSources (${resolvedSource.name}).`);
            passed++;
          } else {
            console.error(`FAIL: Failed to resolve water source for reading:`, reading);
            failed++;
          }
        } else {
          console.error(`FAIL: Reading not found in waterReadings for ${exp.nodeId}`);
          failed++;
        }
      } else {
        console.error(`FAIL: Telemetry ingestion failed for ${exp.nodeId}:`, resData);
        failed++;
      }
    }
  } finally {
    // 5. Clean up ONLY test-created telemetry documents
    if (testInsertedIds.length > 0) {
      await db.collection('waterReadings').deleteMany({ _id: { $in: testInsertedIds } });
      console.log(`\nCleaned up ${testInsertedIds.length} test-created readings from waterReadings.`);
    }

    const postTestCount = await db.collection('waterReadings').countDocuments({});
    console.log(`Post-test waterReadings count: ${postTestCount}`);

    await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
  }

  console.log(`\n================================`);
  console.log(`Validation Passed: ${passed}, Validation Failed: ${failed}`);
  console.log(`================================\n`);
}

validateSensorMapping().catch((err) => {
  console.error("Sensor mapping validation fatal error:", err);
});
