require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const authMiddleware = require('./middleware/auth');
const weatherRoute = require('./routes/weather');
const { connectToDatabase, closeDatabase } = require('./db');
const { Double } = require('mongodb');

async function runTests() {
  const db = await connectToDatabase();
  console.log("Connected to DB for testing.\\n");

  const app = express();
  app.use(bodyParser.json());
  app.use('/api', authMiddleware);
  app.use('/api/weather', weatherRoute);

  const server = app.listen(0);
  const port = server.address().port;

  async function apiGet(locationParam, overrideKey) {
    const headers = { 'Content-Type': 'application/json' };
    if (overrideKey !== null) {
      headers['X-API-KEY'] = overrideKey !== undefined ? overrideKey : process.env.API_KEY_FRONTEND;
    }
    const res = await fetch(`http://localhost:${port}/api/weather/${locationParam}`, {
      method: 'GET',
      headers
    });
    const data = await res.json().catch(()=>({}));
    return { status: res.status, data };
  }

  // Ensure fresh state
  await db.collection('weather').deleteMany({ source: "TEST_SOURCE" });
  
  const lat = 8.1833;
  const lon = 77.4119;

  // Insert two records exactly at the same location but at different timestamps
  const oldDate = new Date("2026-08-12T10:00:00Z");
  const newDate = new Date("2026-08-12T11:00:00Z");

  await db.collection('weather').insertMany([
    {
      location: { type: "Point", coordinates: [new Double(lon), new Double(lat)] },
      latitude: new Double(lat),
      longitude: new Double(lon),
      temperature: new Double(25.0),
      precipitation: new Double(1.0),
      humidity: new Double(70),
      source: "TEST_SOURCE",
      cachedAt: oldDate,
      timestamp: oldDate
    },
    {
      location: { type: "Point", coordinates: [new Double(lon), new Double(lat)] },
      latitude: new Double(lat),
      longitude: new Double(lon),
      temperature: new Double(28.0), // Higher temp indicating the newer record
      precipitation: new Double(0.0),
      humidity: new Double(80),
      source: "TEST_SOURCE",
      cachedAt: newDate,
      timestamp: newDate
    }
  ]);

  try {
    console.log("1. Valid API key + valid lat,lon with seeded data -> 200 response");
    let r1 = await apiGet(`${lat},${lon}`);
    console.log(`   Status: ${r1.status}`);
    console.log(`   Body: ${JSON.stringify(r1.data)}`);

    console.log("\\n2. Missing API key -> 401");
    let r2 = await apiGet(`${lat},${lon}`, null);
    console.log(`   Status: ${r2.status} | Code: ${r2.data?.error?.code}`);

    console.log("\\n3. Invalid API key -> 401");
    let r3 = await apiGet(`${lat},${lon}`, "bad_key");
    console.log(`   Status: ${r3.status} | Code: ${r3.data?.error?.code}`);

    console.log("\\n4. Invalid location format -> 400 VALIDATION_ERROR");
    let r4 = await apiGet("just_a_string");
    console.log(`   Status: ${r4.status} | Code: ${r4.data?.error?.code}`);

    console.log("\\n5. Latitude outside documented range -> 400 VALIDATION_ERROR");
    let r5 = await apiGet("95.0,77.4119");
    console.log(`   Status: ${r5.status} | Code: ${r5.data?.error?.code}`);

    console.log("\\n6. Longitude outside documented range -> 400 VALIDATION_ERROR");
    let r6 = await apiGet("8.1833,190.0");
    console.log(`   Status: ${r6.status} | Code: ${r6.data?.error?.code}`);

    console.log("\\n7. Valid location with no cached data -> 404 NOT_FOUND");
    let r7 = await apiGet("-10.0,-10.0"); 
    console.log(`   Status: ${r7.status} | Code: ${r7.data?.error?.code}`);

    console.log("\\n8. Verify returning MOST RECENT cached record");
    console.log(`   Temperature returned: ${r1.data.data?.temperature}`);
    console.log(`   Is newer temperature (28.0)? ${r1.data.data?.temperature === 28.0}`);
    console.log(`   Timestamp returned: ${r1.data.data?.timestamp}`);

    console.log("\\n9. Verify response contains exactly the documented weather fields");
    const fields = Object.keys(r1.data.data).sort().join(',');
    const expected = ['cachedAt', 'humidity', 'location', 'precipitation', 'source', 'temperature', 'timestamp'].sort().join(',');
    console.log(`   Fields match exactly? ${fields === expected}`);

    console.log("\\n10. Verify query actually reads from MongoDB");
    console.log(`   Read data source: ${r1.data.data?.source}`);

  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    // Cleanup
    await db.collection('weather').deleteMany({ source: "TEST_SOURCE" });
    server.close();
    await closeDatabase();
  }
}

runTests();
