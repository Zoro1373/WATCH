require('dotenv').config({ path: __dirname + '/.env' });
const { connectToDatabase, closeDatabase } = require('./db');

async function verify() {
  const db = await connectToDatabase();
  const readings = await db.collection('waterReadings').find({}).sort({ timestamp: -1 }).limit(3).toArray();
  console.log("=== LATEST MONGODB WATER READINGS ===");
  console.log(JSON.stringify(readings, null, 2));
  await closeDatabase();
}
verify().catch(console.error);
