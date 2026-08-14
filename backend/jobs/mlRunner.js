const { spawn } = require('child_process');
const path = require('path');
const winston = require('winston');
const { connectToDatabase } = require('../db');
const { processAlerts } = require('../services/alertService');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

async function runMLInference() {
  logger.info('Starting ML Inference pipeline run');
  let db;
  try {
    db = await connectToDatabase();
  } catch (error) {
    logger.error('Failed to connect to database in mlRunner', { error: error.message });
    return;
  }

  try {
    // 1. Gather Data for active locations
    // We assume any node in sensorNodes is an active location.
    const nodes = await db.collection('sensorNodes').find({}).toArray();
    if (nodes.length === 0) {
      logger.info('No sensor nodes registered. Skipping ML inference.');
      return;
    }

    const mlInputPayload = [];
    const timestamp = new Date().toISOString();

    for (const node of nodes) {
      // Get the latest water reading for this node (within last hour per AI_ML_SPEC.md or just latest)
      const latestWater = await db.collection('waterReadings')
        .find({ nodeId: node.nodeId })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();

      if (latestWater.length === 0) {
        continue; // No data to infer on
      }
      const waterDoc = latestWater[0];
      const locationCoords = waterDoc.location.coordinates; // [longitude, latitude]
      
      const latestSymptom = await db.collection('symptoms')
        .find({ "location.coordinates": locationCoords })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();

      const latestWeather = await db.collection('weather')
        .find({ "location.coordinates": locationCoords })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();

      const payloadObj = {
        location: {
          latitude: locationCoords[1], // lat is index 1
          longitude: locationCoords[0] // lon is index 0
        },
        timestamp: timestamp,
        water: {
          ph: waterDoc.ph,
          tds: waterDoc.tds,
          turbidity: waterDoc.turbidity,
          temperature: waterDoc.temperature
        },
        symptoms: latestSymptom.length > 0 ? {
          feverCount: latestSymptom[0].feverCount,
          diarrheaCount: latestSymptom[0].diarrheaCount,
          vomitingCount: latestSymptom[0].vomitingCount,
          abdominalPainCount: latestSymptom[0].abdominalPainCount
        } : {
          feverCount: null,
          diarrheaCount: null,
          vomitingCount: null,
          abdominalPainCount: null
        },
        weather: latestWeather.length > 0 ? {
          temperature: latestWeather[0].temperature,
          precipitation: latestWeather[0].precipitation,
          humidity: latestWeather[0].humidity
        } : {
          temperature: null,
          precipitation: null,
          humidity: null
        }
      };
      
      mlInputPayload.push(payloadObj);
    }

    if (mlInputPayload.length === 0) {
      logger.info('No water reading data found for any locations. Skipping ML inference.');
      return;
    }

    // 2. Spawn Python ML Process
    const projectRoot = path.join(__dirname, '..', '..');
    const pythonArgs = ['-m', 'ml'];
    
    // Setup environment for the child process to inherit process.env (like MODEL_ARTIFACT_PATH if set)
    const pythonEnv = { ...process.env, PYTHONPATH: projectRoot };

    logger.info(`Spawning Python process: python ${pythonArgs.join(' ')}`);

    const pythonProcess = spawn('python', pythonArgs, {
      cwd: projectRoot,
      env: pythonEnv,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    // Write input JSON to stdin and close it
    pythonProcess.stdin.write(JSON.stringify(mlInputPayload));
    pythonProcess.stdin.end();

    const exitCode = await new Promise((resolve) => {
      pythonProcess.on('close', resolve);
    });

    if (exitCode !== 0) {
      logger.error('Python ML process failed with non-zero exit code', { exitCode, stderr: stderrData });
      return;
    }

    if (stderrData.trim()) {
      logger.warn('Python ML process generated diagnostics/warnings', { stderr: stderrData });
    }

    // 3. Parse and Persist Output
    let mlResults;
    try {
      mlResults = JSON.parse(stdoutData);
    } catch (parseError) {
      logger.error('Failed to parse ML JSON output', { error: parseError.message, stdout: stdoutData });
      return;
    }

    if (!Array.isArray(mlResults)) {
      mlResults = [mlResults]; // ensure it's an array for batch processing
    }

    let insertedCount = 0;
    const { Double } = require('mongodb');

    for (const result of mlResults) {
      // Validate structure to avoid DB errors
      if (typeof result.riskScore !== 'number' || !result.riskLevel) {
        logger.error('Malformed ML output skipped', { result });
        continue;
      }

      // Convert standard JSON response to Mongo GeoJSON format as per schema
      const doc = {
        location: {
          type: "Point",
          coordinates: [new Double(result.location.longitude), new Double(result.location.latitude)]
        },
        latitude: new Double(result.location.latitude),
        longitude: new Double(result.location.longitude),
        timestamp: new Date(result.timestamp || timestamp),
        riskScore: new Double(result.riskScore),
        riskLevel: result.riskLevel
      };
      
      if (result.modelVersion) doc.modelVersion = result.modelVersion;
      if (result.contributingFactors) doc.contributingFactors = result.contributingFactors;

      await db.collection('riskScores').insertOne(doc);
      insertedCount++;
    }

    logger.info(`ML Inference completed successfully. Persisted ${insertedCount} risk scores.`);

    // 4. Trigger Alerts sequentially
    logger.info('Triggering alertService after ML inference');
    await processAlerts();

  } catch (err) {
    logger.error('Unexpected error during ML inference job', { error: err.message, stack: err.stack });
  }
}

module.exports = { runMLInference };
