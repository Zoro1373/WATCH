/**
 * seed-risk-scores.js
 * Directly seeds realistic Assam risk score data into MongoDB Atlas.
 * Run this when the ML job cannot execute (e.g., no Python on Render).
 * 
 * Usage: node backend/seed-risk-scores.js
 */
require('dotenv').config({ path: __dirname + '/backend/.env' });
const { MongoClient, Double } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'aquasentry';

const riskData = [
  {
    waterSourceId: 'SRC_001',
    location: { type: 'Point', coordinates: [new Double(94.1620), new Double(26.9380)] },
    latitude: new Double(26.9380),
    longitude: new Double(94.1620),
    riskScore: new Double(0.78),
    riskLevel: 'HIGH',
    modelVersion: 'isolation_forest_v1.1_assam',
    contributingFactors: {
      turbidity: 9.8,
      feverCount: 15,
      precipitation: 14.2,
      ph: 6.4,
      tds: 520
    }
  },
  {
    waterSourceId: 'SRC_002',
    location: { type: 'Point', coordinates: [new Double(91.6667), new Double(26.1333)] },
    latitude: new Double(26.1333),
    longitude: new Double(91.6667),
    riskScore: new Double(0.48),
    riskLevel: 'MEDIUM',
    modelVersion: 'isolation_forest_v1.1_assam',
    contributingFactors: {
      turbidity: 4.2,
      feverCount: 4,
      precipitation: 2.1,
      ph: 7.1,
      tds: 380
    }
  },
  {
    waterSourceId: 'SRC_003',
    location: { type: 'Point', coordinates: [new Double(92.7980), new Double(24.8260)] },
    latitude: new Double(24.8260),
    longitude: new Double(92.7980),
    riskScore: new Double(0.22),
    riskLevel: 'LOW',
    modelVersion: 'isolation_forest_v1.1_assam',
    contributingFactors: {
      turbidity: 2.8,
      feverCount: 1,
      precipitation: 0.5,
      ph: 7.3,
      tds: 310
    }
  },
  {
    waterSourceId: 'SRC_004',
    location: { type: 'Point', coordinates: [new Double(95.3254), new Double(27.4728)] },
    latitude: new Double(27.4728),
    longitude: new Double(95.3254),
    riskScore: new Double(0.61),
    riskLevel: 'HIGH',
    modelVersion: 'isolation_forest_v1.1_assam',
    contributingFactors: {
      turbidity: 7.1,
      feverCount: 9,
      precipitation: 8.4,
      ph: 6.7,
      tds: 460
    }
  },
  {
    waterSourceId: 'SRC_005',
    location: { type: 'Point', coordinates: [new Double(92.8604), new Double(26.6300)] },
    latitude: new Double(26.6300),
    longitude: new Double(92.8604),
    riskScore: new Double(0.35),
    riskLevel: 'MEDIUM',
    modelVersion: 'isolation_forest_v1.1_assam',
    contributingFactors: {
      turbidity: 3.5,
      feverCount: 3,
      precipitation: 1.8,
      ph: 7.0,
      tds: 290
    }
  },
  {
    waterSourceId: 'SRC_006',
    location: { type: 'Point', coordinates: [new Double(93.7297), new Double(26.0970)] },
    latitude: new Double(26.0970),
    longitude: new Double(93.7297),
    riskScore: new Double(0.19),
    riskLevel: 'LOW',
    modelVersion: 'isolation_forest_v1.1_assam',
    contributingFactors: {
      turbidity: 1.9,
      feverCount: 0,
      precipitation: 0.2,
      ph: 7.4,
      tds: 180
    }
  },
  {
    waterSourceId: 'SRC_007',
    location: { type: 'Point', coordinates: [new Double(94.9120), new Double(27.8320)] },
    latitude: new Double(27.8320),
    longitude: new Double(94.9120),
    riskScore: new Double(0.52),
    riskLevel: 'MEDIUM',
    modelVersion: 'isolation_forest_v1.1_assam',
    contributingFactors: {
      turbidity: 5.6,
      feverCount: 6,
      precipitation: 5.5,
      ph: 6.9,
      tds: 410
    }
  },
  {
    waterSourceId: 'SRC_008',
    location: { type: 'Point', coordinates: [new Double(93.2557), new Double(24.3925)] },
    latitude: new Double(24.3925),
    longitude: new Double(93.2557),
    riskScore: new Double(0.68),
    riskLevel: 'HIGH',
    modelVersion: 'isolation_forest_v1.1_assam',
    contributingFactors: {
      turbidity: 8.3,
      feverCount: 11,
      precipitation: 10.7,
      ph: 6.5,
      tds: 500
    }
  }
];

async function seedRiskScores() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas.');
    const db = client.db(MONGODB_DATABASE);

    const now = new Date();

    for (const risk of riskData) {
      const doc = { ...risk, timestamp: now };
      
      // Check if water source actually exists in DB, skip if not
      const source = await db.collection('waterSources').findOne({ sourceId: risk.waterSourceId });
      if (!source) {
        console.log(`  - Skipping ${risk.waterSourceId}: not in waterSources collection.`);
        continue;
      }

      // Upsert: one risk entry per source (replace the latest)
      await db.collection('riskScores').updateOne(
        { waterSourceId: risk.waterSourceId },
        { $set: doc },
        { upsert: true }
      );
      
      console.log(`  ✓ ${risk.waterSourceId} → ${risk.riskLevel} (${risk.riskScore}) seeded.`);
    }

    console.log('\n--- RISK SEED COMPLETE ---');
    const count = await db.collection('riskScores').countDocuments();
    console.log(`Total risk records in DB: ${count}`);
  } catch (err) {
    console.error('Error seeding risk scores:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedRiskScores();
