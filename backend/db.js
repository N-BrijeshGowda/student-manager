// Loads values from the .env file
require('dotenv').config();
const mysql = require('mysql2/promise');

// A pool keeps several database connections open and reuses them,
// which is faster than opening a new connection for every request.
const MAX_CONNECTIONS = 10;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: MAX_CONNECTIONS,
});

module.exports = pool;