const bcrypt = require('bcryptjs');

// bcrypt only uses the first 72 bytes of a password, so longer ones are rejected
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
// Higher is slower to crack but also slower to log in; 10 is a common choice
const HASH_ROUNDS = 10;

// Returns an error message, or null if the password is acceptable
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return `Password is too long (the limit is ${MAX_PASSWORD_BYTES} bytes; accented letters and emoji use more than one)`;
  }
  return null;
}

function hashPassword(password) {
  return bcrypt.hash(password, HASH_ROUNDS);
}

// Compared against when no account matches, so a missing account takes as long to
// reject as a wrong password (otherwise response time reveals which emails exist)
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', HASH_ROUNDS);

// Pass a null hash when there is no account: it still does the slow comparison and returns false
async function checkPassword(password, hash) {
  const matches = await bcrypt.compare(password, hash || DUMMY_HASH);
  return Boolean(hash) && matches;
}

module.exports = { validatePassword, hashPassword, checkPassword };
