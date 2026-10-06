const express = require('express');
const pool = require('../db');
const { checkPassword } = require('../password');
const { createToken, readUser, requireLogin } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// One message for every failure, so attackers cannot tell which emails exist
const LOGIN_FAILED = 'Email or password is incorrect';

// LOGIN: POST /auth/login  { role: 'student' | 'admin', email, password }
router.post('/login', loginLimiter, async (req, res) => {
  const { role, email, password } = req.body || {};
  if (role !== 'student' && role !== 'admin') {
    return res.status(400).json({ error: 'Role must be student or admin' });
  }
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const table = role === 'admin' ? 'admins' : 'students';
    const [rows] = await pool.query(
      `SELECT * FROM ${table} WHERE email = ? AND password_hash IS NOT NULL`,
      [email.trim()]
    );
    const account = rows[0];
    // Checked even when there is no account, so both failures take the same time
    if (!(await checkPassword(password, account ? account.password_hash : null))) {
      return res.status(401).json({ error: LOGIN_FAILED });
    }

    const user = {
      id: account.id,
      role,
      name: role === 'admin' ? 'Admin' : account.name,
      email: account.email,
    };
    res.json({ token: createToken(user, account.password_hash), user });
  } catch (error) {
    console.error('POST /auth/login failed:', error.message);
    res.status(500).json({ error: 'Server error while logging in' });
  }
});

// WHO AM I: GET /auth/me -> the logged-in account (used when the page reloads)
router.get('/me', readUser, requireLogin, (req, res) => {
  res.json(req.user);
});

module.exports = router;
