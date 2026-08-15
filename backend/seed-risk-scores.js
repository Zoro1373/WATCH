const { MongoClient, Double } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://hiteshlaahirikodamala_db_user:fWERL6rDAaGDrrlk@cluster0.hqrrcxu.mongodb.net/?appName=Cluster0';
const MONGODB_DATABASE = 'aquasentry';

const riskData = [
  {
    waterSourceId: 'SRC_001',
    location: { type: 'Point', coordinates: [new Double(94.1620), new Double(26.9380)] },
    latitude: new Double(26.9380),
    longitude: new Double(94.1620),
    riskScore: new Double(0.78),
    riskLevel: 'HIGH',
    modelVersion: 'isolation_forest_v1.1_assam',
    contributingFactors: { turbidity: 9.8, feverCount: 15, precipitation: 14.2, ph: 6.4, tds: 520 }
  },
  {
    waterSourceId: 'SRC_002',
    location: { type: 'Point', coordinates: [new Double(91.6667), new Double(26.1333)] },
    latitude: new Double(26.1333),
    longitude: new Double(91.6667),
    riskScore: new Double(0.48),
    riskLevel: 'MEDIUM',
    modelVersion: 'isolation_forest_v1.1_assam',
    contributingFactors: { turbidity: 4.2, feverCount: 4, precipitation: 2.1, ph: 7.1, tds: 380 }
  },
  {
    waterSourceId: 'SRC_003',
    location: { type: 'Point', coordinates: [new Double(92.7980), new Double(24.8260)] },
    latitude: new Double(24.8260),
    longitude: new Double(92.7980),
    riskScore: new Double(0.22),
    riskLevel: 'LOW',
    modelVersion: 'isolation_forest_v1.1_assam',
    contributingFactors: { turbidity: 2.8, feverCount: 1, precipitation: 0.5, ph: 7.3, tds: 310 }
  }
];

async function seed() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas!');
    const db = client.db(MONGODB_DATABASE);
    const now = new Date();

    for (const risk of riskData) {
      const doc = { ...risk, timestamp: now };
      const src = await db.collection('waterSources').findOne({ sourceId: risk.waterSourceId });
      if (!src) {
        console.log('  - Skip:', risk.waterSourceId, '(not in waterSources)');
        continue;
      }
      const result = await db.collection('riskScores').updateOne(
        { waterSourceId: risk.waterSourceId },
        { $set: doc },
        { upsert: true }
      );
      console.log(`  ✓ ${risk.waterSourceId} -> ${risk.riskLevel} (score: ${risk.riskScore}) [${result.upsertedCount ? 'inserted' : 'updated'}]`);
    }

    const count = await db.collection('riskScores').countDocuments();
    console.log(`\nDone! Total risk records in DB: ${count}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
