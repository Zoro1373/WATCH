require('dotenv').config({ path: __dirname + '/.env' });
const { connectToDatabase, closeDatabase } = require('./db');

async function validateSeed() {
  const db = await connectToDatabase();
  console.log("Connected to MongoDB for Phase 2.4 Seed Validation.\n");

  let passed = 0;
  let failed = 0;

  // 1. Check Counts
  const villageCount = await db.collection('villages').countDocuments({});
  const waterSourceCount = await db.collection('waterSources').countDocuments({});
  console.log(`Document Counts: villages = ${villageCount}, waterSources = ${waterSourceCount}`);

  if (villageCount === 7) {
    console.log("PASS: villages count is exactly 7.");
    passed++;
  } else {
    console.error(`FAIL: Expected 7 villages, found ${villageCount}.`);
    failed++;
  }

  if (waterSourceCount === 3) {
    console.log("PASS: waterSources count is exactly 3.");
    passed++;
  } else {
    console.error(`FAIL: Expected 3 waterSources, found ${waterSourceCount}.`);
    failed++;
  }

  // 2. Validate Every Water Source
  const expectedSources = [
    {
      sourceId: "SRC_001",
      name: "Brahmaputra River (Majuli Reach)",
      type: "RIVER",
      coordinates: [94.1620, 26.9380],
      servedVillageIds: ["VIL_MAJ_001", "VIL_MAJ_002"],
      monitoringStatus: "MONITORED_SIMULATED"
    },
    {
      sourceId: "SRC_002",
      name: "Deepor Beel",
      type: "WETLAND",
      coordinates: [91.6667, 26.1333],
      servedVillageIds: ["VIL_KAM_001", "VIL_KAM_002", "VIL_KAM_003"],
      monitoringStatus: "MONITORED_SIMULATED"
    },
    {
      sourceId: "SRC_003",
      name: "Barak River (Cachar Reach)",
      type: "RIVER",
      coordinates: [92.7980, 24.8260],
      servedVillageIds: ["VIL_CAC_001", "VIL_CAC_002"],
      monitoringStatus: "MONITORED_SIMULATED"
    }
  ];

  for (const exp of expectedSources) {
    const doc = await db.collection('waterSources').findOne({ sourceId: exp.sourceId });
    if (!doc) {
      console.error(`FAIL: Missing water source ${exp.sourceId}`);
      failed++;
      continue;
    }
    const coordsMatch = Math.abs(doc.location.coordinates[0] - exp.coordinates[0]) < 0.0001 &&
                        Math.abs(doc.location.coordinates[1] - exp.coordinates[1]) < 0.0001;
    const servedMatch = JSON.stringify(doc.servedVillageIds) === JSON.stringify(exp.servedVillageIds);
    const valid = doc.name === exp.name &&
                  doc.type === exp.type &&
                  doc.monitoringStatus === exp.monitoringStatus &&
                  coordsMatch &&
                  servedMatch;

    if (valid) {
      console.log(`PASS: Water source ${exp.sourceId} (${doc.name}) correctly validated.`);
      passed++;
    } else {
      console.error(`FAIL: Water source ${exp.sourceId} data mismatch:`, doc);
      failed++;
    }
  }

  // 3. Validate Every Village
  const expectedVillages = [
    {
      villageId: "VIL_MAJ_001",
      name: "Kamalabari",
      district: "Majuli",
      coordinates: [94.1658, 26.9466],
      primaryWaterSourceId: "SRC_001",
      verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
    },
    {
      villageId: "VIL_MAJ_002",
      name: "Garmur",
      district: "Majuli",
      coordinates: [94.1575, 26.9803],
      primaryWaterSourceId: "SRC_001",
      verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
    },
    {
      villageId: "VIL_KAM_001",
      name: "Pamohi",
      district: "Kamrup Metropolitan",
      coordinates: [91.6894, 26.1039],
      primaryWaterSourceId: "SRC_002",
      verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
    },
    {
      villageId: "VIL_KAM_002",
      name: "Chakardeo",
      district: "Kamrup Metropolitan",
      coordinates: [91.6483, 26.1000],
      primaryWaterSourceId: "SRC_002",
      verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
    },
    {
      villageId: "VIL_KAM_003",
      name: "Paschim Boragaon",
      district: "Kamrup Metropolitan",
      coordinates: [91.6833, 26.1164],
      primaryWaterSourceId: "SRC_002",
      verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
    },
    {
      villageId: "VIL_CAC_001",
      name: "Sonabarighat",
      district: "Cachar",
      coordinates: [92.8475, 24.7454],
      primaryWaterSourceId: "SRC_003",
      verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
    },
    {
      villageId: "VIL_CAC_002",
      name: "Borkhola",
      district: "Cachar",
      coordinates: [92.7458, 24.9228],
      primaryWaterSourceId: "SRC_003",
      verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
    }
  ];

  for (const exp of expectedVillages) {
    const doc = await db.collection('villages').findOne({ villageId: exp.villageId });
    if (!doc) {
      console.error(`FAIL: Missing village ${exp.villageId}`);
      failed++;
      continue;
    }
    const coordsMatch = Math.abs(doc.location.coordinates[0] - exp.coordinates[0]) < 0.0001 &&
                        Math.abs(doc.location.coordinates[1] - exp.coordinates[1]) < 0.0001;
    const valid = doc.name === exp.name &&
                  doc.district === exp.district &&
                  doc.primaryWaterSourceId === exp.primaryWaterSourceId &&
                  doc.verificationStatus === exp.verificationStatus &&
                  coordsMatch;

    if (valid) {
      console.log(`PASS: Village ${exp.villageId} (${doc.name}) correctly validated.`);
      passed++;
    } else {
      console.error(`FAIL: Village ${exp.villageId} data mismatch:`, doc);
      failed++;
    }
  }

  // 4. Verify Salmora Exclusion
  const salmoraDoc = await db.collection('villages').findOne({
    $or: [
      { name: /Salmora/i },
      { name: /Salmara/i },
      { villageId: /SAL/i }
    ]
  });

  if (!salmoraDoc) {
    console.log("PASS: Salmora exclusion confirmed (not present in database).");
    passed++;
  } else {
    console.error("FAIL: Salmora found in database:", salmoraDoc);
    failed++;
  }

  // 5. Verify No Duplicates
  const allVillages = await db.collection('villages').find({}).toArray();
  const villageIds = allVillages.map(v => v.villageId);
  const uniqueVillageIds = new Set(villageIds);
  if (villageIds.length === uniqueVillageIds.size) {
    console.log("PASS: Zero duplicate villageId records found.");
    passed++;
  } else {
    console.error("FAIL: Duplicate villageId records detected.");
    failed++;
  }

  const allSources = await db.collection('waterSources').find({}).toArray();
  const sourceIds = allSources.map(s => s.sourceId);
  const uniqueSourceIds = new Set(sourceIds);
  if (sourceIds.length === uniqueSourceIds.size) {
    console.log("PASS: Zero duplicate sourceId records found.");
    passed++;
  } else {
    console.error("FAIL: Duplicate sourceId records detected.");
    failed++;
  }

  // 6. Verify 2dsphere Geospatial Index & Real Queries
  console.log("\n--- Executing Real Geospatial Queries ---");

  // Query A: Find nearest water source to Kamalabari [94.1658, 26.9466]
  const nearestSources = await db.collection('waterSources').find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [94.1658, 26.9466] },
        $maxDistance: 50000 // 50 km
      }
    }
  }).toArray();

  if (nearestSources.length > 0 && nearestSources[0].sourceId === "SRC_001") {
    console.log(`PASS: Geospatial query on waterSources succeeded. Nearest to Kamalabari is ${nearestSources[0].name} (${nearestSources[0].sourceId}).`);
    passed++;
  } else {
    console.error("FAIL: Geospatial query on waterSources failed or returned unexpected result:", nearestSources);
    failed++;
  }

  // Query B: Find villages within 15 km of Deepor Beel [91.6667, 26.1333]
  const deeporVillages = await db.collection('villages').find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [91.6667, 26.1333] },
        $maxDistance: 15000 // 15 km
      }
    }
  }).toArray();

  const deeporVillageIds = deeporVillages.map(v => v.villageId);
  console.log("Villages within 15km of Deepor Beel:", deeporVillages.map(v => `${v.name} (${v.villageId})`));

  if (deeporVillageIds.includes("VIL_KAM_001") &&
      deeporVillageIds.includes("VIL_KAM_002") &&
      deeporVillageIds.includes("VIL_KAM_003")) {
    console.log("PASS: Geospatial query on villages succeeded (returned all 3 Kamrup Metro catchment villages).");
    passed++;
  } else {
    console.error("FAIL: Geospatial query on villages did not return expected Deepor Beel catchment villages:", deeporVillageIds);
    failed++;
  }

  // 7. Verify sensorNodes Preserved
  const sensorNodes = await db.collection('sensorNodes').find({}).toArray();
  const nodeIds = sensorNodes.map(n => n.nodeId);
  console.log("Preserved sensorNodes:", nodeIds);
  if (nodeIds.includes("NODE001") && nodeIds.includes("NODE002") && nodeIds.includes("NODE003")) {
    console.log("PASS: Existing sensor nodes NODE001, NODE002, NODE003 preserved.");
    passed++;
  } else {
    console.error("FAIL: Missing expected sensor nodes in sensorNodes collection.");
    failed++;
  }

  // 8. Verify All 8 Collections Exist
  const collections = await db.listCollections().toArray();
  const collNames = collections.map(c => c.name);
  const requiredColls = ["villages", "waterSources", "sensorNodes", "waterReadings", "symptoms", "weather", "riskScores", "alerts"];
  const allCollsPresent = requiredColls.every(c => collNames.includes(c));

  if (allCollsPresent) {
    console.log("PASS: All 8 required MongoDB collections exist and are intact.");
    passed++;
  } else {
    console.error("FAIL: Missing collections:", requiredColls.filter(c => !collNames.includes(c)));
    failed++;
  }

  console.log(`\n================================`);
  console.log(`Validation Passed: ${passed}, Validation Failed: ${failed}`);
  console.log(`================================\n`);

  await closeDatabase();
  process.exit(failed === 0 ? 0 : 1);
}

validateSeed().catch(async (err) => {
  console.error("Validation failed with error:", err);
  await closeDatabase();
  process.exit(1);
});
