const bcrypt = require('bcryptjs');
const { signToken, buildAuthCookie } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminUsername || !adminPasswordHash) {
      console.error('ADMIN_USERNAME or ADMIN_PASSWORD_HASH is not configured');
      return res.status(500).json({ error: 'Admin login is not configured on the server' });
    }

    if (username !== adminUsername) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = await bcrypt.compare(password, adminPasswordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signToken({ role: 'admin', username });
    res.setHeader('Set-Cookie', buildAuthCookie(token));
    return res.status(200).json({ success: true, username });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
