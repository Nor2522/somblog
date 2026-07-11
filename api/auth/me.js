const { getAdminFromRequest } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = getAdminFromRequest(req);

  if (!admin) {
    return res.status(401).json({ authenticated: false });
  }

  return res.status(200).json({ authenticated: true, username: admin.username });
};
