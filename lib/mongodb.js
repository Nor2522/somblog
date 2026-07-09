const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'somblog';

// Vercel serverless functions can reuse the same container between
// invocations, so we cache the connection on `global` to avoid opening a
// new MongoDB connection on every request (which would exhaust the
// connection pool and slow things down).
let cached = global._somblogMongo;

if (!cached) {
  cached = global._somblogMongo = { db: null, promise: null };
}

async function connectToDatabase() {
  if (cached.db) {
    return { db: cached.db };
  }

  if (!uri) {
    throw new Error(
      'Missing MONGODB_URI environment variable. Set it in .env locally or in your Vercel project settings.'
    );
  }

  if (!cached.promise) {
    const client = new MongoClient(uri);
    cached.promise = client.connect().then((connectedClient) => {
      return connectedClient.db(dbName);
    });
  }

  cached.db = await cached.promise;
  return { db: cached.db };
}

module.exports = { connectToDatabase };
