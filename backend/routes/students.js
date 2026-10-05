const express = require('express');
const pool = require('../db');

const router = express.Router();

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
    const ageNumber = Number(age);
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

// Checks that the :id in the URL is a positive whole number.
function isValidId(id) {
  return Number.isInteger(Number(id)) && Number(id) > 0;
}

// READ: GET /students -> returns all students
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, age FROM students ORDER BY id ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /students failed:', error.message);
    res.status(500).json({ error: 'Server error while fetching students' });
  }
});

// CREATE: POST /students -> adds a new student
router.post('/', async (req, res) => {
  const body = req.body || {};
  const validationError = validateStudent(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO students (name, email, age) VALUES (?, ?, ?)',
      [body.name.trim(), body.email.trim(), cleanAge(body.age)]
    );
    const [rows] = await pool.query(
      'SELECT id, name, email, age FROM students WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    // MySQL error code for "this email already exists"
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('POST /students failed:', error.message);
    res.status(500).json({ error: 'Server error while adding student' });
  }
});

// UPDATE: PUT /students/:id -> changes an existing student
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid student id' });
  }

  const body = req.body || {};
  const validationError = validateStudent(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    await pool.query(
      'UPDATE students SET name = ?, email = ?, age = ? WHERE id = ?',
      [body.name.trim(), body.email.trim(), cleanAge(body.age), id]
    );
    const [rows] = await pool.query(
      'SELECT id, name, email, age FROM students WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('PUT /students/:id failed:', error.message);
    res.status(500).json({ error: 'Server error while updating student' });
  }
});

// DELETE: DELETE /students/:id -> removes a student
router.delete('/:id', async (req, res) => {
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