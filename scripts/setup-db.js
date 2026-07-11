// Run once after you set MONGODB_URI, to create the indexes SomBlog needs:
//   npm run setup-db
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'somblog';

  if (!uri) {
    console.error('Missing MONGODB_URI. Add it to your .env file first.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const posts = db.collection('posts');

  await posts.createIndex({ slug: 1 }, { unique: true });
  await posts.createIndex({ title: 'text', excerpt: 'text', content: 'text' });
  await posts.createIndex({ createdAt: -1 });

  console.log('Indexes created on the "posts" collection in database "%s".', dbName);
  await client.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
