require('dotenv').config();
const express = require('express');
const authMiddleware = require('./middleware/auth');

const app = express();
app.use('/api', authMiddleware);

app.get('/api/test', (req, res) => {
  res.status(200).json({ success: true, message: 'Authenticated' });
});

const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

  try {
    // Test 1: Missing X-API-KEY
    console.log('\\n--- Test 1: Missing X-API-KEY ---');
    let res1 = await fetch(`http://localhost:${port}/api/test`);
    let data1 = await res1.json();
    console.log(`Status: ${res1.status}`);
    console.log(`Body: ${JSON.stringify(data1, null, 2)}`);

    // Test 2: Invalid X-API-KEY
    console.log('\\n--- Test 2: Invalid X-API-KEY ---');
    let res2 = await fetch(`http://localhost:${port}/api/test`, {
      headers: { 'X-API-KEY': 'invalid_random_key' }
    });
    let data2 = await res2.json();
    console.log(`Status: ${res2.status}`);
    console.log(`Body: ${JSON.stringify(data2, null, 2)}`);

    // Test 3: Valid X-API-KEY (using the frontend key configured in .env)
    console.log('\\n--- Test 3: Valid X-API-KEY ---');
    const validKey = process.env.API_KEY_FRONTEND;
    let res3 = await fetch(`http://localhost:${port}/api/test`, {
      headers: { 'X-API-KEY': validKey }
    });
    let data3 = await res3.json();
    console.log(`Status: ${res3.status}`);
    console.log(`Body: ${JSON.stringify(data3, null, 2)}`);

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    server.close();
  }
});
