const express = require('express');
const pool = require('../db');
const { validatePassword, hashPassword, checkPassword } = require('../password');
const { readUser, requireLogin, requireAdmin, createToken } = require('../middleware/auth');
const { signupLimiter, profileEditLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Every route below knows who is calling (req.user), or that it is a visitor
router.use(readUser);

// Limits that match the database columns
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 100;
const MIN_AGE = 1;
const MAX_AGE = 120;

// Simple email pattern: text@text.text
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Checks the student data and returns an error message, or null if all is fine.
function validateStudent({ name, email, age }) {
  if (typeof name !== 'string' || name.trim() === '') {
    return 'Name is required';
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return `Name must be at most ${MAX_NAME_LENGTH} characters`;
  }
  if (typeof email !== 'string' || email.trim() === '') {
    return 'Email is required';
  }
  if (email.trim().length > MAX_EMAIL_LENGTH) {
    return `Email must be at most ${MAX_EMAIL_LENGTH} characters`;
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    return 'Email format is not valid';
  }
  if (age !== undefined && age !== null && age !== '') {
    const ageNumber = typeof age === 'number' || typeof age === 'string' ? Number(age) : NaN;
    if (!Number.isInteger(ageNumber) || ageNumber < MIN_AGE || ageNumber > MAX_AGE) {
      return `Age must be a whole number between ${MIN_AGE} and ${MAX_AGE}`;
    }
  }
  return null;
}

// Turns an empty age into null so MySQL stores it as "no value".
function cleanAge(age) {
  if (age === undefined || age === null || age === '') {
    return null;
  }
  return Number(age);
}

// Checks that the :id in the URL is a positive whole number (digits only).
function isValidId(id) {
  return /^[1-9]\d*$/.test(id);
}

// True when the request body includes a password the caller wants to set
function hasPassword(body) {
  return body.password !== undefined && body.password !== null && body.password !== '';
}

// Admins also see whether each student can log in; students never see password data
function columnsFor(user) {
  const columns = 'id, name, email, age';
  return user && user.role === 'admin'
    ? `${columns}, password_hash IS NOT NULL AS can_login`
    : columns;
}

// Turns MySQL's 0/1 into true/false for the can_login column
function formatStudent(row) {
  return 'can_login' in row ? { ...row, can_login: Boolean(row.can_login) } : row;
}

// READ: GET /students -> returns all students (logged-in students and admins only)
router.get('/', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${columnsFor(req.user)} FROM students ORDER BY id ASC`
    );
    res.json(rows.map(formatStudent));
  } catch (error) {
    console.error('GET /students failed:', error.message);
    res.status(500).json({ error: 'Server error while fetching students' });
  }
});

// CREATE: POST /students -> adds a new student
//   Visitors add themselves and must choose a password so they can log in later.
//   Admins can add anyone; the password is optional for them.
//   Logged-in students already have a profile, so they edit it instead.
router.post('/', signupLimiter, async (req, res) => {
  if (req.user && req.user.role === 'student') {
    return res.status(403).json({ error: 'You already have a profile. Edit it instead.' });
  }

  const body = req.body || {};
  const validationError = validateStudent(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const isAdmin = Boolean(req.user);
  if (!isAdmin || hasPassword(body)) {
    const passwordError = validatePassword(body.password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }
  }

  try {
    const passwordHash = hasPassword(body) ? await hashPassword(body.password) : null;
    const [result] = await pool.query(
      'INSERT INTO students (name, email, age, password_hash) VALUES (?, ?, ?, ?)',
      [body.name.trim(), body.email.trim(), cleanAge(body.age), passwordHash]
    );
    const [rows] = await pool.query(
      `SELECT ${columnsFor(req.user)} FROM students WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json(formatStudent(rows[0]));
  } catch (error) {
    // MySQL error code for "this email already exists"
    if (error.code === 'ER_DUP_ENTRY') {
      // Visitors get a vague answer so the form cannot be used to find out who is registered
      return res.status(400).json({
        error: isAdmin
          ? 'Email already exists'
          : 'Could not register with these details. If you already have an account, please log in.',
      });
    }
    console.error('POST /students failed:', error.message);
    res.status(500).json({ error: 'Server error while adding student' });
  }
});

// UPDATE: PUT /students/:id -> changes an existing student
//   Admins can edit anyone; students can edit only their own profile.
//   Sending a password is optional and changes it.
//   Students must also send their currentPassword to change their password or email.
router.put('/:id', requireLogin, profileEditLimiter, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid student id' });
  }
  if (req.user.role === 'student' && req.user.id !== Number(id)) {
    return res.status(403).json({ error: 'You can only edit your own details' });
  }

  const body = req.body || {};
  const validationError = validateStudent(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  if (hasPassword(body)) {
    const passwordError = validatePassword(body.password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }
  }

  try {
    const [existing] = await pool.query(
      'SELECT id, email, password_hash FROM students WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // A stolen session alone must not be enough to take over an account
    const isSelf = req.user.role === 'student';
    const emailChanged = body.email.trim() !== existing[0].email;
    if (isSelf && (hasPassword(body) || emailChanged)) {
      const currentOk =
        typeof body.currentPassword === 'string' &&
        (await checkPassword(body.currentPassword, existing[0].password_hash));
      if (!currentOk) {
        return res
          .status(403)
          .json({ error: 'Enter your current password to change your email or password' });
      }
    }

    const values = [body.name.trim(), body.email.trim(), cleanAge(body.age)];
    let sql = 'UPDATE students SET name = ?, email = ?, age = ?';
    let newHash = existing[0].password_hash;
    if (hasPassword(body)) {
      newHash = await hashPassword(body.password);
      sql += ', password_hash = ?';
      values.push(newHash);
    }
    await pool.query(`${sql} WHERE id = ?`, [...values, id]);

    const [rows] = await pool.query(
      `SELECT ${columnsFor(req.user)} FROM students WHERE id = ?`,
      [id]
    );
    const student = formatStudent(rows[0]);
    // Changing your own password ends your old sessions, so hand back a fresh token
    if (isSelf && hasPassword(body)) {
      return res.json({ ...student, token: createToken({ id: student.id, role: 'student' }, newHash) });
    }
    res.json(student);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('PUT /students/:id failed:', error.message);
    res.status(500).json({ error: 'Server error while updating student' });
  }
});

// DELETE: DELETE /students/:id -> removes a student (admins only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid student id' });
  }

  try {
    const [result] = await pool.query('DELETE FROM students WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('DELETE /students/:id failed:', error.message);
    res.status(500).json({ error: 'Server error while deleting student' });
  }
});

module.exports = router;
