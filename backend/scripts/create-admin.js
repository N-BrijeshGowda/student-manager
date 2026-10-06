// Creates an admin account, or resets the password if the email already exists.
// Usage (from the backend folder): npm run create-admin -- admin@example.com MyPassword123
const pool = require('../db');
const { validatePassword, hashPassword } = require('../password');

async function createAdmin() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run create-admin -- <email> <password>');
    process.exit(1);
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    console.error(passwordError);
    process.exit(1);
  }

  try {
    const passwordHash = await hashPassword(password);
    await pool.query(
      `INSERT INTO admins (email, password_hash) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      [email.trim(), passwordHash]
    );
    console.log(`Admin ready: ${email.trim()}`);
  } catch (error) {
    console.error('Could not create admin:', error.message);
    console.error('Is MySQL running, and did you run schema.sql (the admins table)?');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createAdmin();
