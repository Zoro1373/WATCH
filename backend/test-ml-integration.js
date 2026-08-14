require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { connectToDatabase, closeDatabase } = require('./db');
const { runMLInference } = require('./jobs/mlRunner');
const { Double } = require('mongodb');

async function runTests() {
  const db = await connectToDatabase();
  console.log("Connected to DB for ML Integration testing.\\n");

  // Clean up
  await db.collection('sensorNodes').deleteMany({ nodeId: "TEST_ML_NODE_123" });
  await db.collection('waterReadings').deleteMany({ nodeId: "TEST_ML_NODE_123" });
  await db.collection('symptoms').deleteMany({ "location.coordinates": [77.123, 8.123] });
  await db.collection('weather').deleteMany({ "location.coordinates": [77.123, 8.123] });
  await db.collection('riskScores').deleteMany({ "location.coordinates": [77.123, 8.123] });
  await db.collection('alerts').deleteMany({ "location.coordinates": [77.123, 8.123] });

  // 1. Seed dummy data
  await db.collection('sensorNodes').insertOne({
    nodeId: "TEST_ML_NODE_123",
    createdAt: new Date()
  });

  await db.collection('waterReadings').insertOne({
    nodeId: "TEST_ML_NODE_123",
    location: { type: "Point", coordinates: [new Double(77.123), new Double(8.123)] },
    latitude: new Double(8.123),
    longitude: new Double(77.123),
    timestamp: new Date(),
    ph: new Double(6.5),
    tds: new Double(300),
    turbidity: new Double(5.0),
    temperature: new Double(25.0)
  });

  await db.collection('symptoms').insertOne({
    location: { type: "Point", coordinates: [new Double(77.123), new Double(8.123)] },
    latitude: new Double(8.123),
    longitude: new Double(77.123),
    timestamp: new Date(),
    feverCount: 1,
    diarrheaCount: 2,
    vomitingCount: 0,
    abdominalPainCount: 0
  });

  console.log("Seeded mock data. Running ML Inference Pipeline...");

  // Mock global fetch for twilio to prevent real SMS being sent by alertService during testing
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ sid: "SM_mock_success_123" }) });

  // 2. Run the integration script
  await runMLInference();

  global.fetch = originalFetch;

  // 3. Verify ML output was persisted to riskScores correctly
  const generatedRisk = await db.collection('riskScores').find({ "location.coordinates": [77.123, 8.123] }).sort({ timestamp: -1 }).toArray();

  if (generatedRisk.length === 0) {
    console.error("FAIL: ML Pipeline did not persist a riskScore to MongoDB.");
  } else {
    console.log("PASS: Found persisted riskScore from ML pipeline.");
    console.log(`Risk Score: ${generatedRisk[0].riskScore}`);
    console.log(`Risk Level: ${generatedRisk[0].riskLevel}`);
    console.log(`Model Version: ${generatedRisk[0].modelVersion || 'N/A'}`);
    if (generatedRisk[0].contributingFactors) {
      console.log(`Contributing Factors generated: true`);
    }

    // 4. Check if Alert was triggered (only if MEDIUM or HIGH)
    if (["MEDIUM", "HIGH"].includes(generatedRisk[0].riskLevel)) {
      const generatedAlerts = await db.collection('alerts').find({ "location.coordinates": [77.123, 8.123] }).toArray();
      if (generatedAlerts.length > 0) {
        console.log(`PASS: alertService successfully triggered and wrote an alert with status: ${generatedAlerts[0].status}`);
      } else {
        console.error("FAIL: ML risk was MEDIUM/HIGH but alertService did not generate an alert.");
      }
    } else {
      console.log("Alert check skipped (Risk is LOW).");
    }
  }

  // Cleanup
  await db.collection('sensorNodes').deleteMany({ nodeId: "TEST_ML_NODE_123" });
  await db.collection('waterReadings').deleteMany({ nodeId: "TEST_ML_NODE_123" });
  await db.collection('symptoms').deleteMany({ "location.coordinates": [77.123, 8.123] });
  await db.collection('riskScores').deleteMany({ "location.coordinates": [77.123, 8.123] });
  await db.collection('alerts').deleteMany({ "location.coordinates": [77.123, 8.123] });

  await closeDatabase();
  console.log("\\nTests completed.");
}

runTests().catch(console.error);
