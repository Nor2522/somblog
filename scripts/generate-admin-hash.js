// Usage: node scripts/generate-admin-hash.js "your-real-password"
// Copy the printed hash into ADMIN_PASSWORD_HASH (never store the plain password).
const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/generate-admin-hash.js "your-password"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\nADMIN_PASSWORD_HASH=' + hash + '\n');
console.log('Copy the line above into your .env file and into Vercel > Project > Settings > Environment Variables.');
