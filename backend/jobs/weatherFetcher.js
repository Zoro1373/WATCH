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

async function fetchWeatherData(lat, lon) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENWEATHER_API_KEY is not defined in environment variables');
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenWeatherMap API returned status ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.main == null || data.main.temp == null) {
    throw new Error('Malformed response from OpenWeatherMap API: Missing main.temp');
  }

  const temperature = data.main.temp;
  const humidity = data.main.humidity;
  let precipitation = 0.0;
  if (data.rain && data.rain['1h']) {
    precipitation = data.rain['1h'];
  } else if (data.snow && data.snow['1h']) {
    precipitation = data.snow['1h'];
  }

  return { temperature, humidity, precipitation };
}

async function runWeatherJob() {
  logger.info('Starting hourly weather fetch job');
  try {
    const db = getDb();
    
    // Determine target locations from the registry of sensorNodes
    const nodes = await db.collection('sensorNodes').find({ location: { $exists: true } }).toArray();
    
    // Deduplicate by coordinate pair (rounding to 4 decimal places approx ~11m)
    const uniqueLocations = new Map();
    for (const node of nodes) {
      if (node.location && node.location.coordinates) {
        const [lon, lat] = node.location.coordinates;
        const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        if (!uniqueLocations.has(key)) {
          uniqueLocations.set(key, { lat, lon });
        }
      }
    }

    if (uniqueLocations.size === 0) {
      logger.info('No sensor nodes with locations found. Skipping weather fetch.');
      return;
    }

    const timestamp = new Date();

    for (const { lat, lon } of uniqueLocations.values()) {
      try {
        const weatherData = await fetchWeatherData(lat, lon);
        
        const weatherDoc = {
          location: {
            type: "Point",
            coordinates: [new Double(lon), new Double(lat)]
          },
          latitude: new Double(lat),
          longitude: new Double(lon),
          temperature: new Double(weatherData.temperature),
          precipitation: new Double(weatherData.precipitation),
          humidity: new Double(weatherData.humidity),
          source: "OpenWeatherMap",
          cachedAt: timestamp,
          timestamp: timestamp
        };

        await db.collection('weather').insertOne(weatherDoc);
        logger.info(`Successfully fetched and stored weather for location ${lat},${lon}`);
      } catch (err) {
        logger.error(`Failed to fetch/store weather for location ${lat},${lon}: ${err.message}`);
      }
    }

    logger.info('Finished hourly weather fetch job');
  } catch (err) {
    logger.error(`Weather job encountered a critical error: ${err.message}`);
  }
}

module.exports = { runWeatherJob };
