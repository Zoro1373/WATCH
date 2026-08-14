require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const authMiddleware = require('./middleware/auth');
const sensorRoute = require('./routes/sensor');
const { connectToDatabase, closeDatabase } = require('./db');
const { ObjectId } = require('mongodb');

async function runTests() {
  const db = await connectToDatabase();
  console.log("Connected to DB for testing.\\n");

  // Cleanup testing environment
  await db.collection('waterReadings').deleteMany({ nodeId: "TEST_NODE_1" });
  await db.collection('waterReadings').deleteMany({ nodeId: "TEST_NODE_UNREG" });
  await db.collection('sensorNodes').deleteMany({ nodeId: "TEST_NODE_1" });

  // 1. Insert a mock registered node
  await db.collection('sensorNodes').insertOne({
    nodeId: "TEST_NODE_1",
    name: "Testing Node",
    location: { type: "Point", coordinates: [77.4119, 8.1833] },
    status: "ACTIVE",
    createdAt: new Date()
  });

  const app = express();
  app.use(bodyParser.json());
  app.use('/api', authMiddleware);
  app.use('/api/sensor', sensorRoute);

  const server = app.listen(0);
  const port = server.address().port;

  async function apiPost(body, overrideKey) {
    const headers = { 'Content-Type': 'application/json' };
    if (overrideKey !== null) {
      headers['X-API-KEY'] = overrideKey !== undefined ? overrideKey : process.env.API_KEY_IOT;
    }
    const res = await fetch(`http://localhost:${port}/api/sensor`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(()=>({}));
    return { status: res.status, data };
  }

  const ts1 = "2026-08-12T12:30:00.000Z";
  const validPayload = {
    nodeId: "TEST_NODE_1", timestamp: ts1, latitude: 8.1833, longitude: 77.4119,
    ph: 6.8, tds: 420, turbidity: 8.4, temperature: 28.2
  };

  try {
    console.log("1. Valid registered node + valid sensor payload -> Documented success response");
    let r1 = await apiPost(validPayload);
    console.log(`   Status: ${r1.status}`);
    console.log(`   Body: ${JSON.stringify(r1.data)}`);
    const readingId = r1.data.data.readingId;

    console.log("\\n2. Missing X-API-KEY -> 401");
    let r2 = await apiPost(validPayload, null);
    console.log(`   Status: ${r2.status} | Code: ${r2.data?.error?.code}`);

    console.log("\\n3. Invalid X-API-KEY -> 401");
    let r3 = await apiPost(validPayload, "bad_key");
    console.log(`   Status: ${r3.status} | Code: ${r3.data?.error?.code}`);

    console.log("\\n4. Invalid sensor payload -> 400 VALIDATION_ERROR");
    let r4 = await apiPost({ nodeId: "TEST_NODE_1" });
    console.log(`   Status: ${r4.status} | Code: ${r4.data?.error?.code}`);

    console.log("\\n5. pH outside 0-14 -> 400 VALIDATION_ERROR");
    let r5 = await apiPost({ ...validPayload, ph: 15.0 });
    console.log(`   Status: ${r5.status} | Code: ${r5.data?.error?.code}`);

    console.log("\\n6. Unregistered nodeId -> 404 NOT_FOUND");
    let r6 = await apiPost({ ...validPayload, nodeId: "TEST_NODE_UNREG" });
    console.log(`   Status: ${r6.status} | Code: ${r6.data?.error?.code}`);

    console.log("\\n7. Duplicate nodeId + timestamp -> Documented idempotent response");
    let r7 = await apiPost(validPayload);
    console.log(`   Status: ${r7.status}`);
    console.log(`   Message: ${r7.data.message}`);
    console.log(`   Matched readingId? ${r7.data.data.readingId === readingId}`);

    console.log("\\n8. More than 60 requests/minute -> 429 RATE_LIMIT_EXCEEDED");
    let rateLimitHit = false;
    for(let i=0; i<62; i++) {
      let r = await apiPost({ ...validPayload, timestamp: `2026-08-12T12:40:${i.toString().padStart(2,'0')}.000Z` });
      if (r.status === 429) {
        console.log(`   Hit 429 at request ${i+1}`);
        console.log(`   Body: ${JSON.stringify(r.data)}`);
        rateLimitHit = true;
        break;
      }
    }
    
    console.log("\\n9/10. Verify MongoDB document insertion and GeoJSON");
    const stored = await db.collection('waterReadings').findOne({ _id: new ObjectId(readingId) });
    console.log(`   Found in DB? ${!!stored}`);
    if (stored) {
      console.log(`   Location Type: ${stored.location?.type}`);
      console.log(`   Location Coords: [${stored.location?.coordinates}]`);
    }

  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    server.close();
    await closeDatabase();
  }
}

runTests();
