require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const bodyParser = require('body-parser');
const authMiddleware = require('./middleware/auth');
const villagesRoute = require('./routes/villages');
const waterSourcesRoute = require('./routes/waterSources');
const { connectToDatabase, closeDatabase } = require('./db');

async function runGisRoutesTests() {
  const db = await connectToDatabase();
  console.log("Connected to MongoDB for Phase 2.9 GIS Routes Integration Testing.\n");

  let passed = 0;
  let failed = 0;

  const app = express();
  app.use(bodyParser.json());
  app.use('/api', authMiddleware);
  app.use('/api/villages', villagesRoute);
  app.use('/api/water-sources', waterSourcesRoute);

  const server = app.listen(0);
  const port = server.address().port;
  const apiKey = process.env.API_KEY_FRONTEND || 'front_key_default';

  try {
    // 1. Test GET /api/villages
    console.log("TEST 1: GET /api/villages (retrieve all 7 registered villages)");
    const resVillages = await fetch(`http://localhost:${port}/api/villages`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const dataVillages = await resVillages.json();

    if (resVillages.status === 200 && dataVillages.success && Array.isArray(dataVillages.data) && dataVillages.data.length === 7) {
      console.log(`   PASS: Returned 7 registered Assam villages.`);
      const villageIds = dataVillages.data.map(v => v.villageId);
      console.log(`   Village IDs: ${villageIds.join(', ')}`);
      passed++;
    } else {
      console.error(`   FAIL: Expected 7 villages:`, dataVillages);
      failed++;
    }

    // 2. Test GET /api/villages/VIL_MAJ_001
    console.log("\nTEST 2: GET /api/villages/VIL_MAJ_001 (Kamalabari single lookup)");
    const resVil1 = await fetch(`http://localhost:${port}/api/villages/VIL_MAJ_001`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const dataVil1 = await resVil1.json();

    if (resVil1.status === 200 && dataVil1.success && dataVil1.data.villageId === "VIL_MAJ_001" && dataVil1.data.name === "Kamalabari" && dataVil1.data.primaryWaterSourceId === "SRC_001") {
      console.log(`   PASS: Returned Kamalabari details (primaryWaterSourceId=SRC_001, coordinates=[${dataVil1.data.location.coordinates}]).`);
      passed++;
    } else {
      console.error(`   FAIL: Failed to lookup VIL_MAJ_001:`, dataVil1);
      failed++;
    }

    // 3. Test GET /api/villages/DOES_NOT_EXIST
    console.log("\nTEST 3: GET /api/villages/DOES_NOT_EXIST (404 Not Found)");
    const resVilNotFound = await fetch(`http://localhost:${port}/api/villages/DOES_NOT_EXIST`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const dataVilNotFound = await resVilNotFound.json();

    if (resVilNotFound.status === 404 && dataVilNotFound.success === false && dataVilNotFound.error?.code === "NOT_FOUND") {
      console.log(`   PASS: Correctly rejected unregistered villageId with 404 NOT_FOUND: "${dataVilNotFound.error.message}".`);
      passed++;
    } else {
      console.error(`   FAIL: Expected 404 for invalid village:`, dataVilNotFound);
      failed++;
    }

    // 4. Test GET /api/water-sources
    console.log("\nTEST 4: GET /api/water-sources (retrieve all 3 monitored water sources)");
    const resSources = await fetch(`http://localhost:${port}/api/water-sources`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const dataSources = await resSources.json();

    if (resSources.status === 200 && dataSources.success && Array.isArray(dataSources.data) && dataSources.data.length === 3) {
      console.log(`   PASS: Returned 3 registered Assam water sources with attached sensorNodeIds.`);
      dataSources.data.forEach(s => {
        console.log(`   Source: ${s.sourceId} (${s.name}) -> sensorNodeId: ${s.sensorNodeId}, servedVillages: [${s.servedVillageIds.join(', ')}]`);
      });
      passed++;
    } else {
      console.error(`   FAIL: Expected 3 water sources:`, dataSources);
      failed++;
    }

    // 5. Test GET /api/water-sources/SRC_001
    console.log("\nTEST 5: GET /api/water-sources/SRC_001 (Brahmaputra single lookup)");
    const resSrc1 = await fetch(`http://localhost:${port}/api/water-sources/SRC_001`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const dataSrc1 = await resSrc1.json();

    if (resSrc1.status === 200 && dataSrc1.success && dataSrc1.data.sourceId === "SRC_001" && dataSrc1.data.sensorNodeId === "NODE001") {
      console.log(`   PASS: Returned SRC_001 details (sensorNodeId=NODE001, coordinates=[${dataSrc1.data.location.coordinates}]).`);
      passed++;
    } else {
      console.error(`   FAIL: Failed to lookup SRC_001:`, dataSrc1);
      failed++;
    }

    // 6. Test GET /api/water-sources/DOES_NOT_EXIST
    console.log("\nTEST 6: GET /api/water-sources/DOES_NOT_EXIST (404 Not Found)");
    const resSrcNotFound = await fetch(`http://localhost:${port}/api/water-sources/DOES_NOT_EXIST`, {
      headers: { 'X-API-KEY': apiKey }
    });
    const dataSrcNotFound = await resSrcNotFound.json();

    if (resSrcNotFound.status === 404 && dataSrcNotFound.success === false && dataSrcNotFound.error?.code === "NOT_FOUND") {
      console.log(`   PASS: Correctly rejected unregistered sourceId with 404 NOT_FOUND: "${dataSrcNotFound.error.message}".`);
      passed++;
    } else {
      console.error(`   FAIL: Expected 404 for invalid sourceId:`, dataSrcNotFound);
      failed++;
    }

  } catch (err) {
    console.error("GIS Routes test runner encountered error:", err);
    failed++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runGisRoutesTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
