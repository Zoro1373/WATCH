const { spawn } = require('child_process');
const path = require('path');
const winston = require('winston');
const { getDb } = require('../db');
const { processAlerts } = require('../services/alertService');
const { Double } = require('mongodb');

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
    db = getDb();
  } catch (error) {
    logger.error('Database not connected in mlRunner — server must connect first', { error: error.message });
    return;
  }

  try {
    // 1. Gather Data for actively monitored water sources
    const waterSources = await db.collection('waterSources')
      .find({ monitoringStatus: "MONITORED_SIMULATED" })
      .toArray();

    if (waterSources.length === 0) {
      logger.info('No monitored water sources found. Skipping ML inference.');
      return;
    }

    const mlInputPayload = [];
    const sourceMetadataMap = [];
    const timestamp = new Date().toISOString();

    for (const source of waterSources) {
      // a. Resolve mapped sensor node
      const node = await db.collection('sensorNodes').findOne({ waterSourceId: source.sourceId });
      if (!node) {
        logger.info(`No sensor node mapped to water source ${source.sourceId}. Skipping.`);
        continue;
      }

      // b. Get latest telemetry for this sensor node
      const latestWater = await db.collection('waterReadings')
        .find({ nodeId: node.nodeId })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();

      if (latestWater.length === 0) {
        logger.info(`No telemetry found for node ${node.nodeId} (source: ${source.sourceId}). Skipping.`);
        continue;
      }
      const waterDoc = latestWater[0];

      // c. Resolve linked villages and aggregate community symptoms
      const linkedVillages = await db.collection('villages')
        .find({ primaryWaterSourceId: source.sourceId })
        .toArray();

      let totalFever = 0;
      let totalDiarrhea = 0;
      let totalVomiting = 0;
      let totalPain = 0;
      let hasSymptoms = false;

      for (const vil of linkedVillages) {
        const latestSymptom = await db.collection('symptoms')
          .find({ villageId: vil.villageId })
          .sort({ timestamp: -1 })
          .limit(1)
          .toArray();

        if (latestSymptom.length > 0) {
          hasSymptoms = true;
          totalFever += latestSymptom[0].feverCount;
          totalDiarrhea += latestSymptom[0].diarrheaCount;
          totalVomiting += latestSymptom[0].vomitingCount;
          totalPain += latestSymptom[0].abdominalPainCount;
        }
      }

      // d. Retrieve regional weather for the water source reach
      const radiusInRadians = 50 / 6378.1;
      const latestWeather = await db.collection('weather')
        .find({
          location: {
            $geoWithin: {
              $centerSphere: [source.location.coordinates, radiusInRadians]
            }
          }
        })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();

      // e. Construct the 11-feature observation payload for ML
      const payloadObj = {
        waterSourceId: source.sourceId,
        location: {
          latitude: source.location.coordinates[1],
          longitude: source.location.coordinates[0]
        },
        timestamp: timestamp,
        water: {
          ph: waterDoc.ph,
          tds: waterDoc.tds,
          turbidity: waterDoc.turbidity,
          temperature: waterDoc.temperature
        },
        symptoms: hasSymptoms ? {
          feverCount: totalFever,
          diarrheaCount: totalDiarrhea,
          vomitingCount: totalVomiting,
          abdominalPainCount: totalPain
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
      sourceMetadataMap.push({
        waterSourceId: source.sourceId,
        location: source.location
      });
    }

    if (mlInputPayload.length === 0) {
      logger.info('No valid telemetry found for any monitored water sources. Skipping ML inference.');
      return;
    }

    // 2. Spawn Python ML Process (Frozen Isolation Forest Pipeline)
    const projectRoot = path.join(__dirname, '..', '..');
    const pythonBin = process.env.PYTHON_BIN || 'python';
    const pythonArgs = ['-m', 'ml'];
    const pythonEnv = { ...process.env, PYTHONPATH: projectRoot };

    logger.info(`Spawning Python process: ${pythonBin} ${pythonArgs.join(' ')}`);

    const pythonProcess = spawn(pythonBin, pythonArgs, {
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

    // Write input JSON to stdin and close
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
      logger.warn('Python ML process diagnostics/warnings', { stderr: stderrData });
    }

    // 3. Parse and Persist Output into riskScores
    let mlResults;
    try {
      mlResults = JSON.parse(stdoutData);
    } catch (parseError) {
      logger.error('Failed to parse ML JSON output', { error: parseError.message, stdout: stdoutData });
      return;
    }

    if (!Array.isArray(mlResults)) {
      mlResults = [mlResults];
    }

    let insertedCount = 0;

    for (let i = 0; i < mlResults.length; i++) {
      const result = mlResults[i];
      const meta = sourceMetadataMap[i] || {};
      const waterSourceId = result.waterSourceId || meta.waterSourceId;

      if (typeof result.riskScore !== 'number' || !result.riskLevel) {
        logger.error('Malformed ML output skipped', { result });
        continue;
      }

      const doc = {
        waterSourceId: waterSourceId,
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
