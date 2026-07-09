const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'somblog_token';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'Missing JWT_SECRET environment variable. Set it in .env locally or in your Vercel project settings.'
    );
  }
  return secret;
}

function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch (err) {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;

  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  });

  return cookies;
}

// Returns the decoded admin token payload if the request has a valid,
// unexpired admin session cookie — otherwise null.
function getAdminFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;

  return decoded;
}

function buildAuthCookie(token) {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${60 * 60 * 24 * 7}`,
    'SameSite=Strict',
  ];
  // Secure cookies are only sent over HTTPS. Vercel serves everything over
  // HTTPS in production, but locally (http://localhost) it would block the
  // cookie from being set, so we only add it in production.
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}

function buildClearCookie() {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [`${COOKIE_NAME}=`, 'HttpOnly', 'Path=/', 'Max-Age=0', 'SameSite=Strict'];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}

module.exports = {
  COOKIE_NAME,
  signToken,
  verifyToken,
  parseCookies,
  getAdminFromRequest,
  buildAuthCookie,
  buildClearCookie,
};
