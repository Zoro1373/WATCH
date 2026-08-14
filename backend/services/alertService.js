const { getDb } = require('../db');
const { Double } = require('mongodb');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

async function sendTwilioSms(message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const toNumber = process.env.TWILIO_TO_NUMBER;

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    throw new Error('Twilio credentials not configured in environment variables');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({
    To: toNumber,
    From: fromNumber,
    Body: message
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Twilio API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.sid;
}

async function processAlerts() {
  logger.info('Starting alert generation and delivery job');
  const db = getDb();
  
  try {
    // 1. Evaluate riskScores from the past 24 hours to generate alerts natively.
    // The ML script alone calculates risk. We simply consume riskLevel == MEDIUM or HIGH.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRisks = await db.collection('riskScores').find({
      riskLevel: { $in: ['MEDIUM', 'HIGH'] },
      timestamp: { $gte: oneDayAgo }
    }).toArray();

    for (const risk of recentRisks) {
      // Check idempotency: does this exact alert event already exist?
      const existingAlert = await db.collection('alerts').findOne({
        "location.coordinates": risk.location.coordinates,
        timestamp: risk.timestamp
      });

      if (!existingAlert) {
        // Enforce PROJECT_ARCHITECTURE rule: "If new risk level >= MEDIUM and differs from previous"
        const previousRisk = await db.collection('riskScores')
          .find({
            "location.coordinates": risk.location.coordinates,
            timestamp: { $lt: risk.timestamp }
          })
          .sort({ timestamp: -1 })
          .limit(1)
          .toArray();

        let shouldAlert = false;
        if (previousRisk.length === 0) {
          shouldAlert = true; // Baseline establishment
        } else if (previousRisk[0].riskLevel !== risk.riskLevel) {
          shouldAlert = true; // Risk level changed significantly
        }

        if (shouldAlert) {
          const newAlert = {
            location: risk.location,
            latitude: risk.latitude, // Double mapping
            longitude: risk.longitude, // Double mapping
            riskLevel: risk.riskLevel,
            riskScore: risk.riskScore,
            timestamp: risk.timestamp,
            message: `Water quality risk ${risk.riskLevel} at ${risk.latitude},${risk.longitude}.`,
            status: "PENDING",
            provider: "Twilio",
            retryCount: 0
          };
          await db.collection('alerts').insertOne(newAlert);
          logger.info(`Created new PENDING alert for location ${risk.latitude},${risk.longitude}`);
        }
      }
    }

    // 2. Deliver pending alerts (or retry failed ones up to 3 times)
    const pendingAlerts = await db.collection('alerts').find({
      status: { $in: ["PENDING", "FAILED"] },
      retryCount: { $lt: 3 }
    }).toArray();

    for (const alert of pendingAlerts) {
      const attemptTime = new Date();
      try {
        const providerMessageId = await sendTwilioSms(alert.message);
        
        await db.collection('alerts').updateOne(
          { _id: alert._id },
          { 
            $set: { 
              status: "SENT", 
              providerMessageId,
              lastAttemptAt: attemptTime
            } 
          }
        );
        logger.info(`Alert ${alert._id} SENT successfully via Twilio (SID: ${providerMessageId})`);
      } catch (err) {
        const newRetryCount = (alert.retryCount || 0) + 1;
        
        await db.collection('alerts').updateOne(
          { _id: alert._id },
          { 
            $set: { 
              status: "FAILED", 
              retryCount: newRetryCount,
              lastAttemptAt: attemptTime
            } 
          }
        );
        logger.error(`Alert ${alert._id} FAILED to send. Retry count: ${newRetryCount}. Error: HTTP provider unreachable.`); // Error masked to not expose secrets/url paths
      }
    }

  } catch (err) {
    logger.error(`Alert generation job encountered a critical error: ${err.message}`);
  }
}

module.exports = { processAlerts, sendTwilioSms };
