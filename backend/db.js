const { MongoClient } = require('mongodb');

let dbInstance = null;
let clientInstance = null;

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE;

  if (!uri || !dbName) {
    throw new Error("MONGODB_URI and MONGODB_DATABASE must be defined in environment variables");
  }

  const client = new MongoClient(uri);
  
  await client.connect();
  clientInstance = client;
  dbInstance = client.db(dbName);
  
  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    throw new Error("Database not connected. Call connectToDatabase first.");
  }
  return dbInstance;
}

async function closeDatabase() {
  if (clientInstance) {
    await clientInstance.close();
    clientInstance = null;
    dbInstance = null;
  }
}

module.exports = { connectToDatabase, getDb, closeDatabase };
