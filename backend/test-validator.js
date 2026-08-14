const express = require('express');
const { validateBody, validateParams } = require('./middleware/validator');
const { sensorSchema, symptomSchema, locationParamSchema } = require('./schemas');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Dummy routes to test validation middleware
app.post('/api/sensor', validateBody(sensorSchema), (req, res) => res.status(201).json({ success: true, message: 'Sensor reading accepted' }));
app.post('/api/symptom', validateBody(symptomSchema), (req, res) => res.status(201).json({ success: true, message: 'Symptom report accepted' }));
app.get('/api/risk/:location', validateParams(locationParamSchema), (req, res) => res.status(200).json({ success: true, data: { riskScore: 0.5 } }));

const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log(`Test server running on port ${port}\\n`);

  async function runTest(name, url, method, body = null) {
    console.log(`--- Test: ${name} ---`);
    const options = { method, headers: {} };
    if (body) {
      options.body = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`http://localhost:${port}${url}`, options);
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${JSON.stringify(data, null, 2)}\\n`);
  }

  try {
    await runTest("1. Valid sensor payload", "/api/sensor", "POST", {
      nodeId: "WATER_001", timestamp: "2026-08-12T12:30:00Z", latitude: 8.1833, longitude: 77.4119,
      ph: 6.8, tds: 420, turbidity: 8.4, temperature: 28.2
    });

    await runTest("2. Invalid sensor payload with pH outside documented range", "/api/sensor", "POST", {
      nodeId: "WATER_001", timestamp: "2026-08-12T12:30:00Z", latitude: 8.1833, longitude: 77.4119,
      ph: 15.0, tds: 420, turbidity: 8.4, temperature: 28.2
    });

    await runTest("3. Missing required fields (temperature missing)", "/api/sensor", "POST", {
      nodeId: "WATER_001", timestamp: "2026-08-12T12:30:00Z", latitude: 8.1833, longitude: 77.4119,
      ph: 6.8, tds: 420, turbidity: 8.4
    });

    await runTest("4. Invalid data types (tds string)", "/api/sensor", "POST", {
      nodeId: "WATER_001", timestamp: "2026-08-12T12:30:00Z", latitude: 8.1833, longitude: 77.4119,
      ph: 6.8, tds: "not_a_number", turbidity: 8.4, temperature: 28.2
    });

    await runTest("5. Invalid timestamp format", "/api/sensor", "POST", {
      nodeId: "WATER_001", timestamp: "not-a-date", latitude: 8.1833, longitude: 77.4119,
      ph: 6.8, tds: 420, turbidity: 8.4, temperature: 28.2
    });

    await runTest("6. Invalid latitude/longitude", "/api/sensor", "POST", {
      nodeId: "WATER_001", timestamp: "2026-08-12T12:30:00Z", latitude: 95.0, longitude: 77.4119,
      ph: 6.8, tds: 420, turbidity: 8.4, temperature: 28.2
    });

    await runTest("7. Valid symptom payload", "/api/symptom", "POST", {
      location: { latitude: 8.1833, longitude: 77.4119 },
      timestamp: "2026-08-12T12:00:00Z",
      feverCount: 12, diarrheaCount: 5, vomitingCount: 3, abdominalPainCount: 4
    });

    await runTest("8. Invalid symptom counts (-5)", "/api/symptom", "POST", {
      location: { latitude: 8.1833, longitude: 77.4119 },
      timestamp: "2026-08-12T12:00:00Z",
      feverCount: 12, diarrheaCount: -5, vomitingCount: 3, abdominalPainCount: 4
    });

    await runTest("9a. Invalid URL location parameter (lat too high)", "/api/risk/95.0,77.4119", "GET");
    await runTest("9b. Invalid URL location parameter (bad format)", "/api/risk/invalid_location", "GET");

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    server.close();
  }
});
