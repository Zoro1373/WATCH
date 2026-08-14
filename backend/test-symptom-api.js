require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const authMiddleware = require('./middleware/auth');
const symptomRoute = require('./routes/symptom');
const { connectToDatabase, closeDatabase } = require('./db');
const { ObjectId } = require('mongodb');

async function runTests() {
  const db = await connectToDatabase();
  console.log("Connected to DB for testing.\\n");

  // Cleanup testing environment
  const ts1 = "2026-08-12T12:00:00.000Z";
  const parsedTs1 = new Date(ts1);
  await db.collection('symptoms').deleteMany({ timestamp: parsedTs1 });

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
    const data = await res.json().catch(()=>({}));
    return { status: res.status, data };
  }

  const validPayload = {
    location: { latitude: 8.1833, longitude: 77.4119 },
    timestamp: ts1,
    feverCount: 12, diarrheaCount: 5, vomitingCount: 3, abdominalPainCount: 4
  };

  try {
    console.log("1. Valid symptom payload -> Documented success response");
    let r1 = await apiPost(validPayload);
    console.log(`   Status: ${r1.status}`);
    console.log(`   Body: ${JSON.stringify(r1.data)}`);
    const symptomId = r1.data.data?.symptomId;

    console.log("\\n2. Missing X-API-KEY -> 401");
    let r2 = await apiPost(validPayload, null);
    console.log(`   Status: ${r2.status} | Code: ${r2.data?.error?.code}`);

    console.log("\\n3. Invalid X-API-KEY -> 401");
    let r3 = await apiPost(validPayload, "bad_key");
    console.log(`   Status: ${r3.status} | Code: ${r3.data?.error?.code}`);

    console.log("\\n4. Invalid symptom payload -> 400 VALIDATION_ERROR");
    let r4 = await apiPost({ location: { latitude: 8.1833 } }); // missing fields
    console.log(`   Status: ${r4.status} | Code: ${r4.data?.error?.code}`);

    console.log("\\n5. Negative symptom count -> 400 VALIDATION_ERROR");
    let r5 = await apiPost({ ...validPayload, feverCount: -1 });
    console.log(`   Status: ${r5.status} | Code: ${r5.data?.error?.code}`);

    console.log("\\n6. Invalid latitude/longitude -> 400 VALIDATION_ERROR");
    let r6 = await apiPost({ ...validPayload, location: { latitude: 95.0, longitude: 77.4119 } });
    console.log(`   Status: ${r6.status} | Code: ${r6.data?.error?.code}`);

    console.log("\\n7, 8 & 10. Verify MongoDB insertion and GeoJSON");
    const stored = await db.collection('symptoms').findOne({ _id: new ObjectId(symptomId) });
    console.log(`   Found in DB? ${!!stored}`);
    if (stored) {
      console.log(`   Location Type: ${stored.location?.type}`);
      console.log(`   Location Coords: [${stored.location?.coordinates}]`);
      console.log(`   Fever Count: ${stored.feverCount}`);
    }

    console.log("\\n9. Submit the same location + timestamp again and verify upsert/idempotency behavior");
    // Modify one field to ensure it upserts/updates the existing one instead of failing or inserting duplicate
    const updatedPayload = { ...validPayload, feverCount: 15 };
    let r7 = await apiPost(updatedPayload);
    console.log(`   Status: ${r7.status}`);
    const newSymptomId = r7.data.data?.symptomId;
    console.log(`   Returned ID matches existing ID? ${symptomId === newSymptomId}`);
    
    // Check DB count for this location/timestamp
    const count = await db.collection('symptoms').countDocuments({ timestamp: parsedTs1, latitude: 8.1833, longitude: 77.4119 });
    console.log(`   Total documents for this timestamp/location: ${count}`);

    const updatedStored = await db.collection('symptoms').findOne({ _id: new ObjectId(newSymptomId) });
    console.log(`   Updated Fever Count: ${updatedStored.feverCount}`);

  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    server.close();
    await closeDatabase();
  }
}

runTests();
