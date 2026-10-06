const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// How long a login lasts before the user must log in again
const TOKEN_LIFETIME = '1d';

// A short fingerprint of the password hash. Stored in the token, so changing the
// password (or an admin reset) makes every older token stop working.
function passwordStamp(passwordHash) {
  return crypto.createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

// Creates a signed token that proves who the user is
function createToken(user, passwordHash) {
  return jwt.sign(
    { id: user.id, role: user.role, pv: passwordStamp(passwordHash) },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_LIFETIME }
  );
}

// Looks up the account a token belongs to, so deleted accounts lose access, and
// tokens issued before a password change stop working.
// Returns { id, role, name, email } or null if the token is no longer valid.
async function findAccount(id, role, stamp) {
  let account = null;
  let passwordHash;
  if (role === 'admin') {
    const [rows] = await pool.query('SELECT id, email, password_hash FROM admins WHERE id = ?', [id]);
    if (rows.length) {
      account = { id: rows[0].id, role, name: 'Admin', email: rows[0].email };
      passwordHash = rows[0].password_hash;
    }
  } else if (role === 'student') {
    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash FROM students WHERE id = ? AND password_hash IS NOT NULL',
      [id]
    );
    if (rows.length) {
      account = { id: rows[0].id, name: rows[0].name, email: rows[0].email, role };
      passwordHash = rows[0].password_hash;
    }
  }
  if (!account || stamp !== passwordStamp(passwordHash)) {
    return null;
  }
  return account;
}

// Reads the "Authorization: Bearer <token>" header if there is one.
// Sets req.user to the logged-in account, or leaves it undefined for visitors.
// A token that is present but invalid or expired is rejected with 401.
async function readUser(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return next();
  }

  let payload;
  try {
    payload = jwt.verify(header.slice('Bearer '.length), process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }

  try {
    const account = await findAccount(payload.id, payload.role, payload.pv);
    if (!account) {
      return res.status(401).json({ error: 'Your login is no longer valid. Please log in again.' });
    }
    req.user = account;
    next();
  } catch (error) {
    console.error('Auth lookup failed:', error.message);
    res.status(500).json({ error: 'Server error while checking your login' });
  }
}

// Use after readUser: only logged-in users (students or admins) may continue
function requireLogin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Please log in to continue' });
  }
  next();
}

// Use after readUser: only admins may continue
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Please log in to continue' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only an admin can do this' });
  }
  next();
}

module.exports = { createToken, findAccount, readUser, requireLogin, requireAdmin };
