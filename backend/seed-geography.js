require('dotenv').config({ path: __dirname + '/.env' });
const { connectToDatabase, closeDatabase } = require('./db');
const { Double } = require('mongodb');

const approvedWaterSources = [
  {
    sourceId: "SRC_001",
    name: "Brahmaputra River (Majuli Reach)",
    type: "RIVER",
    location: {
      type: "Point",
      coordinates: [new Double(94.1620), new Double(26.9380)]
    },
    servedVillageIds: ["VIL_MAJ_001", "VIL_MAJ_002"],
    monitoringStatus: "MONITORED_SIMULATED"
  },
  {
    sourceId: "SRC_002",
    name: "Deepor Beel",
    type: "WETLAND",
    location: {
      type: "Point",
      coordinates: [new Double(91.6667), new Double(26.1333)]
    },
    servedVillageIds: ["VIL_KAM_001", "VIL_KAM_002", "VIL_KAM_003"],
    monitoringStatus: "MONITORED_SIMULATED"
  },
  {
    sourceId: "SRC_003",
    name: "Barak River (Cachar Reach)",
    type: "RIVER",
    location: {
      type: "Point",
      coordinates: [new Double(92.7980), new Double(24.8260)]
    },
    servedVillageIds: ["VIL_CAC_001", "VIL_CAC_002"],
    monitoringStatus: "MONITORED_SIMULATED"
  }
];

const approvedVillages = [
  {
    villageId: "VIL_MAJ_001",
    name: "Kamalabari",
    district: "Majuli",
    location: {
      type: "Point",
      coordinates: [new Double(94.1658), new Double(26.9466)]
    },
    primaryWaterSourceId: "SRC_001",
    verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
  },
  {
    villageId: "VIL_MAJ_002",
    name: "Garmur",
    district: "Majuli",
    location: {
      type: "Point",
      coordinates: [new Double(94.1575), new Double(26.9803)]
    },
    primaryWaterSourceId: "SRC_001",
    verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
  },
  {
    villageId: "VIL_KAM_001",
    name: "Pamohi",
    district: "Kamrup Metropolitan",
    location: {
      type: "Point",
      coordinates: [new Double(91.6894), new Double(26.1039)]
    },
    primaryWaterSourceId: "SRC_002",
    verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
  },
  {
    villageId: "VIL_KAM_002",
    name: "Chakardeo",
    district: "Kamrup Metropolitan",
    location: {
      type: "Point",
      coordinates: [new Double(91.6483), new Double(26.1000)]
    },
    primaryWaterSourceId: "SRC_002",
    verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
  },
  {
    villageId: "VIL_KAM_003",
    name: "Paschim Boragaon",
    district: "Kamrup Metropolitan",
    location: {
      type: "Point",
      coordinates: [new Double(91.6833), new Double(26.1164)]
    },
    primaryWaterSourceId: "SRC_002",
    verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
  },
  {
    villageId: "VIL_CAC_001",
    name: "Sonabarighat",
    district: "Cachar",
    location: {
      type: "Point",
      coordinates: [new Double(92.8475), new Double(24.7454)]
    },
    primaryWaterSourceId: "SRC_003",
    verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
  },
  {
    villageId: "VIL_CAC_002",
    name: "Borkhola",
    district: "Cachar",
    location: {
      type: "Point",
      coordinates: [new Double(92.7458), new Double(24.9228)]
    },
    primaryWaterSourceId: "SRC_003",
    verificationStatus: "VERIFIED_GEOGRAPHIC_REFERENCE"
  }
];

async function seedGeography() {
  const db = await connectToDatabase();
  console.log("Connected to MongoDB for geographic seeding.\n");

  const now = new Date();

  // 1. Seed Water Sources idempotently
  console.log("Seeding Water Sources...");
  for (const src of approvedWaterSources) {
    const filter = { sourceId: src.sourceId };
    const update = {
      $set: {
        name: src.name,
        type: src.type,
        location: src.location,
        servedVillageIds: src.servedVillageIds,
        monitoringStatus: src.monitoringStatus
      },
      $setOnInsert: {
        createdAt: now
      }
    };
    await db.collection('waterSources').updateOne(filter, update, { upsert: true });
    console.log(`  - Water Source ${src.sourceId} (${src.name}) upserted.`);
  }

  // 2. Seed Villages idempotently
  console.log("\nSeeding Villages...");
  for (const vil of approvedVillages) {
    const filter = { villageId: vil.villageId };
    const update = {
      $set: {
        name: vil.name,
        district: vil.district,
        location: vil.location,
        primaryWaterSourceId: vil.primaryWaterSourceId,
        verificationStatus: vil.verificationStatus
      },
      $setOnInsert: {
        createdAt: now
      }
    };
    await db.collection('villages').updateOne(filter, update, { upsert: true });
    console.log(`  - Village ${vil.villageId} (${vil.name}, ${vil.district}) upserted.`);
  }

  // 3. Output current counts
  const waterSourceCount = await db.collection('waterSources').countDocuments({});
  const villageCount = await db.collection('villages').countDocuments({});

  console.log("\n--- SEED SUMMARY ---");
  console.log(`Total waterSources in DB: ${waterSourceCount}`);
  console.log(`Total villages in DB:     ${villageCount}`);

  await closeDatabase();
}

seedGeography().catch(async (err) => {
  console.error("Seeding failed with error:", err);
  await closeDatabase();
  process.exit(1);
});
