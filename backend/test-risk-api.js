require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const authMiddleware = require('./middleware/auth');
const riskRoute = require('./routes/risk');
const { connectToDatabase, closeDatabase } = require('./db');
const { Double } = require('mongodb');

async function runTests() {
  const db = await connectToDatabase();
  console.log("Connected to DB for testing.\\n");

  const app = express();
  app.use(bodyParser.json());
  app.use('/api', authMiddleware);
  app.use('/api/risk', riskRoute);

  const server = app.listen(0);
  const port = server.address().port;

  async function apiGet(locationParam, overrideKey) {
    const headers = { 'Content-Type': 'application/json' };
    if (overrideKey !== null) {
      headers['X-API-KEY'] = overrideKey !== undefined ? overrideKey : process.env.API_KEY_FRONTEND;
    }
    const res = await fetch(`http://localhost:${port}/api/risk/${locationParam}`, {
      method: 'GET',
      headers
    });
    const data = await res.json().catch(()=>({}));
    return { status: res.status, data };
  }

  // Ensure fresh state
  await db.collection('riskScores').deleteMany({ modelVersion: "TEST_MODEL" });
  
  const lat = 8.1833;
  const lon = 77.4119;

  const oldDate = new Date("2026-08-12T10:00:00Z");
  const newDate = new Date("2026-08-12T11:00:00Z");

  await db.collection('riskScores').insertMany([
    {
      location: { type: "Point", coordinates: [new Double(lon), new Double(lat)] },
      latitude: new Double(lat),
      longitude: new Double(lon),
      riskScore: new Double(0.2),
      riskLevel: "LOW",
      timestamp: oldDate,
      modelVersion: "TEST_MODEL"
    },
    {
      location: { type: "Point", coordinates: [new Double(lon), new Double(lat)] },
      latitude: new Double(lat),
      longitude: new Double(lon),
      riskScore: new Double(0.72), // The newer risk assessment
      riskLevel: "HIGH",
      timestamp: newDate,
      modelVersion: "TEST_MODEL",
      contributingFactors: {
        ph: 6.8,
        tds: 420
      }
    }
  ]);

  try {
    console.log("1. Valid API key + seeded riskScore -> 200 response");
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

    console.log("\\n7. Valid location with no risk assessment -> 404 NOT_FOUND");
    let r7 = await apiGet("-10.0,-10.0"); 
    console.log(`   Status: ${r7.status} | Code: ${r7.data?.error?.code}`);

    console.log("\\n8. Verify returning MOST RECENT cached record");
    console.log(`   riskScore returned: ${r1.data.data?.riskScore}`);
    console.log(`   Is newer riskScore (0.72)? ${r1.data.data?.riskScore === 0.72}`);

    console.log("\\n9. Verify riskScore is returned exactly as stored (not recalculated)");
    console.log(`   riskScore === 0.72? ${r1.data.data?.riskScore === 0.72}`);

    console.log("\\n10. Verify riskLevel is returned exactly as stored");
    console.log(`   riskLevel === 'HIGH'? ${r1.data.data?.riskLevel === 'HIGH'}`);

    console.log("\\n11. Verify contributingFactors behavior exactly matches API contract");
    console.log(`   contributingFactors present? ${!!r1.data.data?.contributingFactors}`);
    console.log(`   tds === 420? ${r1.data.data?.contributingFactors?.tds === 420}`);
    
    console.log("\\n12. Verify the endpoint only reads from MongoDB and does not modify");
    const count = await db.collection('riskScores').countDocuments({ modelVersion: "TEST_MODEL" });
    console.log(`   Still exactly 2 documents in DB? ${count === 2}`);

  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    // Cleanup
    await db.collection('riskScores').deleteMany({ modelVersion: "TEST_MODEL" });
    server.close();
    await closeDatabase();
  }
}

runTests();
