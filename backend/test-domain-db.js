require('dotenv').config({ path: __dirname + '/.env' });
const { connectToDatabase, closeDatabase } = require('./db');
const { Double } = require('mongodb');

async function verifyDomainDb() {
  const db = await connectToDatabase();
  console.log("Connected to MongoDB for domain verification.\n");

  let testPassed = 0;
  let testFailed = 0;

  // 1. Verify collections exist
  const collections = await db.listCollections().toArray();
  const collNames = collections.map(c => c.name);

  if (collNames.includes('villages') && collNames.includes('waterSources')) {
    console.log("PASS: Both 'villages' and 'waterSources' collections exist.");
    testPassed++;
  } else {
    console.error("FAIL: Missing villages or waterSources collection.");
    testFailed++;
  }

  // 2. Verify indexes on villages
  const villageIndexes = await db.collection('villages').indexes();
  const villageIndexNames = villageIndexes.map(i => i.name);
  console.log("Villages indexes:", villageIndexNames);
  if (villageIndexNames.includes('villageId_1') && 
      villageIndexNames.includes('primaryWaterSourceId_1') && 
      villageIndexNames.includes('location_2dsphere')) {
    console.log("PASS: villages has all required indexes (villageId_1, primaryWaterSourceId_1, location_2dsphere).");
    testPassed++;
  } else {
    console.error("FAIL: villages is missing required indexes.");
    testFailed++;
  }

  // 3. Verify indexes on waterSources
  const waterSourceIndexes = await db.collection('waterSources').indexes();
  const waterSourceIndexNames = waterSourceIndexes.map(i => i.name);
  console.log("WaterSources indexes:", waterSourceIndexNames);
  if (waterSourceIndexNames.includes('sourceId_1') && 
      waterSourceIndexNames.includes('location_2dsphere')) {
    console.log("PASS: waterSources has all required indexes (sourceId_1, location_2dsphere).");
    testPassed++;
  } else {
    console.error("FAIL: waterSources is missing required indexes.");
    testFailed++;
  }

  // 4. Test document schema validation on villages
  const testVillage = {
    villageId: "TEST_VIL_999",
    name: "Test Village",
    district: "Test District",
    location: {
      type: "Point",
      coordinates: [new Double(94.2411), new Double(26.9622)]
    },
    primaryWaterSourceId: "TEST_SRC_999",
    verificationStatus: "TEST_PROTOTYPE_LINK",
    createdAt: new Date()
  };

  try {
    const insertRes = await db.collection('villages').insertOne(testVillage);
    console.log("PASS: Valid village document inserted successfully with ID:", insertRes.insertedId);
    testPassed++;

    // Test 2dsphere spatial query
    const geoQuery = await db.collection('villages').find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [94.2411, 26.9622] },
          $maxDistance: 1000
        }
      }
    }).toArray();

    if (geoQuery.length > 0 && geoQuery[0].villageId === "TEST_VIL_999") {
      console.log("PASS: 2dsphere spatial query succeeded on villages.");
      testPassed++;
    } else {
      console.error("FAIL: 2dsphere query failed on villages.");
      testFailed++;
    }

    // Clean up test document
    await db.collection('villages').deleteOne({ villageId: "TEST_VIL_999" });
  } catch (err) {
    console.error("FAIL: Error testing villages document insertion:", err.message);
    testFailed++;
  }

  // 5. Test invalid village document rejection
  try {
    await db.collection('villages').insertOne({
      name: "Incomplete Village without villageId and location"
    });
    console.error("FAIL: Invalid village document was NOT rejected by schema validator.");
    testFailed++;
  } catch (err) {
    console.log("PASS: Invalid village document correctly rejected by schema validator (Document failed validation).");
    testPassed++;
  }

  // 6. Test document schema validation on waterSources
  const testWaterSource = {
    sourceId: "TEST_SRC_999",
    name: "Test River Reach",
    type: "RIVER",
    location: {
      type: "Point",
      coordinates: [new Double(94.2150), new Double(26.9500)]
    },
    servedVillageIds: ["TEST_VIL_999"],
    monitoringStatus: "MONITORED_SIMULATED",
    createdAt: new Date()
  };

  try {
    const insertRes = await db.collection('waterSources').insertOne(testWaterSource);
    console.log("PASS: Valid waterSources document inserted successfully with ID:", insertRes.insertedId);
    testPassed++;

    // Test 2dsphere spatial query
    const geoQuery = await db.collection('waterSources').find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [94.2150, 26.9500] },
          $maxDistance: 1000
        }
      }
    }).toArray();

    if (geoQuery.length > 0 && geoQuery[0].sourceId === "TEST_SRC_999") {
      console.log("PASS: 2dsphere spatial query succeeded on waterSources.");
      testPassed++;
    } else {
      console.error("FAIL: 2dsphere query failed on waterSources.");
      testFailed++;
    }

    // Clean up test document
    await db.collection('waterSources').deleteOne({ sourceId: "TEST_SRC_999" });
  } catch (err) {
    console.error("FAIL: Error testing waterSources document insertion:", err.message);
    testFailed++;
  }

  // 7. Test invalid waterSource document rejection
  try {
    await db.collection('waterSources').insertOne({
      sourceId: "TEST_SRC_INVALID",
      name: "Invalid Type River",
      type: "INVALID_WATER_TYPE", // not in enum
      location: { type: "Point", coordinates: [new Double(94.2150), new Double(26.9500)] },
      servedVillageIds: [],
      monitoringStatus: "MONITORED_SIMULATED",
      createdAt: new Date()
    });
    console.error("FAIL: Invalid waterSources document was NOT rejected by schema validator.");
    testFailed++;
  } catch (err) {
    console.log("PASS: Invalid waterSources document correctly rejected by schema validator (Document failed validation).");
    testPassed++;
  }

  // 8. Verify existing sensorNodes collection & documents are untouched
  const sensorNodes = await db.collection('sensorNodes').find({}).toArray();
  console.log("Existing sensorNodes in database:", sensorNodes.map(n => n.nodeId));
  if (sensorNodes.length >= 3) {
    console.log("PASS: Existing sensor nodes preserved.");
    testPassed++;
  } else {
    console.log("INFO: sensorNodes count is", sensorNodes.length);
  }

  // 9. Verify villages and waterSources collections are empty (no fake/unsourced seed data added)
  const villageCount = await db.collection('villages').countDocuments({});
  const waterSourceCount = await db.collection('waterSources').countDocuments({});
  console.log(`Current document counts -> villages: ${villageCount}, waterSources: ${waterSourceCount}`);
  if (villageCount === 0 && waterSourceCount === 0) {
    console.log("PASS: No seed data populated yet (coordinates require sourcing).");
    testPassed++;
  } else {
    console.warn("WARNING: Unexpected documents found in villages or waterSources.");
  }

  console.log(`\n================================`);
  console.log(`Tests Passed: ${testPassed}, Tests Failed: ${testFailed}`);
  console.log(`================================\n`);

  await closeDatabase();
  process.exit(testFailed === 0 ? 0 : 1);
}

verifyDomainDb().catch(async (err) => {
  console.error("FATAL ERROR in verification:", err);
  await closeDatabase();
  process.exit(1);
});
