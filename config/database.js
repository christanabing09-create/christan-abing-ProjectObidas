'use strict';

const { createClient } = require('@libsql/client');

// Load .env in non-production (Vercel injects env vars automatically)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN  = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL) {
  throw new Error(
    '[database.js] Missing environment variable: TURSO_DATABASE_URL\n' +
    'Copy .env.example to .env and fill in your Turso credentials.'
  );
}

if (!TURSO_AUTH_TOKEN) {
  throw new Error(
    '[database.js] Missing environment variable: TURSO_AUTH_TOKEN\n' +
    'Copy .env.example to .env and fill in your Turso credentials.'
  );
}

const db = createClient({
  url:       TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

module.exports = db;
