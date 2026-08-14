require('dotenv').config();
const { connectToDatabase, closeDatabase } = require('./db');

async function initDb() {
  try {
    const db = await connectToDatabase();
    console.log('Connected to MongoDB Atlas.');

    // 1. villages
    const villagesSchema = {
      $jsonSchema: {
        bsonType: "object",
        required: ["villageId", "name", "district", "location", "primaryWaterSourceId", "verificationStatus", "createdAt"],
        properties: {
          villageId: { bsonType: "string", minLength: 1 },
          name: { bsonType: "string" },
          district: { bsonType: "string" },
          location: {
            bsonType: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { enum: ["Point"] },
              coordinates: {
                bsonType: "array",
                minItems: 2,
                maxItems: 2,
                items: { bsonType: "double" }
              }
            }
          },
          primaryWaterSourceId: { bsonType: "string", minLength: 1 },
          verificationStatus: { bsonType: "string" },
          createdAt: { bsonType: "date" }
        }
      }
    };

    // 2. waterSources
    const waterSourcesSchema = {
      $jsonSchema: {
        bsonType: "object",
        required: ["sourceId", "name", "type", "location", "servedVillageIds", "monitoringStatus", "createdAt"],
        properties: {
          sourceId: { bsonType: "string", minLength: 1 },
          name: { bsonType: "string" },
          type: { enum: ["RIVER", "WETLAND", "STREAM", "GROUNDWATER"] },
          location: {
            bsonType: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { enum: ["Point"] },
              coordinates: {
                bsonType: "array",
                minItems: 2,
                maxItems: 2,
                items: { bsonType: "double" }
              }
            }
          },
          servedVillageIds: {
            bsonType: "array",
            items: { bsonType: "string" }
          },
          monitoringStatus: { enum: ["MONITORED_SIMULATED", "MONITORED_PHYSICAL", "UNMONITORED"] },
          createdAt: { bsonType: "date" }
        }
      }
    };

    // 3. sensorNodes
    const sensorNodesSchema = {
      $jsonSchema: {
        bsonType: "object",
        required: ["nodeId", "createdAt"],
        properties: {
          nodeId: { bsonType: "string", minLength: 1 },
          waterSourceId: { bsonType: "string", minLength: 1 },
          name: { bsonType: "string" },
          location: {
            bsonType: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { enum: ["Point"] },
              coordinates: {
                bsonType: "array",
                minItems: 2,
                maxItems: 2,
                items: { bsonType: "double" }
              }
            }
          },
          status: { bsonType: "string" },
          isSimulated: { bsonType: "bool" },
          createdAt: { bsonType: "date" },
          lastSeenAt: { bsonType: "date" }
        }
      }
    };

    // 4. waterReadings
    const waterReadingsSchema = {
      $jsonSchema: {
        bsonType: "object",
        required: ["nodeId", "timestamp", "location", "latitude", "longitude", "ph", "tds", "turbidity", "temperature"],
        properties: {
          nodeId: { bsonType: "string", minLength: 1 },
          timestamp: { bsonType: "date" },
          location: {
            bsonType: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { enum: ["Point"] },
              coordinates: { bsonType: "array", minItems: 2, maxItems: 2, items: { bsonType: "double" } }
            }
          },
          latitude: { bsonType: "double", minimum: -90, maximum: 90 },
          longitude: { bsonType: "double", minimum: -180, maximum: 180 },
          ph: { bsonType: "double", minimum: 0, maximum: 14 },
          tds: { bsonType: "double", minimum: 0 },
          turbidity: { bsonType: "double", minimum: 0 },
          temperature: { bsonType: "double", minimum: -50, maximum: 100 }
        }
      }
    };

    // 5. symptoms
    const symptomsSchema = {
      $jsonSchema: {
        bsonType: "object",
        required: ["villageId", "location", "latitude", "longitude", "timestamp", "feverCount", "diarrheaCount", "vomitingCount", "abdominalPainCount"],
        properties: {
          villageId: { bsonType: "string", minLength: 1 },
          location: {
            bsonType: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { enum: ["Point"] },
              coordinates: { bsonType: "array", minItems: 2, maxItems: 2, items: { bsonType: "double" } }
            }
          },
          latitude: { bsonType: "double", minimum: -90, maximum: 90 },
          longitude: { bsonType: "double", minimum: -180, maximum: 180 },
          timestamp: { bsonType: "date" },
          feverCount: { bsonType: "int", minimum: 0 },
          diarrheaCount: { bsonType: "int", minimum: 0 },
          vomitingCount: { bsonType: "int", minimum: 0 },
          abdominalPainCount: { bsonType: "int", minimum: 0 }
        }
      }
    };

    // 6. weather
    const weatherSchema = {
      $jsonSchema: {
        bsonType: "object",
        required: ["location", "latitude", "longitude", "temperature", "precipitation", "humidity", "source", "cachedAt", "timestamp"],
        properties: {
          location: {
            bsonType: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { enum: ["Point"] },
              coordinates: { bsonType: "array", minItems: 2, maxItems: 2, items: { bsonType: "double" } }
            }
          },
          latitude: { bsonType: "double", minimum: -90, maximum: 90 },
          longitude: { bsonType: "double", minimum: -180, maximum: 180 },
          temperature: { bsonType: "double" },
          precipitation: { bsonType: "double" },
          humidity: { bsonType: "double" },
          source: { bsonType: "string" },
          cachedAt: { bsonType: "date" },
          timestamp: { bsonType: "date" }
        }
      }
    };

    // 7. riskScores
    const riskScoresSchema = {
      $jsonSchema: {
        bsonType: "object",
        required: ["location", "latitude", "longitude", "timestamp", "riskScore", "riskLevel"],
        properties: {
          waterSourceId: { bsonType: "string", minLength: 1 },
          location: {
            bsonType: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { enum: ["Point"] },
              coordinates: { bsonType: "array", minItems: 2, maxItems: 2, items: { bsonType: "double" } }
            }
          },
          latitude: { bsonType: "double", minimum: -90, maximum: 90 },
          longitude: { bsonType: "double", minimum: -180, maximum: 180 },
          timestamp: { bsonType: "date" },
          riskScore: { bsonType: "double", minimum: 0, maximum: 1 },
          riskLevel: { enum: ["LOW", "MEDIUM", "HIGH"] },
          modelVersion: { bsonType: "string" },
          contributingFactors: { bsonType: "object" }
        }
      }
    };

    // 8. alerts
    const alertsSchema = {
      $jsonSchema: {
        bsonType: "object",
        required: ["location", "latitude", "longitude", "riskLevel", "riskScore", "timestamp", "message", "status"],
        properties: {
          location: {
            bsonType: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { enum: ["Point"] },
              coordinates: { bsonType: "array", minItems: 2, maxItems: 2, items: { bsonType: "double" } }
            }
          },
          latitude: { bsonType: "double", minimum: -90, maximum: 90 },
          longitude: { bsonType: "double", minimum: -180, maximum: 180 },
          riskLevel: { enum: ["MEDIUM", "HIGH"] },
          riskScore: { bsonType: "double", minimum: 0, maximum: 1 },
          timestamp: { bsonType: "date" },
          message: { bsonType: "string" },
          status: { enum: ["PENDING", "SENT", "FAILED"] },
          provider: { bsonType: "string" },
          providerMessageId: { bsonType: "string" },
          retryCount: { bsonType: "int", minimum: 0 },
          lastAttemptAt: { bsonType: "date" }
        }
      }
    };

    const collectionsSetup = [
      { name: "villages", validator: villagesSchema },
      { name: "waterSources", validator: waterSourcesSchema },
      { name: "sensorNodes", validator: sensorNodesSchema },
      { name: "waterReadings", validator: waterReadingsSchema },
      { name: "symptoms", validator: symptomsSchema },
      { name: "weather", validator: weatherSchema },
      { name: "riskScores", validator: riskScoresSchema },
      { name: "alerts", validator: alertsSchema }
    ];

    for (const setup of collectionsSetup) {
      try {
        await db.createCollection(setup.name, { validator: setup.validator });
        console.log(`Created collection: ${setup.name}`);
      } catch (err) {
        if (err.code === 48) { // NamespaceExists
          await db.command({ collMod: setup.name, validator: setup.validator });
          console.log(`Updated validator for existing collection: ${setup.name}`);
        } else {
          throw err;
        }
      }
    }

    // CREATE INDEXES
    console.log("Creating indexes...");
    const villagesColl = db.collection("villages");
    await villagesColl.createIndex({ villageId: 1 }, { unique: true });
    await villagesColl.createIndex({ primaryWaterSourceId: 1 });
    await villagesColl.createIndex({ location: "2dsphere" });
    console.log("Indexes created for villages");

    const waterSourcesColl = db.collection("waterSources");
    await waterSourcesColl.createIndex({ sourceId: 1 }, { unique: true });
    await waterSourcesColl.createIndex({ location: "2dsphere" });
    console.log("Indexes created for waterSources");

    const sensorNodesColl = db.collection("sensorNodes");
    await sensorNodesColl.createIndex({ nodeId: 1 }, { unique: true });
    await sensorNodesColl.createIndex({ waterSourceId: 1 });
    console.log("Indexes created for sensorNodes");

    const waterReadingsColl = db.collection("waterReadings");
    await waterReadingsColl.createIndex({ nodeId: 1, timestamp: 1 }, { unique: true });
    await waterReadingsColl.createIndex({ location: "2dsphere" });
    await waterReadingsColl.createIndex({ timestamp: -1 });
    console.log("Indexes created for waterReadings");

    const symptomsColl = db.collection("symptoms");
    await symptomsColl.createIndex({ villageId: 1, timestamp: -1 });
    await symptomsColl.createIndex({ location: "2dsphere", timestamp: -1 });
    console.log("Indexes created for symptoms");

    const weatherColl = db.collection("weather");
    await weatherColl.createIndex({ location: "2dsphere", timestamp: -1 });
    console.log("Indexes created for weather");

    const riskScoresColl = db.collection("riskScores");
    await riskScoresColl.createIndex({ waterSourceId: 1, timestamp: -1 });
    await riskScoresColl.createIndex({ location: "2dsphere", timestamp: -1 });
    console.log("Indexes created for riskScores");

    const alertsColl = db.collection("alerts");
    await alertsColl.createIndex({ status: 1, timestamp: -1 });
    await alertsColl.createIndex({ location: "2dsphere", timestamp: -1 });
    console.log("Indexes created for alerts");

    // VERIFICATION
    console.log("--- VERIFICATION ---");
    const collections = await db.listCollections().toArray();
    const collNames = collections.map(c => c.name);
    console.log("Existing collections:", collNames.join(", "));
    
    for (const setup of collectionsSetup) {
      if (!collNames.includes(setup.name)) {
        console.error(`ERROR: Collection ${setup.name} missing!`);
      } else {
        console.log(`OK: Collection ${setup.name} exists.`);
      }
      
      const collInfo = await db.listCollections({ name: setup.name }).toArray();
      if (collInfo.length > 0 && collInfo[0].options && collInfo[0].options.validator) {
        console.log(`OK: Validator is applied on ${setup.name}.`);
      } else {
        console.log(`WARNING: No validator found on ${setup.name}.`);
      }

      const indexes = await db.collection(setup.name).indexes();
      console.log(`Indexes on ${setup.name}:`, indexes.map(i => i.name).join(", "));
    }

    process.exitCode = 0;
  } catch (error) {
    console.error("FAILURE:", error);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
    process.exit();
  }
}

initDb();
