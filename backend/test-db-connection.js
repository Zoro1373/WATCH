require('dotenv').config();
const { connectToDatabase, closeDatabase } = require('./db');

async function testConnection() {
  console.log('Attempting genuine MongoDB connection...');
  try {
    await connectToDatabase();
    console.log('SUCCESS: Connected to MongoDB Atlas.');
    process.exitCode = 0;
  } catch (error) {
    console.error('FAILURE: Could not connect to MongoDB.');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
    process.exit();
  }
}

testConnection();
