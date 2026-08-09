'use strict';

// Load .env file for local development.
// On Vercel, environment variables are injected automatically – dotenv is harmless there.
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const path         = require('path');

const userRoutes   = require('../routes/userRoutes');
const errorHandler = require('../middleware/errorHandler');
const db           = require('../config/database');

// ─── Create Express app ───────────────────────────────────────────────────────
const app = express();

// ─── Security & Utility Middleware ───────────────────────────────────────────
app.use(helmet());          // Sets secure HTTP headers
app.use(cors());            // Allows cross-origin requests (needed for Postman / frontends)
app.use(morgan('combined')); // HTTP request logger
app.use(express.json());    // Parse incoming JSON request bodies

// ─── Database Initialisation ─────────────────────────────────────────────────
// Creates the users table if it does not already exist.
// Uses SQLite/libSQL syntax (not MySQL).
const initDatabase = async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      user_id              INTEGER  PRIMARY KEY AUTOINCREMENT,
      user_login           TEXT     NOT NULL DEFAULT '',
      user_pass            TEXT     NOT NULL DEFAULT '',
      fname                TEXT     NOT NULL,
      lname                TEXT     NOT NULL,
      gender               TEXT     NOT NULL,
      user_level           INTEGER  NOT NULL DEFAULT 0,
      branch_cd            TEXT     NOT NULL DEFAULT '',
      email                TEXT     NOT NULL DEFAULT '',
      registered           TEXT     NOT NULL DEFAULT (datetime('now')),
      user_activation_key  TEXT     NOT NULL DEFAULT '',
      isActive             INTEGER  NOT NULL DEFAULT 1
    )
  `);
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `);
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_login ON users(user_login)
  `);
  console.log('[DB] users table is ready.');
};

// Run on module load (covers both local starts and Vercel cold-starts).
initDatabase().catch((err) => {
  console.error('[DB] Failed to initialise database:', err.message);
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'API is running',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/users', userRoutes);

// ─── 404 – Route Not Found ────────────────────────────────────────────────────
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Centralised Error Handler ────────────────────────────────────────────────
// Must be registered AFTER all routes.
app.use(errorHandler);

// ─── Local Development Server ────────────────────────────────────────────────
// When this file is run directly (node api/index.js / nodemon), start the HTTP
// server.  When imported by Vercel, this block is skipped.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║         Users API – Local Server         ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Health : http://localhost:${PORT}/api/health  ║`);
    console.log(`║  Users  : http://localhost:${PORT}/api/users   ║`);
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
  });
}

// ─── Export for Vercel ────────────────────────────────────────────────────────
// Vercel imports this module and passes each HTTP request to `app` directly.
// Do NOT call app.listen() here; Vercel handles the server lifecycle.
module.exports = app;
