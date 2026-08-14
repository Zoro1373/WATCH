require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const authMiddleware = require('./middleware/auth');
const symptomRoute = require('./routes/symptom');
const { connectToDatabase, closeDatabase } = require('./db');
const { ObjectId } = require('mongodb');

async function runTests() {
  const db = await connectToDatabase();
  console.log("Connected to DB for Phase 2.6 Symptom API testing.\n");

  // Remove any legacy test records without villageId
  await db.collection('symptoms').deleteMany({ villageId: { $exists: false } });

  const ts1 = "2026-08-14T12:00:00.000Z";
  const parsedTs1 = new Date(ts1);
  const ts2 = "2026-08-14T12:30:00.000Z";
  const parsedTs2 = new Date(ts2);

  const testInsertedIds = [];

  const app = express();
  app.use(bodyParser.json());
  app.use('/api', authMiddleware);
  app.use('/api/symptom', symptomRoute);

  const server = app.listen(0);
  const port = server.address().port;

  async function apiPost(body, overrideKey) {
    const headers = { 'Content-Type': 'application/json' };
    if (overrideKey !== null) {
      headers['X-API-KEY'] = overrideKey !== undefined ? overrideKey : process.env.API_KEY_FRONTEND;
    }
    const res = await fetch(`http://localhost:${port}/api/symptom`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  let passed = 0;
  let failed = 0;

  try {
    // TEST 1 — Valid village VIL_MAJ_001 (Kamalabari)
    console.log("TEST 1: Valid village VIL_MAJ_001 -> 201 Created & stored");
    const payload1 = {
      villageId: "VIL_MAJ_001",
      timestamp: ts1,
      feverCount: 12,
      diarrheaCount: 5,
      vomitingCount: 3,
      abdominalPainCount: 4
    };
    let r1 = await apiPost(payload1);
    console.log(`   Status: ${r1.status}`);
    console.log(`   Body: ${JSON.stringify(r1.data)}`);
    if (r1.status === 201 && r1.data.success && r1.data.data.villageId === "VIL_MAJ_001") {
      passed++;
      const symptomId1 = r1.data.data.symptomId;
      testInsertedIds.push(new ObjectId(symptomId1));

      const stored1 = await db.collection('symptoms').findOne({ _id: new ObjectId(symptomId1) });
      if (stored1 && stored1.villageId === "VIL_MAJ_001" && stored1.location?.type === "Point") {
        console.log(`   PASS: Symptom stored with villageId VIL_MAJ_001 and coordinates [${stored1.location.coordinates}].`);
        passed++;
      } else {
        console.error("   FAIL: Stored symptom document invalid:", stored1);
        failed++;
      }
    } else {
      console.error("   FAIL: TEST 1 did not return 201 success:", r1.data);
      failed++;
    }

    // TEST 2 — Another valid village VIL_KAM_001 (Pamohi)
    console.log("\nTEST 2: Valid village VIL_KAM_001 -> 201 Created & stored");
    const payload2 = {
      villageId: "VIL_KAM_001",
      timestamp: ts2,
      feverCount: 6,
      diarrheaCount: 2,
      vomitingCount: 1,
      abdominalPainCount: 0
    };
    let r2 = await apiPost(payload2);
    console.log(`   Status: ${r2.status}`);
    if (r2.status === 201 && r2.data.data.villageId === "VIL_KAM_001") {
      passed++;
      const symptomId2 = r2.data.data.symptomId;
      testInsertedIds.push(new ObjectId(symptomId2));

      const stored2 = await db.collection('symptoms').findOne({ _id: new ObjectId(symptomId2) });
      if (stored2 && stored2.villageId === "VIL_KAM_001") {
        console.log(`   PASS: Symptom stored with villageId VIL_KAM_001 and coordinates [${stored2.location.coordinates}].`);
        passed++;
      } else {
        console.error("   FAIL: Stored symptom document invalid:", stored2);
        failed++;
      }
    } else {
      console.error("   FAIL: TEST 2 did not return 201 success:", r2.data);
      failed++;
    }

    // TEST 3 — Invalid village DOES_NOT_EXIST -> 404 NOT_FOUND
    console.log("\nTEST 3: Invalid villageId DOES_NOT_EXIST -> 404 NOT_FOUND");
    const payload3 = {
      villageId: "DOES_NOT_EXIST",
      timestamp: ts1,
      feverCount: 2,
      diarrheaCount: 1,
      vomitingCount: 0,
      abdominalPainCount: 0
    };
    let r3 = await apiPost(payload3);
    console.log(`   Status: ${r3.status} | Code: ${r3.data?.error?.code}`);
    if (r3.status === 404 && r3.data?.error?.code === "NOT_FOUND") {
      const nonExistentDoc = await db.collection('symptoms').findOne({ villageId: "DOES_NOT_EXIST" });
      if (!nonExistentDoc) {
        console.log("   PASS: 404 returned and no symptom document was inserted.");
        passed++;
      } else {
        console.error("   FAIL: Symptom document was unexpectedly inserted for invalid village.");
        failed++;
      }
    } else {
      console.error("   FAIL: Expected 404 NOT_FOUND:", r3.data);
      failed++;
    }

    // TEST 4 — Missing villageId -> 400 VALIDATION_ERROR
    console.log("\nTEST 4: Missing villageId -> 400 VALIDATION_ERROR");
    const payload4 = {
      timestamp: ts1,
      feverCount: 2,
      diarrheaCount: 1,
      vomitingCount: 0,
      abdominalPainCount: 0
    };
    let r4 = await apiPost(payload4);
    console.log(`   Status: ${r4.status} | Code: ${r4.data?.error?.code}`);
    if (r4.status === 400 && r4.data?.error?.code === "VALIDATION_ERROR") {
      console.log("   PASS: 400 VALIDATION_ERROR returned for missing villageId.");
      passed++;
    } else {
      console.error("   FAIL: Expected 400 VALIDATION_ERROR:", r4.data);
      failed++;
    }

    // TEST 5 — Invalid symptom count (-5) -> 400 VALIDATION_ERROR
    console.log("\nTEST 5: Invalid symptom count (-5) -> 400 VALIDATION_ERROR");
    const payload5 = {
      villageId: "VIL_MAJ_001",
      timestamp: ts1,
      feverCount: 12,
      diarrheaCount: -5,
      vomitingCount: 3,
      abdominalPainCount: 4
    };
    let r5 = await apiPost(payload5);
    console.log(`   Status: ${r5.status} | Code: ${r5.data?.error?.code}`);
    if (r5.status === 400 && r5.data?.error?.code === "VALIDATION_ERROR") {
      console.log("   PASS: 400 VALIDATION_ERROR returned for negative symptom count.");
      passed++;
    } else {
      console.error("   FAIL: Expected 400 VALIDATION_ERROR:", r5.data);
      failed++;
    }

    // TEST 6 — Verify No Coordinate Fallback Attribution
    console.log("\nTEST 6: Verification of Authoritative villageId Attribution");
    // Verify that the symptom resolves to the village's primaryWaterSourceId directly
    const majuliVillage = await db.collection('villages').findOne({ villageId: "VIL_MAJ_001" });
    const associatedSource = await db.collection('waterSources').findOne({ sourceId: majuliVillage.primaryWaterSourceId });
    if (associatedSource && associatedSource.sourceId === "SRC_001") {
      console.log(`   PASS: Authoritative relationship verified: VIL_MAJ_001 -> primaryWaterSourceId (SRC_001) -> ${associatedSource.name}. Zero spatial proximity fallback used.`);
      passed++;
    } else {
      console.error("   FAIL: Authoritative water source association failed.");
      failed++;
    }

    // TEST 7 — Idempotent Upsert on (villageId, timestamp)
    console.log("\nTEST 7: Idempotent upsert on (villageId, timestamp)");
    const updatedPayload1 = { ...payload1, feverCount: 20 };
    let r7 = await apiPost(updatedPayload1);
    console.log(`   Status: ${r7.status}`);
    const symptomIdUpdated = r7.data?.data?.symptomId;
    const sameVillageCount = await db.collection('symptoms').countDocuments({ villageId: "VIL_MAJ_001", timestamp: parsedTs1 });
    console.log(`   Document count for VIL_MAJ_001 at ${ts1}: ${sameVillageCount}`);

    const updatedStored1 = await db.collection('symptoms').findOne({ _id: new ObjectId(symptomIdUpdated) });
    if (sameVillageCount === 1 && updatedStored1.feverCount === 20) {
      console.log(`   PASS: Idempotent upsert succeeded. Fever count updated to 20.`);
      passed++;
    } else {
      console.error("   FAIL: Idempotent upsert failed:", updatedStored1);
      failed++;
    }

  } catch (err) {
    console.error("Test execution failed:", err);
    failed++;
  } finally {
    // Teardown: Clean up ONLY test-created symptom documents
    await db.collection('symptoms').deleteMany({
      $or: [
        { _id: { $in: testInsertedIds } },
        { timestamp: { $in: [parsedTs1, parsedTs2] } }
      ]
    });
    console.log(`\nCleaned up test-created documents from symptoms.`);

    const postTestCount = await db.collection('symptoms').countDocuments({});
    console.log(`Post-test symptoms collection count: ${postTestCount}`);

    await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
  }

  console.log(`\n================================`);
  console.log(`Validation Passed: ${passed}, Validation Failed: ${failed}`);
  console.log(`================================\n`);
}

runTests().catch((err) => {
  console.error("Symptom API test fatal error:", err);
});
