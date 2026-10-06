require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const studentRoutes = require('./routes/students');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Behind a reverse proxy, set TRUST_PROXY=1 so rate limits use the visitor's real address
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}

// Allow only our React app to call this API
app.use(cors({ origin: process.env.CLIENT_URL }));

// Lets Express read JSON sent in request bodies
app.use(express.json());

// Simple check that the server is alive
app.get('/', (req, res) => {
  res.json({ message: 'Student API is running' });
});

// Login routes start with /auth, student routes start with /students
app.use('/auth', authRoutes);
app.use('/students', studentRoutes);

// Runs when no route matches the URL
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Catches any error not handled inside the routes
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// Checks the database connection first, then starts the server.
async function startServer() {
  // Login tokens are signed with this secret, so the server cannot run without it
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is missing in backend/.env (see .env.example).');
    process.exit(1);
  }

  try {
    const connection = await pool.getConnection();
    connection.release();
    console.log('Connected to MySQL database');

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Could not connect to MySQL:', error.message);
    console.error('Is MySQL started in XAMPP? Are the .env values correct?');
    process.exit(1);
  }
}

startServer();