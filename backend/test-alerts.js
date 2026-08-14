require('dotenv').config();
const { connectToDatabase, closeDatabase } = require('./db');
const { processAlerts } = require('./services/alertService');
const { Double } = require('mongodb');

const originalFetch = global.fetch;

async function runTests() {
  const db = await connectToDatabase();
  console.log("Connected to DB for Alert testing.\\n");

  await db.collection('alerts').deleteMany({});
  await db.collection('riskScores').deleteMany({ "location.coordinates": [77.4119, 8.1833] });

  let apiKeySet = !!process.env.TWILIO_ACCOUNT_SID;
  if (!apiKeySet) {
    console.log("   TWILIO_ACCOUNT_SID is missing. Mocking external API solely for logic verification.");
    process.env.TWILIO_ACCOUNT_SID = "mock_sid";
    process.env.TWILIO_AUTH_TOKEN = "mock_token";
    process.env.TWILIO_FROM_NUMBER = "mock_from";
    process.env.TWILIO_TO_NUMBER = "mock_to";
  }

  // 1. Seed LOW risk. No alert should be generated.
  await db.collection('riskScores').insertOne({
    location: { type: "Point", coordinates: [new Double(77.4119), new Double(8.1833)] },
    latitude: new Double(8.1833),
    longitude: new Double(77.4119),
    timestamp: new Date(Date.now() - 60000 * 60), // 60 mins ago
    riskScore: new Double(0.2),
    riskLevel: "LOW"
  });

  await processAlerts();
  let alertsCount = await db.collection('alerts').countDocuments();
  console.log(`1. LOW risk -> generated ${alertsCount} alerts (Expected: 0)`);

  // 2. Seed MEDIUM risk. Should generate exactly 1 alert, and send it.
  await db.collection('riskScores').insertOne({
    location: { type: "Point", coordinates: [new Double(77.4119), new Double(8.1833)] },
    latitude: new Double(8.1833),
    longitude: new Double(77.4119),
    timestamp: new Date(Date.now() - 60000 * 45), // 45 mins ago
    riskScore: new Double(0.55),
    riskLevel: "MEDIUM"
  });

  // Mock success Twilio response
  global.fetch = async () => ({ ok: true, json: async () => ({ sid: "SM_mock_success_123" }) });

  await processAlerts();
  
  let mediumAlerts = await db.collection('alerts').find({ riskLevel: "MEDIUM" }).toArray();
  console.log(`2. MEDIUM risk -> generated ${mediumAlerts.length} alerts (Expected: 1)`);
  if (mediumAlerts.length > 0) {
    console.log(`   Alert Provider ID: ${mediumAlerts[0].providerMessageId}`);
    console.log(`   Alert Status: ${mediumAlerts[0].status} (Expected: SENT)`);
    console.log(`   Original Risk Score Unmodified? ${mediumAlerts[0].riskScore === 0.55}`);
  }

  // 3. Seed another MEDIUM risk. This should NOT generate a new alert (Duplicate prevention).
  await db.collection('riskScores').insertOne({
    location: { type: "Point", coordinates: [new Double(77.4119), new Double(8.1833)] },
    latitude: new Double(8.1833),
    longitude: new Double(77.4119),
    timestamp: new Date(Date.now() - 60000 * 30), // 30 mins ago
    riskScore: new Double(0.6),
    riskLevel: "MEDIUM"
  });

  await processAlerts();
  mediumAlerts = await db.collection('alerts').find({ riskLevel: "MEDIUM" }).toArray();
  console.log(`3. Back-to-back MEDIUM risk -> generated ${mediumAlerts.length} alerts (Expected: 1)`);

  // 4. Seed HIGH risk. Should generate exactly 1 alert (differs from previous).
  await db.collection('riskScores').insertOne({
    location: { type: "Point", coordinates: [new Double(77.4119), new Double(8.1833)] },
    latitude: new Double(8.1833),
    longitude: new Double(77.4119),
    timestamp: new Date(Date.now() - 60000 * 15), // 15 mins ago
    riskScore: new Double(0.9),
    riskLevel: "HIGH"
  });

  // Mock failed Twilio response to test retry mechanism
  let fetchCallCount = 0;
  global.fetch = async () => {
    fetchCallCount++;
    return { ok: false, status: 500, statusText: "Internal Server Error" };
  };

  // Run 1st time - generates alert, fails to send
  await processAlerts();
  let highAlerts = await db.collection('alerts').find({ riskLevel: "HIGH" }).toArray();
  console.log(`\\n4. HIGH risk -> generated ${highAlerts.length} alerts (Expected: 1)`);
  if (highAlerts.length > 0) {
    console.log(`   Alert Status: ${highAlerts[0].status} (Expected: FAILED)`);
    console.log(`   Retry Count: ${highAlerts[0].retryCount} (Expected: 1)`);
    
    // Run 2nd time
    await processAlerts();
    highAlerts = await db.collection('alerts').find({ riskLevel: "HIGH" }).toArray();
    console.log(`   After 2nd try - Retry Count: ${highAlerts[0].retryCount} (Expected: 2)`);
    
    // Run 3rd time
    await processAlerts();
    highAlerts = await db.collection('alerts').find({ riskLevel: "HIGH" }).toArray();
    console.log(`   After 3rd try - Retry Count: ${highAlerts[0].retryCount} (Expected: 3)`);
    
    // Run 4th time - should NOT attempt to send again
    await processAlerts();
    highAlerts = await db.collection('alerts').find({ riskLevel: "HIGH" }).toArray();
    console.log(`   After 4th try - Retry Count: ${highAlerts[0].retryCount} (Expected: 3 - max retries reached)`);
    console.log(`   Total Fetch calls made to mock: ${fetchCallCount} (Expected: 3)`);
  }

  // Cleanup
  global.fetch = originalFetch; 
  if (!apiKeySet) {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_NUMBER;
    delete process.env.TWILIO_TO_NUMBER;
  }
  
  await db.collection('alerts').deleteMany({});
  await db.collection('riskScores').deleteMany({ "location.coordinates": [77.4119, 8.1833] });
  await closeDatabase();
  console.log("\\nTests completed successfully.");
}

runTests().catch(console.error);
