require('dotenv').config({ path: __dirname + '/.env' });
const { connectToDatabase, closeDatabase } = require('./db');

const { Double } = require('mongodb');

const nodeMappings = [
  {
    nodeId: "NODE001",
    waterSourceId: "SRC_001",
    location: {
      type: "Point",
      coordinates: [new Double(94.1620), new Double(26.9380)]
    },
    isSimulated: true,
    status: "ACTIVE"
  },
  {
    nodeId: "NODE002",
    waterSourceId: "SRC_002",
    location: {
      type: "Point",
      coordinates: [new Double(91.6667), new Double(26.1333)]
    },
    isSimulated: true,
    status: "ACTIVE"
  },
  {
    nodeId: "NODE003",
    waterSourceId: "SRC_003",
    location: {
      type: "Point",
      coordinates: [new Double(92.7980), new Double(24.8260)]
    },
    isSimulated: true,
    status: "ACTIVE"
  }
];

async function seed() {
  const db = await connectToDatabase();
  console.log("Connected to MongoDB for sensor node mapping.");

  const now = new Date();

  for (const node of nodeMappings) {
    const filter = { nodeId: node.nodeId };
    const update = {
      $set: {
        waterSourceId: node.waterSourceId,
        location: node.location,
        isSimulated: node.isSimulated,
        status: node.status
      },
      $setOnInsert: {
        createdAt: now
      }
    };
    await db.collection('sensorNodes').updateOne(filter, update, { upsert: true });
    console.log(`- Mapped ${node.nodeId} -> ${node.waterSourceId} (isSimulated: ${node.isSimulated})`);
  }

  console.log("Sensor nodes mapping complete.");
  await closeDatabase();
}

seed().catch(async (err) => {
  console.error("Sensor node mapping failed:", err);
  await closeDatabase();
  process.exit(1);
});
