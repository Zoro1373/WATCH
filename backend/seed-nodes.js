require('dotenv').config({ path: __dirname + '/.env' });
const { connectToDatabase, closeDatabase } = require('./db');

async function seed() {
  const db = await connectToDatabase();
  await db.collection('sensorNodes').insertMany([
    { nodeId: "NODE001", createdAt: new Date() },
    { nodeId: "NODE002", createdAt: new Date() },
    { nodeId: "NODE003", createdAt: new Date() }
  ]);
  console.log("Seeded nodes.");
  await closeDatabase();
}
seed().catch(console.error);
