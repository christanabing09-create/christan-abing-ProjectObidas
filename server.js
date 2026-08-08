'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const usersRouter    = require('./routes/users');
const errorHandler   = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health-check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Users API is running',
    version: '1.0.0',
    endpoints: {
      getAllUsers:   'GET    /api/users',
      getUserById:  'GET    /api/users/:id',
      createUser:   'POST   /api/users',
      updateUser:   'PUT    /api/users/:id',
      deleteUser:   'DELETE /api/users/:id',
    },
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/users', usersRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server (skipped on Vercel — it imports the module directly) ─────────
async function start(port = PORT) {
  // Initialize DB and start listening
  const db = require('./config/db');
  const { initTable } = require('./models/userModel');

  await db.execute('SELECT 1');
  await initTable();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`✅  Server running on http://localhost:${port}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('❌  Failed to initialize database:', err.message || err);
    process.exit(1);
  });
}

module.exports = app;
